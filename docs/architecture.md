# TaxFlow UAE Full Application Architecture

TaxFlow is a UAE business management platform for sales, purchases, accounting, tax, eInvoicing, payroll, HR, rota planning, documents, reporting, approvals, and audit control.

The current repository is a browser prototype with light PHP JSON persistence. The production target should be a modular, tenant-aware business system where source transactions, tax lines, accounting, audit, and reporting are controlled by backend services.

## 1. Current Prototype Structure

```text
taxflow.html              Main application markup and screen structure
src/styles.css            Design tokens, layout, components, responsive UI
src/app.js                Navigation, modal behavior, calculations, API calls
api.php                   Lightweight prototype JSON API
index.php                 PHP entrypoint
data/taxflow-store.json   Prototype JSON data store
tools/                    Static server, checks, helpers
docs/                     Architecture and roadmap
```

Production must replace JSON storage with a relational database, object storage, queue workers, backend validation, audit logging, and tenant enforcement.

## 2. Revised High-Level Architecture

```text
Frontend Web / Mobile
        |
        v
API Gateway
        |
        v
Auth + Tenant Context
        |
        v
Business Modules
        |
        v
Source Transaction Layer
        |
        v
Validation Engine
        |
        v
Approval Engine
        |
        v
Posting Queue
        |
        v
Accounting Posting Engine
        |
        v
General Ledger + Tax Lines
        |
        v
Reports
        |
        v
Audit + Documents + Notifications
```

Core rule:

```text
UI never posts directly to ledger.
Every module creates a source transaction first.
```

## 3. Main Modules

```text
TaxFlow
|-- Sales & Invoices
|-- eInvoicing
|-- Purchases
|-- Bills & Vendors
|-- Payments
|-- Bank Accounts
|-- Accounting
|-- Tax Engine / VAT
|-- Inventory
|-- Staff / HR
|-- Rota Planning
|-- Payroll
|-- WPS / SIF
|-- Reports
|-- Documents & Evidence
|-- Notifications
|-- Expert Review
|-- Mobile App
|-- AI Assistant
`-- Settings
```

## 4. Source Transaction Layer

Before validation, approval, tax, or posting, each business action creates a source record.

```text
Sales Invoice
Purchase Invoice
Expense
Payroll Run
Inventory Movement
Receipt
Payment
Rota Publish
Attendance Correction
        |
        v
Source Transaction
        |
        v
Validation
        |
        v
Approval
        |
        v
Posting Queue
        |
        v
Journal Entry / Tax Lines / Audit
```

Benefits:

- Prevents direct UI-to-ledger mistakes.
- Preserves the original business event.
- Supports approval before posting.
- Makes retry and reversal safer.
- Keeps audit trail clear.

Recommended source transaction tables:

```text
source_transactions
source_transaction_lines
source_transaction_status_history
source_transaction_links
```

Important fields:

```text
id
company_id
branch_id
source_module
source_type
source_id
transaction_date
amount
tax_amount
currency
status
validation_status
approval_status
posting_status
created_by
created_at
updated_by
updated_at
```

## 5. Accounting Core

Accounting is the financial center of the system.

```text
Approved Source Transaction
        |
        v
Posting Job
        |
        v
Accounting Posting Engine
        |
        v
Balanced Journal Entry
        |
        v
General Ledger
        |
        v
Financial Reports
```

Rules:

- Every posted business transaction must have journal impact.
- Debit must always equal credit.
- Posted journals cannot be deleted.
- Corrections use reversal journals.
- Reports read from the general ledger.
- Sub-ledgers must reconcile to GL control accounts.
- Every posting must store source module and source ID.

## 6. Posting Queue and Retry System

Accounting posting should be asynchronous and reliable.

```text
Approved Transaction
        |
        v
Posting Job
        |
        v
Queue Worker
        |
        v
Journal Created
        |
        v
