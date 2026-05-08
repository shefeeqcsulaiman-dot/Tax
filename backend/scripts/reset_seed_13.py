from __future__ import annotations

from decimal import Decimal

from app.database import Base, SessionLocal, engine
from app.models import (
    Account,
    AuditLog,
    Company,
    Document,
    Employee,
    Invoice,
    InvoiceLine,
    Job,
    JournalEntry,
    JournalLine,
    PayrollItem,
    PayrollRun,
    PostingJob,
    SourceTransaction,
    SourceTransactionLine,
    StockMovement,
    StockProductMapping,
    TaxCode,
    TaxLine,
    TaxPeriod,
    User,
    Warehouse,
    WpsBatch,
)
from app.security import hash_password


COMPANY_TRN = "100000000000003"
ADMIN_EMAIL = "admin@taxflowapp.com"
ADMIN_PASSWORD = "admin123"


def money(value: int | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def clear_business_data(db) -> None:
    for model in (
        WpsBatch,
        PayrollItem,
        PayrollRun,
        Employee,
        StockMovement,
        StockProductMapping,
        Warehouse,
        TaxLine,
        TaxPeriod,
        TaxCode,
        PostingJob,
        SourceTransactionLine,
        SourceTransaction,
        JournalLine,
        JournalEntry,
        Account,
        InvoiceLine,
        Invoice,
        Document,
        Job,
        AuditLog,
    ):
        db.query(model).delete()


def ensure_company_and_admin(db) -> tuple[Company, User]:
    company = db.query(Company).filter(Company.trn == COMPANY_TRN).first()
    if not company:
        company = Company(name="TaxFlow UAE LLC", trn=COMPANY_TRN)
        db.add(company)
        db.flush()
    company.name = "TaxFlow UAE LLC"
    company.country = "United Arab Emirates"

    user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if not user:
        user = User(company_id=company.id, email=ADMIN_EMAIL, full_name="Sara Ahmed", role="admin")
        db.add(user)
    user.company_id = company.id
    user.full_name = "Sara Ahmed"
    user.role = "admin"
    user.password_hash = hash_password(ADMIN_PASSWORD)
    db.flush()
    return company, user


def seed_accounts(db, company: Company) -> list[Account]:
    specs = [
        ("1000", "Cash and Bank", "asset"),
        ("1100", "Accounts Receivable", "asset"),
        ("1200", "Inventory", "asset"),
        ("2100", "Accounts Payable", "liability"),
        ("2200", "VAT Output Payable", "liability"),
        ("2210", "VAT Input Recoverable", "asset"),
        ("3000", "Sales Income", "revenue"),
        ("4000", "Purchases", "expense"),
        ("5000", "Cost of Goods Sold", "expense"),
        ("6000", "Salary Expense", "expense"),
        ("7000", "Seed Sales Clearing", "revenue"),
        ("8000", "Seed Purchase Clearing", "expense"),
        ("9000", "Accrued Expenses", "liability"),
    ]
    accounts: list[Account] = []
    for code, name, account_type in specs:
        account = Account(company_id=company.id, code=code, name=name, type=account_type)
        db.add(account)
        accounts.append(account)
    db.flush()
    return accounts


def seed_tax_codes(db, company: Company) -> list[TaxCode]:
    codes: list[TaxCode] = []
    specs = [
        ("VAT5", "Standard UAE VAT", "5.00", True, "Box 1"),
        ("ZERO", "Zero-rated export", "0.00", False, "Box 4"),
        ("EXEMPT", "Exempt supply", "0.00", False, "Box 6"),
        ("RCM", "Reverse charge", "5.00", True, "Box 3"),
    ]
    for index in range(1, 14):
        base = specs[(index - 1) % len(specs)]
        code = base[0] if index <= len(specs) else f"{base[0]}-{index:02d}"
        code = TaxCode(
            company_id=company.id,
            code=code,
            name=f"{base[1]} {index}",
            rate=base[2],
            recoverable=base[3],
            reporting_box=base[4],
        )
        db.add(code)
        codes.append(code)
    db.flush()
    return codes


def seed_invoices(db, company: Company) -> list[Invoice]:
    invoices: list[Invoice] = []
    for index in range(1, 14):
        subtotal = money(index * 875 + 250)
        vat = money(subtotal * Decimal("0.05"))
        status = "paid" if index in {3, 6} else "issued"
        invoice = Invoice(
            company_id=company.id,
            customer_name=f"Customer 13-{index:02d}",
            invoice_number=f"INV-13-{index:04d}",
            status=status,
            subtotal=subtotal,
            vat=vat,
            total=subtotal + vat,
        )
        invoice.lines = [
            InvoiceLine(description=f"Product line {index}", quantity=index, unit_price=money(500 + index * 20), vat_rate=5),
            InvoiceLine(description=f"Service line {index}", quantity=1, unit_price=money(125 + index * 15), vat_rate=5),
        ]
        db.add(invoice)
        invoices.append(invoice)
    db.flush()
    return invoices


def seed_journals(db, company: Company, accounts: list[Account]) -> list[JournalEntry]:
    journals: list[JournalEntry] = []
    debit_account = accounts[1]
    credit_account = accounts[6]
    for index in range(1, 14):
        amount = money(1000 + index * 100)
        journal = JournalEntry(
            company_id=company.id,
            entry_number=f"JE-13-{index:04d}",
            source_module="seed",
            description=f"Seed balanced journal {index}",
        )
        journal.lines = [
            JournalLine(account_id=debit_account.id, description="Debit receivable", debit=amount, credit=0),
            JournalLine(account_id=credit_account.id, description="Credit sales", debit=0, credit=amount),
        ]
        db.add(journal)
        journals.append(journal)
    db.flush()
    return journals


def seed_sources(db, company: Company, user: User, tax_codes: list[TaxCode]) -> list[SourceTransaction]:
    sources: list[SourceTransaction] = []
    for index in range(1, 14):
        module = "sales" if index % 2 else "purchase"
        amount = money(700 + index * 80)
        vat = money(amount * Decimal("0.05"))
        source = SourceTransaction(
            company_id=company.id,
            module=module,
            reference=f"SRC-13-{index:04d}",
            party_name=f"Source Party {index}",
            status="approved",
            subtotal=amount,
            vat=vat,
            total=amount + vat,
            approved_by=user.id,
            validation_result="Seeded and approved",
        )
        source.lines = [
            SourceTransactionLine(
                description=f"{module.title()} source line {index}",
                account_code="3000" if module == "sales" else "4000",
                quantity=1,
                unit_price=amount,
                vat_rate=5,
                amount=amount,
                vat_amount=vat,
            )
        ]
        db.add(source)
        db.flush()
        db.add(PostingJob(company_id=company.id, source_id=source.id, status="queued"))
        db.add(
            TaxLine(
                company_id=company.id,
                source_id=source.id,
                tax_code_id=tax_codes[(index - 1) % len(tax_codes)].id,
                direction="output" if module == "sales" else "input",
                taxable_amount=amount,
                tax_amount=vat,
                period="2026-05",
            )
        )
        sources.append(source)
    db.flush()
    return sources


def seed_inventory(db, company: Company) -> tuple[list[Warehouse], list[StockProductMapping]]:
    warehouses: list[Warehouse] = []
    mappings: list[StockProductMapping] = []
    for index in range(1, 14):
        warehouse_name = "Main Store" if index == 1 else f"Warehouse 13-{index:02d}"
        warehouse = Warehouse(company_id=company.id, name=warehouse_name, location=f"UAE Zone {index}")
        db.add(warehouse)
        warehouses.append(warehouse)
        sku = "PRD-001" if index == 1 else f"SKU-13-{index:04d}"
        item_name = "Steel Rods 12mm" if index == 1 else f"Inventory Item 13-{index:02d}"
        mapping = StockProductMapping(
            company_id=company.id,
            sku=sku,
            name=item_name,
            sales_account_code="3000",
            purchase_account_code="4000",
            inventory_account_code="3000",
            tax_code="VAT5",
            reorder_level=index * 5,
        )
        db.add(mapping)
        mappings.append(mapping)
    db.flush()
    for index, mapping in enumerate(mappings, start=1):
        db.add(
            StockMovement(
                company_id=company.id,
                mapping_id=mapping.id,
                warehouse_id=warehouses[index - 1].id,
                movement_type="opening",
                quantity=index * 10,
                unit_cost=25 + index,
                reference=f"OPEN-13-{index:04d}",
            )
        )
    db.flush()
    return warehouses, mappings


def seed_payroll(db, company: Company) -> PayrollRun:
    run = PayrollRun(company_id=company.id, period="2026-05", status="draft")
    gross = Decimal("0.00")
    deductions_total = Decimal("0.00")
    net_total = Decimal("0.00")
    default_employees = {
        1: ("EMP-001", "Sara Al Mansouri", "Management", "General Manager", "AE070331234567890123456", "WPS-001"),
        2: ("EMP-002", "Ahmed Rashid", "Operations", "Warehouse Manager", "AE150331234567890123456", "WPS-002"),
        3: ("EMP-003", "Rania Abboud", "Finance", "Accountant", None, "WPS-003"),
        4: ("EMP-004", "Mohamed Jaber", "Sales", "Sales Executive", "AE460331234567890123456", "WPS-004"),
    }
    for index in range(1, 14):
        basic = money(5000 + index * 450)
        allowances = money(700 + index * 50)
        overtime = money(100 + index * 25)
        deductions = money(200 if index % 4 == 0 else 0)
        net = basic + allowances + overtime - deductions
        default = default_employees.get(index)
        employee_no = default[0] if default else f"EMP-13-{index:03d}"
        full_name = default[1] if default else f"Employee 13-{index:02d}"
        department = default[2] if default else ["Finance", "Sales", "Operations", "HR"][index % 4]
        designation = default[3] if default else f"Role {index}"
        iban = default[4] if default else (None if index == 13 else f"AE{index:02d}0331234567890123456")
        wps_id = default[5] if default else f"WPS-13-{index:03d}"
        employee = Employee(
            company_id=company.id,
            employee_no=employee_no,
            full_name=full_name,
            department=department,
            designation=designation,
            basic_salary=basic,
            iban=iban,
            wps_id=wps_id,
        )
        db.add(employee)
        db.flush()
        run.items.append(
            PayrollItem(
                employee_id=employee.id,
                basic=basic,
                allowances=allowances,
                overtime=overtime,
                deductions=deductions,
                net_pay=net,
                wps_status="iban_missing" if not iban else "ready",
            )
        )
        gross += basic + allowances + overtime
        deductions_total += deductions
        net_total += net
    run.gross_total = gross
    run.deductions_total = deductions_total
    run.net_total = net_total
    db.add(run)
    db.flush()
    rows = ["EDR,EmployeeNo,Name,IBAN,NetPay"]
    for item in run.items:
        employee = item.employee
        rows.append(f"EDR,{employee.employee_no},{employee.full_name},{employee.iban or 'MISSING'},{item.net_pay:.2f}")
    db.add(
        WpsBatch(
            company_id=company.id,
            payroll_run_id=run.id,
            batch_number="WPS-13-2026-05",
            status="blocked",
            sif_content="\n".join(rows),
        )
    )
    return run


def seed_documents_jobs_audit(db, company: Company, user: User) -> None:
    for index in range(1, 14):
        db.add(
            Document(
                company_id=company.id,
                filename=f"document-13-{index:02d}.pdf",
                content_type="application/pdf",
                storage_key=f"seed/{company.id}/document-13-{index:02d}.pdf",
            )
        )
        db.add(Job(company_id=company.id, kind=f"seed_job_{index:02d}", status="completed", result='{"ok":true}'))
        db.add(
            AuditLog(
                company_id=company.id,
                user_id=user.id,
                module="seed",
                action="initial_data_seeded" if index == 1 else f"seed_action_{index:02d}",
                record_id=None,
                detail="Seeded TaxFlow production modules and master data" if index == 1 else f"Reset seed record {index}",
            )
        )


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        clear_business_data(db)
        company, user = ensure_company_and_admin(db)
        accounts = seed_accounts(db, company)
        tax_codes = seed_tax_codes(db, company)
        seed_invoices(db, company)
        seed_journals(db, company, accounts)
        seed_sources(db, company, user, tax_codes)
        seed_inventory(db, company)
        seed_payroll(db, company)
        seed_documents_jobs_audit(db, company, user)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
