import os
from typing import List, Optional
from pydantic import BaseModel, validator


class Settings(BaseModel):
    
    database_url: str = os.getenv("DATABASE_URL")
    
    
    host: str = os.getenv("HOST")
    port: int = os.getenv("PORT")
    
    
    openfoodfacts_api_url: str = os.getenv("OPENFOODFACTS_API_URL")
    user_agent: str = os.getenv("USER_AGENT")
    default_page_size: int = os.getenv("DEFAULT_PAGE_SIZE")
    
    
    cors_origins: str = os.getenv("CORS_ORIGINS")
    
    
    app_name: str = "EcoLens API"
    debug: bool = os.getenv("DEBUG")
    
    @validator("cors_origins")
    def parse_cors_origins(cls, v: str) -> List[str]:
        if v == "*":
            return ["*"]
        return [origin.strip() for origin in v.split(",") if origin.strip()]
    
    @validator("database_url")
    def validate_database_url(cls, v: str) -> str:
        if not v:
            raise ValueError("DATABASE_URL cannot be empty")
        if not v.startswith(("mysql+pymysql://", "mysql://", "sqlite:///")):
            raise ValueError("DATABASE_URL must be a valid database connection string")
        return v
    
    @validator("port")
    def validate_port(cls, v: int) -> int:
        if not (1 <= v <= 65535):
            raise ValueError("PORT must be between 1 and 65535")
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
        fields = {
            "database_url": {"env": "DATABASE_URL"},
            "host": {"env": "HOST"},
            "port": {"env": "PORT"},
            "openfoodfacts_api_url": {"env": "OPENFOODFACTS_API_URL"},
            "user_agent": {"env": "USER_AGENT"},
            "default_page_size": {"env": "DEFAULT_PAGE_SIZE"},
            "cors_origins": {"env": "CORS_ORIGINS"},
            "debug": {"env": "DEBUG"},
        }



settings = Settings()