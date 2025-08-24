"""
Migration script for foundation foods data.
Loads FoodData_Central_foundation_food_json and inserts data into related tables.
"""

import sys
import os
from pathlib import Path
from typing import List, Dict, Any

# Add the parent directory to the path so we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

from sqlmodel import Session, create_engine, SQLModel, select
from app.models.database import FoundationFood, FoodNutrient, FoodPortion, InputFood
from app.config import Settings
from scripts.migration_utils import (
    DataValidator, DataTransformer, FileHandler, BatchProcessor,
    MigrationError, MigrationTracker, logger
)


class FoundationFoodsMigrator:
    """Handles migration of foundation foods data."""
    
    def __init__(self, database_url: str, batch_size: int = 1000):
        self.engine = create_engine(database_url)
        self.validator = DataValidator()
        self.transformer = DataTransformer()
        self.file_handler = FileHandler()
        self.batch_processor = BatchProcessor(batch_size)
        self.tracker = MigrationTracker()
    
    def create_tables(self):
        """Create database tables if they don't exist."""
        try:
            SQLModel.metadata.create_all(self.engine)
            logger.info("Database tables created successfully")
        except Exception as e:
            raise MigrationError(f"Failed to create database tables: {e}")
    
    def load_foundation_foods_data(self, file_path: str) -> List[Dict[str, Any]]:
        """Load foundation foods data from JSON file."""
        logger.info(f"Loading foundation foods data from: {file_path}")
        
        try:
            data = self.file_handler.load_json_file(file_path)
            foundation_foods = data.get('FoundationFoods', [])
            logger.info(f"Loaded {len(foundation_foods)} foundation foods from file")
            return foundation_foods
        except Exception as e:
            raise MigrationError(f"Failed to load foundation foods data: {e}")
    
    def validate_foundation_foods_data(self, foods: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate foundation foods data."""
        logger.info("Validating foundation foods data...")
        
        valid_foods = []
        invalid_count = 0
        
        for food in foods:
            if self.validator.validate_foundation_food(food):
                valid_foods.append(food)
            else:
                invalid_count += 1
                self.tracker.add_error(f"Invalid food data: {food.get('fdcId', 'unknown')}")
        
        logger.info(f"Validation complete: {len(valid_foods)} valid, {invalid_count} invalid")
        return valid_foods
    
    def insert_foundation_foods_batch(self, foods_batch: List[Dict[str, Any]]):
        """Insert a batch of foundation foods into database."""
        with Session(self.engine) as session:
            try:
                inserted_foods = 0
                skipped_foods = 0
                
                for food_data in foods_batch:
                    fdc_id = food_data['fdcId']
                    
                    # Check if food already exists
                    existing = session.get(FoundationFood, fdc_id)
                    if existing:
                        logger.debug(f"Foundation food {fdc_id} already exists, skipping")
                        skipped_foods += 1
                        continue
                    
                    # Transform and insert foundation food
                    transformed_food = self.transformer.transform_foundation_food(food_data)
                    food = FoundationFood(**transformed_food)
                    session.add(food)
                    inserted_foods += 1
                
                # Commit the batch
                session.commit()
                logger.info(f"Batch committed: {inserted_foods} foods inserted, {skipped_foods} skipped")
                
                return inserted_foods, skipped_foods
                
            except Exception as e:
                session.rollback()
                raise MigrationError(f"Failed to insert foundation foods batch: {e}")
    
    def insert_nutrients_batch(self, foods_batch: List[Dict[str, Any]]):
        """Insert nutrients for a batch of foundation foods."""
        with Session(self.engine) as session:
            try:
                inserted_nutrients = 0
                
                for food_data in foods_batch:
                    fdc_id = food_data['fdcId']
                    nutrients = food_data.get('foodNutrients', [])
                    
                    for nutrient_data in nutrients:
                        # Validate nutrient data
                        if not self.validator.validate_food_nutrient(nutrient_data):
                            self.tracker.add_error(f"Invalid nutrient data for food {fdc_id}: {nutrient_data}")
                            continue
                        
                        # Check if nutrient already exists
                        nutrient_id = nutrient_data['id']
                        existing = session.get(FoodNutrient, nutrient_id)
                        if existing:
                            continue
                        
                        # Transform and insert nutrient
                        transformed_nutrient = self.transformer.transform_food_nutrient(nutrient_data, fdc_id)
                        nutrient = FoodNutrient(**transformed_nutrient)
                        session.add(nutrient)
                        inserted_nutrients += 1
                
                # Commit the batch
                session.commit()
                logger.info(f"Nutrients batch committed: {inserted_nutrients} nutrients inserted")
                
                return inserted_nutrients
                
            except Exception as e:
                session.rollback()
                raise MigrationError(f"Failed to insert nutrients batch: {e}")
    
    def insert_portions_batch(self, foods_batch: List[Dict[str, Any]]):
        """Insert food portions for a batch of foundation foods."""
        with Session(self.engine) as session:
            try:
                inserted_portions = 0
                
                for food_data in foods_batch:
                    fdc_id = food_data['fdcId']
                    portions = food_data.get('foodPortions', [])
                    
                    for portion_data in portions:
                        # Check if portion already exists
                        portion_id = portion_data['id']
                        existing = session.get(FoodPortion, portion_id)
                        if existing:
                            continue
                        
                        # Transform and insert portion
                        transformed_portion = self.transformer.transform_food_portion(portion_data, fdc_id)
                        portion = FoodPortion(**transformed_portion)
                        session.add(portion)
                        inserted_portions += 1
                
                # Commit the batch
                session.commit()
                logger.info(f"Portions batch committed: {inserted_portions} portions inserted")
                
                return inserted_portions
                
            except Exception as e:
                session.rollback()
                raise MigrationError(f"Failed to insert portions batch: {e}")
    
    def insert_input_foods_batch(self, foods_batch: List[Dict[str, Any]]):
        """Insert input foods for a batch of foundation foods."""
        with Session(self.engine) as session:
            try:
                inserted_input_foods = 0
                
                for food_data in foods_batch:
                    fdc_id = food_data['fdcId']
                    input_foods = food_data.get('inputFoods', [])
                    
                    for input_food_data in input_foods:
                        # Check if input food already exists
                        input_food_id = input_food_data['id']
                        existing = session.get(InputFood, input_food_id)
                        if existing:
                            continue
                        
                        # Transform and insert input food
                        transformed_input_food = self.transformer.transform_input_food(input_food_data, fdc_id)
                        input_food = InputFood(**transformed_input_food)
                        session.add(input_food)
                        inserted_input_foods += 1
                
                # Commit the batch
                session.commit()
                logger.info(f"Input foods batch committed: {inserted_input_foods} input foods inserted")
                
                return inserted_input_foods
                
            except Exception as e:
                session.rollback()
                raise MigrationError(f"Failed to insert input foods batch: {e}")
    
    def migrate_foundation_foods(self, foods: List[Dict[str, Any]]) -> Dict[str, int]:
        """Migrate foundation foods and related data."""
        logger.info(f"Starting migration of {len(foods)} foundation foods...")
        
        # Counters for tracking
        total_foods = 0
        total_nutrients = 0
        total_portions = 0
        total_input_foods = 0
        
        # Process foundation foods in batches
        logger.info("=== MIGRATING FOUNDATION FOODS ===")
        def process_foods_batch(batch):
            nonlocal total_foods
            inserted, skipped = self.insert_foundation_foods_batch(batch)
            total_foods += inserted
        
        self.batch_processor.process_in_batches(foods, process_foods_batch)
        
        # Process nutrients in batches
        logger.info("=== MIGRATING FOOD NUTRIENTS ===")
        def process_nutrients_batch(batch):
            nonlocal total_nutrients
            inserted = self.insert_nutrients_batch(batch)
            total_nutrients += inserted
        
        self.batch_processor.process_in_batches(foods, process_nutrients_batch)
        
        # Process portions in batches
        logger.info("=== MIGRATING FOOD PORTIONS ===")
        def process_portions_batch(batch):
            nonlocal total_portions
            inserted = self.insert_portions_batch(batch)
            total_portions += inserted
        
        self.batch_processor.process_in_batches(foods, process_portions_batch)
        
        # Process input foods in batches
        logger.info("=== MIGRATING INPUT FOODS ===")
        def process_input_foods_batch(batch):
            nonlocal total_input_foods
            inserted = self.insert_input_foods_batch(batch)
            total_input_foods += inserted
        
        self.batch_processor.process_in_batches(foods, process_input_foods_batch)
        
        # Update tracking
        self.tracker.update_count('foundation_foods', total_foods)
        self.tracker.update_count('food_nutrients', total_nutrients)
        self.tracker.update_count('food_portions', total_portions)
        self.tracker.update_count('input_foods', total_input_foods)
        
        return {
            'foundation_foods': total_foods,
            'food_nutrients': total_nutrients,
            'food_portions': total_portions,
            'input_foods': total_input_foods
        }
    
    def migrate(self, foundation_foods_file_path: str) -> Dict[str, Any]:
        """Run the complete foundation foods migration process."""
        self.tracker.start()
        
        try:
            # Create tables
            self.create_tables()
            
            # Load data
            foods_data = self.load_foundation_foods_data(foundation_foods_file_path)
            
            # Validate data
            valid_foods = self.validate_foundation_foods_data(foods_data)
            
            if not valid_foods:
                raise MigrationError("No valid foundation foods found to migrate")
            
            # Migrate all data
            results = self.migrate_foundation_foods(valid_foods)
            
            # Add summary statistics
            results.update({
                'total_foods_in_file': len(foods_data),
                'valid_foods': len(valid_foods),
                'errors': len(self.tracker.errors)
            })
            
            return results
            
        except Exception as e:
            self.tracker.add_error(f"Migration failed: {e}")
            raise
        finally:
            self.tracker.end()


def main():
    """Main function to run foundation foods migration."""
    try:
        # Load settings
        settings = Settings()
        
        # Default file path (relative to project root)
        default_file_path = Path(__file__).parent.parent.parent / "frontend/EcoLens/src/data/FoodData_Central_foundation_food_json_2025-04-24.json"
        
        # Allow file path and batch size override via command line arguments
        file_path = sys.argv[1] if len(sys.argv) > 1 else str(default_file_path)
        batch_size = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
        
        if not Path(file_path).exists():
            logger.error(f"Foundation foods file not found: {file_path}")
            sys.exit(1)
        
        # Create migrator and run migration
        migrator = FoundationFoodsMigrator(settings.database_url, batch_size)
        results = migrator.migrate(file_path)
        
        # Print results
        logger.info("=== MIGRATION RESULTS ===")
        for key, value in results.items():
            logger.info(f"{key}: {value}")
        
        if results['errors'] > 0:
            logger.warning("Migration completed with errors. Check migration.log for details.")
            sys.exit(1)
        else:
            logger.info("Foundation foods migration completed successfully!")
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()