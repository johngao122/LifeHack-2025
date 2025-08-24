
import sys
import os
import argparse
from pathlib import Path
from typing import Dict, Any


sys.path.append(str(Path(__file__).parent.parent))

from app.config import Settings
from scripts.migrate_categories import CategoriesMigrator
from scripts.migrate_foundation_foods import FoundationFoodsMigrator
from scripts.migration_utils import MigrationTracker, logger


class MigrationOrchestrator:
    
    def __init__(self, database_url: str, batch_size: int = 1000):
        self.database_url = database_url
        self.batch_size = batch_size
        self.tracker = MigrationTracker()
    
    def run_complete_migration(self, categories_file: str, foundation_foods_file: str) -> Dict[str, Any]:
        self.tracker.start()
        
        results = {
            'categories': {},
            'foundation_foods': {},
            'total_errors': 0
        }
        
        try:
            
            logger.info("=" * 60)
            logger.info("starting categories migration")
            logger.info("=" * 60)
            
            categories_migrator = CategoriesMigrator(self.database_url)
            categories_results = categories_migrator.migrate(categories_file)
            results['categories'] = categories_results
            
            logger.info("Categories migration completed")
            logger.info(f"Inserted {categories_results['inserted_categories']} categories")
            
            
            logger.info("=" * 60)
            logger.info("starting foundation foods migration")
            logger.info("=" * 60)
            
            foundation_foods_migrator = FoundationFoodsMigrator(self.database_url, self.batch_size)
            foundation_foods_results = foundation_foods_migrator.migrate(foundation_foods_file)
            results['foundation_foods'] = foundation_foods_results
            
            logger.info("Foundation foods migration completed")
            logger.info(f"Inserted {foundation_foods_results['foundation_foods']} foundation foods")
            logger.info(f"Inserted {foundation_foods_results['food_nutrients']} nutrients")
            logger.info(f"Inserted {foundation_foods_results['food_portions']} portions")
            logger.info(f"Inserted {foundation_foods_results['input_foods']} input foods")
            
            
            results['total_errors'] = (
                categories_results.get('errors', 0) + 
                foundation_foods_results.get('errors', 0)
            )
            
            return results
            
        except Exception as e:
            self.tracker.add_error(f"Migration orchestration failed: {e}")
            results['total_errors'] += 1
            raise
        finally:
            self.tracker.end()
    
    def run_categories_only(self, categories_file: str) -> Dict[str, Any]:
        self.tracker.start()
        
        try:
            logger.info("=" * 60)
            logger.info("starting categories migration only")
            logger.info("=" * 60)
            
            migrator = CategoriesMigrator(self.database_url)
            results = migrator.migrate(categories_file)
            
            logger.info("Categories migration completed")
            return results
            
        except Exception as e:
            self.tracker.add_error(f"Categories migration failed: {e}")
            raise
        finally:
            self.tracker.end()
    
    def run_foundation_foods_only(self, foundation_foods_file: str) -> Dict[str, Any]:
        self.tracker.start()
        
        try:
            logger.info("=" * 60)
            logger.info("starting foundation foods migration only")
            logger.info("=" * 60)
            
            migrator = FoundationFoodsMigrator(self.database_url, self.batch_size)
            results = migrator.migrate(foundation_foods_file)
            
            logger.info("Foundation foods migration completed")
            return results
            
        except Exception as e:
            self.tracker.add_error(f"Foundation foods migration failed: {e}")
            raise
        finally:
            self.tracker.end()


def print_summary(results: Dict[str, Any], migration_type: str):
    logger.info("=" * 60)
    logger.info(f"{migration_type.upper()} migration summary")
    logger.info("=" * 60)
    
    if migration_type == "complete" and 'categories' in results:
        logger.info("Categories Results:")
        for key, value in results['categories'].items():
            logger.info(f"  {key}: {value}")
        
        logger.info("\nFoundation Foods Results:")
        for key, value in results['foundation_foods'].items():
            logger.info(f"  {key}: {value}")
        
        logger.info(f"\nTotal Errors: {results['total_errors']}")
    else:
        for key, value in results.items():
            logger.info(f"  {key}: {value}")
    
    logger.info("=" * 60)


def main():     
    parser = argparse.ArgumentParser(description='Run data migration from JSON files to SQL database')
    
    parser.add_argument(
        '--mode',
        choices=['complete', 'categories', 'foundation_foods'],
        default='complete',
        help='Migration mode (default: complete)'
    )
    
    parser.add_argument(
        '--categories-file',
        help='Path to categories JSON file (default: auto-detect)'
    )
    
    parser.add_argument(
        '--foundation-foods-file',
        help='Path to foundation foods JSON file (default: auto-detect)'
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=1000,
        help='Batch size for processing large datasets (default: 1000)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Perform a dry run without actual database changes'
    )
    
    args = parser.parse_args()
    
    try:
        
        settings = Settings()
        
        project_root = Path(__file__).parent.parent.parent
        default_categories_file = project_root / "frontend/EcoLens/src/data/categories.json"
        default_foundation_foods_file = project_root / "frontend/EcoLens/src/data/FoodData_Central_foundation_food_json_2025-04-24.json"
        
        categories_file = args.categories_file or str(default_categories_file)
        foundation_foods_file = args.foundation_foods_file or str(default_foundation_foods_file)
        
        
        if args.mode in ['complete', 'categories'] and not Path(categories_file).exists():
            logger.error(f"Categories file not found: {categories_file}")
            sys.exit(1)
        
        if args.mode in ['complete', 'foundation_foods'] and not Path(foundation_foods_file).exists():
            logger.error(f"Foundation foods file not found: {foundation_foods_file}")
            sys.exit(1)
        
        
        orchestrator = MigrationOrchestrator(settings.database_url, args.batch_size)
        
        
        if args.mode == 'complete':
            logger.info(f"Starting complete migration...")
            logger.info(f"Categories file: {categories_file}")
            logger.info(f"Foundation foods file: {foundation_foods_file}")
            logger.info(f"Batch size: {args.batch_size}")
            
            results = orchestrator.run_complete_migration(categories_file, foundation_foods_file)
            print_summary(results, 'complete')
            
            if results['total_errors'] > 0:
                logger.warning("Migration completed with errors. Check migration.log for details.")
                sys.exit(1)
        
        elif args.mode == 'categories':
            logger.info(f"Starting categories migration...")
            logger.info(f"Categories file: {categories_file}")
            
            results = orchestrator.run_categories_only(categories_file)
            print_summary(results, 'categories')
            
            if results.get('errors', 0) > 0:
                logger.warning("Migration completed with errors. Check migration.log for details.")
                sys.exit(1)
        
        elif args.mode == 'foundation_foods':
            logger.info(f"Starting foundation foods migration...")
            logger.info(f"Foundation foods file: {foundation_foods_file}")
            logger.info(f"Batch size: {args.batch_size}")
            
            results = orchestrator.run_foundation_foods_only(foundation_foods_file)
            print_summary(results, 'foundation_foods')
            
            if results.get('errors', 0) > 0:
                logger.warning("Migration completed with errors. Check migration.log for details.")
                sys.exit(1)
        
        logger.info("Migration completed successfully!")
        
    except KeyboardInterrupt:
        logger.info("Migration interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()