Success Log / Failed Log
```

Required tables:

```text
posting_jobs
posting_errors
posting_retry_logs
auto_posting_logs
accounting_posting_rules
```

Posting job statuses:

```text
Pending
Processing
Posted
Failed
Retrying
Cancelled
```

Critical controls:

- Failed postings appear in an error log.
- Admin/accountant can retry failed postings.
- Duplicate posting prevention must use idempotency keys.
- Posting worker must lock the source transaction during processing.
- Journal creation and tax line creation must be atomic.

## 7. Tax Engine / VAT Architecture

VAT must be tax-line based, not only invoice-level.

Tax engine tables:

```text
tax_codes
tax_lines
tax_periods
vat_returns
tax_adjustments
tax_evidence_links
```

Tax code examples:

```text
VAT_OUTPUT_5
VAT_INPUT_5
ZERO_RATED
EXEMPT
OUT_OF_SCOPE
REVERSE_CHARGE_OUTPUT
REVERSE_CHARGE_INPUT
```

Tax line fields:

```text
id
company_id
source_module
source_id
source_line_id
tax_code_id
taxable_amount
tax_rate
tax_amount
recoverable_amount
non_recoverable_amount
tax_period_id
evidence_document_id
status
```

VAT flow:

```text
Source Transaction Line
        |
        v
Tax Code
        |
        v
Tax Line
        |
        v
VAT Period
        |
        v
VAT Return
```

VAT report sources:

```text
VAT Output  -> tax_lines
VAT Input   -> tax_lines
VAT Return  -> vat_returns + tax_adjustments
Evidence    -> documents + document_links
```

## 8. eInvoicing Module

Invoice PDF is not eInvoicing. UAE eInvoicing requires structured invoice data exchanged and reported electronically through the required model and providers. Unstructured PDFs, Word files, images, scans, and emails are not eInvoices.

```text
eInvoicing
|-- eInvoice Generator
|-- UAE Schema Validation
|-- Mandatory Field Validation
|-- ASP / Peppol Connector
|-- Transmission Log
|-- Message Level Status
|-- Error Retry
|-- eInvoice Archive
`-- eInvoice Audit Trail
```

eInvoice flow:

```text
Sales Invoice Source Record
        |
        v
Structured eInvoice Payload
        |
        v
UAE Schema / Mandatory Field Validation
        |
        v
ASP Connector
        |
        v
Transmit / Report
        |
        v
Success, Rejected, Retry, Archived
```

Recommended tables:

```text
einvoice_profiles
einvoice_payloads
einvoice_validations
einvoice_transmissions
einvoice_status_logs
einvoice_archives
einvoice_retry_logs
```

Important distinction:

```text
Invoice PDF       = human-readable document
Structured eInvoice = machine-readable regulated invoice data
```

## 9. Sales & Invoices

Responsibilities:

- Products and services
- Customers
- Invoice creation
- Invoice import
- PDF preview/export
- Email and WhatsApp sharing
- eInvoice generation handoff
- Customer ledger update
- Tax line creation
- Accounting source transaction

Sales invoice posting:

```text
Dr Accounts Receivable
    Cr Sales Income
    Cr VAT Payable
```

Required source records:

```text
sales_invoices
sales_invoice_lines
sales_invoice_tax_lines
invoice_share_logs
source_transactions
```

## 10. Purchases, Bills, and Vendors

Responsibilities:

- Supplier records
- Purchase invoices
- Purchase orders
- Vendor bills
- OCR/document extraction
- Manual purchase entry
- Supplier TRN validation
- VAT evidence control
- AP sub-ledger

Purchase capture paths:

```text
Document upload -> AI extraction -> validation -> purchase record
Manual entry    -> item lines + tax + payment -> purchase record
```

Manual purchase entry stores:

```text
Supplier
Reference No.
Purchase Date
Purchase Status
Business Location
Pay Term
Attached Document
Product Lines
Discount
Purchase Tax
Additional Notes
Shipping Details
Additional Shipping Charges
Payment Amount
Paid On
Payment Method
Payment Account
Payment Note
```

Purchase Settings owns shared purchase/sales item masters:

```text
Category Setup -> category, usage scope, default VAT
Unit Setup     -> unit code, unit name, type, decimal places
```

Purchase records should expose both extracted and manual purchases in one table:

```text
Ref No.
Supplier
Date
Location
Items
Net Amount
Tax
Shipping
Total
Paid
Due
Source
Status
```

Purchase posting:

```text
Dr Purchase / Inventory / Expense
Dr VAT Input
    Cr Accounts Payable
```

## 11. Document Evidence Control

VAT and audit claims must be linked to evidence.

```text
Purchase VAT Claim
        |
        v
Supplier Invoice Document
        |
        v
TRN Validation
        |
        v
Tax Line
        |
        v
VAT Report
```

Required tables:

```text
documents
document_links
document_extractions
document_audit_logs
document_validation_results
```

Document links should connect files to:

