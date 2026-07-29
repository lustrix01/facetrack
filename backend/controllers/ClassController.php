<?php
/**
 * FaceTrack REST API - Class Controller (Hardened)
 * - JWT protected on every method
 * - Duplicate class detection (same code + section + faculty)
 * - All inputs sanitized via Sanitizer
 * - All fields validated via Validator
 * - All DB queries use prepared statements
 * - Proper HTTP status codes
 */

namespace Controllers;

use Config\Database;
use Helpers\Sanitizer;
use Helpers\Validator;
use Middleware\AuthMiddleware;
use PDO;
use PDOException;

class ClassController {
    /**
     * GET /api/classes — List classes (Faculty sees own; students see enrolled)
     */
    public function index(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Valid JWT required.']);
            return;
        }

        $search = Sanitizer::string($_GET['search'] ?? '');

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            if (strtolower($user['role'] ?? '') === 'faculty') {
                $sql = "SELECT c.id, c.code, c.name, c.section, c.room, c.faculty_id, c.schedule_day, c.created_at,
                               (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as enrolled_count
                        FROM classes c WHERE c.faculty_id = :faculty_id";
                $params = [':faculty_id' => (int)$user['sub']];

                if (!empty($search)) {
                    $sql .= " AND (LOWER(c.code) LIKE :search OR LOWER(c.name) LIKE :search OR LOWER(c.section) LIKE :search)";
                    $params[':search'] = '%' . strtolower($search) . '%';
                }
                $sql .= " ORDER BY c.created_at DESC";
            } else {
                // Students see only their enrolled classes
                $sql = "SELECT c.id, c.code, c.name, c.section, c.room, c.schedule_day, c.created_at,
                               (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as enrolled_count
                        FROM classes c
                        JOIN enrollments e ON c.id = e.class_id
                        WHERE e.student_id = :student_id";
                $params = [':student_id' => (int)$user['sub']];
                $sql .= " ORDER BY c.name ASC";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['status' => 'success', 'data' => $classes]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to load classes.']);
        }
    }

    /**
     * POST /api/classes — Faculty creates a new class
     */
    public function store(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user || strtolower($user['role'] ?? '') !== 'faculty') {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Only faculty members can create classes.']);
            return;
        }

        $input = Sanitizer::jsonBody();

        $code    = Sanitizer::string($input['code'] ?? '');
        $name    = Sanitizer::string($input['name'] ?? '');
        $section = Sanitizer::string($input['section'] ?? 'Sec 1');
        $room    = Sanitizer::string($input['room'] ?? '');

        $v = new Validator(['code' => $code, 'name' => $name, 'section' => $section, 'room' => $room]);
        $v->required('code', 'Subject Code')
          ->required('name', 'Subject Name')
          ->required('section', 'Section')
          ->required('room', 'Room')
          ->maxLength('code', 50, 'Subject Code')
          ->maxLength('name', 150, 'Subject Name')
          ->maxLength('section', 50, 'Section')
          ->maxLength('room', 50, 'Room');
        $v->abortIfFails();

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            // Duplicate class check (same code + section for this faculty) — 409 Conflict
            $dupStmt = $pdo->prepare(
                "SELECT id FROM classes WHERE LOWER(code) = LOWER(:code) AND LOWER(section) = LOWER(:section) AND faculty_id = :faculty_id"
            );
            $dupStmt->execute([':code' => $code, ':section' => $section, ':faculty_id' => (int)$user['sub']]);
            if ($dupStmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'status'  => 'error',
                    'message' => "A class with code '{$code}' and section '{$section}' already exists in your classes."
                ]);
                return;
            }

            $stmt = $pdo->prepare(
                "INSERT INTO classes (code, name, section, room, faculty_id)
                 VALUES (:code, :name, :section, :room, :faculty_id)
                 RETURNING id, code, name, section, room, faculty_id, created_at"
            );
            $stmt->execute([
                ':code'      => $code,
                ':name'      => $name,
                ':section'   => $section,
                ':room'      => $room,
                ':faculty_id'=> (int)$user['sub'],
            ]);

            $class = $stmt->fetch(PDO::FETCH_ASSOC);
            http_response_code(201);
            echo json_encode([
                'status'  => 'success',
                'message' => "Class '{$code} - {$name}' created successfully.",
                'data'    => $class,
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to create class.']);
        }
    }

    /**
     * PUT /api/classes — Faculty edits their own class
     */
    public function update(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user || strtolower($user['role'] ?? '') !== 'faculty') {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Only faculty members can edit classes.']);
            return;
        }

        $input = Sanitizer::jsonBody();
        $id      = Sanitizer::int($input['id'] ?? 0);
        $code    = Sanitizer::string($input['code'] ?? '');
        $name    = Sanitizer::string($input['name'] ?? '');
        $section = Sanitizer::string($input['section'] ?? '');
        $room    = Sanitizer::string($input['room'] ?? '');

        $v = new Validator(['id' => $id, 'code' => $code, 'name' => $name, 'section' => $section, 'room' => $room]);
        $v->required('id', 'Class ID')
          ->positiveInt('id', 'Class ID')
          ->required('code', 'Subject Code')
          ->required('name', 'Subject Name')
          ->required('section', 'Section')
          ->required('room', 'Room');
        $v->abortIfFails();

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            // Ownership check
            $ownerStmt = $pdo->prepare("SELECT id FROM classes WHERE id = :id AND faculty_id = :faculty_id");
            $ownerStmt->execute([':id' => $id, ':faculty_id' => (int)$user['sub']]);
            if (!$ownerStmt->fetch()) {
                http_response_code(403);
                echo json_encode(['status' => 'error', 'message' => 'You can only edit your own classes.']);
                return;
            }

            // Duplicate check (exclude self)
            $dupStmt = $pdo->prepare(
                "SELECT id FROM classes WHERE LOWER(code) = LOWER(:code) AND LOWER(section) = LOWER(:section) AND faculty_id = :faculty_id AND id != :id"
            );
            $dupStmt->execute([':code' => $code, ':section' => $section, ':faculty_id' => (int)$user['sub'], ':id' => $id]);
            if ($dupStmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'status'  => 'error',
                    'message' => "Another class with code '{$code}' and section '{$section}' already exists."
                ]);
                return;
            }

            $stmt = $pdo->prepare(
                "UPDATE classes SET code = :code, name = :name, section = :section, room = :room, updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id AND faculty_id = :faculty_id
                 RETURNING id, code, name, section, room, updated_at"
            );
            $stmt->execute([
                ':code'      => $code,
                ':name'      => $name,
                ':section'   => $section,
                ':room'      => $room,
                ':id'        => $id,
                ':faculty_id'=> (int)$user['sub'],
            ]);

            $updated = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['status' => 'success', 'message' => 'Class updated successfully.', 'data' => $updated]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to update class.']);
        }
    }

    /**
     * DELETE /api/classes — Faculty deletes their own class
     */
    public function destroy(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user || strtolower($user['role'] ?? '') !== 'faculty') {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Only faculty members can delete classes.']);
            return;
        }

        $input = Sanitizer::jsonBody();
        $id = Sanitizer::int($input['id'] ?? (int)($_GET['id'] ?? 0));

        if ($id <= 0) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'message' => 'A valid Class ID is required.']);
            return;
        }

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            $stmt = $pdo->prepare(
                "DELETE FROM classes WHERE id = :id AND faculty_id = :faculty_id RETURNING id"
            );
            $stmt->execute([':id' => $id, ':faculty_id' => (int)$user['sub']]);

            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Class not found or you do not have permission to delete it.']);
                return;
            }

            echo json_encode(['status' => 'success', 'message' => 'Class deleted successfully.']);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete class.']);
        }
    }
}
