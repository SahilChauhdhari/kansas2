from fastapi import APIRouter
from pydantic import BaseModel
import google.generativeai as genai
from config import Config

router = APIRouter(prefix="/ai", tags=["AI Generation"])

# Configure Gemini AI if Key is present
if Config.GEMINI_API_KEY:
    genai.configure(api_key=Config.GEMINI_API_KEY)

class AIRequest(BaseModel):
    prompt: str

@router.post("/generate-form")
async def generate_form_schema(req: AIRequest):
    if not Config.GEMINI_API_KEY:
        # Return mock data if not configured
        return {
            "title": "Generated Form",
            "fields": [
                {"field_type": "text", "field_label": "Name", "is_required": True},
                {"field_type": "email", "field_label": "Email Address", "is_required": True}
            ]
        }
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(
            f"Create a JSON array of form fields based on this prompt: '{req.prompt}'. "
            f"Use the schema: field_type (text, email, select, etc), field_label, options (if select/radio), and is_required."
        )
        # Attempt to parse json from response
        return {"schema": response.text}
    except Exception as e:
        return {"error": str(e)}
