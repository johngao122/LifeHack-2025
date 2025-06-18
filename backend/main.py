import os
import requests
import uvicorn
import json
import pymysql


pymysql.install_as_MySQLdb()

from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Field, Session, SQLModel, create_engine, select
from sqlalchemy import Column
from sqlalchemy.dialects.mysql import JSON, MEDIUMTEXT
from pydantic import BaseModel

from recommendation import aggregate_and_rank_products
from processing import transform_single_product, select_best_product


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


DATABASE_URL = os.getenv(
    "DATABASE_URL", "mysql+pymysql://ecolens:password@localhost:3333/ecolens"
)
PORT = int(os.getenv("PORT", 8000))


if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

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
    allow_origins=["*"],
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

    url = f"https://world.openfoodfacts.net/cgi/search.pl?search_terms={product_name_encoded}&search_simple=1&json=1"
    response = requests.get(
        url, headers={"User-Agent": "EcoLens/1.0 (ecolens@example.com)"}
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


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True, log_level="info")
