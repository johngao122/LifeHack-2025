# Data Migration Scripts

This directory contains scripts to migrate JSON data from the frontend to the SQL database.

## Overview

The migration system moves data from two JSON files:
- `categories.json` - Food category data from OpenFoodFacts
- `FoodData_Central_foundation_food_json_2025-04-24.json` - Foundation food data from USDA Food Data Central

## Database Schema

The migration creates the following new tables:

### `food_categories`
- `id` (VARCHAR, Primary Key) - Category identifier
- `name` (VARCHAR) - Category name
- `products_count` (INT) - Number of products in category
- `url` (VARCHAR) - OpenFoodFacts URL
- `wikidata_url` (VARCHAR) - Wikidata reference URL
- `known` (INT) - Whether category is known/validated

### `foundation_foods`
- `fdc_id` (INT, Primary Key) - Food Data Central ID
- `description` (VARCHAR) - Food description
- `data_type` (VARCHAR) - Data type (Foundation, etc.)
- `food_class` (VARCHAR) - Food classification
- `publication_date` (VARCHAR) - Publication date
- `food_category_description` (VARCHAR) - Category description
- `ndb_number` (INT) - Legacy NDB number
- `is_historical_reference` (BOOLEAN) - Historical reference flag

### `food_nutrients`
- `id` (INT, Primary Key) - Nutrient record ID
- `fdc_id` (INT, Foreign Key) - References foundation_foods.fdc_id
- `nutrient_id` (INT) - Nutrient identifier
- `nutrient_name` (VARCHAR) - Nutrient name
- `amount` (FLOAT) - Nutrient amount
- `unit_name` (VARCHAR) - Unit of measurement
- And additional derivation and statistical fields

### `food_portions`
- `id` (INT, Primary Key) - Portion record ID
- `fdc_id` (INT, Foreign Key) - References foundation_foods.fdc_id
- `measure_unit_name` (VARCHAR) - Unit name (cup, tablespoon, etc.)
- `gram_weight` (FLOAT) - Weight in grams
- `amount` (FLOAT) - Portion amount
- And additional measurement fields

### `input_foods`
- `id` (INT, Primary Key) - Input food record ID
- `fdc_id` (INT, Foreign Key) - References foundation_foods.fdc_id
- `input_fdc_id` (INT) - Referenced input food FDC ID
- `food_description` (VARCHAR) - Food description
- And additional input food metadata

## Usage

### Prerequisites

1. Ensure your database is set up and accessible
2. Configure your `.env` file with the correct `DATABASE_URL`
3. Install required dependencies: `pip install -r requirements.txt`

### Running Migrations

#### Complete Migration (Recommended)
Migrate both datasets:

```bash
cd backend
python scripts/run_migration.py --mode complete
```

#### Individual Migrations

Migrate only categories:
```bash
python scripts/run_migration.py --mode categories
```

Migrate only foundation foods:
```bash
python scripts/run_migration.py --mode foundation_foods
```

#### Advanced Options

Custom file paths:
```bash
python scripts/run_migration.py \
  --categories-file /path/to/categories.json \
  --foundation-foods-file /path/to/food_data.json
```

Custom batch size for large datasets:
```bash
python scripts/run_migration.py --batch-size 500
```

Dry run (validation only, no database changes):
```bash
python scripts/run_migration.py --dry-run
```

### Individual Script Usage

Each migration script can be run independently:

```bash
# Categories only
python scripts/migrate_categories.py [categories_file_path]

# Foundation foods only
python scripts/migrate_foundation_foods.py [foundation_foods_file_path] [batch_size]
```

## Features

### Data Validation
- Validates required fields before insertion
- Checks data types and constraints
- Logs validation errors for troubleshooting

### Batch Processing
- Processes large datasets in configurable batches
- Default batch size: 1000 records
- Memory-efficient processing for large files

### Error Handling
- Comprehensive error logging
- Rollback capability on batch failures
- Continues processing despite individual record errors

### Progress Tracking
- Real-time progress logs
- Detailed migration statistics
- Performance timing information

### Duplicate Handling
- Checks for existing records before insertion
- Skips duplicates to allow re-running migrations
- Maintains data integrity

## Logging

Migration logs are written to:
- `migration.log` - Detailed log file
- Console output - Real-time progress

Log levels include:
- INFO: Normal progress updates
- WARNING: Non-fatal issues
- ERROR: Failed operations
- DEBUG: Detailed troubleshooting info

## File Structure

```
scripts/
├── __init__.py
├── README.md                      # This file
├── migration_utils.py             # Shared utilities and validation
├── migrate_categories.py          # Categories migration script
├── migrate_foundation_foods.py    # Foundation foods migration script
└── run_migration.py              # Main orchestration script
```

## Data Sources

### Categories Data
- Source: OpenFoodFacts categories API
- File: `frontend/EcoLens/src/data/categories.json`
- Records: ~77,703 categories
- Structure: Hierarchical food categories with product counts

### Foundation Foods Data
- Source: USDA Food Data Central Foundation Foods
- File: `frontend/EcoLens/src/data/FoodData_Central_foundation_food_json_2025-04-24.json`
- Records: ~4,452 food items with detailed nutrition data
- Structure: Complex nested data with nutrients, portions, and input foods

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` in `.env` file
   - Ensure database server is running
   - Verify database credentials

2. **File Not Found Errors**
   - Verify JSON file paths
   - Ensure files are in expected locations
   - Use absolute paths if needed

3. **Memory Issues with Large Files**
   - Reduce batch size: `--batch-size 500`
   - Ensure sufficient system memory
   - Monitor database connection limits

4. **Validation Errors**
   - Check `migration.log` for specific validation failures
   - Verify JSON file integrity
   - Check for missing required fields

### Performance Tips

1. **Database Optimization**
   - Ensure proper indexing on foreign keys
   - Use appropriate MySQL configuration for bulk inserts
   - Consider temporarily disabling foreign key checks for large imports

2. **Batch Size Tuning**
   - Larger batches: Better performance, more memory usage
   - Smaller batches: More reliable, slower processing
   - Recommended range: 500-2000 depending on system resources

3. **Monitoring**
   - Watch database connection count
   - Monitor memory usage during migration
   - Check disk space for log files

## Example Output

```
2024-01-15 10:30:15 - migration_utils - INFO - Migration started at 2024-01-15 10:30:15
2024-01-15 10:30:16 - migrate_categories - INFO - Loading categories data from: categories.json
2024-01-15 10:30:16 - migrate_categories - INFO - Loaded 742 categories from file
2024-01-15 10:30:16 - migrate_categories - INFO - Validation complete: 742 valid, 0 invalid
2024-01-15 10:30:17 - migrate_categories - INFO - Categories insertion complete: 742 inserted, 0 skipped
2024-01-15 10:30:18 - migrate_foundation_foods - INFO - Loaded 4452 foundation foods from file
2024-01-15 10:30:45 - migration_utils - INFO - Foundation foods migration completed successfully!

=== MIGRATION RESULTS ===
foundation_foods: 4452
food_nutrients: 285628
food_portions: 8904
input_foods: 22260
total_errors: 0
```