- Sales invoices
- Purchase invoices
- Bills
- Payments
- Receipts
- Payroll runs
- WPS/SIF exports
- Journal entries
- VAT returns
- Bank reconciliations

## 12. Payments and Receipts

Receipts:

```text
Customer Receipt
Cash Receipt
Bank Receipt
Online Payment
Card / Tabby / Payment Link
```

Payments:

```text
Supplier Payment
Expense Payment
Payroll Payment
Cash Payment
Bank Payment
```

Customer receipt posting:

```text
Dr Bank / Cash
    Cr Accounts Receivable
```

Supplier payment posting:

```text
Dr Accounts Payable
    Cr Bank / Cash
```

## 13. Bank Reconciliation

```text
Bank Statement Upload / Bank Feed
        |
        v
Normalize Transactions
        |
        v
Match by Amount, Date, Reference, Party
        |
        v
Matched / Suggested / Unmatched
        |
        v
User Confirmation
        |
        v
Reconciliation Report
```

Match confidence:

```text
100% = exact amount + reference
80%  = same amount + close date
50%  = same amount only
```

## 14. Stock / Inventory Mapping Architecture

Stock mapping connects:

```text
Item -> Warehouse -> Purchase / Sales -> Stock Movement -> Inventory Value -> Accounting Posting
```

Main purchase flow:

```text
Purchase Invoice / Stock Receipt
        |
        v
Item Mapping
        |
        v
Warehouse Mapping
        |
        v
Stock Movement
        |
        v
Inventory Valuation
        |
        v
Accounting Entry
```

Main sales flow:

```text
Sales Invoice / Delivery
        |
        v
Item Mapping
        |
        v
Warehouse Mapping
        |
        v
Stock Deduction
        |
        v
COGS Calculation
        |
        v
Accounting Entry
```

Item master must include stock and accounting settings:

```text
Item Code
Item Name
Item Type
Category
Unit
Sales Account
Purchase Account
Inventory Account
COGS Account
VAT Code
Default Warehouse
Reorder Level
Opening Stock
Opening Value
Stock Tracking
```

Item type behavior:

| Item Type | Stock Impact | Accounting Impact |
| --- | --- | --- |
| Stock Item | Yes | Inventory + COGS |
| Service Item | No | Income / Expense only |
| Consumable | Optional | Expense or Inventory |
| Fixed Asset | No stock | Fixed Asset Account |
| Raw Material | Yes | Inventory |
| Finished Goods | Yes | Inventory + COGS |

Required mapping tables:

```text
stock_product_mappings
id
company_id
source_product_name
generated_product_name
warehouse_id
unit_id
mapping_status
unit_cost
markup_percent
fixed_price_enabled
unit_price
vat_rate_id
price_including_vat
service_fees_enabled
created_by
created_at
updated_by
updated_at

item_account_mappings
id
company_id
item_id
sales_account_id
purchase_account_id
inventory_account_id
cogs_account_id
vat_code_id
default_warehouse_id
valuation_method
status

warehouses
id
company_id
warehouse_code
warehouse_name
branch_id
location
stock_account_id
status

stock_movements
id
company_id
item_id
warehouse_id
movement_date
movement_type
source_module
source_id
qty_in
qty_out
unit
unit_cost
total_value
balance_qty
balance_value
status

units
id
unit_name
unit_code
base_unit
conversion_factor
status

stock_reservations
id
company_id
item_id
warehouse_id
source_module
source_id
reserved_qty
status
```

Stock mapping screen behavior:

```text
Complete Stock Mapping List
        |
        v
Search by Product Name or Generated Name
        |
        v
Sort by Product Name, Generated Name, or Status
        |
        v
Map selected row
        |
        v
Edit Product Name + Generated Name + Pricing
        |
        v
Save Mapping
```

The mapping list columns are:

```text
Product Name
Generated Name
Warehouse
Unit
Status
Action
```

The mapping panel fields are:

```text
Product Name
Generated Name
Cost
Markup (%)
Fixed
Price
Tax Rate
Inc. VAT
Service Fees
```

Generated name logic:

```text
Product Name from upload / purchase / sales document
        |
        v
Normalize spelling, spacing, and common unit words
        |
        v
Generated Name
        |
        v
User review and save
```

Example:

```text
Product Name: Industrial Oil 5 Litre
Generated Name: Industrial Oil 5L
```

