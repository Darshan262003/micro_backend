# Deploy on Render — fix 502 on `/auth/*` and `/employer/*`

## What 502 means

- **Gateway `/health` = 200** → gateway is running.
- **`POST /auth/worker/login` = 502** → gateway cannot reach **auth-service** (`AUTH_SERVICE_URL` wrong or auth crashed).
- **`GET /employer/jobs` = 502** → gateway cannot reach **job-service** (`JOB_SERVICE_URL` wrong or job crashed).

Your app returns **503 JSON** only when the Node proxy throws locally. **502** usually means the upstream Render service is down, sleeping, or misconfigured.

## Required services (4 Web Services + Atlas)

| # | Render service | Root directory | Health path |
|---|----------------|----------------|-------------|
| 1 | auth-service | `auth-service` | `/health` |
| 2 | user-service | `user-service` | `/health` |
| 3 | job-service | `job-service` | `/health` |
| 4 | gateway | `gateway` | `/health` |

Build: `npm install` · Start: `npm start` · Do **not** set `PORT` manually.

## Environment variables

### auth-service, user-service, job-service

| Variable | Value |
|----------|--------|
| `MONGO_URI` | Atlas URI, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/workforce_marketplace` |
| `JWT_SECRET` | Same strong secret on **all three** + gateway is not needed for JWT |

### job-service only

| Variable | Value |
|----------|--------|
| `USER_SERVICE_URL` | `https://<user-service>.onrender.com` |

### gateway

| Variable | Value |
|----------|--------|
| `AUTH_SERVICE_URL` | `https://<auth-service>.onrender.com` |
| `USER_SERVICE_URL` | `https://<user-service>.onrender.com` |
| `JOB_SERVICE_URL` | `https://<job-service>.onrender.com` |
| `CORS_ORIGIN` | `https://micro-frontend-drab.vercel.app` (+ localhost if needed) |

**Rules:** use `https://`, no trailing slash, never `http://localhost` on Render.

## Verify after deploy

1. Open each service directly: `https://<auth>.onrender.com/health` → `"db":"connected"`.
2. Open gateway: `https://gateway-a8h4.onrender.com/health` → JSON lists `upstreams` with `"ok": true` for auth, user, job.
3. Test login: `POST https://gateway-a8h4.onrender.com/auth/worker/login` with JSON body.

## MongoDB Atlas

If auth/job logs show `MongoDB connection failed`:

- Atlas → **Network Access** → allow `0.0.0.0/0` (or Render IPs).
- Password in `MONGO_URI` URL-encoded if it contains special characters.

## Free tier cold start

First request after idle can fail. Wait 30–60s and retry, or upgrade / use a keep-alive ping.
