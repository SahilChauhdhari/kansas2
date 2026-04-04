'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeSwitcher from './components/ThemeSwitcher';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { user, token, logout } = useAuth();
  const [forms, setForms] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001') + '/workshop/forms', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : [])
    .then(data => setForms(data))
    .catch(() => {});
  }, [token]);

  // Keyboard shortcut to open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setModalOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeModal = () => setModalOpen(false);

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
          <div className="navbar-container">
              <div className="logo">
                  <span className="logo-icon">⚡</span>
                  <span className="logo-text">SCRIBA</span>
              </div>
              <ul className="nav-links">
                  <li><a href="#features">Features</a></li>
                  <li><Link href="/dashboard">Workshop</Link></li>

                  {user ? (
                    <li><span onClick={logout} style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--accent)' }}>Logout ({user.username})</span></li>
                  ) : (
                    <li><Link href="/login">Login</Link></li>
                  )}
              </ul>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <ThemeSwitcher />
                <button className="nav-cta" onClick={() => setModalOpen(true)}>Get Started</button>
              </div>
          </div>
      </nav>

      <section className="hero">
          <div className="hero-content">
              <div className="hero-text">
                  <h1 className="hero-title">Build Forms,<br/>Not Friction</h1>
                  <p className="hero-subtitle">Create powerful forms with zero coding. Launch in minutes. Scale infinitely.</p>
                  <div className="hero-buttons">
                      <Link href="/dashboard">
                        <button className="btn btn-primary">{user ? "Enter Studio" : "Start Building Free"}</button>
                      </Link>
                      <button className="btn btn-secondary">Watch Demo</button>
                  </div>
                  
                  {user && forms.length > 0 && (
                      <div style={{marginTop: '3rem', background: 'var(--card-bg)', border: 'var(--border-width) solid var(--primary)', padding: '2rem', boxShadow: 'var(--card-shadow)'}}>
                         <h3 style={{textTransform: 'uppercase', fontWeight: 900, marginBottom: '1rem', borderBottom: '2px dashed var(--primary)', paddingBottom: '0.5rem'}}>Quick Access Endpoints</h3>
                         <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                             {forms.slice(0,3).map((f:any) => (
                                 <div key={f.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
                                     <strong style={{fontSize: '1.2rem'}}>{f.title}</strong>
                                     <div style={{display: 'flex', gap: '0.5rem'}}>
                                        <Link href={`/workshop/${f.id}`}><button className="btn" style={{padding: '0.4rem 0.8rem', fontSize:'0.8rem'}}>Workshop</button></Link>
                                        <Link href={`/analytics/${f.id}`}><button className="btn" style={{padding: '0.4rem 0.8rem', fontSize:'0.8rem', background:'var(--accent-2)'}}>Analytics</button></Link>
                                        <Link href={`/vault/${f.id}`}><button className="btn" style={{padding: '0.4rem 0.8rem', fontSize:'0.8rem', background:'var(--accent-3)'}}>Vault</button></Link>
                                     </div>
                                 </div>
                             ))}
                             {forms.length > 3 && <Link href="/dashboard" style={{textAlign: 'center', marginTop: '1rem', fontWeight: 'bold', color: 'var(--accent)', textDecoration: 'none'}}>View All Projects &rarr;</Link>}
                         </div>
                      </div>
                  )}
              </div>
              <div className="hero-illustration">
                  <div className="shape shape-1" style={{background: 'var(--accent)'}}></div>
                  <div className="shape shape-2" style={{background: 'var(--accent-2)'}}></div>
                  <div className="shape shape-3" style={{background: 'var(--accent-3)'}}></div>
              </div>
          </div>
      </section>

      <footer className="footer" id="features">
          <div className="footer-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '2rem' }}>
              <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Scriba Features</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '3rem', justifyContent: 'center' }}>
                      <li style={{ maxWidth: '250px' }}>
                          <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🎨</span>
                          <strong>Visual Builder</strong>
                          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Drag-and-drop interface. No coding required.</p>
                      </li>
                      <li style={{ maxWidth: '250px' }}>
                          <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>⚙️</span>
                          <strong>Smart Logic</strong>
                          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Conditional fields and dynamic calculations.</p>
                      </li>
                      <li style={{ maxWidth: '250px' }}>
                          <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🚀</span>
                          <strong>Real-Time Editors</strong>
                          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Build forms simultaneously with your team.</p>
                      </li>
                  </ul>
              </div>
          </div>
          <div className="footer-bottom" style={{ marginTop: '2rem' }}>
              &copy; {new Date().getFullYear()} Scriba. All rights reserved.
          </div>
      </footer>

      {modalOpen && (
        <div className="modal active">
            <div className="modal-overlay" onClick={closeModal}></div>
            <div className="modal-content">
                <button className="modal-close" onClick={closeModal}>
                    <i className="fas fa-times"></i>
                </button>
                <h2>Start Building Forms</h2>
                <form className="signup-form" onSubmit={(e) => { e.preventDefault(); window.location.href='/workshop' }}>
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input type="text" id="name" placeholder="John Doe" required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Enter The Workshop</button>
                </form>
            </div>
        </div>
      )}
    </>
  );
}
