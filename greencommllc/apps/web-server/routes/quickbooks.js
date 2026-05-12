const express = require('express');
const { qbClient } = require('../lib/qb');

const router = express.Router();

const promised = (qb, method, ...args) =>
  new Promise((resolve, reject) =>
    qb[method](...args, (err, data) => (err ? reject(err) : resolve(data))),
  );

router.get('/company', async (_req, res) => {
  try {
    const qb = await qbClient();
    const info = await promised(qb, 'getCompanyInfo', qb.realmId);
    res.json(info);
  } catch (err) {
    res.status(err.message === 'not_connected' ? 401 : 500).json({ error: err.message });
  }
});

router.get('/customers', async (_req, res) => {
  try {
    const qb = await qbClient();
    const result = await promised(qb, 'findCustomers', { limit: 50 });
    res.json(result?.QueryResponse?.Customer || []);
  } catch (err) {
    res.status(err.message === 'not_connected' ? 401 : 500).json({ error: err.message });
  }
});

router.get('/invoices', async (_req, res) => {
  try {
    const qb = await qbClient();
    const result = await promised(qb, 'findInvoices', { limit: 50 });
    res.json(result?.QueryResponse?.Invoice || []);
  } catch (err) {
    res.status(err.message === 'not_connected' ? 401 : 500).json({ error: err.message });
  }
});

router.get('/items', async (_req, res) => {
  try {
    const qb = await qbClient();
    const result = await promised(qb, 'findItems', { limit: 50 });
    res.json(result?.QueryResponse?.Item || []);
  } catch (err) {
    res.status(err.message === 'not_connected' ? 401 : 500).json({ error: err.message });
  }
});

module.exports = router;
