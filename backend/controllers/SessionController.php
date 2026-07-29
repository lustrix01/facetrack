<?php
/**
 * FaceTrack REST API - Session Controller (Hardened)
 * - JWT protected on every method
 * - GPS coordinate validation (lat -90/90, lon -180/180)
 * - Radius validation (1–10,000m)
 * - Attendance session duplicate check (one active session per class)
 * - Class ownership verification
 * - All inputs sanitized via Sanitizer
 * - All DB queries use prepared statements
 * - Proper HTTP status codes (201, 400, 401, 403, 404, 409, 422, 500)
 */

namespace Controllers;

use Config\Database;
use Helpers\Sanitizer;
use Helpers\Validator;
use Middleware\AuthMiddleware;
use PDO;
use PDOException;

class SessionController {
    /**
     * GET /api/sessions — List attendance sessions
     */
    public function index(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Valid JWT required.']);
            return;
        }

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            $sql = "SELECT s.id, s.class_id, s.title, s.session_date, s.start_time, s.end_time,
                           COALESCE(s.latitude, 14.5995) as latitude,
                           COALESCE(s.longitude, 120.9842) as longitude,
                           COALESCE(s.radius_meters, 50) as radius_meters,
                           s.status, c.code as class_code, c.name as class_name, c.section, c.room
                    FROM attendance_sessions s
                    JOIN classes c ON s.class_id = c.id
                    WHERE 1=1";
            $params = [];

            if (strtolower($user['role'] ?? '') === 'faculty') {
                $sql .= " AND s.faculty_id = :faculty_id";
                $params[':faculty_id'] = (int)$user['sub'];
            }

            $sql .= " ORDER BY s.id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to load sessions.']);
        }
    }

    /**
     * POST /api/sessions — Faculty starts a new session with GPS geofence validation
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
            echo json_encode(['status' => 'error', 'message' => 'Only faculty members can start attendance sessions.']);
            return;
        }

        $input = Sanitizer::jsonBody();

        $classId      = Sanitizer::int($input['class_id'] ?? 0);
        $latitude     = Sanitizer::float($input['latitude'] ?? 14.5995);
        $longitude    = Sanitizer::float($input['longitude'] ?? 120.9842);
        $radiusMeters = Sanitizer::int($input['radius_meters'] ?? 50);
        $startTime    = Sanitizer::string($input['start_time'] ?? date('Y-m-d H:i:s'));
        $endTime      = !empty($input['end_time']) ? Sanitizer::string($input['end_time']) : null;

        // Validate GPS coordinates + radius
        $v = new Validator([
            'class_id'      => $classId,
            'latitude'      => $latitude,
            'longitude'     => $longitude,
            'radius_meters' => $radiusMeters,
        ]);
        $v->required('class_id', 'Class ID')
          ->positiveInt('class_id', 'Class ID')
          ->required('latitude', 'Classroom Latitude')
          ->required('longitude', 'Classroom Longitude')
          ->latitude('latitude')
          ->longitude('longitude')
          ->radius('radius_meters');
        $v->abortIfFails();

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            // 1. Verify faculty owns the class
            $classStmt = $pdo->prepare(
                "SELECT id, code, name FROM classes WHERE id = :id AND faculty_id = :faculty_id"
            );
            $classStmt->execute([':id' => $classId, ':faculty_id' => (int)$user['sub']]);
            $class = $classStmt->fetch(PDO::FETCH_ASSOC);
            if (!$class) {
                http_response_code(403);
                echo json_encode(['status' => 'error', 'message' => 'You can only start sessions for your own classes.']);
                return;
            }

            // 2. Duplicate / active session check — one active session per class (409 Conflict)
            $activeStmt = $pdo->prepare(
                "SELECT id FROM attendance_sessions WHERE class_id = :class_id AND status = 'active'"
            );
            $activeStmt->execute([':class_id' => $classId]);
            if ($activeStmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'status'  => 'error',
                    'message' => "An active attendance session is already running for {$class['code']} - {$class['name']}. End it before starting a new one."
                ]);
                return;
            }

            // 3. Insert new session
            $title = "{$class['code']} Attendance Session";
            $stmt = $pdo->prepare(
                "INSERT INTO attendance_sessions (class_id, faculty_id, title, session_date, start_time, end_time, latitude, longitude, radius_meters, status)
                 VALUES (:class_id, :faculty_id, :title, CURRENT_DATE, :start_time, :end_time, :latitude, :longitude, :radius_meters, 'active')
                 RETURNING id, class_id, title, session_date, start_time, end_time, latitude, longitude, radius_meters, status"
            );
            $stmt->execute([
                ':class_id'     => $classId,
                ':faculty_id'   => (int)$user['sub'],
                ':title'        => $title,
                ':start_time'   => $startTime,
                ':end_time'     => $endTime,
                ':latitude'     => $latitude,
                ':longitude'    => $longitude,
                ':radius_meters'=> $radiusMeters,
            ]);

            $newSession = $stmt->fetch(PDO::FETCH_ASSOC);
            http_response_code(201);
            echo json_encode([
                'status'  => 'success',
                'message' => "Attendance session started for {$class['code']}. Geofence: {$latitude}, {$longitude} ({$radiusMeters}m radius).",
                'data'    => $newSession,
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to start attendance session.']);
        }
    }

    /**
     * POST /api/sessions/end — Faculty ends an active session
     */
    public function end(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Valid JWT required.']);
            return;
        }
        if (strtolower($user['role'] ?? '') !== 'faculty') {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Only faculty members can end attendance sessions.']);
            return;
        }

        $input = Sanitizer::jsonBody();
        $id = Sanitizer::int($input['id'] ?? 0);

        $v = new Validator(['id' => $id]);
        $v->required('id', 'Session ID')->positiveInt('id', 'Session ID');
        $v->abortIfFails();

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            $stmt = $pdo->prepare(
                "UPDATE attendance_sessions
                 SET status = 'ended', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id AND faculty_id = :faculty_id
                 RETURNING id, class_id, title, status, end_time"
            );
            $stmt->execute([':id' => $id, ':faculty_id' => (int)$user['sub']]);
            $ended = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$ended) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Active session not found or you do not have permission to end it.']);
                return;
            }

            echo json_encode([
                'status'  => 'success',
                'message' => 'Attendance session ended successfully.',
                'data'    => $ended,
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to end attendance session.']);
        }
    }
}
