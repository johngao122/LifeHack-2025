from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, ForeignKey, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.dialects.mysql import JSON, MEDIUMTEXT
from typing import List, Optional
from datetime import datetime


class Product(SQLModel, table=True):
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default=None, primary_key=True)
    cache_key: Optional[str] = Field(default=None)
    name: str = Field()
    environmental_score_data: Optional[str] = Field(
        default=None, sa_column=Column(MEDIUMTEXT)
    )
    categories: List[str] = Field(default=[], sa_column=Column(JSON))
    labels: Optional[str] = Field(default=None)


class FoodCategory(SQLModel, table=True):
    __tablename__ = "food_categories"
    __table_args__ = {"extend_existing": True}

    id: str = Field(primary_key=True)
    name: str = Field()
    products_count: int = Field(default=0)
    url: Optional[str] = Field(default=None)
    wikidata_url: Optional[str] = Field(default=None)
    known: int = Field(default=0)


class FoundationFood(SQLModel, table=True):
    __tablename__ = "foundation_foods"
    __table_args__ = {"extend_existing": True}

    fdc_id: int = Field(primary_key=True)
    description: str = Field()
    data_type: str = Field()
    food_class: Optional[str] = Field(default=None)
    publication_date: Optional[str] = Field(default=None)
    food_category_description: Optional[str] = Field(default=None)
    ndb_number: Optional[int] = Field(default=None)
    is_historical_reference: bool = Field(default=False)
    
    # Relationships
    food_nutrients: List["FoodNutrient"] = Relationship(back_populates="foundation_food")
    food_portions: List["FoodPortion"] = Relationship(back_populates="foundation_food")
    input_foods: List["InputFood"] = Relationship(back_populates="foundation_food")


class FoodNutrient(SQLModel, table=True):
    __tablename__ = "food_nutrients"
    __table_args__ = {"extend_existing": True}

    id: int = Field(primary_key=True)
    fdc_id: int = Field(foreign_key="foundation_foods.fdc_id")
    nutrient_id: int = Field()
    nutrient_number: Optional[str] = Field(default=None)
    nutrient_name: str = Field()
    nutrient_rank: Optional[int] = Field(default=None)
    unit_name: str = Field()
    derivation_code: Optional[str] = Field(default=None)
    derivation_description: Optional[str] = Field(default=None)
    derivation_source_id: Optional[int] = Field(default=None)
    derivation_source_code: Optional[str] = Field(default=None)
    derivation_source_description: Optional[str] = Field(default=None)
    data_points: Optional[int] = Field(default=None)
    amount: Optional[float] = Field(default=None)
    median: Optional[float] = Field(default=None)
    min_value: Optional[float] = Field(default=None, sa_column=Column("min_value", Float))
    max_value: Optional[float] = Field(default=None, sa_column=Column("max_value", Float))

    # Relationship
    foundation_food: Optional[FoundationFood] = Relationship(back_populates="food_nutrients")


class FoodPortion(SQLModel, table=True):
    __tablename__ = "food_portions"
    __table_args__ = {"extend_existing": True}

    id: int = Field(primary_key=True)
    fdc_id: int = Field(foreign_key="foundation_foods.fdc_id")
    measure_unit_id: Optional[int] = Field(default=None)
    measure_unit_name: Optional[str] = Field(default=None)
    measure_unit_abbreviation: Optional[str] = Field(default=None)
    modifier: Optional[str] = Field(default=None)
    gram_weight: Optional[float] = Field(default=None)
    sequence_number: Optional[int] = Field(default=None)
    amount: Optional[float] = Field(default=None)
    value: Optional[float] = Field(default=None)
    min_year_acquired: Optional[int] = Field(default=None)

    # Relationship
    foundation_food: Optional[FoundationFood] = Relationship(back_populates="food_portions")


class InputFood(SQLModel, table=True):
    __tablename__ = "input_foods"
    __table_args__ = {"extend_existing": True}

    id: int = Field(primary_key=True)
    fdc_id: int = Field(foreign_key="foundation_foods.fdc_id")
    input_fdc_id: Optional[int] = Field(default=None)
    food_description: str = Field()
    input_food_description: Optional[str] = Field(default=None)
    input_food_data_type: Optional[str] = Field(default=None)
    input_food_class: Optional[str] = Field(default=None)
    input_food_category_id: Optional[int] = Field(default=None)
    input_food_category_code: Optional[str] = Field(default=None)
    input_food_category_description: Optional[str] = Field(default=None)
    input_food_publication_date: Optional[str] = Field(default=None)

    # Relationship
    foundation_food: Optional[FoundationFood] = Relationship(back_populates="input_foods")