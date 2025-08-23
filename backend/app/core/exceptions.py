"""Custom exception classes and handlers for the application."""

import logging
from typing import Dict, Any
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class EcoLensException(Exception):
    error_code: str = "ecolens_error"
    status_code: int = 500

    def __init__(self, message: str, details: Dict[str, Any] = None, cause: Exception = None):
        self.message = message
        self.details = dict(details) if details else {}
        if cause is not None:
            
            self.details.setdefault("cause", str(cause))
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "details": self.details,
            "type": self.error_code,
        }


class ProductNotFoundError(EcoLensException):
    error_code: str = "product_not_found"
    status_code: int = 404


class ProcessingError(EcoLensException):
    error_code: str = "processing_error"
    status_code: int = 422


class ExternalAPIError(EcoLensException):
    error_code: str = "external_api_error"
    status_code: int = 502


class AnalysisError(EcoLensException):
    error_code: str = "analysis_error"
    status_code: int = 400


class DatabaseError(EcoLensException):
    error_code: str = "database_error"
    status_code: int = 503


class ConfigurationError(EcoLensException):
    error_code: str = "configuration_error"
    status_code: int = 500


def setup_exception_handlers(app: FastAPI) -> None:
    
    @app.exception_handler(ProductNotFoundError)
    async def product_not_found_handler(request: Request, exc: ProductNotFoundError):
        logger.warning(f"Product not found: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "Product Not Found",
                "message": exc.message,
                "details": exc.details,
                "type": exc.error_code,
            }
        )
    
    @app.exception_handler(ProcessingError)
    async def processing_error_handler(request: Request, exc: ProcessingError):
        logger.error(f"Processing error: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "Processing Error", 
                "message": exc.message,
                "details": exc.details,
                "type": exc.error_code,
            }
        )
    
    @app.exception_handler(ExternalAPIError)
    async def external_api_error_handler(request: Request, exc: ExternalAPIError):
        logger.error(f"External API error: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "External Service Error",
                "message": exc.message,
                "details": exc.details,
                "type": exc.error_code,
            }
        )
    
    @app.exception_handler(AnalysisError)
    async def analysis_error_handler(request: Request, exc: AnalysisError):
        logger.error(f"Analysis error: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "Analysis Error",
                "message": exc.message,
                "details": exc.details,
                "type": exc.error_code,
            }
        )
    
    @app.exception_handler(DatabaseError)
    async def database_error_handler(request: Request, exc: DatabaseError):
        logger.error(f"Database error: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "Database Error",
                "message": "A database error occurred",
                "details": {"internal": True},
                "type": exc.error_code,
            }
        )
    
    @app.exception_handler(ConfigurationError)
    async def configuration_error_handler(request: Request, exc: ConfigurationError):
        logger.critical(f"Configuration error: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "Configuration Error",
                "message": "Server configuration error",
                "details": {"internal": True},
                "type": exc.error_code,
            }
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Validation error: {exc.errors()}")
        return JSONResponse(
            status_code=422,
            content={
                "error": "Validation Error",
                "message": "Request validation failed",
                "details": {"validation_errors": exc.errors()},
                "type": "validation_error"
            }
        )
    
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": f"HTTP {exc.status_code}",
                "message": exc.detail,
                "details": {},
                "type": "http_error"
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": "An unexpected error occurred",
                "details": {"internal": True},
                "type": "internal_error"
            }
        )