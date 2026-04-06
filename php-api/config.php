<?php

define('DB_HOST', 'localhost');
define('DB_NAME', 'nutriuz_db');
define('DB_USER', 'root');
define('DB_PASS', '');

define('JWT_SECRET', 'your_super_secret_key_change_this_in_production_123!');
define('JWT_EXPIRY', 86400 * 30); // 30 kun

define('OTP_EXPIRY', 300); // 5 daqiqa
define('OTP_LENGTH', 6);

define('CORS_ORIGIN', '*');

date_default_timezone_set('Asia/Tashkent');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}
