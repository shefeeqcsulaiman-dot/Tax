import json
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    Account,
    AppDataRecord,
    AuditLog,
    Invoice,
    InvoiceLine,
    SourceTransaction,
    StockProductMapping,
    User,
)


router = APIRouter(prefix="/app-data", tags=["app data"])


def decimal_value(value: Any) -> Decimal:
    try:
        cleaned = str(value or "0").replace(",", "").replace("AED", "").strip()
        return Decimal(cleaned or "0")
    except (InvalidOperation, ValueError):
        return Decimal("0")


def record_key(collection: str, record: dict[str, Any]) -> str | None:
    keys = {
        "products": "code",
        "customers": "name",
        "salesInvoices": "invoice_no",
        "quotations": "quote_no",
        "accounts": "code",
        "ledger": "ref",
        "bills": "bill_no",
        "vendors": "name",
        "payments": "ref",
        "audit": "time",
        "invoiceLayout": "company",
        "salesCategories": "name",
        "salesUnits": "code",
        "purchaseRecords": "ref",
        "app_actions": "id",
    }
    field = keys.get(collection)
    if field and record.get(field):
        return str(record[field])
    for field in ("id", "reference", "name", "code", "ref"):
        if record.get(field):
            return str(record[field])
    return None


def serialize(record: AppDataRecord) -> dict[str, Any]:
    try:
        return json.loads(record.payload)
    except json.JSONDecodeError:
        return {}


@router.get("")
def bootstrap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    records = (
        db.query(AppDataRecord)
        .filter(AppDataRecord.company_id == current_user.company_id)
        .order_by(AppDataRecord.created_at.asc())
        .all()
    )
    grouped: dict[str, list[dict[str, Any]]] = {}
    for item in records:
        grouped.setdefault(item.collection, []).append(serialize(item))

    audit_rows = (
        db.query(AuditLog)
        .filter(AuditLog.company_id == current_user.company_id)
        .order_by(AuditLog.created_at.desc())
        .limit(50)
        .all()
    )
    audit = [
        {
            "time": row.created_at.strftime("%d/%m/%Y, %H:%M") if row.created_at else "",
            "user": current_user.full_name,
            "action": row.action.replace("_", " ").title(),
            "record": row.module,
            "result": "Logged",
        }
        for row in audit_rows
    ]

    invoice_layout = grouped.get("invoiceLayout", [{}])[-1] if grouped.get("invoiceLayout") else None
    data: dict[str, object] = {
        **grouped,
        "audit": audit,
        "invoiceLayout": invoice_layout,
        "user": {"name": current_user.full_name, "role": current_user.role},
    }
    return {"ok": True, "data": data}


