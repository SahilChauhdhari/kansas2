from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session, joinedload
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

from routes.auth import oauth2_scheme, TokenData
from jose import jwt, JWTError

def get_current_user(db: Session, token: str):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@router.get("/forms")
def get_forms(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    current_user = get_current_user(db, token)
    forms = db.query(Form).filter(Form.created_by == current_user.id).all()
    return forms

@router.get("/forms/{form_id}")
def get_form(form_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    current_user = get_current_user(db, token)
    form = db.query(Form).filter(Form.id == form_id, Form.created_by == current_user.id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form

@router.post("/forms")
def create_form(form_data: dict, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    current_user = get_current_user(db, token)
    
    new_form = Form(
        slug=f"{uuid.uuid4().hex[:12]}",
        title=form_data.get("title", "Untitled Form"),
        description=form_data.get("description", "A brand new FormFlow project."),
        fields=[],
        field_order=[],
        created_by=current_user.id
    )
    db.add(new_form)
    db.commit()
    db.refresh(new_form)
    return new_form

@router.put("/forms/{form_id}")
def update_form(form_id: int, form_data: dict, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    current_user = get_current_user(db, token)
    form = db.query(Form).filter(Form.id == form_id, Form.created_by == current_user.id).first()
    
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Update fields if provided
    if "title" in form_data:
        form.title = form_data["title"]
    if "description" in form_data:
        form.description = form_data["description"]
    
    # Map React Flow nodes/edges to Form fields/field_order
    if "nodes" in form_data:
        form.fields = form_data["nodes"]
    elif "fields" in form_data:
        form.fields = form_data["fields"]
        
    if "edges" in form_data:
        form.field_order = form_data["edges"]
    elif "field_order" in form_data:
        form.field_order = form_data["field_order"]
        
    if "settings" in form_data:
        form.settings = form_data["settings"]
    if "theme_id" in form_data:
        form.theme_id = form_data["theme_id"]
        
    db.commit()
    db.refresh(form)
    return form

@router.delete("/forms/{form_id}")
def delete_form(form_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    current_user = get_current_user(db, token)
    form = db.query(Form).filter(Form.id == form_id, Form.created_by == current_user.id).first()
    
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    db.delete(form)
    db.commit()
    return {"status": "deleted", "id": form_id}

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
