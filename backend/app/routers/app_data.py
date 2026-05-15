import base64
import csv
import html
import io
import json
import re
import zipfile
from decimal import Decimal, InvalidOperation
from typing import Any
from xml.etree import ElementTree

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
    SourceTransactionLine,
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
        sync_domain_model(db, current_user, collection, serialize(saved))
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
            sync_domain_delete(db, current_user, collection, record)
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
        invoices = ingest_purchase_document(db, current_user, file)
        log_action(
            db,
            current_user,
            "documents",
            "document_extraction_requested",
            {"file": file.get("name"), "invoices": len(invoices)},
        )
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
            lines=record.get("lines"),
            tax_type=str(record.get("tax_type") or ""),
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


def sync_domain_delete(db: Session, current_user: User, collection: str, record: dict[str, Any]) -> None:
    if collection == "products":
        code = str(record.get("code") or record.get("sku") or record.get("id") or "").strip()
        if code:
            mapping = (
                db.query(StockProductMapping)
                .filter(StockProductMapping.company_id == current_user.company_id, StockProductMapping.sku == code)
                .first()
            )
            if mapping:
                db.delete(mapping)

    elif collection == "salesInvoices":
        number = str(record.get("invoice_no") or record.get("invoice_number") or record.get("id") or "").strip()
        if number:
            invoice = (
                db.query(Invoice)
                .filter(Invoice.company_id == current_user.company_id, Invoice.invoice_number == number)
                .first()
            )
            if invoice:
                db.delete(invoice)

    elif collection in {"purchaseRecords", "bills", "payments"}:
        module = {"purchaseRecords": "purchase", "bills": "purchase_bill", "payments": "payment"}[collection]
        reference = str(
            record.get("ref")
            or record.get("invoice_no")
            or record.get("bill_no")
            or record.get("reference")
            or record.get("id")
            or ""
        ).strip()
        if reference:
            tx = (
                db.query(SourceTransaction)
                .filter(
                    SourceTransaction.company_id == current_user.company_id,
                    SourceTransaction.module == module,
                    SourceTransaction.reference == reference,
                )
                .first()
            )
            if tx:
                db.query(SourceTransactionLine).filter(SourceTransactionLine.source_id == tx.id).delete(synchronize_session=False)
                db.delete(tx)


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
    lines: list[dict[str, Any]] | None = None,
    tax_type: str = "",
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
    if not existing:
        db.add(tx)
        db.flush()
    tx.party_name = party_name
    tx.subtotal = subtotal
    tx.vat = vat
    tx.total = total
    tx.status = status.lower().replace(" ", "_")
    lines = lines if isinstance(lines, list) else None
    if lines is not None:
        vat_rate = Decimal("5") if "5%" in tax_type and "exempt" not in tax_type.lower() else Decimal("0")
        db.query(SourceTransactionLine).filter(SourceTransactionLine.source_id == tx.id).delete(synchronize_session=False)
        db.flush()
        for line in lines:
            description = str(line.get("product") or line.get("description") or "").strip()
            if not description:
                continue
            amount = decimal_value(line.get("line_total"))
            db.add(SourceTransactionLine(
                source_id=tx.id,
                description=str(line.get("product") or line.get("description") or "Purchase item")[:255],
                account_code=str(line.get("account_code") or "4000"),
                quantity=decimal_value(line.get("quantity") or line.get("qty") or 1),
                unit_price=decimal_value(line.get("unit_cost_before_tax") or line.get("unit_cost") or line.get("cost")),
                vat_rate=vat_rate,
                amount=amount,
                vat_amount=amount * (vat_rate / Decimal("100")),
            ))


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


def ingest_purchase_document(db: Session, current_user: User, file: dict[str, Any]) -> list[dict[str, Any]]:
    name = str(file.get("name") or "purchase-upload").strip()
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    content = decode_uploaded_file(file)
    if not content:
        return [purchase_extraction_error(name, "Uploaded file content was empty")]

    try:
        if ext == "csv":
            rows = parse_csv_rows(content)
        elif ext in {"xlsx", "xlsm"}:
            rows = parse_xlsx_rows(content)
        elif ext == "xls":
            rows = parse_excel_html_rows(content)
        elif ext in {"pdf", "jpg", "jpeg", "png"}:
            return [
                purchase_extraction_error(
                    name,
                    "OCR is not configured. Upload CSV/XLSX now, or configure OCR for PDF and image extraction.",
                )
            ]
        else:
            return [purchase_extraction_error(name, f"Unsupported purchase upload format: .{ext or 'unknown'}")]
    except Exception as exc:
        return [purchase_extraction_error(name, f"Could not parse file: {exc}")]

    invoices = build_purchase_invoices_from_rows(db, current_user, rows, name)
    if not invoices:
        hints = purchase_excel_debug_hint(content, ext)
        return [purchase_extraction_error(name, "No purchase invoice rows were found in the uploaded file" + hints)]
    return invoices


