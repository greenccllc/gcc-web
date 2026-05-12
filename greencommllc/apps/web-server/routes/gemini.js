const express = require('express');
const multer = require('multer');
const { isConfigured, ping, extractFromFile, stylize } = require('../lib/gemini');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const router = express.Router();

router.get('/status', async (_req, res) => {
  if (!isConfigured()) return res.json({ connected: false, configured: false });
  try {
    const reply = await ping();
    res.json({ connected: true, configured: true, model: process.env.GEMINI_EXTRACT_MODEL || 'gemini-2.5-flash', reply });
  } catch (err) {
    res.json({ connected: false, configured: true, error: err.message });
  }
});

router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const schema = req.body.schema ? JSON.parse(req.body.schema) : undefined;
    const data = await extractFromFile({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      instructions: req.body.instructions,
      schema,
    });
    res.json(data);
  } catch (err) {
    res.status(err.message === 'gemini_not_configured' ? 400 : 500).json({ error: err.message });
  }
});

router.post('/stylize', async (req, res) => {
  try {
    const { content, instructions, voice } = req.body || {};
    if (!content) return res.status(400).json({ error: 'content required' });
    const html = await stylize({ content, instructions, voice });
    res.json({ html });
  } catch (err) {
    res.status(err.message === 'gemini_not_configured' ? 400 : 500).json({ error: err.message });
  }
});

module.exports = router;
