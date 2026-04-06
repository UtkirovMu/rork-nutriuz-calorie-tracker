<?php

function cors() {
    header("Access-Control-Allow-Origin: " . CORS_ORIGIN);
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Content-Type: application/json; charset=utf-8");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function success($data = null, $message = 'OK') {
    $response = ['success' => true, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    jsonResponse($response);
}

function error($message, $code = 400) {
    jsonResponse(['success' => false, 'error' => $message], $code);
}

function getInput() {
    $json = file_get_contents('php://input');
    return json_decode($json, true) ?? [];
}

function generateOTP(): string {
    return str_pad((string)random_int(0, 999999), OTP_LENGTH, '0', STR_PAD_LEFT);
}

// JWT
function base64UrlEncode($data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode($data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

function createJWT(int $userId): string {
    $header = base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64UrlEncode(json_encode([
        'user_id' => $userId,
        'iat' => time(),
        'exp' => time() + JWT_EXPIRY,
    ]));
    $signature = base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

function verifyJWT(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $signature] = $parts;
    $expectedSig = base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));

    if (!hash_equals($expectedSig, $signature)) return null;

    $data = json_decode(base64UrlDecode($payload), true);
    if (!$data || !isset($data['exp']) || $data['exp'] < time()) return null;

    return $data;
}

function getAuthUserId(): int {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        error('Token topilmadi', 401);
    }

    $data = verifyJWT($matches[1]);
    if (!$data || !isset($data['user_id'])) {
        error('Token yaroqsiz yoki muddati tugagan', 401);
    }

    return (int)$data['user_id'];
}

function getRoute(): string {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $uri = preg_replace('#^/api#', '', $uri);
    return $uri ?: '/';
}

function getMethod(): string {
    return $_SERVER['REQUEST_METHOD'];
}
