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
    smtp_host: str = os.getenv("SMTP_HOST", "smtpdm.aliyun.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "80"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_pass: str = os.getenv("SMTP_PASS", "")
    email_from: str = os.getenv("EMAIL_FROM", "")
    email_reply_to: str = os.getenv("EMAIL_REPLY_TO", "")
    # Separate from CORS_ORIGIN — the public URL where the frontend is hosted,
    # used for generating email activation / deletion links.
    frontend_url: str = os.getenv("FRONTEND_URL", os.getenv("CORS_ORIGIN", "http://localhost:5173"))


config = Config()
