require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const AUTH = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const USER = process.env.USER_SERVICE_URL || 'http://localhost:4002';
const JOB = process.env.JOB_SERVICE_URL || 'http://localhost:4003';

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
    // pathRewrite: (path) => path,
    proxyTimeout: 15000,
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

app.get('/health', (req, res) => res.status(200).json({ status: 'OK', gateway: true }));

app.listen(PORT, () => {
  console.log(`gateway on ${PORT}`);
});
