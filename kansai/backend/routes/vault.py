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
    # In a dynamic form, the columns would depend on the schema.
    # For now, we will just dump the JSON blob as a string or flat it out.
    writer = csv.writer(output)
    writer.writerow(["Response ID", "Submitted At", "Data", "Status"])
    
    for r in responses:
        writer.writerow([r.id, r.submitted_at, json.dumps(r.submission_data), r.submission_status])
        
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
