const http = require('http');
const fs = require('fs');
const path = require('path');

const logikaPath = path.join(__dirname, 'logika.csv');
let packages = [];

function loadCSV() {
  const text = fs.readFileSync(logikaPath, 'utf8').trim();
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(',');
  packages = lines.slice(1).filter(Boolean).map(line => {
    const cols = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i]);
    return obj;
  });
}

loadCSV();

function sendJSON(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/calc') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const phase = data.phase || '1F';
        const numPanels = data.numPanels || 0;
        const filtered = packages.filter(p => p.phase === phase && parseInt(p.panels, 10) >= numPanels);
        filtered.sort((a, b) => parseFloat(a.Cena) - parseFloat(b.Cena));
        sendJSON(res, { packages: filtered.slice(0, 3) });
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  } else if (req.method === 'POST' && req.url === '/api/lead') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const leadsFile = path.join(__dirname, 'leads.json');
        const leads = fs.existsSync(leadsFile) ? JSON.parse(fs.readFileSync(leadsFile)) : [];
        data.createdAt = new Date().toISOString();
        leads.push(data);
        fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2));
        sendJSON(res, { status: 'ok' });
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  } else {
    const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      const type = ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : 'text/html';
      res.writeHead(200, { 'Content-Type': type });
      res.end(content);
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on', PORT));
