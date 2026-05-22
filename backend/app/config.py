from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str
    secret_key: str
    redis_url: str = "redis://redis:6379/0"
    anthropic_api_key: str
    storage_root: str = "/var/data/recibo42"
    storage_backend: str = "local"


settings = Settings()
