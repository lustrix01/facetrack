<?php
/**
 * FaceTrack REST API - Python AI Microservice Client Gateway
 * Encapsulates cURL communication with the FastAPI InsightFace AI Service
 */

namespace Services;

class AiServiceClient {
    private static function getServiceUrl(): string {
        return getenv('AI_SERVICE_URL') ?: 'http://127.0.0.1:5000';
    }

    private static function getApiKey(): string {
        return getenv('AI_SECRET_KEY') ?: 'facetrack_ai_secret_key_2026_x89f';
    }

    /**
     * Send HTTP POST request to Python AI Microservice
     */
    private static function post(string $endpoint, array $payload): array {
        $url = self::getServiceUrl() . $endpoint;
        $jsonPayload = json_encode($payload);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $jsonPayload,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-AI-API-KEY: ' . self::getApiKey()
            ],
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_CONNECTTIMEOUT => 3
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($curlErr || !$response) {
            return [
                'success' => false,
                'status_code' => 503,
                'message' => 'Python AI Microservice unavailable or connection timeout.'
            ];
        }

        $decoded = json_decode($response, true) ?: [];
        $decoded['success'] = ($httpCode >= 200 && $httpCode < 300);
        $decoded['status_code'] = $httpCode;
        return $decoded;
    }

    /**
     * Call POST /enroll on Python AI service to generate InsightFace 512-D embedding
     */
    public static function enroll(array $samples): array {
        return self::post('/enroll', [
            'samples' => $samples,
            'sample_count' => count($samples)
        ]);
    }

    /**
     * Call POST /verify on Python AI service for 1:1 InsightFace cosine similarity verification
     */
    public static function verify(string $imageB64, array $storedEmbedding, bool $requireSmile = true): array {
        return self::post('/verify', [
            'image' => $imageB64,
            'stored_embedding' => $storedEmbedding,
            'require_smile' => $requireSmile
        ]);
    }
}
