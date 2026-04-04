from fastapi.testclient import TestClient
from main import app
import traceback

client = TestClient(app)
try:
    response = client.post("/auth/login", data={"username": "test", "password": "test"})
    print("STATUS", response.status_code)
    print("TEXT", response.text)
except Exception as e:
    with open('error_fastapi.txt', 'w', encoding='utf-8') as f:
        traceback.print_exc(file=f)
