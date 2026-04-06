import email.utils
import logging
import smtplib
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from config import config

logger = logging.getLogger(__name__)

APP_NAME = "Home Education Consult"
APP_NAME_ZH = "家庭教育咨询"


def _send_smtp(to: str, subject: str, html: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = formataddr([APP_NAME, config.smtp_user], "utf-8")
    msg["To"] = to
    msg["Reply-to"] = config.email_reply_to
    msg["Message-id"] = email.utils.make_msgid()
    msg["Date"] = email.utils.formatdate()
    msg.attach(MIMEText(html, _subtype="html", _charset="UTF-8"))

    client = smtplib.SMTP(config.smtp_host, config.smtp_port)
    try:
        client.login(config.smtp_user, config.smtp_pass)
        client.sendmail(config.smtp_user, [to], msg.as_string())
    finally:
        client.quit()


def send_verification_email(to: str, nickname: str, activate_link: str) -> None:
    if config.email_provider == "mock":
        logger.info(f"[Mock Email] Verification link for {to}: {activate_link}")
        return

    subject = f"【{APP_NAME_ZH}】请激活你的账户"
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{APP_NAME_ZH} 账户激活</title>
<style>
    body {{font-family: "PingFang SC", "Microsoft YaHei", sans-serif; margin: 0; padding: 0; background-color: #f8fafc;}}
    .container {{max-width: 600px; margin: 30px auto; padding: 20px; background-color: #ffffff; border-radius: 8px;}}
    .header {{text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;}}
    .logo {{font-size: 22px; font-weight: 700; color: #22c55e;}}
    .content {{padding: 30px 20px; line-height: 1.6; color: #333333; font-size: 16px;}}
    .activate-btn {{display: block; width: 80%; max-width: 300px; height: 48px; line-height: 48px;
                   background-color: #22c55e; color: #ffffff !important; text-align: center;
                   border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600; margin: 30px auto;}}
    .link-box {{word-break: break-all; font-size: 13px; color: #666; padding: 10px; background: #f5f5f5; border-radius: 4px;}}
    .tips {{font-size: 14px; color: #666666; line-height: 1.5; margin-top: 20px;}}
    .footer {{text-align: center; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 12px; color: #999999;}}
</style>
</head>
<body>
    <div class="container">
        <div class="header"><div class="logo">{APP_NAME_ZH}</div></div>
        <div class="content">
            <p>Hi {nickname}，</p>
            <p>感谢你注册{APP_NAME_ZH}！为保障你的账户安全，请点击下方按钮完成账户激活。</p>
            <a href="{activate_link}" class="activate-btn" target="_blank">立即激活账户</a>
            <p class="tips">如果按钮无法点击，请复制下方链接到浏览器中打开：</p>
            <div class="link-box">{activate_link}</div>
            <p class="tips">⚠️ 激活链接 <strong>24小时内有效</strong>，且仅可使用1次，请勿转发给他人。</p>
            <p class="tips">如果你没有注册{APP_NAME_ZH}账户，请直接忽略此邮件，你的邮箱不会被绑定。</p>
            <p style="text-align: right; margin-top: 30px;">{APP_NAME_ZH} 团队</p>
        </div>
        <div class="footer"><p>© 2026 {APP_NAME}</p></div>
    </div>
</body>
</html>"""

    try:
        _send_smtp(to, subject, html)
        logger.info(f"Verification email sent to {to}")
    except Exception as e:
        logger.error(f"Failed to send verification email to {to}: {e}")
        raise


def send_email_code(to: str, code: str) -> None:
    if config.email_provider == "mock":
        logger.info(f"[Mock Email] To: {to}, Code: {code}")
        return

    subject = f"【{APP_NAME_ZH}】你的验证码"
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>验证码</title></head>
<body style="font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #f8fafc; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 30px auto; padding: 20px; background: #fff; border-radius: 8px;">
        <div style="font-size: 22px; font-weight: 700; color: #22c55e; text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">{APP_NAME_ZH}</div>
        <div style="padding: 30px 20px; color: #333; font-size: 16px; line-height: 1.6;">
            <p>你的验证码为：</p>
            <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; color: #22c55e;">{code}</p>
            <p style="font-size: 14px; color: #666;">验证码 <strong>5分钟内有效</strong>，请勿泄露给他人。</p>
        </div>
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 12px; color: #999;">© 2026 {APP_NAME}</div>
    </div>
</body>
</html>"""

    try:
        _send_smtp(to, subject, html)
        logger.info(f"OTP email sent to {to}")
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to}: {e}")
        raise


def send_deletion_email(to: str, nickname: str, delete_link: str) -> None:
    if config.email_provider == "mock":
        logger.info(f"[Mock Email] Deletion confirm link for {to}: {delete_link}")
        return

    subject = f"【{APP_NAME_ZH}】账号注销确认"
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>账号注销确认</title>
<style>
    body {{font-family: "PingFang SC", "Microsoft YaHei", sans-serif; margin: 0; padding: 0; background-color: #f8fafc;}}
    .container {{max-width: 600px; margin: 30px auto; padding: 20px; background-color: #ffffff; border-radius: 8px;}}
    .header {{text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;}}
    .logo {{font-size: 22px; font-weight: 700; color: #22c55e;}}
    .content {{padding: 30px 20px; line-height: 1.6; color: #333333; font-size: 16px;}}
    .warn-box {{background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px 16px; margin: 20px 0; color: #c2410c; font-size: 14px;}}
    .delete-btn {{display: block; width: 80%; max-width: 300px; height: 48px; line-height: 48px;
                  background-color: #ef4444; color: #ffffff !important; text-align: center;
                  border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600; margin: 30px auto;}}
    .link-box {{word-break: break-all; font-size: 13px; color: #666; padding: 10px; background: #f5f5f5; border-radius: 4px;}}
    .tips {{font-size: 14px; color: #666666; line-height: 1.5; margin-top: 20px;}}
    .footer {{text-align: center; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 12px; color: #999999;}}
</style>
</head>
<body>
    <div class="container">
        <div class="header"><div class="logo">{APP_NAME_ZH}</div></div>
        <div class="content">
            <p>Hi {nickname}，</p>
            <p>我们收到了您的账号注销申请。点击下方按钮将<strong>永久删除</strong>您的账号及所有相关数据。</p>
            <div class="warn-box">
                ⚠️ 此操作不可逆！您的所有聊天记录、设置及账号信息将被永久删除，且无法恢复。
            </div>
            <a href="{delete_link}" class="delete-btn" target="_blank">确认注销账号</a>
            <p class="tips">如果按钮无法点击，请复制下方链接到浏览器中打开：</p>
            <div class="link-box">{delete_link}</div>
            <p class="tips">⚠️ 注销链接 <strong>1小时内有效</strong>，且仅可使用1次。</p>
            <p class="tips">如果您没有申请注销账号，请忽略此邮件，您的账号不会受到任何影响。</p>
            <p style="text-align: right; margin-top: 30px;">{APP_NAME_ZH} 团队</p>
        </div>
        <div class="footer"><p>© 2026 {APP_NAME}</p></div>
    </div>
</body>
</html>"""

    try:
        _send_smtp(to, subject, html)
        logger.info(f"Deletion confirmation email sent to {to}")
    except Exception as e:
        logger.error(f"Failed to send deletion email to {to}: {e}")
        raise


def send_password_reset_email(to: str, nickname: str, reset_link: str) -> None:
    if config.email_provider == "mock":
        logger.info(f"[Mock Email] Password reset link for {to}: {reset_link}")
        return

    subject = f"【{APP_NAME_ZH}】重置你的密码"
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{APP_NAME_ZH} 密码重置</title>
<style>
    body {{font-family: "PingFang SC", "Microsoft YaHei", sans-serif; margin: 0; padding: 0; background-color: #f8fafc;}}
    .container {{max-width: 600px; margin: 30px auto; padding: 20px; background-color: #ffffff; border-radius: 8px;}}
    .header {{text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;}}
    .logo {{font-size: 22px; font-weight: 700; color: #22c55e;}}
    .content {{padding: 30px 20px; line-height: 1.6; color: #333333; font-size: 16px;}}
    .reset-btn {{display: block; width: 80%; max-width: 300px; height: 48px; line-height: 48px;
                 background-color: #3b82f6; color: #ffffff !important; text-align: center;
                 border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600; margin: 30px auto;}}
    .link-box {{word-break: break-all; font-size: 13px; color: #666; padding: 10px; background: #f5f5f5; border-radius: 4px;}}
    .tips {{font-size: 14px; color: #666666; line-height: 1.5; margin-top: 20px;}}
    .footer {{text-align: center; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 12px; color: #999999;}}
</style>
</head>
<body>
    <div class="container">
        <div class="header"><div class="logo">{APP_NAME_ZH}</div></div>
        <div class="content">
            <p>Hi {nickname}，</p>
            <p>我们收到了您的密码重置申请。点击下方按钮设置新密码。</p>
            <a href="{reset_link}" class="reset-btn" target="_blank">重置密码</a>
            <p class="tips">如果按钮无法点击，请复制下方链接到浏览器中打开：</p>
            <div class="link-box">{reset_link}</div>
            <p class="tips">⚠️ 重置链接 <strong>1小时内有效</strong>，且仅可使用1次，请勿转发给他人。</p>
            <p class="tips">如果您没有申请重置密码，请直接忽略此邮件，您的账号密码不会发生任何变化。</p>
            <p style="text-align: right; margin-top: 30px;">{APP_NAME_ZH} 团队</p>
        </div>
        <div class="footer"><p>© 2026 {APP_NAME}</p></div>
    </div>
</body>
</html>"""

    try:
        _send_smtp(to, subject, html)
        logger.info(f"Password reset email sent to {to}")
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to}: {e}")
        raise


def send_sms_code(phone: str, code: str) -> None:
    if config.sms_provider == "mock":
        logger.info(f"[Mock SMS] To: {phone}, Code: {code}")
        return
    # TODO: integrate Twilio or Aliyun SMS
