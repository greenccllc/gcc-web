import { useState, useEffect } from 'react';
import DashboardTab from './tabs/DashboardTab.jsx';
import CustomersTab from './tabs/CustomersTab.jsx';
import InvoicesTab from './tabs/InvoicesTab.jsx';
import ItemsTab from './tabs/ItemsTab.jsx';
import APSTab from './tabs/APSTab.jsx';
import ExtractTab from './tabs/ExtractTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';

const SVG = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  style: { width: 15, height: 15, display: 'block' },
};

function NavIcon({ name }) {
  switch (name) {
    case 'dashboard': return (
      <svg {...SVG}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    );
    case 'extract': return (
      <svg {...SVG}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    );
    case 'customers': return (
      <svg {...SVG}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    );
    case 'invoices': return (
      <svg {...SVG}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    );
    case 'items': return (
      <svg {...SVG}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    );
    case 'aps': return (
      <svg {...SVG}>
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    );
    case 'settings': return (
      <svg {...SVG}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    );
    default: return null;
  }
}

const NAV = [
  {
    section: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard',   icon: 'dashboard', shortcut: '1', component: DashboardTab },
      { id: 'extract',   label: 'Extract',      icon: 'extract',   shortcut: '2', component: ExtractTab },
    ],
  },
  {
    section: 'QuickBooks',
    items: [
      { id: 'customers', label: 'Customers',   icon: 'customers', shortcut: '3', component: CustomersTab },
      { id: 'invoices',  label: 'Invoices',    icon: 'invoices',  shortcut: '4', component: InvoicesTab },
      { id: 'items',     label: 'Items',       icon: 'items',     shortcut: '5', component: ItemsTab },
    ],
  },
  {
    section: 'Tools',
    items: [
      { id: 'aps',      label: 'APS Buckets',  icon: 'aps',      shortcut: '6', component: APSTab },
      { id: 'settings', label: 'Settings',     icon: 'settings', shortcut: '7', component: SettingsTab },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((s) => s.items);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const ActiveComponent = ALL_ITEMS.find((i) => i.id === activeTab)?.component ?? DashboardTab;

  useEffect(() => {
    const handleKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const item = ALL_ITEMS.find((i) => i.shortcut === e.key);
      if (item) setActiveTab(item.id);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="app">
      <aside className="sidebar" aria-label="App navigation">
        <div className="sidebar-brand">
          <h1>Green Comm</h1>
          <div className="tag">ops console</div>
        </div>

        <nav className="sidebar-nav" aria-label="Main">
          {NAV.map((section) => (
            <div key={section.section}>
              <div className="sidebar-section">{section.section}</div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                  title={`${item.label} · press ${item.shortcut}`}
                >
                  <span className="nav-icon"><NavIcon name={item.icon} /></span>
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-shortcut">{item.shortcut}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>v0.1</span>
          <span>·</span>
          <span>greencommllc</span>
        </div>
      </aside>

      <main className="content">
        <ActiveComponent onNavigate={setActiveTab} />
      </main>
    </div>
  );
}
