'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001') + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      if (res.ok) {
        router.push('/login?registered=true');
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Register for FormFlow</h1>
        <p>Join the future of form building</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
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
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
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
          <button type="submit" className="btn btn-primary btn-block">Register</button>
        </form>
        
        <p className="auth-footer">
          Already have an account? <Link href="/login">Login here</Link>
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
