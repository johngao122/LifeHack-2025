import json
import logging
from typing import Dict, List, Any, Optional

logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def transform_single_product(product: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Transform a single product from raw format to simplified format.

    Args:
        product: Single product dictionary from raw data

    Returns:
        Transformed product dictionary or None if essential data is missing
    """
    product_id = product.get("code") or product.get("_id")
    product_name = product.get("product_name") or product.get("product_name_en", "")

    logger.debug(f"Processing product: ID={product_id}, Name='{product_name}'")

    if not product_id or not product_name:
        logger.warning(
            f"Missing essential data - ID: {product_id}, Name: '{product_name}'"
        )
        return None

    logger.debug(f"Transforming environmental data for product {product_id}")
    environmental_score_data = transform_environmental_data(product)

    categories_hierarchy = product.get("categories_hierarchy", [])
    categories = transform_categories_hierarchy(categories_hierarchy)
    logger.debug(
        f"Categories processed: {len(categories)} English categories from hierarchy"
    )

    labels_raw = product.get("labels", "")
    labels = transform_labels(labels_raw)
    logger.debug(f"Labels transformed: {len(labels)} labels from '{labels_raw}'")

    result = {
        "id": product_id,
        "name": product_name,
        "environmental_score_data": environmental_score_data,
        "categories": categories,
        "labels": labels,
    }

    logger.info(f"Successfully transformed product '{product_name}' (ID: {product_id})")
    return result


def transform_environmental_data(product: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform ecoscore_data to environmental_score_data format.

    Args:
        product: Product dictionary containing ecoscore_data

    Returns:
        Transformed environmental score data
    """
    ecoscore_data = product.get("ecoscore_data", {})

    if not ecoscore_data:
        logger.warning("No ecoscore_data found in product")
        return {"adjusted_score": 0, "overall_grade": "", "packaging_score": 0}

    adjusted_score = ecoscore_data.get("score", 0)
    overall_grade = ecoscore_data.get("grade", "")
    packaging_score = (
        ecoscore_data.get("adjustments", {}).get("packaging", {}).get("score", 0)
    )

    logger.debug(
        f"Environmental scores - Adjusted: {adjusted_score}, Grade: '{overall_grade}', Packaging: {packaging_score}"
    )

    environmental_data = {
        "adjusted_score": adjusted_score,
        "overall_grade": overall_grade,
        "packaging_score": packaging_score,
    }

    material_scores = transform_material_scores(ecoscore_data)
    if material_scores:
        environmental_data["material_scores"] = material_scores
        logger.debug(f"Added {len(material_scores)} material scores")
    else:
        logger.debug("No material scores found")

    agribalyse_data = ecoscore_data.get("agribalyse", {})
    logger.debug(f"Raw agribalyse_data: {agribalyse_data}")

    if agribalyse_data:
        warning = agribalyse_data.get("warning")
        logger.debug(f"Agribalyse warning in current data: {warning}")

        co2_total = agribalyse_data.get("co2_total")
        has_co2_data = co2_total is not None and co2_total != 0

        logger.debug(f"CO2 total value: {co2_total}, has_co2_data: {has_co2_data}")

        if has_co2_data or not warning:
            co2_values = {
                "co2_total": agribalyse_data.get("co2_total", 0),
                "co2_agriculture": agribalyse_data.get("co2_agriculture", 0),
                "co2_consumption": agribalyse_data.get("co2_consumption", 0),
                "co2_distribution": agribalyse_data.get("co2_distribution", 0),
                "co2_packaging": agribalyse_data.get("co2_packaging", 0),
                "co2_processing": agribalyse_data.get("co2_processing", 0),
                "co2_transportation": agribalyse_data.get("co2_transportation", 0),
            }
            logger.debug(f"Extracted CO2 values: {co2_values}")
            environmental_data["agribalyse"] = co2_values
            logger.debug(f"Successfully added agribalyse data - CO2 total: {co2_total}")
        else:
            logger.debug(f"Skipping agribalyse data due to warning: {warning}")
    else:
        logger.debug("No agribalyse data found")

    return environmental_data


def transform_material_scores(ecoscore_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform packaging data to material scores format.

    Args:
        ecoscore_data: Ecoscore data containing packaging information

    Returns:
        Material scores dictionary
    """
    material_scores = {}

    packaging_data = ecoscore_data.get("adjustments", {}).get("packaging", {})
    packagings = packaging_data.get("packagings", [])

    logger.debug(f"Processing {len(packagings)} packaging items")

    for i, packaging in enumerate(packagings):
        material = packaging.get("material", "")
        shape = packaging.get("shape", "")

        logger.debug(f"Packaging {i+1}: material='{material}', shape='{shape}'")

        if material:
            material_key = material.replace("en:", "").replace("-", "_").upper()

            material_scores[material_key] = {
                "material": material,
                "packaging_id": material,
                "environmental_score_material_score": packaging.get(
                    "environmental_score_material_score", 0
                ),
                "environmental_score_shape_ratio": packaging.get(
                    "environmental_score_shape_ratio", 0
                ),
                "shape": shape if shape else "",
                "shape_id": shape.replace("en:", "") if shape else "",
            }

            logger.debug(f"Added material score for '{material_key}'")

    return material_scores


def transform_labels(labels_str: str) -> List[str]:
    """
    Transform labels string to list format.

    Args:
        labels_str: Comma-separated labels string

    Returns:
        List of cleaned label strings
    """
    if not labels_str or not isinstance(labels_str, str):
        return []

    labels = []
    for label in labels_str.split(","):
        cleaned_label = label.strip()
        if cleaned_label and cleaned_label.startswith("en:"):
            labels.append(cleaned_label[3:].replace("-", " ").title())
        elif cleaned_label:
            labels.append(cleaned_label.replace("-", " ").title())

    return labels


def transform_categories_hierarchy(categories_hierarchy: List[str]) -> List[str]:
    """
    Transform categories hierarchy to clean format.

    Args:
        categories_hierarchy: List of category strings

    Returns:
        List of cleaned English category strings
    """
    if not categories_hierarchy:
        return []

    english_categories = []
    for category in categories_hierarchy:
        if isinstance(category, str) and category.startswith("en:"):
            clean_category = category[3:].replace("-", " ").title()
            english_categories.append(clean_category)

    return english_categories


def select_best_product(products: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Select the best product from a list based on quality score.

    Args:
        products: List of product dictionaries

    Returns:
        Best product dictionary or None if no suitable product found
    """
    if not products:
        logger.warning("No products provided for selection")
        return None

    valid_products = []

    for product in products:
        if not product.get("ecoscore_data"):
            logger.debug(
                f"Skipping product {product.get('product_name', 'Unknown')} - no ecoscore_data"
            )
            continue

        quality_score = calculate_product_quality_score(product)

        if quality_score > 0:
            product_with_score = product.copy()
            product_with_score["_quality_score"] = quality_score
            valid_products.append(product_with_score)
            logger.debug(
                f"Product '{product.get('product_name', 'Unknown')}' quality score: {quality_score}"
            )

    if not valid_products:
        logger.warning("No valid products found after quality filtering")
        return None

    best_product = max(valid_products, key=lambda p: p["_quality_score"])
    logger.info(
        f"Selected best product: '{best_product.get('product_name', 'Unknown')}' with score {best_product['_quality_score']}"
    )

    del best_product["_quality_score"]
    return best_product


def calculate_product_quality_score(product: Dict[str, Any]) -> float:
    """
    Calculate a quality score for product selection.

    Args:
        product: Product dictionary

    Returns:
        Quality score (higher is better)
    """
    score = 0.0

    ecoscore_data = product.get("ecoscore_data", {})
    ecoscore = ecoscore_data.get("score", 0)
    if ecoscore:
        score += float(ecoscore) * 0.6

    if product.get("product_name"):
        score += 10.0

    categories = product.get("categories_hierarchy", [])
    if categories:
        score += min(len(categories) * 2.0, 10.0)

    agribalyse = ecoscore_data.get("agribalyse", {})
    if agribalyse and agribalyse.get("co2_total") is not None:
        score += 5.0

    packaging = ecoscore_data.get("adjustments", {}).get("packaging", {})
    if packaging.get("packagings"):
        score += 5.0

    if not product.get("code") and not product.get("_id"):
        score -= 20.0

    return max(score, 0.0)
