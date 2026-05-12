const express = require('express');
const multer = require('multer');
const { getToken, apsFetch } = require('../lib/aps');
const { classify, APS_TRANSLATABLE } = require('../lib/apsFormats');
const {
  ensureBucket,
  uploadObject,
  startTranslation,
  getManifest,
  flattenDerivatives,
  getMetadata,
  getProperties,
  downloadDerivative,
  urnFor,
  defaultBucketKey,
} = require('../lib/apsTranslate');
const { Readable } = require('stream');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
const router = express.Router();

router.get('/status', async (_req, res) => {
  try {
    await getToken();
    res.json({ connected: true });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

router.get('/formats', (_req, res) => {
  res.json({ translatable: [...APS_TRANSLATABLE].sort() });
});

router.post('/classify', (req, res) => {
  const { filename } = req.body || {};
  if (!filename) return res.status(400).json({ error: 'filename required' });
  res.json(classify(filename));
});

router.get('/buckets', async (_req, res) => {
  try {
    const data = await apsFetch('/oss/v2/buckets?limit=50');
    res.json(data.items || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/buckets/:key/objects', async (req, res) => {
  try {
    const data = await apsFetch(`/oss/v2/buckets/${encodeURIComponent(req.params.key)}/objects?limit=50`);
    res.json(data.items || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload + start translation. Only call this for files where classify().route === 'aps'.
router.post('/translate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const { route } = classify(req.file.originalname);
    if (route !== 'aps') {
      return res.status(400).json({
        error: 'not_aps_translatable',
        hint: 'Send this file to your normal extractor instead.',
        route,
      });
    }

    const bucketKey = await ensureBucket();
    const objectKey = `${Date.now()}-${req.file.originalname}`;
    const uploaded = await uploadObject(bucketKey, objectKey, req.file.buffer);
    const urn = urnFor(uploaded.objectId);
    await startTranslation(urn);

    res.json({ urn, bucketKey, objectKey, size: req.file.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/translate/:urn/manifest', async (req, res) => {
  try {
    res.json(await getManifest(req.params.urn));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/translate/:urn/derivatives', async (req, res) => {
  try {
    const manifest = await getManifest(req.params.urn);
    res.json({
      status: manifest.status,
      progress: manifest.progress,
      derivatives: flattenDerivatives(manifest),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/translate/:urn/properties', async (req, res) => {
  try {
    const meta = await getMetadata(req.params.urn);
    const guids = (meta.data?.metadata || []).map((m) => m.guid);
    if (guids.length === 0) return res.json({ items: [] });
    const all = await Promise.all(guids.map((g) => getProperties(req.params.urn, g)));
    res.json({ items: all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/translate/:urn/download', async (req, res) => {
  try {
    const { derivative } = req.query;
    if (!derivative) return res.status(400).json({ error: 'derivative query param required' });
    const { stream, contentType, size } = await downloadDerivative(req.params.urn, derivative);
    if (contentType) res.setHeader('Content-Type', contentType);
    if (size) res.setHeader('Content-Length', size);
    Readable.fromWeb(stream).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
