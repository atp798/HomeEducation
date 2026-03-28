import logging
from config import config

logger = logging.getLogger(__name__)


def send_sms_code(phone: str, code: str) -> None:
    if config.sms_provider == "mock":
        logger.info(f"[Mock SMS] To: {phone}, Code: {code}")
        return
    # TODO: integrate Twilio or Aliyun SMS


def send_email_code(email: str, code: str) -> None:
    if config.email_provider == "mock":
        logger.info(f"[Mock Email] To: {email}, Code: {code}")
        return
    # TODO: integrate SMTP
