import { classifyTransaction } from "@/lib/accounting-rules";
import { toDateInputValue } from "@/lib/format";
import type { TransactionDraft } from "@/lib/types";

export type NaturalLanguageParseResult = {
  draft: TransactionDraft;
  confidence: number;
  needsReview: boolean;
  issues: string[];
  summary: string;
};

type ParseOptions = {
  defaultAccount: string;
  defaultCurrency: string;
  now?: Date;
};

type PatternMatch = {
  source: string;
  vendor: string;
  description: string;
  direction: "in" | "out";
};

export const sampleNaturalLanguagePhrases = [
  "Today Meta ads spent 400 dollars",
  "Today Facebook ads spent 400",
  "Shopify payout received 1260 today",
  "Paid supplier 850 for inventory",
  "Paid 120 for Shopify apps",
  "Transferred 500 from Mercury to owner personal account",
  "Owner contributed 2000 to the company"
];

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDate(input: string, now: Date) {
  const lower = input.toLowerCase();

  if (/\btoday\b/.test(lower)) {
    return { date: toDateInputValue(now), matched: true };
  }

  if (/\byesterday\b/.test(lower)) {
    return { date: toDateInputValue(addDays(now, -1)), matched: true };
  }

  const isoDate = lower.match(/\b(20\d{2}-\d{1,2}-\d{1,2})\b/);
  if (isoDate) {
    return { date: toDateInputValue(new Date(`${isoDate[1]}T00:00:00`)), matched: true };
  }

  const slashDate = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashDate) {
    const month = Number(slashDate[1]);
    const day = Number(slashDate[2]);
    const year = slashDate[3]
      ? Number(slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3])
      : now.getFullYear();
    return { date: toDateInputValue(new Date(year, month - 1, day)), matched: true };
  }

  return { date: toDateInputValue(now), matched: false };
}

