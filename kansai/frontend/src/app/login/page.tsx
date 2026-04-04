'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001') + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        login(data.access_token);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <div className="auth-container">
        <Link href="/" style={{position: 'absolute', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, textDecoration: 'none', color: 'var(--text-dark)', fontSize: '1.5rem', zIndex: 100}}>
           <span style={{fontSize: '1.8rem'}}>⚡</span> SCRIBA
        </Link>
      <div className="auth-card">
        <h1>Login to Scriba</h1>
        <p>Enter your credentials to access the workshop</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          
          <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
            <button 
              type="button" 
              onClick={() => { setUsername('test'); setPassword('test'); }}
              style={{ 
                background: "#000", color: "#fff", padding: "0.5rem 1rem", 
                border: "2px solid #000", cursor: "pointer", fontWeight: "bold",
                boxShadow: "4px 4px 0 #ff006e"
              }}
            >
              Autofill Test Credentials
            </button>
          </div>

          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">Login</button>
        </form>
        
        <p className="auth-footer">
          Don't have an account? <Link href="/register">Register here</Link>
        </p>
      </div>
      
      <style jsx>{`
        .auth-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #fafafa;
        }
        .auth-card {
          width: 100%;
          max-width: 450px;
          padding: 3rem;
          background: white;
          border: 4px solid black;
          box-shadow: 12px 12px 0 black;
        }
        h1 { margin-bottom: 0.5rem; text-transform: uppercase; font-weight: 900; }
        .auth-error {
          background: #fee2e2;
          color: #dc2626;
          padding: 1rem;
          border: 2px solid #dc2626;
          margin-bottom: 1.5rem;
          font-weight: bold;
        }
        .auth-footer { margin-top: 2rem; text-align: center; font-weight: bold; }
        .auth-footer a { color: #ff006e; text-decoration: underline; }
      `}</style>
    </div>
  );
}
