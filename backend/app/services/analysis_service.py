import asyncio
import base64
import json
import re
from datetime import datetime
from openai import OpenAI
from app.models.schemas import (
    ScreenshotAnalysisResult, 
    ScreenshotAnalysisResponse,
    URLAnalysisStructured,
    VisualAnalysis, 
    MergedDecision,
    ProductFound
)
from app.core.exceptions import AnalysisError
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class AnalysisService:
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
    
    async def analyze_screenshot(
        self, 
        screenshot_data: str, 
        page_url: str
    ) -> ScreenshotAnalysisResponse:
        
        try:
            base64.b64decode(screenshot_data)
        except Exception:
            raise AnalysisError("Invalid base64 screenshot data")
        
        analysis_result = await self._analyze_with_ai(screenshot_data, page_url)
        
        response = ScreenshotAnalysisResponse(
            success=analysis_result.error is None,
            analysis=analysis_result,
            timestamp=datetime.now().isoformat()
        )
        
        return response
    
    async def _analyze_with_ai(
        self, 
        screenshot_data: str, 
        page_url: str
    ) -> ScreenshotAnalysisResult:
        if not self.client:
            return ScreenshotAnalysisResult(
                products_found=[],
                page_type="unknown",
                is_food_related=False,
                error="OpenAI API key not configured"
            )
        
        try:
            prompt = self._build_analysis_prompt(page_url)
            
            
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model="gpt-4o",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{screenshot_data}"
                            }
                        }
                    ]
                }],
                response_format={"type": "json_object"},
                max_tokens=2000,
                temperature=0.1,
                timeout=45.0,
            )
            
            
            ai_response = response.choices[0].message.content or ""
            return self._parse_ai_response(ai_response)
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return ScreenshotAnalysisResult(
                products_found=[],
                page_type="unknown",
                is_food_related=False,
                error=f"AI analysis failed: {str(e)}"
            )
    
    def _build_analysis_prompt(self, page_url: str) -> str:
        return f"""
        You are analyzing a screenshot from a webpage along with its URL to determine:
        1. Whether this is a product page, search results page, or other type of page
        2. What food products (if any) are visible in the image
        3. Whether the page is food-related

        URL: {page_url}

        Please analyze both the URL patterns and the visual content in the image, then respond with a JSON object containing:

        {{
            "url_analysis": {{
                "patterns_found": ["list of URL patterns you notice"],
                "confidence": 0.0-1.0,
                "reasoning": "why you classified the URL this way"
            }},
            "visual_analysis": {{
                "elements_found": ["list of visual elements you see"],
                "layout_type": "product_page|search_results|listing|other",
                "confidence": 0.0-1.0,
                "reasoning": "description of what you see in the image"
            }},
            "merged_decision": {{
                "final_confidence": 0.0-1.0,
                "page_classification": "product_page|search_results|listing|other",
                "reasoning": "combined analysis of URL and visual content"
            }},
            "products_found": [
                {{
                    "name": "product name",
                    "confidence": 0.0-1.0,
                    "brand": "brand name if visible",
                    "description": "brief description",
                    "category": "food category if determinable",
                    "price": "price if visible"
                }}
            ],
            "page_type": "the type of page this is",
            "is_food_related": true/false
        }}

        Important guidelines:
        - Only include products with confidence > 0.7
        - Focus on food products only
        - If this appears to be a search results or listing page, return empty products_found array
        - Be conservative - better to miss a product than include a false positive
        - URL patterns like /search, /results, ?search, ?q= typically indicate search pages
        - URL patterns like /product, /item, /p/, /dp/ typically indicate product pages
        """
    
    def _parse_ai_response(self, ai_response: str) -> ScreenshotAnalysisResult:
        try:
            
            result_data = self._extract_json(ai_response)
            
            
            url_analysis = URLAnalysisStructured(
                **result_data.get("url_analysis", {})
            )
            visual_analysis = VisualAnalysis(
                **result_data.get("visual_analysis", {})
            )
            merged_decision = MergedDecision(
                **result_data.get("merged_decision", {})
            )
            
            
            products_found = [
                ProductFound(**product)
                for product in result_data.get("products_found", [])
                if product.get("confidence", 0) > 0.7
            ]
            
            return ScreenshotAnalysisResult(
                products_found=products_found,
                page_type=result_data.get("page_type", "unknown"),
                is_food_related=result_data.get("is_food_related", False),
                url_analysis_structured=url_analysis,
                visual_analysis=visual_analysis,
                merged_decision=merged_decision,
                raw_response=ai_response
            )
            
        except json.JSONDecodeError:
            return ScreenshotAnalysisResult(
                products_found=[],
                page_type="unknown",
                is_food_related=False,
                error=f"Failed to parse AI response: {ai_response[:200]}..."
            )
    
    def _extract_json(self, text: str) -> dict:
        text = text.strip()
        
        
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
        
        
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group(0))
        
        return json.loads(text)