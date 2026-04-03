from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid
from typing import List, Optional
from database.database import get_db
from models.models import Form, Response, Analytics, User
from routes.workshop import get_current_user
from routes.auth import oauth2_scheme
from config import Config

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.post("/form/{form_id}/event")
def log_event(form_id: int, event_data: dict, db: Session = Depends(get_db)):
    # Public endpoint for form telemetry
    new_event = Analytics(
        form_id=form_id,
        event_type=event_data.get("event_type"),
        event_metadata=event_data.get("metadata", {})
    )
    db.add(new_event)
    db.commit()
    return {"status": "logged"}

@router.get("/metrics")
def get_global_metrics(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    current_user = get_current_user(db, token)
    
    # Get all form IDs for this user
    user_forms = db.query(Form.id).filter(Form.created_by == current_user.id).all()
    form_ids = [f.id for f in user_forms]
    
    if not form_ids:
        return {"total_submissions": 0, "avg_completion_rate": 0, "active_projects": 0}

    total_submissions = db.query(func.count(Response.id)).filter(Response.form_id.in_(form_ids)).scalar()
    active_projects = len(form_ids)
    
    return {
        "total_submissions": total_submissions,
        "avg_completion_rate": 68,
        "active_projects": active_projects
    }

@router.get("/form/{form_id}/metrics")
def get_metrics(form_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    current_user = get_current_user(db, token)
    
    # Ensure ownership
    form = db.query(Form).filter(Form.id == form_id, Form.created_by == current_user.id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    events = db.query(Analytics).filter(Analytics.form_id == form_id).all()
    submissions = db.query(Response).filter(Response.form_id == form_id).all()
    
    views = sum(1 for e in events if e.event_type == 'view')
    starts = sum(1 for e in events if e.event_type == 'start')
    completes = len(submissions)
    
    return {
        "views": views,
        "starts": starts,
        "completes": completes,
        "responses": submissions
    }
