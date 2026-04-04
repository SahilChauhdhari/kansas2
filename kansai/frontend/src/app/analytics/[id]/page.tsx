'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ThemeSwitcher from '../../components/ThemeSwitcher';
import { useAuth } from '@/context/AuthContext';

export default function FormAnalytics() {
  const { id } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !token) return;
    
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/analytics/form/${id}/metrics`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(metrics => {
        // Standardize metrics for the UI
        const standardized = {
            total_responses: metrics.completions || 0,
            avg_completion_time: metrics.avg_time || "0m 0s",
            conversion_rate: metrics.conversion_rate || 0,
            timeline: metrics.timeline || [],
            devices: metrics.devices || []
        };
        
        setData(standardized);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch analytics", err);
        setLoading(false);
        setData(null);
      });
  }, [id, token]);

  if (loading) return <div className="loading">Analyzing Data Engine...</div>;

  const metrics = data || {
    total_responses: 0,
    avg_completion_time: "0m",
    conversion_rate: 0,
    timeline: [],
    devices: []
  };

  return (
    <div className="analytics-layout">
      <nav className="navbar">
        <div className="navbar-container">
          <div className="logo">
            <span className="logo-icon">📊</span>
            <span className="logo-text">FORM #{id} INSIGHTS</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <ThemeSwitcher />
            <Link href="/dashboard"><button className="btn btn-secondary">Dashboard</button></Link>
          </div>
        </div>
      </nav>

      <div className="main-content">
        {!data ? (
           <div className="error-state brute">
              <h2>DATA STREAM OFFLINE</h2>
              <p>Could not retrieve telemetry for this Project. Ensure the form has received responses.</p>
              <Link href="/dashboard"><button className="btn btn-primary">Return to Studio</button></Link>
           </div>
        ) : (
          <>
            <div className="kpi-grid">
              <div className="kpi-card brute">
                <h3>Responses</h3>
                <h2>{metrics.total_responses.toLocaleString()}</h2>
              </div>
              <div className="kpi-card liquid">
                <h3>Avg. Time</h3>
                <h2>{metrics.avg_completion_time}</h2>
              </div>
              <div className="kpi-card minimal">
                <h3>Conversion</h3>
                <h2>{metrics.conversion_rate}%</h2>
              </div>
            </div>

            <div className="charts-row">
                <div className="chart-container">
                    <h3>Activity Timeline</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={metrics.timeline}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="responses" stroke="var(--accent)" strokeWidth={4} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-container">
                    <h3>Platform Split</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={metrics.devices} innerRadius={60} outerRadius={100} dataKey="value">
                                {metrics.devices.map((entry: any, index: number) => <Cell key={index} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="vault-exports">
              <h3 style={{marginBottom: '1rem', textTransform: 'uppercase', fontSize: '1.2rem', fontWeight: 900}}>Vault Data Exports</h3>
              <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/vault/form/${id}/export/csv`, '_blank')}
                  style={{background: 'var(--accent)', color: 'black', fontWeight: 900}}
                >
                  Download .CSV
                </button>
              </div>
            </div>

            <div className="vault-exports" style={{marginTop: '1rem'}}>
              <h3 style={{marginBottom: '1rem', textTransform: 'uppercase', fontSize: '1.2rem', fontWeight: 900}}>Analytics Aggregation Exports</h3>
              <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/analytics/form/${id}/export/csv`, '_blank')}
                  style={{background: 'var(--primary)', color: 'var(--bg)', fontWeight: 900}}
                >
                  Export Analytics .CSV
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/analytics/form/${id}/export/json`, '_blank')}
                  style={{fontWeight: 900}}
                >
                  Export Analytics .JSON
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .analytics-layout { min-height: 100vh; background: var(--bg); color: var(--text-dark); }
        .main-content { max-width: 1200px; margin: 0 auto; padding: 4rem var(--spacing); }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-bottom: 3rem; }
        .kpi-card { padding: 2.5rem; border: var(--border-width) solid var(--primary); box-shadow: var(--card-shadow); background: var(--card-bg); backdrop-filter: var(--blur); }
        .kpi-card.brute { background: var(--accent-3); }
        .kpi-card.liquid { background: var(--card-bg); }
        .kpi-card.minimal { background: var(--secondary); }
        .kpi-card h2 { font-size: 3.5rem; font-weight: 900; margin-top: 1rem; }
        .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
        .chart-container { background: var(--card-bg); border: var(--border-width) solid var(--primary); padding: 2rem; box-shadow: var(--card-shadow); backdrop-filter: var(--blur); }
        .vault-exports { margin-top: 2rem; background: var(--card-bg); border: var(--border-width) solid var(--primary); padding: 2.5rem; box-shadow: var(--card-shadow); backdrop-filter: var(--blur); }
        .loading { padding: 10rem; text-align: center; font-weight: 900; font-size: 2rem; background: var(--bg); height: 100vh; }
        .error-state { text-align: center; padding: 5rem; border: var(--border-width) solid var(--primary); background: var(--card-bg); box-shadow: var(--card-shadow); }
        .error-state.brute { background: var(--secondary); }
        .error-state h2 { font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem; }
        .error-state p { margin-bottom: 2rem; opacity: 0.7; }
      `}</style>
    </div>
  );
}
