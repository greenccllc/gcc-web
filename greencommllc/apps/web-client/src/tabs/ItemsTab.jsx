import { useResource } from './useResource';
import TabShell from './TabShell';

const fmt = (n) => (n == null ? '—' : `$${Number(n).toFixed(2)}`);

export default function ItemsTab() {
  const { items, loading, error, loaded, load } = useResource('/api/qb/items');

  return (
    <TabShell
      pageTitle="Items"
      pageSubtitle="Catalog items from QuickBooks Online."
      title={`Items ${loaded ? `(${items.length})` : ''}`}
      loading={loading}
      error={error}
      loaded={loaded}
      onLoad={load}
      emptyTitle="No items yet"
      emptyMsg="Connect QuickBooks in Settings to load your catalog."
    >
      {items.length > 0 && (
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Price</th><th>Active</th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.Id}>
                <td>{it.Name}</td>
                <td>{it.Type || '—'}</td>
                <td>{fmt(it.UnitPrice)}</td>
                <td>{it.Active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TabShell>
  );
}
