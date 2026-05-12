from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import InventoryValuationLayer, ItemUnit, ItemUnitConversion, StockAdjustmentApproval, StockProductMapping, User, Warehouse
from app.schemas import (
    InventoryValuationLayerOut,
    ItemUnitConversionIn,
    ItemUnitConversionOut,
    ItemUnitIn,
    ItemUnitOut,
    StockAdjustmentApprovalIn,
    StockAdjustmentApprovalOut,
    StockMappingIn,
    StockMappingOut,
    WarehouseIn,
    WarehouseOut,
)


router = APIRouter(tags=["inventory"])


@router.get("/warehouses", response_model=list[WarehouseOut])
def list_warehouses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[Warehouse]:
    return db.query(Warehouse).filter(Warehouse.company_id == current_user.company_id).order_by(Warehouse.name).all()


@router.post("/warehouses", response_model=WarehouseOut, status_code=201)
def create_warehouse(
    payload: WarehouseIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Warehouse:
    warehouse = Warehouse(company_id=current_user.company_id, **payload.model_dump())
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.get("/inventory/mappings", response_model=list[StockMappingOut])
def list_mappings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[StockProductMapping]:
    return (
        db.query(StockProductMapping)
        .filter(StockProductMapping.company_id == current_user.company_id)
        .order_by(StockProductMapping.sku)
        .all()
    )


@router.post("/inventory/mappings", response_model=StockMappingOut, status_code=201)
def create_mapping(
    payload: StockMappingIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StockProductMapping:
    mapping = (
        db.query(StockProductMapping)
        .filter(StockProductMapping.company_id == current_user.company_id, StockProductMapping.sku == payload.sku)
        .first()
    )
    if mapping:
        for field, value in payload.model_dump().items():
            setattr(mapping, field, value)
    else:
        mapping = StockProductMapping(company_id=current_user.company_id, **payload.model_dump())
        db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


@router.put("/inventory/mappings/{mapping_id}", response_model=StockMappingOut)
def update_mapping(
    mapping_id: str,
    payload: StockMappingIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StockProductMapping:
    mapping = (
        db.query(StockProductMapping)
        .filter(StockProductMapping.company_id == current_user.company_id, StockProductMapping.id == mapping_id)
        .first()
    )
    if not mapping:
        raise HTTPException(status_code=404, detail="Stock mapping not found")
    for field, value in payload.model_dump().items():
        setattr(mapping, field, value)
    db.commit()
    db.refresh(mapping)
    return mapping


@router.delete("/inventory/mappings/{mapping_id}", status_code=204)
def delete_mapping(
    mapping_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    mapping = (
        db.query(StockProductMapping)
        .filter(StockProductMapping.company_id == current_user.company_id, StockProductMapping.id == mapping_id)
        .first()
    )
    if not mapping:
        raise HTTPException(status_code=404, detail="Stock mapping not found")
    db.delete(mapping)
    db.commit()


@router.get("/item-units", response_model=list[ItemUnitOut])
def list_item_units(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[ItemUnit]:
    return db.query(ItemUnit).filter(ItemUnit.company_id == current_user.company_id).order_by(ItemUnit.item_code, ItemUnit.unit_code).all()


@router.post("/item-units", response_model=ItemUnitOut, status_code=201)
def create_item_unit(
    payload: ItemUnitIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ItemUnit:
    unit = (
        db.query(ItemUnit)
        .filter(
            ItemUnit.company_id == current_user.company_id,
            ItemUnit.item_code == payload.item_code,
            ItemUnit.unit_code == payload.unit_code,
        )
        .first()
    )
    if unit:
        unit.unit_name = payload.unit_name
        unit.conversion_factor = payload.conversion_factor
        unit.is_base_unit = payload.is_base_unit
        unit.purchase_default = payload.purchase_default
        unit.sales_default = payload.sales_default
        unit.status = payload.status
    else:
        unit = ItemUnit(company_id=current_user.company_id, **payload.model_dump())
        db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/item-unit-conversions", response_model=list[ItemUnitConversionOut])
def list_item_unit_conversions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ItemUnitConversion]:
    return (
        db.query(ItemUnitConversion)
        .filter(ItemUnitConversion.company_id == current_user.company_id)
        .order_by(ItemUnitConversion.item_code, ItemUnitConversion.from_unit_code, ItemUnitConversion.to_unit_code)
        .all()
    )


@router.post("/item-unit-conversions", response_model=ItemUnitConversionOut, status_code=201)
def create_item_unit_conversion(
    payload: ItemUnitConversionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ItemUnitConversion:
    conversion = (
        db.query(ItemUnitConversion)
        .filter(
            ItemUnitConversion.company_id == current_user.company_id,
            ItemUnitConversion.item_code == payload.item_code,
            ItemUnitConversion.from_unit_code == payload.from_unit_code,
            ItemUnitConversion.to_unit_code == payload.to_unit_code,
        )
        .first()
    )
    if conversion:
        conversion.conversion_factor = payload.conversion_factor
        conversion.status = payload.status
    else:
        conversion = ItemUnitConversion(company_id=current_user.company_id, **payload.model_dump())
        db.add(conversion)
    db.commit()
    db.refresh(conversion)
    return conversion


@router.get("/inventory/valuation-layers", response_model=list[InventoryValuationLayerOut])
def list_valuation_layers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[InventoryValuationLayer]:
    return (
        db.query(InventoryValuationLayer)
        .filter(InventoryValuationLayer.company_id == current_user.company_id)
        .order_by(InventoryValuationLayer.created_at.desc())
        .all()
    )


@router.get("/inventory/adjustment-approvals", response_model=list[StockAdjustmentApprovalOut])
def list_adjustment_approvals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[StockAdjustmentApproval]:
    return (
        db.query(StockAdjustmentApproval)
        .filter(StockAdjustmentApproval.company_id == current_user.company_id)
        .order_by(StockAdjustmentApproval.created_at.desc())
        .all()
    )


@router.post("/inventory/adjustment-approvals", response_model=StockAdjustmentApprovalOut, status_code=201)
def create_adjustment_approval(
    payload: StockAdjustmentApprovalIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StockAdjustmentApproval:
    approval = StockAdjustmentApproval(company_id=current_user.company_id, requested_by=current_user.id, **payload.model_dump())
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return approval
