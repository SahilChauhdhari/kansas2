'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWebSocket } from '@/hooks/useWebSocket';

type Field = { id: string; type: string; label: string };
type Cursor = { id: string; x: number; y: number };
type ThemeConfig = { primary_color: string; background: string; font_family: string; border_radius: number };
type FormSettings = { gamification: boolean };

export default function Workshop() {
  const [fields, setFields] = useState<Field[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, Cursor>>({});
  const [aiPrompt, setAiPrompt] = useState('');
  const [aestheticPrompt, setAestheticPrompt] = useState('');
  
  const [theme, setTheme] = useState<ThemeConfig>({ primary_color: '#000000', background: '#ffffff', font_family: 'monospace', border_radius: 0 });
  const [settings, setSettings] = useState<FormSettings>({ gamification: false });

  const { sendMessage, lastMessage, isConnected } = useWebSocket('ws://localhost:8000/ws/form/demo-1');
  const myId = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'CURSOR_MOVE') {
      if (lastMessage.clientId !== myId.current) {
        setRemoteCursors(prev => ({
          ...prev,
          [lastMessage.clientId]: { id: lastMessage.clientId, x: lastMessage.x, y: lastMessage.y }
        }));
      }
    } else if (lastMessage.type === 'SCHEMA_UPDATE' || lastMessage.type === 'UNDO_ACTION' || lastMessage.type === 'REDO_ACTION') {
      const data = lastMessage.data || lastMessage.action?.data;
      if (data) {
        if (data.fields) setFields(data.fields);
        if (data.theme) setTheme(data.theme);
        if (data.settings) setSettings(data.settings);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isConnected) return;
      sendMessage({ type: 'CURSOR_MOVE', clientId: myId.current, x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isConnected, sendMessage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        sendMessage({ type: e.shiftKey ? 'REDO' : 'UNDO' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sendMessage]);

  const dispatchUpdate = (newFields = fields, newTheme = theme, newSettings = settings) => {
    setFields(newFields);
    setTheme(newTheme);
    setSettings(newSettings);
    sendMessage({ type: 'SCHEMA_UPDATE', data: { fields: newFields, theme: newTheme, settings: newSettings } });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('fieldType');
    if (!type) return;
    dispatchUpdate([...fields, { id: Math.random().toString(), type, label: `New ${type} field` }]);
  };

  const handleAIGenerate = async () => {
    try {
      const res = await fetch('http://localhost:8000/ai/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (data.schema) dispatchUpdate(JSON.parse(data.schema));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAIAesthetic = async () => {
    try {
      const res = await fetch('http://localhost:8000/ai/generate-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aestheticPrompt })
      });
      const data = await res.json();
      if (data.schema) {
        const parsed = JSON.parse(data.schema);
        if (parsed.theme) dispatchUpdate(fields, parsed.theme, settings);
        else dispatchUpdate(fields, parsed, settings);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      {/* Left Sidebar Tools */}
      <div style={{ width: '300px', borderRight: '4px solid black', padding: '2rem', background: 'var(--secondary)', overflowY: 'auto' }}>
        <h2>Workshop</h2>
        <div style={{ margin: '1rem 0' }}>
            <span style={{color: isConnected ? 'green' : 'red', fontWeight: 'bold'}}>
               {isConnected ? "🟢 Live Sync Active" : "🔴 Offline"}
            </span>
        </div>
        
        <h3 style={{marginTop: '2rem'}}>Field Types</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          {['short_answer', 'long_answer', 'email', 'dropdown'].map(type => (
            <div 
              key={type} draggable onDragStart={(e) => e.dataTransfer.setData('fieldType', type)}
              style={{ border: '2px solid black', padding: '0.5rem', cursor: 'grab', background: '#e0e0e0', fontWeight: 'bold' }}>
              {type.replace('_', ' ').toUpperCase()}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', borderTop: '4px solid black', paddingTop: '1rem' }}>
           <h3>AI Form Architect</h3>
           <textarea placeholder="Form description..." style={{width: '100%', padding: '0.5rem', border: '2px solid black', marginTop: '0.5rem'}}
             value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
           <button onClick={handleAIGenerate} className="btn btn-primary" style={{width: '100%', marginTop: '0.5rem'}}>Generate Fields</button>
        </div>

        <div style={{ marginTop: '2rem', borderTop: '4px solid black', paddingTop: '1rem' }}>
           <h3>AI Form Aesthetic</h3>
           <textarea placeholder="e.g. Cyberpunk neon..." style={{width: '100%', padding: '0.5rem', border: '2px solid black', marginTop: '0.5rem'}}
             value={aestheticPrompt} onChange={e => setAestheticPrompt(e.target.value)} />
           <button onClick={handleAIAesthetic} className="btn btn-primary" style={{width: '100%', marginTop: '0.5rem', background: 'var(--accent-2)', color: 'black'}}>Paint Aesthetic</button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        onDrop={handleDrop} onDragOver={e => e.preventDefault()}
        style={{ flex: 1, padding: '4rem', position: 'relative', overflowY: 'auto', background: theme.background }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', border: '4px solid black', background: 'white', padding: '2rem', minHeight: '500px', boxShadow: '8px 8px 0 rgba(0,0,0,0.2)', borderRadius: `${theme.border_radius}px` }}>
          <h2 style={{fontFamily: theme.font_family, color: theme.primary_color, marginBottom: '2rem'}}>Draft Preview</h2>
          {fields.length === 0 && <h3 style={{color: '#999', textAlign: 'center'}}>Drop fields here...</h3>}
          {fields.map((f, idx) => (
            <div key={idx} style={{ marginBottom: '1.5rem', fontFamily: theme.font_family }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>{f.label}</label>
              {f.type === 'long_answer' ? (
                <textarea style={{width:'100%', padding:'0.5rem', border: `2px solid ${theme.primary_color}`, borderRadius: `${theme.border_radius}px`}} disabled />
              ) : (
                <input type={f.type === 'short_answer' ? 'text' : f.type} style={{width:'100%', padding:'0.5rem', border: `2px solid ${theme.primary_color}`, borderRadius: `${theme.border_radius}px`}} disabled />
              )}
            </div>
          ))}
        </div>
        
        {Object.values(remoteCursors).map((c) => (
          <div key={c.id} style={{ position: 'fixed', left: c.x, top: c.y, pointerEvents: 'none', zIndex: 9999 }}>
            <span style={{ background: 'var(--accent)', color: 'white', padding: '2px 6px', fontSize: '10px', borderRadius: '4px', border: '1px solid black' }}>Admin-{c.id}</span>
          </div>
        ))}
      </div>

      {/* Right Sidebar Toolbar */}
      <div style={{ width: '250px', borderLeft: '4px solid black', padding: '2rem', background: 'var(--secondary)' }}>
        <h2>Styles</h2>
        <div style={{marginTop: '1rem'}}>
           <label style={{display:'block', fontWeight:'bold'}}>Border Radius</label>
           <input type="range" min="0" max="24" value={theme.border_radius} onChange={e => dispatchUpdate(fields, {...theme, border_radius: parseInt(e.target.value)})} style={{width: '100%'}}/>
        </div>
        <div style={{marginTop: '1rem'}}>
           <label style={{display:'block', fontWeight:'bold'}}>Primary Color</label>
           <input type="color" value={theme.primary_color} onChange={e => dispatchUpdate(fields, {...theme, primary_color: e.target.value})} style={{width: '100%', height:'40px'}}/>
        </div>
        <div style={{marginTop: '1rem'}}>
           <label style={{display:'block', fontWeight:'bold'}}>Background</label>
           <input type="color" value={theme.background} onChange={e => dispatchUpdate(fields, {...theme, background: e.target.value})} style={{width: '100%', height:'40px'}}/>
        </div>
        
        <div style={{ marginTop: '2rem', borderTop: '4px solid black', paddingTop: '1rem' }}>
           <h3>Settings</h3>
           <label style={{display:'flex', alignItems:'center', gap:'0.5rem', marginTop: '1rem', fontWeight: 'bold', cursor: 'pointer'}}>
             <input type="checkbox" checked={settings.gamification} onChange={e => dispatchUpdate(fields, theme, {gamification: e.target.checked})} style={{width:'20px', height:'20px'}}/>
             Gamification Mode
           </label>
        </div>
      </div>
    </div>
  );
}
