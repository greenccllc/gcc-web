const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const router = express.Router();

function configuredPath() {
  return process.env.MYAIDRIVE_PATH || '';
}

async function statSafe(p) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

router.get('/status', async (_req, res) => {
  const dir = configuredPath();
  if (!dir) return res.json({ configured: false, path: null });
  const stat = await statSafe(dir);
  if (!stat || !stat.isDirectory()) {
    return res.json({ configured: true, path: dir, exists: false });
  }
  let topLevelCount = 0;
  try {
    topLevelCount = (await fs.readdir(dir)).length;
  } catch {
    // ignore
  }
  return res.json({ configured: true, path: dir, exists: true, topLevelCount });
});

router.get('/list', async (req, res) => {
  const dir = configuredPath();
  if (!dir) return res.status(400).json({ error: 'MYAIDRIVE_PATH not set' });
  const sub = req.query.sub ? path.join(dir, String(req.query.sub)) : dir;
  if (!sub.startsWith(dir)) return res.status(400).json({ error: 'invalid path' });
  try {
    const entries = await fs.readdir(sub, { withFileTypes: true });
    res.json(
      entries.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? 'dir' : 'file',
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
