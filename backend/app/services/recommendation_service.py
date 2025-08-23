from typing import List, Dict, Any
from app.services.external_api import OpenFoodFactsAPI
import logging

logger = logging.getLogger(__name__)


class RecommendationService:
    def __init__(self):
        self.api_client = OpenFoodFactsAPI()
    
    def get_recommendations(
        self, 
        categories: List[str], 
        top_n: int = 3
    ) -> List[Dict[str, Any]]:
        
        all_products = []
        
        for category in categories:
            logger.info(f"Fetching recommendations for category: {category}")
            try:
                products = self.api_client.search_by_category(category)
                processed_products = self._process_category_products(products)
                all_products.extend(processed_products)
            except Exception as e:
                logger.error(f"Failed to fetch category '{category}': {e}")
                continue
        
        if not all_products:
            logger.warning("No products found for any category")
            return []
        
        unique_products = self._deduplicate_products(all_products)
        
        ranked_products = sorted(
            unique_products.values(), 
            key=lambda x: x["ecoscore_score"], 
            reverse=True
        )[:top_n]
        
        logger.info(
            f"Returning {len(ranked_products)} recommendations from "
            f"{len(unique_products)} unique products"
        )
        return ranked_products
    
    def _process_category_products(
        self, 
        raw_products: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        processed_products = []
        
        for i, product in enumerate(raw_products):
            ecoscore = product.get("ecoscore_score") or product.get(
                "ecoscore_data", {}
            ).get("score")
            
            name = (
                product.get("product_name") or
                product.get("product_name_en") or
                product.get("generic_name") or 
                product.get("generic_name_en")
            )
            
            ecoscore_grade = product.get("ecoscore_grade") or product.get(
                "ecoscore_data", {}
            ).get("grade")
            
            logger.debug(
                f"Processing product {i}: name='{name}', "
                f"ecoscore={ecoscore}, grade={ecoscore_grade}"
            )
            
            if not name:
                continue
            
            default_score = 50
            if ecoscore_grade:
                grade_scores = {"a": 80, "b": 65, "c": 50, "d": 35, "e": 20}
                default_score = grade_scores.get(ecoscore_grade.lower(), 50)
            
            try:
                ecoscore_float = (
                    float(ecoscore) if ecoscore is not None else default_score
                )
            except (ValueError, TypeError):
                ecoscore_float = default_score
            
            processed_products.append({
                "id": product.get("_id", f"rec_{len(processed_products)}"),
                "product_name": name,
                "ecoscore_score": ecoscore_float,
                "ecoscore_grade": ecoscore_grade if ecoscore_grade else "c",
            })
        
        return processed_products
    
    def _deduplicate_products(
        self, 
        products: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        
        unique_products = {}
        
        for product in products:
            name = product["product_name"]
            score = product["ecoscore_score"]
            
            if (
                name not in unique_products or
                score > unique_products[name]["ecoscore_score"]
            ):
                unique_products[name] = product
        
        return unique_products