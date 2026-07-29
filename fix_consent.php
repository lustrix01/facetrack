<?php
// Run from: c:\Users\Owhie Lumbang\Desktop\facetrack
require __DIR__ . '/backend/config/database.php';
$pdo = (new Config\Database())->getConnection();

$updated = $pdo->exec("UPDATE privacy_consent SET agreed = TRUE, agreed_at = COALESCE(agreed_at, consented_at, CURRENT_TIMESTAMP) WHERE (consent_given = TRUE OR consented_at IS NOT NULL) AND (agreed IS NULL OR agreed = FALSE)");
echo "Fixed $updated consent rows: agreed set to TRUE.\n";

$rows = $pdo->query("SELECT id, user_id, agreed, consent_given, agreed_at, consented_at, ip_address FROM privacy_consent")->fetchAll(\PDO::FETCH_ASSOC);
print_r($rows);