The mapping module intentionally does not require a separate TaxFlow Name field. The generated name is the clean internal stock-mapping name used for matching and review.

Pricing calculation:

```text
If Fixed = No:
Price = Cost x (1 + Markup %)

If Fixed = Yes:
Price is entered manually

Inc. VAT = Price x (1 + Tax Rate %)
```

Example:

```text
Cost: 25.00
Markup: 56%
Fixed: No
Price: 39.00
Tax Rate: VAT 5%
Inc. VAT: 40.95
Service Fees: No
```

Mapping statuses:

| Status | Meaning |
| --- | --- |
| Mapped | Product name and generated name are confirmed |
| Review | Suggested/generated name needs user confirmation |
| Unmapped | No saved mapping exists |

Validation for mapping save:

- Product Name is required.
- Generated Name is required.
- Cost, markup, price, and VAT values must be numeric when entered.
- Inc. VAT should be recalculated after cost, markup, fixed price, price, or tax rate changes.
- Saved mapping changes status to Mapped.
- Search and sort must operate on the current visible mapping list.

Movement types:

| Movement Type | Source | Qty Impact |
| --- | --- | --- |
| Purchase Receipt | Purchase | Qty In |
| Sales Delivery | Sales | Qty Out |
| Sales Return | Sales Return | Qty In |
| Purchase Return | Purchase Return | Qty Out |
| Stock Adjustment In | Manual | Qty In |
| Stock Adjustment Out | Manual | Qty Out |
| Transfer Out | Warehouse Transfer | Qty Out |
| Transfer In | Warehouse Transfer | Qty In |
| Opening Stock | Setup | Qty In |

Purchase stock accounting:

```text
Dr Inventory
Dr VAT Input
    Cr Accounts Payable
```

Sales stock accounting:

```text
Dr Accounts Receivable
    Cr Sales Income
    Cr VAT Payable

Dr Cost of Goods Sold
    Cr Inventory
```

Stock valuation methods:

```text
Weighted Average for MVP
FIFO as advanced option
Standard Cost as controlled option
```

Unit conversion flow:

```text
Purchase in supplier unit
        |
        v
Convert to base stock unit
        |
        v
Store stock in base unit
        |
        v
Convert for invoice display when sold
```

Opening stock accounting:

```text
Dr Inventory
    Cr Opening Balance Equity
```

Stock adjustment accounting:

```text
Increase:
Dr Inventory
    Cr Stock Adjustment Gain

Decrease:
Dr Stock Adjustment Loss
    Cr Inventory
```

Warehouse transfers create Transfer Out and Transfer In movements. If the source and destination warehouses use different inventory accounts, post:

```text
Dr Destination Inventory Account
    Cr Source Inventory Account
```

Availability:

```text
Available Stock = On Hand Stock - Reserved Stock
```

Reorder alert:

```text
Available Qty <= Reorder Level
```

Critical validation rules:

- Cannot sell more than available stock unless negative stock is enabled in settings.
- Cannot post stock invoice without item mapping.
- Stock tracked items must have inventory account.
- COGS account is required for sales.
- Warehouse is required for stock items.
- Unit conversion is required before stock update.
- Stock adjustment requires approval.
- Posted stock movement cannot be deleted.
- Corrections must use reverse movement.

Reports must use stock movement, valuation, item, warehouse, reservation, and journal tables, not dashboard summaries.

## 15. HR and Attendance

Responsibilities:

- Employee master data
- Attendance check-in/check-out
- Attendance corrections
- Leave
- Overtime
- Biometric integration
- HR reports

Attendance flow:

```text
Published Rota
        |
        v
Check-in / Check-out
        |
        v
Compare Actual vs Planned
        |
        v
Late / Early Exit / Hours / Overtime
        |
        v
Approval
        |
        v
Payroll
```

## 16. Rota Planning

Rota is a separate module.

```text
Rota Planning
|-- Shift Setup
|-- Weekly Rota
|-- Monthly Rota
|-- Department Coverage
|-- Shift Swap Requests
|-- Rota Approval
|-- Rota Publishing
`-- Rota Reports
```

Rota flow:

```text
Create shifts
        |
        v
Assign department requirements
        |
        v
Build weekly/monthly rota
        |
        v
Check leave, conflicts, coverage
        |
        v
Supervisor review
        |
        v
HR publish
        |
        v
Employee notification
        |
        v
