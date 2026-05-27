import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  auditActions,
  auditEntityTypes,
  auditSources,
  type TransactionAuditOptions
} from "@/lib/audit";
import { logPermissionDenied } from "@/lib/permission-audit-server";
import {
  canDeleteTransactions,
  canEditTransactions,
  permissionDeniedMessage
} from "@/lib/permissions";
import { getAuthenticatedContext } from "@/lib/server-auth";
import {
  createSupabaseTransaction,
  deleteSupabaseTransaction,
  importSupabaseTransactions,
  isSupabaseConfigured,
  updateSupabaseTransaction
} from "@/lib/supabase-server";
import type {
  AuditActor,
  AuditEntityType,
  AuditLog,
  AuditSource,
  Transaction
} from "@/lib/types";

const stringLimits = {
  account: 160,
  category: 160,
  currency: 3,
  date: 10,
  description: 500,
  id: 128,
  notes: 5000,
  receipt_link: 1000,
  source: 160,
  tax_line: 160,
  vendor: 160
} as const;

const transactionPatchFields = [
  "date",
  "account",
  "source",
  "vendor",
  "description",
  "currency",
  "money_in",
  "money_out",
  "category",
  "tax_line",
  "receipt_required",
  "receipt_link",
  "reconciled",
  "notes"
] as const;

type TransactionPatchField = (typeof transactionPatchFields)[number];
type JsonRecord = Record<string, unknown>;

class ValidationError extends Error {}

function unauthorized() {
  return NextResponse.json(
    {
      apiStatus: 401,
      apiStatusText: "Unauthorized",
      configured: false,
      error: "Unauthorized",
      mode: "error"
    },
    { status: 401 }
  );
}

function supabaseNotConfigured() {
  return NextResponse.json(
    {
      apiStatus: 200,
      apiStatusText: "OK",
      configured: false,
      mode: "local",
      message: "Supabase variables are not configured."
    },
    { status: 200 }
  );
}

function badRequest(message: string) {
  return NextResponse.json(
    {
      apiStatus: 400,
      apiStatusText: "Bad Request",
      configured: true,
      error: message,
      mode: "error"
    },
    { status: 400 }
  );
}

async function forbidden(
  auth: Awaited<ReturnType<typeof getAuthenticatedContext>>,
  attemptedAction: string,
  entityId = ""
) {
  if (auth) {
    await logPermissionDenied(auth, attemptedAction, "transaction", entityId);
  }

  return NextResponse.json({ error: permissionDeniedMessage }, { status: 403 });
}

function supabaseError(error: unknown) {
  return NextResponse.json(
    {
      apiStatus: 500,
      apiStatusText: "Internal Server Error",
      configured: true,
      error: error instanceof Error ? error.message : "Transaction write failed.",
      mode: "error"
    },
    { status: 500 }
  );
}

function ok(body: JsonRecord) {
  return NextResponse.json({
    apiStatus: 200,
    apiStatusText: "OK",
    configured: true,
    mode: "supabase",
    ...body
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) {
    throw new ValidationError(`${label} must be an object.`);
  }

  return value;
}

function readString(
  record: JsonRecord,
  key: keyof typeof stringLimits,
  options: { defaultValue?: string; required?: boolean } = {}
) {
  const rawValue = record[key];

  if (rawValue === undefined || rawValue === null) {
    if (options.required) throw new ValidationError(`${key} is required.`);
    return options.defaultValue ?? "";
  }

  if (typeof rawValue !== "string") {
    throw new ValidationError(`${key} must be a string.`);
  }

  const value = key === "currency" ? rawValue.trim().toUpperCase() : rawValue.trim();

  if (options.required && !value) {
    throw new ValidationError(`${key} is required.`);
  }

  if (value.length > stringLimits[key]) {
    throw new ValidationError(`${key} is too long.`);
  }

  return value;
}

function readBoolean(record: JsonRecord, key: string, defaultValue: boolean) {
  const value = record[key];

  if (value === undefined || value === null) return defaultValue;
  if (typeof value !== "boolean") throw new ValidationError(`${key} must be true or false.`);

  return value;
}

function readMoney(record: JsonRecord, key: string) {
  const value = record[key];
  const numberValue = value === undefined || value === null ? 0 : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new ValidationError(`${key} must be a valid number.`);
  }

  if (numberValue < 0) {
    throw new ValidationError(`${key} cannot be negative.`);
  }

  if (numberValue > 999_999_999_999.99) {
    throw new ValidationError(`${key} is too large.`);
  }

  return Math.round(numberValue * 100) / 100;
}

function readDate(record: JsonRecord) {
  const value = readString(record, "date", { required: true });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError("date must use YYYY-MM-DD format.");
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError("date is not valid.");
  }

  return value;
}

