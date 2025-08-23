import json
import requests
from fastapi import BackgroundTasks
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from app.models.database import Product
from app.services.external_api import OpenFoodFactsAPI
from app.utils.processing import ProductProcessor
from app.core.exceptions import ProductNotFoundError, ProcessingError, DatabaseError, ExternalAPIError
import logging

logger = logging.getLogger(__name__)


class ProductService:
    def __init__(self):
        self.api_client = OpenFoodFactsAPI()
        self.processor = ProductProcessor()
    
    def analyze_product(
        self, 
        product_name: str, 
        session: Session,
        background_tasks: BackgroundTasks
    ) -> List[Dict[str, Any]]:
        product_name_encoded = requests.utils.quote(product_name)
        cached_product = self._get_cached_product(session, product_name_encoded)
        
        if cached_product:
            logger.info(f"Cache hit for '{product_name}'")
            return [cached_product]

        try:
            raw_products = self.api_client.search_product(product_name)
            
            if not raw_products:
                raise ProductNotFoundError("No products found")
            
            
            best_product = self.processor.select_best_product(raw_products)
            if not best_product:
                raise ProductNotFoundError("No suitable products found")
            
            transformed_product = self.processor.transform_single_product(best_product)
            if not transformed_product:
                raise ProcessingError("Failed to process product data")
            
            
            db_product = Product(
                id=transformed_product["id"],
                cache_key=product_name_encoded,
                name=transformed_product["name"],
                environmental_score_data=transformed_product["environmental_score_data"],
                categories=transformed_product["categories"],
                labels=(
                    ", ".join(transformed_product["labels"])
                    if transformed_product["labels"]
                    else None
                ),
            )
            
            
            background_tasks.add_task(self._save_product_to_cache, [db_product])
            
            return [db_product.model_dump()]
            
        except Exception as e:
            logger.error(f"Product analysis failed for '{product_name}': {e}")
            raise
    
    def _get_cached_product(self, session: Session, cache_key: str) -> Optional[Dict[str, Any]]:
        try:
            statement = select(Product).where(Product.cache_key == cache_key)
            products = session.exec(statement).all()
            
            if products:
                product = products[0]
                product_dict = product.model_dump()
                if product_dict.get("environmental_score_data"):
                    product_dict["environmental_score_data"] = json.loads(
                        product_dict["environmental_score_data"]
                    )
                return product_dict
            return None
        except Exception as e:
            logger.error(f"Cache lookup failed: {e}")
            return None
    
    def _save_product_to_cache(self, products: List[Product]) -> None:
        try:
            from app.database import engine
            
            with Session(engine) as session:
                for product in products:
                    if isinstance(product.environmental_score_data, dict):
                        product.environmental_score_data = json.dumps(
                            product.environmental_score_data
                        )
                    
                    existing_product = session.get(Product, product.id)
                    if existing_product:
                        existing_product.cache_key = product.cache_key
                        existing_product.name = product.name
                        existing_product.environmental_score_data = product.environmental_score_data
                        existing_product.categories = product.categories
                        existing_product.labels = product.labels
                    else:
                        session.add(product)
                
                session.commit()
                logger.info(f"Cached {len(products)} products")
                
        except Exception as e:
            logger.error(f"Failed to cache products: {e}")