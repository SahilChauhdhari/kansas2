from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.database import get_db
from models.models import Analytics, Form
from pydantic import BaseModel
import datetime

router = APIRouter(prefix="/analytics", tags=["Analytics"])

class EventData(BaseModel):
    event_type: str
    metadata: dict = {}

@router.post("/form/{form_id}/event")
def log_event(form_id: int, event: EventData, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    db_event = Analytics(
        form_id=form.id,
        event_type=event.event_type,
        event_metadata=event.metadata
    )
    db.add(db_event)
    db.commit()
    return {"status": "logged"}

@router.get("/form/{form_id}/metrics")
def get_metrics(form_id: int, db: Session = Depends(get_db)):
    events = db.query(Analytics).filter(Analytics.form_id == form_id).all()
    
    views = sum(1 for e in events if e.event_type == 'view')
    starts = sum(1 for e in events if e.event_type == 'start')
    completions = sum(1 for e in events if e.event_type == 'complete')
    
    conversion_rate = 0
    if views > 0:
        conversion_rate = round((completions / views) * 100, 2)
        
    return {
        "views": views,
        "starts": starts,
        "completions": completions,
        "conversion_rate": conversion_rate,
        "raw_events": len(events)
    }
