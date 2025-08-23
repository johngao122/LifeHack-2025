from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ProductRequest(BaseModel):
    product_name: str


class RecommendationsRequest(BaseModel):
    categories: List[str] = [
        "plant-based-foods-and-beverages",
        "plant-based-foods", 
        "cereals-and-potatoes",
    ]


class ScreenshotAnalysisRequest(BaseModel):
    screenshot_data: str
    page_url: str


class ProductFound(BaseModel):
    name: str
    confidence: float
    brand: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[str] = None


class URLAnalysisStructured(BaseModel):
    patterns_found: List[str]
    confidence: float
    reasoning: str


class VisualAnalysis(BaseModel):
    elements_found: List[str]
    layout_type: str
    confidence: float
    reasoning: str


class MergedDecision(BaseModel):
    final_confidence: float
    page_classification: str
    reasoning: str


class ScreenshotAnalysisResult(BaseModel):
    products_found: List[ProductFound]
    page_type: str
    is_food_related: bool
    url_analysis_structured: Optional[URLAnalysisStructured] = None
    visual_analysis: Optional[VisualAnalysis] = None
    merged_decision: Optional[MergedDecision] = None
    raw_response: Optional[str] = None
    error: Optional[str] = None


class ScreenshotAnalysisResponse(BaseModel):
    success: bool
    analysis: ScreenshotAnalysisResult
    timestamp: str


# Error Response Models
class ErrorDetail(BaseModel):
    """Model for error detail information."""
    validation_errors: Optional[List[dict]] = None
    internal: Optional[bool] = None
    

class ErrorResponse(BaseModel):
    """Standardized error response model."""
    error: str
    message: str
    details: ErrorDetail = ErrorDetail()
    type: str