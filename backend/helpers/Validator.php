<?php
/**
 * FaceTrack REST API - Request Validator
 * Centralised validation rules with precise error messages.
 */

namespace Helpers;

class Validator {
    private array $errors = [];
    private array $data;

    public function __construct(array $data) {
        $this->data = $data;
    }

    // -------------------------------------------------------------------------
    // Rule Builders
    // -------------------------------------------------------------------------

    public function required(string $field, string $label = ''): static {
        $label = $label ?: ucfirst(str_replace('_', ' ', $field));
        $value = $this->data[$field] ?? null;
        if ($value === null || $value === '' || (is_array($value) && empty($value))) {
            $this->errors[$field] = "{$label} is required.";
        }
        return $this;
    }

    public function email(string $field, string $label = 'Email'): static {
        $value = $this->data[$field] ?? '';
        if (!empty($value) && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = "{$label} must be a valid email address.";
        }
        return $this;
    }

    public function minLength(string $field, int $min, string $label = ''): static {
        $label = $label ?: ucfirst(str_replace('_', ' ', $field));
        $value = (string)($this->data[$field] ?? '');
        if (!isset($this->errors[$field]) && strlen($value) < $min) {
            $this->errors[$field] = "{$label} must be at least {$min} characters long.";
        }
        return $this;
    }

    public function maxLength(string $field, int $max, string $label = ''): static {
        $label = $label ?: ucfirst(str_replace('_', ' ', $field));
        $value = (string)($this->data[$field] ?? '');
        if (!isset($this->errors[$field]) && strlen($value) > $max) {
            $this->errors[$field] = "{$label} must not exceed {$max} characters.";
        }
        return $this;
    }

    public function password(string $field = 'password'): static {
        $value = (string)($this->data[$field] ?? '');
        if (!isset($this->errors[$field])) {
            if (strlen($value) < 8) {
                $this->errors[$field] = 'Password must be at least 8 characters long.';
            } elseif (!preg_match('/[A-Z]/', $value)) {
                $this->errors[$field] = 'Password must contain at least one uppercase letter.';
            } elseif (!preg_match('/[a-z]/', $value)) {
                $this->errors[$field] = 'Password must contain at least one lowercase letter.';
            } elseif (!preg_match('/[0-9]/', $value)) {
                $this->errors[$field] = 'Password must contain at least one number.';
            }
        }
        return $this;
    }

    public function positiveInt(string $field, string $label = ''): static {
        $label = $label ?: ucfirst(str_replace('_', ' ', $field));
        $value = $this->data[$field] ?? null;
        if (!isset($this->errors[$field])) {
            $intVal = filter_var($value, FILTER_VALIDATE_INT);
            if ($intVal === false || $intVal <= 0) {
                $this->errors[$field] = "{$label} must be a positive integer.";
            }
        }
        return $this;
    }

    /**
     * Validate GPS latitude: must be between -90.0 and 90.0
     */
    public function latitude(string $field = 'latitude'): static {
        $value = $this->data[$field] ?? null;
        if (!isset($this->errors[$field]) && $value !== null) {
            $f = filter_var($value, FILTER_VALIDATE_FLOAT);
            if ($f === false || $f < -90.0 || $f > 90.0) {
                $this->errors[$field] = "Latitude must be a valid decimal between -90.0 and 90.0.";
            }
        }
        return $this;
    }

    /**
     * Validate GPS longitude: must be between -180.0 and 180.0
     */
    public function longitude(string $field = 'longitude'): static {
        $value = $this->data[$field] ?? null;
        if (!isset($this->errors[$field]) && $value !== null) {
            $f = filter_var($value, FILTER_VALIDATE_FLOAT);
            if ($f === false || $f < -180.0 || $f > 180.0) {
                $this->errors[$field] = "Longitude must be a valid decimal between -180.0 and 180.0.";
            }
        }
        return $this;
    }

    /**
     * Validate allowed radius in meters (1m – 10,000m).
     */
    public function radius(string $field = 'radius_meters'): static {
        $value = $this->data[$field] ?? null;
        if (!isset($this->errors[$field]) && $value !== null) {
            $intVal = filter_var($value, FILTER_VALIDATE_INT);
            if ($intVal === false || $intVal < 1 || $intVal > 10000) {
                $this->errors[$field] = "Allowed radius must be between 1 and 10,000 meters.";
            }
        }
        return $this;
    }

    /**
     * Validate role is one of the allowed values.
     */
    public function role(string $field = 'role', array $allowed = ['faculty', 'student', 'admin']): static {
        $value = strtolower(trim((string)($this->data[$field] ?? '')));
        if (!empty($value) && !in_array($value, $allowed, true)) {
            $this->errors[$field] = "Role must be one of: " . implode(', ', $allowed) . ".";
        }
        return $this;
    }

    /**
     * Validate attendance session status.
     */
    public function sessionStatus(string $field = 'status'): static {
        $allowed = ['active', 'ended', 'completed', 'cancelled'];
        $value = strtolower(trim((string)($this->data[$field] ?? '')));
        if (!empty($value) && !in_array($value, $allowed, true)) {
            $this->errors[$field] = "Session status must be one of: " . implode(', ', $allowed) . ".";
        }
        return $this;
    }

    // -------------------------------------------------------------------------
    // Result Methods
    // -------------------------------------------------------------------------

    public function passes(): bool {
        return empty($this->errors);
    }

    public function fails(): bool {
        return !empty($this->errors);
    }

    public function errors(): array {
        return $this->errors;
    }

    public function firstError(): string {
        return array_values($this->errors)[0] ?? 'Validation failed.';
    }

    /**
     * Immediately send HTTP 422 with validation errors and halt execution.
     */
    public function abortIfFails(): void {
        if ($this->fails()) {
            http_response_code(422);
            echo json_encode([
                'status' => 'error',
                'message' => $this->firstError(),
                'errors' => $this->errors()
            ]);
            exit;
        }
    }
}
