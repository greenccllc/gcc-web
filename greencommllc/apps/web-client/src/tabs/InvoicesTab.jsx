import { useResource } from './useResource';
import TabShell from './TabShell';

const fmt = (n) => (n == null ? '—' : `$${Number(n).toFixed(2)}`);

export default function InvoicesTab() {
  const { items, loading, error, loaded, load } = useResource('/api/qb/invoices');

  return (
    <TabShell
      pageTitle="Invoices"
      pageSubtitle="Invoices from QuickBooks Online."
      title={`Invoices ${loaded ? `(${items.length})` : ''}`}
      loading={loading}
      error={error}
      loaded={loaded}
      onLoad={load}
      emptyTitle="No invoices yet"
      emptyMsg="Connect QuickBooks in Settings to load."
    >
      {items.length > 0 && (
        <table>
          <thead>
            <tr><th>#</th><th>Customer</th><th>Date</th><th>Total</th><th>Balance</th></tr>
          </thead>
          <tbody>
            {items.map((inv) => (
              <tr key={inv.Id}>
                <td>{inv.DocNumber || inv.Id}</td>
                <td>{inv.CustomerRef?.name || '—'}</td>
                <td>{inv.TxnDate || '—'}</td>
                <td>{fmt(inv.TotalAmt)}</td>
                <td>{fmt(inv.Balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TabShell>
  );
}
