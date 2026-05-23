import type { Category } from "@/lib/types";

export const receiptRequiredDefaultsByCategory: Record<string, boolean> = {
  "Advertising Expense": true,
  "Bank Fees": true,
  "Internal Transfer": false,
  "Investment Transfer": false,
  "Owner Contribution": false,
  "Owner Draw / Member Distribution": false,
  "Payment Processing Fees": true,
  "Product Cost / COGS": true,
  Revenue: false,
  "Shipping / Fulfillment": true,
  "Software Expense": true,
  Uncategorized: true,
  "Website / Hosting": true
};

export function getReceiptRequiredDefault(categoryName: string, fallback = true) {
  return receiptRequiredDefaultsByCategory[categoryName] ?? fallback;
}

export function normalizeCategoryReceiptDefault<T extends Pick<Category, "name" | "receipt_required_default">>(
  category: T
): T {
  return {
    ...category,
    receipt_required_default: getReceiptRequiredDefault(
      category.name,
      Boolean(category.receipt_required_default)
    )
  };
}

export function isExpenseReceiptCategory(category: Pick<Category, "type"> | undefined) {
  return category?.type === "Expense" || category?.type === "COGS";
}
