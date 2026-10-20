/**
 * Local Development Server for ReelKar
 * Emulates Vercel Serverless Functions and serves static frontend assets.
 * Zero external dependencies — pure Node.js standard library.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...rest] = trimmed.split('=');
          if (key && !process.env[key.trim()]) {
            process.env[key.trim()] = rest.join('=').trim();
          }
        }
      });
      console.log(`[REELKAR DEV] Loaded environment variables from ${file}`);
      break;
    }
  }
}

loadEnv();

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  let pathname = urlObj.pathname;

  // Emulate Vercel Serverless Function: /api/analyze
  if (pathname === '/api/analyze') {
    return handleServerless(req, res, './api/analyze.js');
  }

  // Emulate Vercel Serverless Function: /api/feedback
  if (pathname === '/api/feedback') {
    return handleServerless(req, res, './api/feedback.js');
  }

  // Default to index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);

  // Security check to avoid directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  });
});

async function handleServerless(req, res, modulePath) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      if (body) {
        try {
          req.body = JSON.parse(body);
        } catch (e) {
          req.body = {};
        }
      } else {
        req.body = {};
      }

      // Add Vercel response helper methods
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };

      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return res;
      };

      const handlerModule = await import(`${modulePath}?t=${Date.now()}`);
      await handlerModule.default(req, res);
    } catch (err) {
      console.error('[REELKAR SERVERLESS ERROR]', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    }
  });
}

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🎬 ReelKar Server running at http://localhost:${PORT}`);
  console.log(`   - Gemini API Key: ${process.env.GEMINI_API_KEY ? 'CONFIGURED (' + process.env.GEMINI_API_KEY.substring(0, 10) + '...)' : 'MISSING (Fallback active)'}`);
  console.log(`   - Gemini Model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
  console.log(`========================================\n`);
});
