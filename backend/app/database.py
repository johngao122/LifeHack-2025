from sqlmodel import create_engine, SQLModel, Session
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from app.config import settings
from app.core.exceptions import DatabaseError
import logging

logger = logging.getLogger(__name__)

engine = create_engine(settings.database_url)


def create_db_and_tables():
    try:
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables created successfully")
    except OperationalError as e:
        logger.error(f"Database connection failed: {e}")
        raise DatabaseError(
            "Failed to connect to database",
            {"connection_error": str(e), "database_url": settings.database_url}
        )
    except SQLAlchemyError as e:
        logger.error(f"Database schema creation failed: {e}")
        raise DatabaseError(
            "Failed to create database tables",
            {"schema_error": str(e)}
        )
    except Exception as e:
        logger.error(f"Unexpected database error: {e}")
        raise DatabaseError(
            "Unexpected database initialization error",
            {"error": str(e)}
        )


def get_session():
    try:
        with Session(engine) as session:
            yield session
    except SQLAlchemyError as e:
        logger.error(f"Database session error: {e}")
        raise DatabaseError(
            "Database session failed",
            {"session_error": str(e)}
        )