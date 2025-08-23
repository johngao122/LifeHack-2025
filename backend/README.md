# EcoLens Backend API

EcoLens backend is a modern FastAPI-based REST API that provides food sustainability analysis and environmental impact scoring for food products. Built with a clean architecture pattern, it integrates with OpenFoodFacts database to fetch product information and processes it to generate comprehensive sustainability reports.

## Architecture

The backend follows a modular architecture with clear separation of concerns:

```
backend/
├── app/                     # Main application package
│   ├── main.py             # FastAPI application setup
│   ├── config.py           # Configuration management  
│   ├── database.py         # Database connection and setup
│   ├── models/             # Data models
│   │   ├── database.py     # SQLModel database models
│   │   └── schemas.py      # Pydantic request/response schemas
│   ├── api/                # API layer
│   │   ├── routes/         # Endpoint definitions
│   │   │   ├── products.py # Product analysis endpoints
│   │   │   ├── recommendations.py # Recommendation endpoints
│   │   │   └── analysis.py # AI analysis endpoints
│   │   └── dependencies.py # Shared dependencies
│   ├── services/           # Business logic layer
│   │   ├── product_service.py      # Product analysis logic
│   │   ├── recommendation_service.py # Recommendation algorithms
│   │   ├── analysis_service.py     # AI analysis service
│   │   └── external_api.py         # OpenFoodFacts integration
│   ├── core/               # Core functionality
│   │   ├── exceptions.py   # Custom exception classes
│   │   └── security.py     # CORS and security configuration
│   └── utils/              # Utility modules
│       ├── processing.py   # Data transformation utilities
│       └── logger.py       # Logging configuration
├── .env.example            # Environment variables template
├── requirements.txt        # Python dependencies
├── Dockerfile             # Container configuration
└── README.md              # This file
```

## What the Backend Does

### Product Analysis
- **Product Search**: Query products by name with intelligent matching and caching
- **Environmental Scoring**: Calculate comprehensive environmental impact scores including CO2 emissions, packaging impact, and material analysis  
- **Data Processing**: Transform raw OpenFoodFacts data into structured sustainability metrics
- **Smart Caching**: Database caching system to improve response times for repeated queries

### Sustainability Recommendations
- **Category-based Recommendations**: Get top sustainable products within specific food categories
- **Ranking Algorithm**: Advanced scoring system considering multiple environmental factors
- **Flexible Filtering**: Support for multiple product categories with customizable parameters

### AI-Powered Analysis
- **Screenshot Analysis**: Use GPT-4 Vision to analyze webpage screenshots
- **Product Detection**: Automatically identify food products from images
- **Page Classification**: Determine if pages contain relevant product information

### Data Management
- **MySQL Database Integration**: Persistent storage for processed product data and caching
- **Background Processing**: Asynchronous data processing for optimal performance
- **Automatic Schema Management**: Database tables created and managed automatically

## Setup Instructions

### Prerequisites
- Python 3.12 or higher
- MySQL 8.0 or higher
- pip package manager
- Docker (optional, for containerized deployment)
- OpenAI API key (for screenshot analysis features)

### Development Setup

1. **Clone and Navigate**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Create Virtual Environment**
   ```bash
   python -m venv ecolens-env
   
   # On macOS/Linux
   source ecolens-env/bin/activate
   
   # On Windows
   ecolens-env\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Database Setup**
   Create a MySQL database and user:
   ```sql
   CREATE DATABASE ecolens;
   CREATE USER 'ecolens'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON ecolens.* TO 'ecolens'@'localhost';
   FLUSH PRIVILEGES;
   ```

5. **Environment Configuration**
   Copy the example environment file and configure:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```bash
   # Database Configuration
   DATABASE_URL=mysql+pymysql://ecolens:password@localhost:3306/ecolens
   
   # Server Configuration  
   HOST=0.0.0.0
   PORT=8000
   DEBUG=true
   
   # OpenAI Configuration (required for screenshot analysis)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # External API Configuration
   OPENFOODFACTS_API_URL=https://world.openfoodfacts.net/cgi/search.pl
   USER_AGENT=EcoLens/1.0 (ecolens@example.com)
   DEFAULT_PAGE_SIZE=20
   
   # CORS Configuration
   CORS_ORIGINS=*
   ```

6. **Run Development Server**
   ```bash
   # Using the app directly
   python -m app.main
   
   # Or using uvicorn directly
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

   The API will be available at `http://localhost:8000`

