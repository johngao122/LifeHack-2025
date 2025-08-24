import json
import logging
from typing import Dict, Any, List, Union
from pathlib import Path
import sys
from datetime import datetime


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


class MigrationError(Exception):
    pass


class DataValidator:
    
    @staticmethod
    def validate_category(category: Dict[str, Any]) -> bool:
        required_fields = ['id', 'name', 'products']
        
        for field in required_fields:
            if field not in category:
                logger.error(f"Missing required field '{field}' in category: {category}")
                return False
                
        
        if not isinstance(category['id'], str) or not category['id'].strip():
            logger.error(f"Invalid category ID: {category.get('id')}")
            return False
            
        if not isinstance(category['name'], str) or not category['name'].strip():
            logger.error(f"Invalid category name: {category.get('name')}")
            return False
            
        if not isinstance(category['products'], int) or category['products'] < 0:
            logger.error(f"Invalid products count: {category.get('products')}")
            return False
            
        return True
    
    @staticmethod
    def validate_foundation_food(food: Dict[str, Any]) -> bool:
        required_fields = ['fdcId', 'description', 'dataType']
        
        for field in required_fields:
            if field not in food:
                logger.error(f"Missing required field '{field}' in food: {food}")
                return False
                
        
        if not isinstance(food['fdcId'], int):
            logger.error(f"Invalid fdcId: {food.get('fdcId')}")
            return False
            
        if not isinstance(food['description'], str) or not food['description'].strip():
            logger.error(f"Invalid description: {food.get('description')}")
            return False
            
        if not isinstance(food['dataType'], str):
            logger.error(f"Invalid dataType: {food.get('dataType')}")
            return False
            
        return True
    
    @staticmethod
    def validate_food_nutrient(nutrient: Dict[str, Any]) -> bool:
        required_fields = ['id', 'nutrient']
        
        for field in required_fields:
            if field not in nutrient:
                logger.error(f"Missing required field '{field}' in nutrient: {nutrient}")
                return False
                
        
        nutrient_info = nutrient.get('nutrient', {})
        if not isinstance(nutrient_info, dict):
            logger.error(f"Invalid nutrient structure: {nutrient_info}")
            return False
            
        nutrient_required = ['id', 'name', 'unitName']
        for field in nutrient_required:
            if field not in nutrient_info:
                logger.error(f"Missing required nutrient field '{field}': {nutrient_info}")
                return False
                
        return True


