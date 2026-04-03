'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

type StageProps = { params: { slug: string } };

export default function StageForm({ params }: StageProps) {
  const [schema, setSchema] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch schema from backend
    fetch(`http://localhost:8000/stage/form/${params.slug}`)
      .then(res => {
        if (!res.ok) throw new Error("Form not found");
        return res.json();
      })
      .then(data => setSchema(data))
      .catch(err => setError(err.message));
  }, [params.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8000/stage/form/${params.slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Submission Failed");
      setSubmitted(true);
    } catch(err: any) {
      setError(err.message);
    }
  };

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [fieldId]: value }));
  };

  // Determine which fields to hide based on Conditional Branching (Smart Logic)
  const isFieldVisible = (field: any) => {
    if (!schema.conditions) return true;
    
    // Very basic condition evaluator
    for (let c of schema.conditions) {
       // example condition: if 'is_veg' equals 'true', hide 'chicken_preference'
       if (c.target_field === field.id) {
          const triggerVal = formData[c.trigger_field];
          if (c.trigger_operator === 'equals' && triggerVal === c.trigger_value) {
             if (c.target_action === 'hide') return false;
             if (c.target_action === 'show') return true;
          }
       }
    }
    return true;
  };

  if (error) return <div style={{padding:'4rem', color:'red'}} className="container"><h2>Error: {error}</h2></div>;
  if (!schema) return <div style={{padding:'4rem'}} className="container"><h2>Loading Form...</h2></div>;

  if (submitted) {
     return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div style={{ textAlign: 'center', border: '4px solid black', padding: '4rem', background: 'white', boxShadow: '8px 8px 0 rgba(0,0,0,0.2)' }}>
                <h1>Submission Secure ✨</h1>
                <p>Your data was stored safely in the Vault.</p>
                <Link href="/"><button className="btn btn-primary" style={{marginTop:'1rem'}}>Back Home</button></Link>
            </div>
        </div>
     );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: '4rem' }}>
       <div style={{ maxWidth: '800px', margin: '0 auto', border: '4px solid black', background: 'var(--secondary)', boxShadow: '8px 8px 0 rgba(0,0,0,0.2)' }}>
           
           <div style={{ background: schema.theme?.primary_color || 'var(--primary)', color: schema.theme?.text_color || 'var(--secondary)', padding: '2rem', borderBottom: '4px solid black' }}>
               <h1 style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>{schema.title}</h1>
               <p style={{color: 'inherit', opacity: 0.8}}>{schema.description}</p>
           </div>
           
           <form onSubmit={handleSubmit} style={{ padding: '3rem' }}>
               {schema.fields && schema.fields.map((field: any, idx: number) => {
                   if (!isFieldVisible(field)) return null;

                   return (
                     <div key={idx} className="form-group" style={{ marginBottom: '2rem' }}>
                         <label style={{ fontSize: '1.2rem', fontWeight: 900 }}>{field.label || 'Untitled'}</label>
                         {field.type === 'textarea' ? (
                             <textarea 
                               required={field.is_required}
                               style={{border: '2px solid black'}}
                               onChange={e => handleInputChange(field.id || String(idx), e.target.value)}
                             />
                         ) : field.type === 'select' ? (
                            <select 
                               required={field.is_required}
                               style={{border: '2px solid black', width: '100%', padding: '0.875rem 1rem'}}
                               onChange={e => handleInputChange(field.id || String(idx), e.target.value)}
                            >
                                <option value="">Select option...</option>
                                {field.options?.map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                            </select>
                         ) : (
                             <input 
                               type={field.type || 'text'}
                               required={field.is_required}
                               style={{border: '2px solid black'}}
                               onChange={e => handleInputChange(field.id || String(idx), e.target.value)}
                             />
                         )}
                     </div>
                   );
               })}
               <button type="submit" className="btn btn-primary btn-large btn-block" style={{marginTop: '2rem'}}>
                   Submit Form
               </button>
           </form>
       </div>
    </div>
  );
}
