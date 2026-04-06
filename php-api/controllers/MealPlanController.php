<?php

require_once __DIR__ . '/../config/config.php';

class MealPlanController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function get(array $params = []): void {
        $user_id = get_auth_user_id();

        $stmt = $this->db->prepare("SELECT plan_data FROM meal_plans WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $row = $stmt->fetch();

        if (!$row) {
            success_response(null);
            return;
        }

        $plan = json_decode($row['plan_data'], true);
        success_response($plan);
    }

    public function save(array $params = []): void {
        $user_id = get_auth_user_id();
        $body = get_json_body();

        if (empty($body['days'])) {
            error_response('Ovqat rejasi ma\'lumotlari kiritilmagan');
        }

        $plan_json = json_encode($body, JSON_UNESCAPED_UNICODE);
        $generated_at = (int)(microtime(true) * 1000);

        $stmt = $this->db->prepare(
            "INSERT INTO meal_plans (user_id, plan_data, generated_at) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE plan_data = VALUES(plan_data), generated_at = VALUES(generated_at)"
        );
        $stmt->execute([$user_id, $plan_json, $generated_at]);

        success_response($body);
    }
}
