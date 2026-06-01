import { groupByCategory, groupByTaxLine, summarizeTransactions } from "@/lib/calculations";
import type { AuditLog, Transaction } from "@/lib/types";

type CellValue = string | number | boolean | null | undefined;
type CellKind = "date" | "money" | "month" | "number" | "string";

type ExcelCell = {
  formula?: string;
  kind?: CellKind;
  style?: number;
  value?: CellValue;
};

type ExcelRow = Array<CellValue | ExcelCell>;

type WorksheetDefinition = {
  autoFilterRows?: number;
  headers: string[];
  instruction?: string;
  name: string;
  rows: ExcelRow[];
  title: string;
  widths?: number[];
};

export type TaxPackageWorkbookData = {
  categorySummaryRows: ExcelRow[];
  filteredTransactions: Transaction[];
  missingReceiptRows: ExcelRow[];
  monthlyPnlRows: ExcelRow[];
  needsReviewRows: ExcelRow[];
  ownerActivityRows: ExcelRow[];
  quarterlyPnlRows: ExcelRow[];
  receiptIndexRows: ExcelRow[];
  reconciliationIssueRows: ExcelRow[];
  summaryRows: ExcelRow[];
  transactionRows: ExcelRow[];
};

type DownloadExcelOptions = {
  auditLogs?: AuditLog[];
  reportPeriod?: string;
  title?: string;
};

const NAVY = "1E3A5F";
const LIGHT = "F8FAFC";
const GRID = "CBD5E1";
const AMBER = "FEF3C7";
const GREEN = "DCFCE7";
const RED = "FEE2E2";

export const BOSS_FINANCE_WORKBOOK_SHEET_COUNT = 9;

const STYLE = {
  amber: 8,
  date: 5,
  green: 9,
  header: 3,
  label: 11,
  money: 6,
  month: 7,
  red: 10,
  text: 4,
  title: 1,
  instruction: 2
} as const;

const dailyHeaders = [
  "日期",
  "类型",
  "分类",
  "项目/用途",
  "收入金额",
  "支出金额",
  "支付方式",
  "账户/卡号",
  "商家/平台",
  "订单号/发票号",
  "票据图片/链接",
  "是否可报销",
  "票据状态",
  "备注",
  "币种",
  "净额",
  "月份",
  "剩余金额"
];

const dailyWidths = [12, 10, 14, 24, 14, 14, 14, 20, 24, 22, 30, 12, 12, 28, 10, 14, 12, 14];

const shopifyHeaders = [
  "日期",
  "店铺/品牌",
  "订单数",
  "商品销售额（USD）",
  "折扣金额（USD）",
  "退款金额（USD）",
  "运费收入（USD）",
  "税费收入（USD）",
  "总销售额（USD）",
  "Shopify手续费（USD）",
  "支付手续费（USD）",
  "广告费（USD）",
  "其他成本（USD）",
  "净营业额（USD）",
  "币种",
  "当日汇率（USD→RMB）",
  "折合人民币收入（RMB）",
  "到账账户/备注",
  "月份"
];

const shopifyWidths = [12, 18, 10, 18, 18, 18, 18, 18, 18, 18, 18, 16, 16, 18, 10, 18, 20, 24, 12];

const monthlyHeaders = ["月份", "总收入", "总支出", "净额", "可报销支出", "缺失票据笔数"];
const monthlyWidths = [12, 14, 14, 14, 16, 16];

const categoryLabelMap: Record<string, string> = {
  "Advertising Expense": "广告费用",
  "Bank Fees": "银行手续费",
  "Internal Transfer": "内部转账",
  "Investment Transfer": "投资转账",
  "Owner Contribution": "业主投入",
  "Owner Draw / Member Distribution": "业主提取",
  "Payment Processing Fees": "支付手续费",
  "Product Cost / COGS": "库存采购",
  "Refunds / Contra Revenue": "退款 / 抵减收入",
  Revenue: "销售收入",
  "Shipping / Fulfillment": "物流费用",
  "Software Expense": "软件订阅",
  Uncategorized: "待分类",
  "Website / Hosting": "网站 / 主机"
};

