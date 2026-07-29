<?php
require_once __DIR__ . '/database.php';

use Config\Database;

try {
    $database = new Database();
    $pdo = $database->getConnection();

    $pdo->exec("ALTER TABLE attendance_sessions DROP CONSTRAINT IF EXISTS attendance_sessions_status_check;");
    $pdo->exec("ALTER TABLE attendance_sessions ADD CONSTRAINT attendance_sessions_status_check CHECK (status IN ('active', 'ended', 'completed', 'cancelled'));");

    echo "CHECK constraint updated successfully on Neon PostgreSQL!\n";
} catch (\Exception $e) {
    echo "Error updating constraint: " . $e->getMessage() . "\n";
}
