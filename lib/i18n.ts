"use client";

import { useMemo } from "react";
import { useBookkeeping } from "@/lib/storage";
import type { CategoryType, Language } from "@/lib/types";

const translations: Record<Language, Record<string, string>> = {
  en: {
    account: "Account",
    action: "Action",
    add: "Add",
    addTransaction: "Add Transaction",
    adminPassword: "Admin Password",
    allCategories: "All categories",
    allLinked: "All linked",
    allStatuses: "All statuses",
    amount: "Amount",
    annualTaxSummary: "Annual Tax Summary",
    applyRules: "Apply rules",
    backupJson: "Backup JSON",
    bookkeepingMethod: "Bookkeeping Method",
    businessType: "Business Type",
    businessTypeTaxNotes: "Business Type / Tax Notes",
    cancel: "Cancel",
    category: "Category",
    categories: "Categories",
    chartOfAccounts: "Chart of Accounts",
    clearAllTransactionsQuestion: "Clear all transactions?",
    clearTransactions: "Clear transactions",
    clearTransactionsBody:
      "This removes every transaction currently stored in localStorage, including demo/sample seed transactions and any manual entries in this browser. Download a backup first if you need to keep a copy.",
    close: "Close",
    companyName: "Company Name",
    companySettings: "Company Settings",
    companySettingsHelp: "These values appear in the sidebar, dashboard, reports, and future exports.",
    confirmationPreview: "Confirmation preview",
    currency: "Currency",
    cogs: "COGS",
    dashboard: "Dashboard",
    dataManagement: "Data Management",
    dataManagementWarning:
      "This MVP stores bookkeeping data in this browser's localStorage. Back up your data regularly, especially before clearing browser data, changing devices, or deploying changes.",
    dataSource: "Data Source",
    date: "Date",
    defaultAccountName: "Default Account Name",
    defaultCurrency: "Default Currency",
    deleteTransaction: "Delete transaction",
    deleteTransactionQuestion: "Delete this transaction? This cannot be undone.",
    description: "Description",
    documentation: "Documentation",
    done: "Done",
    downloadBackup: "Download backup",
    edit: "Edit",
    editParsedFieldsBeforeSaving: "Edit parsed fields before saving.",
    editTransaction: "Edit Transaction",
    emptyReportRows: "No report lines found.",
    emptyTransactions: "No transactions found.",
    enterAdminPassword: "Enter the admin password to access bookkeeping data and reports.",
    entries: "entries",
    examplePhrases: "Example phrases",
    export: "Export",
    exportExcel: "Export Excel",
    grossProfit: "Gross profit",
    integrations: "Integrations",
    investmentTransfers: "Investment Transfers",
    language: "Language",
    line: "Line",
    localMvp: "Local MVP",
    logout: "Logout",
    manualEntry: "Manual entry",
    missingReceipts: "Missing Receipts",
    moneyIn: "Money In",
    moneyOut: "Money Out",
    monthlyReport: "Monthly Report",
    naturalLanguageEntry: "Natural language entry",
    naturalLanguagePlaceholder: "Today Meta ads spent 400 dollars",
    needsReconciliation: "Needs reconciliation",
    needsReview: "Needs review",
    net: "Net",
    netIncome: "Net Income",
    noReceiptTransactions: "No transactions match this filter.",
    notes: "Notes",
    notConnected: "Not connected",
    openReceipt: "Open receipt",
    ordinaryBusinessIncome: "Ordinary Business Income",
    ownerDraws: "Owner Draws",
    ownerContributions: "Owner Contributions",
    parserConfidence: "parser confidence",
    parseBeforeSaving: "Parse before saving",
    parseSentence: "Parse transaction",
    parsedFromNaturalLanguage: "Parsed from natural language.",
    passwordNotAccepted: "Password was not accepted.",
    privateBookkeepingAccess: "Private bookkeeping access",
    quarterlyReport: "Quarterly Report",
    receipt: "Receipt",
    receiptDocumentsNote:
      "Acceptable receipt documents include Meta invoices, Shopify invoices, supplier invoices, shipping bills, domain or hosting invoices, bank statements, and payment confirmations. Add a link to the private document location for each transaction that needs support.",
    receiptLink: "Receipt Link",
    receiptLinkPlaceholder: "https://private-document-link.example",
    receiptLinked: "Receipt linked",
    receiptMissing: "Receipt missing",
    receiptOptional: "Receipt optional",
    receiptRequired: "Receipt required",
    receipts: "Receipts",
    reconciled: "Reconciled",
    reconciliation: "Reconciliation",
    reportsTransactions: "Transactions",
    resetDemoSeedData: "Reset demo seed data",
    restoreBackup: "Restore backup",
    revenue: "Revenue",
    saveSettings: "Save settings",
    saveTransaction: "Save transaction",
    saved: "Saved",
    searchTransactions: "Search transactions",
    seedDataLocalStorage: "Seed data + localStorage",
    settings: "Settings",
    signIn: "Sign in",
    source: "Source",
    splitEntriesWarning: "Split entries should be recorded as separate transactions.",
    status: "Status",
    taxLine: "Tax Line",
    taxLines: "Tax Lines",
    taxYear: "Tax Year",
    transaction: "Transaction",
    transactions: "Transactions",
    transactionsNeedReceiptLinks: "{count} transaction(s) still need receipt links.",
    transactionsList: "Transactions List",
    type: "Type",
    vendor: "Vendor",
    vendorPlaceholder: "Shopify Payout",
    viewAll: "View all",
    year: "Year",
    month: "Month",
    quarter: "Quarter",
    required: "Required",
    optional: "Optional",
    highConfidence: "High confidence",
    mediumConfidence: "Medium confidence",
    cash: "Cash",
    accrual: "Accrual",
    english: "English",
    simplifiedChinese: "简体中文",
    adminSetupPrefixDev: "Development setup warning: ",
    adminSetupPrefixDeploy: "Deployment setup required: ",
    adminSetupText: "set ADMIN_PASSWORD in your environment and restart the app before signing in.",
    loggedOut: "You have been logged out.",
    authNote: "MVP auth uses an HTTP-only session cookie. Supabase auth is intentionally not enabled yet.",
    changesSaveImmediately: "Changes save immediately to localStorage and update all reports.",
    restoredDemoData: "Demo seed data restored.",
    clearedTransactions: "All local transactions were cleared.",
    couldNotRestoreBackup: "Could not restore backup.",
    backupMissingFields: "Backup is missing transactions or settings.",
    restoredBackupPrefix: "Restored backup from",
    actionNeeded: "Action needed",
    resetDemoDataQuestion: "Reset all local data back to the demo seed data?",
    expenses: "Expenses"
  },
  zh: {
    account: "账户",
    action: "操作",
    add: "新增",
    addTransaction: "新增交易",
    adminPassword: "管理员密码",
    allCategories: "全部分类",
    allLinked: "全部已关联",
    allStatuses: "全部状态",
    amount: "金额",
    annualTaxSummary: "年度税务汇总",
    applyRules: "应用规则",
    backupJson: "备份 JSON",
    bookkeepingMethod: "记账方法",
    businessType: "业务类型",
    businessTypeTaxNotes: "业务类型 / 税务备注",
    cancel: "取消",
    category: "分类",
    categories: "分类",
    chartOfAccounts: "会计科目表",
    clearAllTransactionsQuestion: "清空所有交易？",
    clearTransactions: "清空交易",
    clearTransactionsBody:
      "这会删除当前浏览器 localStorage 中的所有交易，包括演示数据和手动录入的数据。如需保留副本，请先下载备份。",
    close: "关闭",
    companyName: "公司名称",
    companySettings: "公司设置",
    companySettingsHelp: "这些信息会显示在侧边栏、仪表盘、报表和未来导出中。",
    confirmationPreview: "确认预览",
    currency: "货币",
    cogs: "销货成本",
    dashboard: "仪表盘",
    dataManagement: "数据管理",
    dataManagementWarning:
      "当前 MVP 将记账数据存储在此浏览器的 localStorage 中。请定期备份，尤其是在清理浏览器数据、更换设备或部署更新之前。",
    dataSource: "数据来源",
    date: "日期",
    defaultAccountName: "默认账户名称",
    defaultCurrency: "默认货币",
    deleteTransaction: "删除交易",
    deleteTransactionQuestion: "删除这笔交易？此操作无法撤销。",
    description: "描述",
    documentation: "凭证说明",
    done: "完成",
    downloadBackup: "下载备份",
    edit: "编辑",
    editParsedFieldsBeforeSaving: "保存前可编辑解析后的字段。",
    editTransaction: "编辑交易",
    emptyReportRows: "没有报表行。",
    emptyTransactions: "没有找到交易。",
    enterAdminPassword: "输入管理员密码以访问记账数据和报表。",
    entries: "条记录",
    examplePhrases: "示例短句",
    export: "导出",
    exportExcel: "导出 Excel",
    grossProfit: "毛利",
    integrations: "集成",
    investmentTransfers: "投资转账",
    language: "语言",
    line: "项目",
    localMvp: "本地 MVP",
    logout: "退出登录",
    manualEntry: "手动录入",
    missingReceipts: "缺失收据",
    moneyIn: "收入",
    moneyOut: "支出",
    monthlyReport: "月度报表",
    naturalLanguageEntry: "自然语言录入",
    naturalLanguagePlaceholder: "例如：Today Meta ads spent 400 dollars",
    needsReconciliation: "待核对",
    needsReview: "待审核",
    net: "净额",
    netIncome: "净收入",
    noReceiptTransactions: "没有符合该筛选条件的交易。",
    notes: "备注",
    notConnected: "未连接",
    openReceipt: "打开收据",
    ordinaryBusinessIncome: "普通经营收入",
    ownerDraws: "业主提款",
    ownerContributions: "业主投入",
    parserConfidence: "解析置信度",
    parseBeforeSaving: "请先解析",
    parseSentence: "解析交易",
    parsedFromNaturalLanguage: "已从自然语言解析。",
    passwordNotAccepted: "密码不正确。",
    privateBookkeepingAccess: "私人记账访问",
    quarterlyReport: "季度报表",
    receipt: "收据",
    receiptDocumentsNote:
      "可用的收据文件包括 Meta 发票、Shopify 发票、供应商发票、运输账单、域名或托管发票、银行流水和付款确认。请为需要凭证的交易添加私有文件链接。",
    receiptLink: "收据链接",
    receiptLinkPlaceholder: "https://private-document-link.example",
    receiptLinked: "已关联收据",
    receiptMissing: "缺失收据",
    receiptOptional: "收据可选",
    receiptRequired: "需要收据",
    receipts: "收据",
    reconciled: "已核对",
    reconciliation: "核对",
    reportsTransactions: "交易",
    resetDemoSeedData: "重置演示数据",
    restoreBackup: "恢复备份",
    revenue: "收入",
    saveSettings: "保存设置",
    saveTransaction: "保存交易",
    saved: "已保存",
    searchTransactions: "搜索交易",
    seedDataLocalStorage: "演示数据 + localStorage",
    settings: "设置",
    signIn: "登录",
    source: "来源",
    splitEntriesWarning: "拆分条目应作为单独交易记录。",
    status: "状态",
    taxLine: "税务项目",
    taxLines: "税务项目",
    taxYear: "税务年度",
    transaction: "交易",
    transactions: "交易",
    transactionsNeedReceiptLinks: "仍有 {count} 笔交易需要收据链接。",
    transactionsList: "交易列表",
    type: "类型",
    vendor: "供应商",
    vendorPlaceholder: "Shopify Payout",
    viewAll: "查看全部",
    year: "年度",
    month: "月份",
    quarter: "季度",
    required: "必需",
    optional: "可选",
    highConfidence: "高置信度",
    mediumConfidence: "中等置信度",
    cash: "现金制",
    accrual: "权责发生制",
    english: "English",
    simplifiedChinese: "简体中文",
    adminSetupPrefixDev: "开发环境设置提醒：",
    adminSetupPrefixDeploy: "部署设置必需：",
    adminSetupText: "请在环境变量中设置 ADMIN_PASSWORD，并重启应用后再登录。",
    loggedOut: "你已退出登录。",
    authNote: "MVP 认证使用 HTTP-only 会话 Cookie，暂未启用 Supabase 认证。",
    changesSaveImmediately: "更改会立即保存到 localStorage，并更新所有报表。",
    restoredDemoData: "已恢复演示数据。",
    clearedTransactions: "所有本地交易已清空。",
    couldNotRestoreBackup: "无法恢复备份。",
    backupMissingFields: "备份缺少交易或设置数据。",
    restoredBackupPrefix: "已从备份恢复：",
    actionNeeded: "需要处理",
    resetDemoDataQuestion: "将所有本地数据重置为演示种子数据？",
    expenses: "费用"
  }
};

