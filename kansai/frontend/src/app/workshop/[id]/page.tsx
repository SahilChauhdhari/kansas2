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
type FormSettings = { gamification: boolean; buttons?: { submitText: string, nextText: string, prevText: string } };

const DEFAULT_THEME: ThemeConfig = { 
  primary_color: '#000000', 
  background: '#ffffff', 
  font_family: 'monospace', 
  border_radius: 0 
};

const DEFAULT_SETTINGS: FormSettings = { 
  gamification: false,
  buttons: { submitText: "Submit", nextText: "Next", prevText: "Previous" }
};

export default function Workshop() {
  const { id } = useParams();
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'canvas' | 'logic'>('canvas');
  
  // Undo/Redo State
  const [history, setHistory] = useState<any[]>([{ nodes: [], edges: [], theme: DEFAULT_THEME, settings: DEFAULT_SETTINGS }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [formSlug, setFormSlug] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [remoteCursors, setRemoteCursors] = useState<Record<string, Cursor>>({});
  const [aiPrompt, setAiPrompt] = useState('');
  
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [settings, setSettings] = useState<FormSettings>(DEFAULT_SETTINGS);

  const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001';
  const { sendMessage, lastMessage, isConnected } = useWebSocket(`${wsBaseUrl}/ws/form/${id}`);
  const myId = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/workshop/forms/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        const nds = data.nodes || data.fields || [];
        const eds = data.edges || data.field_order || [];
        const thm = { ...DEFAULT_THEME, ...(data.theme || {}) };
        const sets = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
        
        setNodes(nds);
        setEdges(eds);
        setTheme(thm);
        setSettings(sets);
        if (data.slug) setFormSlug(data.slug);
        setHistory([{ nodes: nds, edges: eds, theme: thm, settings: sets }]);
        setHistoryIndex(0);
      }
    });
  }, [id, token]);

  // Undo/Redo Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (historyIndex > 0) {
                    const newIndex = historyIndex - 1;
                    const h = history[newIndex];
                    setNodes(h.nodes); setEdges(h.edges); setTheme(h.theme); setSettings(h.settings);
                    setHistoryIndex(newIndex);
                    sendMessage({ type: 'UNDO_ACTION', data: h });
                }
            } else if (e.key === 'y') {
                e.preventDefault();
                if (historyIndex < history.length - 1) {
                    const newIndex = historyIndex + 1;
                    const h = history[newIndex];
                    setNodes(h.nodes); setEdges(h.edges); setTheme(h.theme); setSettings(h.settings);
                    setHistoryIndex(newIndex);
                    sendMessage({ type: 'REDO_ACTION', data: h });
                }
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex, sendMessage]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'CURSOR_MOVE') {
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
          delete next[cid]; return next;
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

  const dispatchUpdate = (newNodes = nodes, newEdges = edges, newTheme = theme, newSettings = settings) => {
    setNodes(newNodes);
    setEdges(newEdges);
    setTheme(newTheme);
    setSettings(newSettings);
    
    // Push History
    const newState = { nodes: newNodes, edges: newEdges, theme: newTheme, settings: newSettings };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    sendMessage({ type: 'SCHEMA_UPDATE', data: newState });
  };

  const onNodesChange = useCallback((changes: NodeChange[]) => {
      setNodes((nds) => {
        const applied = applyNodeChanges(changes, nds);
        if (changes.some(c => c.type !== 'select')) {
            dispatchUpdate(applied, edges, theme, settings);
        }
        return applied;
      });
  }, [edges, theme, settings]); // eslint-disable-line

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
      setEdges((eds) => {
        const applied = applyEdgeChanges(changes, eds);
        dispatchUpdate(nodes, applied, theme, settings);
        return applied;
      });
  }, [nodes, theme, settings]); // eslint-disable-line

  const onConnect = useCallback((connection: Connection) => {
      const condition = window.prompt("Enter Edge Condition (e.g. 'If Yes', 'If > 18'). Leave blank for Default Flow.", "Default Flow");
      setEdges((eds) => {
        const newConn = { ...connection, label: condition || 'Default Flow', animated: true };
        const applied = addEdge(newConn, eds);
        dispatchUpdate(nodes, applied, theme, settings);
        return applied;
      });
  }, [nodes, theme, settings]); // eslint-disable-line

  const handleDropCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('fieldType');
    if (!type) return;
    const newNode = {
       id: Math.random().toString(),
       position: { x: e.clientX - 300, y: e.clientY - 100 },
       data: { label: `New ${type.replace('_', ' ')} field`, type, is_required: false, options: ['Option 1', 'Option 2'] }
    };
    dispatchUpdate([...nodes, newNode]);
  };

  const addField = (type: string) => {
    const newNode = {
       id: Math.random().toString(),
       position: { x: 100, y: 100 + (nodes.length * 50) },
       data: { label: `New ${type.replace('_', ' ')} field`, type, is_required: false, options: ['Option 1', 'Option 2'] }
    };
    dispatchUpdate([...nodes, newNode]);
  };

  const handleAIGenerate = async () => {
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001') + '/ai/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (!res.ok) {
        alert("AI Generation Error: " + (data.detail || "API quota limit reached or server error."));
        return;
      }
      if (data.schema) {
         const parsed = JSON.parse(data.schema);
         dispatchUpdate(parsed.nodes || [], parsed.edges || []);
      }
    } catch (e) {
      console.error(e);
      alert("AI Request Failed to reach backend.");
    }
  };

  const handleSave = async (silent = false) => {
    if (!token || !id) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/workshop/forms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nodes, edges, theme, settings })
      });
      if (!silent) {
        if (res.ok) alert("COMPILATION SUCCESSFUL: DATA PERSISTED.");
        else alert("TRANSMISSION ERROR: SAVE FAILED.");
      }
    } catch (e) { 
      if (!silent) alert("SYSTEM FAILURE: COULD NOT REACH BACKEND."); 
    }
  };

  const handlePublish = async () => {
    await handleSave(true);
    setShowShare(true);
  };

  const updateNodeData = (nodeId: string, newData: any) => {
      const updated = nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n);
      dispatchUpdate(updated, edges, theme, settings);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
     sendMessage({ type: 'CURSOR_MOVE', clientId: myId.current, x: e.clientX, y: e.clientY });
  }, [sendMessage]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--text-dark)' }}>

      <div style={{ width: '300px', borderRight: 'var(--border-width) solid var(--primary)', padding: '2rem', background: 'var(--card-bg)', overflowY: 'auto', zIndex: 10, backdropFilter: 'var(--blur)' }}>
        <h2 style={{fontWeight: 900, fontSize: '2rem'}}>WORKSHOP</h2>
        <div style={{ margin: '1rem 0' }}>
            <span style={{color: isConnected ? 'var(--accent)' : 'red', fontWeight: 'bold'}}>
               {isConnected ? "🟢 PULSE ACTIVE" : "🔴 OFFLINE"}
            </span>
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
        
        <h3 style={{textTransform: 'uppercase', fontSize: '0.9rem'}}>Field Types</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
          {['short_answer', 'long_answer', 'number', 'dropdown', 'radio', 'rating', 'date_range', 'file', 'button', 'custom_button'].map(type => (
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
        onClick={() => { if(viewMode === 'canvas') setSelectedNodeId(null) }}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', background: theme.background }}>
        
        {/* Navbar Overlay */}
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 100, display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <ThemeSwitcher />
           <Link href="/dashboard"><button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontWeight: 'bold' }}>Studio</button></Link>
        </div>
        
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
                  <div 
                    key={n.id} 
                    onClick={(e) => { e.stopPropagation(); setSelectedNodeId(n.id); }}
                    style={{ position: 'relative', marginBottom: '2.5rem', fontFamily: theme.font_family, padding: '1rem', outline: selectedNodeId === n.id ? '2px dashed var(--accent)' : 'none', cursor: 'pointer', background: 'var(--card-bg)', borderRadius: `${theme.border_radius}px`, boxShadow: selectedNodeId === n.id ? 'var(--card-shadow)' : 'none' }}>
                    
                    <button 
                       onClick={(e) => { e.stopPropagation(); setNodes(nodes.filter(node => node.id !== n.id)); }}
                       style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--accent)', color: 'white', border: '2px solid black', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', zIndex: 10 }}>
                       ×
                    </button>

                    <label style={{ display: 'flex', alignItems: 'center', fontWeight: 900, marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: '0.8rem', width: '100%' }}>
                        <input 
                           type="text" 
                           value={n.data.label as string} 
                           onChange={(e) => updateNodeData(n.id, { label: e.target.value })}
                           onClick={(e) => e.stopPropagation()}
                           onFocus={(e) => setSelectedNodeId(n.id)}
                           style={{ flex: 1, background: 'transparent', border: '1px dashed transparent', borderBottom: selectedNodeId === n.id ? '1px dashed var(--primary)' : 'none', outline: 'none', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', color: 'inherit', padding: '0.2rem' }}
                           placeholder="Enter Field Label"
                        />
                        {!!n.data.is_required && <span style={{color:'red', marginLeft: '0.5rem'}}>*</span>}
                    </label>
                    <input type="text" placeholder={n.data.type as string} style={{width:'100%', padding:'1rem', border: `2px solid ${theme.primary_color}`, borderRadius: `${theme.border_radius}px`, background: 'transparent'}} disabled />
                  </div>
                ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem' }}>
                <button className="btn btn-secondary">{settings.buttons?.prevText || "Previous"}</button>
                <button className="btn btn-primary">{settings.buttons?.submitText || "Submit"}</button>
              </div>
             </div>
           </div>
        ) : (
           <div style={{ width: '100%', height: '100%' }}>
             <ReactFlow 
                nodes={nodes} edges={edges} 
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
                fitView
             >
                <Controls />
                <Background color="var(--primary)" gap={20} />
             </ReactFlow>
           </div>
        )}
      </div>

      <div style={{ width: '280px', borderLeft: 'var(--border-width) solid var(--primary)', padding: '2rem', background: 'var(--card-bg)', overflowY: 'auto', zIndex: 10, backdropFilter: 'var(--blur)' }}>
        {selectedNode ? (
            <>
                <h2 style={{fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase', color: 'var(--accent)'}}>Properties</h2>
                <div style={{marginTop: '2rem'}}>
                   <label style={{display:'block', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Label</label>
                   <input type="text" value={selectedNode.data.label as string} onChange={e => updateNodeData(selectedNode.id, { label: e.target.value })} style={{width: '100%', padding: '0.5rem'}}/>
                </div>
                <div style={{marginTop: '1.5rem'}}>
                   <label style={{display:'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase'}}>
                      <input type="checkbox" checked={!!selectedNode.data.is_required} onChange={e => updateNodeData(selectedNode.id, { is_required: e.target.checked })} />
                      Is Required?
                   </label>
                </div>
                <div style={{marginTop: '1.5rem'}}>
                   <label style={{display:'block', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Data Type</label>
                   <input type="text" placeholder="e.g. text, submit, file" value={selectedNode.data.datatype as string || ''} onChange={e => updateNodeData(selectedNode.id, { datatype: e.target.value })} style={{width: '100%', padding: '0.5rem'}}/>
                </div>
                {['number', 'date_range', 'button', 'custom_button', 'short_answer', 'long_answer'].includes(selectedNode.data.type as string) && (
                    <div style={{marginTop: '1.5rem', display: 'flex', gap: '1rem'}}>
                        <div>
                           <label style={{display:'block', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Min</label>
                           <input type="number" value={selectedNode.data.min as number || ''} onChange={e => updateNodeData(selectedNode.id, { min: e.target.value ? Number(e.target.value) : undefined })} style={{width: '100%', padding: '0.5rem'}}/>
                        </div>
                        <div>
                           <label style={{display:'block', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Max</label>
                           <input type="number" value={selectedNode.data.max as number || ''} onChange={e => updateNodeData(selectedNode.id, { max: e.target.value ? Number(e.target.value) : undefined })} style={{width: '100%', padding: '0.5rem'}}/>
                        </div>
                    </div>
                )}
                {(selectedNode.data.type === 'dropdown' || selectedNode.data.type === 'radio') && (
                    <div style={{marginTop: '1.5rem'}}>
                       <label style={{display:'block', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Options (comma separated)</label>
                       <textarea 
                           value={(selectedNode.data.options as string[] || []).join(', ')} 
                           onChange={e => updateNodeData(selectedNode.id, { options: e.target.value.split(',').map(s=>s.trim()) })} 
                           style={{width: '100%', padding: '0.5rem', minHeight: '80px'}}/>
                    </div>
                )}
                <button onClick={() => setNodes(nodes.filter(n => n.id !== selectedNode.id))} style={{width: '100%', marginTop: '2rem', padding: '0.5rem', background: 'red', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer'}}>DELETE NODE</button>
            </>
        ) : (
            <>
                <h2 style={{fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase'}}>Global Config</h2>
                <div style={{marginTop: '2rem'}}>
                   <label style={{display:'block', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Submit Button</label>
                   <input type="text" value={settings.buttons?.submitText || ''} onChange={e => dispatchUpdate(nodes, edges, theme, {...settings, buttons: {...settings.buttons, submitText: e.target.value} as any})} style={{width: '100%', padding: '0.5rem'}}/>
                </div>
                <div style={{marginTop: '1rem'}}>
                   <label style={{display:'block', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Next Button</label>
                   <input type="text" value={settings.buttons?.nextText || ''} onChange={e => dispatchUpdate(nodes, edges, theme, {...settings, buttons: {...settings.buttons, nextText: e.target.value} as any})} style={{width: '100%', padding: '0.5rem'}}/>
                </div>
                
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

                 <div style={{ marginTop: '2rem', borderTop: 'var(--border-width) solid var(--primary)', paddingTop: '2rem' }}>
                   <label style={{display:'flex', alignItems:'center', justifyItems:'center', gap:'0.75rem', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem'}}>
                     <input type="checkbox" checked={!!settings.gamification} onChange={e => dispatchUpdate(nodes, edges, theme, {...settings, gamification: e.target.checked})} style={{width:'18px', height:'18px', cursor: 'pointer'}}/>
                      GAMIFICATION MODE
                    </label>
                    <button onClick={() => handleSave(false)} className="btn btn-secondary" style={{width: '100%', marginTop: '2rem', fontSize:'0.9rem', minHeight:'40px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>SAVE DRAFT</button>
                    <button onClick={handlePublish} className="btn btn-primary" style={{width: '100%', marginTop: '0.5rem', fontSize:'1rem', minHeight:'50px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>PUBLISH & SHARE</button>
                    {showShare && formSlug && (
                        <div style={{marginTop: '1rem', padding: '1rem', background: 'var(--accent-3)', border: '2px dashed black', color: 'black', borderRadius: '4px'}}>
                           <p style={{fontWeight:900, fontSize:'0.8rem', textTransform:'uppercase'}}>LIVE PUBLIC LINK:</p>
                           <input type="text" readOnly value={`${window.location.origin}/stage/${formSlug}`} style={{width:'100%', padding:'0.5rem', marginTop:'0.5rem', fontWeight: 'bold'}} onClick={e => e.currentTarget.select()} />
                        </div>
                    )}
                    <p style={{fontSize: '0.7rem', opacity: 0.5, marginTop: '1rem', textAlign: 'center'}}>CTRL+Z to Undo, CTRL+Y to Redo</p>
                 </div>
            </>
        )}
      </div>
    </div>
  );
}
