import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    port: int = int(os.getenv("PORT", "3001"))
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5173")
    jwt_secret: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    jwt_expires_days: int = 7
    db_path: str = os.getenv("DB_PATH", "./data/app.db")
    ai_base_url: str = os.getenv("AI_BASE_URL", "")
    ai_api_key: str = os.getenv("AI_API_KEY", "")
    ai_model: str = os.getenv("AI_MODEL", "")
    sms_provider: str = os.getenv("SMS_PROVIDER", "mock")
    email_provider: str = os.getenv("EMAIL_PROVIDER", "mock")


config = Config()