const categoryLabels: Record<Language, Record<string, string>> = {
  en: {},
  zh: {
    Revenue: "收入",
    "Advertising Expense": "广告费用",
    "Product Cost / COGS": "产品成本 / COGS",
    "Shipping / Fulfillment": "运输 / 履约",
    "Software Expense": "软件费用",
    "Website / Hosting": "网站 / 托管",
    "Bank Fees": "银行费用",
    "Owner Contribution": "业主投入",
    "Owner Draw / Member Distribution": "业主提款 / 成员分配",
    "Investment Transfer": "投资转账",
    Uncategorized: "未分类"
  }
};

const taxLineLabels: Record<Language, Record<string, string>> = {
  en: {},
  zh: {
    "Gross receipts or sales": "总收入或销售额",
    Advertising: "广告",
    "Cost of goods sold": "销货成本",
    "Shipping and fulfillment": "运输和履约",
    "Software and subscriptions": "软件和订阅",
    "Website, hosting, and email": "网站、托管和邮箱",
    "Bank service charges": "银行服务费",
    "Owner contribution - not taxable income": "业主投入 - 非应税收入",
    "Owner draw - not deductible": "业主提款 - 不可抵扣",
    "Balance sheet transfer - not expense": "资产负债表转账 - 非费用",
    "Needs review": "待审核"
  }
};

