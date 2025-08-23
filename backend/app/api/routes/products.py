from fastapi import APIRouter, BackgroundTasks
from app.models.schemas import ProductRequest
from app.api.dependencies import SessionDep
from app.services.product_service import ProductService

router = APIRouter()
product_service = ProductService()


@router.post("/product_info")
def fetch_product(
    request: ProductRequest, 
    background_tasks: BackgroundTasks,
    session: SessionDep
):
    """
    Analyze a specific food product by name.
    
    Args:
        request: Product request containing product name
        background_tasks: FastAPI background tasks
        session: Database session
        
    Returns:
        Product analysis data including environmental scores
        
    Raises:
        ProductNotFoundError: If no suitable product is found
        ProcessingError: If product processing fails
        DatabaseError: If database operations fail
        ExternalAPIError: If external API calls fail
    """
    result = product_service.analyze_product(
        request.product_name, 
        session, 
        background_tasks
    )
    return result


@router.get("/")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "message": "EcoLens API is running"}