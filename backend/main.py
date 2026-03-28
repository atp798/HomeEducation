import logging
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import config
from database import init_db
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.settings import router as settings_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info(f"Server starting on port {config.port}")
    logger.info(f"AI model: {config.ai_model}")
    logger.info(f"AI endpoint: {config.ai_base_url}")
    yield


app = FastAPI(title="Home Education Consulting API", version="1.0.0", lifespan=lifespan)

# CORS — allow all origins (restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Routes without /api prefix — Vite proxy strips /api before forwarding,
# and the SSE client.ts bypasses the proxy calling /chat/messages/stream directly.
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(settings_router)


@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "ok", "model": config.ai_model}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=config.port,
        reload=True,
        log_level="info",
    )
