from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import Config

engine = create_engine(Config.DATABASE_URL, pool_size=Config.DATABASE_POOL_SIZE, max_overflow=Config.DATABASE_MAX_OVERFLOW)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
