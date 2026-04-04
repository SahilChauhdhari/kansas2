import os
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env", override=True)
KEY = os.getenv("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={KEY}"
payload = {
    "contents": [{"parts": [{"text": "Hello, valid JSON {'a': 1}"}]}]
}
res = requests.post(url, json=payload)
print(res.status_code)
print(res.text)