const categoryTypeLabels: Record<Language, Record<CategoryType | "Tax", string>> = {
  en: {
    Revenue: "Revenue",
    COGS: "COGS",
    Expense: "Expense",
    Equity: "Equity",
    Transfer: "Transfer",
    Tax: "Tax"
  },
  zh: {
    Revenue: "收入",
    COGS: "销货成本",
    Expense: "费用",
    Equity: "权益",
    Transfer: "转账",
    Tax: "税务"
  }
};

const categoryDescriptionLabels: Record<Language, Record<string, string>> = {
  en: {},
  zh: {
    "Shopify and ecommerce sales deposits before final reconciliation.":
      "Shopify 和电商销售入账，最终核对前使用。",
    "Meta, Facebook, TikTok, and other paid acquisition spend.":
      "Meta、Facebook、TikTok 及其他付费获客支出。",
    "Inventory supplier and product manufacturing payments.": "库存供应商和产品生产付款。",
    "Carrier, 3PL, and fulfillment center payments.": "承运商、3PL 和履约中心付款。",
    "Shopify subscription, apps, SaaS, and ecommerce tools.":
      "Shopify 订阅、应用、SaaS 和电商工具。",
    "Domain, hosting, email, and storefront infrastructure.": "域名、托管、邮箱和店铺基础设施。",
    "Payment, wire, account, and banking fees.": "支付、电汇、账户和银行手续费。",
    "Owner money invested into the company.": "业主投入公司的资金。",
    "Transfers from company funds to the owner or personal brokerage.":
      "从公司资金转给业主或个人券商账户。",
    "Transfers from Mercury to a company-owned brokerage account.": "从 Mercury 转入公司持有的券商账户。",
    "Temporary holding category for transactions needing review.": "需要审核交易的临时分类。"
  }
};

