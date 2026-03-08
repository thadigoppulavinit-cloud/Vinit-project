const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'notes.json');

ensureDataFile();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/notes')) {
    return handleApi(req, res, url);
  }

  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Notes app running at http://localhost:${PORT}`);
});

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function readNotes() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotes(notes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2), 'utf8');
}

function json(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });

  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[2];

  if (req.method === 'GET' && segments.length === 2) {
    const notes = readNotes().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return json(res, 200, notes);
  }

  if (req.method === 'POST' && segments.length === 2) {
    const body = await readBody(req);
    const now = new Date().toISOString();
    const note = {
      id: cryptoRandomId(),
      title: (body.title || 'Untitled note').trim() || 'Untitled note',
      content: (body.content || '').trim(),
      createdAt: now,
      updatedAt: now,
    };
    const notes = readNotes();
    notes.unshift(note);
    writeNotes(notes);
    return json(res, 201, note);
  }

  if (req.method === 'PUT' && segments.length === 3 && id) {
    const body = await readBody(req);
    const notes = readNotes();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return json(res, 404, { error: 'Note not found' });

    notes[idx] = {
      ...notes[idx],
      title: (body.title || '').trim() || 'Untitled note',
      content: (body.content || '').trim(),
      updatedAt: new Date().toISOString(),
    };

    notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    writeNotes(notes);
    return json(res, 200, notes.find((n) => n.id === id));
  }

  if (req.method === 'DELETE' && segments.length === 3 && id) {
    const notes = readNotes();
    const filtered = notes.filter((n) => n.id !== id);
    if (filtered.length === notes.length) return json(res, 404, { error: 'Note not found' });
    writeNotes(filtered);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'Route not found' });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data = chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function contentTypeByExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': contentTypeByExt(filePath) });
    return res.end(data);
  });
}

function cryptoRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}