<?php
/**
 * FaceTrack REST API - Main Entry Point & Router
 */

require_once __DIR__ . '/helpers/env.php';
require_once __DIR__ . '/config/error_handler.php';
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/jwt.php';
require_once __DIR__ . '/helpers/Sanitizer.php';
require_once __DIR__ . '/helpers/Validator.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ClassController.php';
require_once __DIR__ . '/controllers/SessionController.php';
require_once __DIR__ . '/controllers/AttendanceController.php';
require_once __DIR__ . '/controllers/FaceController.php';
require_once __DIR__ . '/controllers/EnrollmentController.php';

use Controllers\AuthController;
use Controllers\ClassController;
use Controllers\SessionController;
use Controllers\AttendanceController;
use Controllers\FaceController;
use Controllers\EnrollmentController;

handleCors();

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Route dispatching
if ($requestMethod === 'POST' && ($requestUri === '/api/register' || $requestUri === '/register')) {
    (new AuthController())->register();
    exit();
}

if ($requestMethod === 'POST' && ($requestUri === '/api/login' || $requestUri === '/login')) {
    (new AuthController())->login();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/me' || $requestUri === '/me')) {
    (new AuthController())->me();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/stats' || $requestUri === '/stats')) {
    (new AttendanceController())->stats();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/classes' || $requestUri === '/classes')) {
    (new ClassController())->index();
    exit();
}

if ($requestMethod === 'POST' && ($requestUri === '/api/classes' || $requestUri === '/classes')) {
    (new ClassController())->store();
    exit();
}

if ($requestMethod === 'PUT' && ($requestUri === '/api/classes' || $requestUri === '/classes')) {
    (new ClassController())->update();
    exit();
}

if ($requestMethod === 'DELETE' && ($requestUri === '/api/classes' || $requestUri === '/classes')) {
    (new ClassController())->destroy();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/students' || $requestUri === '/students')) {
    (new EnrollmentController())->students();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/enrollments' || $requestUri === '/enrollments')) {
    (new EnrollmentController())->index();
    exit();
}

if ($requestMethod === 'POST' && ($requestUri === '/api/enrollments' || $requestUri === '/enrollments')) {
    (new EnrollmentController())->store();
    exit();
}

if ($requestMethod === 'DELETE' && ($requestUri === '/api/enrollments' || $requestUri === '/enrollments')) {
    (new EnrollmentController())->destroy();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/sessions' || $requestUri === '/sessions')) {
    (new SessionController())->index();
    exit();
}

if ($requestMethod === 'POST' && ($requestUri === '/api/sessions' || $requestUri === '/sessions')) {
    (new SessionController())->store();
    exit();
}

if ($requestMethod === 'POST' && ($requestUri === '/api/sessions/end' || $requestUri === '/sessions/end')) {
    (new SessionController())->end();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/face/status' || $requestUri === '/face/status')) {
    (new FaceController())->status();
    exit();
}

if ($requestMethod === 'POST' && ($requestUri === '/api/privacy-consent' || $requestUri === '/privacy-consent')) {
    (new FaceController())->consent();
    exit();
}

if ($requestMethod === 'POST' && ($requestUri === '/api/face/enroll' || $requestUri === '/face/enroll')) {
    (new FaceController())->enroll();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/face/faculty-roster' || $requestUri === '/face/faculty-roster')) {
    (new FaceController())->facultyRoster();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/attendance/active-session' || $requestUri === '/attendance/active-session')) {
    (new AttendanceController())->activeSession();
    exit();
}

if ($requestMethod === 'POST' && ($requestUri === '/api/attendance/checkin' || $requestUri === '/attendance/checkin')) {
    (new AttendanceController())->checkin();
    exit();
}

if ($requestMethod === 'POST' && ($requestUri === '/api/attendance/checkout' || $requestUri === '/attendance/checkout')) {
    (new AttendanceController())->checkout();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/attendance/today-status' || $requestUri === '/attendance/today-status')) {
    (new AttendanceController())->todayStatus();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/attendance/history' || $requestUri === '/attendance/history')) {
    (new AttendanceController())->history();
    exit();
}

if ($requestMethod === 'GET' && ($requestUri === '/api/attendance' || $requestUri === '/attendance')) {
    (new AttendanceController())->index();
    exit();
}

// Fallback status response
header('Content-Type: application/json; charset=utf-8');
$response = [
    'status' => 'success',
    'app' => 'FaceTrack REST API',
    'database' => 'Neon PostgreSQL (Connected & Live)',
    'version' => '1.0.0',
    'timestamp' => date('c'),
    'endpoints' => [
        'GET /api/attendance/today-status' => 'Student today attendance status, check-in/out & class duration',
        'POST /api/attendance/checkin' => 'Enforces single check-in rule and records check-in',
        'POST /api/attendance/checkout' => 'Enforces single check-out rule and calculates class duration'
    ]
];

echo json_encode($response, JSON_PRETTY_PRINT);
