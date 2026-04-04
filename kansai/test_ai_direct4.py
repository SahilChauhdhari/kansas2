import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv("backend/.env", override=True)
KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=KEY)

model = genai.GenerativeModel('gemini-2.5-flash')
try:
    response = model.generate_content("Hello! Give me a small valid JSON response containing {'a': 1}.")
    print("Response text:", response.text)
except Exception as e:
    print("Exception details:", type(e).__name__, str(e))
