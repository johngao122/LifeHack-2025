import requests
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

USER_AGENT = "EcoLens/1.0 (ecolens@example.com)"
OPENFOODFACTS_API_CGI = "https://world.openfoodfacts.net/cgi/search.pl"


def fetch_products_by_category(
    category: str, page_size: int = 20
) -> List[Dict[str, Any]]:
    """
    Fetch products from OpenFoodFacts API for a specific category.

    Args:
        category: Category string to search for
        page_size: Number of products to fetch per category

    Returns:
        List of product dictionaries with product_name and ecoscore_score
    """
    try:

        formatted_category = category.lower().replace(" ", "-").replace("_", "-")

        category_mappings = {
            "ice-creams-and-sorbets": "ice-creams",
            "ice-cream-tubs": "ice-creams",
            "frozen-foods": "frozen-products",
            "frozen-desserts": "frozen-desserts",
        }

        final_category = category_mappings.get(formatted_category, formatted_category)

        logger.info(f"Searching for category: '{category}' -> '{final_category}'")

        params = {
            "action": "process",
            "json": "1",
            "tagtype_0": "categories",
            "tag_contains_0": "contains",
            "tag_0": final_category,
            "page_size": page_size,
            "fields": "product_name,ecoscore_score,ecoscore_grade",
        }

        headers = {"User-Agent": USER_AGENT}

        logger.info(f"Making request to: {OPENFOODFACTS_API_CGI} with params: {params}")

        response = requests.get(OPENFOODFACTS_API_CGI, params=params, headers=headers)
        response.raise_for_status()

        data = response.json()
        products = data.get("products", [])

        logger.info(
            f"OpenFoodFacts returned {len(products)} products for category '{final_category}'"
        )

        # Debug: Log the first product to see what fields are available
        if products:
            logger.info(f"Sample product fields: {list(products[0].keys())}")
            logger.info(f"Sample product data: {products[0]}")

        valid_products = []
        for i, product in enumerate(products):
            # Try different possible field names
            ecoscore = product.get("ecoscore_score") or product.get(
                "ecoscore_data", {}
            ).get("score")
            name = (
                product.get("product_name")
                or product.get("product_name_en")
                or product.get("generic_name")
                or product.get("generic_name_en")
            )
            ecoscore_grade = product.get("ecoscore_grade") or product.get(
                "ecoscore_data", {}
            ).get("grade")

            logger.debug(
                f"Product {i}: name='{name}', ecoscore={ecoscore}, grade={ecoscore_grade}"
            )

            if name:

                default_score = 50
                if ecoscore_grade:
                    grade_scores = {"a": 80, "b": 65, "c": 50, "d": 35, "e": 20}
                    default_score = grade_scores.get(ecoscore_grade.lower(), 50)

                try:
                    ecoscore_float = (
                        float(ecoscore) if ecoscore is not None else default_score
                    )
                    valid_products.append(
                        {
                            "id": product.get("_id", f"rec_{len(valid_products)}"),
                            "product_name": name,
                            "ecoscore_score": ecoscore_float,
                            "ecoscore_grade": ecoscore_grade if ecoscore_grade else "c",
                        }
                    )
                except (ValueError, TypeError):

                    valid_products.append(
                        {
                            "id": product.get("_id", f"rec_{len(valid_products)}"),
                            "product_name": name,
                            "ecoscore_score": default_score,
                            "ecoscore_grade": ecoscore_grade if ecoscore_grade else "c",
                        }
                    )

        logger.info(
            f"Fetched {len(valid_products)} valid products for category '{category}'"
        )
        return valid_products

    except requests.RequestException as e:
        logger.error(f"API request failed for category '{category}': {e}")
        return []
    except Exception as e:
        logger.error(f"Error processing category '{category}': {e}")
        return []


def aggregate_and_rank_products(
    categories: List[str], top_n: int = 3
) -> List[Dict[str, Any]]:
    """
    Fetch products from multiple categories and return the top N by ecoscore.

    Args:
        categories: List of category strings
        top_n: Number of top products to return

    Returns:
        List of top N products with highest ecoscores
    """
    all_products = []

    for category in categories:
        logger.info(f"Fetching products for category: {category}")
        products = fetch_products_by_category(category)
        all_products.extend(products)

    if not all_products:
        logger.warning("No products found for any category")
        return []

    unique_products = {}
    for product in all_products:
        name = product["product_name"]
        score = product["ecoscore_score"]
        grade = product["ecoscore_grade"]

        if (
            name not in unique_products
            or score > unique_products[name]["ecoscore_score"]
        ):
            unique_products[name] = product

    ranked_products = sorted(
        unique_products.values(), key=lambda x: x["ecoscore_score"], reverse=True
    )[:top_n]

    logger.info(
        f"Returning top {len(ranked_products)} products from {len(unique_products)} unique products"
    )
    return ranked_products
