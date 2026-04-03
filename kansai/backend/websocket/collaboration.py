from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter(prefix="/ws", tags=["Collaboration"])

class ConnectionManager:
    def __init__(self):
        # Maps form_id to a list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, form_id: str):
        await websocket.accept()
        if form_id not in self.active_connections:
            self.active_connections[form_id] = []
        self.active_connections[form_id].append(websocket)

    def disconnect(self, websocket: WebSocket, form_id: str):
        if form_id in self.active_connections:
            self.active_connections[form_id].remove(websocket)
            if not self.active_connections[form_id]:
                del self.active_connections[form_id]

    async def broadcast(self, message: dict, form_id: str, sender: WebSocket):
        if form_id in self.active_connections:
            for connection in self.active_connections[form_id]:
                if connection != sender:
                    await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/form/{form_id}")
async def form_collaborate(websocket: WebSocket, form_id: str):
    await manager.connect(websocket, form_id)
    try:
        while True:
            # We expect JSON payloads containing cursor movements and schema changes
            data = await websocket.receive_json()
            
            # e.g., data = {"type": "CURSOR_MOVE", "admin_id": 1, "coordinates": {"x": 120, "y": 300}}
            # e.g., data = {"type": "SCHEMA_UPDATE", "mutations": [...]}
            
            await manager.broadcast(data, form_id, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, form_id)
        leave_msg = {"type": "USER_DISCONNECTED"}
        await manager.broadcast(leave_msg, form_id, websocket)
