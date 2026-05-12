import { useEffect, useState } from 'react';

const THUMBTACK_WEBHOOK_URL = 'https://api.greencommllc.com/api/webhooks/thumbtack';

export default function SettingsTab() {
  const [qb, setQb] = useState({ connected: false, realmId: null });
  const [aps, setAps] = useState({ connected: false, error: null });
  const [aidrive, setAidrive] = useState({ configured: false });
  const [gemini, setGemini] = useState({ configured: false, connected: false });
  const [thumbtack, setThumbtack] = useState({ count: 0, latest: null });
  const [thumbtackOpen, setThumbtackOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gbp, setGbp] = useState({ configured: false, connections: [] });
  const [gbpOpen, setGbpOpen] = useState(false);
  const [gbpSyncing, setGbpSyncing] = useState(false);
  const [gbpSyncResult, setGbpSyncResult] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      const [qbRes, apsRes, aidriveRes, geminiRes, ttRes, gbpRes] = await Promise.all([
        fetch('/auth/status').then((r) => r.json()),
        fetch('/api/aps/status').then((r) => r.json()),
        fetch('/api/aidrive/status').then((r) => r.json()),
        fetch('/api/gemini/status').then((r) => r.json()),
        fetch('/api/webhooks/events?source=thumbtack&limit=1').then((r) => r.json()).catch(() => ({ items: [] })),
        fetch('/api/gbp/status', { credentials: 'include' }).then((r) => r.ok ? r.json() : ({ configured: false, connections: [] })).catch(() => ({ configured: false, connections: [] })),
      ]);
      setQb(qbRes);
      setAps(apsRes);
      setAidrive(aidriveRes);
      setGemini(geminiRes);
      setThumbtack({
        count: ttRes.items?.length ? null : 0, // we don't have a count endpoint; show "Live" instead
        latest: ttRes.items?.[0]?.receivedAt || null,
      });
      setGbp(gbpRes);
    } catch (err) {
      // ignore
    }
  }

  async function connectGbp() {
    try {
      const res = await fetch('/api/gbp/connect', { credentials: 'include' });
      const data = await res.json();
      if (data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      } else if (!data.configured) {
        alert('Google Business Profile is not configured yet. Add Gbp:ClientId and Gbp:ClientSecret to server appsettings.json and redeploy.');
      }
    } catch (err) {
      alert('Failed to start GBP connect: ' + (err.message ?? err));
    }
  }

  async function disconnectGbp(id) {
    await fetch(`/api/gbp/disconnect/${id}`, { method: 'POST', credentials: 'include' });
    refresh();
  }

  async function syncGbpReviews() {
    setGbpSyncing(true);
    setGbpSyncResult(null);
    try {
      const res = await fetch('/api/gbp/reviews/sync', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      setGbpSyncResult(data);
    } catch (err) {
      setGbpSyncResult({ ok: false, error: String(err.message ?? err) });
    } finally {
      setGbpSyncing(false);
    }
  }

  async function disconnectQb() {
    await fetch('/auth/disconnect', { method: 'POST' });
    setQb({ connected: false, realmId: null });
  }

  function copyThumbtackUrl() {
    navigator.clipboard?.writeText(THUMBTACK_WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <div className="page-subtitle">Connect external services and manage local data sources.</div>
      </div>
      <div className="card">
        <div className="card-header">
          <strong>Integrations</strong>
          <button className="ghost" onClick={refresh}>↻ Refresh</button>
        </div>

        <IntegrationRow
          name="QuickBooks Online"
          description="Customer, invoice, and item sync via Intuit OAuth."
          connected={qb.connected}
          detail={qb.connected ? `Realm ${qb.realmId}` : null}
          action={
            qb.connected ? (
              <button className="ghost" onClick={disconnectQb}>Disconnect</button>
            ) : (
              <a href="/auth/connect"><button>Connect</button></a>
            )
          }
        />

        <IntegrationRow
          name="Thumbtack"
          description="Lead, message, and review webhooks captured into the Leads tab."
          connected={true}
          detail={
            thumbtack.latest
              ? `Last event ${new Date(thumbtack.latest).toLocaleString()}`
              : 'Endpoint live · no events received yet'
          }
          action={
            <button className="ghost" onClick={() => setThumbtackOpen((o) => !o)}>
              {thumbtackOpen ? 'Hide setup' : 'Setup'}
            </button>
          }
        >
          {thumbtackOpen && (
            <div className="integration-detail">
              <div className="integration-detail-label">Webhook endpoint URL</div>
              <div className="integration-detail-row">
                <code className="integration-detail-code">{THUMBTACK_WEBHOOK_URL}</code>
                <button onClick={copyThumbtackUrl}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <ol className="integration-steps">
                <li>In Thumbtack, choose <strong>Create a webhook</strong>.</li>
                <li>Paste the URL above into <strong>Endpoint URL</strong>.</li>
                <li><strong>Authorization type:</strong> None.</li>
                <li>Pick the Green Communications profile.</li>
                <li>Check <strong>Lead details</strong>, <strong>Messages</strong>, and <strong>Reviews</strong>.</li>
                <li>Set <strong>Status: Enabled</strong> and Save.</li>
              </ol>
              <div className="status">
                Method: POST · Accepts JSON · No signing required (Thumbtack offers none).
                Events arrive in the <strong>Leads</strong> tab.
              </div>
            </div>
          )}
        </IntegrationRow>

        <IntegrationRow
          name="Google Business Profile"
          description="Pull reviews from your GBP listing into the Leads tab. Admin OAuth via Google."
          connected={gbp.connections?.length > 0}
          detail={
            !gbp.configured
              ? 'Gbp:ClientId / Gbp:ClientSecret not set on the server'
              : gbp.connections?.length > 0
              ? `Connected as ${gbp.connections[0].email || gbp.connections[0].accountName || 'GBP account'}`
              : 'Configured · click Connect to authorize'
          }
          action={
            gbp.connections?.length > 0 ? (
              <button className="ghost" onClick={() => disconnectGbp(gbp.connections[0].id)}>
                Disconnect
              </button>
            ) : (
              <button onClick={connectGbp} disabled={!gbp.configured}>Connect</button>
            )
          }
        >
          <button
            className="ghost"
            style={{ marginTop: 8, fontSize: 12 }}
            onClick={() => setGbpOpen((o) => !o)}
          >
            {gbpOpen ? 'Hide setup' : 'Show setup steps'}
          </button>
          {gbpOpen && (
            <div className="integration-detail">
              <div className="integration-detail-label">One-time Google Cloud setup</div>
              <ol className="integration-steps">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console → APIs & Services → Credentials</a>.</li>
                <li>Create an <strong>OAuth 2.0 Client ID</strong> (Web application).</li>
                <li>Add <code>https://api.greencommllc.com/api/gbp/callback</code> as an Authorized redirect URI.</li>
                <li>Enable the <a href="https://console.cloud.google.com/apis/library/mybusinessbusinessinformation.googleapis.com" target="_blank" rel="noreferrer">My Business Business Information API</a> and <a href="https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com" target="_blank" rel="noreferrer">My Business Account Management API</a>.</li>
                <li>Apply for legacy My Business v4 API access (required for reviews) — <a href="https://developers.google.com/my-business/content/prereqs" target="_blank" rel="noreferrer">approval form</a>.</li>
                <li>Paste the Client ID + Secret into <code>appsettings.json</code> under <code>Gbp</code>, then redeploy.</li>
                <li>Click <strong>Connect</strong> and approve the consent screen.</li>
              </ol>
              {gbp.connections?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <button onClick={syncGbpReviews} disabled={gbpSyncing}>
                    {gbpSyncing ? 'Syncing…' : '↓ Sync reviews now'}
                  </button>
                  {gbpSyncResult && (
                    <div className={gbpSyncResult.ok ? 'status connected' : 'error'} style={{ marginTop: 8 }}>
                      {gbpSyncResult.ok
                        ? `Synced ${gbpSyncResult.reviews} review${gbpSyncResult.reviews === 1 ? '' : 's'} into Leads.`
                        : `Error: ${gbpSyncResult.error}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </IntegrationRow>

        <IntegrationRow
          name="Autodesk APS"
          description="Translate CAD/Revit/PDF for the extractor. App-credentials, no user auth."
          connected={aps.connected}
          detail={aps.connected ? 'Authenticated via APS_CLIENT_ID' : aps.error}
          action={
            <a href="https://aps.autodesk.com/myapps" target="_blank" rel="noreferrer">
              <button className="ghost">Manage app</button>
            </a>
          }
        />

        <IntegrationRow
          name="Google Gemini"
          description="LLM for extraction (alongside the rule-based extractor) and stylizing client-facing output."
          connected={gemini.connected}
          detail={
            !gemini.configured
              ? 'GEMINI_API_KEY not set in server/.env'
              : gemini.connected
              ? `Model ${gemini.model}`
              : gemini.error || 'Configured but not responding'
          }
          action={
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              <button className="ghost">Get API key</button>
            </a>
          }
        />

        <IntegrationRow
          name="MyAIDrive (local sync)"
          description="Local folder synced from MyAIDrive — extractor reads files dropped here."
          connected={aidrive.configured && aidrive.exists}
          detail={
            !aidrive.configured
              ? 'MYAIDRIVE_PATH not set in server/.env'
              : !aidrive.exists
              ? `Folder not found: ${aidrive.path}`
              : `${aidrive.path} · ${aidrive.topLevelCount} top-level item${aidrive.topLevelCount === 1 ? '' : 's'}`
          }
          action={
            <a href="https://myaidrive.com" target="_blank" rel="noreferrer">
              <button className="ghost">Open MyAIDrive</button>
            </a>
          }
        />
      </div>
    </>
  );
}

function IntegrationRow({ name, description, connected, detail, action, children }) {
  return (
    <div className="integration-row">
      <div className="integration-row-main">
        <div className="integration-info">
          <div className="integration-name">
            <span className={`dot ${connected ? 'dot-green' : 'dot-gray'}`} />
            <strong>{name}</strong>
          </div>
          <div className="status">{description}</div>
          {detail && (
            <div className={`status ${connected ? 'connected' : ''}`} style={{ marginTop: 4 }}>
              {detail}
            </div>
          )}
        </div>
        <div>{action}</div>
      </div>
      {children}
    </div>
  );
}
