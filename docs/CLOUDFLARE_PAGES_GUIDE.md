# Cloudflare Pages Deployment Guide (Frontend)

This guide details how to deploy the React + Vite frontend of **FaceTrack** to **Cloudflare Pages**.

---

## 1. Prerequisites

- A Cloudflare account (`https://dash.cloudflare.com`).
- GitHub repository containing the FaceTrack codebase.
- Deployed backend API domain (e.g. `https://api.yourdomain.com`).

---

## 2. Deploy via Cloudflare Dashboard

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com) and navigate to **Workers & Pages**.
2. Click **Create Application** -> **Pages** -> **Connect to Git**.
3. Select your repository.
4. Set Build Settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
5. Under **Environment variables (production)**, add:
   - `VITE_API_BASE_URL` = `https://api.yourdomain.com`
6. Click **Save and Deploy**.

---

## 3. SPA Client Routing (`_redirects`)

Cloudflare Pages uses `frontend/public/_redirects` to handle Single Page Application client routing:
```text
/* /index.html 200
```
This file is automatically copied to `dist/_redirects` during build to ensure seamless browser refresh support on sub-routes.
