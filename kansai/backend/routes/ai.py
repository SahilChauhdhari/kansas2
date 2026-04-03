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
                {"id": "gen_1", "type": "text", "label": "Full Name", "is_required": True},
                {"id": "gen_2", "type": "email", "label": "Email Address", "is_required": True}
            ]
        }
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(
            f"Create a JSON array of form fields based on this prompt: '{req.prompt}'. "
            f"Use the schema: id (random string), type (text, textarea, email, select, etc), label, options (if select/radio), and is_required."
        )
        return {"schema": response.text}
    except Exception as e:
        return {"error": str(e)}

@router.post("/generate-theme")
async def generate_form_theme(req: AIRequest):
    if not Config.GEMINI_API_KEY:
        # Return Neo-brutalist mock
        return {
            "theme": {
               "primary_color": "#000000",
               "background": "#ffbe0b",
               "text_color": "#000000",
               "font_family": "monospace",
               "border_radius": 0
            }
        }
        
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(
            f"Act as a master web designer. Given this prompt, generate a JSON object for a Neo-brutalist theme. "
            f"Prompt: '{req.prompt}'. "
            f"Return ONLY valid JSON with keys: primary_color (hex), background (hex), text_color (hex), font_family (string), border_radius (integer)."
        )
        return {"schema": response.text}
    except Exception as e:
        return {"error": str(e)}
