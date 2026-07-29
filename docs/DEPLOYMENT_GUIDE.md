# Master Production Deployment Guide

This guide connects all component deployment steps into a unified workflow for launching **FaceTrack** into production.

---

## Architecture Blueprint

```text
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│     Frontend App        │       │     Backend REST API    │       │     Database Layer      │
│  (Vercel / Cloudflare)  │ ────> │ (Apache / Nginx / PHP)  │ ────> │ (Neon PostgreSQL Cloud) │
│  React + Vite + Tailwind│       │  PHP 8.1+ REST API      │       │ PostgreSQL 15+          │
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
```

---

## Detailed Step-by-Step Deployment Workflow

1. **Database Setup (Neon PostgreSQL)**:
   Follow [docs/NEON_DATABASE_GUIDE.md](file:///c:/Users/Owhie%20Lumbang/Desktop/facetrack/docs/NEON_DATABASE_GUIDE.md) to set up your cloud database and run schema migrations.

2. **Backend API Deployment**:
   Follow [docs/PHP_HOSTING_GUIDE.md](file:///c:/Users/Owhie%20Lumbang/Desktop/facetrack/docs/PHP_HOSTING_GUIDE.md) to deploy the PHP backend to your server and configure environment variables in `backend/.env`.

3. **Frontend App Deployment**:
   Follow [docs/VERCEL_DEPLOYMENT_GUIDE.md](file:///c:/Users/Owhie%20Lumbang/Desktop/facetrack/docs/VERCEL_DEPLOYMENT_GUIDE.md) or [docs/CLOUDFLARE_PAGES_GUIDE.md](file:///c:/Users/Owhie%20Lumbang/Desktop/facetrack/docs/CLOUDFLARE_PAGES_GUIDE.md) to deploy the user interface and set `VITE_API_BASE_URL`.

4. **Post-Deployment Verification**:
   Review [deployment_checklist.md](file:///c:/Users/Owhie%20Lumbang/Desktop/facetrack/deployment_checklist.md) to ensure all security checks, CORS parameters, and SPA rewrites function properly.