7. **API Documentation**
   FastAPI automatically generates interactive API documentation:
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

### Docker Compose Setup (Recommended)

The easiest way to run the complete backend stack with database:

1. **Start All Services**
   ```bash
   docker-compose up -d
   ```
   
   This will:
   - Build and start the FastAPI backend on port 8000
   - Start MySQL database on port 3333
   - Create the database and user automatically
   - Set up proper networking between services

2. **View Logs**
   ```bash
   # All services
   docker-compose logs -f
   
   # Just the API
   docker-compose logs -f api
   
   # Just the database
   docker-compose logs -f db
   ```

3. **Stop All Services**
   ```bash
   docker-compose down
   ```

4. **Reset Database**
   ```bash
   docker-compose down -v  # Removes volumes
   docker-compose up -d
   ```

### Docker Deployment (Manual)

For manual Docker deployment without Docker Compose:

1. **Build Docker Image**
   ```bash
   docker build -t ecolens-backend .
   ```

2. **Run Container**
   ```bash
   docker run -p 8000:8000 --env-file .env ecolens-backend
   ```

## API Endpoints

### Product Analysis
- `GET /`: Health check endpoint
- `POST /product_info`: Analyze a specific food product by name
  ```json
  {
    "product_name": "organic bananas"
  }
  ```

### Recommendations
- `POST /recommendations`: Get sustainable product recommendations by category
  ```json
  {
    "categories": [
      "plant-based-foods-and-beverages",
      "cereals-and-potatoes"
    ]
  }
  ```

### AI Analysis
- `POST /analyze_screenshot`: Analyze webpage screenshot for food products
  ```json
  {
    "screenshot_data": "base64_encoded_image_data",
    "page_url": "https://example.com/product-page"
  }
  ```

## Development Commands

```bash
# Start development server with auto-reload
python -m app.main

# Start with uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Install dependencies
pip install -r requirements.txt

# Generate requirements file (if adding new dependencies)  
pip freeze > requirements.txt

# Docker Compose commands
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose logs -f        # View logs
docker-compose down -v        # Reset database

# Manual Docker commands
docker build -t ecolens-backend .
docker run -p 8000:8000 --env-file .env ecolens-backend
```

## Key Technologies

- **FastAPI**: Modern, fast web framework for building APIs with automatic OpenAPI documentation
- **SQLModel**: SQL databases integration with Pydantic models and type hints
- **SQLAlchemy**: Python SQL toolkit and ORM for database operations
- **PyMySQL**: Pure Python MySQL client library
- **Uvicorn**: Lightning-fast ASGI server implementation
- **Requests**: HTTP library for external API integration with OpenFoodFacts
- **Pydantic**: Data validation and settings management using Python type annotations
- **OpenAI**: AI analysis for screenshot processing and product detection

## Database Schema

The application uses a single `Product` table with the following structure:

- `id`: Primary key (product identifier)
- `cache_key`: URL-encoded product name for caching
- `name`: Product display name
- `environmental_score_data`: JSON field containing comprehensive environmental analysis
- `categories`: JSON array of product categories
- `labels`: Comma-separated product labels and certifications

## External Dependencies

- **OpenFoodFacts API**: Primary data source for food product information
- **OpenAI API**: AI analysis for screenshot processing and product detection
- **MySQL Database**: Persistent storage and caching layer

## Architecture Benefits

- **Clean Architecture**: Clear separation between API, business logic, and data layers
- **Dependency Injection**: Proper use of FastAPI's dependency system
- **Error Handling**: Custom exceptions with appropriate HTTP status codes
- **Configuration Management**: Environment-based configuration with validation
- **Security**: CORS configuration and security headers
- **Scalability**: Modular design allows for easy feature additions
- **Testability**: Service layer separation enables comprehensive unit testing
- **Documentation**: Automatic API documentation generation