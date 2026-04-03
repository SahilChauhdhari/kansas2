import os
import sys

# Add the current directory to sys.path to import local modules
sys.path.append(os.getcwd())

from config import Config
from sqlalchemy import create_engine
from models.models import Base

print(f"Testing DB connection to: {Config.DATABASE_URL}")

try:
    engine = create_engine(
        Config.DATABASE_URL,
        connect_args={"check_same_thread": False} if Config.DATABASE_URL.startswith("sqlite") else {}
    )
    print("Engine created. Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")
except Exception as e:
    print(f"Error during DB initialization: {e}")
    sys.exit(1)
