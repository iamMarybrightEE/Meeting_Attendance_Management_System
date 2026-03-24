from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="MEETING_AGENT_", extra="ignore")

    env: str = "development"
    host: str = "0.0.0.0"
    port: int = 8100
    api_prefix: str = "/v1"
    database_url: str = "sqlite:///./meeting_agent.db"
    redis_url: str = "redis://localhost:6379/0"
    storage_dir: str = "./storage"

    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    transcription_model: str = "whisper-1"

    jwt_secret: str = "dev-secret"
    jwt_algorithm: str = "HS256"
    auth_mode: str = "strict"
    max_recording_mb: int = 200
    max_top_k: int = 8
    default_top_k: int = 4
    chunk_size: int = 1200
    chunk_overlap: int = 150


settings = Settings()  # type: ignore[call-arg]
