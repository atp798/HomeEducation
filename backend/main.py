import logging
import logging.handlers
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import config
from database import init_db
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.settings import router as settings_router
from services.rag import rag_service

_log_level = getattr(logging, config.log_level, logging.INFO)
_log_format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

handlers: list[logging.Handler] = [logging.StreamHandler()]
if config.log_file:
    import os
    os.makedirs(os.path.dirname(config.log_file) if os.path.dirname(config.log_file) else ".", exist_ok=True)
    handlers.append(
        logging.handlers.RotatingFileHandler(
            config.log_file,
            maxBytes=10 * 1024 * 1024,  # 10 MB per file
            backupCount=5,
            encoding="utf-8",
        )
    )

logging.basicConfig(
    level=_log_level,
    format=_log_format,
    handlers=handlers,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio

    init_db()
    logger.info(f"Server starting on port {config.port}")
    logger.info(f"AI model: {config.ai_model}")
    logger.info(f"AI endpoint: {config.ai_base_url}")

    # Pre-build the RAG index in a thread pool so we don't block the event loop.
    # After this the index stays in memory and serves every request instantly.
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, rag_service.load)

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
        log_level=config.log_level.lower(),
    )
