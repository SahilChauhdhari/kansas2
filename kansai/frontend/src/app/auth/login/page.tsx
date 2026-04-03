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
    
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const res = await fetch('http://localhost:8001/auth/login', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await login(data.access_token);
      } else {
        const err = await res.json();
        setError(err.detail || 'Login failed');
      }
    } catch (err) {
      setError('Connection failed. Is the backend running?');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p>Login to your FormFlow Studio</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              required 
              placeholder="Enter your username"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">Login</button>
        </form>
        
        <p className="auth-footer">
          Don't have an account? <Link href="/auth/register">Sign Up</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          padding: 2rem;
        }
        .auth-card {
          width: 100%;
          max-width: 450px;
          background: var(--card-bg);
          border: var(--border-width) solid var(--primary);
          padding: 3rem;
          box-shadow: var(--card-shadow);
          backdrop-filter: var(--blur);
        }
        h1 { font-size: 2.5rem; font-weight: 900; text-transform: uppercase; margin-bottom: 0.5rem; }
        p { opacity: 0.7; margin-bottom: 2rem; }
        .error-message {
          background: #fee2e2;
          border: 2px solid #ef4444;
          color: #b91c1c;
          padding: 1rem;
          margin-bottom: 2rem;
          font-weight: bold;
          font-size: 0.9rem;
        }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; font-weight: 900; text-transform: uppercase; font-size: 0.8rem; margin-bottom: 0.5rem; }
        input {
          width: 100%;
          padding: 1rem;
          border: var(--border-width) solid var(--primary);
          background: var(--bg);
          color: var(--text-dark);
          font-family: inherit;
        }
        .auth-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.9rem;
        }
        .auth-footer a {
          color: var(--accent);
          font-weight: 900;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