@router.post("")
async def app_data_action(
    request: Request,
    action: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    payload = await request.json()
    if action == "save":
        collection = str(payload.get("collection", "app_actions"))
        record = payload.get("record", {})
        if not isinstance(record, dict):
            record = {"value": record}
        saved = save_app_record(db, current_user, collection, record)
        sync_domain_model(db, current_user, collection, record)
        db.commit()
        return {"ok": True, "saved": True, "id": saved.id}

    if action == "delete":
        collection = str(payload.get("collection", "app_actions"))
        record = payload.get("record", {})
        if not isinstance(record, dict):
            record = {"value": record}
        key = record_key(collection, record)
        deleted = False
        if key:
            existing = (
                db.query(AppDataRecord)
                .filter(
                    AppDataRecord.company_id == current_user.company_id,
                    AppDataRecord.collection == collection,
                    AppDataRecord.record_key == key,
                )
                .first()
            )
            if existing:
                db.delete(existing)
                deleted = True
        log_action(db, current_user, collection, "record_deleted" if deleted else "delete_not_found", record)
        db.commit()
        return {"ok": True, "deleted": deleted, "key": key}

    if action == "invoice-layout":
        record = dict(payload)
        saved = save_app_record(db, current_user, "invoiceLayout", record)
        log_action(db, current_user, "settings", "invoice_layout_saved", record)
        db.commit()
        return {"ok": True, "layout": record, "id": saved.id}

    if action == "documents.extract":
        file = payload.get("file", {})
        invoices: list[dict[str, Any]] = []
        log_action(db, current_user, "documents", "document_extraction_requested", {"file": file.get("name"), "result": "no_demo_data"})
        db.commit()
        return {"ok": True, "invoices": invoices}

    if action == "invoices.import":
        file = payload.get("file", {})
        invoices: list[dict[str, Any]] = []
        log_action(db, current_user, "salesInvoices", "invoice_import_requested", {"file": file.get("name"), "result": "no_demo_data"})
        db.commit()
        return {"ok": True, "invoices": invoices}

    return {"ok": True, "action": action}


def save_app_record(db: Session, current_user: User, collection: str, record: dict[str, Any]) -> AppDataRecord:
    key = record_key(collection, record)
    existing = None
    if key:
        existing = (
            db.query(AppDataRecord)
            .filter(
                AppDataRecord.company_id == current_user.company_id,
                AppDataRecord.collection == collection,
                AppDataRecord.record_key == key,
            )
            .first()
        )
    payload = json.dumps(record, ensure_ascii=False, default=str)
    if existing:
        existing.payload = payload
        saved = existing
    else:
        saved = AppDataRecord(
            company_id=current_user.company_id,
            collection=collection,
            record_key=key,
            payload=payload,
        )
        db.add(saved)
    log_action(db, current_user, collection, "record_saved", record)
    return saved


def sync_domain_model(db: Session, current_user: User, collection: str, record: dict[str, Any]) -> None:
    if collection == "products":
        code = str(record.get("code") or record.get("sku") or "").strip()
        name = str(record.get("name") or "").strip()
        if code and name:
            mapping = (
                db.query(StockProductMapping)
                .filter(StockProductMapping.company_id == current_user.company_id, StockProductMapping.sku == code)
                .first()
            )
            if not mapping:
                mapping = StockProductMapping(company_id=current_user.company_id, sku=code, name=name)
                db.add(mapping)
            mapping.name = name
            if not mapping.taxflow_name:
                mapping.taxflow_name = name
            supplier_name = str(record.get("supplier_name") or record.get("supplier") or "").strip()
            if supplier_name:
                mapping.supplier_name = supplier_name
            mapping.tax_code = "ZERO" if "0" in str(record.get("vat", "")) and "5" not in str(record.get("vat", "")) else "VAT5"

    elif collection == "accounts":
        code = str(record.get("code") or "").strip()
        name = str(record.get("name") or "").strip()
        if code and name:
            account = (
                db.query(Account)
                .filter(Account.company_id == current_user.company_id, Account.code == code)
                .first()
            )
            if not account:
                account = Account(company_id=current_user.company_id, code=code, name=name, type=str(record.get("type") or "asset").lower())
                db.add(account)
            account.name = name
            account.type = str(record.get("type") or account.type).lower()

    elif collection == "salesInvoices":
        sync_sales_invoice(db, current_user, record)

    elif collection == "bills":
        sync_source_transaction(
            db,
            current_user,
            module="purchase_bill",
            reference=str(record.get("bill_no") or "BILL"),
            party_name=str(record.get("vendor") or ""),
            subtotal=decimal_value(record.get("subtotal")),
            vat=decimal_value(record.get("vat")),
            total=decimal_value(record.get("total")),
            status=str(record.get("status") or "draft"),
        )

    elif collection == "purchaseRecords":
        sync_source_transaction(
            db,
            current_user,
            module="purchase",
            reference=str(record.get("ref") or record.get("invoice_no") or "PURCHASE"),
            party_name=str(record.get("supplier") or ""),
            subtotal=decimal_value(record.get("net_amount") or record.get("subtotal")),
            vat=decimal_value(record.get("tax_amount") or record.get("vat_amount")),
            total=decimal_value(record.get("total")),
            status=str(record.get("status") or "draft"),
        )

    elif collection == "payments":
        amount = decimal_value(record.get("amount"))
        sync_source_transaction(
            db,
            current_user,
            module="payment",
            reference=str(record.get("ref") or "PAYMENT"),
            party_name=str(record.get("contact") or ""),
            subtotal=amount,
            vat=Decimal("0"),
            total=amount,
            status="posted",
        )

    elif collection == "audit":
        log_action(db, current_user, str(record.get("record") or "audit"), str(record.get("action") or "ui_action"), record)


def sync_sales_invoice(db: Session, current_user: User, record: dict[str, Any]) -> None:
    number = str(record.get("invoice_no") or record.get("invoice_number") or "").strip()
    customer = str(record.get("customer") or record.get("customer_name") or "Customer").strip()
    if not number:
        return
    invoice = (
        db.query(Invoice)
        .filter(Invoice.company_id == current_user.company_id, Invoice.invoice_number == number)
        .first()
    )
    if not invoice:
        invoice = Invoice(company_id=current_user.company_id, invoice_number=number, customer_name=customer)
        db.add(invoice)
    invoice.customer_name = customer
    invoice.subtotal = decimal_value(record.get("subtotal"))
    invoice.vat = decimal_value(record.get("vat_amount") or record.get("vat"))
    invoice.total = decimal_value(record.get("total"))
    invoice.status = "issued" if str(record.get("status", "")).lower() in {"ready", "pending"} else str(record.get("status") or "draft").lower()
    if not invoice.lines:
        invoice.lines = [
            InvoiceLine(
                description=f"Imported invoice {number}",
                quantity=Decimal("1"),
                unit_price=invoice.subtotal,
                vat_rate=Decimal("5"),
            )
        ]
    else:
        invoice.lines[0].unit_price = invoice.subtotal


def sync_source_transaction(
    db: Session,
    current_user: User,
    module: str,
    reference: str,
    party_name: str,
    subtotal: Decimal,
    vat: Decimal,
    total: Decimal,
    status: str,
) -> None:
    existing = (
        db.query(SourceTransaction)
        .filter(
            SourceTransaction.company_id == current_user.company_id,
            SourceTransaction.module == module,
            SourceTransaction.reference == reference,
        )
        .first()
    )
    tx = existing or SourceTransaction(company_id=current_user.company_id, module=module, reference=reference)
    tx.party_name = party_name
    tx.subtotal = subtotal
    tx.vat = vat
    tx.total = total
    tx.status = status.lower().replace(" ", "_")
    if not existing:
        db.add(tx)


def log_action(db: Session, current_user: User, module: str, action: str, detail: Any) -> None:
    db.add(
        AuditLog(
            company_id=current_user.company_id,
            user_id=current_user.id,
            module=str(module)[:60],
            action=str(action)[:80],
            detail=json.dumps(detail, ensure_ascii=False, default=str)[:1000],
        )
    )


def clean_base(name: str) -> str:
    stem = name.rsplit(".", 1)[0]
    cleaned = "".join(ch if ch.isalnum() else "-" for ch in stem).strip("-").upper()
    return (cleaned or "TAXFLOW")[:18]
