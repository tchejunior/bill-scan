from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    redis_url: str = "redis://redis:6379/0"
    anthropic_api_key: str
    storage_root: str = "/var/data/recibo42"
    storage_backend: str = "local"

    class Config:
        env_file = ".env"


settings = Settings()
