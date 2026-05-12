const { apsFetch, getToken } = require('./aps');

const API_BASE = 'https://developer.api.autodesk.com';

// Bucket key: lowercase, alphanumeric + hyphens, 3-128 chars.
function defaultBucketKey() {
  return (process.env.APS_BUCKET_KEY || 'gcc-extraction').toLowerCase();
}

async function ensureBucket(bucketKey = defaultBucketKey()) {
  try {
    await apsFetch(`/oss/v2/buckets/${encodeURIComponent(bucketKey)}/details`);
    return bucketKey;
  } catch (err) {
    if (!String(err.message).includes('aps_404')) throw err;
  }
  await apsFetch('/oss/v2/buckets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketKey, policyKey: 'transient' }),
  });
  return bucketKey;
}

// Signed S3 upload (replaces deprecated direct PUT). Returns the OSS object info.
async function uploadObject(bucketKey, objectKey, buffer) {
  const signed = await apsFetch(
    `/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectKey)}/signeds3upload?minutesExpiration=10`,
  );
  const url = signed.urls[0];
  const uploadKey = signed.uploadKey;

  const putRes = await fetch(url, { method: 'PUT', body: buffer });
  if (!putRes.ok) throw new Error(`s3_upload_failed: ${putRes.status}`);

  const finalize = await apsFetch(
    `/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectKey)}/signeds3upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadKey }),
    },
  );
  return finalize;
}

function urnFor(objectId) {
  return Buffer.from(objectId).toString('base64').replace(/=+$/, '');
}

async function startTranslation(urn) {
  return apsFetch('/modelderivative/v2/designdata/job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { urn },
      output: {
        formats: [
          { type: 'svf2', views: ['2d', '3d'] },
        ],
      },
    }),
  });
}

async function getManifest(urn) {
  return apsFetch(`/modelderivative/v2/designdata/${encodeURIComponent(urn)}/manifest`);
}

// Walk the manifest tree and collect leaf derivatives that are downloadable.
function flattenDerivatives(manifest) {
  const out = [];
  (manifest.derivatives || []).forEach((d) => {
    walk(d, d.outputType || '', out);
  });
  return out;
}

function walk(node, parentRole, out) {
  if (node.urn && node.role !== 'viewable' && (node.mime || node.type === 'resource')) {
    out.push({
      urn: node.urn,
      role: node.role || parentRole,
      mime: node.mime || null,
      name: node.name || null,
      size: node.size || null,
      type: node.type || null,
    });
  }
  (node.children || []).forEach((c) => walk(c, parentRole, out));
}

async function getMetadata(urn) {
  return apsFetch(`/modelderivative/v2/designdata/${encodeURIComponent(urn)}/metadata`);
}

async function getProperties(urn, guid) {
  return apsFetch(
    `/modelderivative/v2/designdata/${encodeURIComponent(urn)}/metadata/${encodeURIComponent(guid)}/properties`,
  );
}

// Stream a derivative download through us so callers don't need APS auth.
async function downloadDerivative(urn, derivativeUrn) {
  const { getToken } = require('./aps');
  const token = await getToken();
  const url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodeURIComponent(urn)}/manifest/${encodeURIComponent(derivativeUrn)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`derivative_${res.status}: ${await res.text()}`);
  return { stream: res.body, contentType: res.headers.get('content-type'), size: res.headers.get('content-length') };
}

async function deleteObject(bucketKey, objectKey) {
  return apsFetch(
    `/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectKey)}`,
    { method: 'DELETE' },
  );
}

module.exports = {
  ensureBucket,
  uploadObject,
  startTranslation,
  getManifest,
  flattenDerivatives,
  getMetadata,
  getProperties,
  downloadDerivative,
  urnFor,
  deleteObject,
  defaultBucketKey,
};
