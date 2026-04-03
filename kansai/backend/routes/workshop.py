from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
import json
import uuid

from database.database import get_db
from models.models import Form, User
import cloudinary
import cloudinary.uploader
from config import Config

if Config.CLOUDINARY_API_KEY:
    cloudinary.config(
        cloud_name=Config.CLOUDINARY_CLOUD_NAME,
        api_key=Config.CLOUDINARY_API_KEY,
        api_secret=Config.CLOUDINARY_API_SECRET
    )

router = APIRouter(prefix="/workshop", tags=["Workshop"])

@router.get("/forms")
def get_forms(db: Session = Depends(get_db)):
    forms = db.query(Form).all()
    return forms

@router.post("/forms")
def create_form(form_data: dict, db: Session = Depends(get_db)):
    # Mock user 1 for simplicity
    user = db.query(User).first()
    if not user:
        user = User(email="admin@test.com", username="admin", password_hash="hash")
        db.add(user)
        db.commit()

    new_form = Form(
        slug=f"form-{uuid.uuid4().hex[:8]}",
        title=form_data.get("title", "Untitled Form"),
        description=form_data.get("description", ""),
        fields=form_data.get("fields", []),
        field_order=form_data.get("field_order", []),
        created_by=user.id
    )
    db.add(new_form)
    db.commit()
    db.refresh(new_form)
    return new_form

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Cloudinary Integration
    if Config.CLOUDINARY_API_KEY:
        try:
            result = cloudinary.uploader.upload(file.file)
            return {
                "url": result.get("secure_url"),
                "filename": file.filename
            }
        except Exception as e:
            return {"error": str(e)}
            
    # Mock Cloudinary/S3 Integration fallback
    return {
        "url": f"https://mock-cloudinary.com/{file.filename}",
        "filename": file.filename
    }
