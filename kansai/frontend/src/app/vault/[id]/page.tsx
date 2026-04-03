'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function VaultDashboard() {
  const { id } = useParams();
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:8001/vault/form/${id}/responses`)
      .then(res => res.json())
      .then(data => {
         setResponses(data);
         setLoading(false);
      })
      .catch(err => console.error(err));
  }, [id]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '4rem' }}>
       <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
             <div>
               <h1 style={{ fontSize: '3rem', margin: 0 }}>Response Vault</h1>
               <p style={{ marginTop: '0.5rem' }}>Secure Dashboard for Form ID: {id}</p>
             </div>
             
             <div style={{ display: 'flex', gap: '1rem' }}>
                <a href={`http://localhost:8001/vault/form/${id}/export/csv`} target="_blank" rel="noreferrer">
                   <button className="btn btn-primary" style={{ background: 'var(--accent-4)', color: 'white' }}>
                      <i className="fas fa-file-csv"></i> Export CSV
                   </button>
                </a>
                <a href={`http://localhost:8001/vault/form/${id}/export/json`} target="_blank" rel="noreferrer">
                   <button className="btn btn-primary" style={{ background: 'var(--accent-3)', color: 'black' }}>
                      <i className="fas fa-file-code"></i> Export JSON
                   </button>
                </a>
             </div>
          </div>

          <div style={{ border: '4px solid black', background: 'var(--secondary)', boxShadow: '8px 8px 0 rgba(0,0,0,0.2)', padding: '2rem' }}>
             
             {loading ? (
                <h2>Loading Vault...</h2>
             ) : responses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                   <h2 style={{color: '#999'}}>No responses found yet.</h2>
                </div>
             ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '4px solid black' }}>
                                <th style={{ padding: '1rem' }}>ID</th>
                                <th style={{ padding: '1rem' }}>Data Payload</th>
                                <th style={{ padding: '1rem' }}>Submitted At</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {responses.map((resp: any) => (
                                <tr key={resp.id} style={{ borderBottom: '2px solid #ccc' }}>
                                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{resp.id}</td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {JSON.stringify(resp.submission_data)}
                                    </td>
                                    <td style={{ padding: '1rem' }}>{new Date(resp.submitted_at).toLocaleString()}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ background: resp.submission_status === 'pending' ? 'var(--accent-3)' : 'var(--accent)', padding: '0.2rem 0.5rem', border: '2px solid black', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                           {resp.submission_status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             )}
          </div>
          
          <div style={{ marginTop: '2rem' }}>
             <Link href="/"><button className="btn btn-secondary"><i className="fas fa-arrow-left"></i> Return Home</button></Link>
          </div>
       </div>
    </div>
  );
}
