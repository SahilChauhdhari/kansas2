'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const registerRes = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001') + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (registerRes.ok) {
        // Auto-login after registration
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const loginRes = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001') + '/auth/login', {
          method: 'POST',
          body: formData,
        });

        if (loginRes.ok) {
          const data = await loginRes.json();
          await login(data.access_token);
        } else {
          window.location.href = '/auth/login';
        }
      } else {
        const err = await registerRes.json();
        setError(err.detail || 'Registration failed');
      }
    } catch (err) {
      setError('Connection failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
        <Link href="/" style={{position: 'absolute', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, textDecoration: 'none', color: 'var(--text-dark)', fontSize: '1.5rem', zIndex: 100}}>
           <span style={{fontSize: '1.8rem'}}>⚡</span> SCRIBA
        </Link>
      <div className="auth-card">
        <h1>Join Scriba</h1>
        <p>Create your Studio account</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              required 
              placeholder="Pick a creative username"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="you@example.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="Create a strong password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? 'Processing...' : 'Register Account'}
          </button>
        </form>
        
        <p className="auth-footer">
          Already have an account? <Link href="/auth/login">Login</Link>
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
        button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
