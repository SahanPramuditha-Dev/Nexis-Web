from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router


app = FastAPI(
    title="NEXIS Environmental & RF Diagnostic Backend",
    description="Calculates RF path loss, obstacle absorption, time-of-day congestion, weather rain fade, and bottleneck diagnostics.",
    version="1.0.0"
)

# Enable CORS for frontend applications (Vite, preview, localhost, production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "engine": "NEXIS RF & Environmental Context Engine",
        "docs_url": "/docs",
        "status": "online"
    }
