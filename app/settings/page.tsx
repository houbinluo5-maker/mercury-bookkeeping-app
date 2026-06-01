"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BadgeCheck,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Download,
  FileJson,
  Languages,
  Lock,
  Receipt,
  Save,
  ShieldCheck,
  Users,
  WalletCards
} from "lucide-react";
import { Badge } from "@/components/badge";
import { Button, buttonClassName } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { AlertBanner, SectionHeader } from "@/components/ui-primitives";
import { downloadExcel } from "@/lib/export-excel";
import { useI18n } from "@/lib/i18n";
import { canUpdateSettingsFields, changedSettingsFields, type SettingsField } from "@/lib/settings-permissions";
import { accountOptions, categories } from "@/lib/seed-data";
import { useBookkeeping } from "@/lib/storage";
import type { AppSettings, WorkspaceRole } from "@/lib/types";

type AccountSnapshot = {
  authProvider?: string;
  normalizedEmail?: string;
  ownsWorkspace?: boolean;
  user?: { email?: string; id?: string; name?: string };
  workspace?: { id?: string; name?: string };
  workspaces?: Array<{ is_active?: boolean; name?: string; role?: WorkspaceRole; status?: string }>;
};

type SaveStatus = {
  message: string;
  tone: "green" | "red" | "blue";
};

const entityTypes = ["US LLC", "C-Corp", "S-Corp", "Sole Proprietor", "Other"];
const countryRegions = ["United States", "China", "Hong Kong", "Singapore", "Other"];
const currencies = ["USD", "CNY", "HKD", "SGD", "EUR", "GBP"];
const retentionPolicies = ["7_years", "5_years", "indefinite"] as const;
const watermarkPreferences = ["workspace_name", "confidential", "none"] as const;

