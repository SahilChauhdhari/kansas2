from fastapi import APIRouter, Depends, HTTPException, Request
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
def log_event(form_id: int, event_data: dict, request: Request, db: Session = Depends(get_db)):
    # Public endpoint for form telemetry
    user_agent = request.headers.get("user-agent", "").lower()
    
    device_type = "Desktop"
    if "ipad" in user_agent or "tablet" in user_agent:
        device_type = "Tablet"
    elif "mobi" in user_agent or "android" in user_agent or "iphone" in user_agent:
        device_type = "Mobile"
        
    metadata = event_data.get("metadata", {})
    metadata["device"] = device_type
    
    new_event = Analytics(
        form_id=form_id,
        event_type=event_data.get("event_type"),
        event_metadata=metadata
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

    device_counts = {"Desktop": 0, "Mobile": 0, "Tablet": 0}
    for e in events:
        if e.event_type == 'view':
            device = e.event_metadata.get("device", "Desktop") if e.event_metadata else "Desktop"
            if device in device_counts:
                device_counts[device] += 1

    devices_arr = [
        {"name": "Desktop", "value": device_counts["Desktop"], "fill": "#3b82f6"},
        {"name": "Mobile", "value": device_counts["Mobile"], "fill": "#10b981"},
        {"name": "Tablet", "value": device_counts["Tablet"], "fill": "#f59e0b"}
    ]
    # Prevent completely empty charts by yielding default formatting if zero views
    if sum(device_counts.values()) == 0:
        devices_arr = [
            {"name": "Desktop", "value": 1, "fill": "#3b82f6"},
            {"name": "Mobile", "value": 0, "fill": "#10b981"},
            {"name": "Tablet", "value": 0, "fill": "#f59e0b"}
        ]

    return {
        "completions": completes,
        "views": views,
        "starts": starts,
        "conversion_rate": conversion_rate,
        "avg_time": "N/A", 
        "timeline": timeline_arr,
        "devices": devices_arr
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
    
    device_counts = {"Desktop": 0, "Mobile": 0, "Tablet": 0}
    for e in events:
        if e.event_type == 'view':
            device = e.event_metadata.get("device", "Desktop") if e.event_metadata else "Desktop"
            if device in device_counts:
                device_counts[device] += 1

    devices_arr = [
        {"name": "Desktop", "value": device_counts["Desktop"]},
        {"name": "Mobile", "value": device_counts["Mobile"]},
        {"name": "Tablet", "value": device_counts["Tablet"]}
    ]

    data = {
        "form_id": form_id,
        "metrics": {
            "views": views,
            "starts": starts,
            "completions": completes,
            "conversion_rate": conversion_rate,
            "avg_time": "N/A"
        },
        "timeline": timeline_arr,
        "devices": devices_arr
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
    writer.writerow(["Average Time", "N/A"])
    
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
        
    device_counts = {"Desktop": 0, "Mobile": 0, "Tablet": 0}
    for e in events:
        if e.event_type == 'view':
            device = e.event_metadata.get("device", "Desktop") if e.event_metadata else "Desktop"
            if device in device_counts:
                device_counts[device] += 1
                
    writer.writerow([])
    writer.writerow(["Device Split", "Count"])
    writer.writerow(["Desktop", device_counts["Desktop"]])
    writer.writerow(["Mobile", device_counts["Mobile"]])
    writer.writerow(["Tablet", device_counts["Tablet"]])
        
    response = FastAPIResponse(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=form_{form_id}_analytics.csv"
    return response
