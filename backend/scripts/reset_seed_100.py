from __future__ import annotations

import json
from decimal import Decimal

from app.database import Base, SessionLocal, engine
from app.models import (
    Account,
    AppDataRecord,
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


def money(value: int | float | str | Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def clear_data(db) -> None:
    for model in (
        AppDataRecord,
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


def ensure_login(db) -> tuple[Company, User]:
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
    user.full_name = "Sara Ahmed"
    user.role = "admin"
    user.password_hash = hash_password(ADMIN_PASSWORD)
    db.flush()
    return company, user


def app_record(db, company: Company, collection: str, record_key: str, payload: dict) -> None:
    db.add(
        AppDataRecord(
            company_id=company.id,
            collection=collection,
            record_key=record_key,
            payload=json.dumps(payload, default=str),
        )
    )


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
    ]
    accounts: list[Account] = []
    for code, name, account_type in specs:
        account = Account(company_id=company.id, code=code, name=name, type=account_type)
        db.add(account)
        accounts.append(account)
    db.flush()
    return accounts


def seed_core_tables(db, company: Company, user: User, accounts: list[Account]) -> None:
    tax_code = TaxCode(company_id=company.id, code="VAT5", name="Standard UAE VAT", rate=5, recoverable=True, reporting_box="Box 1")
    db.add(tax_code)
    db.flush()

    for index in range(1, 101):
        subtotal = money(1000 + index * 37)
        vat = money(subtotal * Decimal("0.05"))
        invoice = Invoice(
            company_id=company.id,
            customer_name=f"Customer {index:03d}",
            invoice_number=f"INV-2026-{index:04d}",
            status="paid" if index % 4 == 0 else "issued",
            subtotal=subtotal,
            vat=vat,
            total=subtotal + vat,
        )
        invoice.lines = [
            InvoiceLine(description=f"Seed product {index:03d}", quantity=1 + (index % 5), unit_price=money(200 + index), vat_rate=5)
        ]
        db.add(invoice)

        source = SourceTransaction(
            company_id=company.id,
            module="purchase" if index % 2 == 0 else "sales",
            reference=f"SRC-2026-{index:04d}",
            party_name=f"Party {index:03d}",
            status="approved",
            subtotal=subtotal,
            vat=vat,
            total=subtotal + vat,
            approved_by=user.id,
            validation_result="Seeded for pagination test",
        )
        source.lines = [
            SourceTransactionLine(
                description=f"Source line {index:03d}",
                account_code="4000" if index % 2 == 0 else "3000",
                quantity=1,
                unit_price=subtotal,
                vat_rate=5,
                amount=subtotal,
                vat_amount=vat,
            )
        ]
        db.add(source)
        db.flush()
        db.add(TaxLine(company_id=company.id, source_id=source.id, tax_code_id=tax_code.id, direction="input" if index % 2 == 0 else "output", taxable_amount=subtotal, tax_amount=vat, period="2026-05"))

        journal = JournalEntry(company_id=company.id, entry_number=f"JE-2026-{index:04d}", source_module="seed", description=f"Seed journal {index:03d}")
        journal.lines = [
            JournalLine(account_id=accounts[1].id, description="Debit", debit=subtotal, credit=0),
            JournalLine(account_id=accounts[6].id, description="Credit", debit=0, credit=subtotal),
        ]
        db.add(journal)


def seed_app_data(db, company: Company) -> None:
    categories = ["Materials", "Services", "Supplies", "Logistics", "Equipment"]
    units = [("EACH", "Each"), ("BOX", "Box"), ("TON", "Ton"), ("HOUR", "Hour"), ("TRIP", "Trip")]
    for name in categories:
        app_record(db, company, "salesCategories", name, {"name": name, "scope": "Sales & Purchase", "vat": "Standard 5%", "status": "Active"})
    for code, name in units:
        app_record(db, company, "salesUnits", code, {"code": code, "name": name, "type": "Quantity", "decimals": "2", "status": "Active"})

    for index in range(1, 101):
        category = categories[index % len(categories)]
        unit_code, unit_name = units[index % len(units)]
        price = money(50 + index * 3)
        app_record(
            db,
            company,
            "products",
            f"PRD-2026-{index:04d}",
            {
                "code": f"PRD-2026-{index:04d}",
                "name": f"Seed Product {index:03d}",
                "category": category,
                "unit": unit_name,
                "price": str(price),
                "vat": "Standard 5%",
            },
        )
        app_record(
            db,
            company,
            "customers",
            f"Customer {index:03d}",
            {
                "name": f"Customer {index:03d}",
                "trn": f"1000000000{index:05d}",
                "emirate": ["Dubai", "Abu Dhabi", "Sharjah"][index % 3],
                "email": f"customer{index:03d}@example.ae",
            },
        )
        subtotal = money(800 + index * 23)
        vat = money(subtotal * Decimal("0.05"))
        total = subtotal + vat
        paid = total if index % 3 == 0 else money(0)
        due = max(money(0), total - paid)
        app_record(
            db,
            company,
            "purchaseRecords",
            f"PUR-2026-{index:04d}",
            {
                "ref": f"PUR-2026-{index:04d}",
                "supplier": f"Supplier {index:03d}",
                "date": f"2026-05-{((index - 1) % 28) + 1:02d}",
                "location": ["Nuevo (BL0001)", "Dubai HQ", "Main Warehouse"][index % 3],
                "items": 1 + (index % 7),
                "net_amount": str(subtotal),
                "tax_amount": str(vat),
                "shipping": str(money(index % 5 * 10)),
                "total": str(total),
                "paid": str(paid),
                "due": str(due),
                "source": "Manual",
                "status": "Paid" if due == 0 else "Pending Payment",
            },
        )


def seed_misc(db, company: Company, user: User) -> None:
    for index in range(1, 101):
        db.add(Document(company_id=company.id, filename=f"seed-document-{index:03d}.pdf", content_type="application/pdf", storage_key=f"seed/{company.id}/{index:03d}.pdf"))
        db.add(Job(company_id=company.id, kind=f"seed_job_{index:03d}", status="completed", result='{"ok":true}'))
        db.add(AuditLog(company_id=company.id, user_id=user.id, module="seed", action=f"seed_100_record_{index:03d}", detail="Reset and seeded 100 demo records"))

    warehouse = Warehouse(company_id=company.id, name="Main Warehouse", location="Dubai")
    db.add(warehouse)
    db.flush()
    for index in range(1, 101):
        mapping = StockProductMapping(company_id=company.id, sku=f"SKU-2026-{index:04d}", name=f"Stock Item {index:03d}", reorder_level=index)
        db.add(mapping)
        db.flush()
        db.add(StockMovement(company_id=company.id, mapping_id=mapping.id, warehouse_id=warehouse.id, movement_type="opening", quantity=index, unit_cost=10 + index, reference=f"OPEN-2026-{index:04d}"))


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        clear_data(db)
        company, user = ensure_login(db)
        accounts = seed_accounts(db, company)
        seed_core_tables(db, company, user, accounts)
        seed_app_data(db, company)
        seed_misc(db, company, user)
        db.commit()
        print("Cleared business data and seeded 100 demo records per main test table.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
