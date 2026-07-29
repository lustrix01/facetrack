<?php
/**
 * FaceTrack REST API - Safe PostgreSQL Database Seeder
 * Compatible with PostgreSQL 12+ / Neon PostgreSQL
 * 
 * Rules:
 * - Idempotent: safe to run multiple times without creating duplicates.
 * - Never deletes or truncates data.
 * - Never drops tables or modifies existing records.
 * - Uses ON CONFLICT DO NOTHING and EXISTS checks to seed only missing data.
 */

require_once __DIR__ . '/database.php';

use Config\Database;

try {
    $database = new Database();
    $pdo = $database->getConnection();

    echo "=====================================================\n";
    echo "      FaceTrack Safe PostgreSQL Database Seeder      \n";
    echo "=====================================================\n";

    // Standard Bcrypt Hash for 'Password123!'
    $passwordHash = '$2y$10$9DT6sNHzOLJ51GYS7AbhIuJy5FVXRAuPZ3uTgO/21V9lGf/Zpx8Ya';

    // -------------------------------------------------------------------------
    // 1. Seed Faculty Accounts (ON CONFLICT (identifier) DO NOTHING)
    // -------------------------------------------------------------------------
    $facultyAccounts = [
        [
            'identifier' => 'FAC-2026-001',
            'name'       => 'Dr. Sarah Jenkins',
            'email'      => 'sjenkins@facetrack.edu',
            'role'       => 'faculty',
            'department' => 'Computer Science'
        ],
        [
            'identifier' => 'FAC-2026-002',
            'name'       => 'Prof. Michael Chang',
            'email'      => 'mchang@facetrack.edu',
            'role'       => 'faculty',
            'department' => 'Engineering'
        ]
    ];

    $userStmt = $pdo->prepare("
        INSERT INTO users (identifier, name, email, password_hash, role, department)
        VALUES (:identifier, :name, :email, :password_hash, :role, :department)
        ON CONFLICT (identifier) DO NOTHING
    ");

    $seededFacultyCount = 0;
    foreach ($facultyAccounts as $fac) {
        $userStmt->execute([
            ':identifier'   => $fac['identifier'],
            ':name'         => $fac['name'],
            ':email'        => $fac['email'],
            ':password_hash'=> $passwordHash,
            ':role'         => $fac['role'],
            ':department'   => $fac['department']
        ]);
        if ($userStmt->rowCount() > 0) {
            $seededFacultyCount++;
        }
    }
    echo "[✔] Faculty Accounts: {$seededFacultyCount} new record(s) seeded.\n";

    // -------------------------------------------------------------------------
    // 2. Seed Student Accounts (ON CONFLICT (identifier) DO NOTHING)
    // -------------------------------------------------------------------------
    $studentAccounts = [
        [
            'identifier' => '2026-0101',
            'name'       => 'Alex Rivera',
            'email'      => 'arivera@student.facetrack.edu',
            'role'       => 'student',
            'department' => 'Information Technology'
        ],
        [
            'identifier' => '2026-0102',
            'name'       => 'Emily Watson',
            'email'      => 'ewatson@student.facetrack.edu',
            'role'       => 'student',
            'department' => 'Computer Science'
        ],
        [
            'identifier' => '2026-0103',
            'name'       => 'Carlos Mendoza',
            'email'      => 'cmendoza@student.facetrack.edu',
            'role'       => 'student',
            'department' => 'Software Engineering'
        ]
    ];

    $seededStudentCount = 0;
    foreach ($studentAccounts as $stu) {
        $userStmt->execute([
            ':identifier'   => $stu['identifier'],
            ':name'         => $stu['name'],
            ':email'        => $stu['email'],
            ':password_hash'=> $passwordHash,
            ':role'         => $stu['role'],
            ':department'   => $stu['department']
        ]);
        if ($userStmt->rowCount() > 0) {
            $seededStudentCount++;
        }
    }
    echo "[✔] Student Accounts: {$seededStudentCount} new record(s) seeded.\n";

    // Get Primary Faculty User ID for class seeding
    $facIdStmt = $pdo->prepare("SELECT id FROM users WHERE identifier = 'FAC-2026-001' AND role = 'faculty' LIMIT 1");
    $facIdStmt->execute();
    $facUser = $facIdStmt->fetch(PDO::FETCH_ASSOC);
    $facultyId = $facUser['id'] ?? null;

    if ($facultyId) {
        // ---------------------------------------------------------------------
        // 3. Seed Classes (Checks if code + section + faculty_id exists first)
        // ---------------------------------------------------------------------
        $sampleClasses = [
            [
                'code'       => 'CS101',
                'name'       => 'Introduction to Computer Science',
                'section'    => 'Sec 1',
                'room'       => 'Lab 3',
                'day'        => 'Mon / Wed',
                'start_time' => '09:00:00',
                'end_time'   => '10:30:00'
            ],
            [
                'code'       => 'ENG202',
                'name'       => 'Advanced Software Engineering',
                'section'    => 'Sec 1',
                'room'       => 'Room 402',
                'day'        => 'Tue / Thu',
                'start_time' => '13:00:00',
                'end_time'   => '14:30:00'
            ]
        ];

        $checkClassStmt = $pdo->prepare("
            SELECT id FROM classes 
            WHERE LOWER(code) = LOWER(:code)
        ");

        $addClassStmt = $pdo->prepare("
            INSERT INTO classes (code, name, section, room, faculty_id, schedule_day, start_time, end_time)
            VALUES (:code, :name, :section, :room, :faculty_id, :day, :start_time, :end_time)
            RETURNING id
        ");

        $seededClassesCount = 0;
        $primaryClassId = null;

        foreach ($sampleClasses as $cls) {
            $checkClassStmt->execute([
                ':code' => $cls['code']
            ]);
            $existingClass = $checkClassStmt->fetch(PDO::FETCH_ASSOC);

            if ($existingClass) {
                if (!$primaryClassId && $cls['code'] === 'CS101') {
                    $primaryClassId = $existingClass['id'];
                }
            } else {
                $addClassStmt->execute([
                    ':code'       => $cls['code'],
                    ':name'       => $cls['name'],
                    ':section'    => $cls['section'],
                    ':room'       => $cls['room'],
                    ':faculty_id' => $facultyId,
                    ':day'        => $cls['day'],
                    ':start_time' => $cls['start_time'],
                    ':end_time'   => $cls['end_time']
                ]);
                $newCls = $addClassStmt->fetch(PDO::FETCH_ASSOC);
                if ($newCls && !$primaryClassId && $cls['code'] === 'CS101') {
                    $primaryClassId = $newCls['id'];
                }
                $seededClassesCount++;
            }
        }
        echo "[✔] Classes: {$seededClassesCount} new record(s) seeded.\n";

        // Get all students for enrollment seeding
        $studentsStmt = $pdo->query("SELECT id FROM users WHERE role = 'student'");
        $studentIds = $studentsStmt->fetchAll(PDO::FETCH_COLUMN);

        if ($primaryClassId && !empty($studentIds)) {
            // -----------------------------------------------------------------
            // 4. Seed Student Enrollments (ON CONFLICT (class_id, student_id) DO NOTHING)
            // -----------------------------------------------------------------
            $enrollStmt = $pdo->prepare("
                INSERT INTO enrollments (class_id, student_id, enrolled_at)
                VALUES (:class_id, :student_id, CURRENT_TIMESTAMP)
                ON CONFLICT (class_id, student_id) DO NOTHING
            ");

            $seededEnrollmentsCount = 0;
            foreach ($studentIds as $sId) {
                $enrollStmt->execute([
                    ':class_id'   => $primaryClassId,
                    ':student_id' => $sId
                ]);
                if ($enrollStmt->rowCount() > 0) {
                    $seededEnrollmentsCount++;
                }
            }
            echo "[✔] Student Enrollments: {$seededEnrollmentsCount} new record(s) seeded.\n";

            // -----------------------------------------------------------------
            // 5. Seed One Active Attendance Session
            // (Checks if an active session already exists for this class)
            // -----------------------------------------------------------------
            $activeCheckStmt = $pdo->prepare("
                SELECT id FROM attendance_sessions 
                WHERE class_id = :class_id AND status = 'active'
            ");
            $activeCheckStmt->execute([':class_id' => $primaryClassId]);
            
            if (!$activeCheckStmt->fetch()) {
                $sessionStmt = $pdo->prepare("
                    INSERT INTO attendance_sessions (class_id, faculty_id, title, session_date, start_time, latitude, longitude, radius_meters, status)
                    VALUES (:class_id, :faculty_id, :title, CURRENT_DATE, CURRENT_TIMESTAMP, 14.5995, 120.9842, 50, 'active')
                ");
                $sessionStmt->execute([
                    ':class_id'   => $primaryClassId,
                    ':faculty_id' => $facultyId,
                    ':title'      => 'CS101 Attendance Session'
                ]);
                echo "[✔] Active Attendance Session: 1 active session seeded for CS101.\n";
            } else {
                echo "[✔] Active Attendance Session: Active session already exists (skipped duplicate).\n";
            }
        }
    }

    echo "=====================================================\n";
    echo "SUCCESS: PostgreSQL Seeder Executed Safely!\n";
    echo "=====================================================\n";

} catch (PDOException $e) {
    echo "Database Seeder Error: " . $e->getMessage() . "\n";
    exit(1);
}
