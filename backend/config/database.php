<?php
/**
 * FaceTrack REST API - Database Connection Manager
 * PostgreSQL (Neon) PDO Connection
 */

namespace Config;

use PDO;
use PDOException;

class Database {
    private string $host;
    private int $port;
    private string $dbName;
    private string $username;
    private string $password;
    private string $sslMode;
    private ?string $endpointId = null;
    private ?PDO $connection = null;

    public function __construct() {
        // Load .env file if available
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

        $dbUrl = $_ENV['DATABASE_URL'] ?? getenv('DATABASE_URL') ?: '';
        if ($dbUrl) {
            $parsed = parse_url($dbUrl);
            $this->host = $parsed['host'] ?? 'localhost';
            $this->port = (int)($parsed['port'] ?? 5432);
            $this->username = $parsed['user'] ?? 'neondb_owner';
            $this->password = $parsed['pass'] ?? '';
            $this->dbName = ltrim($parsed['path'] ?? 'neondb', '/');

            if (isset($parsed['query'])) {
                parse_str($parsed['query'], $queryParams);
                $this->sslMode = $queryParams['sslmode'] ?? 'require';
            } else {
                $this->sslMode = 'require';
            }
        } else {
            $this->host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'ep-empty-violet-avfujn71.c-11.us-east-1.aws.neon.tech';
            $this->port = (int)($_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: 5432);
            $this->dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'neondb';
            $this->username = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'neondb_owner';
            $this->password = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: 'npg_HADY0m9Rsxae';
            $this->sslMode = $_ENV['DB_SSLMODE'] ?? getenv('DB_SSLMODE') ?: 'require';
        }

        // Extract endpoint ID for Neon SNI routing (e.g. ep-empty-violet-avfujn71)
        if (str_contains($this->host, 'neon.tech')) {
            $parts = explode('.', $this->host);
            $this->endpointId = $parts[0] ?? null;
        }
    }

    /**
     * Get reusable PDO database connection
     *
     * @return PDO
     * @throws PDOException
     */
    public function getConnection(): PDO {
        if ($this->connection !== null) {
            return $this->connection;
        }

        $dsnParts = [
            "host={$this->host}",
            "port={$this->port}",
            "dbname={$this->dbName}",
            "sslmode={$this->sslMode}"
        ];

        if ($this->endpointId) {
            $dsnParts[] = "options='endpoint={$this->endpointId}'";
        }

        $dsn = "pgsql:" . implode(';', $dsnParts);

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
        ];

        try {
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
            return $this->connection;
        } catch (PDOException $e) {
            throw new PDOException("Neon PostgreSQL Database Connection Error: " . $e->getMessage(), (int)$e->getCode());
        }
    }
}
