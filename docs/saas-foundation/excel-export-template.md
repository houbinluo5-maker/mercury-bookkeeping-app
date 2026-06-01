# Excel Export Template

Mercury Books spreadsheet exports use a unified XLSX workbook style based on the user's Chinese bookkeeping workbook format. The template is designed for daily bookkeeping review, CPA handoff, tax package preparation, and owner/admin ledger exports.

## Workbook Style

- Workbook identity follows the `罗厚彬记账表` bookkeeping style.
- Title rows use dark navy `#1E3A5F` with bold white text.
- Header rows use dark navy with white bold text.
- Data rows use clean grid borders, wrapped long text, fixed column widths, frozen title/header rows, and auto filters.
- Date cells use `yyyy/mm/dd`; month cells use `yyyy-mm`; money cells use two decimals.
- Positive/negative outcomes remain readable through currency formatting and red negative display.
- XLSX is the primary Excel format. CSV exports remain available where existing flows already expose CSV files.

## Standard Sheets

### 每日记账

Title: `人民币日常记账明细表 RMB Daily Bookkeeping`

Columns, in order:

1. 日期
2. 类型
3. 分类
4. 项目/用途
5. 收入金额
6. 支出金额
7. 支付方式
8. 账户/卡号
9. 商家/平台
10. 订单号/发票号
11. 票据图片/链接
12. 是否可报销
13. 票据状态
14. 备注
15. 币种
16. 净额
17. 月份
18. 剩余金额

Formula columns:

- `净额 = 收入金额 - 支出金额`
- `月份 = TEXT(日期,"yyyy-mm")`
- `剩余金额 = previous balance + 净额`

### Shopify每日营业额

Title: `Shopify每日营业额收入表 Shopify Daily Revenue（美元入账 / 汇率折算人民币）`

This template is included for Shopify/ecommerce revenue review. If detailed Shopify export fields are not available, Mercury Books preserves the columns and fills what can be inferred from ledger transactions.

### 月度汇总

Columns:

1. 月份
2. 总收入
3. 总支出
4. 净额
5. 可报销支出
6. 缺失票据笔数

The monthly sheet uses formulas against `每日记账` for income, expense, net, reimbursable expenses, and missing receipt counts. It also includes a compact additional summary section for payment methods, annual spending, Shopify income, and Shopify order count placeholders.

## Tax Package Workbook

Tax package XLSX exports include:

1. 每日记账
2. 月度汇总
3. 税务分类汇总
4. 缺失票据清单
5. 可报销支出
6. 审计日志摘要

Receipt links may be included when export permissions allow them. Raw receipt file contents are never embedded.

## Column Mapping

- `日期`: `transaction.date`
- `类型`: derived from category, money direction, and owner/transfer keywords
- `分类`: Mercury Books category mapped to Chinese export labels where available
- `项目/用途`: `transaction.description`
- `收入金额`: `transaction.money_in`
- `支出金额`: `transaction.money_out`
- `支付方式`: structured note `支付方式` or `transaction.source`
- `账户/卡号`: structured note `账户/卡号` or `transaction.account`
- `商家/平台`: `transaction.vendor` or `transaction.source`
- `订单号/发票号`: structured note/order/invoice pattern from notes
- `票据图片/链接`: `transaction.receipt_link`
- `是否可报销`: structured note `是否可报销` or reimbursable keyword
- `票据状态`: standardized Chinese receipt status
- `备注`: `transaction.notes`
- `币种`: `transaction.currency`

## Standard Labels

Transaction type labels:

- 收入
- 支出
- 转账
- 业主投入
- 业主提取
- 报销

Receipt status labels:

- 已上传
- 已保存
- 待补
- 无需
- 缺失票据

## Permissions

Export permission checks remain unchanged.

- Owner can export all allowed workbook types.
- Admin can export operational report and transaction workbooks according to existing RBAC.
- CPA can export report and tax package workbooks according to existing RBAC.
- Viewer remains blocked where export permissions deny access.
- Server-side 403 responses are preserved for unauthorized export audit/API calls.

## Audit Behavior

XLSX export audit details include:

- export type
- file format: `xlsx`
- workspace id
- actor email
- actor role
- report period when available
- row count when available

Audit logs do not include workbook contents, CSV contents, raw receipt file contents, secrets, OAuth tokens, API keys, or service role keys.

## Manual QA Checklist

- Owner can export transactions as XLSX.
- XLSX includes `每日记账`.
- `每日记账` columns match the template order exactly.
- Title and header rows use dark navy with white text.
- Dates display as `yyyy/mm/dd`.
- Income, expense, net, and running balance columns display two-decimal money values.
- Month column uses `yyyy-mm`.
- Receipt status displays in Chinese.
- Tax package XLSX includes the six standardized sheets.
- Viewer cannot export when blocked by RBAC.
- CPA report/tax-package export behavior still follows existing permissions.
- XLSX export audit logs include `file_format: xlsx` and row count.
- No auth/login/logout behavior changes.
- Workspace switcher still works.
