import os
import asyncio
import requests
import uvicorn
import json
import pymysql
import base64
import re
from datetime import datetime


pymysql.install_as_MySQLdb()

from typing import Annotated, Optional, List
from fastapi import Depends, FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Field, Session, SQLModel, create_engine, select
from sqlalchemy import Column
from sqlalchemy.dialects.mysql import JSON, MEDIUMTEXT
from pydantic import BaseModel
from openai import OpenAI

from recommendation import aggregate_and_rank_products
from processing import transform_single_product, select_best_product


DATABASE_URL = os.getenv(
    "DATABASE_URL"
)
PORT = int(os.getenv("PORT"))
HOST = os.getenv("HOST")
OPENFOODFACTS_API_URL = os.getenv("OPENFOODFACTS_API_URL")
USER_AGENT = os.getenv("USER_AGENT")
CORS_ORIGINS = os.getenv("CORS_ORIGINS").split(",")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


class ProductRequest(BaseModel):
    product_name: str


class RecommendationsRequest(BaseModel):
    categories: list[str] = Query(
        default=[
            "plant-based-foods-and-beverages",
            "plant-based-foods",
            "cereals-and-potatoes",
        ],
        description="List of categories to fetch products from",
    )


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


class Product(SQLModel, table=True):
    __table_args__ = {"extend_existing": True}
    id: str | None = Field(default=None, primary_key=True)
    cache_key: str | None = Field(default=None)
    name: str = Field
    environmental_score_data: str | None = Field(
        default=None, sa_column=Column(MEDIUMTEXT)
    )
    categories: list[str] = Field(default=[], sa_column=Column(JSON))
    labels: str | None = Field(default=None)





engine = create_engine(DATABASE_URL)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "healthy", "message": "EcoLens API is running"}


@app.on_event("startup")
def on_startup():
    try:
        create_db_and_tables()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Warning: Could not create database tables: {e}")


def save_products_to_db(products: list[Product]):
    with Session(engine) as session:
        for p in products:
            p.environmental_score_data = json.dumps(p.environmental_score_data)

            existing_product = session.get(Product, p.id)
            if existing_product:

                existing_product.cache_key = p.cache_key
                existing_product.name = p.name
                existing_product.environmental_score_data = p.environmental_score_data
                existing_product.categories = p.categories
                existing_product.labels = p.labels
            else:

                session.add(p)
        session.commit()


async def analyze_screenshot_with_ai(screenshot_data: str, page_url: str) -> ScreenshotAnalysisResult:
    """Use GPT-4o to analyze both the screenshot and URL to determine products and page type."""
    
    if not client:
        return ScreenshotAnalysisResult(
            products_found=[],
            page_type="unknown",
            is_food_related=False,
            error="OpenAI API key not configured"
        )
    
    try:
        # Create the prompt for GPT-4o
        prompt = f"""
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

        # Make the API call to GPT-4o
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-4o",
            messages=[
                {
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
                }
            ],
            # Instruct the model to return strict JSON so we can parse reliably
            response_format={"type": "json_object"},
            max_tokens=2000,
            temperature=0.1,
            timeout=45.0,
        )

        # Parse the response
        ai_response = response.choices[0].message.content or ""

        # Best-effort: strip code fences and extract the first JSON object
        def extract_json(text: str) -> dict:
            t = text.strip()
            # remove surrounding ```json ... ``` blocks if present
            if t.startswith("```"):
                t = re.sub(r"^```(?:json)?\\s*|\\s*```$", "", t, flags=re.IGNORECASE)
            # find first JSON object
            m = re.search(r"\{[\s\S]*\}", t)
            if m:
                return json.loads(m.group(0))
            return json.loads(t)

        try:
            result_data = extract_json(ai_response)
            
            # Extract data and create models
            url_analysis = URLAnalysisStructured(**result_data.get("url_analysis", {}))
            visual_analysis = VisualAnalysis(**result_data.get("visual_analysis", {}))
            merged_decision = MergedDecision(**result_data.get("merged_decision", {}))
            
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
    
    except Exception as e:
        return ScreenshotAnalysisResult(
            products_found=[],
            page_type="unknown", 
            is_food_related=False,
            error=f"AI analysis failed: {str(e)}"
        )


@app.post("/product_info")
def fetch_product(request: ProductRequest, background_tasks: BackgroundTasks):
    product_name_encoded = requests.utils.quote(request.product_name)

    with Session(engine) as session:
        statement = select(Product).where(Product.cache_key == product_name_encoded)
        products = session.exec(statement).all()
        if products:
            print(f"Cache hit for {request.product_name}")
            for p in products:
                p.environmental_score_data = json.loads(p.environmental_score_data)
            return products

    url = f"{OPENFOODFACTS_API_URL}?search_terms={product_name_encoded}&search_simple=1&json=1"
    response = requests.get(
        url, headers={"User-Agent": USER_AGENT}
    )
    if response.status_code != 200:
        raise HTTPException(status_code=404, detail="Product not found")
    data = response.json()
    raw_products = data.get("products", [])

    if not raw_products:
        raise HTTPException(status_code=404, detail="No products found")

    best_product = select_best_product(raw_products)
    if not best_product:
        raise HTTPException(status_code=404, detail="No suitable products found")

    transformed_product = transform_single_product(best_product)
    if not transformed_product:
        raise HTTPException(status_code=500, detail="Failed to process product data")

    p = Product(
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
    products = [p]

    background_tasks.add_task(save_products_to_db, products)

    return [p.model_dump() for p in products]


@app.post("/recommendations")
def get_recommendations(
    request: RecommendationsRequest,
):
    categories = request.categories

    products = aggregate_and_rank_products(categories, top_n=3)
    if not products:
        raise HTTPException(
            status_code=404, detail="No products found for this category"
        )
    return products


@app.post("/analyze_screenshot")
async def analyze_screenshot(request: ScreenshotAnalysisRequest) -> ScreenshotAnalysisResponse:
    """Analyze a screenshot to detect food products and determine page type."""
    try:
        # Validate base64 data
        try:
            base64.b64decode(request.screenshot_data)
        except Exception:
            raise HTTPException(
                status_code=400, 
                detail="Invalid base64 screenshot data"
            )
        
        # Analyze the screenshot and URL using AI
        analysis_result = await analyze_screenshot_with_ai(
            request.screenshot_data, 
            request.page_url
        )
        
        # Create response with timestamp; success only if no analysis error
        response = ScreenshotAnalysisResponse(
            success=analysis_result.error is None,
            analysis=analysis_result,
            timestamp=datetime.now().isoformat()
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Screenshot analysis error: {str(e)}")
        # Return error response
        error_analysis = ScreenshotAnalysisResult(
            products_found=[],
            page_type="unknown",
            is_food_related=False,
            error=f"Internal server error: {str(e)}"
        )
        
        return ScreenshotAnalysisResponse(
            success=False,
            analysis=error_analysis,
            timestamp=datetime.now().isoformat()
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True, log_level="info")
