'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWebSocket } from '@/hooks/useWebSocket';

type Field = { id: string; type: string; label: string };
type Cursor = { id: string; x: number; y: number };

export default function Workshop() {
  const [fields, setFields] = useState<Field[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, Cursor>>({});
  const [aiPrompt, setAiPrompt] = useState('');
  
  // Hardcoded form id 'demo-1' for example purposes.
  const { sendMessage, lastMessage, isConnected } = useWebSocket('ws://localhost:8000/ws/form/demo-1');
  const myId = useRef(Math.random().toString(36).substring(7));

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'CURSOR_MOVE') {
      if (lastMessage.clientId !== myId.current) {
        setRemoteCursors(prev => ({
          ...prev,
          [lastMessage.clientId]: { id: lastMessage.clientId, x: lastMessage.x, y: lastMessage.y }
        }));
      }
    } else if (lastMessage.type === 'SCHEMA_UPDATE') {
      setFields(lastMessage.fields);
    } else if (lastMessage.type === 'UNDO_ACTION' || lastMessage.type === 'REDO_ACTION') {
      if (lastMessage.action && lastMessage.action.fields) {
          setFields(lastMessage.action.fields);
      }
    } else if (lastMessage.type === 'USER_DISCONNECTED') {
       // Ideally we clear removed cursor, skipping for brevity
    }
  }, [lastMessage]);

  // Track My Cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isConnected) return;
      sendMessage({ type: 'CURSOR_MOVE', clientId: myId.current, x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isConnected, sendMessage]);

  // Handle Keyboard Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          sendMessage({ type: 'REDO' });
        } else {
          sendMessage({ type: 'UNDO' });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sendMessage]);

  // Execute Schema Update
  const dispatchSchemaUpdate = (newFields: Field[]) => {
    setFields(newFields);
    sendMessage({ type: 'SCHEMA_UPDATE', fields: newFields });
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('fieldType', type);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('fieldType');
    if (!type) return;
    
    const newField = { id: Math.random().toString(), type, label: `New ${type} field` };
    dispatchSchemaUpdate([...fields, newField]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Generate via AI
  const handleAIGenerate = async () => {
    try {
      const response = await fetch('http://localhost:8000/ai/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await response.json();
      if (data.schema) {
         // Naive parse for demo - assuming structure works with basic fallback
         const parsed = JSON.parse(data.schema);
         dispatchSchemaUpdate(parsed);
      } else if (data.fields) {
         dispatchSchemaUpdate(data.fields);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar Tooling */}
      <div style={{ width: '300px', borderRight: 'var(--border-width) solid var(--primary)', padding: '2rem', background: 'var(--secondary)' }}>
        <h2>Workshop</h2>
        <div style={{ margin: '1rem 0' }}>
            <span style={{color: isConnected ? 'green' : 'red', fontWeight: 'bold'}}>
               {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </span>
        </div>
        <p>Drag tools to the canvas to build.</p>
        
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {['text', 'email', 'dropdown', 'file'].map(type => (
            <div 
              key={type} 
              draggable 
              onDragStart={(e) => handleDragStart(e, type)}
              style={{ border: '2px solid black', padding: '1rem', cursor: 'grab', background: '#e0e0e0', fontWeight: 'bold' }}
            >
              {type.toUpperCase()} Component
            </div>
          ))}
        </div>

        <div style={{ marginTop: '3rem', borderTop: '2px solid black', paddingTop: '1rem' }}>
           <h3>AI Generator</h3>
           <textarea 
             placeholder="Describe the form you want..." 
             style={{width: '100%', padding: '0.5rem', border: '2px solid black'}}
             value={aiPrompt}
             onChange={e => setAiPrompt(e.target.value)}
           />
           <button onClick={handleAIGenerate} className="btn btn-primary" style={{marginTop: '0.5rem', width: '100%'}}>
              Generate & Inject
           </button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        onDrop={handleDrop} 
        onDragOver={handleDragOver}
        style={{ flex: 1, padding: '4rem', position: 'relative', overflowY: 'auto' }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', border: '4px solid black', background: 'white', padding: '2rem', minHeight: '500px', boxShadow: '8px 8px 0 rgba(0,0,0,0.2)' }}>
          {fields.length === 0 ? (
             <h3 style={{color: '#999', textAlign: 'center', marginTop: '10rem'}}>Drop fields here...</h3>
          ) : (
            fields.map((field, idx) => (
              <div key={idx} style={{ marginBottom: '1.5rem', border: '1px solid #ccc', padding: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>{field.label || field.type}</label>
                {field.type === 'dropdown' ? (
                  <select style={{width:'100%', padding:'0.5rem'}}><option>Select...</option></select>
                ) : (
                  <input type={field.type} style={{width:'100%', padding:'0.5rem'}} disabled />
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Remote Cursors Overlay */}
        {Object.values(remoteCursors).map((cursor) => (
          <div key={cursor.id} style={{
            position: 'fixed',
            left: cursor.x,
            top: cursor.y,
            pointerEvents: 'none',
            zIndex: 9999
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--accent)" stroke="black" strokeWidth="2">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            </svg>
            <span style={{ background: 'var(--accent)', color: 'white', padding: '2px 6px', fontSize: '10px', borderRadius: '4px', border: '1px solid black' }}>
              Admin-{cursor.id}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
