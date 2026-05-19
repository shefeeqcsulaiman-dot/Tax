from decimal import Decimal


def test_inventory_unit_conversion_records(client, auth_headers):
    unit_box = client.post(
        "/api/v1/item-units",
        headers=auth_headers,
        json={
            "item_code": "COKE",
            "unit_code": "BOX",
            "unit_name": "Box",
            "conversion_factor": "12",
            "is_base_unit": False,
            "purchase_default": True,
            "sales_default": False,
        },
    )
    unit_pcs = client.post(
        "/api/v1/item-units",
        headers=auth_headers,
        json={
            "item_code": "COKE",
            "unit_code": "PCS",
            "unit_name": "Pieces",
            "conversion_factor": "1",
            "is_base_unit": True,
            "purchase_default": False,
            "sales_default": True,
        },
    )
    conversion = client.post(
        "/api/v1/item-unit-conversions",
        headers=auth_headers,
        json={"item_code": "COKE", "from_unit_code": "BOX", "to_unit_code": "PCS", "conversion_factor": "12"},
    )

    assert unit_box.status_code == 201
    assert unit_pcs.status_code == 201
    assert conversion.status_code == 201
    assert Decimal(conversion.json()["conversion_factor"]) == Decimal("12.0000")


def test_exception_center_accepts_manual_exception(client, auth_headers):
    created = client.post(
        "/api/v1/exceptions",
        headers=auth_headers,
        json={
            "module": "Accounting",
            "category": "Failed posting",
            "severity": "high",
            "source_record": "QA-JOB-001",
            "message": "Posting failed during QA simulation",
        },
    )
    assert created.status_code == 201

    listed = client.get("/api/v1/exceptions", headers=auth_headers)
    assert listed.status_code == 200
    payload = listed.json()
    assert payload["summary"]["high"] >= 1
    assert any(row["source_record"] == "QA-JOB-001" for row in payload["exceptions"])
