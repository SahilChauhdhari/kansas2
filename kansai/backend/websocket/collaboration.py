from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter(prefix="/ws", tags=["Collaboration"])

class ConnectionManager:
    def __init__(self):
        # Maps form_id to a list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # History queue for UNDO / REDO mechanism (Impossible Milestone)
        self.history: Dict[str, List[dict]] = {}
        self.history_index: Dict[str, int] = {}

    async def connect(self, websocket: WebSocket, form_id: str):
        await websocket.accept()
        if form_id not in self.active_connections:
            self.active_connections[form_id] = []
            self.history[form_id] = []
            self.history_index[form_id] = -1
        self.active_connections[form_id].append(websocket)

    def disconnect(self, websocket: WebSocket, form_id: str):
        if form_id in self.active_connections:
            self.active_connections[form_id].remove(websocket)
            if not self.active_connections[form_id]:
                del self.active_connections[form_id]
                # Cleanup history when everyone leaves
                if form_id in self.history:
                    del self.history[form_id]
                    del self.history_index[form_id]

    async def broadcast(self, message: dict, form_id: str, sender: WebSocket=None):
        if form_id in self.active_connections:
            for connection in self.active_connections[form_id]:
                if connection != sender:
                    await connection.send_json(message)

    async def handle_time_travel(self, data: dict, form_id: str, sender: WebSocket):
        action_type = data.get("type")
        
        if action_type == "SCHEMA_UPDATE":
            # Trim redo futures if we mutate from the past
            cur_idx = self.history_index[form_id]
            self.history[form_id] = self.history[form_id][:cur_idx+1]
            # Track newly made action
            self.history[form_id].append(data)
            self.history_index[form_id] += 1
            await self.broadcast(data, form_id, sender)
            
        elif action_type == "UNDO":
            if self.history_index[form_id] >= 0:
                # Find the action we are undoing
                action = self.history[form_id][self.history_index[form_id]]
                self.history_index[form_id] -= 1
                await self.broadcast({"type": "UNDO_ACTION", "action": action}, form_id)
                
        elif action_type == "REDO":
            if self.history_index[form_id] < len(self.history[form_id]) - 1:
                self.history_index[form_id] += 1
                action = self.history[form_id][self.history_index[form_id]]
                await self.broadcast({"type": "REDO_ACTION", "action": action}, form_id)
                
        elif action_type == "CURSOR_MOVE":
            # Don't track cursor moves in history
            await self.broadcast(data, form_id, sender)

manager = ConnectionManager()

@router.websocket("/form/{form_id}")
async def form_collaborate(websocket: WebSocket, form_id: str):
    await manager.connect(websocket, form_id)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.handle_time_travel(data, form_id, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, form_id)
        leave_msg = {"type": "USER_DISCONNECTED"}
        await manager.broadcast(leave_msg, form_id)