function validateIdValue(id: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(id)) {
    throw new ValidationError("id contains unsupported characters.");
  }

  return id;
}

function readTimestamp(record: JsonRecord, key: string, defaultValue: string) {
  const value = record[key];

  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    throw new ValidationError(`${key} must be an ISO timestamp.`);
  }

  return value;
}

function validateTransaction(value: unknown): Transaction {
  const record = assertRecord(value, "transaction");
  const now = new Date().toISOString();
  const moneyIn = readMoney(record, "money_in");
  const moneyOut = readMoney(record, "money_out");

  if (moneyIn > 0 && moneyOut > 0) {
    throw new ValidationError("Transaction cannot have both money_in and money_out.");
  }

  if (moneyIn === 0 && moneyOut === 0) {
    throw new ValidationError("Transaction must have money_in or money_out.");
  }

  const currency = readString(record, "currency", { defaultValue: "USD", required: true });

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new ValidationError("currency must be a 3-letter uppercase code.");
  }

  return {
    id: validateIdValue(readString(record, "id", { defaultValue: `txn-${randomUUID()}` })),
    date: readDate(record),
    account: readString(record, "account", { required: true }),
    source: readString(record, "source", { required: true }),
    vendor: readString(record, "vendor"),
    description: readString(record, "description"),
    currency,
    money_in: moneyIn,
    money_out: moneyOut,
    category: readString(record, "category", { required: true }),
    tax_line: readString(record, "tax_line", { required: true }),
    receipt_required: readBoolean(record, "receipt_required", true),
    receipt_link: readString(record, "receipt_link"),
    reconciled: readBoolean(record, "reconciled", false),
    notes: readString(record, "notes"),
    created_at: readTimestamp(record, "created_at", now),
    updated_at: readTimestamp(record, "updated_at", now)
  };
}

function validateTransactionPatch(value: unknown): Partial<Transaction> {
  const record = assertRecord(value, "transaction");
  const patch: Partial<Transaction> = {};

  for (const field of transactionPatchFields) {
    if (!(field in record)) continue;

    patch[field] = validatePatchField(record, field) as never;
  }

  if (Object.keys(patch).length === 0) {
    throw new ValidationError("transaction patch cannot be empty.");
  }

  if (
    typeof patch.money_in === "number" &&
    typeof patch.money_out === "number" &&
    patch.money_in > 0 &&
    patch.money_out > 0
  ) {
    throw new ValidationError("Transaction cannot have both money_in and money_out.");
  }

  return patch;
}

function validatePatchField(record: JsonRecord, field: TransactionPatchField) {
  if (field === "date") return readDate(record);
  if (field === "money_in" || field === "money_out") return readMoney(record, field);
  if (field === "receipt_required" || field === "reconciled") {
    return readBoolean(record, field, false);
  }
  if (field === "currency") {
    const currency = readString(record, "currency", { required: true });
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new ValidationError("currency must be a 3-letter uppercase code.");
    }
    return currency;
  }

  return readString(record, field, {
    required: field === "account" || field === "source" || field === "category" || field === "tax_line"
  });
}

function readId(record: JsonRecord) {
  const id = readString(record, "id", { required: true });

  return validateIdValue(id);
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  label: string
) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ValidationError(`${label} is invalid.`);
  }

  return value as T;
}

function optionalString(value: unknown, maxLength: number, label: string) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new ValidationError(`${label} must be a string.`);

  const trimmed = value.trim();

  if (trimmed.length > maxLength) throw new ValidationError(`${label} is too long.`);

  return trimmed;
}

function validateAuditMap<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
) {
  if (value === undefined || value === null) return undefined;
  const record = assertRecord(value, label);
  const next: Record<string, T> = {};

  for (const [fieldName, fieldValue] of Object.entries(record)) {
    if (fieldName.length > 80) throw new ValidationError(`${label} field name is too long.`);
    if (typeof fieldValue !== "string" || !allowed.includes(fieldValue as T)) {
      throw new ValidationError(`${label} has an invalid value.`);
    }

    next[fieldName] = fieldValue as T;
  }

  return next;
}

function validateFieldReasons(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const record = assertRecord(value, "fieldReasons");
  const next: Record<string, string> = {};

  for (const [fieldName, reason] of Object.entries(record)) {
    if (fieldName.length > 80) throw new ValidationError("fieldReasons field name is too long.");
    next[fieldName] = optionalString(reason, 1000, "field reason") ?? "";
  }

  return next;
}

