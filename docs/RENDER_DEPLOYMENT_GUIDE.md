# Render.com Free PHP Backend Deployment Guide

This guide details how to deploy the **FaceTrack PHP REST API** to **Render.com** 100% free with automatic SSL/HTTPS and instant connection to Neon PostgreSQL.

---

## Why Render.com?

- **100% Free**: Free tier Web Service with SSL/HTTPS out of the box.
- **PostgreSQL Ready**: Native PostgreSQL PDO drivers pre-installed via Docker.
- **Zero Port Restrictions**: Connects seamlessly to Neon PostgreSQL on port `5432`.

---

## Step-by-Step Deployment Instructions

1. **Push Changes to GitHub**:
   ```bash
   git add .
   git commit -m "Add Render Docker deployment configuration"
   git push
   ```

2. **Sign Up / Log In to Render**:
   - Go to [https://render.com](https://render.com) and log in with your GitHub account.

3. **Create New Web Service**:
   - Click **New +** -> **Web Service**.
   - Select your GitHub repository (`lustrix01/facetrack`).
   - Render will auto-detect `render.yaml` or Docker.

4. **Environment Variables Configured Automatically**:
   Render will automatically populate your Neon PostgreSQL connection parameters from `render.yaml`:
   - `DB_HOST`: `ep-empty-violet-avfujn71.c-11.us-east-1.aws.neon.tech`
   - `DB_PORT`: `5432`
   - `DB_NAME`: `neondb`
   - `DB_USER`: `neondb_owner`
   - `DB_PASSWORD`: `npg_HADY0m9Rsxae`
   - `DB_SSLMODE`: `require`
   - `JWT_SECRET`: `facetrack_jwt_secret_neon_2026_production_secure_key`
   - `ALLOWED_ORIGIN`: `https://facetrack.vercel.app`

5. **Deploy**:
   - Click **Deploy Web Service**.
   - Render will build the Docker container and give you a free production URL (e.g. `https://facetrack-api.onrender.com`).

6. **Update Vercel**:
   - Go to **Vercel Dashboard** -> Project Settings -> **Environment Variables**.
   - Set `VITE_API_BASE_URL` = `https://facetrack-api.onrender.com`
   - Click **Redeploy**.
