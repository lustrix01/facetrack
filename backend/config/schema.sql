-- =============================================================================
-- FaceTrack - PostgreSQL Database Schema & Seed Data
-- Compatible with PostgreSQL 12+ / Neon PostgreSQL
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reusable Trigger Function for Automatic updated_at Timestamps
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. Users Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(50) UNIQUE NOT NULL, -- Faculty ID or Student Number
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('faculty', 'student', 'admin')),
    department VARCHAR(100) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_identifier ON users(identifier);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- Seed Default Accounts into Neon PostgreSQL
INSERT INTO users (identifier, name, email, password_hash, role, department)
VALUES
    ('FAC-2026-001', 'Dr. Sarah Jenkins', 'sjenkins@facetrack.edu', '$2y$10$9DT6sNHzOLJ51GYS7AbhIuJy5FVXRAuPZ3uTgO/21V9lGf/Zpx8Ya', 'faculty', 'Computer Science'),
    ('FAC-2026-002', 'Prof. Michael Chang', 'mchang@facetrack.edu', '$2y$10$9DT6sNHzOLJ51GYS7AbhIuJy5FVXRAuPZ3uTgO/21V9lGf/Zpx8Ya', 'faculty', 'Engineering'),
    ('2026-0101', 'Alex Rivera', 'arivera@student.facetrack.edu', '$2y$10$9DT6sNHzOLJ51GYS7AbhIuJy5FVXRAuPZ3uTgO/21V9lGf/Zpx8Ya', 'student', 'Information Technology'),
    ('2026-0102', 'Emily Watson', 'ewatson@student.facetrack.edu', '$2y$10$9DT6sNHzOLJ51GYS7AbhIuJy5FVXRAuPZ3uTgO/21V9lGf/Zpx8Ya', 'student', 'Computer Science')
ON CONFLICT (identifier) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- -----------------------------------------------------------------------------
-- 2. Classes Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    section VARCHAR(50) NOT NULL DEFAULT 'Sec 1',
    description TEXT,
    faculty_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    schedule_day VARCHAR(50) DEFAULT 'Mon / Wed',
    start_time TIME DEFAULT '09:00:00',
    end_time TIME DEFAULT '10:30:00',
    room VARCHAR(50) NOT NULL DEFAULT 'Lab 1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT 'Sec 1';

CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(code);
CREATE INDEX IF NOT EXISTS idx_classes_faculty_id ON classes(faculty_id);

DROP TRIGGER IF EXISTS trigger_classes_updated_at ON classes;
CREATE TRIGGER trigger_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- -----------------------------------------------------------------------------
-- 3. Enrollments Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_class_student UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);

-- -----------------------------------------------------------------------------
-- 4. AttendanceSessions Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id SERIAL PRIMARY KEY,
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    faculty_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    latitude NUMERIC(10, 7) DEFAULT 14.5995,
    longitude NUMERIC(10, 7) DEFAULT 120.9842,
    radius_meters INT DEFAULT 50,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7) DEFAULT 14.5995;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) DEFAULT 120.9842;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS radius_meters INT DEFAULT 50;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_faculty_id ON attendance_sessions(faculty_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON attendance_sessions(status);

DROP TRIGGER IF EXISTS trigger_attendance_sessions_updated_at ON attendance_sessions;
CREATE TRIGGER trigger_attendance_sessions_updated_at
    BEFORE UPDATE ON attendance_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- -----------------------------------------------------------------------------
-- 5. Attendance Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'late', 'absent', 'excused')),
    confidence_score NUMERIC(5, 4),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checkout_time TIMESTAMP WITH TIME ZONE,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    distance_meters NUMERIC(10, 2),
    image_path VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_student UNIQUE (session_id, student_id)
);

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkout_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS distance_meters NUMERIC(10, 2);

CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);

DROP TRIGGER IF EXISTS trigger_attendance_updated_at ON attendance;
CREATE TRIGGER trigger_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- -----------------------------------------------------------------------------
-- 6. FaceEnrollments Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS face_enrollments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    descriptor_data JSONB NOT NULL,
    sample_count INT DEFAULT 5,
    image_path VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS sample_count INT DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_face_enrollments_user_id ON face_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_face_enrollments_status ON face_enrollments(status);

DROP TRIGGER IF EXISTS trigger_face_enrollments_updated_at ON face_enrollments;
CREATE TRIGGER trigger_face_enrollments_updated_at
    BEFORE UPDATE ON face_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- -----------------------------------------------------------------------------
-- 7. PrivacyConsent Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS privacy_consent (
    id SERIAL PRIMARY KEY,
    consent_id INT GENERATED ALWAYS AS IDENTITY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    agreed BOOLEAN NOT NULL DEFAULT FALSE,
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    consent_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    ip_address VARCHAR(45),
    agreed_at TIMESTAMP WITH TIME ZONE,
    consented_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE privacy_consent ADD COLUMN IF NOT EXISTS agreed BOOLEAN DEFAULT FALSE;
ALTER TABLE privacy_consent ADD COLUMN IF NOT EXISTS agreed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_privacy_consent_user_id ON privacy_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_consent_agreed ON privacy_consent(agreed);

DROP TRIGGER IF EXISTS trigger_privacy_consent_updated_at ON privacy_consent;
CREATE TRIGGER trigger_privacy_consent_updated_at
    BEFORE UPDATE ON privacy_consent
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
