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
    try:
        if not Config.GEMINI_API_KEY:
            raise ValueError("No Gemini API key configure")
        model = genai.GenerativeModel(Config.GEMINI_MODEL_NAME, generation_config={"response_mime_type": "application/json"})
        response = model.generate_content(
            f"Act as a system architect. Generate a JSON graph for a connected form workflow based on this prompt: '{req.prompt}'. "
            f"CRITICAL RULES: "
            f"1) You MUST return a JSON object containing two arrays: 'nodes' and 'edges'. "
            f"2) You MUST include AT LEAST one conditional branching rule connecting diverging logic. "
            f"3) Nodes represent form fields. Schema: id, position (x,y map spacing them out horizontally), data (label, type, options (if applicable), is_required). "
            f"Valid Types: short_answer, long_answer, number, dropdown, radio, rating, date_range, file, button, custom_button. "
            f"4) Edges represent conditional flows. Schema: id, source (node_id), target (node_id), label (the condition under which this triggers, like 'If Yes' or 'Default Flow'). "
            f"RETURN ONLY VALID JSON."
        )
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        return {"schema": raw_text}
    except Exception as e:
        print(f"AI Generation Failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-theme")
async def generate_form_theme(req: AIRequest):
    try:
        if not Config.GEMINI_API_KEY:
            raise ValueError("No Gemini API key")
        model = genai.GenerativeModel(Config.GEMINI_MODEL_NAME, generation_config={"response_mime_type": "application/json"})
        response = model.generate_content(
            f"Act as a master web designer. Given this prompt, generate a JSON object for a Neo-brutalist theme. "
            f"Prompt: '{req.prompt}'. "
            f"Return ONLY valid JSON with keys: primary_color (hex), background (hex), text_color (hex), font_family (string), border_radius (integer)."
        )
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        return {"schema": raw_text}
    except Exception as e:
        print(f"Theme Generation Failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))
