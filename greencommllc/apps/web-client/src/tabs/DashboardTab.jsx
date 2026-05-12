import { useEffect, useState } from 'react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardTab({ onNavigate }) {
  const [qb, setQb] = useState(null);
  const [aps, setAps] = useState(null);
  const [aidrive, setAidrive] = useState(null);
  const [gemini, setGemini] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/auth/status').then((r) => r.json()).catch(() => ({ connected: false })),
      fetch('/api/aps/status').then((r) => r.json()).catch(() => ({ connected: false })),
      fetch('/api/aidrive/status').then((r) => r.json()).catch(() => ({ configured: false })),
      fetch('/api/gemini/status').then((r) => r.json()).catch(() => ({ connected: false })),
    ]).then(([q, a, d, g]) => {
      setQb(q); setAps(a); setAidrive(d); setGemini(g);
      setLastChecked(new Date());
      setLoading(false);
    });
  }, []);

  const integrations = [
    {
      key: 'qb',
      label: 'QuickBooks',
      connected: qb?.connected,
      detail: qb?.connected ? `Realm ${qb.realmId}` : 'Not connected',
    },
    {
      key: 'aps',
      label: 'Autodesk APS',
      connected: aps?.connected,
      detail: aps?.connected ? 'Authenticated' : 'Configure in .env',
    },
    {
      key: 'gemini',
      label: 'Google Gemini',
      connected: gemini?.connected,
      detail: gemini?.connected ? gemini.model : 'API key not set',
    },
    {
      key: 'aidrive',
      label: 'Filestore',
      connected: aidrive?.configured && aidrive?.exists,
      detail: aidrive?.exists
        ? `${aidrive.topLevelCount} item${aidrive.topLevelCount === 1 ? '' : 's'}`
        : 'Not configured',
    },
  ];

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{getGreeting()}</h1>
        <div className="page-subtitle">
          Green Communications · ops console
          {lastChecked && (
            <span style={{ marginLeft: 8, color: 'var(--gcc-text-faint)' }}>
              · checked {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="dashboard-grid">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="metric-card">
              <div className="skeleton skeleton-row" style={{ width: '50%', height: 12 }} />
              <div className="skeleton skeleton-row" style={{ width: '30%', height: 22, marginTop: 8 }} />
              <div className="skeleton skeleton-row" style={{ width: '70%', height: 12, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className={`badge ${
              connectedCount === integrations.length ? 'badge-green'
              : connectedCount > 0 ? 'badge-gold'
              : 'badge-gray'
            }`}>
              {connectedCount}/{integrations.length} connected
            </span>
          </div>
          <div className="dashboard-grid">
            {integrations.map((i) => (
              <div key={i.key} className={`metric-card ${i.connected ? 'connected' : 'disconnected'}`}>
                <div className="metric-label">{i.label}</div>
                <div className="metric-value">{i.connected ? 'Live' : '—'}</div>
                <div className="metric-detail">{i.detail}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card">
        <div className="card-header">
          <strong>Quick actions</strong>
          <span className="meta">jump straight to a task</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button onClick={() => onNavigate('extract')}>↑ Extract a file</button>
          <button className="ghost" onClick={() => onNavigate('customers')}>View customers</button>
          <button className="ghost" onClick={() => onNavigate('invoices')}>View invoices</button>
          <button className="ghost" onClick={() => onNavigate('settings')}>Settings</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <strong>About</strong>
        </div>
        <div className="status">
          This console wires QuickBooks, Autodesk APS, Google Gemini, and Filestore
          sync into a single extraction + proposal pipeline. Drop CAD/Revit/PDF files into the
          Extract tab to push them through APS translation, then onward to the extractor and the
          proposal app.
        </div>
      </div>
    </>
  );
}
