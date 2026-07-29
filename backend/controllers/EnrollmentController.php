<?php
/**
 * FaceTrack REST API - Enrollment Controller (Hardened)
 * - JWT protected on every method
 * - Duplicate student enrollment detection (409 Conflict)
 * - Student existence & role verification
 * - Class ownership verification
 * - All inputs sanitized and validated
 * - All DB queries use prepared statements
 */

namespace Controllers;

use Config\Database;
use Helpers\Sanitizer;
use Helpers\Validator;
use Middleware\AuthMiddleware;
use PDO;
use PDOException;

class EnrollmentController {
    /**
     * GET /api/students — Faculty searches all students
     */
    public function students(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Valid JWT required.']);
            return;
        }
        if (strtolower($user['role'] ?? '') !== 'faculty') {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Only faculty members can view the student list.']);
            return;
        }

        $search = Sanitizer::string($_GET['search'] ?? '');

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            $sql = "SELECT id, identifier as student_number, name, email, department, created_at
                    FROM users WHERE role = 'student'";
            $params = [];

            if (!empty($search)) {
                $sql .= " AND (LOWER(identifier) LIKE :search OR LOWER(name) LIKE :search OR LOWER(email) LIKE :search)";
                $params[':search'] = '%' . strtolower($search) . '%';
            }

            $sql .= " ORDER BY name ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to load student list.']);
        }
    }

    /**
     * GET /api/enrollments — List students enrolled in a class
     */
    public function index(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Valid JWT required.']);
            return;
        }

        $classId = Sanitizer::int($_GET['class_id'] ?? 0);

        $v = new Validator(['class_id' => $classId]);
        $v->required('class_id', 'Class ID')->positiveInt('class_id', 'Class ID');
        $v->abortIfFails();

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            $stmt = $pdo->prepare(
                "SELECT e.enrollment_id, e.class_id, e.student_id, e.enrolled_at,
                        u.identifier as student_number, u.name as student_name, u.email, u.department
                 FROM enrollments e
                 JOIN users u ON e.student_id = u.id
                 WHERE e.class_id = :class_id
                 ORDER BY u.name ASC"
            );
            $stmt->execute([':class_id' => $classId]);

            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to load enrollments.']);
        }
    }

    /**
     * POST /api/enrollments — Faculty enrolls a student into their class
     */
    public function store(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Valid JWT required.']);
            return;
        }
        if (strtolower($user['role'] ?? '') !== 'faculty') {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Only faculty members can enroll students into classes.']);
            return;
        }

        $input     = Sanitizer::jsonBody();
        $classId   = Sanitizer::int($input['class_id'] ?? 0);
        $studentId = Sanitizer::int($input['student_id'] ?? 0);

        $v = new Validator(['class_id' => $classId, 'student_id' => $studentId]);
        $v->required('class_id', 'Class ID')
          ->positiveInt('class_id', 'Class ID')
          ->required('student_id', 'Student ID')
          ->positiveInt('student_id', 'Student ID');
        $v->abortIfFails();

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            // 1. Verify faculty owns this class
            $classStmt = $pdo->prepare(
                "SELECT id, code, name FROM classes WHERE id = :id AND faculty_id = :faculty_id"
            );
            $classStmt->execute([':id' => $classId, ':faculty_id' => (int)$user['sub']]);
            $class = $classStmt->fetch(PDO::FETCH_ASSOC);
            if (!$class) {
                http_response_code(403);
                echo json_encode(['status' => 'error', 'message' => 'Faculty can only manage enrollments for their own classes.']);
                return;
            }

            // 2. Verify target user exists and is a student
            $studentStmt = $pdo->prepare(
                "SELECT id, name FROM users WHERE id = :id AND role = 'student'"
            );
            $studentStmt->execute([':id' => $studentId]);
            $student = $studentStmt->fetch(PDO::FETCH_ASSOC);
            if (!$student) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Student account not found.']);
                return;
            }

            // 3. Duplicate enrollment check — 409 Conflict
            $dupStmt = $pdo->prepare(
                "SELECT enrollment_id FROM enrollments WHERE class_id = :class_id AND student_id = :student_id"
            );
            $dupStmt->execute([':class_id' => $classId, ':student_id' => $studentId]);
            if ($dupStmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'status'  => 'error',
                    'message' => "{$student['name']} is already enrolled in {$class['code']} - {$class['name']}."
                ]);
                return;
            }

            // 4. Insert enrollment
            $stmt = $pdo->prepare(
                "INSERT INTO enrollments (class_id, student_id, enrolled_at)
                 VALUES (:class_id, :student_id, CURRENT_TIMESTAMP)
                 RETURNING enrollment_id, class_id, student_id, enrolled_at"
            );
            $stmt->execute([':class_id' => $classId, ':student_id' => $studentId]);
            $enrollment = $stmt->fetch(PDO::FETCH_ASSOC);

            http_response_code(201);
            echo json_encode([
                'status'  => 'success',
                'message' => "{$student['name']} has been enrolled into {$class['code']} - {$class['name']} successfully.",
                'data'    => $enrollment,
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to enroll student.']);
        }
    }

    /**
     * DELETE /api/enrollments — Faculty removes a student from their class
     */
    public function destroy(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Valid JWT required.']);
            return;
        }
        if (strtolower($user['role'] ?? '') !== 'faculty') {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Only faculty members can remove students from classes.']);
            return;
        }

        $input        = Sanitizer::jsonBody();
        $enrollmentId = Sanitizer::int($input['enrollment_id'] ?? 0);
        $classId      = Sanitizer::int($input['class_id'] ?? 0);
        $studentId    = Sanitizer::int($input['student_id'] ?? 0);

        if ($enrollmentId <= 0 && ($classId <= 0 || $studentId <= 0)) {
            http_response_code(422);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Either enrollment_id or both class_id and student_id are required.'
            ]);
            return;
        }

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            if ($enrollmentId > 0) {
                $stmt = $pdo->prepare(
                    "DELETE FROM enrollments
                     WHERE enrollment_id = :enrollment_id
                       AND class_id IN (SELECT id FROM classes WHERE faculty_id = :faculty_id)
                     RETURNING enrollment_id"
                );
                $stmt->execute([':enrollment_id' => $enrollmentId, ':faculty_id' => (int)$user['sub']]);
            } else {
                $stmt = $pdo->prepare(
                    "DELETE FROM enrollments
                     WHERE class_id = :class_id AND student_id = :student_id
                       AND class_id IN (SELECT id FROM classes WHERE faculty_id = :faculty_id)
                     RETURNING enrollment_id"
                );
                $stmt->execute([':class_id' => $classId, ':student_id' => $studentId, ':faculty_id' => (int)$user['sub']]);
            }

            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Enrollment not found or you do not have permission to remove it.']);
                return;
            }

            echo json_encode(['status' => 'success', 'message' => 'Student removed from class successfully.']);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to remove student enrollment.']);
        }
    }
}
