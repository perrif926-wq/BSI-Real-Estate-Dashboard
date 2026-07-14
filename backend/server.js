require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));

const DATA_FILE = path.join(__dirname, 'data', 'properties.json');
const EDIT_KEY = process.env.EDIT_KEY || '';

function requireEditKey(req, res, next) {
  if (!EDIT_KEY) return next();
  if (req.get('x-edit-key') === EDIT_KEY) return next();
  return res.status(401).json({ error: 'Invalid or missing edit key' });
}

async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/properties', async (req, res) => {
  try {
    const data = await readData();
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Replace full properties array
app.post('/api/properties', requireEditKey, async (req, res) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ error: 'Expected an array of properties' });
    }
    await writeData(payload);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to write data' });
  }
});

// Upsert single property
app.put('/api/properties/:id', requireEditKey, async (req, res) => {
  try {
    const id = req.params.id;
    const item = req.body;
    const data = await readData();
    const idx = data.findIndex(p => p.id === id);
    if (idx >= 0) data[idx] = { ...data[idx], ...item };
    else data.unshift(item);
    await writeData(data);
    res.json({ ok: true, item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upsert property' });
  }
});

// Delete property
app.delete('/api/properties/:id', requireEditKey, async (req, res) => {
  try {
    const id = req.params.id;
    let data = await readData();
    data = data.filter(p => p.id !== id);
    await writeData(data);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
