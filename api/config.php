<?php
// NutriUZ API Configuration

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'nutriuz');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Token settings
define('TOKEN_EXPIRY_DAYS', 90);
define('OTP_EXPIRY_MINUTES', 5);

// SMS settings (Eskiz.uz or PlayMobile)
define('SMS_API_URL', '');
define('SMS_API_TOKEN', '');
define('SMS_FROM', 'NutriUZ');

// Email settings
define('SMTP_HOST', '');
define('SMTP_PORT', 587);
define('SMTP_USER', '');
define('SMTP_PASS', '');
define('MAIL_FROM', 'noreply@nutriuz.uz');

class Database {
    private static ?PDO $instance = null;

    public static function get(): PDO {
        if (self::$instance === null) {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
            self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }
        return self::$instance;
    }
}

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function errorResponse(string $message, int $code = 400): void {
    jsonResponse(['success' => false, 'error' => $message], $code);
}

function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function generateOTP(): string {
    return str_pad((string)random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
}

function generateToken(): string {
    return bin2hex(random_bytes(32));
}

function getAuthUser(): ?array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return null;
    }
    $token = $matches[1];
    $db = Database::get();
    $stmt = $db->prepare('SELECT * FROM users WHERE token = ? AND token_expires_at > NOW()');
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

function requireAuth(): array {
    $user = getAuthUser();
    if (!$user) {
        errorResponse('Avtorizatsiya talab qilinadi', 401);
    }
    return $user;
}

function sendSMS(string $phone, string $message): bool {
    if (empty(SMS_API_URL) || empty(SMS_API_TOKEN)) {
        error_log("[NutriUZ] SMS not configured. OTP for $phone: $message");
        return true;
    }
    
    $ch = curl_init(SMS_API_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . SMS_API_TOKEN,
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'mobile_phone' => $phone,
            'message' => $message,
            'from' => SMS_FROM,
        ]),
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return $httpCode >= 200 && $httpCode < 300;
}

function sendEmail(string $to, string $subject, string $body): bool {
    if (empty(SMTP_HOST)) {
        error_log("[NutriUZ] Email not configured. Email to $to: $body");
        return true;
    }
    
    $headers = "From: " . MAIL_FROM . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    return mail($to, $subject, $body, $headers);
}
