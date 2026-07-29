<?php
/**
 * FaceTrack REST API - Auth Controller (Hardened)
 * - All inputs sanitized via Sanitizer helper
 * - All fields validated via Validator helper
 * - Strong password policy (min 8 chars, upper, lower, digit)
 * - Email format enforced
 * - Duplicate account detection (identifier + email)
 * - All DB queries use prepared statements
 * - Proper HTTP status codes (400, 401, 403, 409, 422, 500)
 */

namespace Controllers;

use Config\Database;
use Helpers\JWT;
use Helpers\Sanitizer;
use Helpers\Validator;
use Middleware\AuthMiddleware;
use PDO;
use PDOException;

class AuthController {
    private static function getSecret(): string {
        return AuthMiddleware::getSecret();
    }

    /**
     * POST /api/register — Create new account with full sanitization & validation
     */
    public function register(): void {
        $input = Sanitizer::jsonBody();

        $identifier = Sanitizer::string($input['identifier'] ?? '');
        $name       = Sanitizer::string($input['name'] ?? '');
        $email      = Sanitizer::email($input['email'] ?? '');
        $password   = trim($input['password'] ?? ''); // Don't strip password chars
        $role       = Sanitizer::string($input['role'] ?? 'student');
        $department = Sanitizer::string($input['department'] ?? 'General');

        // Validate
        $v = new Validator([
            'identifier' => $identifier,
            'name'       => $name,
            'email'      => $email,
            'password'   => $password,
            'role'       => $role,
        ]);

        $v->required('identifier', 'Faculty ID / Student Number')
          ->required('name', 'Full Name')
          ->required('email', 'Email')
          ->required('password', 'Password')
          ->email('email')
          ->password('password')
          ->maxLength('identifier', 50, 'Faculty ID / Student Number')
          ->maxLength('name', 100, 'Full Name')
          ->role('role');

        $v->abortIfFails();

        // Enforce allowed roles (block 'admin' from self-registering)
        if (strtolower($role) === 'admin') {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Admin accounts cannot be self-registered.']);
            return;
        }

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            // Duplicate check — identifier and email (409 Conflict)
            $checkStmt = $pdo->prepare(
                "SELECT id FROM users WHERE LOWER(identifier) = LOWER(:identifier) OR LOWER(email) = LOWER(:email)"
            );
            $checkStmt->execute([':identifier' => $identifier, ':email' => $email]);
            if ($checkStmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'An account with this Faculty ID / Student Number or email address already exists.'
                ]);
                return;
            }

            $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

            $stmt = $pdo->prepare(
                "INSERT INTO users (identifier, name, email, password_hash, role, department)
                 VALUES (:identifier, :name, :email, :password_hash, :role, :department)
                 RETURNING id, identifier, name, email, role, department"
            );
            $stmt->execute([
                ':identifier'   => $identifier,
                ':name'         => $name,
                ':email'        => $email,
                ':password_hash'=> $passwordHash,
                ':role'         => strtolower($role),
                ':department'   => $department,
            ]);

            $newUser = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$newUser) {
                throw new PDOException('Failed to create account in Neon PostgreSQL.');
            }

            http_response_code(201);
            $this->issueSuccessResponse($newUser);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Database error during registration.']);
        }
    }

    /**
     * POST /api/login — Authenticate with identifier & password
     */
    public function login(): void {
        $input = Sanitizer::jsonBody();

        $identifier    = Sanitizer::string($input['identifier'] ?? '');
        $password      = trim($input['password'] ?? '');
        $requestedRole = Sanitizer::string($input['role'] ?? '');

        $v = new Validator(['identifier' => $identifier, 'password' => $password]);
        $v->required('identifier', 'Faculty ID / Student Number')
          ->required('password', 'Password');
        $v->abortIfFails();

        try {
            $database = new Database();
            $pdo = $database->getConnection();

            // Prepared statement — no string interpolation
            $stmt = $pdo->prepare(
                "SELECT id, identifier, name, email, password_hash, role, department
                 FROM users WHERE LOWER(identifier) = LOWER(:identifier)"
            );
            $stmt->execute([':identifier' => $identifier]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'Account not found. Please check your Faculty ID / Student Number.'
                ]);
                return;
            }

            if (!password_verify($password, $user['password_hash'])) {
                http_response_code(401);
                echo json_encode(['status' => 'error', 'message' => 'Incorrect password. Please try again.']);
                return;
            }

            if (!empty($requestedRole) && strtolower($user['role']) !== strtolower($requestedRole)) {
                $actualRole = ucfirst($user['role']);
                http_response_code(401);
                echo json_encode([
                    'status'  => 'error',
                    'message' => "This ID is registered as a {$actualRole} account. Please switch to the {$actualRole} login tab."
                ]);
                return;
            }

            $this->issueSuccessResponse($user);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Database connection error during login.']);
        }
    }

    /**
     * GET /api/me — Return current authenticated user from JWT
     */
    public function me(): void {
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Token missing or expired.']);
            return;
        }

        echo json_encode(['status' => 'success', 'user' => $user]);
    }

    private function issueSuccessResponse(array $user): void {
        $payload = [
            'sub'        => (int)$user['id'],
            'identifier' => $user['identifier'],
            'name'       => $user['name'],
            'email'      => $user['email'] ?? '',
            'role'       => $user['role'],
            'department' => $user['department'] ?? 'General',
        ];

        $token = JWT::encode($payload, self::getSecret());

        echo json_encode([
            'status'  => 'success',
            'message' => 'Authenticated successfully.',
            'token'   => $token,
            'user'    => $payload,
        ]);
    }
}
