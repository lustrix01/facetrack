# FaceTrack — Production Deployment & Setup Guide

FaceTrack is a modern, high-performance facial recognition and geofenced attendance management system.

- **Frontend**: React + Vite + Tailwind CSS (Deployable to Vercel or Cloudflare Pages)
- **Backend**: PHP REST API (Deployable to standard PHP web hosting, Apache, Nginx, or CPanel)
- **Database**: Serverless PostgreSQL (Neon PostgreSQL)

---

## 1. Local Development Quickstart

```bash
# 1. Install dependencies and start full stack
npm run start
```
- **Frontend App**: `http://localhost:5173`
- **Backend REST API**: `http://localhost:8000`

---

## 2. Database Migration & Seeding (Neon PostgreSQL)

1. Obtain your connection string from the **Neon Console** (`https://console.neon.tech`).
2. Run database migration to initialize schema, foreign keys, and indexes:
   ```bash
   npm run migrate
   ```
3. Run safe, idempotent seeder script:
   ```bash
   npm run seed
   ```
   *Note: Seed account credentials created: Faculty (`FAC-2026-001` / `Password123!`), Student (`2026-0101` / `Password123!`).*

---

## 3. Backend Deployment (PHP REST API)

### Environment Configuration
Copy `backend/.env.example` to `backend/.env` on your server and configure credentials:
```env
DB_HOST=ep-empty-violet-avfujn71.c-11.us-east-1.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=your_neon_db_password
DB_SSLMODE=require
JWT_SECRET=your_production_jwt_secret_key
ALLOWED_ORIGIN=https://facetrack.vercel.app
```

### Apache / CPanel Deployment
1. Upload the `backend/` directory contents to your web root (`public_html/api` or custom domain root).
2. The included `.htaccess` file automatically manages URL rewriting for `/api/*` endpoints and preserves `Authorization` headers.

---

## 4. Frontend Deployment (Vercel / Cloudflare Pages)

### Vercel Deployment
1. Import `frontend/` repository to **Vercel**.
2. Set Build Command to: `npm run build`
3. Set Output Directory to: `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://api.yourdomain.com` (Your deployed PHP API URL)
5. `vercel.json` included in `frontend/` automatically handles SPA routing fallback.

### Cloudflare Pages Deployment
1. Create a project in **Cloudflare Pages**.
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Build output directory: `dist`
5. Add Environment Variable: `VITE_API_BASE_URL` = `https://api.yourdomain.com`
6. `_redirects` file included in `public/` handles SPA routing fallback.

---

## 5. Security & Verification

- **PDO Prepared Statements**: 100% of database queries use prepared statements with parameterized binding.
- **JWT Authorization**: Token payload is verified via `AuthMiddleware` using `HMAC-SHA256`.
- **Password Security**: Passwords are saved with `password_hash()` (Bcrypt) and verified via `password_verify()`.
- **Data Privacy Compliance**: Student biometric camera frames generate 128-dimensional embedding vectors; raw face images are restricted.
