# Workforce Admin Dashboard

Read-only admin UI for employers and workers. Does not change employer/worker app behavior.

## Setup

```bash
cd admin-dashboard
npm install
cp .env.example .env
```

Set `VITE_API_URL` to your gateway (e.g. `http://localhost:4000` or `https://gateway-a8h4.onrender.com`).

## Auth service env (required)

On **auth-service**:

```text
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-password
```

## Run

```bash
npm run dev
```

Open http://localhost:5174 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Deploy

Build and host on Vercel/Netlify like the main frontend:

```bash
npm run build
```

Set `VITE_API_URL` in the host environment. Add the admin site URL to gateway `CORS_ORIGIN` if the browser blocks requests.
