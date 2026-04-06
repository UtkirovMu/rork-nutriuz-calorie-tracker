<?php

require_once __DIR__ . '/../config/config.php';

class SettingsController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function get(array $params = []): void {
        $user_id = get_auth_user_id();

        $stmt = $this->db->prepare("SELECT theme, language FROM user_settings WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $row = $stmt->fetch();

        if (!$row) {
            $stmt = $this->db->prepare("INSERT INTO user_settings (user_id) VALUES (?)");
            $stmt->execute([$user_id]);
            success_response(['theme' => 'system', 'language' => 'uz']);
            return;
        }

        success_response([
            'theme' => $row['theme'] ?? 'system',
            'language' => $row['language'] ?? 'uz',
        ]);
    }

    public function update(array $params = []): void {
        $user_id = get_auth_user_id();
        $body = get_json_body();

        $sets = [];
        $values = [];

        if (isset($body['theme'])) {
            $sets[] = "theme = ?";
            $values[] = $body['theme'];
        }
        if (isset($body['language'])) {
            $sets[] = "language = ?";
            $values[] = $body['language'];
        }

        if (empty($sets)) {
            error_response('Yangilanadigan ma\'lumot yo\'q');
        }

        $values[] = $user_id;
        $sql = "UPDATE user_settings SET " . implode(', ', $sets) . " WHERE user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($values);

        $stmt = $this->db->prepare("SELECT theme, language FROM user_settings WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $row = $stmt->fetch();

        success_response([
            'theme' => $row['theme'] ?? 'system',
            'language' => $row['language'] ?? 'uz',
        ]);
    }
}
