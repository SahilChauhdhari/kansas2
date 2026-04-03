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
        # Mock Graph Structure
        return {
            "schema": '{"nodes": [{"id": "n1", "position": {"x": 100, "y": 100}, "data": {"label": "Are you stressed?", "type": "select", "options": ["Yes", "No"]}}, {"id": "n2", "position": {"x": 400, "y": 50}, "data": {"label": "Why?", "type": "short_answer"}}, {"id": "n3", "position": {"x": 400, "y": 150}, "data": {"label": "Any goals?", "type": "short_answer"}}], "edges": [{"id": "e1-2", "source": "n1", "target": "n2", "label": "If Yes"}, {"id": "e1-3", "source": "n1", "target": "n3", "label": "If No"}]}'
        }
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(
            f"Act as a system architect. Generate a JSON graph for a connected form workflow based on this prompt: '{req.prompt}'. "
            f"CRITICAL RULES: "
            f"1) You MUST return a JSON object containing two arrays: 'nodes' and 'edges'. "
            f"2) You MUST include AT LEAST one conditional branching rule connecting diverging logic. "
            f"3) Nodes represent form fields. Schema: id, position (x,y map spacing them out horizontally), data (label, type (short_answer, long_answer, select, email), options (if select), is_required). "
            f"4) Edges represent conditional flows. Schema: id, source (node_id), target (node_id), label (the condition under which this triggers, like 'If Yes' or 'Default Flow'). "
            f"RETURN ONLY VALID JSON."
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
