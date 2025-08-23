from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings and configuration."""

    # Database Configuration
    database_url: str

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000

    # External API Configuration
    openfoodfacts_api_url: str = "https://world.openfoodfacts.net/cgi/search.pl"
    user_agent: str = "EcoLens/1.0 (ecolens@example.com)"
    default_page_size: int = 20

    # OpenAI Configuration
    openai_api_key: Optional[str] = None

    # CORS Configuration
    cors_origins: str = "*"

    # Application Configuration
    app_name: str = "EcoLens API"
    debug: bool = False

    # Pydantic Settings config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins")
    @classmethod
    def parse_cors_origins(cls, value: str) -> List[str]:
        """Parse CORS origins from env into a list."""
        if not value:
            return ["*"]
        if value.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        """Validate database URL format."""
        if not value:
            raise ValueError("DATABASE_URL cannot be empty")
        if not value.startswith(("mysql+pymysql://", "mysql://", "sqlite:///")):
            raise ValueError("DATABASE_URL must be a valid database connection string")
        return value

    @field_validator("port")
    @classmethod
    def validate_port(cls, value: int) -> int:
        """Validate port number is in valid range."""
        if not (1 <= value <= 65535):
            raise ValueError("PORT must be between 1 and 65535")
        return value

    @field_validator("default_page_size")
    @classmethod
    def validate_page_size(cls, value: int) -> int:
        """Validate default page size is reasonable."""
        if not (1 <= value <= 100):
            raise ValueError("DEFAULT_PAGE_SIZE must be between 1 and 100")
        return value


# Create global settings instance
def get_settings() -> Settings:
    """Get application settings instance."""
    return Settings()


def validate_configuration() -> None:
    """Validate critical configuration at startup."""
    try:
        settings = get_settings()
        
        # Check critical settings
        if not settings.database_url:
            raise ValueError("DATABASE_URL is required")
            
        # Validate OpenAI API key for screenshot analysis
        if not settings.openai_api_key:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                "OPENAI_API_KEY not configured - screenshot analysis will be disabled"
            )
            
        # Test database URL format
        if not settings.database_url.startswith(("mysql+pymysql://", "mysql://", "sqlite:///")):
            raise ValueError("Invalid DATABASE_URL format")
            
    except Exception as e:
        # Import here to avoid circular import
        from app.core.exceptions import ConfigurationError
        raise ConfigurationError(
            f"Configuration validation failed: {str(e)}",
            {"validation_error": str(e)}
        )


settings = get_settings()