from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import Config

engine = Config.ENGINE
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
