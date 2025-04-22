"""
Main FastAPI application for the proCure backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from procure.server.health.routes import register_health_routes
from procure.server.url_visits.routes import register_url_visits_routes
from procure.server.manage.routes import register_manage_routes
from procure.server.analytics.routes import register_analytics_routes
from procure.server.vendor.routes import register_vendor_routes
from procure.auth.routes import register_auth_routes

app = FastAPI(title="proCure Backend", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # For web app development
        "http://127.0.0.1:3000",  # Alternative local address
        "http://localhost:8000",  # For backend API access
        "http://127.0.0.1:8000"   # Alternative backend address
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.get("/")
async def root():
    return {
        "service": "proCure Backend",
        "version": app.version,
        "docs_url": "/docs",
        "health_check": "/ping"
    }

# Register health check routes
register_health_routes(app)

# Register authentication routes
register_auth_routes(app)

# Register URL visits routes
register_url_visits_routes(app)

# Register organization management routes
register_manage_routes(app)

# Register analytics routes
register_analytics_routes(app)

# Register vendor routes
register_vendor_routes(app)
