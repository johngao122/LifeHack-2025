# EcoLens Backend API

EcoLens backend is a FastAPI-based REST API that provides food sustainability analysis and environmental impact scoring for food products. The API integrates with OpenFoodFacts database to fetch product information and processes it to generate comprehensive sustainability reports.

## What the Backend Does

### Product Analysis

-   **Product Search**: Query products by name with intelligent matching and caching
-   **Environmental Scoring**: Calculate comprehensive environmental impact scores including CO2 emissions, packaging impact, and material analysis
-   **Data Processing**: Transform raw OpenFoodFacts data into structured sustainability metrics
-   **Smart Caching**: Database caching system to improve response times for repeated queries

### Sustainability Recommendations

-   **Category-based Recommendations**: Get top sustainable products within specific food categories
-   **Ranking Algorithm**: Advanced scoring system considering multiple environmental factors
-   **Flexible Filtering**: Support for multiple product categories with customizable parameters

### Data Management

-   **MySQL Database Integration**: Persistent storage for processed product data and caching
-   **Background Processing**: Asynchronous data processing for optimal performance
-   **Automatic Schema Management**: Database tables created and managed automatically

## Setup Instructions

### Prerequisites

-   Python 3.12 or higher
-   MySQL 8.0 or higher
-   pip package manager
-   Docker (optional, for containerized deployment)

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

5. **Environment Variables Setup**

    Create a `.env` file in the root directory and configure:

    ```bash
    # Database Configuration
    DATABASE_URL=mysql+pymysql://ecolens:password@localhost:3306/ecolens
    ```

    **Environment Variables:**

    - `DATABASE_URL`: MySQL connection string (defaults to `mysql+pymysql://ecolens:password@localhost:3333/ecolens`)

6. **Run Development Server**

    ```bash
    python main.py
    ```

    Or using uvicorn directly:

    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
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
    docker run -p 8000:8000 -e DATABASE_URL="your_database_url" ecolens-backend
    ```

### Project Structure

```
backend/
├── main.py                 # FastAPI application and API endpoints
├── processing.py           # Product data transformation and analysis
├── recommendation.py       # Recommendation algorithms and ranking
├── requirements.txt        # Python dependencies
├── Dockerfile             # Container configuration
├── example.json           # Sample data for testing
└── README.md              # This file

Generated:
├── __pycache__/           # Python bytecode cache
└── .DS_Store              # macOS system file
```

### API Endpoints

#### Product Analysis

-   `POST /product_info`: Analyze a specific food product by name
    ```json
    {
        "product_name": "organic bananas"
    }
    ```

#### Recommendations

-   `POST /recommendations`: Get sustainable product recommendations by category
    ```json
    {
        "categories": [
            "plant-based-foods-and-beverages",
            "cereals-and-potatoes"
        ]
    }
    ```

### Development Commands

```bash
# Start development server with auto-reload
python main.py

# Start with custom host/port
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

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

### Key Technologies

-   **FastAPI**: Modern, fast web framework for building APIs with automatic OpenAPI documentation
-   **SQLModel**: SQL databases integration with Pydantic models and type hints
-   **SQLAlchemy**: Python SQL toolkit and ORM for database operations
-   **PyMySQL**: Pure Python MySQL client library
-   **Uvicorn**: Lightning-fast ASGI server implementation
-   **Requests**: HTTP library for external API integration with OpenFoodFacts
-   **Pydantic**: Data validation and settings management using Python type annotations

### Database Schema

The application uses a single `Product` table with the following structure:

-   `id`: Primary key (product identifier)
-   `cache_key`: URL-encoded product name for caching
-   `name`: Product display name
-   `environmental_score_data`: JSON field containing comprehensive environmental analysis
-   `categories`: JSON array of product categories
-   `labels`: Comma-separated product labels and certifications

### External Dependencies

-   **OpenFoodFacts API**: Primary data source for food product information
-   **MySQL Database**: Persistent storage and caching layer

### CORS Configuration

The API is configured with permissive CORS settings for development. For production deployment, restrict the `allow_origins` to specific domains:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### Production Considerations

1. **Environment Variables**: Use secure environment variable management
2. **Database Security**: Implement proper database user permissions and connection security
3. **API Rate Limiting**: Consider implementing rate limiting for production use
4. **Logging**: Configure appropriate logging levels and output destinations
5. **Health Checks**: Add health check endpoints for monitoring
6. **Error Handling**: Implement comprehensive error handling and logging

### Troubleshooting

**Database Connection Issues:**

-   Verify MySQL is running and accessible
-   Check DATABASE_URL format and credentials
-   Ensure database and user exist with proper permissions

**OpenFoodFacts API Issues:**

-   Check internet connectivity
-   Verify User-Agent header is properly set
-   Monitor for API rate limiting

**Performance Issues:**

-   Monitor database query performance
-   Consider implementing connection pooling
-   Check for proper indexing on frequently queried fields