const monthLabels: Record<Language, string[]> = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ],
  zh: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
};

const samplePhraseLabels: Record<Language, Array<{ label: string; value: string }>> = {
  en: [
    { label: "Today Meta ads spent 400 dollars", value: "Today Meta ads spent 400 dollars" },
    { label: "Today Facebook ads spent 400", value: "Today Facebook ads spent 400" },
    { label: "Shopify payout received 1260 today", value: "Shopify payout received 1260 today" },
    { label: "Paid supplier 850 for inventory", value: "Paid supplier 850 for inventory" },
    { label: "Paid 120 for Shopify apps", value: "Paid 120 for Shopify apps" },
    {
      label: "Transferred 500 from Mercury to owner personal account",
      value: "Transferred 500 from Mercury to owner personal account"
    },
    { label: "Owner contributed 2000 to the company", value: "Owner contributed 2000 to the company" }
  ],
  zh: [
    { label: "今天 Meta 广告花费 400 美元", value: "Today Meta ads spent 400 dollars" },
    { label: "今天 Facebook 广告花费 400", value: "Today Facebook ads spent 400" },
    { label: "今天收到 Shopify 打款 1260", value: "Shopify payout received 1260 today" },
    { label: "支付供应商 850 用于库存", value: "Paid supplier 850 for inventory" },
    { label: "支付 Shopify 应用 120", value: "Paid 120 for Shopify apps" },
    {
      label: "从 Mercury 转 500 到业主个人账户",
      value: "Transferred 500 from Mercury to owner personal account"
    },
    { label: "业主向公司投入 2000", value: "Owner contributed 2000 to the company" }
  ]
};

