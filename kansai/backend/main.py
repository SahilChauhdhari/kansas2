from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.database import engine
import models.models as models

# Initialize FastAPI App
app = FastAPI(title="Scriba API", description="Form Builder Backend", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routes
from routes import workshop, stage, ai, vault, analytics, auth
from websocket.collaboration import router as ws_router

app.include_router(workshop.router)
app.include_router(stage.router)
app.include_router(ai.router)
app.include_router(vault.router)
app.include_router(analytics.router)
app.include_router(auth.router)
app.include_router(ws_router)

@app.get("/")
def read_root():
    return {"message": "Scriba API is running."}

@app.on_event("startup")
def on_startup():
    print("Starting up Scriba API...")
    try:
        # Create database tables if Postgres is securely connected
        models.Base.metadata.create_all(bind=engine)
        print("Database connected and tables initialized.")
    except Exception as e:
        print(f"Postgres Database Offline - WebSockets will remain active: {e}")

