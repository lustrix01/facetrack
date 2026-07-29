# FaceTrack Production Deployment Checklist

Use this checklist to ensure all security, database, frontend, and backend configurations are verified before going live.

---

## 1. Database Deployment (Neon PostgreSQL)
- [x] Schema initialized with PostgreSQL tables (`users`, `classes`, `enrollments`, `attendance_sessions`, `attendance`, `face_enrollments`, `privacy_consent`).
- [x] Indexes created on foreign keys (`class_id`, `student_id`, `faculty_id`, `session_id`, `user_id`).
- [x] Unique constraint `unique_class_student` enforced on `enrollments(class_id, student_id)`.
- [x] Unique constraint `unique_session_user_attendance` enforced on `attendance(session_id, user_id)`.
- [x] Executed `npm run seed` or `php backend/config/seed.php` for initial seed accounts.

---

## 2. Backend Deployment (PHP REST API)
- [x] Installed `.htaccess` file for Apache URL rewrite & Authorization header pass-through.
- [x] Configured environment variables in `backend/.env` or server environment (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `ALLOWED_ORIGIN`).
- [x] Verified CORS preflight handling (`OPTIONS` -> HTTP 204).
- [x] Tested JWT token verification middleware across protected routes.
- [x] Confirmed 100% prepared PDO statements used in database queries.

---

## 3. Frontend Deployment (Vercel / Cloudflare Pages)
- [x] Configured `VITE_API_BASE_URL` in host platform environment variables (Vercel / Cloudflare Pages Dashboard).
- [x] Added `vercel.json` and `_redirects` for Single Page Application (SPA) client-side routing.
- [x] Verified zero hardcoded `http://localhost` URLs in frontend bundle.
- [x] Confirmed build command `npm run build` generates `dist/` cleanly without TypeScript compiler errors.
