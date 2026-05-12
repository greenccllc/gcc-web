import { useEffect, useState } from 'react';

const KIND_LABEL = {
  lead:    'Lead',
  message: 'Message',
  review:  'Review',
  unknown: 'Other',
};

const KIND_ICON = {
  lead:    '🎯',
  message: '💬',
  review:  '⭐',
  unknown: '📨',
};

export default function LeadsTab() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/webhooks/events');
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setError(String(e.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function clearAll() {
    if (!confirm('Clear all stored webhook events? Cannot be undone.')) return;
    await fetch('/api/webhooks/events?source=thumbtack', { method: 'DELETE' });
    load();
  }

  const filtered = filter === 'all' ? items : items.filter((i) => i.kind === filter);
  const counts = items.reduce((acc, i) => {
    acc[i.kind] = (acc[i.kind] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Leads</h1>
        <div className="page-subtitle">
          Webhook events from Thumbtack — leads, messages, and reviews.
          Configure the endpoint in <strong>Settings → Thumbtack</strong>.
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <strong>
            Received events {loading ? '· loading…' : `· ${items.length}`}
          </strong>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="ghost" onClick={load} disabled={loading}>↻ Refresh</button>
            {items.length > 0 && (
              <button className="ghost" onClick={clearAll}>Clear all</button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            ['all', `All (${items.length})`],
            ['lead', `${KIND_ICON.lead} Leads (${counts.lead || 0})`],
            ['message', `${KIND_ICON.message} Messages (${counts.message || 0})`],
            ['review', `${KIND_ICON.review} Reviews (${counts.review || 0})`],
          ].map(([k, label]) => (
            <button
              key={k}
              className={filter === k ? '' : 'ghost'}
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setFilter(k)}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <div className="error">Error: {error}</div>}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No events yet</div>
            <div className="empty-state-msg">
              Configure the webhook in Thumbtack and the next lead, message, or review will appear here.
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <div>
            {filtered.map((ev) => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function EventRow({ event }) {
  const [open, setOpen] = useState(false);
  const summary = summarizeEvent(event);
  return (
    <div className="lead-row">
      <div className="lead-head" onClick={() => setOpen((o) => !o)}>
        <span className="lead-icon">{KIND_ICON[event.kind] || KIND_ICON.unknown}</span>
        <div className="lead-info">
          <div className="lead-title">{summary.title}</div>
          <div className="lead-sub">{summary.sub}</div>
        </div>
        <div className="lead-meta">
          <div>{KIND_LABEL[event.kind] || event.kind}</div>
          <div className="lead-time">{new Date(event.receivedAt).toLocaleString()}</div>
        </div>
        <span className={`lead-caret ${open ? 'open' : ''}`}>▾</span>
      </div>
      {open && (
        <pre className="lead-payload">
{JSON.stringify(event.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

function summarizeEvent(event) {
  const p = event.payload || {};
  if (event.kind === 'lead') {
    const c = p.customer || {};
    return {
      title: c.name || p.name || p.lead_id || 'Lead received',
      sub:   [p.service, p.budget, p.message || p.description].filter(Boolean).join(' · ') || '—',
    };
  }
  if (event.kind === 'message') {
    return {
      title: `From ${p.from || p.customer || 'customer'}${p.lead_id ? ' · ' + p.lead_id : ''}`,
      sub:   p.text || p.message || '—',
    };
  }
  if (event.kind === 'review') {
    const stars = p.rating ? '★'.repeat(p.rating) + '☆'.repeat(5 - p.rating) : '';
    return {
      title: `${stars} ${p.customer || p.from || 'Reviewer'}`,
      sub:   p.text || p.body || p.message || '—',
    };
  }
  return {
    title: p.event_type || p.type || 'Event',
    sub:   JSON.stringify(p).slice(0, 80),
  };
}
