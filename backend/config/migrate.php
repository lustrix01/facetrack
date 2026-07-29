<?php
/**
 * FaceTrack Database Migration Runner for Neon PostgreSQL
 */

require_once __DIR__ . '/database.php';

use Config\Database;

try {
    echo "Connecting to Neon PostgreSQL database...\n";
    $database = new Database();
    $pdo = $database->getConnection();

    $sqlPath = __DIR__ . '/schema.sql';
    if (!file_exists($sqlPath)) {
        die("Error: schema.sql not found at {$sqlPath}\n");
    }

    $sql = file_get_contents($sqlPath);
    echo "Executing schema.sql DDL migration on Neon...\n";
    $pdo->exec($sql);

    echo "SUCCESS: Schema migrated successfully on Neon PostgreSQL!\n";

    // Verify created tables
    $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo "Tables in database (" . count($tables) . "):\n";
    foreach ($tables as $t) {
        echo " - {$t}\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
