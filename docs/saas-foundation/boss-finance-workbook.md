# Boss-Readable Finance Workbook

Mercury Books XLSX exports use a boss-readable workbook template for transaction exports, report exports, tax package exports, and full ledger exports. The workbook is designed as an executive finance review package, not a raw CSV-style ledger.

## Workbook Sheets

1. `老板看板` - KPI dashboard for revenue, expenses, net cash flow, missing receipts, unreconciled transactions, key spend categories, and boss attention items.
2. `每笔账明细` - boss-readable transaction detail with purpose, business module, risk flag, processing suggestion, receipt status, and reconciliation status.
3. `待处理事项` - only transactions needing action, prioritized by missing receipts, unreconciled state, large expenses, owner draws, and CPA review.
4. `月度汇总` - month-by-month income, expense, net, key spend categories, missing receipt amounts, unreconciled counts, and close status placeholder.
5. `分类支出分析` - spend by category, business module, percentage of spend, transaction count, missing receipt count, and attention flag.
6. `账户资金流` - income, expense, and net flow by account, card, or payment method.
7. `Shopify营业额` - Shopify revenue template with sales, fees, ad costs, net operating revenue, exchange rate, and RMB conversion columns.
8. `税务与CPA资料` - tax category summary, reimbursable expenses, missing receipts, and transactions needing CPA review.
9. `审计日志摘要` - readable summary of important audit actions only.

## Boss-Readable Transaction Mapping

The `每笔账明细` sheet uses these columns:

`日期`, `月份`, `交易类型`, `业务模块`, `分类`, `这笔钱是干什么的`, `收入金额`, `支出金额`, `净额`, `币种`, `支付方式`, `账户/卡号`, `商家/平台`, `交易对象`, `订单号/发票号`, `票据状态`, `是否已核对`, `是否可报销`, `风险标记`, `老板备注`, `处理建议`, `原始备注`, `票据图片/链接`.

Purpose examples:

- Meta advertising transactions become `Meta 广告投放支出`.
- Shopify income becomes `Shopify 销售回款`.
- Inventory/COGS transactions become `采购库存支出`.
- Owner draw transactions become `业主提取 / 转至个人账户`.
- Owner contribution transactions become `业主投入公司资金`.
- Software/app transactions become `软件/应用订阅费`.
- Bank or payment fees become `银行或支付手续费`.

## Risk Rules

- Receipt required and no receipt link: `缺票据`.
- Not reconciled: `未核对`.
- Expense amount above `1000`: `大额支出`.
- Owner draw: `需老板确认`.
- Missing category, `Uncategorized`, missing tax line, or `Needs review`: `需CPA复核`.
- Otherwise: `正常`.

Processing suggestions are generated from those risk flags:

- `缺票据`: `请补充收据或发票`.
- `未核对`: `请完成银行对账`.
- `大额支出`: `建议老板复核`.
- `需老板确认`: `请老板确认资金用途`.
- `需CPA复核`: `请CPA确认税务分类`.
- `正常`: `无需处理`.

## Formatting Rules

- Dark navy title rows and headers with white bold text.
- Thin borders and wrapped text for purpose, notes, suggestions, and receipt links.
- Frozen title/instruction/header area.
- Auto filters enabled.
- Date columns use `yyyy/mm/dd`.
- Month columns use `yyyy-mm`.
- Money columns use two-decimal currency formatting.
- Risk/status cells use subtle green, amber, or red fills.

## Permission And Audit Behavior

Export permission checks are unchanged. Existing server-side export scopes still decide access:

- Owner can export all allowed workbook types.
- Admin and CPA can export only the exports already allowed by RBAC.
- Viewer remains blocked where export permissions block Viewer.
- Full ledger/workspace backup exports remain owner-only.

Successful workbook audits preserve the original permission export type and add workbook metadata:

- `export_type: boss_finance_workbook`
- `file_format: xlsx`
- `permission_export_type`
- `row_count`
- `sheet_count: 9`
- `report_period` when available

Workbook contents, CSV contents, receipt file contents, secrets, tokens, OAuth codes, and service role keys are never logged.

## Manual QA Checklist

- Export transactions as XLSX and confirm the workbook opens in Excel/WPS.
- Confirm the workbook includes all nine sheets listed above.
- Confirm `老板看板` appears first and shows income, expense, net, missing receipts, unreconciled count, and boss focus rows.
- Confirm `每笔账明细` includes `这笔钱是干什么的`, risk flags, processing suggestions, receipt status, and reconciliation status.
- Confirm missing receipt rows are highlighted and appear in `待处理事项`.
- Confirm unreconciled transactions are highlighted and appear in `待处理事项`.
- Confirm expenses above `1000` are marked as `大额支出`.
- Confirm monthly summary, category spending, account flow, CPA, Shopify, and audit sheets render with clear empty states when data is missing.
- Confirm Viewer cannot export if current permissions block export.
- Confirm Owner full ledger export remains owner-only.
- Confirm export audit logs include `export_type: boss_finance_workbook`, `file_format: xlsx`, `row_count`, and `sheet_count`.
- Confirm no auth, OAuth, workspace switcher, schema, RBAC, calculations, or monthly close behavior changed.
