const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'webhook-events.json');
const MAX_EVENTS = 500;

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { events: [] };
  }
}

function persist(state) {
  fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
}

function append(source, kind, payload) {
  const state = load();
  state.events.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    source,
    kind,
    payload,
  });
  if (state.events.length > MAX_EVENTS) {
    state.events.length = MAX_EVENTS;
  }
  persist(state);
  return state.events[0];
}

function list({ source, kind, limit = 100 } = {}) {
  const state = load();
  let out = state.events;
  if (source) out = out.filter((e) => e.source === source);
  if (kind) out = out.filter((e) => e.kind === kind);
  return out.slice(0, limit);
}

function clear({ source, kind } = {}) {
  if (!source && !kind) {
    persist({ events: [] });
    return;
  }
  const state = load();
  state.events = state.events.filter(
    (e) => (source && e.source !== source) || (kind && e.kind !== kind),
  );
  persist(state);
}

module.exports = { append, list, clear };
