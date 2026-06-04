require('dotenv').config();
const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const AUTH = (process.env.AUTH_SERVICE_URL || 'http://localhost:4001').replace(/\/$/, '');
const USER = (process.env.USER_SERVICE_URL || 'http://localhost:4002').replace(/\/$/, '');
const JOB = (process.env.JOB_SERVICE_URL || 'http://localhost:4003').replace(/\/$/, '');
const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 120000);

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Express strips the mount path before proxying; rewrite so backends still get /auth/..., /user/..., etc.
function proxyWithPrefix(prefix, target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => `${prefix}${path}`,
    proxyTimeout: PROXY_TIMEOUT_MS,
    on: {
      error(err, req, res) {
        console.error(`[gateway] ${prefix} proxy error → ${target}:`, err.message);
        if (res.writeHead && !res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              message: `${prefix} service unavailable at ${target}. Start the matching microservice (see LOCAL_DEV.md).`,
              statusCode: 503,
            })
          );
        }
      },
    },
  });
}

app.use('/auth', proxyWithPrefix('/auth', AUTH));
app.use('/user', proxyWithPrefix('/user', USER));
app.use('/employer', proxyWithPrefix('/employer', JOB));
app.use('/worker', proxyWithPrefix('/worker', JOB));
app.use('/jobs', proxyWithPrefix('/jobs', JOB));

function probeUpstream(name, baseUrl) {
  return new Promise((resolve) => {
    const url = new URL(`${baseUrl}/health`);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          name,
          url: baseUrl,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          body: body.slice(0, 200),
        });
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ name, url: baseUrl, ok: false, error: 'timeout' });
    });
    req.on('error', (err) => resolve({ name, url: baseUrl, ok: false, error: err.message }));
  });
}

app.get('/health', async (req, res) => {
  const upstreams = await Promise.all([
    probeUpstream('auth', AUTH),
    probeUpstream('user', USER),
    probeUpstream('job', JOB),
  ]);
  const allOk = upstreams.every((u) => u.ok);
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'OK' : 'DEGRADED',
    gateway: true,
    upstreams,
  });
});

app.listen(PORT, () => {
  console.log(`gateway on ${PORT}`);
  console.log(`  AUTH → ${AUTH}`);
  console.log(`  USER → ${USER}`);
  console.log(`  JOB  → ${JOB}`);
  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    for (const [label, url] of [
      ['AUTH_SERVICE_URL', AUTH],
      ['USER_SERVICE_URL', USER],
      ['JOB_SERVICE_URL', JOB],
    ]) {
      if (/localhost|127\.0\.0\.1/i.test(url)) {
        console.warn(`[gateway] ${label} points to localhost on Render — set https://<service>.onrender.com`);
      }
      if (url.startsWith('http://') && !/localhost|127\.0\.0\.1/i.test(url)) {
        console.warn(`[gateway] ${label} uses http — prefer https:// on Render`);
      }
    }
  }
});