function categoryLabel(value: string) {
  return categoryLabelMap[value] ?? value;
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: unknown) {
  return escapeXml(value).replace(/"/g, "&quot;");
}

function columnName(index: number) {
  let value = index;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function cellRef(rowIndex: number, columnIndex: number) {
  return `${columnName(columnIndex)}${rowIndex}`;
}

function sanitizeSheetName(name: string) {
  return name.replace(/[\\/?*:[\]]/g, " ").slice(0, 31) || "Sheet";
}

function textValue(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function parseNoteField(notes: string, label: string) {
  const match = notes.match(new RegExp(`${label}[：:]\\s*([^\\n\\r]+)`));
  return match?.[1]?.trim() ?? "";
}

function transactionTypeLabel(transaction: Transaction) {
  const text = [
    transaction.category,
    transaction.source,
    transaction.vendor,
    transaction.description,
    transaction.notes
  ].join(" ");

  if (/Owner Contribution|业主投入|老板垫资|公司注资/i.test(text)) return "业主投入";
  if (/Owner Draw|Member Distribution|业主提取|个人账户|提现给老板/i.test(text)) return "业主提取";
  if (/Investment Transfer|Internal Transfer|转账|转入|转出/i.test(text)) return "转账";
  if (/Reimbursement|报销/i.test(text)) return "报销";
  if (transaction.money_in > 0 && transaction.money_out <= 0) return "收入";

  return "支出";
}

function receiptStatusLabel(transaction: Transaction) {
  const noteStatus = parseNoteField(transaction.notes, "票据状态");

  if (/已上传|已保存/.test(noteStatus)) return noteStatus.includes("保存") ? "已保存" : "已上传";
  if (/无需/.test(noteStatus)) return "无需";
  if (/待补|缺失/.test(noteStatus)) return "待补";
  if (transaction.receipt_link) return "已上传";
  if (!transaction.receipt_required) return "无需";
  return "待补";
}

function isReimbursable(transaction: Transaction) {
  const value = parseNoteField(transaction.notes, "是否可报销");

  if (/是|yes|true/i.test(value)) return true;
  if (/否|no|false/i.test(value)) return false;
  return /可报销|reimbursable/i.test(transaction.notes);
}

function paymentMethod(transaction: Transaction) {
  return parseNoteField(transaction.notes, "支付方式") || transaction.source || "";
}

function orderOrInvoice(transaction: Transaction) {
  return parseNoteField(transaction.notes, "订单号/发票号") ||
    textValue(transaction.notes.match(/(?:订单号|发票号|invoice|inv|order|#)\s*[:：#]?\s*([A-Za-z0-9._-]+)/i)?.[1]);
}

function monthKey(date: string) {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "";
}

function isDateText(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function excelDateSerial(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const excelEpoch = Date.UTC(1899, 11, 30);

  return Math.round((utc - excelEpoch) / 86400000);
}

function dailyRows(transactions: Transaction[]): ExcelRow[] {
  return transactions.map((transaction, index) => {
    const rowNumber = index + 4;
    const netFormula = `E${rowNumber}-F${rowNumber}`;
    const balanceFormula = index === 0
      ? `P${rowNumber}`
      : `R${rowNumber - 1}+P${rowNumber}`;

    return [
      { kind: "date", value: transaction.date },
      transactionTypeLabel(transaction),
      categoryLabel(transaction.category),
      transaction.description,
      { kind: "money", value: transaction.money_in || 0 },
      { kind: "money", value: transaction.money_out || 0 },
      paymentMethod(transaction),
      parseNoteField(transaction.notes, "账户/卡号") || transaction.account,
      transaction.vendor || transaction.source,
      orderOrInvoice(transaction),
      transaction.receipt_link,
      isReimbursable(transaction) ? "是" : "否",
      receiptStatusLabel(transaction),
      transaction.notes,
      transaction.currency || "USD",
      { formula: netFormula, kind: "money", value: numberValue(transaction.money_in) - numberValue(transaction.money_out) },
      { formula: `TEXT(A${rowNumber},"yyyy-mm")`, kind: "month", value: monthKey(transaction.date) },
      { formula: balanceFormula, kind: "money" }
    ] satisfies ExcelRow;
  });
}

function dailyBookkeepingSheet(transactions: Transaction[]): WorksheetDefinition {
  return {
    headers: dailyHeaders,
    instruction:
      "每天记录一行：日期、金额、支付方式、票据图片/链接。金额默认按人民币 CNY / ¥ 记录；如有美元等外币，可在「币种」列标注。",
    name: "每日记账",
    rows: dailyRows(transactions),
    title: "人民币日常记账明细表 RMB Daily Bookkeeping",
    widths: dailyWidths
  };
}

function isShopifyTransaction(transaction: Transaction) {
  return /shopify/i.test([
    transaction.source,
    transaction.vendor,
    transaction.description,
    transaction.category,
    transaction.notes
  ].join(" "));
}

function shopifyRows(transactions: Transaction[]): ExcelRow[] {
  return transactions
    .filter(isShopifyTransaction)
    .map((transaction, index) => {
      const rowNumber = index + 4;
      const salesAmount = transaction.money_in || 0;

      return [
        { kind: "date", value: transaction.date },
        transaction.vendor || "Shopify",
        "",
        { kind: "money", value: salesAmount },
        { kind: "money", value: "" },
        { kind: "money", value: transaction.money_out || "" },
        { kind: "money", value: "" },
        { kind: "money", value: "" },
        { formula: `D${rowNumber}-E${rowNumber}-F${rowNumber}+G${rowNumber}+H${rowNumber}`, kind: "money", value: salesAmount - transaction.money_out },
        { kind: "money", value: "" },
        { kind: "money", value: "" },
        { kind: "money", value: "" },
        { kind: "money", value: "" },
        { formula: `I${rowNumber}-J${rowNumber}-K${rowNumber}-L${rowNumber}-M${rowNumber}`, kind: "money", value: salesAmount - transaction.money_out },
        transaction.currency || "USD",
        "",
        { formula: `N${rowNumber}*P${rowNumber}`, kind: "money" },
        transaction.account || transaction.notes,
        { formula: `TEXT(A${rowNumber},"yyyy-mm")`, kind: "month", value: monthKey(transaction.date) }
      ] satisfies ExcelRow;
    });
}

function shopifyRevenueSheet(transactions: Transaction[]): WorksheetDefinition {
  return {
    headers: shopifyHeaders,
    instruction:
      "填写方式：Shopify后台导出的商品销售额、折扣、退款、运费、税费、手续费等金额都按美元USD填写；汇率列填写当天 USD→RMB 汇率；折合人民币收入按净营业额USD × 当日汇率换算。",
    name: "Shopify每日营业额",
    rows: shopifyRows(transactions),
    title: "Shopify每日营业额收入表 Shopify Daily Revenue（美元入账 / 汇率折算人民币）",
    widths: shopifyWidths
  };
}

function monthlyKeys(transactions: Transaction[]) {
  return Array.from(new Set(transactions.map((transaction) => monthKey(transaction.date)).filter(Boolean))).sort();
}

function missingReceiptCount(transactions: Transaction[], month: string) {
  return transactions.filter((transaction) =>
    monthKey(transaction.date) === month &&
    transaction.receipt_required &&
    !transaction.receipt_link
  ).length;
}

function reimbursableExpenseTotal(transactions: Transaction[], month: string) {
  return transactions
    .filter((transaction) => monthKey(transaction.date) === month && isReimbursable(transaction))
    .reduce((sum, transaction) => sum + numberValue(transaction.money_out), 0);
}

function monthlySummarySheet(transactions: Transaction[]): WorksheetDefinition {
  const keys = monthlyKeys(transactions);
  const rows: ExcelRow[] = keys.map((key, index) => {
    const rowNumber = index + 4;
    const monthTransactions = transactions.filter((transaction) => monthKey(transaction.date) === key);
    const income = monthTransactions.reduce((sum, transaction) => sum + numberValue(transaction.money_in), 0);
    const expense = monthTransactions.reduce((sum, transaction) => sum + numberValue(transaction.money_out), 0);

    return [
      { kind: "month", value: key },
      { formula: `SUMIF('每日记账'!$Q:$Q,A${rowNumber},'每日记账'!$E:$E)`, kind: "money", value: income },
      { formula: `SUMIF('每日记账'!$Q:$Q,A${rowNumber},'每日记账'!$F:$F)`, kind: "money", value: expense },
      { formula: `B${rowNumber}-C${rowNumber}`, kind: "money", value: income - expense },
      {
        formula: `SUMIFS('每日记账'!$F:$F,'每日记账'!$Q:$Q,A${rowNumber},'每日记账'!$L:$L,"是")`,
        kind: "money",
        value: reimbursableExpenseTotal(transactions, key)
      },
      missingReceiptCount(transactions, key)
    ];
  });

  const summary = summarizeTransactions(transactions);
  const shopifyIncome = transactions
    .filter(isShopifyTransaction)
    .reduce((sum, transaction) => sum + numberValue(transaction.money_in), 0);
  const methods = Array.from(new Set(transactions.map(paymentMethod).filter(Boolean))).sort();

  rows.push(
    [],
    [{ style: STYLE.label, value: "附加汇总" }, "", "", "", "", ""],
    ["支付方式", methods.join(" / ") || "-", "全年支出", { kind: "money", value: summary.expenses + summary.cogs }, "Shopify收入", { kind: "money", value: shopifyIncome }],
    ["Shopify订单数", "", "", "", "", ""]
  );

  return {
    autoFilterRows: keys.length,
    headers: monthlyHeaders,
    instruction: "按月份汇总收入、支出、净额、可报销支出与缺失票据，方便月结复核与 CPA 交接。",
    name: "月度汇总",
    rows,
    title: "月度汇总 Monthly Summary",
    widths: monthlyWidths
  };
}

function summarySheet(transactions: Transaction[], title: string): WorksheetDefinition {
  const summary = summarizeTransactions(transactions);

  return {
    headers: ["指标", "金额"],
    instruction: "系统根据当前导出范围生成的经营汇总。",
    name: "经营汇总",
    rows: [
      ["总收入", { kind: "money", value: summary.revenue }],
      ["销售成本", { kind: "money", value: summary.cogs }],
      ["运营支出", { kind: "money", value: summary.expenses }],
      ["毛利润", { kind: "money", value: summary.gross_profit }],
      ["净利润", { kind: "money", value: summary.net_income }],
      ["业主投入", { kind: "money", value: summary.owner_contributions }],
      ["业主提取", { kind: "money", value: summary.owner_draws }],
      ["投资转账", { kind: "money", value: summary.investment_transfers }],
      ["现金净额", { kind: "money", value: summary.cash_net }]
    ],
    title,
    widths: [24, 18]
  };
}

function categorySummarySheet(transactions: Transaction[]): WorksheetDefinition {
  return {
    headers: ["分类", "类型", "收入金额", "支出金额", "净额"],
    instruction: "按 Mercury Books 分类汇总导出范围内的交易。",
    name: "分类汇总",
    rows: groupByCategory(transactions).map((row) => [
      categoryLabel(row.label),
      row.type,
      { kind: "money", value: row.money_in },
      { kind: "money", value: row.money_out },
      { kind: "money", value: row.net }
    ]),
    title: "分类汇总 Category Summary",
    widths: [24, 14, 14, 14, 14]
  };
}

function taxLineSummarySheet(transactions: Transaction[]): WorksheetDefinition {
  return {
    headers: ["税务归类", "收入金额", "支出金额", "净额"],
    instruction: "按税务归类汇总，供税务资料包和 CPA 复核使用。",
    name: "税务分类汇总",
    rows: groupByTaxLine(transactions).map((row) => [
      row.label,
      { kind: "money", value: row.money_in },
      { kind: "money", value: row.money_out },
      { kind: "money", value: row.net }
    ]),
    title: "税务分类汇总 Tax Category Summary",
    widths: [30, 14, 14, 14]
  };
}

const bossDetailHeaders = [
  "日期",
  "月份",
  "交易类型",
  "业务模块",
  "分类",
  "这笔钱是干什么的",
  "收入金额",
  "支出金额",
  "净额",
  "币种",
  "支付方式",
  "账户/卡号",
  "商家/平台",
  "交易对象",
  "订单号/发票号",
  "票据状态",
  "是否已核对",
  "是否可报销",
  "风险标记",
  "老板备注",
  "处理建议",
  "原始备注",
  "票据图片/链接"
];

const bossDetailWidths = [12, 12, 12, 14, 16, 30, 14, 14, 14, 10, 14, 20, 22, 22, 20, 12, 12, 12, 18, 22, 24, 28, 30];
const LARGE_EXPENSE_THRESHOLD = 1000;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readNoteField(transaction: Transaction, label: string) {
  const match = transaction.notes.match(new RegExp(`${escapeRegExp(label)}\\s*[:：]\\s*([^\\n\\r]+)`, "i"));
  return match?.[1]?.trim() ?? "";
}

function transactionSearchText(transaction: Transaction) {
  return [
    transaction.category,
    transaction.tax_line,
    transaction.source,
    transaction.vendor,
    transaction.description,
    transaction.notes
  ].join(" ");
}

function bossTypeLabel(transaction: Transaction) {
  const text = transactionSearchText(transaction);

  if (/Owner Contribution|业主投入|老板垫资|公司注资|个人打款到公司/i.test(text)) return "业主投入";
  if (/Owner Draw|Member Distribution|业主提取|个人账户|提现给老板|老板个人账户/i.test(text)) return "业主提取";
  if (/Reimbursement|报销/i.test(text)) return "报销";
  if (/Investment Transfer|Internal Transfer|转账|转入|转出|transfer/i.test(text)) return "转账";
  if (numberValue(transaction.money_in) > 0 && numberValue(transaction.money_out) <= 0) return "收入";

  return "支出";
}

function merchantOrPlatform(transaction: Transaction) {
  return textValue(transaction.vendor || transaction.source || readNoteField(transaction, "商家/平台"));
}

function accountOrCard(transaction: Transaction) {
  return readNoteField(transaction, "账户/卡号") || transaction.account || "";
}

function counterparty(transaction: Transaction) {
  return readNoteField(transaction, "交易对象") || readNoteField(transaction, "商家/平台") || merchantOrPlatform(transaction);
}

function bossReceiptStatus(transaction: Transaction) {
  const explicit = readNoteField(transaction, "票据状态");

  if (/已上传|已保存|uploaded|linked/i.test(explicit)) return explicit.includes("保存") ? "已保存" : "已上传";
  if (/无需|not required|optional/i.test(explicit)) return "无需";
  if (/待补|缺失|缺票|missing/i.test(explicit)) return "待补";
  if (transaction.receipt_link) return "已上传";
  if (!transaction.receipt_required) return "无需";
  return "缺失票据";
}

function bossIsMissingReceipt(transaction: Transaction) {
  const status = bossReceiptStatus(transaction);
  return transaction.receipt_required && !transaction.receipt_link && status !== "无需";
}

function bossIsReimbursable(transaction: Transaction) {
  const explicit = readNoteField(transaction, "是否可报销");

  if (/是|yes|true/i.test(explicit)) return true;
  if (/否|no|false/i.test(explicit)) return false;
  return isReimbursable(transaction);
}

function hasTaxReviewRisk(transaction: Transaction) {
  return (
    !transaction.category ||
    transaction.category === "Uncategorized" ||
    !transaction.tax_line ||
    transaction.tax_line === "Needs review" ||
    /needs review|review manually|uncategorized|待分类|待复核|需CPA复核/i.test(transactionSearchText(transaction))
  );
}

function businessModule(transaction: Transaction) {
  const text = transactionSearchText(transaction);
  const type = bossTypeLabel(transaction);

  if (type === "业主投入" || type === "业主提取") return "业主资金";
  if (/Advertising Expense|广告|Meta|Facebook|FB 广告|Google Ads|TikTok Ads/i.test(text)) return "广告投放";
  if (/Product Cost|COGS|库存|采购|供应商|进货|拿货|货款/i.test(text)) return "库存采购";
  if (/Revenue|销售|Shopify 打款|Shopify 销售|客户付款|订单收入/i.test(text)) return "平台收入";
  if (/Software Expense|Website \/ Hosting|软件|订阅|Shopify App|Shopify 应用|插件|月费/i.test(text)) return "软件工具";
  if (/Shipping|Fulfillment|物流|运费|快递|仓储|delivery/i.test(text)) return "物流仓储";
  if (/Bank Fees|Payment Processing Fees|手续费|PayPal|bank fee|processing fee/i.test(text)) return "银行手续费";

  return "其他";
}

export function getBossTransactionPurpose(transaction: Transaction) {
  const businessArea = businessModule(transaction);
  const merchant = merchantOrPlatform(transaction);
  const description = textValue(transaction.description);
  const type = bossTypeLabel(transaction);

  if (businessArea === "广告投放") return `${merchant || "广告平台"} 广告投放支出`;
  if (businessArea === "平台收入" && type === "收入") return `${merchant || "电商平台"} 销售回款`;
  if (businessArea === "库存采购") return /潮玩/.test(description) ? "采购潮玩库存" : "采购库存支出";
  if (type === "业主提取") return "业主提取 / 转至个人账户";
  if (type === "业主投入") return "业主投入公司资金";
  if (businessArea === "软件工具") return `${merchant ? `${merchant} ` : ""}软件/应用订阅费`;
  if (businessArea === "银行手续费") return `${merchant ? `${merchant} ` : ""}银行或支付手续费`;
  if (businessArea === "物流仓储") return "物流运费支出";

  const readable = [merchant, description].filter(Boolean).join(" - ").trim();
  if (readable) return readable.slice(0, 120);

  return `${categoryLabel(transaction.category) || "未分类"}${type}交易`;
}

function transactionRiskFlags(transaction: Transaction) {
  const risks: string[] = [];

  if (bossIsMissingReceipt(transaction)) risks.push("缺票据");
  if (!transaction.reconciled) risks.push("未核对");
  if (numberValue(transaction.money_out) > LARGE_EXPENSE_THRESHOLD) risks.push("大额支出");
  if (bossTypeLabel(transaction) === "业主提取") risks.push("需老板确认");
  if (hasTaxReviewRisk(transaction)) risks.push("需CPA复核");

  return risks.length ? risks : ["正常"];
}

function riskStyle(risks: string[] | string) {
  const text = Array.isArray(risks) ? risks.join(" ") : risks;

  if (/正常/.test(text)) return STYLE.green;
  if (/大额支出|需老板确认|需CPA复核/.test(text)) return STYLE.red;
  if (/缺票据|未核对|需要关注/.test(text)) return STYLE.amber;
  return STYLE.text;
}

function suggestionForRisks(risks: string[] | string) {
  const text = Array.isArray(risks) ? risks.join(" ") : risks;
  const suggestions: string[] = [];

  if (/缺票据/.test(text)) suggestions.push("请补充收据或发票");
  if (/未核对/.test(text)) suggestions.push("请完成银行对账");
  if (/大额支出/.test(text)) suggestions.push("建议老板复核");
  if (/需老板确认/.test(text)) suggestions.push("请老板确认资金用途");
  if (/需CPA复核/.test(text)) suggestions.push("请CPA确认税务分类");

  return suggestions.length ? Array.from(new Set(suggestions)).join("；") : "无需处理";
}

function todoPriority(transaction: Transaction) {
  const risks = transactionRiskFlags(transaction);

  if (risks.includes("缺票据") && risks.includes("大额支出")) return "高";
  if (risks.includes("需老板确认") && risks.includes("大额支出")) return "高";
  if (risks.some((risk) => risk !== "正常")) return "中";
  if (!transaction.description && !transaction.notes) return "低";
  return "";
}

function ownerForRisks(risks: string[] | string) {
  const text = Array.isArray(risks) ? risks.join(" ") : risks;

  if (/需CPA复核/.test(text)) return "CPA";
  if (/需老板确认|大额支出/.test(text)) return "老板";
  return "运营";
}

function missingReceiptAmount(transactions: Transaction[]) {
  return transactions.filter(bossIsMissingReceipt).reduce((sum, transaction) => sum + numberValue(transaction.money_out), 0);
}

function totalIncome(transactions: Transaction[]) {
  return transactions.reduce((sum, transaction) => sum + numberValue(transaction.money_in), 0);
}

function totalExpense(transactions: Transaction[]) {
  return transactions.reduce((sum, transaction) => sum + numberValue(transaction.money_out), 0);
}

function expenseByModule(transactions: Transaction[], module: string) {
  return transactions
    .filter((transaction) => businessModule(transaction) === module)
    .reduce((sum, transaction) => sum + numberValue(transaction.money_out), 0);
}

function incomeByType(transactions: Transaction[], type: string) {
  return transactions
    .filter((transaction) => bossTypeLabel(transaction) === type)
    .reduce((sum, transaction) => sum + numberValue(transaction.money_in), 0);
}

function expenseByType(transactions: Transaction[], type: string) {
  return transactions
    .filter((transaction) => bossTypeLabel(transaction) === type)
    .reduce((sum, transaction) => sum + numberValue(transaction.money_out), 0);
}

function latestMonthKey(transactions: Transaction[]) {
  return monthlyKeys(transactions).at(-1) ?? new Date().toISOString().slice(0, 7);
}

function transactionsForMonth(transactions: Transaction[], month: string) {
  return transactions.filter((transaction) => monthKey(transaction.date) === month);
}

function statusCell(value: string) {
  return { style: riskStyle(value), value };
}

function money(value: unknown): ExcelCell {
  return { kind: "money", value: numberValue(value) };
}

function noDataRow(message: string, columns: number): ExcelRow {
  return Array.from({ length: columns }, (_, index) => (index === 0 ? message : ""));
}

function bossDashboardSheet(transactions: Transaction[]): WorksheetDefinition {
  const focusMonth = latestMonthKey(transactions);
  const monthTransactions = transactionsForMonth(transactions, focusMonth);
  const income = totalIncome(monthTransactions);
  const expense = totalExpense(monthTransactions);
  const net = income - expense;
  const missingCount = monthTransactions.filter(bossIsMissingReceipt).length;
  const missingAmount = missingReceiptAmount(monthTransactions);
  const unreconciledCount = monthTransactions.filter((transaction) => !transaction.reconciled).length;
  const advertising = expenseByModule(monthTransactions, "广告投放");
  const inventory = expenseByModule(monthTransactions, "库存采购");
  const software = expenseByModule(monthTransactions, "软件工具");
  const logistics = expenseByModule(monthTransactions, "物流仓储");
  const reimbursableAmount = monthTransactions
    .filter(bossIsReimbursable)
    .reduce((sum, transaction) => sum + numberValue(transaction.money_out), 0);
  const ownerContribution = incomeByType(monthTransactions, "业主投入");
  const ownerDraw = expenseByType(monthTransactions, "业主提取");
  const cpaReviewCount = monthTransactions.filter(hasTaxReviewRisk).length;
  const rows: ExcelRow[] = [
    [{ style: STYLE.label, value: `看板月份：${focusMonth}` }, "", "", ""],
    ["总收入", money(income), statusCell(income > 0 ? "正常" : "需要关注"), "确认本月销售回款是否完整"],
    ["总支出", money(expense), statusCell(expense > income && income > 0 ? "需要关注" : "正常"), "关注支出是否超过收入"],
    ["净额", money(net), statusCell(net >= 0 ? "正常" : "需要关注"), net >= 0 ? "现金流为正" : "现金流为负，建议复核主要支出"],
    ["当前剩余金额 / 现金余额", money(net), statusCell("正常"), "未提供期初余额时使用本月净额作为参考"],
    ["缺失票据金额", money(missingAmount), statusCell(missingAmount > 0 ? "需要关注" : "正常"), missingAmount > 0 ? "请补充收据或发票" : "票据风险较低"],
    ["未核对交易数", unreconciledCount, statusCell(unreconciledCount > 0 ? "需要关注" : "正常"), unreconciledCount > 0 ? "请完成银行对账" : "对账状态良好"],
    ["可报销金额", money(reimbursableAmount), statusCell("正常"), "确认报销规则与票据完整性"],
    ["本月广告费", money(advertising), statusCell(advertising > Math.max(1000, income * 0.3) ? "需要关注" : "正常"), "关注广告投入产出"],
    ["本月库存采购", money(inventory), statusCell(inventory > 1000 ? "需要关注" : "正常"), "确认采购用途与库存记录"],
    ["本月软件订阅", money(software), statusCell(software > 1000 ? "需要关注" : "正常"), "复核工具订阅是否仍在使用"],
    ["本月物流费用", money(logistics), statusCell(logistics > 1000 ? "需要关注" : "正常"), "关注履约成本"],
    ["业主投入", money(ownerContribution), statusCell("正常"), "确认是否为资本投入或垫资"],
    ["业主提取", money(ownerDraw), statusCell(ownerDraw > 0 ? "需要关注" : "正常"), ownerDraw > 0 ? "请老板确认提取用途" : "无需处理"],
    ["业主投入/提取净额", money(ownerContribution - ownerDraw), statusCell(ownerDraw > 0 ? "需要关注" : "正常"), "业主资金流需要单独确认"],
    [],
    [{ style: STYLE.label, value: "老板重点关注" }, "", "", ""],
    ["关注事项", "金额/数量", "风险等级", "处理建议"],
    ["缺失票据", `${missingCount} 笔 / ${missingAmount.toFixed(2)}`, statusCell(missingCount > 0 ? "需要关注" : "正常"), missingCount > 0 ? "请补充收据或发票" : "无需处理"],
    ["广告费过高", money(advertising), statusCell(advertising > Math.max(1000, income * 0.3) ? "需要关注" : "正常"), "复核广告预算与投放效果"],
    ["库存采购较大", money(inventory), statusCell(inventory > 1000 ? "需要关注" : "正常"), "确认供应商、采购清单和票据"],
    ["未核对交易", unreconciledCount, statusCell(unreconciledCount > 0 ? "需要关注" : "正常"), unreconciledCount > 0 ? "请完成银行对账" : "无需处理"],
    ["业主提取", money(ownerDraw), statusCell(ownerDraw > 0 ? "需要关注" : "正常"), ownerDraw > 0 ? "请老板确认提取用途" : "无需处理"],
    ["待CPA复核", cpaReviewCount, statusCell(cpaReviewCount > 0 ? "需要关注" : "正常"), cpaReviewCount > 0 ? "请CPA确认税务分类" : "无需处理"]
  ];

  return {
    headers: ["指标/关注事项", "金额/数量", "风险等级", "处理建议"],
    instruction: "用于快速查看收入、支出、现金流、票据风险和待处理事项。",
    name: "老板看板",
    rows,
    title: "老板财务看板 Executive Finance Dashboard",
    widths: [24, 20, 14, 34]
  };
}

function bossTransactionRows(transactions: Transaction[]): ExcelRow[] {
  return transactions.map((transaction, index) => {
    const rowNumber = index + 4;
    const risks = transactionRiskFlags(transaction);

    return [
      { kind: "date", value: transaction.date },
      { formula: `TEXT(A${rowNumber},"yyyy-mm")`, kind: "month", value: monthKey(transaction.date) },
      bossTypeLabel(transaction),
      businessModule(transaction),
      categoryLabel(transaction.category),
      getBossTransactionPurpose(transaction),
      money(transaction.money_in),
      money(transaction.money_out),
      { formula: `G${rowNumber}-H${rowNumber}`, kind: "money", value: numberValue(transaction.money_in) - numberValue(transaction.money_out) },
      transaction.currency || "USD",
      paymentMethod(transaction),
      accountOrCard(transaction),
      merchantOrPlatform(transaction),
      counterparty(transaction),
      orderOrInvoice(transaction),
      statusCell(bossReceiptStatus(transaction)),
      transaction.reconciled ? "是" : statusCell("否"),
      bossIsReimbursable(transaction) ? "是" : "否",
      { style: riskStyle(risks), value: risks.join(" / ") },
      "",
      suggestionForRisks(risks),
      transaction.notes,
      transaction.receipt_link
    ] satisfies ExcelRow;
  });
}

function bossTransactionDetailSheet(transactions: Transaction[]): WorksheetDefinition {
  return {
    headers: bossDetailHeaders,
    instruction: "用老板能直接理解的方式解释每一笔钱的用途、风险、票据和对账状态。",
    name: "每笔账明细",
    rows: transactions.length ? bossTransactionRows(transactions) : [noDataRow("暂无交易明细。", bossDetailHeaders.length)],
    title: "每笔账明细 Boss-Readable Transaction Detail",
    widths: bossDetailWidths
  };
}

function todoSheet(transactions: Transaction[]): WorksheetDefinition {
  const rows = transactions
    .filter((transaction) => transactionRiskFlags(transaction).some((risk) => risk !== "正常") || (!transaction.description && !transaction.notes))
    .map((transaction) => {
      const risks = transactionRiskFlags(transaction);

      return [
        todoPriority(transaction),
        { kind: "date", value: transaction.date },
        { style: riskStyle(risks), value: risks.join(" / ") },
        money(numberValue(transaction.money_in) - numberValue(transaction.money_out)),
        merchantOrPlatform(transaction),
        getBossTransactionPurpose(transaction),
        `${bossReceiptStatus(transaction)} / ${transaction.reconciled ? "已核对" : "未核对"}`,
        suggestionForRisks(risks),
        ownerForRisks(risks),
        "",
        transaction.receipt_link,
        transaction.notes
      ] satisfies ExcelRow;
    });

  return {
    headers: ["优先级", "日期", "问题类型", "金额", "商家/平台", "这笔钱是干什么的", "当前状态", "处理建议", "负责人", "完成状态", "票据链接", "备注"],
    instruction: "仅列出缺票据、未核对、大额支出、业主提取或需要 CPA 复核的交易，方便先处理风险项。",
    name: "待处理事项",
    rows: rows.length ? rows : [noDataRow("当前没有需要处理的事项。", 12)],
    title: "待处理事项 Action Items",
    widths: [10, 12, 18, 14, 22, 30, 18, 28, 12, 12, 30, 28]
  };
}

function bossMonthlySummarySheet(transactions: Transaction[]): WorksheetDefinition {
  const rows: ExcelRow[] = monthlyKeys(transactions).map((key) => {
    const monthTransactions = transactionsForMonth(transactions, key);
    const income = totalIncome(monthTransactions);
    const expense = totalExpense(monthTransactions);

    return [
      { kind: "month", value: key },
      money(income),
      money(expense),
      money(income - expense),
      money(expenseByModule(monthTransactions, "广告投放")),
      money(expenseByModule(monthTransactions, "库存采购")),
      money(expenseByModule(monthTransactions, "软件工具")),
      money(expenseByModule(monthTransactions, "物流仓储")),
      money(expenseByModule(monthTransactions, "银行手续费")),
      money(incomeByType(monthTransactions, "业主投入")),
      money(expenseByType(monthTransactions, "业主提取")),
      money(missingReceiptAmount(monthTransactions)),
      monthTransactions.filter(bossIsMissingReceipt).length,
      monthTransactions.filter((transaction) => !transaction.reconciled).length,
      "未提供"
    ] satisfies ExcelRow;
  });

  return {
    headers: ["月份", "总收入", "总支出", "净额", "广告费", "库存采购", "软件订阅", "物流费用", "银行手续费", "业主投入", "业主提取", "缺失票据金额", "缺失票据笔数", "未核对笔数", "月结状态"],
    instruction: "按月份汇总收入、支出、净额、主要支出类别、票据风险和对账状态。",
    name: "月度汇总",
    rows: rows.length ? rows : [noDataRow("暂无月度汇总数据。", 15)],
    title: "月度汇总 Monthly Summary",
    widths: [12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 16, 14, 14, 14]
  };
}

function categorySpendingAnalysisSheet(transactions: Transaction[]): WorksheetDefinition {
  const expenseTransactions = transactions.filter((transaction) => numberValue(transaction.money_out) > 0);
  const total = totalExpense(expenseTransactions);
  const grouped = new Map<string, Transaction[]>();

  for (const transaction of expenseTransactions) {
    const key = categoryLabel(transaction.category) || "未分类";
    grouped.set(key, [...(grouped.get(key) ?? []), transaction]);
  }

  const rows = Array.from(grouped.entries())
    .map(([category, categoryTransactions]) => {
      const amount = totalExpense(categoryTransactions);
      const missing = categoryTransactions.filter(bossIsMissingReceipt).length;
      const needsAttention =
        amount > Math.max(LARGE_EXPENSE_THRESHOLD, total * 0.3) ||
        missing > 0 ||
        categoryTransactions.some(hasTaxReviewRisk);

      return [
        category,
        businessModule(categoryTransactions[0]),
        money(amount),
        total > 0 ? `${Math.round((amount / total) * 1000) / 10}%` : "0%",
        categoryTransactions.length,
        missing,
        statusCell(needsAttention ? "需要关注" : "正常"),
        needsAttention ? "金额较高、缺票据或分类待复核" : "支出结构正常"
      ] satisfies ExcelRow;
    })
    .sort((left, right) => numberValue((right[2] as ExcelCell).value) - numberValue((left[2] as ExcelCell).value));

  return {
    headers: ["分类", "业务模块", "支出金额", "占总支出比例", "交易笔数", "缺票据笔数", "是否需要关注", "说明"],
    instruction: "展示钱主要花在哪里，以及哪些分类因为金额、票据或税务分类需要关注。",
    name: "分类支出分析",
    rows: rows.length ? rows : [noDataRow("暂无支出分类数据。", 8)],
    title: "分类支出分析 Category Spending Analysis",
    widths: [18, 14, 14, 14, 12, 14, 16, 32]
  };
}

function accountCashFlowSheet(transactions: Transaction[]): WorksheetDefinition {
  const grouped = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const key = accountOrCard(transaction) || paymentMethod(transaction) || "未提供";
    grouped.set(key, [...(grouped.get(key) ?? []), transaction]);
  }

  const rows = Array.from(grouped.entries())
    .map(([account, accountTransactions]) => {
      const income = totalIncome(accountTransactions);
      const expense = totalExpense(accountTransactions);
      const moduleCounts = accountTransactions.reduce<Record<string, number>>((counts, transaction) => {
        const businessArea = businessModule(transaction);
        counts[businessArea] = (counts[businessArea] ?? 0) + 1;
        return counts;
      }, {});
      const mainUse = Object.entries(moduleCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "未提供";

      return [
        account,
        "未提供",
        money(income),
        money(expense),
        money(income - expense),
        "未提供",
        accountTransactions.length,
        mainUse,
        ""
      ] satisfies ExcelRow;
    })
    .sort((left, right) => numberValue((right[4] as ExcelCell).value) - numberValue((left[4] as ExcelCell).value));

  return {
    headers: ["账户/支付方式", "期初余额", "收入", "支出", "净流入/流出", "期末余额", "交易笔数", "主要用途", "备注"],
    instruction: "按账户、卡号或支付方式展示资金流入流出；未提供余额时保留空白并展示交易汇总。",
    name: "账户资金流",
    rows: rows.length ? rows : [noDataRow("暂无账户资金流数据。", 9)],
    title: "账户资金流 Account Cash Flow",
    widths: [22, 14, 14, 14, 16, 14, 12, 18, 28]
  };
}

function bossShopifyRevenueSheet(transactions: Transaction[]): WorksheetDefinition {
  const shopifyTransactions = transactions.filter(isShopifyTransaction);
  const summarySales = shopifyTransactions.reduce((sum, transaction) => sum + numberValue(transaction.money_in), 0);
  const summaryNet = shopifyTransactions.reduce((sum, transaction) => sum + numberValue(transaction.money_in) - numberValue(transaction.money_out), 0);
  const summaryRows: ExcelRow[] = [
    [{ style: STYLE.label, value: "本月订单数" }, "未提供", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    [{ style: STYLE.label, value: "本月销售额USD" }, money(summarySales), "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    [{ style: STYLE.label, value: "本月净营业额USD" }, money(summaryNet), "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    [{ style: STYLE.label, value: "折合人民币收入" }, "待填写汇率后自动计算", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    []
  ];
  const dataRows = shopifyTransactions.map((transaction, index) => {
    const rowNumber = index + 4 + summaryRows.length;
    const isIncome = numberValue(transaction.money_in) > 0;
    const isAd = businessModule(transaction) === "广告投放";
    const isFee = businessModule(transaction) === "银行手续费";

    return [
      { kind: "date", value: transaction.date },
      merchantOrPlatform(transaction) || "Shopify",
      "",
      money(isIncome ? transaction.money_in : 0),
      money(0),
      money(0),
      money(0),
      money(0),
      { formula: `D${rowNumber}-E${rowNumber}-F${rowNumber}+G${rowNumber}+H${rowNumber}`, kind: "money", value: isIncome ? transaction.money_in : 0 },
      money(isFee ? transaction.money_out : 0),
      money(isAd ? transaction.money_out : 0),
      money(!isFee && !isAd ? transaction.money_out : 0),
      { formula: `I${rowNumber}-J${rowNumber}-K${rowNumber}-L${rowNumber}`, kind: "money", value: numberValue(transaction.money_in) - numberValue(transaction.money_out) },
      "",
      { formula: `M${rowNumber}*N${rowNumber}`, kind: "money" },
      accountOrCard(transaction),
      transaction.notes,
      { formula: `TEXT(A${rowNumber},"yyyy-mm")`, kind: "month", value: monthKey(transaction.date) }
    ] satisfies ExcelRow;
  });

  return {
    autoFilterRows: summaryRows.length + dataRows.length,
    headers: ["日期", "店铺/品牌", "订单数", "商品销售额USD", "折扣USD", "退款USD", "运费USD", "税费USD", "总销售额USD", "手续费USD", "广告费USD", "其他成本USD", "净营业额USD", "汇率", "折合人民币收入", "到账账户", "备注", "月份"],
    instruction: "用于老板查看 Shopify 销售、手续费、广告费和折合人民币收入；没有电商明细时保留模板。",
    name: "Shopify营业额",
    rows: dataRows.length ? [...summaryRows, ...dataRows] : [...summaryRows, noDataRow("暂无 Shopify 营业额数据。", 18)],
    title: "Shopify营业额 Shopify Revenue",
    widths: [12, 18, 10, 16, 12, 12, 12, 12, 16, 14, 14, 14, 16, 10, 18, 18, 26, 12]
  };
}

function taxAndCpaSheet(transactions: Transaction[]): WorksheetDefinition {
  const taxRows = groupByTaxLine(transactions).map((row) => {
    const taxTransactions = transactions.filter((transaction) => transaction.tax_line === row.label);

    return [
      "税务分类汇总",
      row.label,
      money(row.net),
      taxTransactions.length,
      taxTransactions.filter(bossIsMissingReceipt).length,
      "",
      "",
      "",
      "",
      ""
    ] satisfies ExcelRow;
  });
  const reimbursableRows = transactions
    .filter((transaction) => numberValue(transaction.money_out) > 0 && bossIsReimbursable(transaction))
    .map((transaction) => [
      "可报销支出",
      { kind: "date", value: transaction.date },
      money(transaction.money_out),
      "",
      "",
      merchantOrPlatform(transaction),
      getBossTransactionPurpose(transaction),
      bossReceiptStatus(transaction),
      "确认报销规则和票据完整性",
      transaction.notes
    ] satisfies ExcelRow);
  const missingRows = transactions
    .filter(bossIsMissingReceipt)
    .map((transaction) => [
      "缺失票据清单",
      { kind: "date", value: transaction.date },
      money(transaction.money_out),
      "",
      "",
      merchantOrPlatform(transaction),
      getBossTransactionPurpose(transaction),
      bossReceiptStatus(transaction),
      "请补充收据或发票",
      transaction.receipt_link || transaction.notes
    ] satisfies ExcelRow);
  const reviewRows = transactions
    .filter((transaction) => hasTaxReviewRisk(transaction) || !transaction.reconciled)
    .map((transaction) => [
      "待CPA复核交易",
      { kind: "date", value: transaction.date },
      money(numberValue(transaction.money_in) - numberValue(transaction.money_out)),
      "",
      "",
      merchantOrPlatform(transaction),
      getBossTransactionPurpose(transaction),
      bossReceiptStatus(transaction),
      hasTaxReviewRisk(transaction) ? "请CPA确认税务分类" : "请先完成对账",
      transaction.notes
    ] satisfies ExcelRow);
  const rows: ExcelRow[] = [
    [{ style: STYLE.label, value: "税务分类汇总" }, "", "", "", "", "", "", "", "", ""],
    ...(taxRows.length ? taxRows : [noDataRow("暂无税务分类汇总。", 10)]),
    [],
    [{ style: STYLE.label, value: "可报销支出" }, "", "", "", "", "", "", "", "", ""],
    ...(reimbursableRows.length ? reimbursableRows : [noDataRow("暂无可报销支出。", 10)]),
    [],
    [{ style: STYLE.label, value: "缺失票据清单" }, "", "", "", "", "", "", "", "", ""],
    ...(missingRows.length ? missingRows : [noDataRow("暂无缺失票据。", 10)]),
    [],
    [{ style: STYLE.label, value: "待CPA复核交易" }, "", "", "", "", "", "", "", "", ""],
    ...(reviewRows.length ? reviewRows : [noDataRow("暂无待 CPA 复核交易。", 10)])
  ];

  return {
    headers: ["板块", "日期/分类", "金额", "交易笔数", "缺票据笔数", "商家/平台", "这笔钱是干什么的", "票据状态", "CPA复核建议", "备注"],
    instruction: "帮助 CPA 快速查看税务分类、可报销支出、缺失票据和需要复核的交易。",
    name: "税务与CPA资料",
    rows,
    title: "税务与CPA资料 Tax and CPA Package",
    widths: [18, 18, 14, 12, 14, 22, 30, 12, 28, 30]
  };
}

function readableAuditAction(action: string) {
  const labels: Record<string, string> = {
    category_change: "分类变更",
    create: "创建交易",
    delete: "删除交易",
    delete_receipt: "删除收据",
    export_denied: "导出被拒绝",
    member_role_changed: "成员角色变更",
    month_closed: "月结关闭",
    month_reopened: "月结重开",
    permission_denied: "权限被拒绝",
    report_exported: "导出报表",
    replace_receipt: "替换收据",
    settings_updated: "设置更新",
    tax_package_exported: "导出 CPA 资料包",
    transactions_exported: "导出交易",
    update: "更新交易",
    upload_receipt: "上传收据",
    workspace_backup_exported: "导出账本备份"
  };

  return labels[action] ?? action;
}

function bossAuditSummarySheet(auditLogs: AuditLog[] = []): WorksheetDefinition {
  const importantActions = new Set([
    "create",
    "update",
    "delete",
    "upload_receipt",
    "replace_receipt",
    "delete_receipt",
    "report_exported",
    "tax_package_exported",
    "transactions_exported",
    "workspace_backup_exported",
    "export_denied",
    "permission_denied",
    "settings_updated",
    "member_role_changed",
    "month_closed",
    "month_reopened"
  ]);
  const rows = auditLogs
    .filter((entry) => importantActions.has(entry.action))
    .slice(0, 250)
    .map((entry) => [
      entry.created_at,
      entry.actor_email || entry.actor,
      entry.actor_role || "",
      readableAuditAction(entry.action),
      `${entry.entity_type}${entry.entity_id ? ` / ${entry.entity_id}` : ""}`,
      String(entry.details?.result ?? (entry.action.includes("denied") ? "denied" : "success")),
      entry.reason || entry.field_name || ""
    ] satisfies ExcelRow);

  return {
    headers: ["时间", "操作人", "角色", "操作", "对象", "结果", "说明"],
    instruction: "仅包含重要操作摘要，不包含 CSV 内容、票据文件内容、密钥、令牌或原始 JSON。",
    name: "审计日志摘要",
    rows: rows.length ? rows : [noDataRow("暂无可展示的审计日志摘要。", 7)],
    title: "审计日志摘要 Audit Log Summary",
    widths: [24, 24, 12, 18, 28, 12, 42]
  };
}

function bossFinanceWorkbookSheets(transactions: Transaction[], auditLogs: AuditLog[] = []) {
  return [
    bossDashboardSheet(transactions),
    bossTransactionDetailSheet(transactions),
    todoSheet(transactions),
    bossMonthlySummarySheet(transactions),
    categorySpendingAnalysisSheet(transactions),
    accountCashFlowSheet(transactions),
    bossShopifyRevenueSheet(transactions),
    taxAndCpaSheet(transactions),
    bossAuditSummarySheet(auditLogs)
  ];
}

function normalizeCell(cell: CellValue | ExcelCell): ExcelCell {
  if (typeof cell === "object" && cell !== null && ("value" in cell || "formula" in cell || "style" in cell || "kind" in cell)) {
    return cell as ExcelCell;
  }

  return { value: cell as CellValue };
}

function styleForCell(cell: ExcelCell, rowIndex: number) {
  if (cell.style) return cell.style;
  if (rowIndex === 1) return STYLE.title;
  if (rowIndex === 2) return STYLE.instruction;
  if (rowIndex === 3) return STYLE.header;
  if (cell.kind === "date") return STYLE.date;
  if (cell.kind === "money") return STYLE.money;
  if (cell.kind === "month") return STYLE.month;
  return STYLE.text;
}

function cellXml(cellInput: CellValue | ExcelCell, rowIndex: number, columnIndex: number) {
  const cell = normalizeCell(cellInput);
  const reference = cellRef(rowIndex, columnIndex);
  const style = styleForCell(cell, rowIndex);
  const formula = cell.formula ? `<f>${escapeXml(cell.formula)}</f>` : "";
  const value = cell.value;

  if (cell.kind === "date" && isDateText(value)) {
    return `<c r="${reference}" s="${style}">${formula}<v>${excelDateSerial(String(value))}</v></c>`;
  }

  if (cell.kind === "money" || cell.kind === "number" || typeof value === "number") {
    const number = value === "" || value === null || value === undefined ? "" : String(numberValue(value));
    return `<c r="${reference}" s="${style}">${formula}${number ? `<v>${number}</v>` : ""}</c>`;
  }

  if (typeof value === "boolean") {
    return `<c r="${reference}" s="${style}" t="b">${formula}<v>${value ? 1 : 0}</v></c>`;
  }

  if (formula && (value === undefined || value === null || value === "")) {
    return `<c r="${reference}" s="${style}">${formula}</c>`;
  }

  if (formula) {
    return `<c r="${reference}" s="${style}" t="str">${formula}<v>${escapeXml(value)}</v></c>`;
  }

  return `<c r="${reference}" s="${style}" t="inlineStr">${formula}<is><t>${escapeXml(value)}</t></is></c>`;
}

function rowXml(row: ExcelRow, rowIndex: number) {
  return `<row r="${rowIndex}">${row.map((cell, index) => cellXml(cell, rowIndex, index + 1)).join("")}</row>`;
}

function worksheetXml(sheet: WorksheetDefinition) {
  const safeName = sanitizeSheetName(sheet.name);
  const columnCount = sheet.headers.length;
  const lastColumn = columnName(columnCount);
  const titleRow: ExcelRow = [{ value: sheet.title, style: STYLE.title }];
  const instructionRow: ExcelRow = [{ value: sheet.instruction ?? "", style: STYLE.instruction }];
  const headerRow: ExcelRow = sheet.headers.map((header) => ({ value: header, style: STYLE.header }));
  const allRows = [titleRow, instructionRow, headerRow, ...sheet.rows];
  const lastRow = Math.max(3, allRows.length);
  const autoFilterLastRow = 3 + (sheet.autoFilterRows ?? sheet.rows.length);
  const cols = (sheet.widths ?? sheet.headers.map(() => 14))
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");

  return {
    name: safeName,
    xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>${cols}</cols>
  <sheetData>${allRows.map(rowXml).join("")}</sheetData>
  <autoFilter ref="A3:${lastColumn}${Math.max(3, autoFilterLastRow)}"/>
  <mergeCells count="2">
    <mergeCell ref="A1:${lastColumn}1"/>
    <mergeCell ref="A2:${lastColumn}2"/>
  </mergeCells>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`
  };
}

function workbookXml(sheets: Array<{ name: string }>) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets.map((sheet, index) => `<sheet name="${escapeAttr(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}
  </sheets>
  <calcPr calcMode="auto"/>
</workbook>`;
}

function workbookRelsXml(sheets: Array<{ name: string }>) {
  const sheetRels = sheets
    .map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
    .join("");
  const styleId = sheets.length + 1;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${styleId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function contentTypesXml(sheetCount: number) {
  const sheetOverrides = Array.from({ length: sheetCount }, (_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`;
}

function packageRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="yyyy/mm/dd"/>
    <numFmt numFmtId="165" formatCode="yyyy-mm"/>
    <numFmt numFmtId="166" formatCode="¥#,##0.00;[Red]-¥#,##0.00"/>
  </numFmts>
  <fonts count="3">
    <font><sz val="11"/><color rgb="FF0F172A"/><name val="Arial"/></font>
    <font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Arial"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${NAVY}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${LIGHT}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${AMBER}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${RED}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${GREEN}"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF${GRID}"/></left>
      <right style="thin"><color rgb="FF${GRID}"/></right>
      <top style="thin"><color rgb="FF${GRID}"/></top>
      <bottom style="thin"><color rgb="FF${GRID}"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="top"/></xf>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="top"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function corePropsXml() {
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Mercury Books</dc:creator>
  <cp:lastModifiedBy>Mercury Books</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function appPropsXml(sheetCount: number) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Mercury Books</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${sheetCount}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
</Properties>`;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function zipFiles(files: Array<{ data: string; path: string }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.path);
    const dataBytes = encoder.encode(file.data);
    const crc = crc32(dataBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);

    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, 0);
    writeUint16(localHeader, 12, 0);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, dataBytes.length);
    writeUint32(localHeader, 22, dataBytes.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);

    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, 0);
    writeUint16(centralHeader, 14, 0);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, dataBytes.length);
    writeUint32(centralHeader, 24, dataBytes.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, dataBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);

  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 4, 0);
  writeUint16(end, 6, 0);
  writeUint16(end, 8, files.length);
  writeUint16(end, 10, files.length);
  writeUint32(end, 12, centralDirectory.length);
  writeUint32(end, 16, offset);
  writeUint16(end, 20, 0);

  return concatBytes([...localParts, centralDirectory, end]);
}

function buildWorkbookBytes(sheets: WorksheetDefinition[]) {
  const worksheets = sheets.map(worksheetXml);
  const files = [
    { path: "[Content_Types].xml", data: contentTypesXml(worksheets.length) },
    { path: "_rels/.rels", data: packageRelsXml() },
    { path: "docProps/app.xml", data: appPropsXml(worksheets.length) },
    { path: "docProps/core.xml", data: corePropsXml() },
    { path: "xl/workbook.xml", data: workbookXml(worksheets) },
    { path: "xl/_rels/workbook.xml.rels", data: workbookRelsXml(worksheets) },
    { path: "xl/styles.xml", data: stylesXml() },
    ...worksheets.map((sheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      data: sheet.xml
    }))
  ];

  return zipFiles(files);
}

function standardWorkbookSheets(transactions: Transaction[], auditLogs: AuditLog[] = []) {
  return bossFinanceWorkbookSheets(transactions, auditLogs);
}

export function buildExcelWorkbook(
  transactions: Transaction[],
  _title = "老板财务汇报表",
  auditLogs: AuditLog[] = []
) {
  return buildWorkbookBytes(standardWorkbookSheets(transactions, auditLogs));
}

function normalizeXlsxFilename(filename: string) {
  return filename.replace(/\.(xls|xlsx)$/i, "") + ".xlsx";
}

function downloadBytes(bytes: Uint8Array, filename: string) {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);

  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = normalizeXlsxFilename(filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadExcel(
  transactions: Transaction[],
  filename = "boss-finance-workbook.xlsx",
  options: DownloadExcelOptions = {}
) {
  const title = options.title ?? "老板财务汇报表";
  downloadBytes(buildExcelWorkbook(transactions, title, options.auditLogs), filename);
}

function taxPackageCategorySheet(rows: ExcelRow[]): WorksheetDefinition {
  return {
    headers: ["分类", "类型", "税务归类", "收入金额", "支出金额", "净额", "税务处理"],
    instruction: "按税务分类汇总 CPA 复核需要的收入、支出、净额和税务处理说明。",
    name: "税务分类汇总",
    rows: rows.map((row) => [
      categoryLabel(textValue(row[0])),
      row[1],
      row[2],
      { kind: "money", value: row[3] as CellValue },
      { kind: "money", value: row[4] as CellValue },
      { kind: "money", value: row[5] as CellValue },
      row[6]
    ]),
    title: "税务分类汇总 Tax Category Summary",
    widths: [24, 12, 28, 14, 14, 14, 30]
  };
}

function reviewRowsFromTransactions(transactions: Transaction[]): ExcelRow[] {
  return transactions.map((transaction) => [
    transaction.id,
    { kind: "date", value: transaction.date },
    transaction.vendor || transaction.source,
    transaction.description,
    categoryLabel(transaction.category),
    transaction.tax_line,
    { kind: "money", value: transaction.money_in - transaction.money_out },
    receiptStatusLabel(transaction),
    transaction.reconciled ? "已核对" : "待核对",
    transaction.notes
  ] satisfies ExcelRow);
}

function missingReceiptsSheet(transactions: Transaction[]): WorksheetDefinition {
  return {
    headers: ["交易ID", "日期", "商家/平台", "项目/用途", "分类", "税务归类", "金额", "票据状态", "核对状态", "备注"],
    instruction: "列出需要收据但当前缺失或待补的交易，不包含任何票据文件内容。",
    name: "缺失票据清单",
    rows: reviewRowsFromTransactions(transactions.filter((transaction) => transaction.receipt_required && !transaction.receipt_link)),
    title: "缺失票据清单 Missing Receipts",
    widths: [24, 12, 24, 28, 18, 24, 14, 12, 12, 30]
  };
}

function reimbursableExpenseSheet(transactions: Transaction[]): WorksheetDefinition {
  return {
    headers: ["交易ID", "日期", "商家/平台", "项目/用途", "分类", "税务归类", "金额", "票据状态", "核对状态", "备注"],
    instruction: "列出备注或结构化字段中标记为可报销的支出。",
    name: "可报销支出",
    rows: reviewRowsFromTransactions(transactions.filter((transaction) => transaction.money_out > 0 && isReimbursable(transaction))),
    title: "可报销支出 Reimbursable Expenses",
    widths: [24, 12, 24, 28, 18, 24, 14, 12, 12, 30]
  };
}

function auditSummarySheet(auditLogs: AuditLog[] = []): WorksheetDefinition {
  const rows: ExcelRow[] = auditLogs.slice(0, 250).map((entry) => [
    entry.created_at,
    entry.actor_email || entry.actor,
    entry.actor_role || "",
    entry.action,
    entry.entity_type,
    entry.entity_id,
    entry.source,
    String(entry.details?.result ?? ""),
    entry.reason || entry.field_name
  ]);

  return {
    headers: ["时间", "操作者", "角色", "动作", "实体类型", "实体ID", "来源", "结果", "说明"],
    instruction: "仅包含操作摘要，不包含 CSV 内容、票据文件内容、密钥、令牌或其他敏感正文。",
    name: "审计日志摘要",
    rows,
    title: "审计日志摘要 Audit Log Summary",
    widths: [24, 24, 12, 22, 14, 24, 14, 12, 36]
  };
}

export function buildTaxPackageExcelWorkbook(
  data: TaxPackageWorkbookData,
  options: DownloadExcelOptions = {}
) {
  return buildExcelWorkbook(
    data.filteredTransactions,
    options.title ?? "老板财务汇报表 - CPA资料包",
    options.auditLogs
  );
}

export function downloadTaxPackageExcel(
  data: TaxPackageWorkbookData,
  filename: string,
  options: DownloadExcelOptions = {}
) {
  downloadBytes(buildTaxPackageExcelWorkbook(data, options), filename);
}