const parserIssueLabels: Record<Language, Record<string, string>> = {
  en: {},
  zh: {
    "Enter a transaction sentence.": "请输入一条交易句子。",
    "Amount was not found.": "未找到金额。",
    "No accounting rule matched.": "未匹配到会计规则。",
    "No date was found; using today.": "未找到日期，已使用今天。"
  }
};

const ruleReasonLabels: Record<Language, Record<string, string>> = {
  en: {},
  zh: {
    "Shopify payout is revenue that needs reconciliation.": "Shopify 打款属于收入，需要核对。",
    "Ad platforms are advertising expense.": "广告平台支出属于广告费用。",
    "Supplier payments are product cost / COGS.": "供应商付款属于产品成本 / COGS。",
    "Shipping payments are fulfillment expense.": "运输付款属于物流履约费用。",
    "Shopify subscription and apps are software expense.": "Shopify 订阅和应用属于软件费用。",
    "Domain, hosting, and email are website / hosting expense.": "域名、托管和邮箱属于网站 / 托管费用。",
    "Owner money into the company is owner contribution.": "业主投入公司资金属于业主投入。",
    "Transfer to owner or personal IBKR is owner draw, not a business expense.":
      "转给业主或个人 IBKR 属于业主提款，不是业务费用。",
    "Transfer to company brokerage is investment transfer.": "转入公司券商账户属于投资转账。",
    "No rule matched; review manually.": "未匹配到规则，请手动审核。"
  }
};

export function translate(language: Language, key: string) {
  return translations[language]?.[key] ?? translations.en[key] ?? key;
}

export function displayCategory(language: Language, value: string) {
  return categoryLabels[language][value] ?? value;
}

export function displayTaxLine(language: Language, value: string) {
  return taxLineLabels[language][value] ?? value;
}

export function displayCategoryType(language: Language, value: CategoryType | "Tax") {
  return categoryTypeLabels[language][value] ?? value;
}

export function displayCategoryDescription(language: Language, value: string) {
  return categoryDescriptionLabels[language][value] ?? value;
}

export function displayMonth(language: Language, monthIndex: number) {
  return monthLabels[language][monthIndex] ?? monthLabels.en[monthIndex] ?? "";
}

export function displayParserSummary(language: Language, summary: string) {
  if (summary === "High confidence") return translate(language, "highConfidence");
  if (summary === "Medium confidence") return translate(language, "mediumConfidence");
  if (summary === "Needs review") return translate(language, "needsReview");
  return summary;
}

export function displayParserIssue(language: Language, issue: string) {
  return parserIssueLabels[language][issue] ?? issue;
}

export function displayRuleReason(language: Language, reason: string) {
  return ruleReasonLabels[language][reason] ?? reason;
}

export function useI18n() {
  const { settings } = useBookkeeping();
  const language = settings.language ?? "en";

  return useMemo(
    () => ({
      language,
      samplePhrases: samplePhraseLabels[language],
      t: (key: string) => translate(language, key),
      categoryLabel: (value: string) => displayCategory(language, value),
      taxLineLabel: (value: string) => displayTaxLine(language, value),
      categoryTypeLabel: (value: CategoryType | "Tax") => displayCategoryType(language, value),
      categoryDescriptionLabel: (value: string) => displayCategoryDescription(language, value),
      monthLabel: (monthIndex: number) => displayMonth(language, monthIndex),
      parserSummary: (summary: string) => displayParserSummary(language, summary),
      parserIssue: (issue: string) => displayParserIssue(language, issue),
      ruleReason: (reason: string) => displayRuleReason(language, reason)
    }),
    [language]
  );
}
