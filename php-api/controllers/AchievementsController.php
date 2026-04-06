<?php

require_once __DIR__ . '/../config/config.php';

class AchievementsController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getAll(array $params = []): void {
        $user_id = get_auth_user_id();

        $stmt = $this->db->prepare(
            "SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = ? ORDER BY unlocked_at ASC"
        );
        $stmt->execute([$user_id]);
        $rows = $stmt->fetchAll();

        $achievements = array_map(function ($row) {
            return [
                'id' => $row['achievement_id'],
                'unlockedAt' => (int) $row['unlocked_at'],
            ];
        }, $rows);

        success_response($achievements);
    }

    public function unlock(array $params = []): void {
        $user_id = get_auth_user_id();
        $body = get_json_body();

        $achievement_id = $body['id'] ?? '';
        $unlocked_at = $body['unlockedAt'] ?? (int)(microtime(true) * 1000);

        if (empty($achievement_id)) {
            error_response('Achievement ID kiritilmagan');
        }

        $stmt = $this->db->prepare(
            "SELECT id FROM achievements WHERE user_id = ? AND achievement_id = ?"
        );
        $stmt->execute([$user_id, $achievement_id]);

        if ($stmt->fetch()) {
            success_response(['id' => $achievement_id, 'unlockedAt' => $unlocked_at], 'Allaqachon ochilgan');
            return;
        }

        $stmt = $this->db->prepare(
            "INSERT INTO achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)"
        );
        $stmt->execute([$user_id, $achievement_id, $unlocked_at]);

        success_response(['id' => $achievement_id, 'unlockedAt' => $unlocked_at]);
    }
}
