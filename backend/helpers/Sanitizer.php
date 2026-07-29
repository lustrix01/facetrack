<?php
/**
 * FaceTrack REST API - Request Input Sanitizer
 * Strips, encodes, and normalises all incoming data before it reaches controllers.
 */

namespace Helpers;

class Sanitizer {
    /**
     * Sanitize a plain string — strips tags, encodes entities, trims whitespace.
     */
    public static function string(mixed $value, int $maxLength = 255): string {
        $str = is_string($value) ? $value : (string)($value ?? '');
        $str = trim($str);
        $str = strip_tags($str);
        $str = htmlspecialchars($str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return substr($str, 0, $maxLength);
    }

    /**
     * Sanitize an email address.
     */
    public static function email(mixed $value): string {
        $email = self::string($value, 254);
        return strtolower(filter_var($email, FILTER_SANITIZE_EMAIL) ?: '');
    }

    /**
     * Sanitize and cast to a safe integer — returns 0 on failure.
     */
    public static function int(mixed $value): int {
        return (int) filter_var($value, FILTER_SANITIZE_NUMBER_INT);
    }

    /**
     * Sanitize and cast to a safe float for GPS / numeric fields.
     */
    public static function float(mixed $value): float {
        return (float) filter_var($value, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
    }

    /**
     * Sanitize a boolean-like value (true / "true" / 1 → true, else false).
     */
    public static function bool(mixed $value): bool {
        if (is_bool($value)) return $value;
        if (is_string($value)) return in_array(strtolower(trim($value)), ['true', '1', 'yes', 'on'], true);
        return (bool)$value;
    }

    /**
     * Sanitize an array of floats (used for facial descriptor vectors).
     */
    public static function floatArray(mixed $value, int $maxItems = 512): array {
        if (!is_array($value)) return [];
        $result = [];
        $count = min(count($value), $maxItems);
        for ($i = 0; $i < $count; $i++) {
            $result[] = self::float($value[$i]);
        }
        return $result;
    }

    /**
     * Sanitize an array of base64 image strings (for face samples).
     */
    public static function base64Array(mixed $value, int $maxItems = 20): array {
        if (!is_array($value)) return [];
        $result = [];
        $count = min(count($value), $maxItems);
        for ($i = 0; $i < $count; $i++) {
            $item = is_string($value[$i]) ? $value[$i] : '';
            // Allow data URIs and raw base64
            if (preg_match('/^data:image\/[a-z]+;base64,/', $item) || preg_match('/^[A-Za-z0-9+\/=]+$/', $item)) {
                $result[] = substr($item, 0, 2_097_152); // 2 MB cap per sample
            }
        }
        return $result;
    }

    /**
     * Decode and sanitize raw JSON request body.
     */
    public static function jsonBody(): array {
        $raw = file_get_contents('php://input');
        if (empty($raw)) return [];
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}
