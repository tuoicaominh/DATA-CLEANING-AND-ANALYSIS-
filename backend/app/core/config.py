from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://data_cleaning:123@127.0.0.1:5433/DATA_CLEANING"
    jwt_secret_key: str
    jwt_access_token_minutes: int = 60

    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
