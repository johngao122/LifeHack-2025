
import sys
import os
from pathlib import Path
from typing import List, Dict, Any

sys.path.append(str(Path(__file__).parent.parent))

from sqlmodel import Session, create_engine, SQLModel
from app.models.database import FoodCategory
from app.config import Settings
from scripts.migration_utils import (
    DataValidator, DataTransformer, FileHandler, 
    MigrationError, MigrationTracker, logger
)

class CategoriesMigrator:
    
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        self.validator = DataValidator()
        self.transformer = DataTransformer()
        self.file_handler = FileHandler()
        self.tracker = MigrationTracker()
    
    def create_tables(self):
        try:
            SQLModel.metadata.create_all(self.engine)
            logger.info("Database tables created successfully")
        except Exception as e:
            raise MigrationError(f"Failed to create database tables: {e}")
    
    def load_categories_data(self, file_path: str) -> List[Dict[str, Any]]:
        logger.info(f"Loading categories data from: {file_path}")
        
        try:
            data = self.file_handler.load_json_file(file_path)
            categories = data.get('tags', [])
            logger.info(f"Loaded {len(categories)} categories from file")
            return categories
        except Exception as e:
            raise MigrationError(f"Failed to load categories data: {e}")
    
    def validate_categories_data(self, categories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        logger.info("Validating categories data...")
        
        valid_categories = []
        invalid_count = 0
        
        for category in categories:
            if self.validator.validate_category(category):
                valid_categories.append(category)
            else:
                invalid_count += 1
                self.tracker.add_error(f"Invalid category data: {category}")
        
        logger.info(f"Validation complete: {len(valid_categories)} valid, {invalid_count} invalid")
        return valid_categories
    
    def transform_categories_data(self, categories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        logger.info("Transforming categories data...")
        
        transformed_categories = []
        for category in categories:
            try:
                transformed = self.transformer.transform_category(category)
                transformed_categories.append(transformed)
            except Exception as e:
                self.tracker.add_error(f"Failed to transform category {category.get('id', 'unknown')}: {e}")
        
        logger.info(f"Transformed {len(transformed_categories)} categories")
        return transformed_categories
    
    def insert_categories(self, categories: List[Dict[str, Any]]) -> int:
        logger.info("Inserting categories into database...")
        
        inserted_count = 0
        skipped_count = 0
        
        with Session(self.engine) as session:
            for category_data in categories:
                try:
                    
                    existing = session.get(FoodCategory, category_data['id'])
                    if existing:
                        logger.debug(f"Category {category_data['id']} already exists, skipping")
                        skipped_count += 1
                        continue
                    
                    
                    category = FoodCategory(**category_data)
                    session.add(category)
                    inserted_count += 1
                    
                    
                    if inserted_count % 100 == 0:
                        session.commit()
                        logger.info(f"Committed batch: {inserted_count} categories inserted")
                
                except Exception as e:
                    session.rollback()
                    self.tracker.add_error(f"Failed to insert category {category_data.get('id', 'unknown')}: {e}")
                    continue
            
            
            try:
                session.commit()
                logger.info(f"Final commit: {inserted_count} total categories inserted")
            except Exception as e:
                session.rollback()
                raise MigrationError(f"Failed to commit final batch: {e}")
        
        logger.info(f"Categories insertion complete: {inserted_count} inserted, {skipped_count} skipped")
        return inserted_count
    
    def migrate(self, categories_file_path: str) -> Dict[str, int]:
        self.tracker.start()
        
        try:
            self.create_tables()
            categories_data = self.load_categories_data(categories_file_path)
            valid_categories = self.validate_categories_data(categories_data)

            if not valid_categories:
                raise MigrationError("No valid categories found to migrate")
            
            transformed_categories = self.transform_categories_data(valid_categories)
            
            inserted_count = self.insert_categories(transformed_categories)
            
            self.tracker.update_count('food_categories', inserted_count)
            return {
                'total_categories': len(categories_data),
                'valid_categories': len(valid_categories),
                'inserted_categories': inserted_count,
                'errors': len(self.tracker.errors)
            }
            
        except Exception as e:
            self.tracker.add_error(f"Migration failed: {e}")
            raise
        finally:
            self.tracker.end()


def main():
    try:
        settings = Settings()
        default_file_path = Path(__file__).parent.parent.parent / "frontend/EcoLens/src/data/categories.json"
        
        file_path = sys.argv[1] if len(sys.argv) > 1 else str(default_file_path)
        
        if not Path(file_path).exists():
            logger.error(f"Categories file not found: {file_path}")
            sys.exit(1)
        
        migrator = CategoriesMigrator(settings.database_url)
        results = migrator.migrate(file_path)
        
        for key, value in results.items():
            logger.info(f"{key}: {value}")
        
        if results['errors'] > 0:
            logger.warning("Migration completed with errors. Check migration.log for details.")
            sys.exit(1)
        else:
            logger.info("Categories migration completed successfully!")
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()