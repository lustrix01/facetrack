# Vercel Deployment Guide (Frontend)

This guide explains how to deploy the React + Vite frontend of **FaceTrack** to **Vercel**.

---

## 1. Prerequisites

- A GitHub repository containing the FaceTrack project.
- A Vercel account (`https://vercel.com`).
- Your deployed PHP REST API URL (e.g., `https://api.yourdomain.com`).

---

## 2. Deploy via Vercel Dashboard

1. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Select your GitHub repository.
3. In the **Root Directory** section, select `frontend` (if deploying from a monorepo) or leave blank if deploying from the `frontend/` repository root.
4. Configure Build and Output Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://api.yourdomain.com` (Your deployed PHP API URL)
6. Click **Deploy**.

---

## 3. Client-Side SPA Routing Rewrites

The project includes `frontend/vercel.json` which automatically ensures all client-side routes (e.g. `/faculty/classes`, `/student/attendance`) fallback to `index.html`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 4. Verification

After deployment completes:
1. Open your Vercel deployment URL (e.g., `https://facetrack.vercel.app`).
2. Test signing in as Faculty (`FAC-2026-001` / `Password123!`).
3. Refresh the page on any sub-route to verify that client-side SPA routing works properly.