function validateExtraEntries(value: unknown): Array<Partial<AuditLog>> | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new ValidationError("extraEntries must be an array.");
  if (value.length > 10) throw new ValidationError("extraEntries cannot include more than 10 items.");

  return value.map((entry, index) => {
    const record = assertRecord(entry, `extraEntries[${index}]`);

    return {
      action: enumValue(record.action, auditActions, "update", "extraEntries action"),
      actor: enumValue(record.actor, ["admin", "system"] as const, "admin", "extraEntries actor"),
      entity_id: optionalString(record.entity_id, 128, "extraEntries entity_id"),
      entity_type: enumValue(
        record.entity_type,
        auditEntityTypes,
        "transaction",
        "extraEntries entity_type"
      ),
      field_name: optionalString(record.field_name, 80, "extraEntries field_name"),
      new_value: optionalString(record.new_value, 1000, "extraEntries new_value"),
      old_value: optionalString(record.old_value, 1000, "extraEntries old_value"),
      reason: optionalString(record.reason, 1000, "extraEntries reason"),
      source: enumValue(record.source, auditSources, "manual", "extraEntries source")
    };
  });
}

function validateCreateAudit(value: unknown, fallbackSource: AuditSource) {
  const record = value === undefined || value === null ? {} : assertRecord(value, "audit");

  return {
    actor: enumValue(record.actor, ["admin", "system"] as const, "admin", "actor") as AuditActor,
    reason: optionalString(record.reason, 1000, "reason") ?? "",
    source: enumValue(record.source, auditSources, fallbackSource, "source")
  };
}

function validateUpdateAudit(value: unknown): TransactionAuditOptions {
  const record = value === undefined || value === null ? {} : assertRecord(value, "audit");

  return {
    actionsByField: validateAuditMap(record.actionsByField, auditActions, "actionsByField"),
    actor: enumValue(record.actor, ["admin", "system"] as const, "admin", "actor") as AuditActor,
    entityTypesByField: validateAuditMap(
      record.entityTypesByField,
      auditEntityTypes,
      "entityTypesByField"
    ) as Partial<Record<string, AuditEntityType>> | undefined,
    extraEntries: validateExtraEntries(record.extraEntries),
    fieldReasons: validateFieldReasons(record.fieldReasons),
    reason: optionalString(record.reason, 1000, "reason") ?? "",
    source: enumValue(record.source, auditSources, "manual", "source")
  };
}

function validateImportTransactions(value: unknown) {
  if (!Array.isArray(value)) {
    throw new ValidationError("transactions must be an array.");
  }

  if (value.length === 0) {
    throw new ValidationError("transactions cannot be empty.");
  }

  if (value.length > 500) {
    throw new ValidationError("Import commit is limited to 500 transactions at a time.");
  }

  return value.map((transaction) => validateTransaction(transaction));
}

function withAuthenticatedActor<T extends { actor?: AuditActor }>(
  audit: T,
  auth: Awaited<ReturnType<typeof getAuthenticatedContext>>
) {
  return {
    ...audit,
    actor: auth?.user?.email ?? audit.actor ?? "admin"
  };
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    const body = assertRecord(await request.json(), "request body");
    const action = body.action;

    if (action === "create") {
      if (!canEditTransactions(auth.membership)) {
        return forbidden(auth, "transaction.create");
      }

      const result = await createSupabaseTransaction(
        validateTransaction(body.transaction),
        withAuthenticatedActor(validateCreateAudit(body.audit, "manual"), auth),
        auth.workspace.id
      );

      return ok({ transaction: result.transaction, audit_logs: result.audit_logs });
    }

    if (action === "update") {
      const id = readId(body);

      if (!canEditTransactions(auth.membership)) {
        return forbidden(auth, "transaction.update", id);
      }

      const result = await updateSupabaseTransaction(
        id,
        validateTransactionPatch(body.transaction),
        withAuthenticatedActor(validateUpdateAudit(body.audit), auth),
        auth.workspace.id
      );

      return ok({ transaction: result.transaction, audit_logs: result.audit_logs });
    }

    if (action === "delete") {
      const id = readId(body);

      if (!canDeleteTransactions(auth.membership)) {
        return forbidden(auth, "transaction.delete", id);
      }

      const result = await deleteSupabaseTransaction(
        id,
        withAuthenticatedActor(validateCreateAudit(body.audit, "manual"), auth),
        auth.workspace.id
      );

      return ok({ id, audit_logs: result.audit_logs });
    }

    if (action === "import") {
      if (!canEditTransactions(auth.membership)) {
        return forbidden(auth, "transaction.import");
      }

      const result = await importSupabaseTransactions(
        validateImportTransactions(body.transactions),
        withAuthenticatedActor(validateCreateAudit(body.audit, "csv_import"), auth),
        auth.workspace.id
      );

      return ok({ transactions: result.transactions, audit_logs: result.audit_logs });
    }

    return badRequest("Unsupported transaction action.");
  } catch (error) {
    if (error instanceof ValidationError) return badRequest(error.message);

    return supabaseError(error);
  }
}
