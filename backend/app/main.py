"""
EcoLens Backend API

A FastAPI-based REST API that provides food sustainability analysis
and environmental impact scoring for food products.
"""

import os
import pymysql
import uvicorn
from fastapi import FastAPI

pymysql.install_as_MySQLdb()

from app.config import settings, validate_configuration
from app.database import create_db_and_tables
from app.core import setup_cors, setup_security_headers
from app.core.exceptions import setup_exception_handlers
from app.utils import setup_logging
from app.api.routes import products, recommendations, analysis

setup_logging(level="DEBUG" if settings.debug else "INFO")

app = FastAPI(
    title=settings.app_name,
    description="A REST API for food product sustainability analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

setup_cors(app)
setup_security_headers(app)

setup_exception_handlers(app)

app.include_router(products.router, tags=["products"])
app.include_router(recommendations.router, tags=["recommendations"])  
app.include_router(analysis.router, tags=["analysis"])

@app.on_event("startup")
async def startup_event():
    try:
        validate_configuration()
        
        create_db_and_tables()
        print(f"{settings.app_name} started successfully")
        print(f"Database: Connected")
        print(f"Server: http://{settings.host}:{settings.port}")
        print(f"Docs: http://{settings.host}:{settings.port}/docs")
        
        
        if settings.openai_api_key:
            print(f"AI Analysis: Enabled")
        else:
            print(f"AI Analysis: Disabled (OPENAI_API_KEY not configured)")
            
    except Exception as e:
        print(f"Startup failed: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    
    print(f"{settings.app_name} shutting down...")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info"
    )