from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

_KNOWN_WEAK_KEYS = {
    "change-this-to-a-random-64-char-string",
    "REPLACE_WITH_64_CHAR_RANDOM_SECRET",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", secrets_dir="/run/secrets")

    database_url: str
    secret_key: str
    redis_url: str = "redis://redis:6379/0"
    anthropic_api_key: str
    storage_root: str = "/var/data/recibo42"
    storage_backend: str = "local"
    cookie_secure: bool = True

    @field_validator("secret_key")
    @classmethod
    def _require_strong_key(cls, v: str) -> str:
        if len(v) < 32 or v in _KNOWN_WEAK_KEYS:
            raise ValueError(
                "SECRET_KEY must be a secure random string of at least 32 characters. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v


settings = Settings()
