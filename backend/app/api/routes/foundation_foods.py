from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, or_, func
from app.api.dependencies import SessionDep
from app.models.database import FoundationFood
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.get("/search")
async def search_foundation_foods(
    session: SessionDep,
    q: str = Query(...),
    limit: int = Query(10, le=100)
) -> List[Dict[str, Any]]:
    try:
        if not q or not q.strip():
            raise HTTPException(status_code=400, detail="Search query cannot be empty")
        
        query_term = q.strip().lower()
        logger.info(f"Searching foundation foods for: '{query_term}'")
        
        
        statement = select(FoundationFood).where(
            or_(
                FoundationFood.description.ilike(f"%{query_term}%"),
                FoundationFood.food_category_description.ilike(f"%{query_term}%")
            )
        ).limit(limit)
        
        results = session.exec(statement).all()
        
        
        foods = []
        for food in results:
            desc_lower = food.description.lower()
            
            
            if query_term == desc_lower:
                score = 0.0  
            elif desc_lower.startswith(query_term):
                score = 0.2  
            elif query_term in desc_lower:
                score = 0.5  
            else:
                score = 0.8  
            
            foods.append({
                "description": food.description,
                "originalDescription": food.description,  
                "score": score,
                "fdc_id": food.fdc_id,
                "data_type": food.data_type,
                "food_class": food.food_class,
                "food_category_description": food.food_category_description,
                "publication_date": food.publication_date
            })
        
        
        foods.sort(key=lambda x: x["score"])
        
        logger.info(f"Found {len(foods)} foundation foods for query '{query_term}'")
        return foods
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching foundation foods: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during search")


@router.get("/")
async def get_foundation_foods(
    session: SessionDep,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    data_type: str = Query(None)
) -> Dict[str, Any]:
    
    try:
        logger.info(f"Getting foundation foods with limit={limit}, offset={offset}, data_type={data_type}")
        
        
        base_query = select(FoundationFood)
        count_query = select(func.count(FoundationFood.fdc_id))
        
        
        if data_type:
            base_query = base_query.where(FoundationFood.data_type == data_type)
            count_query = count_query.where(FoundationFood.data_type == data_type)
        
        
        total_count = session.exec(count_query).one()
        
        
        statement = base_query.offset(offset).limit(limit)
        foods = session.exec(statement).all()
        
        result = {
            "foods": [
                {
                    "fdc_id": food.fdc_id,
                    "description": food.description,
                    "data_type": food.data_type,
                    "food_class": food.food_class,
                    "food_category_description": food.food_category_description,
                    "publication_date": food.publication_date,
                    "ndb_number": food.ndb_number,
                    "is_historical_reference": food.is_historical_reference
                }
                for food in foods
            ],
            "total_count": total_count,
            "returned_count": len(foods),
            "limit": limit,
            "offset": offset,
            "data_type_filter": data_type
        }
        
        logger.info(f"Returned {len(foods)} foundation foods out of {total_count} total")
        return result
        
    except Exception as e:
        logger.error(f"Error getting foundation foods: {e}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving foundation foods")


@router.get("/{fdc_id}")
async def get_foundation_food(
    fdc_id: int,
    session: SessionDep
) -> Dict[str, Any]:
    
    try:
        logger.info(f"Getting foundation food with FDC ID: {fdc_id}")
        
        food = session.get(FoundationFood, fdc_id)
        if not food:
            raise HTTPException(status_code=404, detail=f"Foundation food with FDC ID '{fdc_id}' not found")
        
        return {
            "fdc_id": food.fdc_id,
            "description": food.description,
            "data_type": food.data_type,
            "food_class": food.food_class,
            "food_category_description": food.food_category_description,
            "publication_date": food.publication_date,
            "ndb_number": food.ndb_number,
            "is_historical_reference": food.is_historical_reference
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting foundation food {fdc_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving foundation food")


@router.get("/{fdc_id}/nutrients")
async def get_foundation_food_nutrients(
    fdc_id: int,
    session: SessionDep,
    limit: int = Query(100, le=500)
) -> List[Dict[str, Any]]:
    
    try:
        from app.models.database import FoodNutrient
        
        logger.info(f"Getting nutrients for foundation food FDC ID: {fdc_id}")
        
        
        food = session.get(FoundationFood, fdc_id)
        if not food:
            raise HTTPException(status_code=404, detail=f"Foundation food with FDC ID '{fdc_id}' not found")
        
        
        statement = select(FoodNutrient).where(FoodNutrient.fdc_id == fdc_id).limit(limit)
        nutrients = session.exec(statement).all()
        
        result = [
            {
                "id": nutrient.id,
                "nutrient_id": nutrient.nutrient_id,
                "nutrient_name": nutrient.nutrient_name,
                "nutrient_number": nutrient.nutrient_number,
                "unit_name": nutrient.unit_name,
                "amount": nutrient.amount,
                "data_points": nutrient.data_points,
                "derivation_code": nutrient.derivation_code,
                "derivation_description": nutrient.derivation_description
            }
            for nutrient in nutrients
        ]
        
        logger.info(f"Returned {len(result)} nutrients for FDC ID {fdc_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting nutrients for foundation food {fdc_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving nutrients")