const copy = {
  en: {
    account: "Account",
    address: "Business address",
    adminLimited: "Admins can update operational preferences only.",
    advancedExports: "Advanced exports",
    allowAdminsReopen: "Allow admins to reopen months",
    auditTrailEnabled: "Audit trail enabled",
    billingComingSoon: "Plan and billing",
    brandName: "DBA / brand name",
    businessType: "Business type",
    commercialDescription: "Commercial controls are visible as product groundwork only. Billing and plan enforcement are not active.",
    commercialTitle: "SaaS controls",
    companyDescription: "Company identity used for CPA handoff, exports, and internal finance records.",
    companyInfo: "Company information",
    companyLegalName: "Company legal name",
    complianceDescription: "Data governance signals for finance review and future commercial packaging.",
    complianceTitle: "Data and compliance",
    contactEmail: "Contact email",
    countryRegion: "Country / region",
    cpaAccess: "Dedicated CPA access",
    cpaReady: "CPA handoff readiness",
    cpaReadonly: "CPA read-only note",
    currentUser: "Current user role",
    dataRetention: "Data retention policy",
    defaultCategory: "Default category fallback",
    defaultCurrency: "Default currency",
    defaultTaxYear: "Default tax year",
    disabled: "Coming soon",
    enabled: "Enabled",
    exportPermissions: "Export permissions enabled",
    exportWatermark: "Export watermark preference",
    financeContact: "Finance contact name",
    financeDescription: "Operational defaults for receipt enforcement, monthly close hygiene, and review workflows.",
    financeOperations: "Finance operations preferences",
    legalEntity: "Entity type",
    lockClosedMonths: "Lock closed months",
    monthlyCloseDay: "Monthly close reminder day",
    owner: "Workspace owner",
    ownerOnly: "Owner only",
    profileDescription: "Workspace-level defaults used across dashboards, reports, exports, and audit views.",
    profileTitle: "Workspace profile",
    readOnlyDetail: "Ask the workspace owner to change settings.",
    readOnlyTitle: "You have read-only access to workspace settings.",
    receiptPolicy: "Receipt retention policy",
    receiptThreshold: "Receipt required threshold amount",
    requireReceipts: "Require receipts above threshold",
    rbacEnabled: "Role-based access enabled",
    registeredState: "Registered state",
    saved: "Settings saved.",
    seatsComingSoon: "Seats",
    securityDescription: "Access posture for workspace governance and review.",
    securityNote: "Sessions use secure HTTP-only cookies. OAuth provider configuration is controlled by deployment environment.",
    securityTitle: "Security and access",
    settingsError: "Settings could not be saved.",
    settingsTitle: "Workspace settings",
    taxId: "EIN / Tax ID",
    teamAccess: "Team access summary",
    timezone: "Timezone display preference",
    usageLimits: "Usage limits",
    utcChinaTime: "UTC storage / China time display",
    viewAccount: "Account",
    viewAudit: "Audit Trail",
    viewTeam: "Team Members",
    workspaceName: "Workspace name"
  },
  zh: {
    account: "账户",
    address: "营业地址",
    adminLimited: "管理员只能更新运营偏好设置。",
    advancedExports: "高级导出",
    allowAdminsReopen: "允许管理员重新打开月份",
    auditTrailEnabled: "审计追踪已启用",
    billingComingSoon: "计划和账单",
    brandName: "DBA / 品牌名称",
    businessType: "业务类型",
    commercialDescription: "商业化控制仅作为产品基础展示。账单和套餐限制尚未启用。",
    commercialTitle: "SaaS 控制",
    companyDescription: "用于 CPA 交接、导出和内部财务记录的公司身份信息。",
    companyInfo: "公司信息",
    companyLegalName: "公司法定名称",
    complianceDescription: "用于财务复核和未来商业化包装的数据治理信号。",
    complianceTitle: "数据与合规",
    contactEmail: "联系邮箱",
    countryRegion: "国家 / 地区",
    cpaAccess: "专属 CPA 访问",
    cpaReady: "CPA 交接就绪",
    cpaReadonly: "CPA 只读说明",
    currentUser: "当前用户角色",
    dataRetention: "数据保留政策",
    defaultCategory: "默认分类兜底",
    defaultCurrency: "默认币种",
    defaultTaxYear: "默认税年",
    disabled: "即将推出",
    enabled: "已启用",
    exportPermissions: "导出权限已启用",
    exportWatermark: "导出水印偏好",
    financeContact: "财务联系人",
    financeDescription: "用于收据要求、月结治理和复核流程的运营默认值。",
    financeOperations: "财务运营偏好",
    legalEntity: "实体类型",
    lockClosedMonths: "锁定已关闭月份",
    monthlyCloseDay: "月结提醒日",
    owner: "工作区所有者",
    ownerOnly: "仅所有者",
    profileDescription: "用于仪表盘、报表、导出和审计视图的工作区默认设置。",
    profileTitle: "工作区资料",
    readOnlyDetail: "请联系工作区所有者修改设置。",
    readOnlyTitle: "你对工作区设置拥有只读访问权限。",
    receiptPolicy: "收据保留政策",
    receiptThreshold: "收据要求金额阈值",
    requireReceipts: "超过阈值要求收据",
    rbacEnabled: "基于角色的访问已启用",
    registeredState: "注册州",
    saved: "设置已保存。",
    seatsComingSoon: "席位",
    securityDescription: "工作区治理和复核的访问状态。",
    securityNote: "会话使用安全 HTTP-only Cookie。OAuth 提供商配置由部署环境控制。",
    securityTitle: "安全与访问",
    settingsError: "设置无法保存。",
    settingsTitle: "工作区设置",
    taxId: "EIN / 税号",
    teamAccess: "团队访问摘要",
    timezone: "时区显示偏好",
    usageLimits: "使用限制",
    utcChinaTime: "UTC 存储 / 中国时间显示",
    viewAccount: "账户",
    viewAudit: "审计追踪",
    viewTeam: "团队成员",
    workspaceName: "工作区名称"
  }
};

