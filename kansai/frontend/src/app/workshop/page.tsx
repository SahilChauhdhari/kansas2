'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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

type Cursor = { id: string; x: number; y: number };
type ThemeConfig = { primary_color: string; background: string; font_family: string; border_radius: number };
type FormSettings = { gamification: boolean };

export default function Workshop() {
  const [viewMode, setViewMode] = useState<'canvas' | 'logic'>('canvas');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
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
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        // Fallback for older flat field sets during demo transitions
        if (data.fields && (!data.nodes || data.nodes.length === 0)) {
           const mappedNodes = data.fields.map((f: any, i: number) => ({
              id: f.id, 
              position: {x: 100, y: 100 + (100 * i)}, 
              data: f 
           }));
           setNodes(mappedNodes);
        }
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

  // General Dispatch for non-flow updates (settings, theme)
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
       data: { label: `New ${type} field`, type }
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
         setViewMode('logic'); // Auto-switch to Logic Map to see graph!
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      {/* Left Sidebar Tools */}
      <div style={{ width: '300px', borderRight: '4px solid black', padding: '2rem', background: 'var(--secondary)', overflowY: 'auto', zIndex: 10 }}>
        <h2>Workshop</h2>
        <div style={{ margin: '1rem 0' }}>
            <span style={{color: isConnected ? 'green' : 'red', fontWeight: 'bold'}}>
               {isConnected ? "🟢 Live Sync Active" : "🔴 Offline"}
            </span>
        </div>
        
        {/* VIEW MODE TOGGLE */}
        <div style={{ margin: '2rem 0', display: 'flex', border: '2px solid black' }}>
           <button 
             onClick={() => setViewMode('canvas')} 
             style={{flex: 1, padding: '0.5rem', background: viewMode === 'canvas' ? 'black' : 'white', color: viewMode === 'canvas' ? 'white' : 'black', fontWeight: 'bold', border: 'none', cursor: 'pointer'}}>
              Canvas
           </button>
           <button 
             onClick={() => setViewMode('logic')} 
             style={{flex: 1, padding: '0.5rem', background: viewMode === 'logic' ? 'black' : 'white', color: viewMode === 'logic' ? 'white' : 'black', fontWeight: 'bold', border: 'none', cursor: 'pointer'}}>
              Logic Map
           </button>
        </div>
        
        <h3 style={{marginTop: '2rem'}}>Field Types</h3>
        <p style={{fontSize: '0.8rem'}}>Drag into Canvas view</p>
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
           <h3>AI Architect (Graph)</h3>
           <textarea placeholder="e.g. Asking about stress" style={{width: '100%', padding: '0.5rem', border: '2px solid black', marginTop: '0.5rem'}}
             value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
           <button onClick={handleAIGenerate} className="btn btn-primary" style={{width: '100%', marginTop: '0.5rem'}}>Generate Logic Graph</button>
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: theme.background }}>
        
        {viewMode === 'canvas' ? (
           <div 
             onDrop={handleDropCanvas} onDragOver={e => e.preventDefault()}
             style={{ width: '100%', height: '100%', padding: '4rem', overflowY: 'auto' }}>
             <div style={{ maxWidth: '800px', margin: '0 auto', border: '4px solid black', background: 'white', padding: '2rem', minHeight: '500px', boxShadow: '8px 8px 0 rgba(0,0,0,0.2)', borderRadius: `${theme.border_radius}px` }}>
               <h2 style={{fontFamily: theme.font_family, color: theme.primary_color, marginBottom: '2rem'}}>Draft Preview</h2>
               {nodes.length === 0 && <h3 style={{color: '#999', textAlign: 'center'}}>Drop fields here...</h3>}
               {nodes.map((n) => (
                 <div key={n.id} style={{ marginBottom: '1.5rem', fontFamily: theme.font_family }}>
                   <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>{n.data.label as string}</label>
                   {n.data.type === 'long_answer' ? (
                     <textarea style={{width:'100%', padding:'0.5rem', border: `2px solid ${theme.primary_color}`, borderRadius: `${theme.border_radius}px`}} disabled />
                   ) : (
                     <input type={n.data.type === 'short_answer' ? 'text' : (n.data.type as string)} style={{width:'100%', padding:'0.5rem', border: `2px solid ${theme.primary_color}`, borderRadius: `${theme.border_radius}px`}} disabled />
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
                <Background color="#000" gap={16} />
             </ReactFlow>
           </div>
        )}

      </div>

      {/* Right Sidebar Toolbar */}
      <div style={{ width: '250px', borderLeft: '4px solid black', padding: '2rem', background: 'var(--secondary)', zIndex: 10 }}>
        <h2>Styles</h2>
        <div style={{marginTop: '1rem'}}>
           <label style={{display:'block', fontWeight:'bold'}}>Border Radius</label>
           <input type="range" min="0" max="24" value={theme.border_radius} onChange={e => dispatchUpdate(nodes, edges, {...theme, border_radius: parseInt(e.target.value)}, settings)} style={{width: '100%'}}/>
        </div>
        <div style={{marginTop: '1rem'}}>
           <label style={{display:'block', fontWeight:'bold'}}>Primary Color</label>
           <input type="color" value={theme.primary_color} onChange={e => dispatchUpdate(nodes, edges, {...theme, primary_color: e.target.value}, settings)} style={{width: '100%', height:'40px'}}/>
        </div>
        <div style={{marginTop: '1rem'}}>
           <label style={{display:'block', fontWeight:'bold'}}>Background</label>
           <input type="color" value={theme.background} onChange={e => dispatchUpdate(nodes, edges, {...theme, background: e.target.value}, settings)} style={{width: '100%', height:'40px'}}/>
        </div>
        
        <div style={{ marginTop: '2rem', borderTop: '4px solid black', paddingTop: '1rem' }}>
           <h3>Settings</h3>
           <label style={{display:'flex', alignItems:'center', gap:'0.5rem', marginTop: '1rem', fontWeight: 'bold', cursor: 'pointer'}}>
             <input type="checkbox" checked={settings.gamification} onChange={e => dispatchUpdate(nodes, edges, theme, {gamification: e.target.checked})} style={{width:'20px', height:'20px'}}/>
             Gamification Mode
           </label>
        </div>
      </div>
    </div>
  );
}