Attendance uses published rota
```

## 17. Payroll and WPS / SIF

Payroll responsibilities:

- Salary register
- Attendance and overtime integration
- Deductions
- Benefits and EOS/gratuity
- Payroll approval
- Payslips
- Accounting posting

Payroll accrual:

```text
Dr Salary Expense
    Cr Salary Payable
```

Salary payment:

```text
Dr Salary Payable
    Cr Bank
```

WPS / SIF module:

```text
WPS / SIF
|-- Salary File Generation
|-- Employee Bank Validation
|-- Payroll Approval
|-- SIF Export
|-- Bank / WPS Agent Upload Tracking
|-- Rejection Handling
`-- WPS Audit Trail
```

Recommended WPS/SIF tables:

```text
wps_batches
wps_sif_files
wps_employee_lines
wps_validation_errors
wps_upload_logs
wps_rejection_logs
```

## 18. Reporting Architecture

Reports must use authoritative sources:

```text
Financial Reports  -> General Ledger
VAT Reports        -> Tax Lines + VAT Returns
Payroll Reports    -> Approved Payroll Runs
Inventory Reports  -> Stock Movements + Valuation
HR Reports         -> Attendance / Rota / Leave
Rota Reports       -> Rota Assignments + Coverage
Document Reports   -> Documents + Evidence Links
```

Do not generate production reports from dashboard totals.

Core reports:

- Trial Balance
- Profit & Loss
- Balance Sheet
- General Ledger
- VAT Report
- Cash Flow
- Customer Aging
- Supplier Aging
- Payroll Posting Report
- WPS/SIF Status Report
- Inventory Valuation
- Rota Coverage
- Daily Attendance
- Audit Trail

## 19. Audit Architecture

Audit logs must be deep enough to reconstruct who changed what, when, why, and from where.

Required audit fields:

```text
id
company_id
branch_id
user_id
module
record_type
record_id
action_type
old_value
new_value
reason
ip_address
device
user_agent
timestamp
correlation_id
```

High-risk actions:

- Journal posting
- Journal reversal
- Payroll approval
- WPS/SIF export
- VAT setting change
- VAT return submission
- User permission change
- Attendance correction
- Rota change after publish
- Period lock/reopen
- eInvoice retry/cancellation

## 20. Period Locking

Use separate period locks because different business areas close at different times.

```text
Accounting Period Lock
VAT Period Lock
Payroll Period Lock
Inventory Period Lock
Rota / Attendance Lock
```

Recommended tables:

```text
period_locks
period_lock_history
period_reopen_requests
```

Rules:

- Locked accounting period cannot accept new journals except approved reversals.
- Locked VAT period cannot change tax lines without adjustment.
- Locked payroll period cannot change payroll items.
- Locked inventory period cannot change stock movements.
- Reopening requires admin approval, reason, and audit log.

## 21. Tenant Isolation

Every business table must include:

```text
company_id
branch_id optional
created_by
created_at
updated_by
updated_at
status
```

Tenant isolation must be enforced on the backend:

- API middleware loads tenant context.
- Queries are always scoped by `company_id`.
- Users cannot supply arbitrary `company_id` to access another tenant.
- Object storage keys include tenant scope.
- Queue workers validate tenant context before processing.
- Reports and exports are tenant-filtered.

## 22. Data Architecture

Recommended database groups:

```text
Identity
|-- users
|-- roles
|-- permissions
|-- role_permissions
`-- user_sessions

Tenant
|-- companies
|-- branches
|-- departments
|-- designations
`-- tenant_settings

Source Transactions
|-- source_transactions
|-- source_transaction_lines
|-- source_transaction_links
`-- source_transaction_status_history

Sales and eInvoicing
|-- customers
|-- products
|-- sales_invoices
|-- sales_invoice_lines
|-- invoice_share_logs
|-- einvoice_payloads
|-- einvoice_transmissions
`-- einvoice_status_logs

Tax
|-- tax_codes
|-- tax_lines
|-- tax_periods
|-- vat_returns
`-- tax_adjustments

Accounting
|-- accounts
|-- journal_entries
|-- journal_entry_lines
|-- posting_jobs
|-- posting_errors
|-- posting_retry_logs
|-- posting_rules
|-- payments
|-- receipts
|-- bank_reconciliations
`-- period_locks

Documents
|-- documents
|-- document_links
|-- document_extractions
`-- document_audit_logs