class DataTransformer:
    
    @staticmethod
    def transform_category(category: Dict[str, Any]) -> Dict[str, Any]:
        transformed = {
            'id': category['id'],
            'name': category['name'],
            'products_count': category['products'],
            'url': category.get('url'),
            'known': category.get('known', 0)
        }
        
        
        same_as = category.get('sameAs', [])
        wikidata_url = None
        if isinstance(same_as, list):
            for url in same_as:
                if 'wikidata.org' in url:
                    wikidata_url = url
                    break
        
        transformed['wikidata_url'] = wikidata_url
        
        return transformed
    
    @staticmethod
    def transform_foundation_food(food: Dict[str, Any]) -> Dict[str, Any]:
        food_category = food.get('foodCategory', {})
        
        transformed = {
            'fdc_id': food['fdcId'],
            'description': food['description'],
            'data_type': food['dataType'],
            'food_class': food.get('foodClass'),
            'publication_date': food.get('publicationDate'),
            'food_category_description': food_category.get('description'),
            'ndb_number': food.get('ndbNumber'),
            'is_historical_reference': food.get('isHistoricalReference', False)
        }
        
        return transformed
    
    @staticmethod
    def transform_food_nutrient(nutrient: Dict[str, Any], fdc_id: int) -> Dict[str, Any]:
        nutrient_info = nutrient.get('nutrient', {})
        derivation = nutrient.get('foodNutrientDerivation', {})
        derivation_source = derivation.get('foodNutrientSource', {})
        
        transformed = {
            'id': nutrient['id'],
            'fdc_id': fdc_id,
            'nutrient_id': nutrient_info['id'],
            'nutrient_number': nutrient_info.get('number'),
            'nutrient_name': nutrient_info['name'],
            'nutrient_rank': nutrient_info.get('rank'),
            'unit_name': nutrient_info['unitName'],
            'derivation_code': derivation.get('code'),
            'derivation_description': derivation.get('description'),
            'derivation_source_id': derivation_source.get('id'),
            'derivation_source_code': derivation_source.get('code'),
            'derivation_source_description': derivation_source.get('description'),
            'data_points': nutrient.get('dataPoints'),
            'amount': nutrient.get('amount'),
            'median': nutrient.get('median'),
            'min_value': nutrient.get('min'),
            'max_value': nutrient.get('max')
        }
        
        return transformed
    
    @staticmethod
    def transform_food_portion(portion: Dict[str, Any], fdc_id: int) -> Dict[str, Any]:
        measure_unit = portion.get('measureUnit', {})
        
        transformed = {
            'id': portion['id'],
            'fdc_id': fdc_id,
            'measure_unit_id': measure_unit.get('id'),
            'measure_unit_name': measure_unit.get('name'),
            'measure_unit_abbreviation': measure_unit.get('abbreviation'),
            'modifier': portion.get('modifier'),
            'gram_weight': portion.get('gramWeight'),
            'sequence_number': portion.get('sequenceNumber'),
            'amount': portion.get('amount'),
            'value': portion.get('value'),
            'min_year_acquired': portion.get('minYearAcquired')
        }
        
        return transformed
    
    @staticmethod
    def transform_input_food(input_food_data: Dict[str, Any], fdc_id: int) -> Dict[str, Any]:
        input_food = input_food_data.get('inputFood', {})
        input_category = input_food.get('foodCategory', {})
        
        transformed = {
            'id': input_food_data['id'],
            'fdc_id': fdc_id,
            'input_fdc_id': input_food.get('fdcId'),
            'food_description': input_food_data['foodDescription'],
            'input_food_description': input_food.get('description'),
            'input_food_data_type': input_food.get('dataType'),
            'input_food_class': input_food.get('foodClass'),
            'input_food_category_id': input_category.get('id'),
            'input_food_category_code': input_category.get('code'),
            'input_food_category_description': input_category.get('description'),
            'input_food_publication_date': input_food.get('publicationDate')
        }
        
        return transformed


class FileHandler:
    
    @staticmethod
    def load_json_file(file_path: Union[str, Path]) -> Dict[str, Any]:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            raise MigrationError(f"File not found: {file_path}")
        except json.JSONDecodeError as e:
            raise MigrationError(f"Invalid JSON in file {file_path}: {e}")
        except Exception as e:
            raise MigrationError(f"Error reading file {file_path}: {e}")


class BatchProcessor:
    
    def __init__(self, batch_size: int = 1000):
        self.batch_size = batch_size
    
    def process_in_batches(self, data: List[Any], process_func) -> None:
        total = len(data)
        processed = 0
        
        for i in range(0, total, self.batch_size):
            batch = data[i:i + self.batch_size]
            try:
                process_func(batch)
                processed += len(batch)
                logger.info(f"Processed batch: {processed}/{total} items")
            except Exception as e:
                logger.error(f"Error processing batch {i//self.batch_size + 1}: {e}")
                raise MigrationError(f"Batch processing failed: {e}")


class MigrationTracker:
    
    def __init__(self):
        self.start_time = None
        self.end_time = None
        self.errors = []
        self.processed_counts = {}
    
    def start(self):
        self.start_time = datetime.now()
        logger.info(f"Migration started at {self.start_time}")
    
    def end(self):
        self.end_time = datetime.now()
        duration = self.end_time - self.start_time
        logger.info(f"Migration completed at {self.end_time}")
        logger.info(f"This took {duration}")
        logger.info(f"Processed counts: {self.processed_counts}")
        if self.errors:
            logger.warning(f"Migration completed with {len(self.errors)} errors")
    
    def add_error(self, error: str):
        self.errors.append(error)
        logger.error(error)
    
    def update_count(self, table: str, count: int):
        self.processed_counts[table] = count