import { categories } from "@/lib/seed-data";
import type { TransactionDraft } from "@/lib/types";

export type RuleResult = {
  category: string;
  tax_line: string;
  receipt_required: boolean;
  reconciled: boolean;
  notes?: string;
  reason: string;
};

const categoryByName = new Map(categories.map((category) => [category.name, category]));

function result(
  categoryName: string,
  reason: string,
  overrides: Partial<RuleResult> = {}
): RuleResult {
  const category = categoryByName.get(categoryName) ?? categoryByName.get("Uncategorized");

  return {
    category: category?.name ?? "Uncategorized",
    tax_line: category?.tax_line ?? "Needs review",
    receipt_required: category?.receipt_required_default ?? true,
    reconciled: true,
    reason,
    ...overrides
  };
}

export function classifyTransaction(
  transaction: Partial<TransactionDraft>
): RuleResult {
  const text = [
    transaction.account,
    transaction.source,
    transaction.vendor,
    transaction.description,
    transaction.notes
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const moneyIn = Number(transaction.money_in ?? 0);

  if (/shopify/.test(text) && /payout|deposit|sales/.test(text) && moneyIn > 0) {
    return result("Revenue", "Shopify payout is revenue that needs reconciliation.", {
      reconciled: false,
      notes: "Needs reconciliation to Shopify gross sales, refunds, fees, and sales tax."
    });
  }

  if (/meta ads|facebook ads|facebook|meta platforms|tiktok ads|tiktok/.test(text)) {
    return result("Advertising Expense", "Ad platforms are advertising expense.");
  }

  if (/supplier|factory|inventory|purchase order|po-|product cost|cogs|alibaba|shenzhen/.test(text)) {
    return result("Product Cost / COGS", "Supplier payments are product cost / COGS.");
  }

  if (/shipping|fulfillment|3pl|shipbob|shipstation|ups|fedex|usps|dhl/.test(text)) {
    return result("Shipping / Fulfillment", "Shipping payments are fulfillment expense.");
  }

  if (/shopify/.test(text) && /subscription|app|apps|plan|theme|plugin/.test(text)) {
    return result("Software Expense", "Shopify subscription and apps are software expense.");
  }

  if (/domain|hosting|hostinger|namecheap|godaddy|email|google workspace|cloudflare|website/.test(text)) {
    return result("Website / Hosting", "Domain, hosting, and email are website / hosting expense.");
  }

  if (/owner/.test(text) && moneyIn > 0) {
    return result("Owner Contribution", "Owner money into the company is owner contribution.", {
      reconciled: true
    });
  }

  if (/personal ibkr|owner personal|personal account|member distribution|owner draw/.test(text)) {
    return result(
      "Owner Draw / Member Distribution",
      "Transfer to owner or personal IBKR is owner draw, not a business expense.",
      {
        receipt_required: false,
        reconciled: true,
        notes: "Classified as owner draw / member distribution, not deductible expense."
      }
    );
  }

  if (/company brokerage|business brokerage|corporate brokerage|investment account/.test(text)) {
    return result("Investment Transfer", "Transfer to company brokerage is investment transfer.", {
      receipt_required: false,
      reconciled: true
    });
  }

  return result("Uncategorized", "No rule matched; review manually.", {
    reconciled: false
  });
}
