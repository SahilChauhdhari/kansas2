from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
import json
import uuid

from database.database import get_db
from models.models import Form, User

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
    # Mock Cloudinary/S3 Integration
    # Real integration would use `cloudinary.uploader.upload(file.file)`
    return {
        "url": f"https://mock-cloudinary.com/{file.filename}",
        "filename": file.filename
    }
