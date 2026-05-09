from __future__ import annotations

import json
from decimal import Decimal

from app.database import Base, SessionLocal, engine
from app.models import (
    Account,
    AccrualPrepaymentRecord,
    AppDataRecord,
    ApprovalMatrixRecord,
    AuditLog,
    AuditLogDetail,
    BudgetRecord,
    CashFlowForecastRecord,
    Company,
    ConsolidationRecord,
    CorporateTaxRecord,
    CostCenterRecord,
    CreditControlRecord,
    CustomerAgingSnapshot,
    DailyGlBalance,
    Document,
    DomainEvent,
    Employee,
    EventOutbox,
    EventProcessingLog,
    ExceptionEvent,
    FixedAssetRecord,
    InventoryBalanceSnapshot,
    InventoryValuationLayer,
    Invoice,
    InvoiceLine,
    ItemUnit,
    Job,
    JournalEntry,
    JournalLine,
    PayrollItem,
    PayrollRun,
    PostingJob,
    MonthEndCloseRecord,
    SourceTransaction,
    SourceTransactionLine,
    StockAdjustmentApproval,
    StockMovement,
    StockProductMapping,
    TaxCode,
    TaxLine,
    TaxPeriod,
    User,
    VatReturnSnapshot,
    Warehouse,
    WpsBatch,
)
from app.security import hash_password


COMPANY_TRN = "100000000000003"
ADMIN_EMAIL = "admin@taxflowapp.com"
ADMIN_PASSWORD = "admin123"
SEED_COUNT = 50
PREFIX = "BULK50"


