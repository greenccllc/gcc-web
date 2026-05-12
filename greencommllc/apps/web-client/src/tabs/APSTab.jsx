import { useEffect, useState } from 'react';
import { useResource } from './useResource';
import TabShell from './TabShell';

export default function APSTab() {
  const [apsStatus, setApsStatus] = useState(null);
  const { items, loading, error, loaded, load } = useResource('/api/aps/buckets');

  useEffect(() => {
    fetch('/api/aps/status').then((r) => r.json()).then(setApsStatus);
  }, []);

  if (apsStatus && !apsStatus.connected) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">APS Buckets</h1>
          <div className="page-subtitle">Autodesk Platform Services storage.</div>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔌</div>
            <div className="empty-state-title">APS not configured</div>
            <div className="empty-state-msg">
              Set <code>APS_CLIENT_ID</code> and <code>APS_CLIENT_SECRET</code> in <code>server/.env</code>.
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <TabShell
      pageTitle="APS Buckets"
      pageSubtitle="Autodesk Platform Services storage."
      title={`Buckets ${loaded ? `(${items.length})` : ''}`}
      loading={loading}
      error={error}
      loaded={loaded}
      onLoad={load}
      emptyTitle="No buckets yet"
      emptyMsg="Buckets are auto-created when you upload files in Extract."
    >
      {items.length > 0 && (
        <table>
          <thead>
            <tr><th>Bucket Key</th><th>Created</th><th>Policy</th></tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.bucketKey}>
                <td>{b.bucketKey}</td>
                <td>{b.createdDate ? new Date(b.createdDate).toLocaleDateString() : '—'}</td>
                <td>{b.policyKey || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TabShell>
  );
}