def decode_uploaded_file(file: dict[str, Any]) -> bytes:
    raw = str(file.get("base64") or "")
    if "," in raw:
        raw = raw.split(",", 1)[1]
    try:
        return base64.b64decode(raw)
    except Exception:
        return b""


def parse_csv_rows(content: bytes) -> list[dict[str, Any]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return [normalize_purchase_row(row) for row in reader]


def parse_xlsx_rows(content: bytes) -> list[dict[str, Any]]:
    with zipfile.ZipFile(io.BytesIO(content)) as workbook:
        shared_strings = read_xlsx_shared_strings(workbook)
        sheet_xml_list = [workbook.read(sheet_name) for sheet_name in xlsx_sheet_names(workbook)]
    rows: list[dict[str, Any]] = []
    for sheet_xml in sheet_xml_list:
        rows.extend(parse_xlsx_sheet_rows(sheet_xml, shared_strings))
    return rows


def parse_xlsx_sheet_rows(sheet_xml: bytes, shared_strings: list[str]) -> list[dict[str, Any]]:
    root = ElementTree.fromstring(sheet_xml)
    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    table_rows: list[list[str]] = []
    for row in root.findall(".//x:sheetData/x:row", ns):
        cells: list[str] = []
        expected_index = 0
        for cell in row.findall("x:c", ns):
            ref = str(cell.attrib.get("r") or "")
            cell_index = xlsx_column_index("".join(ch for ch in ref if ch.isalpha()))
            while expected_index < cell_index:
                cells.append("")
                expected_index += 1
            cells.append(read_xlsx_cell(cell, shared_strings, ns))
            expected_index += 1
        if any(value.strip() for value in cells):
            table_rows.append(cells)
    if not table_rows:
        return []
    header_index = detect_purchase_header_row(table_rows)
    if header_index < 0:
        return []
    headers = [normalize_header(value) for value in table_rows[header_index]]
    rows = []
    for raw in table_rows[header_index + 1:]:
        row = {headers[i]: raw[i] if i < len(raw) else "" for i in range(len(headers)) if headers[i]}
        normalized = normalize_purchase_row(row)
        if any(str(value or "").strip() for value in normalized.values()):
            rows.append(normalized)
    return rows


def detect_purchase_header_row(table_rows: list[list[str]]) -> int:
    best_index = -1
    best_score = 0
    for index, row in enumerate(table_rows[:25]):
        headers = {normalize_header(value) for value in row if str(value or "").strip()}
        score = 0
        if purchase_alias_hit(headers, "product"):
            score += 3
        if purchase_alias_hit(headers, "quantity"):
            score += 2
        if purchase_alias_hit(headers, "unit_cost") or purchase_alias_hit(headers, "line_total"):
            score += 2
        if purchase_alias_hit(headers, "invoice_no"):
            score += 1
        if purchase_alias_hit(headers, "supplier"):
            score += 1
        if purchase_alias_hit(headers, "unit"):
            score += 1
        if score > best_score:
            best_score = score
            best_index = index
    return best_index if best_score >= 4 else -1


def purchase_alias_hit(headers: set[str], field: str) -> bool:
    return any(alias in headers for alias in PURCHASE_FIELD_ALIASES[field])


def read_xlsx_shared_strings(workbook: zipfile.ZipFile) -> list[str]:
    try:
        root = ElementTree.fromstring(workbook.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    strings = []
    for item in root.findall("x:si", ns):
        strings.append("".join(node.text or "" for node in item.findall(".//x:t", ns)))
    return strings


def xlsx_sheet_names(workbook: zipfile.ZipFile) -> list[str]:
    names = sorted(
        name
        for name in workbook.namelist()
        if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
    )
    if not names:
        raise ValueError("workbook has no worksheets")
    return names


def xlsx_column_index(column: str) -> int:
    index = 0
    for char in column.upper():
        index = index * 26 + (ord(char) - ord("A") + 1)
    return max(index - 1, 0)


def read_xlsx_cell(cell: ElementTree.Element, shared_strings: list[str], ns: dict[str, str]) -> str:
    cell_type = cell.attrib.get("t")
    value_node = cell.find("x:v", ns)
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//x:t", ns)).strip()
    value = value_node.text if value_node is not None else ""
    if cell_type == "s":
        try:
            return shared_strings[int(value)].strip()
        except (ValueError, IndexError):
            return ""
    return str(value or "").strip()


def parse_excel_html_rows(content: bytes) -> list[dict[str, Any]]:
    text = content.decode("utf-8-sig", errors="ignore")
    if "<table" not in text.lower():
        return []
    table_rows: list[list[str]] = []
    for row_html in re.findall(r"<tr\b[^>]*>(.*?)</tr>", text, flags=re.IGNORECASE | re.DOTALL):
        cells = []
        for cell_html in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", row_html, flags=re.IGNORECASE | re.DOTALL):
            cleaned = re.sub(r"<[^>]+>", " ", cell_html)
            cleaned = html.unescape(re.sub(r"\s+", " ", cleaned)).strip()
            cells.append(cleaned)
        if any(cells):
            table_rows.append(cells)
    header_index = detect_purchase_header_row(table_rows)
    if header_index < 0:
        return []
    headers = [normalize_header(value) for value in table_rows[header_index]]
    rows = []
    for raw in table_rows[header_index + 1:]:
        row = {headers[i]: raw[i] if i < len(raw) else "" for i in range(len(headers)) if headers[i]}
        normalized = normalize_purchase_row(row)
        if any(str(value or "").strip() for value in normalized.values()):
            rows.append(normalized)
    return rows


def purchase_excel_debug_hint(content: bytes, ext: str) -> str:
    try:
        if ext in {"xlsx", "xlsm"}:
            with zipfile.ZipFile(io.BytesIO(content)) as workbook:
                shared_strings = read_xlsx_shared_strings(workbook)
                previews: list[str] = []
                for sheet_name in xlsx_sheet_names(workbook)[:3]:
                    root = ElementTree.fromstring(workbook.read(sheet_name))
                    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
                    for row in root.findall(".//x:sheetData/x:row", ns)[:12]:
                        cells = [read_xlsx_cell(cell, shared_strings, ns) for cell in row.findall("x:c", ns)]
                        text = ", ".join(cell for cell in cells if cell.strip())
                        if text:
                            previews.append(text[:180])
                        if len(previews) >= 3:
                            break
                    if previews:
                        break
                return f". First rows detected: {' | '.join(previews)}" if previews else ""
        if ext == "xls":
            text = content.decode("utf-8-sig", errors="ignore")
            first_row = re.search(r"<tr\b[^>]*>(.*?)</tr>", text, flags=re.IGNORECASE | re.DOTALL)
            if first_row:
                cells = [
                    html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", cell))).strip()
                    for cell in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", first_row.group(1), flags=re.IGNORECASE | re.DOTALL)
                ]
                cells = [cell for cell in cells if cell]
                return f". First row detected: {', '.join(cells[:8])}" if cells else ""
    except Exception:
        return ""
    return ""


PURCHASE_FIELD_ALIASES = {
    "invoice_no": (
        "invoice_no",
        "invoice_number",
        "invoice",
        "bill_no",
        "bill_number",
        "ref",
        "reference",
        "reference_no",
        "purchase_no",
        "purchase_number",
        "voucher_no",
    ),
    "date": ("date", "invoice_date", "bill_date", "purchase_date", "voucher_date", "entry_date"),
    "supplier": ("supplier", "vendor", "vendor_name", "supplier_name", "party", "party_name"),
    "address": ("address", "supplier_address", "vendor_address", "billing_address", "bill_to_address"),
    "pay_term": ("pay_term", "payment_term", "payment_terms", "terms", "credit_terms"),
    "supplier_trn": ("supplier_trn", "vendor_trn", "trn", "tax_registration_number", "vat_no", "vat_number"),
    "category": ("category", "item_category", "product_category", "group", "item_group", "class", "brand"),
    "sku": ("sku", "item_code", "product_code", "code", "barcode", "stock_code", "item_no", "product_no"),
    "product": (
        "product",
        "item",
        "item_name",
        "product_name",
        "product_description",
        "description",
        "particulars",
        "item_description",
        "description_of_goods",
        "goods_description",
        "goods",
        "material",
        "name",
    ),
    "unit": ("unit", "uom", "unit_of_measure", "measure", "u_m", "units", "unit_name"),
    "quantity": ("quantity", "qty", "qnty", "pcs", "nos", "no", "qty_in", "qty_invoiced"),
    "unit_cost": (
        "unit_cost",
        "cost",
        "price",
        "rate",
        "purchase_price",
        "cost_price",
        "unit_price",
        "basic_rate",
        "u_price",
        "u_rate",
        "mrp",
    ),
    "discount": ("discount", "discount_amount", "disc", "disc_amount"),
    "discount_type": ("discount_type", "purchase_discount_type"),
    "discount_value": ("discount_value", "purchase_discount", "overall_discount", "bill_discount"),
    "profit_margin": ("profit_margin", "margin", "profit_margin_percent", "profit_margin_pct"),
    "selling_price_inc_tax": ("selling_price_inc_tax", "selling_price", "sale_price", "unit_selling_price_inc_tax"),
    "vat_amount": ("vat_amount", "tax_amount", "vat", "tax", "gst", "igst", "cgst", "sgst", "vat_5", "vat_5_percent"),
    "tax_type": ("tax_type", "purchase_tax", "vat_type"),
    "shipping_details": ("shipping_details", "shipping_detail", "delivery_details", "transport_details"),
    "shipping": ("shipping", "shipping_charges", "freight", "freight_charges", "delivery_charges"),
    "paid": ("paid", "paid_amount", "amount_paid", "payment_amount"),
    "paid_on": ("paid_on", "payment_date", "paid_date"),
    "payment_method": ("payment_method", "pay_method", "mode_of_payment"),
    "payment_account": ("payment_account", "paid_from", "bank_account"),
    "payment_note": ("payment_note", "payment_notes", "payment_reference"),
    "notes": ("notes", "remarks", "narration", "comments"),
    "line_total": (
        "line_total",
        "amount",
        "total",
        "net_amount",
        "taxable_amount",
        "taxable_value",
        "gross_amount",
        "gross_value",
        "net_value",
        "value",
    ),
}


def normalize_purchase_row(row: dict[str, Any]) -> dict[str, Any]:
    normalized = {normalize_header(key): value for key, value in row.items()}
    mapped = {field: first_present(normalized, names) for field, names in PURCHASE_FIELD_ALIASES.items()}
    mapped["raw"] = {normalize_header(key): value for key, value in row.items() if str(value or "").strip()}
    return mapped


def normalize_header(value: Any) -> str:
    return "".join(ch.lower() if ch.isalnum() else "_" for ch in str(value or "").strip()).strip("_")


def first_present(row: dict[str, Any], names: tuple[str, ...]) -> Any:
    for name in names:
        value = row.get(name)
        if value not in (None, ""):
            return value
    for key, value in row.items():
        if value in (None, ""):
            continue
        if any(name in key for name in names if len(name) >= 4):
            return value
    return ""


def build_purchase_invoices_from_rows(
    db: Session,
    current_user: User,
    rows: list[dict[str, Any]],
    filename: str,
) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for index, row in enumerate(rows, start=1):
        product = str(row.get("product") or row.get("sku") or row.get("category") or "").strip()
        if not product:
            continue
        invoice_no = str(row.get("invoice_no") or clean_base(filename)).strip()
        category = str(row.get("category") or "Uncategorized").strip()
        unit = str(row.get("unit") or "PCS").strip().upper()
        sku = str(row.get("sku") or product_code(product, index)).strip().upper()
        supplier = str(row.get("supplier") or "Supplier").strip()
        quantity = decimal_value(row.get("quantity") or 1)
        unit_cost = decimal_value(row.get("unit_cost"))
        discount_percent = decimal_value(row.get("discount"))
        unit_cost_before_tax = unit_cost * (Decimal("1") - (discount_percent / Decimal("100")))
        line_total = decimal_value(row.get("line_total")) or (quantity * unit_cost_before_tax)
        vat = decimal_value(row.get("vat_amount"))
        upsert_purchase_master_data(db, current_user, category, unit, sku, product, supplier, unit_cost)

        invoice = grouped.setdefault(
            invoice_no,
            {
                "invoice_no": invoice_no,
                "date": excel_date_value(row.get("date")),
                "supplier": supplier,
                "address": str(row.get("address") or ""),
                "pay_term": str(row.get("pay_term") or ""),
                "supplier_trn": str(row.get("supplier_trn") or ""),
                "subtotal": Decimal("0"),
                "vat_amount": Decimal("0"),
                "total": Decimal("0"),
                "discount_type": str(row.get("discount_type") or "None"),
                "discount_value": decimal_value(row.get("discount_value")),
                "tax_type": str(row.get("tax_type") or ("VAT 5%" if vat else "None")),
                "shipping_details": str(row.get("shipping_details") or ""),
                "shipping": decimal_value(row.get("shipping")),
                "paid": decimal_value(row.get("paid")),
                "paid_on": excel_date_value(row.get("paid_on")),
                "payment_method": str(row.get("payment_method") or "Cash"),
                "payment_account": str(row.get("payment_account") or "None"),
                "payment_note": str(row.get("payment_note") or ""),
                "notes": str(row.get("notes") or ""),
                "confidence": 92,
                "status": "Valid",
                "issues": "",
                "lines": [],
            },
        )
        invoice["subtotal"] += line_total
        invoice["vat_amount"] += vat
        invoice["lines"].append(
            {
                "sku": sku,
                "category": category,
                "product": product,
                "unit": unit,
                "quantity": float(quantity),
                "unit_cost": float(unit_cost),
                "discount_percent": float(discount_percent),
                "unit_cost_before_tax": float(unit_cost_before_tax),
                "line_total": float(line_total),
                "profit_margin": float(decimal_value(row.get("profit_margin"))),
                "selling_price_inc_tax": float(decimal_value(row.get("selling_price_inc_tax"))),
                "raw": row.get("raw") or {},
            }
        )
    invoices = []
    for invoice in grouped.values():
        discount_type = str(invoice.get("discount_type") or "None")
        discount_value = decimal_value(invoice.get("discount_value"))
        discount = invoice["subtotal"] * (discount_value / Decimal("100")) if discount_type == "Percentage" else discount_value if discount_type == "Fixed" else Decimal("0")
        taxable = max(Decimal("0"), invoice["subtotal"] - discount)
        if not invoice["vat_amount"] and "5%" in str(invoice.get("tax_type") or "") and "exempt" not in str(invoice.get("tax_type") or "").lower():
            invoice["vat_amount"] = taxable * Decimal("0.05")
        invoice["total"] = taxable + invoice["vat_amount"] + decimal_value(invoice.get("shipping"))
        invoice["due"] = max(Decimal("0"), invoice["total"] - decimal_value(invoice.get("paid")))
        invoices.append(json.loads(json.dumps(invoice, default=float)))
    return invoices


def excel_date_value(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    try:
        serial = int(float(raw))
        if 20000 <= serial <= 80000:
            from datetime import date, timedelta

            return (date(1899, 12, 30) + timedelta(days=serial)).isoformat()
    except (TypeError, ValueError):
        pass
    return raw


def upsert_purchase_master_data(
    db: Session,
    current_user: User,
    category: str,
    unit: str,
    sku: str,
    product: str,
    supplier: str,
    cost: Decimal,
) -> None:
    save_app_record(db, current_user, "salesCategories", {"name": category, "type": "Purchase", "status": "Active"})
    save_app_record(db, current_user, "salesUnits", {"code": unit, "name": unit, "status": "Active"})
    product_record = {
        "code": sku,
        "name": product,
        "category": category,
        "unit": unit,
        "cost": float(cost),
        "vat": "Standard 5%",
        "supplier_name": supplier,
        "status": "Active",
    }
    saved = save_app_record(db, current_user, "products", product_record)
    sync_domain_model(db, current_user, "products", serialize(saved))


def product_code(product: str, index: int) -> str:
    base = "".join(ch for ch in product.upper() if ch.isalnum())[:12] or "ITEM"
    return f"{base}-{index:03d}"


def purchase_extraction_error(filename: str, issue: str) -> dict[str, Any]:
    ref = f"{clean_base(filename)}-REVIEW"
    return {
        "invoice_no": ref,
        "date": "",
        "supplier": "",
        "supplier_trn": "",
        "subtotal": 0,
        "vat_amount": 0,
        "total": 0,
        "confidence": 0,
        "status": "Error",
        "issues": issue,
        "lines": [],
    }


def clean_base(name: str) -> str:
    stem = name.rsplit(".", 1)[0]
    cleaned = "".join(ch if ch.isalnum() else "-" for ch in stem).strip("-").upper()
    return (cleaned or "TAXFLOW")[:18]
