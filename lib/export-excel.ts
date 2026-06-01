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

function standardWorkbookSheets(transactions: Transaction[], title: string) {
  return [
    dailyBookkeepingSheet(transactions),
    shopifyRevenueSheet(transactions),
    monthlySummarySheet(transactions),
    summarySheet(transactions, title),
    categorySummarySheet(transactions),
    taxLineSummarySheet(transactions)
  ];
}

export function buildExcelWorkbook(transactions: Transaction[], title = "罗厚彬记账表") {
  return buildWorkbookBytes(standardWorkbookSheets(transactions, title));
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
  filename = "bookkeeping-export.xlsx",
  options: DownloadExcelOptions = {}
) {
  const title = options.title ?? "罗厚彬记账表";
  downloadBytes(buildExcelWorkbook(transactions, title), filename);
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
  const title = options.title ?? "罗厚彬记账表 - CPA税务资料包";
  const sheets = [
    dailyBookkeepingSheet(data.filteredTransactions),
    monthlySummarySheet(data.filteredTransactions),
    taxPackageCategorySheet(data.categorySummaryRows),
    missingReceiptsSheet(data.filteredTransactions),
    reimbursableExpenseSheet(data.filteredTransactions),
    auditSummarySheet(options.auditLogs)
  ];

  return buildWorkbookBytes(sheets.map((sheet, index) => index === 0 ? { ...sheet, title } : sheet));
}

export function downloadTaxPackageExcel(
  data: TaxPackageWorkbookData,
  filename: string,
  options: DownloadExcelOptions = {}
) {
  downloadBytes(buildTaxPackageExcelWorkbook(data, options), filename);
}
