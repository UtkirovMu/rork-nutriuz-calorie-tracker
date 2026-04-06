<?php

require_once __DIR__ . '/../config/config.php';

class AuthController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function sendCode(array $params = []): void {
        $body = get_json_body();
        $method = $body['method'] ?? '';
        $identifier = trim($body['identifier'] ?? '');

        if (!in_array($method, ['email', 'phone'])) {
            error_response('Login usuli noto\'g\'ri');
        }

        if (empty($identifier)) {
            error_response($method === 'email' ? 'Email kiritilmagan' : 'Telefon raqam kiritilmagan');
        }

        if ($method === 'email' && !filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            error_response('Email formati noto\'g\'ri');
        }

        if ($method === 'phone' && !preg_match('/^\+?\d{7,15}$/', preg_replace('/[\s\-()]/', '', $identifier))) {
            error_response('Telefon raqam formati noto\'g\'ri');
        }

        $stmt = $this->db->prepare("DELETE FROM otp_codes WHERE identifier = ? AND expires_at < NOW()");
        $stmt->execute([$identifier]);

        $otp = generate_otp();
        $expires_at = date('Y-m-d H:i:s', time() + OTP_EXPIRY);

        $stmt = $this->db->prepare(
            "INSERT INTO otp_codes (identifier, method, code, expires_at) VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([$identifier, $method, $otp, $expires_at]);

        // TODO: Bu yerda haqiqiy SMS yoki Email yuborish kerak
        // send_sms($identifier, "NutriUZ: Tasdiqlash kodi: $otp");
        // send_email($identifier, "NutriUZ tasdiqlash kodi", "Sizning kodingiz: $otp");

        error_log("[NutriUZ] OTP for $identifier: $otp");

        success_response(
            ['otp_sent' => true, 'message' => 'Tasdiqlash kodi yuborildi', 'otp_debug' => $otp],
            'Tasdiqlash kodi yuborildi'
        );
    }

    public function verifyCode(array $params = []): void {
        $body = get_json_body();
        $method = $body['method'] ?? '';
        $identifier = trim($body['identifier'] ?? '');
        $code = trim($body['code'] ?? '');

        if (empty($identifier) || empty($code) || empty($method)) {
            error_response('Barcha maydonlar to\'ldirilishi kerak');
        }

        $stmt = $this->db->prepare(
            "SELECT id, code FROM otp_codes 
             WHERE identifier = ? AND method = ? AND used = 0 AND expires_at > NOW() 
             ORDER BY created_at DESC LIMIT 1"
        );
        $stmt->execute([$identifier, $method]);
        $otp_row = $stmt->fetch();

        if (!$otp_row || $otp_row['code'] !== $code) {
            error_response('Tasdiqlash kodi noto\'g\'ri yoki muddati o\'tgan', 401);
        }

        $stmt = $this->db->prepare("UPDATE otp_codes SET used = 1 WHERE id = ?");
        $stmt->execute([$otp_row['id']]);

        $stmt = $this->db->prepare("SELECT id FROM users WHERE identifier = ? AND login_method = ?");
        $stmt->execute([$identifier, $method]);
        $user = $stmt->fetch();

        $is_new_user = false;

        if (!$user) {
            $stmt = $this->db->prepare("INSERT INTO users (login_method, identifier) VALUES (?, ?)");
            $stmt->execute([$method, $identifier]);
            $user_id = (int) $this->db->lastInsertId();
            $is_new_user = true;

            $stmt = $this->db->prepare("INSERT INTO profiles (user_id) VALUES (?)");
            $stmt->execute([$user_id]);

            $stmt = $this->db->prepare("INSERT INTO streaks (user_id) VALUES (?)");
            $stmt->execute([$user_id]);

            $stmt = $this->db->prepare("INSERT INTO user_settings (user_id) VALUES (?)");
            $stmt->execute([$user_id]);
        } else {
            $user_id = (int) $user['id'];
        }

        $token = generate_jwt($user_id);

        $profile = null;
        if (!$is_new_user) {
            $stmt = $this->db->prepare("SELECT * FROM profiles WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $profile_row = $stmt->fetch();
            if ($profile_row && $profile_row['onboarding_complete']) {
                $profile = $this->formatProfile($profile_row);
            }
        }

        success_response([
            'token' => $token,
            'user_id' => $user_id,
            'is_new_user' => $is_new_user,
            'profile' => $profile,
        ]);
    }

    public function logout(array $params = []): void {
        success_response(null, 'Chiqish muvaffaqiyatli');
    }

    public function check(array $params = []): void {
        $user_id = get_auth_user_id();
        success_response(['valid' => true, 'user_id' => $user_id]);
    }

    private function formatProfile(array $row): array {
        return [
            'name' => $row['name'] ?? '',
            'gender' => $row['gender'] ?? 'male',
            'age' => (int) ($row['age'] ?? 25),
            'height' => (int) ($row['height'] ?? 170),
            'weight' => (float) ($row['weight'] ?? 70),
            'targetWeight' => (float) ($row['target_weight'] ?? 70),
            'goal' => $row['goal'] ?? 'maintain',
            'activityLevel' => $row['activity_level'] ?? 'moderate',
            'onboardingComplete' => (bool) ($row['onboarding_complete'] ?? false),
            'email' => $row['email'] ?? null,
            'phone' => $row['phone'] ?? null,
        ];
    }
}
