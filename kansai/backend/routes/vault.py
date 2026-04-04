from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.orm import Session
from database.database import get_db
from models.models import Form, Response
import csv
import io
import json

router = APIRouter(prefix="/vault", tags=["Vault Dashboard"])

@router.get("/form/{form_id}/responses")
def get_responses(form_id: int, db: Session = Depends(get_db)):
    responses = db.query(Response).filter(Response.form_id == form_id).all()
    return responses

@router.get("/form/{form_id}/export/csv")
def export_csv(form_id: int, db: Session = Depends(get_db)):
    responses = db.query(Response).filter(Response.form_id == form_id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Extract unique keys from all submission data across responses
    dynamic_keys = set()
    for r in responses:
        if isinstance(r.submission_data, dict):
            dynamic_keys.update(r.submission_data.keys())
    
    dynamic_keys = sorted(list(dynamic_keys))
    headers = ["Response ID", "Submitted At", "Status"] + dynamic_keys
    writer.writerow(headers)
    
    for r in responses:
        row = [r.id, r.submitted_at.isoformat() if r.submitted_at else '', r.submission_status]
        for key in dynamic_keys:
            data_dict = r.submission_data if isinstance(r.submission_data, dict) else {}
            row.append(str(data_dict.get(key, '')))
        writer.writerow(row)
        
    response = FastAPIResponse(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=form_{form_id}_export.csv"
    return response

@router.get("/form/{form_id}/export/json")
def export_json(form_id: int, db: Session = Depends(get_db)):
    responses = db.query(Response).filter(Response.form_id == form_id).all()
    data = [r.submission_data for r in responses]
    
    response = FastAPIResponse(content=json.dumps(data), media_type="application/json")
    response.headers["Content-Disposition"] = f"attachment; filename=form_{form_id}_export.json"
    return response
