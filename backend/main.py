import os
import requests
import uvicorn
import json

from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, Query, BackgroundTasks
from sqlmodel import Field, Session, SQLModel, create_engine, select
from sqlalchemy import Column
from sqlalchemy.dialects.mysql import JSON, MEDIUMTEXT
from pydantic import BaseModel

from recommendation import aggregate_and_rank_products


class ProductRequest(BaseModel):
    product_name: str


class RecommendationsRequest(BaseModel):
    categories: list[str] = Query(
        default=["plant-based-foods-and-beverages",
                 "plant-based-foods",
                 "cereals-and-potatoes"],
        description="List of categories to fetch products from",
    )


class Product(SQLModel, table=True):
    __table_args__ = {'extend_existing': True}
    id: str | None = Field(default=None, primary_key=True)
    cache_key: str | None = Field(default=None)
    name: str = Field(index=True)
    environmental_score_data: str | None = Field(
        default=None, sa_column=Column(MEDIUMTEXT))
    categories: list[str] = Field(default=[], sa_column=Column(JSON))
    labels: str | None = Field(default=None)


DATABASE_URL = os.getenv(
    "DATABASE_URL", "mysql+pymysql://ecolens:password@localhost:3333/ecolens")

engine = create_engine(DATABASE_URL)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI()


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


def save_products_to_db(products: list[Product]):
    with Session(engine) as session:
        for p in products:
            p.environmental_score_data = json.dumps(p.environmental_score_data)
            session.add(p)
        session.commit()
        for p in products:
            session.refresh(p)


@app.post("/product_info")
# -> list[Product]:
def fetch_product(request: ProductRequest, background_tasks: BackgroundTasks):
    product_name_encoded = requests.utils.quote(request.product_name)

    with Session(engine) as session:
        statement = select(Product).where(
            Product.cache_key == product_name_encoded)
        products = session.exec(statement).all()
        if products:
            print(f"Cache hit for {request.product_name}")
            for p in products:
                p.environmental_score_data = json.loads(
                    p.environmental_score_data)
            return products

    url = f"https://world.openfoodfacts.net/cgi/search.pl?search_terms={product_name_encoded}&search_simple=1&json=1"
    response = requests.get(url, headers={
                            "User-Agent": "EcoLens/1.0 (ecolens@example.com)"})
    if response.status_code != 200:
        raise HTTPException(status_code=404, detail="Product not found")
    data = response.json()
    products = []

    for product in data['products']:
        if not product.get("ecoscore_data"):
            continue

        environmental_score_data = {
            "adjusted_score": product["ecoscore_data"].get("score"),
            "overall_grade": product["ecoscore_data"].get("grade"),
            "packaging_score": product["ecoscore_data"]
            .get("adjustments", {}).get("packaging", {}).get("score"),
            "material_scores": {
                material["material"]: {
                    "packaging_id": material.get("material"),
                    "environmental_score_material_score": material.get("environmental_score_material_score"),
                    "environmental_score_shape_ratio": material.get("environmental_score_shape_ratio"),
                    "shape_id": material.get("shape")
                }
                for material in product["ecoscore_data"]
                .get("adjustments", {}).get("packaging", {}).get("packagings", [])
            },
            "agribalyse": {
                "co2_total": product["ecoscore_data"].get("agribalyse", {}).get("co2_total"),
                "co2_agriculture": product["ecoscore_data"].get("agribalyse", {}).get("co2_agriculture"),
                "co2_consumption": product["ecoscore_data"].get("agribalyse", {}).get("co2_consumption"),
                "co2_distribution": product["ecoscore_data"].get("agribalyse", {}).get("co2_distribution"),
                "co2_packaging": product["ecoscore_data"].get("agribalyse", {}).get("co2_packaging"),
                "co2_processing": product["ecoscore_data"].get("agribalyse", {}).get("co2_processing"),
                "co2_transportation": product["ecoscore_data"].get("agribalyse", {}).get("co2_transportation")
            }
        }

        p = Product(
            id=product.get("_id"),
            cache_key=product_name_encoded,
            name=product.get("product_name", "Unknown"),
            environmental_score_data=environmental_score_data,
            categories=[
                i for i in product.get("categories_hierarchy", [])
                if i.startswith("en:")
            ],
            labels=product.get("labels")
        )
        products.append(p)

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
            status_code=404, detail="No products found for this category")
    return products


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000,
                reload=True, log_level="info")
