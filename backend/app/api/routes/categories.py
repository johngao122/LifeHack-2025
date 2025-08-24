
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, or_, func
from app.api.dependencies import SessionDep
from app.models.database import FoodCategory
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.get("/search")
async def search_categories(
    session: SessionDep,
    q: str = Query(...),
    limit: int = Query(10, le=100)
) -> List[Dict[str, Any]]:
    
    try:
        if not q or not q.strip():
            raise HTTPException(status_code=400, detail="Search query cannot be empty")
        
        query_term = q.strip().lower()
        logger.info(f"Searching categories for: '{query_term}'")
        
        
        statement = select(FoodCategory).where(
            or_(
                FoodCategory.name.ilike(f"%{query_term}%"),
                FoodCategory.id.ilike(f"%{query_term}%")
            )
        ).limit(limit)
        
        results = session.exec(statement).all()
        
        
        categories = []
        for category in results:
            
            name_lower = category.name.lower()
            id_lower = category.id.lower()
            
            
            if query_term == name_lower or query_term == id_lower:
                score = 0.0  
            elif name_lower.startswith(query_term) or id_lower.startswith(query_term):
                score = 0.2  
            elif query_term in name_lower or query_term in id_lower:
                score = 0.5  
            else:
                score = 0.8  
            
            categories.append({
                "term": category.name,
                "score": score,
                "id": category.id,
                "products_count": category.products_count,
                "url": category.url,
                "wikidata_url": category.wikidata_url,
                "known": category.known
            })
        
        
        categories.sort(key=lambda x: x["score"])
        
        logger.info(f"Found {len(categories)} categories for query '{query_term}'")
        return categories
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching categories: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during search")


@router.get("/")
async def get_categories(
    session: SessionDep,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    
    try:
        logger.info(f"Getting categories with limit={limit}, offset={offset}")
        
        
        count_statement = select(func.count(FoodCategory.id))
        total_count = session.exec(count_statement).one()
        
        
        statement = select(FoodCategory).offset(offset).limit(limit)
        categories = session.exec(statement).all()
        
        result = {
            "categories": [
                {
                    "id": cat.id,
                    "name": cat.name,
                    "products_count": cat.products_count,
                    "url": cat.url,
                    "wikidata_url": cat.wikidata_url,
                    "known": cat.known
                }
                for cat in categories
            ],
            "total_count": total_count,
            "returned_count": len(categories),
            "limit": limit,
            "offset": offset
        }
        
        logger.info(f"Returned {len(categories)} categories out of {total_count} total")
        return result
        
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving categories")


@router.get("/{category_id}")
async def get_category(
    category_id: str,
    session: SessionDep
) -> Dict[str, Any]:
    
    try:
        logger.info(f"Getting category with ID: {category_id}")
        
        category = session.get(FoodCategory, category_id)
        if not category:
            raise HTTPException(status_code=404, detail=f"Category '{category_id}' not found")
        
        return {
            "id": category.id,
            "name": category.name,
            "products_count": category.products_count,
            "url": category.url,
            "wikidata_url": category.wikidata_url,
            "known": category.known
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting category {category_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving category")