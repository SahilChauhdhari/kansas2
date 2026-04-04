'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ThemeSwitcher from '../components/ThemeSwitcher';

export default function Dashboard() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, token, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchForms = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001') + '/workshop/forms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setForms(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch forms', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleCreateForm = async () => {
    if (!token) return;
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001') + '/workshop/forms', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'New Scriba Project' })
      });
      if (res.ok) {
        fetchForms(); // Refresh list
      }
    } catch (err) {
      console.error('Create form failed', err);
    }
  };

  const handleDeleteForm = async (id: number) => {
    if (!token) return;
    if (!confirm('Are you sure you want to permanently delete this project?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001'}/workshop/forms/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchForms();
    } catch (err) {
      console.error('Delete form failed', err);
    }
  };

  const handleRenameForm = async (id: number, currentTitle: string) => {
    if (!token) return;
    const newTitle = prompt('Enter new form title:', currentTitle);
    if (!newTitle || newTitle.trim() === '' || newTitle === currentTitle) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001'}/workshop/forms/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) fetchForms();
    } catch (err) {
      console.error('Rename form failed', err);
    }
  };

  if (authLoading || loading) return <div className="loading">Loading Studio...</div>;
  if (!user) return null;

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-container">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">STUDIO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
             <span style={{fontWeight: 900, fontSize: '0.8rem', opacity: 0.6}}>USER: {user.username.toUpperCase()}</span>
            <ThemeSwitcher />
            <button onClick={logout} className="btn btn-secondary">Logout</button>
          </div>
        </div>
      </nav>

      <main className="content">
        <header className="header">
          <h1>Projects</h1>
          <button onClick={handleCreateForm} className="btn btn-primary">+ Create New Form</button>
        </header>

        <div className="forms-grid">
          {forms.map(form => (
            <div key={form.id} className="form-card">
              <div className="card-header">
                <h3>{form.title}</h3>
                <span className="status-tag">Live</span>
              </div>
              <p>{form.description}</p>
              <div className="card-actions">
                <Link href={`/workshop/${form.id}`}><button className="btn btn-small">Build</button></Link>
                <Link href={`/analytics/${form.id}`}><button className="btn btn-small btn-secondary">Stats</button></Link>
                <Link href={`/stage/${form.slug}`} target="_blank"><button className="btn btn-small btn-secondary">Visit</button></Link>
                
                <div style={{marginLeft: 'auto', display: 'flex', gap: '0.5rem'}}>
                  <button onClick={() => handleRenameForm(form.id, form.title)} className="btn btn-small btn-secondary" title="Rename"><i className="fas fa-edit"></i> ✏️</button>
                  <button onClick={() => handleDeleteForm(form.id)} className="btn btn-small" style={{background: 'var(--accent-4, #ff3366)', color: 'white', borderColor: 'var(--primary)'}} title="Delete">🗑️</button>
                </div>
              </div>
            </div>
          ))}
          {forms.length === 0 && (
            <div className="empty-state">
              <p>No forms found. Start by creating your first architectual masterpiece!</p>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .dashboard-container { min-height: 100vh; background: var(--bg); color: var(--text-dark); }
        .content { max-width: 1200px; margin: 0 auto; padding: 4rem var(--spacing); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
        .header h1 { font-size: 3rem; text-transform: uppercase; }
        .forms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 2rem; }
        .form-card { background: var(--card-bg); border: var(--border-width) solid var(--primary); padding: 2.5rem; box-shadow: var(--card-shadow); transition: all 0.2s ease; }
        .form-card:hover { transform: translateY(-4px); }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
        .status-tag { background: var(--accent-3); border: 2px solid black; padding: 2px 8px; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; }
        .card-actions { display: flex; gap: 0.5rem; margin-top: 2rem; flex-wrap: wrap; align-items: center; }
        .btn-small { padding: 0.4rem 0.8rem; font-size: 0.85rem; }
        .loading { padding: 10rem; text-align: center; font-weight: 900; font-size: 2rem; background: var(--bg); height: 100vh; }
      `}</style>
    </div>
  );
}