HR / Rota / Payroll / WPS
|-- employees
|-- attendance
|-- leave_requests
|-- overtime_requests
|-- shifts
|-- rota_periods
|-- rota_assignments
|-- payroll_runs
|-- payroll_items
|-- payslips
|-- wps_batches
`-- wps_sif_files

System
|-- notifications
|-- approval_workflows
|-- approval_actions
|-- audit_logs
`-- integration_logs
```

## 23. API Architecture

Recommended API areas:

```text
/api/v1/auth
/api/v1/tenant
/api/v1/settings
/api/v1/source-transactions
/api/v1/sales
/api/v1/einvoicing
/api/v1/purchases
/api/v1/app-data?action=save (manual purchase records and UI master data)
/api/v1/payments
/api/v1/accounting
/api/v1/tax
/api/v1/bank
/api/v1/inventory
/api/v1/hr
/api/v1/rota
/api/v1/payroll
/api/v1/wps
/api/v1/reports
/api/v1/documents
/api/v1/audit
```

Important endpoints:

```http
POST /auth/login
GET  /auth/me

POST /source-transactions
POST /source-transactions/{id}/validate
POST /source-transactions/{id}/submit
POST /source-transactions/{id}/approve

POST /accounting/posting-jobs
POST /accounting/posting-jobs/{id}/retry
POST /accounting/journals/{id}/reverse

POST /tax/periods/{id}/close
POST /vat-returns

POST /einvoicing/generate
POST /einvoicing/{id}/validate
POST /einvoicing/{id}/transmit
POST /einvoicing/{id}/retry

POST /wps/generate-sif
POST /wps/{id}/validate
POST /wps/{id}/mark-uploaded

POST /documents/extract
POST /documents/{id}/link
```

## 24. Security Architecture

Required controls:

- Backend tenant enforcement
- MFA for admin, accounting, payroll, and approvers
- Permission checks on every API
- Server-side validation
- Audit logging for sensitive actions
- File upload scanning
- Encrypted object storage
- Encrypted secrets
- Session timeout
- Queue worker tenant validation
- Period reopen approvals

## 25. Implementation Priorities

| Priority | Improvement |
| --- | --- |
| 1 | General Ledger + posting engine |
| 2 | Source transaction layer |
| 3 | Tax lines + VAT engine |
| 4 | Approval workflow |
| 5 | Audit logging |
| 6 | Period locking |
| 7 | Payroll WPS/SIF |
| 8 | eInvoicing readiness |
| 9 | Document evidence |
| 10 | Reporting engine |

## 26. Implementation Phases

### Phase 1: Stabilize Prototype

- Keep existing UI.
- Split `src/app.js` by module.
- Remove inline event handlers gradually.
- Keep checks passing.

### Phase 2: Backend Foundation

- Add relational database.
- Add tenant/auth middleware.
- Add role and permission model.
- Add document storage.
- Add audit logging.

### Phase 3: Source Transactions and Accounting

- Add source transaction layer.
- Add chart of accounts.
- Add journal entries and general ledger.
- Add posting rules.
- Add posting queue and retry logs.

### Phase 4: Tax and Evidence

- Add tax codes.
- Add tax lines.
- Add VAT periods and VAT returns.
- Link VAT claims to source documents.
- Add VAT period locks.

### Phase 5: HR, Rota, Payroll, WPS

- Persist employees, attendance, leave, overtime.
- Persist rota periods and assignments.
- Generate payroll from approved attendance and overtime.
- Add WPS/SIF generation, validation, export, and rejection handling.

### Phase 6: eInvoicing and Integrations

- Add structured eInvoice generation.
- Add UAE schema and mandatory field validation.
- Add ASP/Peppol connector boundary.
- Add eInvoice transmission logs and archive.
- Add retry handling.

### Phase 7: Reporting and Automation

- Build reports from authoritative sources.
- Add auto posting.
- Add auto reconciliation.
- Add alerting and exception dashboards.

## 27. Final Architecture Recommendation

Use this production pattern:

```text
Business Modules
        |
        v
Source Transactions
        |
        v
Validation + Approval
        |
        v
Posting Queue
        |
        v
Accounting Posting Engine
        |
        v
General Ledger + Tax Lines
        |
        v
Reports
        |
        v
Audit + Documents + Notifications
```

This makes TaxFlow production-ready for ledger-centered accounting, tax-line VAT, UAE eInvoicing readiness, WPS payroll support, strong audit controls, period locking, and evidence-backed compliance.
