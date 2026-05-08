from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import StockProductMapping, User, Warehouse
from app.schemas import StockMappingIn, StockMappingOut, WarehouseIn, WarehouseOut


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
    mapping = StockProductMapping(company_id=current_user.company_id, **payload.model_dump())
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping
