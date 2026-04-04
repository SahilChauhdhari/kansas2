import requests
import json

def test_ai_generate():
    url = "http://localhost:8001/ai/generate-form"
    payload = {"prompt": "Short test form"}
    
    try:
        response = requests.post(url, json=payload)
        data = response.json()
        print("Raw schema:", data["schema"])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ai_generate()
