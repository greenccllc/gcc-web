const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'tokens.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return null;
  }
}

function save(tokens) {
  fs.writeFileSync(FILE, JSON.stringify(tokens, null, 2));
}

function clear() {
  if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
}

module.exports = { load, save, clear };
