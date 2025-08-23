from fastapi import APIRouter
from app.models.schemas import RecommendationsRequest
from app.services.recommendation_service import RecommendationService

router = APIRouter()
recommendation_service = RecommendationService()


@router.post("/recommendations")
def get_recommendations(request: RecommendationsRequest):
    """
    Get sustainable product recommendations by category.
    
    Args:
        request: Request containing categories to search
        
    Returns:
        List of top recommended products with sustainability scores
        
    Raises:
        ProductNotFoundError: If no products are found for any category
        ExternalAPIError: If external API calls fail
        ProcessingError: If recommendation processing fails
    """
    products = recommendation_service.get_recommendations(
        request.categories, 
        top_n=3
    )
    return products