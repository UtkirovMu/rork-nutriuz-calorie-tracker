<?php

require_once __DIR__ . '/../config/config.php';

class WeightController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getAll(array $params = []): void {
        $user_id = get_auth_user_id();

        $stmt = $this->db->prepare(
            "SELECT weight_date, weight FROM weight_history WHERE user_id = ? ORDER BY weight_date ASC"
        );
        $stmt->execute([$user_id]);
        $rows = $stmt->fetchAll();

        $entries = array_map(function ($row) {
            return [
                'date' => $row['weight_date'],
                'weight' => (float) $row['weight'],
            ];
        }, $rows);

        success_response($entries);
    }

    public function add(array $params = []): void {
        $user_id = get_auth_user_id();
        $body = get_json_body();

        $date = $body['date'] ?? date('Y-m-d');
        $weight = $body['weight'] ?? null;

        if ($weight === null || $weight < 20 || $weight > 300) {
            error_response('Vazn noto\'g\'ri kiritilgan (20-300 kg)');
        }

        $stmt = $this->db->prepare(
            "INSERT INTO weight_history (user_id, weight_date, weight) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE weight = VALUES(weight)"
        );
        $stmt->execute([$user_id, $date, $weight]);

        success_response(['date' => $date, 'weight' => (float) $weight]);
    }
}
