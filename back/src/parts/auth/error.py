from libs.http_exception import BaseHTTPError


class InvalidEmailError(BaseHTTPError):
    error_code = "AUTH001:invalid_email"
    description = "邮箱地址无效"
    code = 400


class PasswordMismatchError(BaseHTTPError):
    error_code = "AUTH002:password_mismatch"
    description = "密码不匹配"
    code = 400


class InvalidTokenError(BaseHTTPError):
    error_code = "AUTH003:invalid_or_expired_token"
    description = "Token无效或者已经过期"
    code = 400


class PasswordResetRateLimitExceededError(BaseHTTPError):
    error_code = "AUTH004:password_reset_rate_limit_exceeded"
    description = "忘记密码邮件太频繁，请稍后重试"
    code = 410
