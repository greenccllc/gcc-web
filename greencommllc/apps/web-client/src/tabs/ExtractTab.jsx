import { useEffect, useRef, useState } from 'react';

export default function ExtractTab() {
  const [translatable, setTranslatable] = useState([]);
  const [file, setFile] = useState(null);
  const [classification, setClassification] = useState(null);
  const [job, setJob] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [derivatives, setDerivatives] = useState([]);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetch('/api/aps/formats')
      .then((r) => r.json())
      .then((d) => setTranslatable(d.translatable || []))
      .catch(() => {});
    return () => clearInterval(pollRef.current);
  }, []);

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    setError(null);
    setJob(null);
    setProgress(null);
    setDerivatives([]);
    fetch('/api/aps/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: f.name }),
    })
      .then((r) => r.json())
      .then(setClassification)
      .catch(() => setClassification({ route: 'unknown' }));
  }

  async function translate() {
    if (!file) return;
    setError(null);
    setJob({ status: 'uploading' });

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/aps/translate', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || 'upload failed');
      const data = await res.json();
      setJob({ status: 'translating', urn: data.urn, objectKey: data.objectKey });
      pollManifest(data.urn);
    } catch (err) {
      setError(err.message);
      setJob(null);
    }
  }

  function pollManifest(urn) {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/aps/translate/${encodeURIComponent(urn)}/manifest`);
        const data = await res.json();
        setProgress({ status: data.status, progress: data.progress });
        if (data.status === 'success' || data.status === 'failed' || data.status === 'timeout') {
          clearInterval(pollRef.current);
          setJob((j) => ({ ...j, status: data.status === 'success' ? 'done' : data.status }));
          if (data.status === 'success') loadDerivatives(urn);
        }
      } catch (err) {
        // keep trying
      }
    }, 4000);
  }

  async function loadDerivatives(urn) {
    try {
      const res = await fetch(`/api/aps/translate/${encodeURIComponent(urn)}/derivatives`);
      const data = await res.json();
      setDerivatives(data.derivatives || []);
    } catch (err) {
      // non-fatal
    }
  }

  function downloadHref(urn, derivativeUrn) {
    return `/api/aps/translate/${encodeURIComponent(urn)}/download?derivative=${encodeURIComponent(derivativeUrn)}`;
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Extract</h1>
        <div className="page-subtitle">
          Drop a file. PDFs and CAD/Revit formats route through APS for structure-enrichment first.
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <strong>Upload</strong>
          <span className="meta">
            APS supports {translatable.length} translatable formats
          </span>
        </div>

      <div
        className="dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pickFile(e.dataTransfer.files?.[0]);
        }}
      >
        {file ? <span>{file.name}</span> : <span>Drop or click to choose a file</span>}
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      {classification && (
        <div className="route-info">
          {classification.route === 'aps' && (
            <>
              <strong>{classification.ext}</strong> — {classification.ext === '.pdf'
                ? 'APS will add structure (per-sheet metadata, properties). Generally improves extraction.'
                : 'native CAD format — APS will translate to a viewable model + PDF.'}
              {' '}Then your normal extractor takes over.
              {!job && (
                <button style={{ marginLeft: 12 }} onClick={translate}>
                  Translate via APS
                </button>
              )}
            </>
          )}
          {classification.route === 'native' && (
            <>
              <strong>{classification.ext}</strong> — your normal extractor handles this directly.
              No APS needed.
            </>
          )}
          {classification.route === 'unknown' && (
            <>
              <strong>{classification.ext || '(no extension)'}</strong> — unsupported. Neither
              APS nor the native extractor recognizes this format.
            </>
          )}
        </div>
      )}

      {job && (
        <div className="job-status">
          <div>Status: <strong>{job.status}</strong></div>
          {progress && (
            <div>
              Translation: {progress.status} {progress.progress && `· ${progress.progress}`}
            </div>
          )}
          {job.urn && (
            <div className="urn">
              URN: <code>{job.urn}</code>
            </div>
          )}
          {job.status === 'done' && (
            <div className="status connected">
              Ready · {derivatives.length} derivative{derivatives.length === 1 ? '' : 's'} available.
            </div>
          )}
        </div>
      )}

      {error && <div className="error" style={{ marginTop: 12 }}>Error: {error}</div>}
      </div>

      {derivatives.length > 0 && (
        <div className="card">
          <div className="card-header">
            <strong>Derivative outputs</strong>
            <span className="meta">feed any of these into your extractor</span>
          </div>
          <table>
            <thead>
              <tr><th>Role</th><th>Type</th><th>Name / Size</th><th></th></tr>
            </thead>
            <tbody>
              {derivatives.map((d) => (
                <tr key={d.urn}>
                  <td>{d.role || '—'}</td>
                  <td><code>{d.mime || d.type || '—'}</code></td>
                  <td>
                    {d.name || d.urn.split('/').pop()}
                    {d.size && <span className="status"> · {(d.size / 1024).toFixed(1)} KB</span>}
                  </td>
                  <td>
                    <a href={downloadHref(job.urn, d.urn)} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
