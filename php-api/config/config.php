<?php

define('JWT_SECRET', getenv('JWT_SECRET') ?: 'your-secret-key-change-this-in-production');
define('JWT_EXPIRY', 60 * 60 * 24 * 30); // 30 days
define('OTP_EXPIRY', 300); // 5 minutes
define('CORS_ORIGIN', '*');

date_default_timezone_set('Asia/Tashkent');

function cors_headers() {
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function json_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function success_response($data = null, $message = 'OK') {
    json_response(['success' => true, 'data' => $data, 'message' => $message]);
}

function error_response($message, $code = 400) {
    json_response(['success' => false, 'error' => $message], $code);
}

function get_json_body(): array {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    return is_array($data) ? $data : [];
}

function generate_jwt(int $user_id): string {
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64url_encode(json_encode([
        'user_id' => $user_id,
        'iat' => time(),
        'exp' => time() + JWT_EXPIRY,
    ]));
    $signature = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

function verify_jwt(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $signature] = $parts;
    $valid_sig = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));

    if (!hash_equals($valid_sig, $signature)) return null;

    $data = json_decode(base64url_decode($payload), true);
    if (!$data || !isset($data['exp']) || $data['exp'] < time()) return null;

    return $data;
}

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}

function get_auth_user_id(): int {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/', $header, $matches)) {
        error_response('Avtorizatsiya talab qilinadi', 401);
    }

    $payload = verify_jwt($matches[1]);
    if (!$payload || !isset($payload['user_id'])) {
        error_response('Token yaroqsiz yoki muddati o\'tgan', 401);
    }

    return (int) $payload['user_id'];
}

function generate_otp(): string {
    return str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
}
