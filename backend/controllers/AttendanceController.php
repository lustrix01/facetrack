<?php
/**
 * FaceTrack REST API - Attendance & Verification Controller
 * Enforces Mandatory Data Privacy Consent, Haversine Geofence, & Single Check-in/out on Neon PostgreSQL
 */

namespace Controllers;

use Config\Database;
use Helpers\Sanitizer;
use Helpers\Validator;
use Middleware\AuthMiddleware;
use Services\AiServiceClient;
use PDO;
use PDOException;

class AttendanceController {
    /**
     * Haversine Great Circle Distance Formula (Returns distance in meters)
     */
    private static function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float {
        $earthRadius = 6371000;

        $latFrom = deg2rad($lat1);
        $lonFrom = deg2rad($lon1);
        $latTo = deg2rad($lat2);
        $lonTo = deg2rad($lon2);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));
        
        return $angle * $earthRadius;
    }

    /**
     * Cosine Similarity Vector Comparison Formula
     */
    private static function cosineSimilarity(array $vecA, array $vecB): float {
        $dotProduct = 0.0;
        $normA = 0.0;
        $normB = 0.0;
        $count = min(count($vecA), count($vecB));

        if ($count === 0) return 0.0;

        for ($i = 0; $i < $count; $i++) {
            $valA = (float)$vecA[$i];
            $valB = (float)$vecB[$i];
            $dotProduct += $valA * $valB;
            $normA += $valA * $valA;
            $normB += $valB * $valB;
        }

        if ($normA <= 0.0 || $normB <= 0.0) return 0.0;

        return $dotProduct / (sqrt($normA) * sqrt($normB));
    }

    /**
     * Euclidean Distance Formula for 128-D Face Descriptors
     */
    private static function euclideanDistance(array $vecA, array $vecB): float {
        $sum = 0.0;
        $count = min(count($vecA), count($vecB));
        if ($count === 0) return 10.0;
        for ($i = 0; $i < $count; $i++) {
            $diff = (float)$vecA[$i] - (float)$vecB[$i];
            $sum += $diff * $diff;
        }
        return sqrt($sum);
    }

    /**
     * GET /api/attendance/active-session - Detect active attendance session for student's selected enrolled class
     */
    public function activeSession(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }

        $classId = (int)($_GET['class_id'] ?? 0);

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            if ($classId > 0) {
                if (strtolower($user['role'] ?? '') === 'student') {
                    $enrollCheck = $pdo->prepare("SELECT enrollment_id FROM enrollments WHERE class_id = :class_id AND student_id = :student_id");
                    $enrollCheck->execute([':class_id' => $classId, ':student_id' => $user['sub']]);
                    if (!$enrollCheck->fetch()) {
                        http_response_code(403);
                        echo json_encode([
                            'status' => 'error',
                            'result_code' => 'Attendance Closed',
                            'has_active_session' => false,
                            'message' => 'You are not enrolled in this class.'
                        ]);
                        return;
                    }
                }

                $sql = "SELECT s.id as session_id, s.class_id, s.title, s.start_time, s.end_time, 
                               COALESCE(s.latitude, 14.5995) as latitude, 
                               COALESCE(s.longitude, 120.9842) as longitude, 
                               COALESCE(s.radius_meters, 50) as radius_meters, 
                               c.code as class_code, c.name as class_name, c.section, c.room 
                        FROM attendance_sessions s 
                        JOIN classes c ON s.class_id = c.id 
                        WHERE s.class_id = :class_id AND s.status = 'active' 
                        ORDER BY s.id DESC LIMIT 1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([':class_id' => $classId]);
            } else {
                $sql = "SELECT s.id as session_id, s.class_id, s.title, s.start_time, s.end_time, 
                               COALESCE(s.latitude, 14.5995) as latitude, 
                               COALESCE(s.longitude, 120.9842) as longitude, 
                               COALESCE(s.radius_meters, 50) as radius_meters, 
                               c.code as class_code, c.name as class_name, c.section, c.room 
                        FROM attendance_sessions s 
                        JOIN classes c ON s.class_id = c.id 
                        JOIN enrollments e ON c.id = e.class_id 
                        WHERE e.student_id = :student_id AND s.status = 'active' 
                        ORDER BY s.id DESC LIMIT 1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([':student_id' => $user['sub']]);
            }

            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$session) {
                echo json_encode([
                    'status' => 'success',
                    'result_code' => 'Attendance Closed',
                    'has_active_session' => false,
                    'message' => 'No active attendance session for this class. Please wait for your instructor to start a session.'
                ]);
                return;
            }

            $checkStmt = $pdo->prepare("SELECT id, status, timestamp, checkout_time, 
                                               ROUND(EXTRACT(EPOCH FROM (checkout_time - timestamp)) / 60) as duration_minutes, 
                                               latitude, longitude, distance_meters, notes 
                                        FROM attendance 
                                        WHERE session_id = :session_id AND student_id = :student_id");
            $checkStmt->execute([':session_id' => $session['session_id'], ':student_id' => $user['sub']]);
            $attendanceRecord = $checkStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'has_active_session' => true,
                'data' => [
                    'session' => $session,
                    'user_attendance' => $attendanceRecord ?: null
                ]
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/attendance/checkin - Executes Check-in with Mandatory Data Privacy Consent Verification
     */
    public function checkin(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }

        $input     = Sanitizer::jsonBody();
        $sessionId = Sanitizer::int($input['session_id'] ?? 0);
        $studentLat = Sanitizer::float($input['latitude'] ?? 14.5995);
        $studentLon = Sanitizer::float($input['longitude'] ?? 120.9842);
        $smileVerified   = Sanitizer::bool($input['smile_verified'] ?? false);
        $liveDescriptor  = Sanitizer::floatArray($input['live_descriptor'] ?? []);

        // Validate inputs
        $v = new Validator([
            'session_id' => $sessionId,
            'latitude'   => $studentLat,
            'longitude'  => $studentLon,
        ]);
        $v->required('session_id', 'Session ID')
          ->positiveInt('session_id', 'Session ID')
          ->latitude('latitude')
          ->longitude('longitude');
        $v->abortIfFails();

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            // MANDATORY COMPLIANCE RULE: Verify Data Privacy Consent before verifying attendance
            $checkConsent = $pdo->prepare("SELECT id FROM privacy_consent WHERE user_id = :user_id AND (agreed = TRUE OR consent_given = TRUE)");
            $checkConsent->execute([':user_id' => $user['sub']]);
            if (!$checkConsent->fetch()) {
                http_response_code(403);
                echo json_encode([
                    'status' => 'error',
                    'result_code' => 'Attendance Closed',
                    'message' => 'Data Privacy Consent required before verifying Attendance. Please accept consent first.'
                ]);
                return;
            }

            // Single Check-in Rule Enforcement
            $checkExisting = $pdo->prepare("SELECT id, timestamp FROM attendance WHERE session_id = :session_id AND student_id = :student_id");
            $checkExisting->execute([':session_id' => $sessionId, ':student_id' => $user['sub']]);
            $existingRecord = $checkExisting->fetch(PDO::FETCH_ASSOC);

            if ($existingRecord && !empty($existingRecord['timestamp'])) {
                http_response_code(409);
                echo json_encode([
                    'status'      => 'error',
                    'result_code' => 'Already Checked In',
                    'message'     => 'You have already checked in for this session. A student may only check in once per session.'
                ]);
                return;
            }

            // Verify Session Active
            $sessionStmt = $pdo->prepare("SELECT id, class_id, start_time, latitude, longitude, radius_meters, status FROM attendance_sessions WHERE id = :id");
            $sessionStmt->execute([':id' => $sessionId]);
            $session = $sessionStmt->fetch(PDO::FETCH_ASSOC);

            if (!$session || $session['status'] !== 'active') {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'result_code' => 'Attendance Closed',
                    'message' => 'Attendance session is no longer active.'
                ]);
                return;
            }

            // Verify Smile Detection
            if (!$smileVerified) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'result_code' => 'Smile Not Detected',
                    'message' => 'Smile verification failed. Please smile directly at the camera.'
                ]);
                return;
            }

            // Compare Facial Embedding Vector
            $enrollStmt = $pdo->prepare("SELECT descriptor_data FROM face_enrollments WHERE user_id = :user_id AND status = 'active' ORDER BY id DESC LIMIT 1");
            $enrollStmt->execute([':user_id' => $user['sub']]);
            $enrolledFace = $enrollStmt->fetch(PDO::FETCH_ASSOC);

            if (!$enrolledFace) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'result_code' => 'Face Not Recognized',
                    'message' => 'No enrolled facial profile found.'
                ]);
                return;
            }

            $enrolledVector = json_decode($enrolledFace['descriptor_data'], true) ?: [];
            $imageB64 = Sanitizer::string($input['image'] ?? $input['image_snapshot'] ?? '');

            // Call Python AI Microservice /verify if image snapshot is provided
            if (!empty($imageB64) && !empty($enrolledVector)) {
                $aiVerify = AiServiceClient::verify($imageB64, $enrolledVector, true);
                if (!isset($aiVerify['match']) || $aiVerify['match'] === false) {
                    $resCode = $aiVerify['result_code'] ?? 'Face Not Recognized';
                    $msg = $aiVerify['message'] ?? 'Face does not match the enrolled student.';
                    http_response_code(400);
                    echo json_encode([
                        'status' => 'error',
                        'result_code' => $resCode,
                        'message' => $msg
                    ]);
                    return;
                }
            } else {
                // Fallback internal check
                if (empty($liveDescriptor)) {
                    http_response_code(400);
                    echo json_encode([
                        'status' => 'error',
                        'result_code' => 'Face Not Recognized',
                        'message' => 'Face does not match the enrolled student.'
                    ]);
                    return;
                }

                $similarity = self::cosineSimilarity($liveDescriptor, $enrolledVector);
                $distance = self::euclideanDistance($liveDescriptor, $enrolledVector);

                if ($similarity < 0.38 && $distance > 0.65) {
                    http_response_code(400);
                    echo json_encode([
                        'status' => 'error',
                        'result_code' => 'Face Not Recognized',
                        'message' => 'Face does not match the enrolled student.'
                    ]);
                    return;
                }
            }

            // GPS Verification: Calculate Distance
            $facultyLat = (float)($session['latitude'] ?? 14.5995);
            $facultyLon = (float)($session['longitude'] ?? 120.9842);
            $allowedRadius = (int)($session['radius_meters'] ?? 50);

            $distanceMeters = round(self::haversineDistance($studentLat, $studentLon, $facultyLat, $facultyLon), 2);

            if ($distanceMeters > $allowedRadius) {
                $distFormatted = number_format($distanceMeters, 1);
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'result_code' => 'Outside Allowed Area',
                    'message' => "Outside Allowed Area! You are {$distFormatted}m away from class location (allowed radius: {$allowedRadius}m)."
                ]);
                return;
            }

            // Status Calculation: Present vs Late
            $sessionStartTime = strtotime($session['start_time']);
            $currentTime = time();
            $gracePeriodSeconds = 15 * 60;

            $status = ($currentTime <= $sessionStartTime + $gracePeriodSeconds) ? 'present' : 'late';
            $resultCode = ($status === 'present') ? 'Present' : 'Late';

            // Store in Neon PostgreSQL
            $notes = "Verified via GPS Geofence & Face Matching (Distance: {$distanceMeters}m, Allowed: {$allowedRadius}m)";
            $sql = "INSERT INTO attendance (session_id, student_id, status, confidence_score, timestamp, latitude, longitude, distance_meters, notes) 
                    VALUES (:session_id, :student_id, :status, 0.9850, CURRENT_TIMESTAMP, :latitude, :longitude, :distance_meters, :notes) 
                    RETURNING id, session_id, student_id, status, timestamp, checkout_time, latitude, longitude, distance_meters, notes";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':session_id' => $sessionId,
                ':student_id' => $user['sub'],
                ':status' => $status,
                ':latitude' => $studentLat,
                ':longitude' => $studentLon,
                ':distance_meters' => $distanceMeters,
                ':notes' => $notes
            ]);

            $record = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'result_code' => $resultCode,
                'message' => "GPS & Face verification passed! Check-in recorded as [{$resultCode}] (Distance: {$distanceMeters}m).",
                'data' => $record
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/attendance/checkout - Executes Check-out with Duration Calculation
     */
    public function checkout(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }

        $input     = Sanitizer::jsonBody();
        $sessionId = Sanitizer::int($input['session_id'] ?? 0);

        $v = new Validator(['session_id' => $sessionId]);
        $v->required('session_id', 'Session ID')->positiveInt('session_id', 'Session ID');
        $v->abortIfFails();

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            $checkExisting = $pdo->prepare("SELECT id, timestamp, checkout_time FROM attendance WHERE session_id = :session_id AND student_id = :student_id");
            $checkExisting->execute([':session_id' => $sessionId, ':student_id' => $user['sub']]);
            $existing = $checkExisting->fetch(PDO::FETCH_ASSOC);

            if (!$existing || empty($existing['timestamp'])) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Check-out is only available after a successful check-in.'
                ]);
                return;
            }

            if (!empty($existing['checkout_time'])) {
                http_response_code(409);
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'You have already checked out for this session. A student may only check out once per session.'
                ]);
                return;
            }

            $sql = "UPDATE attendance 
                    SET checkout_time = CURRENT_TIMESTAMP 
                    WHERE session_id = :session_id AND student_id = :student_id 
                    RETURNING id, session_id, student_id, status, timestamp, checkout_time, 
                              ROUND(EXTRACT(EPOCH FROM (checkout_time - timestamp)) / 60) as duration_minutes, notes";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':session_id' => $sessionId,
                ':student_id' => $user['sub']
            ]);

            $record = $stmt->fetch(PDO::FETCH_ASSOC);

            $durationMins = (int)($record['duration_minutes'] ?? 0);
            $durationFormatted = $durationMins > 60 
                ? floor($durationMins / 60) . " hr " . ($durationMins % 60) . " mins" 
                : $durationMins . " minutes";

            echo json_encode([
                'status' => 'success',
                'message' => "Attendance Check-out recorded successfully! Duration inside class: {$durationFormatted}.",
                'data' => array_merge($record, ['duration_formatted' => $durationFormatted])
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/attendance/today-status - Student views today's attendance status & metrics
     */
    public function todayStatus(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            $sql = "SELECT a.id, a.session_id, a.status, a.timestamp as checkin_time, a.checkout_time, 
                           ROUND(EXTRACT(EPOCH FROM (a.checkout_time - a.timestamp)) / 60) as duration_minutes, 
                           a.latitude, a.longitude, a.distance_meters, 
                           c.code as class_code, c.name as class_name, c.room 
                    FROM attendance a 
                    JOIN attendance_sessions s ON a.session_id = s.id 
                    JOIN classes c ON s.class_id = c.id 
                    WHERE a.student_id = :student_id AND DATE(a.timestamp) = CURRENT_DATE 
                    ORDER BY a.id DESC LIMIT 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':student_id' => $user['sub']]);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$record) {
                echo json_encode([
                    'status' => 'success',
                    'has_today_attendance' => false,
                    'message' => 'No attendance recorded for today yet.'
                ]);
                return;
            }

            $durationMins = (int)($record['duration_minutes'] ?? 0);
            $durationFormatted = $record['checkout_time'] 
                ? ($durationMins > 60 ? floor($durationMins / 60) . " hr " . ($durationMins % 60) . " mins" : $durationMins . " minutes")
                : 'Ongoing';

            $liveStatus = $record['checkout_time'] ? 'Checked Out' : 'Still Inside';

            echo json_encode([
                'status' => 'success',
                'has_today_attendance' => true,
                'data' => [
                    'class_code' => $record['class_code'],
                    'class_name' => $record['class_name'],
                    'room' => $record['room'],
                    'checkin_time' => $record['checkin_time'],
                    'checkout_time' => $record['checkout_time'] ?? null,
                    'duration_minutes' => $durationMins,
                    'duration_formatted' => $durationFormatted,
                    'latitude' => $record['latitude'],
                    'longitude' => $record['longitude'],
                    'distance_meters' => $record['distance_meters'],
                    'status' => ucfirst($record['status']),
                    'live_status' => $liveStatus
                ]
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/stats - Faculty Dashboard Metric Counters
     */
    public function stats(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            if (strtolower($user['role'] ?? '') === 'student') {
                $studentId = (int)$user['sub'];

                // Enrolled classes count
                $enrolledStmt = $pdo->prepare("SELECT COUNT(*) FROM enrollments WHERE student_id = :student_id");
                $enrolledStmt->execute([':student_id' => $studentId]);
                $enrolledClassesCount = (int)$enrolledStmt->fetchColumn();

                // Face enrollment status
                $faceStmt = $pdo->prepare("SELECT id FROM face_enrollments WHERE user_id = :user_id AND status = 'active' LIMIT 1");
                $faceStmt->execute([':user_id' => $studentId]);
                $faceEnrolled = (bool)$faceStmt->fetch();

                // Attendance counts & rate
                $presStmt = $pdo->prepare("SELECT COUNT(*) FROM attendance WHERE student_id = :student_id AND status = 'present'");
                $presStmt->execute([':student_id' => $studentId]);
                $presentCount = (int)$presStmt->fetchColumn();

                $lateStmt = $pdo->prepare("SELECT COUNT(*) FROM attendance WHERE student_id = :student_id AND status = 'late'");
                $lateStmt->execute([':student_id' => $studentId]);
                $lateCount = (int)$lateStmt->fetchColumn();

                $absentStmt = $pdo->prepare("SELECT COUNT(*) FROM attendance WHERE student_id = :student_id AND status = 'absent'");
                $absentStmt->execute([':student_id' => $studentId]);
                $absentCount = (int)$absentStmt->fetchColumn();

                $totalAttended = $presentCount + $lateCount;
                $totalSessions = $totalAttended + $absentCount;
                $attendanceRate = $totalSessions > 0 ? round(($totalAttended / $totalSessions) * 100, 1) : 100.0;

                // Today's classes count
                $todayClassStmt = $pdo->prepare("SELECT COUNT(DISTINCT s.class_id) FROM attendance_sessions s JOIN enrollments e ON s.class_id = e.class_id WHERE e.student_id = :student_id AND s.session_date = CURRENT_DATE");
                $todayClassStmt->execute([':student_id' => $studentId]);
                $todayClassesCount = (int)$todayClassStmt->fetchColumn();

                // Last attendance record
                $lastAttStmt = $pdo->prepare("SELECT a.timestamp, a.status, c.code as class_code, c.name as class_name FROM attendance a JOIN attendance_sessions s ON a.session_id = s.id JOIN classes c ON s.class_id = c.id WHERE a.student_id = :student_id ORDER BY a.id DESC LIMIT 1");
                $lastAttStmt->execute([':student_id' => $studentId]);
                $lastAttendance = $lastAttStmt->fetch(PDO::FETCH_ASSOC) ?: null;

                // Upcoming active session
                $upStmt = $pdo->prepare("SELECT s.id as session_id, s.start_time, c.code as class_code, c.name as class_name, c.room FROM attendance_sessions s JOIN classes c ON s.class_id = c.id JOIN enrollments e ON c.id = e.class_id WHERE e.student_id = :student_id AND s.status = 'active' ORDER BY s.id DESC LIMIT 1");
                $upStmt->execute([':student_id' => $studentId]);
                $upcomingClass = $upStmt->fetch(PDO::FETCH_ASSOC) ?: null;

                echo json_encode([
                    'status' => 'success',
                    'database' => 'Live Neon PostgreSQL',
                    'data' => [
                        'attendanceRate' => $attendanceRate,
                        'totalEnrolledClasses' => $enrolledClassesCount,
                        'faceEnrolled' => $faceEnrolled,
                        'todayClassesCount' => $todayClassesCount,
                        'presentCount' => $presentCount,
                        'lateCount' => $lateCount,
                        'absentCount' => $absentCount,
                        'lastAttendance' => $lastAttendance,
                        'upcomingClass' => $upcomingClass
                    ]
                ]);
                return;
            } else if (strtolower($user['role'] ?? '') === 'faculty') {
                $facId = (int)$user['sub'];
                $classStmt = $pdo->prepare("SELECT COUNT(*) FROM classes WHERE faculty_id = :fac_id");
                $classStmt->execute([':fac_id' => $facId]);
                $totalClasses = (int)$classStmt->fetchColumn();

                $studentStmt = $pdo->prepare("SELECT COUNT(DISTINCT student_id) FROM enrollments e JOIN classes c ON e.class_id = c.id WHERE c.faculty_id = :fac_id");
                $studentStmt->execute([':fac_id' => $facId]);
                $totalStudents = (int)$studentStmt->fetchColumn();

                $sessionStmt = $pdo->prepare("SELECT COUNT(*) FROM attendance_sessions WHERE faculty_id = :fac_id AND session_date = CURRENT_DATE");
                $sessionStmt->execute([':fac_id' => $facId]);
                $todaySessions = (int)$sessionStmt->fetchColumn();

                $presentStmt = $pdo->prepare("SELECT COUNT(*) FROM attendance a JOIN attendance_sessions s ON a.session_id = s.id WHERE s.faculty_id = :fac_id AND a.status = 'present'");
                $presentStmt->execute([':fac_id' => $facId]);
                $presentCount = (int)$presentStmt->fetchColumn();

                $lateStmt = $pdo->prepare("SELECT COUNT(*) FROM attendance a JOIN attendance_sessions s ON a.session_id = s.id WHERE s.faculty_id = :fac_id AND a.status = 'late'");
                $lateStmt->execute([':fac_id' => $facId]);
                $lateCount = (int)$lateStmt->fetchColumn();

                $coStmt = $pdo->prepare("SELECT COUNT(*) FROM attendance a JOIN attendance_sessions s ON a.session_id = s.id WHERE s.faculty_id = :fac_id AND a.checkout_time IS NOT NULL");
                $coStmt->execute([':fac_id' => $facId]);
                $checkedOutCount = (int)$coStmt->fetchColumn();

                $siStmt = $pdo->prepare("SELECT COUNT(*) FROM attendance a JOIN attendance_sessions s ON a.session_id = s.id WHERE s.faculty_id = :fac_id AND a.timestamp IS NOT NULL AND a.checkout_time IS NULL");
                $siStmt->execute([':fac_id' => $facId]);
                $stillInsideCount = (int)$siStmt->fetchColumn();
            } else {
                $totalClasses = (int)$pdo->query("SELECT COUNT(*) FROM classes")->fetchColumn();
                $totalStudents = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student'")->fetchColumn();
                $todaySessions = (int)$pdo->query("SELECT COUNT(*) FROM attendance_sessions WHERE session_date = CURRENT_DATE")->fetchColumn();
                $presentCount = (int)$pdo->query("SELECT COUNT(*) FROM attendance WHERE status = 'present'")->fetchColumn();
                $lateCount = (int)$pdo->query("SELECT COUNT(*) FROM attendance WHERE status = 'late'")->fetchColumn();
                $checkedOutCount = (int)$pdo->query("SELECT COUNT(*) FROM attendance WHERE checkout_time IS NOT NULL")->fetchColumn();
                $stillInsideCount = (int)$pdo->query("SELECT COUNT(*) FROM attendance WHERE timestamp IS NOT NULL AND checkout_time IS NULL")->fetchColumn();
            }

            $totalLogs = $presentCount + $lateCount;
            $attendanceRate = $totalLogs > 0 ? round(($presentCount / $totalLogs) * 100, 1) : 100.0;

            echo json_encode([
                'status' => 'success',
                'database' => 'Live Neon PostgreSQL',
                'data' => [
                    'totalClasses' => $totalClasses,
                    'todaySessions' => $todaySessions,
                    'presentStudents' => $presentCount,
                    'lateStudents' => $lateCount,
                    'checkedOutStudents' => $checkedOutCount,
                    'stillInsideStudents' => $stillInsideCount,
                    'totalStudents' => $totalStudents,
                    'attendanceRate' => $attendanceRate
                ]
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/attendance/history - Filterable Attendance History with CSV Export
     */
    public function history(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }

        $dateFilter    = Sanitizer::string($_GET['date'] ?? '');
        $classIdFilter = Sanitizer::int($_GET['class_id'] ?? 0);
        $statusFilter  = Sanitizer::string($_GET['status'] ?? '');
        $exportFormat  = strtolower(Sanitizer::string($_GET['export'] ?? ''));

        // Validate date format if provided
        if (!empty($dateFilter) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFilter)) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'message' => 'Date filter must be in YYYY-MM-DD format.']);
            return;
        }

        // Whitelist status filter values
        $allowedStatuses = ['present', 'late', 'absent', 'all', ''];
        if (!in_array(strtolower($statusFilter), $allowedStatuses, true)) {
            $statusFilter = '';
        }

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            $sql = "SELECT a.id, a.session_id, a.student_id, a.status, a.timestamp, a.checkout_time, 
                           ROUND(EXTRACT(EPOCH FROM (a.checkout_time - a.timestamp)) / 60) as duration_minutes, 
                           a.latitude, a.longitude, a.distance_meters, a.notes, 
                           u.identifier as student_number, u.name as student_name, u.department, 
                           c.id as class_id, c.code as class_code, c.name as class_name, c.section, c.room 
                    FROM attendance a 
                    JOIN attendance_sessions s ON a.session_id = s.id 
                    JOIN classes c ON s.class_id = c.id 
                    JOIN users u ON a.student_id = u.id 
                    WHERE 1=1";
            $params = [];

            if (strtolower($user['role'] ?? '') === 'faculty') {
                $sql .= " AND c.faculty_id = :faculty_id";
                $params[':faculty_id'] = $user['sub'];
            } else {
                $sql .= " AND a.student_id = :student_id";
                $params[':student_id'] = $user['sub'];
            }

            if (!empty($dateFilter)) {
                $sql .= " AND DATE(a.timestamp) = :date_filter";
                $params[':date_filter'] = $dateFilter;
            }

            if ($classIdFilter > 0) {
                $sql .= " AND c.id = :class_id_filter";
                $params[':class_id_filter'] = $classIdFilter;
            }

            if (!empty($statusFilter) && $statusFilter !== 'all') {
                $sql .= " AND LOWER(a.status) = :status_filter";
                $params[':status_filter'] = strtolower($statusFilter);
            }

            $sql .= " ORDER BY a.id DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($exportFormat === 'csv') {
                header('Content-Type: text/csv; charset=utf-8');
                header('Content-Disposition: attachment; filename="facetrack_attendance_export_' . date('Y-m-d') . '.csv"');

                $output = fopen('php://output', 'w');
                fputcsv($output, ['ID', 'Student Number', 'Student Name', 'Department', 'Course Code', 'Subject Name', 'Section', 'Room', 'Date', 'Check-in Time', 'Check-out Time', 'Duration (Mins)', 'Latitude', 'Longitude', 'Distance (m)', 'Status', 'Notes']);

                foreach ($records as $row) {
                    fputcsv($output, [
                        $row['id'],
                        $row['student_number'],
                        $row['student_name'],
                        $row['department'] ?? 'N/A',
                        $row['class_code'],
                        $row['class_name'],
                        $row['section'] ?? 'Sec 1',
                        $row['room'] ?? 'N/A',
                        date('Y-m-d', strtotime($row['timestamp'])),
                        date('H:i:s', strtotime($row['timestamp'])),
                        $row['checkout_time'] ? date('H:i:s', strtotime($row['checkout_time'])) : 'N/A',
                        $row['duration_minutes'] ?? 'N/A',
                        $row['latitude'] ?? 'N/A',
                        $row['longitude'] ?? 'N/A',
                        $row['distance_meters'] ?? '0.00',
                        strtoupper($row['status']),
                        $row['notes'] ?? ''
                    ]);
                }

                fclose($output);
                exit();
            }

            echo json_encode([
                'status' => 'success',
                'database' => 'Neon PostgreSQL',
                'data' => $records
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/attendance - Live logs from Neon PostgreSQL
     */
    public function index(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            $sql = "SELECT a.id, a.status, a.confidence_score, a.timestamp, a.checkout_time, 
                           ROUND(EXTRACT(EPOCH FROM (a.checkout_time - a.timestamp)) / 60) as duration_minutes, 
                           a.latitude, a.longitude, a.distance_meters, a.notes, 
                           u.identifier as student_id, u.name as student_name, u.department 
                    FROM attendance a 
                    JOIN users u ON a.student_id = u.id 
                    ORDER BY a.id DESC LIMIT 50";
            $stmt = $pdo->query($sql);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'source' => 'Neon PostgreSQL Database',
                'data' => $logs
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}
