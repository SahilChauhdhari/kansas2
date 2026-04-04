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

  const { user, logout } = useAuth();

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
                  <span className="logo-text">FORMFLOW</span>
              </div>
              <ul className="nav-links">
                  <li><a href="#features">Features</a></li>
                  <li><Link href="/dashboard">Workshop</Link></li>

                  {user ? (
                    <li><button onClick={logout} className="nav-link-btn">Logout ({user.username})</button></li>
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
                        <button className="btn btn-primary">Start Building Free</button>
                      </Link>
                      <button className="btn btn-secondary">Watch Demo</button>
                  </div>
              </div>
              <div className="hero-illustration">
                  <div className="shape shape-1" style={{background: 'var(--accent)'}}></div>
                  <div className="shape shape-2" style={{background: 'var(--accent-2)'}}></div>
                  <div className="shape shape-3" style={{background: 'var(--accent-3)'}}></div>
                  <div className="floating-card" style={{background: 'var(--card-bg)', border: 'var(--border-width) solid var(--primary)', boxShadow: 'var(--card-shadow)', backdropFilter: 'var(--blur)'}}>
                      <div className="card-item" style={{borderBottom: '2px solid var(--primary)', justifyContent: 'center', fontSize: '2.5rem', padding: '1rem'}}>📋</div>
                      <div className="card-item" style={{borderBottom: 'none', justifyContent: 'center', fontSize: '2.5rem', padding: '1rem'}}>📊</div>
                  </div>
              </div>
          </div>
      </section>

      <section className="features" id="features">
          <div className="section-header">
              <h2>Powerful Features</h2>
              <p>Everything you need to create stunning forms</p>
          </div>
          <div className="features-grid">
              <div className="feature-card">
                  <div className="feature-icon">🎨</div>
                  <h3>Visual Builder</h3>
                  <p>Drag-and-drop interface. No coding required. Build complex forms in minutes.</p>
              </div>
              <div className="feature-card">
                  <div className="feature-icon">⚙️</div>
                  <h3>Smart Logic</h3>
                  <p>Conditional fields, branching logic, and dynamic calculations built-in.</p>
              </div>
              <div className="feature-card">
                  <div className="feature-icon">🚀</div>
                  <h3>Real-Time Editors</h3>
                  <p>Build forms simultaneously with your team using real-time remote cursors.</p>
              </div>
          </div>
      </section>

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
