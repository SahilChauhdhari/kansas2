import requests
import json

def test_ai_generate():
    url = "http://localhost:8000/ai/generate-form"
    payload = {"prompt": "Short test form"}
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ai_generate()
