<?php
/**
 * FaceTrack REST API - CORS Configuration Helper
 */

require_once __DIR__ . '/../helpers/env.php';

function handleCors(): void {
    $allowedOrigin = env('ALLOWED_ORIGIN');
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($allowedOrigin && $allowedOrigin !== '*') {
        $origin = ($requestOrigin === $allowedOrigin) ? $requestOrigin : $allowedOrigin;
    } else {
        $origin = $requestOrigin ?: '*';
    }

    header("Access-Control-Allow-Origin: {$origin}");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Max-Age: 86400");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

    // Handle preflight OPTIONS requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit();
    }
}
