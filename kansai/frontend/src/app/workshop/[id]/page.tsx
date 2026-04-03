'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ThemeSwitcher from '../../components/ThemeSwitcher';
import Link from 'next/link';

type Cursor = { id: string; x: number; y: number };
type ThemeConfig = { primary_color: string; background: string; font_family: string; border_radius: number };
type FormSettings = { gamification: boolean };

const DEFAULT_THEME: ThemeConfig = { 
  primary_color: '#000000', 
  background: '#ffffff', 
  font_family: 'monospace', 
  border_radius: 0 
};

const DEFAULT_SETTINGS: FormSettings = { 
  gamification: false 
};

export default function Workshop() {
  const { id } = useParams();
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'canvas' | 'logic'>('canvas');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, Cursor>>({});
  const [aiPrompt, setAiPrompt] = useState('');
  
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [settings, setSettings] = useState<FormSettings>(DEFAULT_SETTINGS);

  const { sendMessage, lastMessage, isConnected } = useWebSocket(`ws://localhost:8000/ws/form/${id}`);
  const myId = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`http://localhost:8000/workshop/forms/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        if (data.nodes) setNodes(data.nodes);
        else if (data.fields) setNodes(data.fields);
        
        if (data.edges) setEdges(data.edges);
        else if (data.field_order) setEdges(data.field_order);
        
        if (data.theme) setTheme({ ...DEFAULT_THEME, ...data.theme });
        if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      }
    });
  }, [id, token]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'CURSOR_MOVE' || lastMessage.type === 'USER_CURSOR') {
      if (lastMessage.clientId !== myId.current) {
        setRemoteCursors(prev => ({
          ...prev,
          [lastMessage.clientId]: { id: lastMessage.clientId, x: lastMessage.x, y: lastMessage.y }
        }));
      }
    } else if (lastMessage.type === 'USER_DISCONNECTED') {
       const cid = lastMessage.clientId;
       setRemoteCursors(prev => {
          const next = {...prev};
          delete next[cid];
          return next;
       });
    } else if (lastMessage.type === 'SCHEMA_UPDATE' || lastMessage.type === 'UNDO_ACTION' || lastMessage.type === 'REDO_ACTION') {
      const data = lastMessage.data || lastMessage.action?.data;
      if (data) {
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        if (data.theme) setTheme(data.theme);
        if (data.settings) setSettings(data.settings);
      }
    }
  }, [lastMessage]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
       setNodes((nds) => {
          const applied = applyNodeChanges(changes, nds);
          if (changes.some(c => c.type !== 'select')) {
             sendMessage({ type: 'SCHEMA_UPDATE', data: { nodes: applied, edges, theme, settings } });
          }
          return applied;
       });
    },
    [edges, theme, settings, sendMessage]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
       setEdges((eds) => {
          const applied = applyEdgeChanges(changes, eds);
          sendMessage({ type: 'SCHEMA_UPDATE', data: { nodes, edges: applied, theme, settings } });
          return applied;
       });
    },
    [nodes, theme, settings, sendMessage]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
       setEdges((eds) => {
            const applied = addEdge(connection, eds);
            sendMessage({ type: 'SCHEMA_UPDATE', data: { nodes, edges: applied, theme, settings } });
            return applied;
       });
    },
    [nodes, theme, settings, sendMessage]
  );

  const dispatchUpdate = (newNodes = nodes, newEdges = edges, newTheme = theme, newSettings = settings) => {
    setNodes(newNodes);
    setEdges(newEdges);
    setTheme(newTheme);
    setSettings(newSettings);
    sendMessage({ type: 'SCHEMA_UPDATE', data: { nodes: newNodes, edges: newEdges, theme: newTheme, settings: newSettings } });
  };

  const handleDropCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('fieldType');
    if (!type) return;
    const newNode = {
       id: Math.random().toString(),
       position: { x: e.clientX - 300, y: e.clientY - 100 },
       data: { label: `New ${type.replace('_', ' ')} field`, type }
    };
    dispatchUpdate([...nodes, newNode]);
  };

  const addField = (type: string) => {
    const newNode = {
       id: Math.random().toString(),
       position: { x: 100, y: 100 + (nodes.length * 50) },
       data: { label: `New ${type.replace('_', ' ')} field`, type }
    };
    dispatchUpdate([...nodes, newNode]);
  };

  const handleAIGenerate = async () => {
    try {
      const res = await fetch('http://localhost:8000/ai/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (data.schema) {
         const parsed = JSON.parse(data.schema);
         dispatchUpdate(parsed.nodes || [], parsed.edges || []);
         // stay in current view but maybe scroll to top
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!token || !id) return;
    try {
      const res = await fetch(`http://localhost:8000/workshop/forms/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nodes,
          edges,
          theme,
          settings
        })
      });
      if (res.ok) {
        alert("COMPILATION SUCCESSFUL: DATA PERSISTED.");
      } else {
        alert("TRANSMISSION ERROR: SAVE FAILED.");
      }
    } catch (e) {
      console.error(e);
      alert("SYSTEM FAILURE: COULD NOT REACH BACKEND.");
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
     sendMessage({ type: 'CURSOR_MOVE', clientId: myId.current, x: e.clientX, y: e.clientY });
  }, [sendMessage]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--text-dark)' }}>
      {/* Navbar Overlay */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 100, display: 'flex', gap: '1rem', alignItems: 'center' }}>
         <ThemeSwitcher />
         <Link href="/dashboard"><button className="btn btn-secondary">Studio</button></Link>
      </div>

      <div style={{ width: '300px', borderRight: 'var(--border-width) solid var(--primary)', padding: '2rem', background: 'var(--card-bg)', overflowY: 'auto', zIndex: 10, backdropFilter: 'var(--blur)' }}>
        <h2 style={{fontWeight: 900, fontSize: '2rem'}}>WORKSHOP</h2>
        <div style={{ margin: '1rem 0' }}>
            <span style={{color: isConnected ? 'var(--accent)' : 'red', fontWeight: 'bold'}}>
               {isConnected ? "🟢 PULSE ACTIVE" : "🔴 OFFLINE"}
            </span>
            <p style={{fontSize: '0.7rem', opacity: 0.6}}>FORM ID: {id}</p>
        </div>
        
        <div style={{ margin: '2rem 0', display: 'flex', border: 'var(--border-width) solid var(--primary)', borderRadius: '4px', overflow: 'hidden' }}>
           <button 
             onClick={() => setViewMode('canvas')} 
             style={{flex: 1, padding: '0.75rem', background: viewMode === 'canvas' ? 'var(--primary)' : 'transparent', color: viewMode === 'canvas' ? 'var(--bg)' : 'var(--text-dark)', fontWeight: 900, border: 'none', cursor: 'pointer'}}>
              CANVAS
           </button>
           <button 
             onClick={() => setViewMode('logic')} 
             style={{flex: 1, padding: '0.75rem', background: viewMode === 'logic' ? 'var(--primary)' : 'transparent', color: viewMode === 'logic' ? 'var(--bg)' : 'var(--text-dark)', fontWeight: 900, border: 'none', cursor: 'pointer'}}>
              LOGIC
           </button>
        </div>
        
        <h3 style={{marginTop: '2rem', textTransform: 'uppercase', fontSize: '0.9rem'}}>Field Types</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
          {['short', 'long', 'choice', 'rating', 'emoji', 'email', 'calendar', 'file', 'audio', 'signature', 'image_mcq'].map(type => (
            <div 
              key={type} 
              draggable 
              onDragStart={(e) => e.dataTransfer.setData('fieldType', type)}
              onClick={() => addField(type)}
              style={{ border: 'var(--border-width) solid var(--primary)', padding: '0.75rem', cursor: 'pointer', background: 'var(--card-bg)', fontWeight: 'bold', boxShadow: 'var(--card-shadow)', fontSize: '0.7rem', textAlign: 'center' }}>
              {type.replace('_', ' ').toUpperCase()}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '3rem', borderTop: 'var(--border-width) solid var(--primary)', paddingTop: '1.5rem' }}>
           <h3 style={{textTransform: 'uppercase', fontSize: '0.9rem'}}>AI Architect</h3>
           <textarea placeholder="e.g. Design a feedback flow with logic jumps" style={{width: '100%', padding: '1rem', border: 'var(--border-width) solid var(--primary)', marginTop: '0.5rem', background: 'var(--bg)', borderRadius: '4px'}}
             value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
           <button onClick={handleAIGenerate} className="btn btn-primary" style={{width: '100%', marginTop: '0.75rem'}}>GENERATE SCHEMA</button>
        </div>
      </div>

      <div 
        onMouseMove={handleMouseMove}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', background: theme.background }}>
        
        {Object.values(remoteCursors).map(c => (
           <div key={c.id} style={{ 
             position: 'fixed', left: c.x, top: c.y, width: '16px', height: '16px', 
             background: 'var(--accent)', borderRadius: '2px', zIndex: 100, pointerEvents: 'none',
             border: '2px solid black', transition: 'all 0.1s linear'
           }}>
             <span style={{ position: 'absolute', top: '18px', left: '18px', background: 'black', color: 'white', padding: '2px 8px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>
                TELEMETRY: {c.id.slice(0,4)}
             </span>
           </div>
        ))}
        
        {viewMode === 'canvas' ? (
           <div 
             onDrop={handleDropCanvas} onDragOver={e => e.preventDefault()}
             style={{ width: '100%', height: '100%', padding: '6rem 4rem', overflowY: 'auto' }}>
             <div style={{ maxWidth: '700px', margin: '0 auto', border: 'var(--border-width) solid var(--primary)', background: 'var(--card-bg)', padding: '4rem', minHeight: '600px', boxShadow: 'var(--card-shadow)', borderRadius: `${theme.border_radius}px`, backdropFilter: 'var(--blur)' }}>
               <h2 style={{fontFamily: theme.font_family, color: theme.primary_color, marginBottom: '3rem', fontSize: '2.5rem', fontWeight: 900}}>PROJECT DRAFT</h2>
               {nodes.length === 0 && <h3 style={{color: 'var(--text-light)', textAlign: 'center', marginTop: '5rem', opacity: 0.5}}>Drag & Drop or use AI to begin.</h3>}
                {nodes.map((n) => (
                  <div key={n.id} style={{ marginBottom: '2.5rem', fontFamily: theme.font_family }}>
                    <label style={{ display: 'block', fontWeight: 900, marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: '0.8rem' }}>{n.data.label as string}</label>
                    
                    {n.data.type === 'long' ? (
                      <textarea style={{width:'100%', padding:'1rem', border: `2px solid ${theme.primary_color}`, borderRadius: `${theme.border_radius}px`, background: 'transparent'}} disabled />
                    ) : n.data.type === 'choice' ? (
                      <select style={{width:'100%', padding:'1rem', border: `2px solid ${theme.primary_color}`, borderRadius: `${theme.border_radius}px`, background: 'transparent'}} disabled>
                        <option>SELECT OPTION...</option>
                      </select>
                    ) : n.data.type === 'rating' ? (
                      <div style={{display:'flex', gap:'0.5rem'}}>
                        {[1,2,3,4,5].map(i => <div key={i} style={{width:'40px', height:'40px', border:`2px solid ${theme.primary_color}`, display:'grid', placeItems:'center', fontWeight:900}}>★</div>)}
                      </div>
                    ) : n.data.type === 'emoji' ? (
                      <div style={{display:'flex', gap:'1rem', fontSize:'2rem', opacity:0.5}}>
                        😢 😐 🙂 😍
                      </div>
                    ) : n.data.type === 'calendar' ? (
                      <input type="date" style={{width:'100%', padding:'1rem', border: `2px solid ${theme.primary_color}`, borderRadius: `${theme.border_radius}px`, background: 'transparent'}} disabled />
                    ) : n.data.type === 'signature' ? (
                      <div style={{width:'100%', height:'100px', border: `2px dashed ${theme.primary_color}`, display:'grid', placeItems:'center', opacity:0.5, fontSize:'0.7rem'}}>DIGITAL SIGNATURE AREA</div>
                    ) : n.data.type === 'image_mcq' ? (
                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                        {[1,2].map(i => <div key={i} style={{height:'100px', border:`2px solid ${theme.primary_color}`, background:'var(--card-bg)', opacity:0.5}}></div>)}
                      </div>
                    ) : n.data.type === 'file' || n.data.type === 'audio' ? (
                      <div style={{padding:'1rem', border:`2px solid ${theme.primary_color}`, borderStyle:'dashed', textAlign:'center', fontSize:'0.8rem'}}>UPLOAD {n.data.type.toUpperCase()}</div>
                    ) : (
                      <input type="text" style={{width:'100%', padding:'1rem', border: `2px solid ${theme.primary_color}`, borderRadius: `${theme.border_radius}px`, background: 'transparent'}} disabled />
                    )}
                  </div>
                ))}
             </div>
           </div>
        ) : (
           <div style={{ width: '100%', height: '100%' }}>
             <ReactFlow 
                nodes={nodes} 
                edges={edges} 
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
             >
                <Controls />
                <Background color="var(--primary)" gap={20} />
             </ReactFlow>
           </div>
        )}
      </div>

      <div style={{ width: '280px', borderLeft: 'var(--border-width) solid var(--primary)', padding: '2rem', background: 'var(--card-bg)', zIndex: 10, backdropFilter: 'var(--blur)' }}>
        <h2 style={{fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase'}}>Global Styles</h2>
        <div style={{marginTop: '2rem'}}>
           <label style={{display:'block', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Border Radius</label>
           <input type="range" min="0" max="48" value={theme.border_radius ?? 0} onChange={e => dispatchUpdate(nodes, edges, {...theme, border_radius: parseInt(e.target.value)}, settings)} style={{width: '100%'}}/>
        </div>
        <div style={{marginTop: '2rem'}}>
           <label style={{display:'block', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Accent Color</label>
           <input type="color" value={theme.primary_color ?? '#000000'} onChange={e => dispatchUpdate(nodes, edges, {...theme, primary_color: e.target.value}, settings)} style={{width: '100%', height:'50px', border: 'var(--border-width) solid var(--primary)', cursor: 'pointer', background: 'transparent'}}/>
        </div>
        <div style={{marginTop: '2rem'}}>
           <label style={{display:'block', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Base Material</label>
           <input type="color" value={theme.background ?? '#ffffff'} onChange={e => dispatchUpdate(nodes, edges, {...theme, background: e.target.value}, settings)} style={{width: '100%', height:'50px', border: 'var(--border-width) solid var(--primary)', cursor: 'pointer', background: 'transparent'}}/>
        </div>
        
        <div style={{ marginTop: '4rem', borderTop: 'var(--border-width) solid var(--primary)', paddingTop: '2rem' }}>
           <h3 style={{fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase'}}>Core Engine</h3>
           <label style={{display:'flex', alignItems:'center', gap:'0.75rem', marginTop: '1.5rem', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem'}}>
             <input type="checkbox" checked={!!settings.gamification} onChange={e => dispatchUpdate(nodes, edges, theme, {gamification: e.target.checked})} style={{width:'24px', height:'24px', cursor: 'pointer'}}/>
              GAMIFICATION MODE
            </label>
            <button onClick={handleSave} className="btn btn-primary" style={{width: '100%', marginTop: '3rem', fontSize:'1rem', height:'60px'}}>SAVE PROJECT</button>
         </div>
      </div>
    </div>
  );
}
