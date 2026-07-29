<?php
/**
 * FaceTrack REST API - JWT (JSON Web Token) Helper
 * Pure PHP HMAC-SHA256 Implementation
 */

namespace Helpers;

class JWT {
    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
    }

    /**
     * Generate a signed JWT token
     */
    public static function encode(array $payload, string $secret, int $expirySeconds = 86400): string {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        
        $issuedAt = time();
        $payload['iat'] = $issuedAt;
        $payload['exp'] = $issuedAt + $expirySeconds;

        $payloadEncoded = json_encode($payload);

        $base64Header = self::base64UrlEncode($header);
        $base64Payload = self::base64UrlEncode($payloadEncoded);

        $signature = hash_hmac('sha256', "{$base64Header}.{$base64Payload}", $secret, true);
        $base64Signature = self::base64UrlEncode($signature);

        return "{$base64Header}.{$base64Payload}.{$base64Signature}";
    }

    /**
     * Validate signature and expiration of a JWT token
     */
    public static function decode(string $token, string $secret): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$base64Header, $base64Payload, $base64Signature] = $parts;

        // Verify signature
        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', "{$base64Header}.{$base64Payload}", $secret, true)
        );

        if (!hash_equals($expectedSignature, $base64Signature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($base64Payload), true);
        if (!$payload || !isset($payload['exp'])) {
            return null;
        }

        // Check expiration
        if (time() >= $payload['exp']) {
            return null;
        }

        return $payload;
    }
}
