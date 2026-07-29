<?php
/**
 * FaceTrack REST API - Production Error & Exception Handler
 */

namespace Config;

use Throwable;

class ErrorHandler {
    public static function register(): void {
        error_reporting(E_ALL);

        set_error_handler([self::class, 'handleError']);
        set_exception_handler([self::class, 'handleException']);
        register_shutdown_function([self::class, 'handleShutdown']);
    }

    public static function handleError(int $severity, string $message, string $file, int $line): bool {
        if (!(error_reporting() & $severity)) {
            return false;
        }

        self::renderJsonError(500, "Internal API Error: {$message}");
        return true;
    }

    public static function handleException(Throwable $exception): void {
        $statusCode = (int)$exception->getCode();
        if ($statusCode < 400 || $statusCode > 599) {
            $statusCode = 500;
        }

        $message = $exception->getMessage() ?: 'An unexpected server error occurred.';
        self::renderJsonError($statusCode, $message);
    }

    public static function handleShutdown(): void {
        $error = error_get_last();
        if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
            self::renderJsonError(500, "Fatal Execution Error: {$error['message']}");
        }
    }

    private static function renderJsonError(int $statusCode, string $message): void {
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=utf-8');
            header('Access-Control-Allow-Origin: *');
        }

        echo json_encode([
            'status' => 'error',
            'result_code' => 'API Error',
            'message' => $message,
            'timestamp' => date('c'),
        ], JSON_PRETTY_PRINT);
        exit();
    }
}

// Register global error handler
ErrorHandler::register();
