from fastapi import APIRouter
from app.models.schemas import ScreenshotAnalysisRequest, ScreenshotAnalysisResponse
from app.services.analysis_service import AnalysisService

router = APIRouter()
analysis_service = AnalysisService()


@router.post("/analyze_screenshot", response_model=ScreenshotAnalysisResponse)
async def analyze_screenshot(request: ScreenshotAnalysisRequest):
    """
    Analyze a screenshot to detect food products and determine page type.
    
    Args:
        request: Screenshot analysis request with image data and URL
        
    Returns:
        Analysis results including detected products and page classification
        
    Raises:
        AnalysisError: If screenshot analysis fails or input is invalid
    """
    response = await analysis_service.analyze_screenshot(
        request.screenshot_data,
        request.page_url
    )
    return response