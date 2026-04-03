import os
from functools import wraps
from typing import Any
from pathlib import Path
from dotenv import load_dotenv
from decouple import config, Csv
from sqlalchemy import create_engine

load_dotenv()

# Pre-compute values so they are easy to use in logic
_db_url = os.getenv("DATABASE_URL", "sqlite:///./formflow.db")
_db_pool_size = int(os.getenv("DATABASE_POOL_SIZE", "5"))
_db_max_overflow = int(os.getenv("DATABASE_MAX_OVERFLOW", "20"))

_engine_kwargs = {}
if _db_url.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_size"] = _db_pool_size
    _engine_kwargs["max_overflow"] = _db_max_overflow

class Config:
    """Application configuration with environment variables."""

    # Development settings
    ENV = os.getenv("ENV", "development")
    DEBUG = ENV != "production"

    # Database
    DATABASE_URL = _db_url
    DATABASE_POOL_SIZE = _db_pool_size
    DATABASE_MAX_OVERFLOW = _db_max_overflow
    ENGINE = create_engine(_db_url, **_engine_kwargs)

    # Cloudinary
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "your-cloud-name")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
    CLOUDINARY_UPLOAD_PRESET = os.getenv("CLOUDINARY_UPLOAD_PRESET", "public")

    # Gemini API
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    # WebSocket
    WEBSOCKET_HOST = os.getenv("WEBSOCKET_HOST", "localhost")
    WEBSOCKET_PORT = int(os.getenv("WEBSOCKET_PORT", "8080"))
    WEBSOCKET_RECONNECT_DELAY = int(os.getenv("WEBSOCKET_RECONNECT_DELAY", "5000"))

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "9a2b5c7d8e1f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f0a3b6c9d2e5f8a1b")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))

    # File uploads
    FILE_UPLOAD_MAX_SIZE = int(os.getenv("FILE_UPLOAD_MAX_SIZE", "10485760"))  # 10MB
    ALLOWED_EXTENSIONS = Csv(os.getenv("ALLOWED_EXTENSIONS", "jpg,jpeg,png,gif,mp4,pdf").split(','))