function retentionLabel(value: AppSettings["data_retention_policy"], language: "en" | "zh") {
  if (value === "7_years") return language === "zh" ? "7 年" : "7 years";
  if (value === "5_years") return language === "zh" ? "5 年" : "5 years";
  return language === "zh" ? "无限期" : "Indefinite";
}

function watermarkLabel(value: AppSettings["export_watermark_preference"], language: "en" | "zh") {
  if (value === "workspace_name") return language === "zh" ? "工作区名称" : "Workspace name";
  if (value === "confidential") return language === "zh" ? "机密标记" : "Confidential";
  return language === "zh" ? "无" : "None";
}

function roleLabel(role: WorkspaceRole | "unknown", language: "en" | "zh") {
  if (role === "unknown") return language === "zh" ? "未知" : "Unknown";
  const labels: Record<WorkspaceRole, { en: string; zh: string }> = {
    admin: { en: "Admin", zh: "管理员" },
    bookkeeper: { en: "Bookkeeper", zh: "记账员" },
    cpa: { en: "CPA", zh: "CPA" },
    owner: { en: "Owner", zh: "所有者" },
    viewer: { en: "Viewer", zh: "查看者" }
  };

  return labels[role][language];
}

function fieldLabel({
  children,
  label
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="space-y-1">
      <span className="form-label">{label}</span>
      {children}
    </label>
  );
}

const Field = fieldLabel;

function TextInput({
  disabled,
  onChange,
  value,
  type = "text"
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
  type?: string;
}) {
  return (
    <input
      className="form-input"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      type={type}
      value={value}
    />
  );
}

function NumberInput({
  disabled,
  max,
  min,
  onChange,
  value
}: {
  disabled?: boolean;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <input
      className="form-input"
      disabled={disabled}
      max={max}
      min={min}
      onChange={(event) => onChange(Number(event.target.value))}
      type="number"
      value={value}
    />
  );
}

function SelectInput<T extends string>({
  disabled,
  onChange,
  options,
  renderLabel,
  value
}: {
  disabled?: boolean;
  onChange: (value: T) => void;
  options: readonly T[];
  renderLabel?: (value: T) => string;
  value: T;
}) {
  return (
    <select
      className="form-input"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as T)}
      value={value}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {renderLabel ? renderLabel(option) : option}
        </option>
      ))}
    </select>
  );
}

