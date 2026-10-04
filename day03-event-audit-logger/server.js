const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const AuditLogger = require('./logger');

const PORT = 3000;
const LOG_FILE = path.join(__dirname, 'audit.log');
const logger = new AuditLogger(LOG_FILE);

// Dedicated listener for high-severity security incidents
logger.on('log', (entry) => {
  if (entry.level === 'WARN' || entry.level === 'ERROR') {
    console.log(`\x1b[41m ALERT \x1b[0m Immediate review required for: ${entry.action}`);
  }
});

// Safe Body Parser
function parseRequestBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve(null); // Invalid JSON
      }
    });
    req.on('error', () => resolve(null));
  });
}

function sendJSON(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const clientIp = req.socket.remoteAddress || '127.0.0.1';

  try {
    // 1. POST /api/login
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const body = await parseRequestBody(req);

      if (!body) {
        logger.warn('INVALID_JSON_PAYLOAD', {}, clientIp);
        return sendJSON(res, 400, { success: false, error: 'Malformed JSON payload' });
      }

      const { username, password } = body;

      if (!username || !password) {
        logger.warn('AUTH_MISSING_CREDENTIALS', { payload: body }, clientIp);
        return sendJSON(res, 400, { success: false, error: 'Username and password required' });
      }

      if (username === 'admin' && password === 'supersecret') {
        logger.info('USER_LOGIN_SUCCESS', { username }, clientIp);
        return sendJSON(res, 200, { success: true, message: `Welcome back, ${username}!` });
      } else {
        logger.warn('USER_LOGIN_FAILED', { username }, clientIp);
        return sendJSON(res, 401, { success: false, error: 'Unauthorized: Invalid credentials' });
      }
    }

    // 2. GET /api/logs
    if (url.pathname === '/api/logs' && req.method === 'GET') {
      let rawContent = '';
      try {
        rawContent = await fs.readFile(LOG_FILE, 'utf-8');
      } catch (e) {
        rawContent = '';
      }

      const lines = rawContent
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);

      logger.info('AUDIT_LOGS_ACCESSED', { recordsCount: lines.length }, clientIp);
      return sendJSON(res, 200, { success: true, count: lines.length, logs: lines });
    }

    // 404 Route
    logger.warn('ROUTE_NOT_FOUND', { path: url.pathname, method: req.method }, clientIp);
    return sendJSON(res, 404, { success: false, error: 'Endpoint not found' });
  } catch (error) {
    console.error('Unhandled internal error:', error);
    logger.error('SERVER_UNCAUGHT_EXCEPTION', { error: error.message }, clientIp);
    return sendJSON(res, 500, { success: false, error: 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`Day 3 Audit Logger Server running at http://localhost:${PORT}`);
});