export default function TabShell({
  pageTitle,
  pageSubtitle,
  title,
  loading,
  error,
  loaded,
  onLoad,
  emptyTitle,
  emptyMsg,
  children,
}) {
  const showEmpty = loaded && !loading && !error && hasNoChildren(children);

  return (
    <>
      {pageTitle && (
        <div className="page-header">
          <h1 className="page-title">{pageTitle}</h1>
          {pageSubtitle && <div className="page-subtitle">{pageSubtitle}</div>}
        </div>
      )}
      <div className="card">
        <div className="tab-header">
          <strong>{title}</strong>
          <button className="ghost sm" onClick={onLoad} disabled={loading}>
            {loading ? 'Loading…' : loaded ? '↻ Refresh' : 'Load'}
          </button>
        </div>
        {error && <div className="error">Error: {error}</div>}
        {loading && !loaded && (
          <>
            <div className="skeleton skeleton-row" style={{ width: '60%' }}></div>
            <div className="skeleton skeleton-row" style={{ width: '90%' }}></div>
            <div className="skeleton skeleton-row" style={{ width: '75%' }}></div>
          </>
        )}
        {showEmpty ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">{emptyTitle || 'Nothing here yet'}</div>
            <div className="empty-state-msg">{emptyMsg || 'Try refreshing or check QuickBooks for data.'}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </>
  );
}

function hasNoChildren(children) {
  if (!children) return true;
  if (Array.isArray(children)) return children.every((c) => !c);
  return false;
}
