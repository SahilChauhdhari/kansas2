'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';

export default function PublicForm() {
  const { slug } = useParams();
  const [form, setForm] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    async function init() {
      if (!slug) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stage/form/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setForm(data);
          
          // Log view event
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/form/${data.id}/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: 'view', metadata: { source: 'web' } })
          }).catch(() => {}); // Sink analytics errors
        } else {
          console.error("Form fetch failed with status:", res.status);
          setForm(null);
        }
      } catch (err) {
        console.error('Network Error fetching form', err);
        setForm(null);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [slug]);

  const handleStart = () => {
    if (Object.keys(formData).length === 0 && form?.id) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/form/${form.id}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'start', metadata: { timestamp: new Date() } })
      }).catch(() => {}); // Sink start event errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stage/form/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSubmitted(true);
        // Log complete event
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/form/${form.id}/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: 'complete', metadata: { duration: 'mocked' } })
        }).catch(() => {}); // Sink complete event errors
      }
    } catch (err) {
      console.error('Submission failed', err);
    }
  };

  if (loading) return <div className="loading">Loading Form...</div>;
  if (!form) return <div className="error">Form not found</div>;

  if (submitted) {
    return (
      <div className="stage-bg">
        <div className="form-container success">
          <h2>Success!</h2>
          <p>Your response has been recorded accurately.</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">Submit Another</button>
        </div>
        <style jsx>{`
          .stage-bg { min-height: 100vh; background: var(--bg); display: flex; align-items: center; justify-content: center; padding: 2rem; }
          .form-container { background: var(--card-bg); border: var(--border-width) solid var(--primary); padding: 3rem; text-align: center; box-shadow: var(--card-shadow); backdrop-filter: var(--blur); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="stage-bg">
      <div className="form-container">
        <h1>{form.title}</h1>
        <p className="description">{form.description}</p>
        
        <form onSubmit={handleSubmit}>
          {form.fields.map((field: any) => (
            <div key={field.id} className="form-group">
              <label>{field.data.label}</label>
              {field.data.type === 'long_answer' ? (
                <textarea 
                  onFocus={handleStart}
                  onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                  required
                />
              ) : (
                <input 
                  type={field.data.type === 'short_answer' ? 'text' : field.data.type}
                  onFocus={handleStart}
                  onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                  required
                />
              )}
            </div>
          ))}
          <button type="submit" className="btn btn-primary btn-block">Submit Response</button>
        </form>
      </div>

      <style jsx>{`
        .stage-bg {
          min-height: 100vh;
          background: var(--bg);
          padding: 4rem 2rem;
          display: flex;
          justify-content: center;
        }
        .form-container {
          width: 100%;
          max-width: 700px;
          background: var(--card-bg);
          border: var(--border-width) solid var(--primary);
          padding: 4rem;
          box-shadow: var(--card-shadow);
          backdrop-filter: var(--blur);
          height: fit-content;
        }
        h1 { margin-bottom: 0.5rem; text-transform: uppercase; font-weight: 900; color: var(--text-dark); }
        .description { margin-bottom: 3rem; color: var(--text-light); font-size: 1.1rem; }
        .loading, .error { padding: 4rem; text-align: center; font-weight: bold; font-family: monospace; }
      `}</style>
    </div>
  );
}