def money(value: int | float | str | Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def ensure_company_user(db) -> tuple[Company, User]:
    company = db.query(Company).filter(Company.trn == COMPANY_TRN).first()
    if not company:
        company = Company(name="TaxFlow Demo LLC", trn=COMPANY_TRN)
        db.add(company)
        db.flush()
    company.name = "TaxFlow Demo LLC"
    company.country = "United Arab Emirates"

    user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if not user:
        user = User(company_id=company.id, email=ADMIN_EMAIL, full_name="Sara Ahmed", role="admin")
        db.add(user)
    user.company_id = company.id
    user.password_hash = hash_password(ADMIN_PASSWORD)
    user.full_name = "Sara Ahmed"
    user.role = "admin"
    db.flush()
    return company, user


def upsert_app_record(db, company: Company, collection: str, record_key: str, payload: dict) -> None:
    existing = (
        db.query(AppDataRecord)
        .filter(
            AppDataRecord.company_id == company.id,
            AppDataRecord.collection == collection,
            AppDataRecord.record_key == record_key,
        )
        .first()
    )
    encoded = json.dumps(payload, default=str)
    if existing:
        existing.payload = encoded
    else:
        db.add(AppDataRecord(company_id=company.id, collection=collection, record_key=record_key, payload=encoded))


def ensure_account(db, company: Company, code: str, name: str, account_type: str) -> Account:
    account = db.query(Account).filter(Account.company_id == company.id, Account.code == code).first()
    if not account:
        account = Account(company_id=company.id, code=code, name=name, type=account_type)
        db.add(account)
    account.name = name
    account.type = account_type
    db.flush()
    return account


def ensure_tax_code(db, company: Company, code: str = "VAT5") -> TaxCode:
    tax_code = db.query(TaxCode).filter(TaxCode.company_id == company.id, TaxCode.code == code).first()
    if not tax_code:
        tax_code = TaxCode(company_id=company.id, code=code, name="Standard UAE VAT", rate=5, recoverable=True, reporting_box="Box 1")
        db.add(tax_code)
    db.flush()
    return tax_code


def delete_seed_rows(db) -> None:
    for model, field in (
        (EventProcessingLog, EventProcessingLog.consumer),
        (EventOutbox, EventOutbox.topic),
        (DomainEvent, DomainEvent.event_name),
        (ExceptionEvent, ExceptionEvent.source_record),
        (ApprovalMatrixRecord, ApprovalMatrixRecord.module),
        (ConsolidationRecord, ConsolidationRecord.group_name),
        (MonthEndCloseRecord, MonthEndCloseRecord.period),
        (CreditControlRecord, CreditControlRecord.customer_name),
        (CashFlowForecastRecord, CashFlowForecastRecord.forecast_date),
        (BudgetRecord, BudgetRecord.fiscal_year),
        (CostCenterRecord, CostCenterRecord.code),
        (AccrualPrepaymentRecord, AccrualPrepaymentRecord.reference),
        (FixedAssetRecord, FixedAssetRecord.asset_code),
        (CorporateTaxRecord, CorporateTaxRecord.period),
        (AuditLogDetail, AuditLogDetail.correlation_id),
        (VatReturnSnapshot, VatReturnSnapshot.source_version),
        (CustomerAgingSnapshot, CustomerAgingSnapshot.customer_name),
        (InventoryBalanceSnapshot, InventoryBalanceSnapshot.item_code),
        (DailyGlBalance, DailyGlBalance.account_code),
        (StockAdjustmentApproval, StockAdjustmentApproval.item_code),
        (InventoryValuationLayer, InventoryValuationLayer.item_code),
        (ItemUnit, ItemUnit.item_code),
        (StockMovement, StockMovement.reference),
        (StockProductMapping, StockProductMapping.sku),
        (WpsBatch, WpsBatch.batch_number),
        (PayrollRun, PayrollRun.period),
        (Employee, Employee.employee_no),
        (TaxPeriod, TaxPeriod.period),
        (PostingJob, PostingJob.error_message),
        (SourceTransaction, SourceTransaction.reference),
        (JournalEntry, JournalEntry.entry_number),
        (Account, Account.code),
        (TaxCode, TaxCode.code),
        (Document, Document.storage_key),
        (Job, Job.kind),
        (Invoice, Invoice.invoice_number),
        (AuditLog, AuditLog.action),
        (User, User.email),
        (Company, Company.trn),
    ):
        db.query(model).filter(field.like(f"{PREFIX}%")).delete(synchronize_session=False)
    db.query(AppDataRecord).filter(AppDataRecord.record_key.like(f"{PREFIX}%")).delete(synchronize_session=False)


def seed(db, company: Company, user: User) -> None:
    delete_seed_rows(db)
    ar = ensure_account(db, company, f"{PREFIX}-1100", "Bulk Customers Receivable", "asset")
    sales = ensure_account(db, company, f"{PREFIX}-3000", "Bulk Sales Income", "revenue")
    purchase = ensure_account(db, company, f"{PREFIX}-4000", "Bulk Purchases", "expense")
    tax_code = ensure_tax_code(db, company)
    for index in range(1, SEED_COUNT + 1):
        suffix = f"{index:03d}"
        demo_company = Company(name=f"{PREFIX} Tenant {suffix}", trn=f"{PREFIX}-TRN-{suffix}", country="United Arab Emirates")
        db.add(demo_company)
        db.flush()
        db.add(User(company_id=demo_company.id, email=f"{PREFIX.lower()}.user{suffix}@example.ae", full_name=f"{PREFIX} User {suffix}", role="viewer", password_hash=hash_password(ADMIN_PASSWORD)))
        ensure_account(db, company, f"{PREFIX}-ACC-{suffix}", f"{PREFIX} Account {suffix}", ["asset", "liability", "revenue", "expense"][index % 4])
        db.add(TaxCode(company_id=company.id, code=f"{PREFIX}-TAX-{suffix}", name=f"{PREFIX} Tax Code {suffix}", rate=5, recoverable=index % 2 == 0, reporting_box=f"Box {index % 9 + 1}"))
    db.commit()

    warehouses: list[Warehouse] = []
    mappings: list[StockProductMapping] = []
    employees: list[Employee] = []
    sources: list[SourceTransaction] = []
    audits: list[AuditLog] = []
    events: list[DomainEvent] = []

    categories = ["Materials", "Services", "Supplies", "Logistics", "Equipment"]
    units = [("PCS", "Pieces"), ("BOX", "Box"), ("CTN", "Carton"), ("HOUR", "Hour"), ("TRIP", "Trip")]
    emirates = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah"]

    for index in range(1, SEED_COUNT + 1):
        suffix = f"{index:03d}"
        subtotal = money(900 + index * 41)
        vat = money(subtotal * Decimal("0.05"))
        total = subtotal + vat

        invoice = Invoice(
            company_id=company.id,
            customer_name=f"{PREFIX} Customer {suffix}",
            invoice_number=f"{PREFIX}-INV-{suffix}",
            status="paid" if index % 4 == 0 else "issued",
            subtotal=subtotal,
            vat=vat,
            total=total,
        )
        invoice.lines = [InvoiceLine(description=f"{PREFIX} sales line {suffix}", quantity=1 + index % 5, unit_price=subtotal, vat_rate=5)]
        db.add(invoice)

        source = SourceTransaction(
            company_id=company.id,
            module="sales" if index % 2 else "purchase",
            reference=f"{PREFIX}-SRC-{suffix}",
            party_name=f"{PREFIX} Party {suffix}",
            status="approved",
            subtotal=subtotal,
            vat=vat,
            total=total,
            approved_by=user.id,
            validation_result="Bulk 50 seed validated",
        )
        source.lines = [
            SourceTransactionLine(
                description=f"{PREFIX} source line {suffix}",
                account_code=sales.code if index % 2 else purchase.code,
                quantity=1,
                unit_price=subtotal,
                vat_rate=5,
                amount=subtotal,
                vat_amount=vat,
            )
        ]
        db.add(source)
        db.flush()
        sources.append(source)

        db.add(PostingJob(company_id=company.id, source_id=source.id, status="queued", error_message=f"{PREFIX}-POST-{suffix}"))
        db.add(TaxLine(company_id=company.id, source_id=source.id, tax_code_id=tax_code.id, direction="output" if index % 2 else "input", taxable_amount=subtotal, tax_amount=vat, period="2026-05"))
        db.add(TaxPeriod(company_id=company.id, period=f"{PREFIX}-2026-{suffix}", status="open"))

        journal = JournalEntry(company_id=company.id, entry_number=f"{PREFIX}-JE-{suffix}", source_module="seed50", source_id=source.id, description=f"Bulk 50 journal {suffix}")
        journal.lines = [
            JournalLine(account_id=ar.id, description="Bulk debit", debit=subtotal, credit=0),
            JournalLine(account_id=sales.id, description="Bulk credit", debit=0, credit=subtotal),
        ]
        db.add(journal)

        warehouse = Warehouse(company_id=company.id, name=f"{PREFIX} Warehouse {suffix}", location=emirates[index % len(emirates)])
        db.add(warehouse)
        db.flush()
        warehouses.append(warehouse)

        mapping = StockProductMapping(
            company_id=company.id,
            sku=f"{PREFIX}-SKU-{suffix}",
            name=f"{PREFIX} Stock Item {suffix}",
            sales_account_code=sales.code,
            purchase_account_code=purchase.code,
            inventory_account_code="1200",
            tax_code="VAT5",
            reorder_level=index,
        )
        db.add(mapping)
        db.flush()
        mappings.append(mapping)

        db.add(StockMovement(company_id=company.id, mapping_id=mapping.id, warehouse_id=warehouse.id, movement_type="opening", quantity=index * 2, unit_cost=money(10 + index), reference=f"{PREFIX}-MOVE-{suffix}"))
        db.add(ItemUnit(company_id=company.id, item_code=mapping.sku, unit_code=units[index % len(units)][0], unit_name=units[index % len(units)][1], conversion_factor=1 + (index % 4), is_base_unit=index % 5 == 0))
        db.add(InventoryValuationLayer(company_id=company.id, item_code=mapping.sku, warehouse_id=warehouse.id, source_module="seed50", source_id=source.id, quantity_in=index * 2, quantity_remaining=index, unit_cost=money(10 + index), valuation_method="FIFO"))
        db.add(StockAdjustmentApproval(company_id=company.id, item_code=mapping.sku, warehouse_id=warehouse.id, quantity_delta=index, reason=f"{PREFIX} stock correction {suffix}", status="pending", requested_by=user.id))

        employee = Employee(
            company_id=company.id,
            employee_no=f"{PREFIX}-EMP-{suffix}",
            full_name=f"{PREFIX} Employee {suffix}",
            department=["Finance", "Sales", "Operations", "HR"][index % 4],
            designation=f"Role {suffix}",
            basic_salary=money(4500 + index * 100),
            iban=None if index % 17 == 0 else f"AE{index:02d}0331234567890123456",
            wps_id=f"{PREFIX}-WPS-{suffix}",
        )
        db.add(employee)
        db.flush()
        employees.append(employee)

        db.add(Document(company_id=company.id, filename=f"{PREFIX.lower()}-document-{suffix}.pdf", content_type="application/pdf", storage_key=f"{PREFIX.lower()}/{company.id}/{suffix}.pdf"))
        db.add(Job(company_id=company.id, kind=f"{PREFIX}_JOB_{suffix}", status="completed", result='{"seed":50}'))

        audit = AuditLog(company_id=company.id, user_id=user.id, module="seed50", action=f"{PREFIX}_AUDIT_{suffix}", record_id=source.id, detail=f"Bulk seed audit {suffix}")
        db.add(audit)
        db.flush()
        audits.append(audit)
        db.add(AuditLogDetail(company_id=company.id, audit_log_id=audit.id, old_value="{}", new_value=json.dumps({"index": index}), reason="Bulk seed", ip_address="127.0.0.1", device="local", correlation_id=f"{PREFIX}-CORR-{suffix}"))

        exception = ExceptionEvent(company_id=company.id, module="Seed", category="Bulk test", severity="low" if index % 3 else "medium", source_record=f"{PREFIX}-EXC-{suffix}", message=f"Bulk seeded exception {suffix}", status="open")
        db.add(exception)

        event = DomainEvent(company_id=company.id, event_name=f"{PREFIX}_EVENT_{suffix}", source_module="seed50", source_id=source.id, payload=json.dumps({"index": index}), correlation_id=f"{PREFIX}-CORR-{suffix}")
        db.add(event)
        db.flush()
        events.append(event)
        db.add(EventOutbox(company_id=company.id, event_id=event.id, topic=f"{PREFIX}_EVENT_{suffix}", payload=event.payload, status="pending"))
        db.add(EventProcessingLog(company_id=company.id, event_id=event.id, consumer=f"{PREFIX}_CONSUMER_{suffix}", status="processed", detail="Bulk seed processed"))

        db.add(DailyGlBalance(company_id=company.id, balance_date=f"2026-05-{((index - 1) % 28) + 1:02d}", account_code=f"{PREFIX}-GL-{suffix}", debit=subtotal, credit=vat, closing_balance=total))
        db.add(InventoryBalanceSnapshot(company_id=company.id, snapshot_date="2026-05-31", item_code=mapping.sku, warehouse_name=warehouse.name, quantity=index * 2, inventory_value=money((10 + index) * index * 2)))
        db.add(CustomerAgingSnapshot(company_id=company.id, snapshot_date="2026-05-31", customer_name=f"{PREFIX} Customer {suffix}", bucket_current=total, bucket_30=index, bucket_60=index * 2, bucket_90=index * 3))
        db.add(VatReturnSnapshot(company_id=company.id, period=f"2026-{((index - 1) % 12) + 1:02d}", output_vat=vat, input_vat=money(vat / 2), net_vat_payable=money(vat / 2), source_version=f"{PREFIX}-VAT-{suffix}"))
        db.add(CorporateTaxRecord(company_id=company.id, period=f"{PREFIX}-CT-{suffix}", accounting_profit=subtotal * 3, tax_adjustments=vat, taxable_income=(subtotal * 3) + vat, tax_due=money(((subtotal * 3) + vat) * Decimal("0.09")), status="draft"))
        db.add(FixedAssetRecord(company_id=company.id, asset_code=f"{PREFIX}-FA-{suffix}", asset_name=f"{PREFIX} Asset {suffix}", category=["Vehicle", "Equipment", "Furniture", "IT"][index % 4], purchase_cost=subtotal * 2, accumulated_depreciation=vat, method="Straight Line", location=warehouse.name, custodian=f"{PREFIX} Employee {suffix}", status="active"))
        db.add(AccrualPrepaymentRecord(company_id=company.id, record_type=["Accrued Expense", "Accrued Income", "Prepaid Expense", "Deferred Income"][index % 4], reference=f"{PREFIX}-ACCR-{suffix}", description=f"{PREFIX} accrual schedule {suffix}", total_amount=total, monthly_amount=money(total / 12), reversal_day=(index % 28) + 1, status="active"))
        db.add(CostCenterRecord(company_id=company.id, code=f"{PREFIX}-CC-{suffix}", name=f"{PREFIX} Cost Center {suffix}", department=["Finance", "Sales", "Operations", "HR"][index % 4], branch=emirates[index % len(emirates)], project=f"{PREFIX} Project {suffix}", location=warehouse.name, status="active"))
        db.add(BudgetRecord(company_id=company.id, fiscal_year=f"{PREFIX}-FY-{suffix}", cost_center=f"{PREFIX}-CC-{suffix}", account_code=sales.code, annual_budget=total * 10, actual_amount=total * 8, variance_amount=total * 2, approval_status="approved" if index % 3 else "review"))
        db.add(CashFlowForecastRecord(company_id=company.id, forecast_date=f"{PREFIX}-DAY-{suffix}", expected_receipts=total * 2, expected_payments=total, net_cash_flow=total, method="direct"))
        db.add(CreditControlRecord(company_id=company.id, customer_name=f"{PREFIX} Customer {suffix}", credit_limit=total * 4, outstanding_amount=total, credit_status="credit_hold" if index % 10 == 0 else "active", promise_to_pay="2026-06-08", bad_debt_provision=money(total * Decimal("0.05"))))
        db.add(MonthEndCloseRecord(company_id=company.id, period=f"{PREFIX}-ME-{suffix}", checklist_item=["Bank Reconciled", "AR Reviewed", "AP Reviewed", "VAT Reviewed", "Payroll Posted", "Depreciation Posted", "Accruals Posted", "Stock Valuation Posted", "Trial Balance Reviewed", "Period Locked"][index % 10], status="done" if index % 2 else "open", owner="Finance", locked=index % 10 == 0))
        db.add(ConsolidationRecord(company_id=company.id, group_name=f"{PREFIX}-GROUP-{suffix}", subsidiary_name=f"{PREFIX} Subsidiary {suffix}", currency="AED", translated_amount=total * 5, elimination_amount=vat, status="draft"))
        db.add(ApprovalMatrixRecord(company_id=company.id, module=f"{PREFIX}-APPROVAL-{suffix}", min_amount=money(index * 1000), max_amount=money(index * 1000 + 9999), approver_role=["Supervisor", "Manager", "Director"][index % 3], department=["Finance", "Sales", "Operations", "All"][index % 4]))

        category = categories[index % len(categories)]
        unit_code, unit_name = units[index % len(units)]
        upsert_app_record(db, company, "products", f"{PREFIX}-PRD-{suffix}", {"code": f"{PREFIX}-PRD-{suffix}", "name": f"{PREFIX} Product {suffix}", "category": category, "unit": unit_name, "price": str(subtotal), "vat": "Standard 5%"})
        upsert_app_record(db, company, "customers", f"{PREFIX} Customer {suffix}", {"name": f"{PREFIX} Customer {suffix}", "trn": f"1000000500{index:05d}", "emirate": emirates[index % len(emirates)], "email": f"bulk50.customer{suffix}@example.ae"})
        upsert_app_record(db, company, "salesInvoices", f"{PREFIX}-SINV-{suffix}", {"invoice_no": f"{PREFIX}-SINV-{suffix}", "customer": f"{PREFIX} Customer {suffix}", "date": "09 May 2026", "due_date": "08 Jun 2026", "subtotal": str(subtotal), "vat_amount": str(vat), "total": str(total), "source": "Manual", "status": "Ready"})
        upsert_app_record(db, company, "purchaseRecords", f"{PREFIX}-PUR-{suffix}", {"ref": f"{PREFIX}-PUR-{suffix}", "supplier": f"{PREFIX} Supplier {suffix}", "date": "2026-05-09", "location": warehouse.name, "items": 1 + index % 7, "net_amount": str(subtotal), "tax_amount": str(vat), "shipping": "0.00", "total": str(total), "paid": "0.00", "due": str(total), "source": "Manual", "status": "Pending Payment"})
        upsert_app_record(db, company, "vendors", f"{PREFIX} Supplier {suffix}", {"name": f"{PREFIX} Supplier {suffix}", "trn": f"1000000600{index:05d}", "category": category, "email": f"bulk50.supplier{suffix}@example.ae"})
        upsert_app_record(db, company, "bills", f"{PREFIX}-BILL-{suffix}", {"bill_no": f"{PREFIX}-BILL-{suffix}", "vendor": f"{PREFIX} Supplier {suffix}", "date": "2026-05-09", "due": "2026-06-08", "subtotal": str(subtotal), "vat": str(vat), "total": str(total), "status": "Awaiting Payment"})
        upsert_app_record(db, company, "payments", f"{PREFIX}-PAY-{suffix}", {"ref": f"{PREFIX}-PAY-{suffix}", "contact": f"{PREFIX} Customer {suffix}", "type": "Customer Receipt" if index % 2 else "Supplier Payment", "method": "Bank Transfer", "date": "2026-05-09", "amount": str(total)})
        upsert_app_record(db, company, "salesCategories", f"{PREFIX}-CAT-{suffix}", {"name": f"{PREFIX} Category {suffix}", "scope": "Sales & Purchase", "vat": "Standard 5%", "status": "Active"})
        upsert_app_record(db, company, "salesUnits", f"{PREFIX}-UNIT-{suffix}", {"code": f"U{index:03d}", "name": f"{PREFIX} Unit {suffix}", "type": "Quantity", "decimals": "2", "status": "Active"})
        upsert_app_record(db, company, "settings", f"{PREFIX}-SETTING-{suffix}", {"key": f"{PREFIX}-SETTING-{suffix}", "value": "enabled"})
        if index % 10 == 0:
            db.commit()

    payroll_runs: list[PayrollRun] = []
    for index in range(1, SEED_COUNT + 1):
        run = PayrollRun(company_id=company.id, period=f"{PREFIX}-PAYRUN-{index:03d}", status="draft", gross_total=0, deductions_total=0, net_total=0)
        db.add(run)
        payroll_runs.append(run)
    db.flush()
    payroll_run = payroll_runs[0]
    gross = Decimal("0.00")
    deductions = Decimal("0.00")
    net = Decimal("0.00")
    for index, employee in enumerate(employees, start=1):
        basic = money(employee.basic_salary)
        allowance = money(500 + index)
        deduction = money(25 if index % 5 == 0 else 0)
        item_net = basic + allowance - deduction
        db.add(PayrollItem(run_id=payroll_run.id, employee_id=employee.id, basic=basic, allowances=allowance, overtime=0, deductions=deduction, net_pay=item_net, wps_status="ready" if employee.iban else "iban_missing"))
        gross += basic + allowance
        deductions += deduction
        net += item_net
    payroll_run.gross_total = gross
    payroll_run.deductions_total = deductions
    payroll_run.net_total = net

    for index in range(1, SEED_COUNT + 1):
        db.add(WpsBatch(company_id=company.id, payroll_run_id=payroll_runs[index - 1].id, batch_number=f"{PREFIX}-WPS-BATCH-{index:03d}", status="pending_validation", sif_content=f"EDR,{PREFIX}-EMP-{index:03d}"))
        if index % 10 == 0:
            db.commit()


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        company, user = ensure_company_user(db)
        seed(db, company, user)
        db.commit()
        print(f"Added {SEED_COUNT} {PREFIX} records across live TaxFlow tables and UI collections.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