function ToggleRow({
  checked,
  disabled,
  label,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm text-ink">
      <span className="font-medium">{label}</span>
      <input
        checked={checked}
        className="h-4 w-4 accent-marine"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function StatusRow({
  icon,
  label,
  value,
  tone = "green"
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-marine">
          {icon}
        </div>
        <span className="text-sm font-medium text-ink">{label}</span>
      </div>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

function ComingSoonRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="text-slate-500">{icon}</div>
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <Badge tone="neutral">{value}</Badge>
    </div>
  );
}

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    exportBackup,
    recordExportAudit,
    transactions,
    storageStatus,
    permissions,
    workspaceRole,
    checkStorageHealth
  } = useBookkeeping();
  const { language, t } = useI18n();
  const c = copy[language];
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [status, setStatus] = useState<SaveStatus | null>(null);
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(settings), 0);

    return () => window.clearTimeout(timer);
  }, [settings]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setAccount(data as AccountSnapshot | null))
      .catch(() => undefined);
  }, []);

  const teamSummary = useMemo(() => {
    const active = account?.workspaces?.find((workspace) => workspace.is_active);
    if (!active) return language === "zh" ? "当前工作区访问已启用" : "Current workspace access enabled";

    return `${active.name ?? draft.workspace_name} / ${roleLabel(active.role ?? workspaceRole, language)}`;
  }, [account?.workspaces, draft.workspace_name, language, workspaceRole]);

  const canEditOwner = permissions.canManageSettings;
  const canEditOperational = permissions.canManageOperationalSettings;
  const readOnly = !canEditOwner && !canEditOperational;

  function setField<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatus(null);
  }

  function save(fields: SettingsField[], successMessage = c.saved) {
    const changedFields = changedSettingsFields(settings, draft);
    const fieldsToCheck = changedFields.length ? changedFields : fields;

    if (!canUpdateSettingsFields(workspaceRole, fieldsToCheck)) {
      setStatus({ message: c.settingsError, tone: "red" });
      return;
    }

    updateSettings(draft);
    setStatus({ message: successMessage, tone: "green" });
  }

  async function downloadBackupJson() {
    const fileName = `bookkeeping-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const allowed = await recordExportAudit({
      entityId: "local-backup",
      entityType: "workspace",
      exportType: "workspace_backup",
      fileFormat: "json",
      fileName,
      rowCount: transactions.length
    });

    if (!allowed) return;

    const backup = exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadFullLedgerExcel() {
    const fileName = "bookkeeping-full-export.xlsx";
    const allowed = await recordExportAudit({
      entityId: "full-ledger",
      entityType: "workspace",
      exportType: "workspace_backup",
      fileFormat: "xlsx",
      fileName,
      rowCount: transactions.length
    });

    if (!allowed) return;

    downloadExcel(transactions, fileName, { title: "罗厚彬记账表 - 完整账本导出" });
  }

  async function runHealthCheck() {
    setHealthBusy(true);
    await checkStorageHealth();
    setHealthBusy(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          permissions.canExportFullBackup ? (
            <>
              <Button onClick={() => void downloadBackupJson()}>
                <FileJson aria-hidden="true" className="h-4 w-4" />
                {t("backupJson")}
              </Button>
              <Button onClick={() => void downloadFullLedgerExcel()}>
                <Download aria-hidden="true" className="h-4 w-4" />
                {t("exportExcel")}
              </Button>
            </>
          ) : null
        }
        eyebrow={roleLabel(workspaceRole, language)}
        description={language === "zh" ? "为财务团队、所有者和 CPA 管理工作区控制项。" : "Workspace controls for finance operators, owners, and CPA review."}
        title={c.settingsTitle}
      />

      {readOnly ? (
        <AlertBanner tone="info">
          <p className="font-semibold">{c.readOnlyTitle}</p>
          <p>{c.readOnlyDetail}</p>
        </AlertBanner>
      ) : null}
      {!canEditOwner && canEditOperational ? (
        <AlertBanner tone="info">
          <p>{c.adminLimited}</p>
        </AlertBanner>
      ) : null}
      {status ? <Badge tone={status.tone}>{status.message}</Badge> : null}

      <section className="surface-card space-y-5 p-5">
        <SectionHeader
          actions={
            canEditOwner ? (
              <Button onClick={() => save(["workspace_name", "company_name", "business_type", "tax_year", "default_currency", "country_region", "timezone_display", "language"])} variant="primary">
                <Save aria-hidden="true" className="h-4 w-4" />
                {t("saveSettings")}
              </Button>
            ) : null
          }
          description={c.profileDescription}
          title={c.profileTitle}
        />
        <fieldset className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" disabled={!canEditOwner}>
          <Field label={c.workspaceName}>
            <TextInput disabled={!canEditOwner} onChange={(value) => setField("workspace_name", value)} value={draft.workspace_name} />
          </Field>
          <Field label={c.companyLegalName}>
            <TextInput disabled={!canEditOwner} onChange={(value) => setField("company_name", value)} value={draft.company_name} />
          </Field>
          <Field label={c.businessType}>
            <TextInput disabled={!canEditOwner} onChange={(value) => setField("business_type", value)} value={draft.business_type} />
          </Field>
          <Field label={c.defaultTaxYear}>
            <NumberInput disabled={!canEditOwner} max={2100} min={2020} onChange={(value) => setField("tax_year", value)} value={draft.tax_year} />
          </Field>
          <Field label={c.defaultCurrency}>
            <SelectInput disabled={!canEditOwner} onChange={(value) => setField("default_currency", value)} options={currencies} value={draft.default_currency} />
          </Field>
          <Field label={c.countryRegion}>
            <SelectInput disabled={!canEditOwner} onChange={(value) => setField("country_region", value)} options={countryRegions} value={draft.country_region} />
          </Field>
          <Field label={c.timezone}>
            <SelectInput
              disabled={!canEditOwner}
              onChange={(value) => setField("timezone_display", value)}
              options={["Asia/Shanghai", "UTC"] as const}
              renderLabel={(value) => (value === "Asia/Shanghai" ? "Asia/Shanghai / UTC+8" : "UTC")}
              value={draft.timezone_display}
            />
          </Field>
          <Field label={t("language")}>
            <SelectInput
              disabled={!canEditOwner}
              onChange={(value) => setField("language", value)}
              options={["en", "zh"] as const}
              renderLabel={(value) => (value === "zh" ? t("simplifiedChinese") : t("english"))}
              value={draft.language}
            />
          </Field>
        </fieldset>
      </section>

      <section className="surface-card space-y-5 p-5">
        <SectionHeader
          actions={
            canEditOwner ? (
              <Button onClick={() => save(["company_legal_name", "dba_name", "entity_type", "ein_tax_id", "registered_state", "business_address", "contact_email", "finance_contact_name"])} variant="primary">
                <Save aria-hidden="true" className="h-4 w-4" />
                {t("saveSettings")}
              </Button>
            ) : null
          }
          description={c.companyDescription}
          title={c.companyInfo}
        />
        <fieldset className="grid gap-4 md:grid-cols-2" disabled={!canEditOwner}>
          <Field label={c.companyLegalName}>
            <TextInput disabled={!canEditOwner} onChange={(value) => setField("company_legal_name", value)} value={draft.company_legal_name} />
          </Field>
          <Field label={c.brandName}>
            <TextInput disabled={!canEditOwner} onChange={(value) => setField("dba_name", value)} value={draft.dba_name} />
          </Field>
          <Field label={c.legalEntity}>
            <SelectInput disabled={!canEditOwner} onChange={(value) => setField("entity_type", value)} options={entityTypes} value={draft.entity_type} />
          </Field>
          <Field label={c.taxId}>
            <TextInput disabled={!canEditOwner} onChange={(value) => setField("ein_tax_id", value)} value={draft.ein_tax_id} />
          </Field>
          <Field label={c.registeredState}>
            <TextInput disabled={!canEditOwner} onChange={(value) => setField("registered_state", value)} value={draft.registered_state} />
          </Field>
          <Field label={c.contactEmail}>
            <TextInput disabled={!canEditOwner} onChange={(value) => setField("contact_email", value)} type="email" value={draft.contact_email} />
          </Field>
          <Field label={c.financeContact}>
            <TextInput disabled={!canEditOwner} onChange={(value) => setField("finance_contact_name", value)} value={draft.finance_contact_name} />
          </Field>
          <label className="space-y-1 md:col-span-2">
            <span className="form-label">{c.address}</span>
            <textarea
              className="form-textarea"
              disabled={!canEditOwner}
              onChange={(event) => setField("business_address", event.target.value)}
              value={draft.business_address}
            />
          </label>
        </fieldset>
      </section>

      <section className="surface-card space-y-5 p-5">
        <SectionHeader
          actions={
            canEditOperational ? (
              <Button onClick={() => save(["require_receipts_over_threshold", "receipt_required_threshold_amount", "monthly_close_reminder_day", "default_category_fallback"])} variant="primary">
                <Save aria-hidden="true" className="h-4 w-4" />
                {t("saveSettings")}
              </Button>
            ) : null
          }
          description={c.financeDescription}
          title={c.financeOperations}
        />
        <fieldset className="grid gap-4 md:grid-cols-2" disabled={!canEditOperational}>
          <ToggleRow checked={draft.require_receipts_over_threshold} disabled={!canEditOperational} label={c.requireReceipts} onChange={(value) => setField("require_receipts_over_threshold", value)} />
          <Field label={c.receiptThreshold}>
            <NumberInput disabled={!canEditOperational} min={0} onChange={(value) => setField("receipt_required_threshold_amount", value)} value={draft.receipt_required_threshold_amount} />
          </Field>
          <Field label={c.monthlyCloseDay}>
            <NumberInput disabled={!canEditOperational} max={28} min={1} onChange={(value) => setField("monthly_close_reminder_day", value)} value={draft.monthly_close_reminder_day} />
          </Field>
          <Field label={c.defaultCategory}>
            <SelectInput
              disabled={!canEditOperational}
              onChange={(value) => setField("default_category_fallback", value)}
              options={categories.map((category) => category.name)}
              value={draft.default_category_fallback}
            />
          </Field>
          <ToggleRow checked={draft.lock_closed_months} disabled={!canEditOwner} label={c.lockClosedMonths} onChange={(value) => setField("lock_closed_months", value)} />
          <ToggleRow checked={draft.allow_admins_reopen_months} disabled={!canEditOwner} label={c.allowAdminsReopen} onChange={(value) => setField("allow_admins_reopen_months", value)} />
          <Field label={t("defaultAccountName")}>
            <SelectInput disabled={!canEditOwner} onChange={(value) => setField("default_account", value)} options={accountOptions} value={draft.default_account} />
          </Field>
          <Field label={t("bookkeepingMethod")}>
            <SelectInput
              disabled={!canEditOwner}
              onChange={(value) => setField("bookkeeping_method", value)}
              options={["cash", "accrual"] as const}
              renderLabel={(value) => (value === "cash" ? t("cash") : t("accrual"))}
              value={draft.bookkeeping_method}
            />
          </Field>
          <label className="space-y-1 md:col-span-2">
            <span className="form-label">{c.cpaReadonly}</span>
            <textarea
              className="form-textarea"
              disabled={!canEditOwner}
              onChange={(event) => setField("cpa_read_only_note", event.target.value)}
              value={draft.cpa_read_only_note}
            />
          </label>
        </fieldset>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="surface-card space-y-4 p-5">
          <SectionHeader description={c.securityDescription} title={c.securityTitle} />
          <div>
            <StatusRow icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />} label={c.owner} tone={account?.ownsWorkspace ? "green" : "neutral"} value={account?.ownsWorkspace ? (account.normalizedEmail || account.user?.email || roleLabel("owner", language)) : c.ownerOnly} />
            <StatusRow icon={<Users aria-hidden="true" className="h-4 w-4" />} label={c.currentUser} value={roleLabel(workspaceRole, language)} />
            <StatusRow icon={<BadgeCheck aria-hidden="true" className="h-4 w-4" />} label={c.teamAccess} value={teamSummary} />
            <StatusRow icon={<Lock aria-hidden="true" className="h-4 w-4" />} label="OAuth" tone="blue" value={account?.authProvider || "deployment"} />
          </div>
          <p className="text-sm leading-6 text-slate-600">{c.securityNote}</p>
          <div className="flex flex-wrap gap-2">
            <Link className={buttonClassName()} href="/team">
              <Users aria-hidden="true" className="h-4 w-4" />
              {c.viewTeam}
            </Link>
            <Link className={buttonClassName()} href="/audit">
              <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
              {c.viewAudit}
            </Link>
            <Link className={buttonClassName()} href="/account">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              {c.viewAccount}
            </Link>
          </div>
        </section>

        <section className="surface-card space-y-4 p-5">
          <SectionHeader
            actions={<Button disabled={healthBusy} onClick={() => void runHealthCheck()}>{t("checkSupabaseHealth")}</Button>}
            description={c.complianceDescription}
            title={c.complianceTitle}
          />
          <div>
            <StatusRow icon={<ClipboardCheck aria-hidden="true" className="h-4 w-4" />} label={c.auditTrailEnabled} value={c.enabled} />
            <StatusRow icon={<Download aria-hidden="true" className="h-4 w-4" />} label={c.exportPermissions} value={c.enabled} />
            <StatusRow icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />} label={c.rbacEnabled} value={c.enabled} />
            <StatusRow icon={<Languages aria-hidden="true" className="h-4 w-4" />} label={c.utcChinaTime} tone="blue" value={draft.timezone_display === "Asia/Shanghai" ? "UTC+8" : "UTC"} />
            <StatusRow icon={<Archive aria-hidden="true" className="h-4 w-4" />} label={c.cpaReady} tone="blue" value={storageStatus.mode === "error" ? t("supabaseError") : c.enabled} />
          </div>
          <fieldset className="grid gap-4 md:grid-cols-3" disabled={!canEditOwner}>
            <Field label={c.dataRetention}>
              <SelectInput disabled={!canEditOwner} onChange={(value) => setField("data_retention_policy", value)} options={retentionPolicies} renderLabel={(value) => retentionLabel(value, language)} value={draft.data_retention_policy} />
            </Field>
            <Field label={c.receiptPolicy}>
              <SelectInput disabled={!canEditOwner} onChange={(value) => setField("receipt_retention_policy", value)} options={retentionPolicies} renderLabel={(value) => retentionLabel(value, language)} value={draft.receipt_retention_policy} />
            </Field>
            <Field label={c.exportWatermark}>
              <SelectInput disabled={!canEditOwner} onChange={(value) => setField("export_watermark_preference", value)} options={watermarkPreferences} renderLabel={(value) => watermarkLabel(value, language)} value={draft.export_watermark_preference} />
            </Field>
          </fieldset>
          {canEditOwner ? (
            <Button onClick={() => save(["data_retention_policy", "receipt_retention_policy", "export_watermark_preference"])} variant="primary">
              <Save aria-hidden="true" className="h-4 w-4" />
              {t("saveSettings")}
            </Button>
          ) : null}
        </section>
      </section>

      <section className="surface-card space-y-4 p-5">
        <SectionHeader description={c.commercialDescription} title={c.commercialTitle} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <ComingSoonRow icon={<WalletCards aria-hidden="true" className="h-4 w-4" />} label={c.billingComingSoon} value={c.disabled} />
          <ComingSoonRow icon={<CalendarClock aria-hidden="true" className="h-4 w-4" />} label={c.usageLimits} value={c.disabled} />
          <ComingSoonRow icon={<Users aria-hidden="true" className="h-4 w-4" />} label={c.seatsComingSoon} value={c.disabled} />
          <ComingSoonRow icon={<Download aria-hidden="true" className="h-4 w-4" />} label={c.advancedExports} value={c.disabled} />
          <ComingSoonRow icon={<Receipt aria-hidden="true" className="h-4 w-4" />} label={c.cpaAccess} value={c.disabled} />
        </div>
      </section>

      <section className="surface-card space-y-4 p-5">
        <SectionHeader description={language === "zh" ? "只显示非破坏性的存储状态和导出入口。" : "Non-destructive storage status and owner export controls."} title={language === "zh" ? "存储状态" : "Storage status"} />
        <div className="grid gap-4 md:grid-cols-3">
          <StatusRow icon={<DatabaseIcon />} label={t("storageStatus")} tone={storageStatus.mode === "error" ? "red" : storageStatus.supabaseConnected ? "green" : "amber"} value={storageStatus.supabaseConnected ? t("supabaseConnected") : storageStatus.mode === "error" ? t("supabaseError") : t("localStorageMode")} />
          <StatusRow icon={<Building2 aria-hidden="true" className="h-4 w-4" />} label={t("transactions")} tone="blue" value={String(transactions.length)} />
          <StatusRow icon={<Archive aria-hidden="true" className="h-4 w-4" />} label={t("dataSource")} tone="neutral" value={storageStatus.mode} />
        </div>
      </section>
    </div>
  );
}

function DatabaseIcon() {
  return <Archive aria-hidden="true" className="h-4 w-4" />;
}
