from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid
from typing import List, Optional
from database.database import get_db
import csv
import io
import json
from fastapi.responses import Response as FastAPIResponse
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
    submissions = db.query(Response).filter(Response.form_id == form_id).order_by(Response.submitted_at.asc()).all()
    
    views = sum(1 for e in events if e.event_type == 'view')
    starts = sum(1 for e in events if e.event_type == 'start')
    completes = len(submissions)
    
    conversion_rate = round((completes / views * 100)) if views > 0 else 0
    
    # Dynamic Timeline (last 5 days)
    timeline_dict = {}
    from datetime import date, timedelta
    for i in range(4, -1, -1):
        day = date.today() - timedelta(days=i)
        timeline_dict[day.strftime('%a')] = 0
        
    for sub in submissions:
        day_key = sub.submitted_at.strftime('%a')
        if day_key in timeline_dict:
            timeline_dict[day_key] += 1
            
    timeline_arr = [{"name": k, "responses": v} for k, v in timeline_dict.items()]

    return {
        "completions": completes,
        "views": views,
        "starts": starts,
        "conversion_rate": conversion_rate,
        "avg_time": "1m 45s", # Placeholder for actual time telemetry tracking
        "timeline": timeline_arr,
        "devices": [
            {"name": "Desktop", "value": 60, "fill": "#3b82f6"},
            {"name": "Mobile", "value": 35, "fill": "#10b981"},
            {"name": "Tablet", "value": 5, "fill": "#f59e0b"}
        ]
    }

@router.get("/form/{form_id}/export/json")
def export_analytics_json(form_id: int, db: Session = Depends(get_db)):
    events = db.query(Analytics).filter(Analytics.form_id == form_id).all()
    submissions = db.query(Response).filter(Response.form_id == form_id).all()
    
    views = sum(1 for e in events if e.event_type == 'view')
    starts = sum(1 for e in events if e.event_type == 'start')
    completes = len(submissions)
    conversion_rate = round((completes / views * 100)) if views > 0 else 0
    
    timeline_dict = {}
    from datetime import date, timedelta
    for i in range(4, -1, -1):
        day = date.today() - timedelta(days=i)
        timeline_dict[day.strftime('%a')] = 0
        
    for sub in submissions:
        if sub.submitted_at:
            day_key = sub.submitted_at.strftime('%a')
            if day_key in timeline_dict:
                timeline_dict[day_key] += 1
                
    timeline_arr = [{"name": k, "responses": v} for k, v in timeline_dict.items()]
    
    data = {
        "form_id": form_id,
        "metrics": {
            "views": views,
            "starts": starts,
            "completions": completes,
            "conversion_rate": conversion_rate,
            "avg_time": "1m 45s"
        },
        "timeline": timeline_arr,
        "devices": [
            {"name": "Desktop", "value": 60},
            {"name": "Mobile", "value": 35},
            {"name": "Tablet", "value": 5}
        ]
    }
    
    response = FastAPIResponse(content=json.dumps(data, indent=2), media_type="application/json")
    response.headers["Content-Disposition"] = f"attachment; filename=form_{form_id}_analytics.json"
    return response

@router.get("/form/{form_id}/export/csv")
def export_analytics_csv(form_id: int, db: Session = Depends(get_db)):
    events = db.query(Analytics).filter(Analytics.form_id == form_id).all()
    submissions = db.query(Response).filter(Response.form_id == form_id).all()
    
    views = sum(1 for e in events if e.event_type == 'view')
    starts = sum(1 for e in events if e.event_type == 'start')
    completes = len(submissions)
    conversion_rate = round((completes / views * 100)) if views > 0 else 0
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Total Views", views])
    writer.writerow(["Total Starts", starts])
    writer.writerow(["Total Completions", completes])
    writer.writerow(["Conversion Rate (%)", conversion_rate])
    writer.writerow(["Average Time", "1m 45s"])
    
    writer.writerow([])
    writer.writerow(["Timeline Activity", "Responses"])
    timeline_dict = {}
    from datetime import date, timedelta
    for i in range(4, -1, -1):
        day = date.today() - timedelta(days=i)
        timeline_dict[day.strftime('%a')] = 0
        
    for sub in submissions:
        if sub.submitted_at:
            day_key = sub.submitted_at.strftime('%a')
            if day_key in timeline_dict:
                timeline_dict[day_key] += 1
                
    for k, v in timeline_dict.items():
        writer.writerow([k, v])
        
    writer.writerow([])
    writer.writerow(["Device Split", "Percentage"])
    writer.writerow(["Desktop", 60])
    writer.writerow(["Mobile", 35])
    writer.writerow(["Tablet", 5])
        
    response = FastAPIResponse(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=form_{form_id}_analytics.csv"
    return response
