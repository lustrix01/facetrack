# Neon PostgreSQL Database Setup & Production Guide

This guide details how to create, configure, migrate, and optimize a serverless PostgreSQL database on **Neon PostgreSQL** (`https://neon.tech`) for FaceTrack.

---

## 1. Create a Neon PostgreSQL Project

1. Sign in or create a free account at [https://console.neon.tech](https://console.neon.tech).
2. Click **Create Project**.
3. Name your project (e.g. `facetrack-production`) and select your target cloud region (e.g. `us-east-1`).
4. Click **Create Project**. Neon will generate a PostgreSQL database instance and display your database credentials.

---

## 2. Retrieve Connection Parameters

Copy your connection string from the Neon Console:
```text
postgresql://neondb_owner:YOUR_PASSWORD@ep-empty-violet-avfujn71.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Break down the parameters for your `backend/.env` file:
- **DB_HOST**: `ep-empty-violet-avfujn71.c-11.us-east-1.aws.neon.tech`
- **DB_PORT**: `5432`
- **DB_NAME**: `neondb`
- **DB_USER**: `neondb_owner`
- **DB_PASSWORD**: `YOUR_PASSWORD`
- **DB_SSLMODE**: `require`

---

## 3. Database Schema Migration

To initialize all PostgreSQL tables, foreign key constraints, and indexes, execute the schema migration script:

```bash
# Execute schema migration script via PHP CLI
php backend/config/schema.sql
```
*(Or import `backend/config/schema.sql` directly inside the Neon SQL Editor in the Neon Console).*

### Verification Checklist:
- `users`: Primary key `id`, unique constraint on `email`, unique constraint on `identifier`.
- `classes`: Unique constraint on `code`.
- `enrollments`: Foreign keys to `classes(id)` and `users(id)`, unique constraint `unique_class_student(class_id, student_id)`.
- `attendance_sessions`: Foreign key to `classes(id)`, indexes on `class_id` and `status`.
- `attendance`: Foreign key to `attendance_sessions(id)` and `users(id)`, unique constraint `unique_session_user_attendance(session_id, user_id)`.
- `face_enrollments`: Unique constraint on `user_id`.
- `privacy_consent`: Unique constraint on `user_id`.

---

## 4. Run Idempotent Seeder

Populate default administrative and seed accounts cleanly without overwriting existing data:

```bash
npm run seed
```

---

## 5. Security & SSL Requirements

- Neon PostgreSQL requires SSL connections (`sslmode=require`).
- The PHP PDO PostgreSQL driver automatically handles SNI endpoint routing using `options='endpoint=YOUR_ENDPOINT_ID'`.
