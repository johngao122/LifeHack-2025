from sqlmodel import Field, SQLModel
from sqlalchemy import Column
from sqlalchemy.dialects.mysql import JSON, MEDIUMTEXT
from typing import List, Optional


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