function removeDateFragments(input: string) {
  return input
    .replace(/\btoday\b/gi, " ")
    .replace(/\byesterday\b/gi, " ")
    .replace(/\b20\d{2}-\d{1,2}-\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ");
}

function parseAmount(input: string) {
  const cleanInput = removeDateFragments(input);
  const amountMatch = cleanInput.match(
    /(?:\$|usd\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(?:usd|dollars?|bucks?))?/i
  );

  if (!amountMatch) {
    return { amount: 0, currency: "USD", matched: false };
  }

  const hasUsd = /\$|usd|dollars?|bucks?/i.test(amountMatch[0]);

  return {
    amount: Number(amountMatch[1].replace(/,/g, "")),
    currency: hasUsd ? "USD" : undefined,
    matched: true
  };
}

function matchBusinessPattern(input: string): PatternMatch | null {
  const lower = input.toLowerCase();

  if (/\b(meta|facebook|instagram)\b/.test(lower) && /\b(ad|ads|advertising|spent|spend)\b/.test(lower)) {
    return {
      source: lower.includes("instagram")
        ? "Instagram Ads"
        : lower.includes("facebook")
          ? "Facebook Ads"
          : "Meta Ads",
      vendor: "Meta Platforms",
      description: "Paid social advertising spend",
      direction: "out"
    };
  }

  if (/\btiktok\b/.test(lower) && /\b(ad|ads|advertising|spent|spend)\b/.test(lower)) {
    return {
      source: "TikTok Ads",
      vendor: "TikTok for Business",
      description: "TikTok advertising spend",
      direction: "out"
    };
  }

  if (/\bshopify\b/.test(lower) && /\b(payout|deposit|received|sales)\b/.test(lower)) {
    return {
      source: "Shopify",
      vendor: "Shopify Payout",
      description: "Shopify payout received",
      direction: "in"
    };
  }

  if (/\bshopify\b/.test(lower) && /\b(app|apps|subscription|plan|theme|plugin)\b/.test(lower)) {
    return {
      source: "Shopify",
      vendor: "Shopify",
      description: "Shopify subscription or app expense",
      direction: "out"
    };
  }

  if (/\b(supplier|inventory|factory|purchase order|po)\b/.test(lower)) {
    return {
      source: "Supplier",
      vendor: "Supplier",
      description: "Supplier payment for inventory",
      direction: "out"
    };
  }

  if (/\b(shipping|fulfillment|3pl|carrier|postage)\b/.test(lower)) {
    return {
      source: "Shipping",
      vendor: "Shipping / Fulfillment Vendor",
      description: "Shipping or fulfillment payment",
      direction: "out"
    };
  }

  if (/\b(domain|hosting|hostinger|namecheap|godaddy|email|google workspace|cloudflare|website)\b/.test(lower)) {
    return {
      source: "Manual",
      vendor: "Website / Hosting Vendor",
      description: "Website, hosting, domain, or email expense",
      direction: "out"
    };
  }

  if (/\bowner\b/.test(lower) && /\b(contributed|contribution|invested|funded|deposited)\b/.test(lower)) {
    return {
      source: "Owner",
      vendor: "Owner",
      description: "Owner contribution into company",
      direction: "in"
    };
  }

  if (/\bmercury\b/.test(lower) && /\bpersonal ibkr|ibkr personal\b/.test(lower)) {
    return {
      source: "Mercury",
      vendor: "Personal IBKR Account",
      description: "Mercury transfer to personal IBKR account",
      direction: "out"
    };
  }

  if (/\bmercury\b/.test(lower) && /\b(company brokerage|business brokerage|corporate brokerage)\b/.test(lower)) {
    return {
      source: "Mercury",
      vendor: "Company Brokerage",
      description: "Mercury transfer to company brokerage account",
      direction: "out"
    };
  }

  if (/\bmercury\b/.test(lower) && /\b(owner personal|personal account|owner account)\b/.test(lower)) {
    return {
      source: "Mercury",
      vendor: "Owner Personal Account",
      description: "Mercury transfer to owner personal account",
      direction: "out"
    };
  }

  if (/\b(received|deposit|income|sale|sales)\b/.test(lower)) {
    return {
      source: "Manual",
      vendor: "Manual income",
      description: "Manual income entry",
      direction: "in"
    };
  }

  if (/\b(paid|spent|payment|transferred|transfer)\b/.test(lower)) {
    return {
      source: "Manual",
      vendor: "Manual expense",
      description: "Manual expense entry",
      direction: "out"
    };
  }

  return null;
}

function confidenceLabel(confidence: number) {
  if (confidence >= 0.85) return "High confidence";
  if (confidence >= 0.7) return "Medium confidence";
  return "Needs review";
}

export function parseNaturalLanguageTransaction(
  input: string,
  options: ParseOptions
): NaturalLanguageParseResult {
  const normalized = normalize(input);
  const now = options.now ?? new Date();
  const parsedDate = parseDate(normalized, now);
  const parsedAmount = parseAmount(normalized);
  const pattern = matchBusinessPattern(normalized);
  const issues: string[] = [];
  const direction = pattern?.direction;

  if (!normalized) issues.push("Enter a transaction sentence.");
  if (!parsedAmount.matched || parsedAmount.amount <= 0) issues.push("Amount was not found.");
  if (!pattern) issues.push("No accounting rule matched.");
  if (!parsedDate.matched) issues.push("No date was found; using today.");

  const moneyIn = direction === "in" ? parsedAmount.amount : 0;
  const moneyOut = direction === "out" ? parsedAmount.amount : 0;
  const baseDraft: TransactionDraft = {
    date: parsedDate.date,
    account: options.defaultAccount,
    source: pattern?.source ?? "Manual",
    vendor: pattern?.vendor ?? "",
    description: pattern?.description ?? normalized,
    currency: parsedAmount.currency ?? options.defaultCurrency,
    money_in: moneyIn,
    money_out: moneyOut,
    category: "Uncategorized",
    tax_line: "Needs review",
    receipt_required: true,
    receipt_link: "",
    reconciled: false,
    notes: `Parsed from: "${normalized}"`
  };
  const rule = classifyTransaction(baseDraft);
  const matchedRule = rule.category !== "Uncategorized";
  const confidence = Math.min(
    0.99,
    0.2 +
      (parsedAmount.matched ? 0.3 : 0) +
      (pattern ? 0.2 : 0) +
      (matchedRule ? 0.2 : 0) +
      (direction ? 0.05 : 0) +
      (parsedDate.matched ? 0.05 : 0)
  );
  const needsReview = confidence < 0.7 || issues.some((issue) => issue !== "No date was found; using today.");
  const reviewNote = needsReview ? ` Needs review: ${issues.join(" ")}` : "";

  return {
    draft: {
      ...baseDraft,
      category: rule.category,
      tax_line: rule.tax_line,
      receipt_required: rule.receipt_required,
      reconciled: needsReview ? false : rule.reconciled,
      notes: `${baseDraft.notes}${rule.notes ? ` ${rule.notes}` : ""}${reviewNote}`.trim()
    },
    confidence,
    needsReview,
    issues,
    summary: confidenceLabel(confidence)
  };
}
