import requests
from typing import Dict, Any, List
from app.core.exceptions import ExternalAPIError
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class OpenFoodFactsAPI:
    
    def __init__(self):
        self.api_url = settings.openfoodfacts_api_url
        self.user_agent = settings.user_agent
        self.default_page_size = settings.default_page_size
    
    def search_product(self, product_name: str) -> List[Dict[str, Any]]:
        try:
            product_name_encoded = requests.utils.quote(product_name)
            url = f"{self.api_url}?search_terms={product_name_encoded}&search_simple=1&json=1"
            
            response = requests.get(
                url, 
                headers={"User-Agent": self.user_agent}
            )
            response.raise_for_status()
            
            data = response.json()
            products = data.get("products", [])
            
            logger.info(f"OpenFoodFacts returned {len(products)} products for '{product_name}'")
            return products
            
        except requests.RequestException as e:
            logger.error(f"OpenFoodFacts API request failed: {e}")
            raise ExternalAPIError(f"Failed to fetch product data: {str(e)}")
    
    def search_by_category(self, category: str, page_size: int = None) -> List[Dict[str, Any]]:
        try:
            formatted_category = category.lower().replace(" ", "-").replace("_", "-")
            
            
            category_mappings = {
                "ice-creams-and-sorbets": "ice-creams",
                "ice-cream-tubs": "ice-creams", 
                "frozen-foods": "frozen-products",
                "frozen-desserts": "frozen-desserts",
            }
            
            final_category = category_mappings.get(formatted_category, formatted_category)
            
            params = {
                "action": "process",
                "json": "1",
                "tagtype_0": "categories",
                "tag_contains_0": "contains", 
                "tag_0": final_category,
                "page_size": page_size,
                "fields": "product_name,ecoscore_score,ecoscore_grade",
            }
            
            headers = {"User-Agent": self.user_agent}
            
            logger.info(f"Searching category: '{category}' -> '{final_category}'")
            
            response = requests.get(self.api_url, params=params, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            products = data.get("products", [])
            
            logger.info(f"Found {len(products)} products for category '{final_category}'")
            return products
            
        except requests.RequestException as e:
            logger.error(f"Category search failed for '{category}': {e}")
            raise ExternalAPIError(f"Failed to fetch category data: {str(e)}")