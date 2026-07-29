<?php
/**
 * FaceTrack REST API - Authentication Middleware
 */

namespace Middleware;

use Helpers\JWT;

class AuthMiddleware {
    /**
     * Get secret key from environment or fallback
     */
    public static function getSecret(): string {
        $envFile = dirname(__DIR__) . '/.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
                    continue;
                }
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value, " \"'");
                $_ENV[$key] = $value;
                putenv("{$key}={$value}");
            }
        }

        return $_ENV['APP_SECRET'] ?? getenv('APP_SECRET') ?: 'facetrack_jwt_secret_neon_2026';
    }

    /**
     * Validate request Authorization header
     *
     * @return array|null User payload if valid, null otherwise
     */
    public static function authenticate(): ?array {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (!$authHeader && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return null;
        }

        $token = trim($matches[1]);
        return JWT::decode($token, self::getSecret());
    }
}
