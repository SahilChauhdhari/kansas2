'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';

export default function PublicForm() {
  const { slug } = useParams();
  const [form, setForm] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<any>({});
  const [visibleNodes, setVisibleNodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    async function init() {
      if (!slug) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/stage/form/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setForm(data);
          
          // Determine the Root Node
          if (data.fields && data.fields.length > 0) {
            if (!data.edges || data.edges.length === 0) {
               // No edges? Render all fields linearly.
               setVisibleNodes(data.fields.map((f: any) => f.id));
            } else {
               const targets = new Set((data.edges || []).map((e: any) => e.target));
               const root = data.fields.find((n: any) => !targets.has(n.id)) || data.fields[0];
               if (root) setVisibleNodes([root.id]);
            }
          }

          // Log view event
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/analytics/form/${data.id}/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: 'view', metadata: { source: 'web' } })
          }).catch(() => {});
        } else {
          setForm(null);
        }
      } catch (err) {
        setForm(null);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [slug]);

  const handleStart = () => {
    if (Object.keys(formData).length === 0 && form?.id) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/analytics/form/${form.id}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'start', metadata: { timestamp: new Date() } })
      }).catch(() => {});
    }
  };

  const evaluateConditions = (nodeId: string, value: string) => {
    if (!form.edges) return;
    
    // Find all edges extending out of this node
    const outgoing = form.edges.filter((e: any) => e.source === nodeId);
    if (!outgoing || outgoing.length === 0) return;

    let targetToAdd = null;

    // Check branching conditions
    for (const edge of outgoing) {
      // Default Flow or simple label match
      if (edge.label === 'Default Flow' || !edge.label) {
        if (!targetToAdd) targetToAdd = edge.target; // Use as fallback if nothing else matches
      } else {
        // e.g., "If Yes", "If > 18"
        const condition = edge.label.toLowerCase().replace('if ', '').trim();
        if (condition === value.toLowerCase().trim()) {
           targetToAdd = edge.target;
           break;
        } else if (condition.startsWith('>') && !isNaN(Number(value)) && Number(value) > Number(condition.substring(1))) {
           targetToAdd = edge.target;
           break;
        } else if (condition.startsWith('<') && !isNaN(Number(value)) && Number(value) < Number(condition.substring(1))) {
           targetToAdd = edge.target;
           break;
        }
      }
    }

    if (targetToAdd) {
      // Rebuild visible nodes list up to current, then append target
      const currentIndex = visibleNodes.indexOf(nodeId);
      const newVisible = visibleNodes.slice(0, currentIndex + 1);
      newVisible.push(targetToAdd);
      setVisibleNodes(newVisible);
    } else {
       // Prune nodes if answer changed and no longer leads anywhere
       const currentIndex = visibleNodes.indexOf(nodeId);
       const newVisible = visibleNodes.slice(0, currentIndex + 1);
       setVisibleNodes(newVisible);
    }
  };

  const handleChange = (fieldId: string, value: string) => {
    handleStart();
    setFormData({ ...formData, [fieldId]: value });
    
    // Validate bounds constraint
    const fieldDef = form.fields.find((f: any) => f.id === fieldId);
    let error = null;
    if (fieldDef?.data?.type === 'number') {
        const val = Number(value);
        if (isNaN(val)) error = "Must be a valid number";
        if (fieldDef.data.min !== undefined && val < fieldDef.data.min) error = `Minimum allows is ${fieldDef.data.min}`;
        if (fieldDef.data.max !== undefined && val > fieldDef.data.max) error = `Maximum allows is ${fieldDef.data.max}`;
    }
    
    setFormErrors({ ...formErrors, [fieldId]: error });

    if (!error) {
        evaluateConditions(fieldId, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final Validation Check before submit
    let hasError = false;
    for (const nodeId of visibleNodes) {
        const node = form.fields.find((f:any) => f.id === nodeId);
        if (node?.data?.is_required && !formData[nodeId]) {
            hasError = true;
            setFormErrors((prev:any) => ({...prev, [nodeId]: "This field is required."}));
        }
    }
    
    // If dictionary holds any string values (errors)
    if (Object.values(formErrors).some(val => val !== null) || hasError) {
        return; // Stop submission
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/stage/form/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSubmitted(true);
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/analytics/form/${form.id}/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: 'complete', metadata: { duration: 'mocked' } })
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Submission failed', err);
    }
  };

  if (loading) return <div className="loading">Loading Form...</div>;
  if (!form) return <div className="error">Form not found</div>;

  // Custom Theme Application
  // Custom Theme Application
  const customStyles: any = {};
  if (form.settings?.theme?.primary_color) customStyles['--primary'] = form.settings.theme.primary_color;
  if (form.settings?.theme?.background) customStyles['--bg'] = form.settings.theme.background;
  if (form.settings?.theme?.text_color) customStyles['--text-dark'] = form.settings.theme.text_color;
  if (form.settings?.theme?.font_family) customStyles['--font-family'] = form.settings.theme.font_family;
  if (form.settings?.theme?.border_radius !== undefined) customStyles['--border-radius'] = `${form.settings.theme.border_radius}px`;

  if (submitted) {
    return (
      <div className="stage-bg" style={customStyles}>
        <div className="form-container success" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '3.5rem', marginBottom: '1rem', marginTop: '0' }}>Success!</h2>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-light)', marginBottom: '2rem' }}>Your response has been recorded accurately.</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>Submit Another</button>
        </div>
      </div>
    );
  }

  const renderField = (field: any) => {
    const { type, label, options, min, max } = field.data;
    const value = formData[field.id] || '';

    switch (type) {
        case 'long_answer':
            return <textarea value={value} onChange={(e) => handleChange(field.id, e.target.value)} required={field.data.is_required} className="stage-input" />;
        case 'select':
        case 'dropdown':
            return (
                <select value={value} onChange={(e) => handleChange(field.id, e.target.value)} required={field.data.is_required} className="stage-input">
                    <option value="">Select an option...</option>
                    {(options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            );
        case 'radio':
            return (
                <div className="radio-group">
                    {(options || []).map((opt: string) => (
                        <label key={opt} className="radio-label">
                            <input type="radio" name={field.id} value={opt} checked={value === opt} onChange={(e) => handleChange(field.id, e.target.value)} required={field.data.is_required} />
                            {opt}
                        </label>
                    ))}
                </div>
            )
        case 'number':
            return <input type="number" min={min} max={max} value={value} onChange={(e) => handleChange(field.id, e.target.value)} required={field.data.is_required} className="stage-input" />;
        case 'date_range':
            return <input type="date" value={value} onChange={(e) => handleChange(field.id, e.target.value)} required={field.data.is_required} className="stage-input" />;
        case 'file':
            return <input type="file" onChange={(e) => handleChange(field.id, e.target.value)} required={field.data.is_required} className="stage-input file-input" />;
        default:
            return <input type="text" value={value} onChange={(e) => handleChange(field.id, e.target.value)} required={field.data.is_required} className="stage-input" />;
    }
  }

  const answeredCount = visibleNodes.filter((id: string) => {
    const val = formData[id];
    return val !== undefined && val !== null && val !== '';
  }).length;
  const progressPercentage = visibleNodes.length > 0 ? Math.round((answeredCount / visibleNodes.length) * 100) : 0;

  return (
    <div className="stage-bg" style={customStyles}>
      <div className="form-container">
        
        {/* Gamification Progress Bar */}
        <div className="progress-wrapper">
           <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
        </div>
        <div style={{textAlign: 'right', fontSize: '0.85rem', fontWeight: 900, marginBottom: '2rem', color: 'var(--primary)'}}>
            {progressPercentage}% COMPLETED
        </div>

        <h1>{form.title}</h1>
        <p className="description">{form.description}</p>
        
        <form onSubmit={handleSubmit}>
          {visibleNodes.map((nodeId: string, index: number) => {
            const field = form.fields.find((f: any) => f.id === nodeId);
            if (!field) return null;

            return (
                <div key={field.id} className="form-group stacked-enter" style={{ animationDelay: `${index * 0.1}s` }}>
                <label>
                    {field.data.label}
                    {field.data.is_required && <span className="req">*</span>}
                </label>
                {renderField(field)}
                {formErrors[field.id] && <div className="error-text">{formErrors[field.id]}</div>}
                </div>
            );
          })}

          <button type="submit" className="btn btn-primary btn-block">
            {form.settings?.buttons?.submitText || "Submit Response"}
          </button>
        </form>
      </div>
      
      <Link href="/" style={{position: 'fixed', bottom: '1.5rem', right: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, textDecoration: 'none', color: 'var(--text-dark)', fontSize: '1rem', zIndex: 100, opacity: 0.7}}>
         <span>Powered by</span> <span style={{fontSize: '1.2rem'}}>⚡</span> SCRIBA
      </Link>

      <style jsx>{`
        .stage-bg {
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--font-family);
          padding: 4rem 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .form-container {
          width: 100%;
          max-width: 700px;
          background: var(--card-bg);
          border: var(--border-width) solid var(--primary);
          border-radius: var(--border-radius);
          padding: 4rem;
          box-shadow: var(--card-shadow);
          backdrop-filter: var(--blur);
          height: fit-content;
        }
        h1 { margin-bottom: 0.5rem; text-transform: uppercase; font-weight: 900; color: var(--text-dark); }
        .description { margin-bottom: 3rem; color: var(--text-light); font-size: 1.1rem; }
        .loading, .error { padding: 4rem; text-align: center; font-weight: bold; font-family: monospace; }
        .req { color: red; margin-left: 0.5rem; }
        .error-text { color: red; font-size: 0.8rem; margin-top: 0.5rem; }
        .radio-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .radio-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .stacked-enter {
            animation: slideDown 0.3s ease forwards;
        }
        .progress-wrapper {
            width: 100%;
            height: 12px;
            background: rgba(0,0,0,0.05);
            border: 2px solid var(--primary, #000);
            border-radius: var(--border-radius, 0px);
            margin-bottom: 0.5rem;
            overflow: hidden;
        }
        .progress-bar {
            height: 100%;
            background: var(--primary, #000);
            transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .stage-input, .form-group textarea, .form-group select {
            width: 100%;
            padding: 1rem;
            border: 2px solid var(--primary, #000);
            background: transparent;
            font-size: 1rem;
            border-radius: var(--border-radius, 0px);
            font-family: inherit;
        }
        .file-input {
            padding: 0.5rem;
            cursor: pointer;
        }
      `}</style>
    </div>
  );
}
