from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database.database import get_db
from models.models import Form, Response, Theme, Condition
import json

router = APIRouter(prefix="/stage", tags=["Stage"])

@router.get("/form/{slug}")
def fetch_form(slug: str, db: Session = Depends(get_db)):
    form = db.query(Form).options(joinedload(Form.theme), joinedload(Form.conditions_list)).filter(Form.slug == slug).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    # Serialize to ensure conditions and theme are attached for the dynamic Stage runner
    return {
        "id": form.id,
        "title": form.title,
        "description": form.description,
        "fields": form.fields,
        "theme": form.theme,
        "conditions": form.conditions_list
    }

@router.post("/form/{slug}/submit")
def submit_form(slug: str, response_data: dict, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.slug == slug).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Run simple server-side validation check
    # In a full implementation, we'd iterate through form.fields and check types/required
    if not response_data:
        raise HTTPException(status_code=400, detail="Invalid submission data")
        
    new_response = Response(
        form_id=form.id,
        submission_data=response_data,
        is_valid=True
    )
    db.add(new_response)
    db.commit()
    return {"message": "Form submitted successfully"}
