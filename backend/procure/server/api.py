from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from procure.server.health import register_health_routes
from procure.server.core import register_core_routes
from procure.auth.core import register_auth_routes

app = FastAPI(title="proCure Backend", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # For web app development
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

# Register core routes
register_core_routes(app)
