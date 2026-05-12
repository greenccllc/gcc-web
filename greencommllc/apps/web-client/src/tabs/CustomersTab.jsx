import { useResource } from './useResource';
import TabShell from './TabShell';

export default function CustomersTab() {
  const { items, loading, error, loaded, load } = useResource('/api/qb/customers');

  return (
    <TabShell
      pageTitle="Customers"
      pageSubtitle="Customers synced from QuickBooks Online."
      title={`Customers ${loaded ? `(${items.length})` : ''}`}
      loading={loading}
      error={error}
      loaded={loaded}
      onLoad={load}
      emptyTitle="No customers yet"
      emptyMsg="Connect QuickBooks in Settings, then refresh."
    >
      {items.length > 0 && (
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Phone</th></tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.Id}>
                <td>{c.DisplayName}</td>
                <td>{c.PrimaryEmailAddr?.Address || '—'}</td>
                <td>{c.PrimaryPhone?.FreeFormNumber || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TabShell>
  );
}
