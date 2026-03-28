import bcrypt
import jwt
import random
import string
from datetime import datetime, timezone, timedelta
from config import config


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def sign_token(payload: dict) -> str:
    data = {**payload, "exp": datetime.now(timezone.utc) + timedelta(days=config.jwt_expires_days)}
    return jwt.encode(data, config.jwt_secret, algorithm="HS256")


def verify_token(token: str) -> dict:
    return jwt.decode(token, config.jwt_secret, algorithms=["HS256"])


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))
