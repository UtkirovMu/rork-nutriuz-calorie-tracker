<?php

require_once __DIR__ . '/../config/config.php';

class StreakController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function get(array $params = []): void {
        $user_id = get_auth_user_id();

        $stmt = $this->db->prepare("SELECT * FROM streaks WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $row = $stmt->fetch();

        if (!$row) {
            $stmt = $this->db->prepare("INSERT INTO streaks (user_id) VALUES (?)");
            $stmt->execute([$user_id]);
            success_response([
                'currentStreak' => 0,
                'lastLogDate' => '',
                'longestStreak' => 0,
            ]);
            return;
        }

        success_response([
            'currentStreak' => (int) $row['current_streak'],
            'lastLogDate' => $row['last_log_date'] ?? '',
            'longestStreak' => (int) $row['longest_streak'],
        ]);
    }

    public function update(array $params = []): void {
        $user_id = get_auth_user_id();
        $body = get_json_body();

        $current_streak = (int) ($body['currentStreak'] ?? 0);
        $last_log_date = $body['lastLogDate'] ?? null;
        $longest_streak = (int) ($body['longestStreak'] ?? 0);

        $stmt = $this->db->prepare(
            "INSERT INTO streaks (user_id, current_streak, last_log_date, longest_streak) 
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             current_streak = VALUES(current_streak),
             last_log_date = VALUES(last_log_date),
             longest_streak = VALUES(longest_streak)"
        );
        $stmt->execute([$user_id, $current_streak, $last_log_date, $longest_streak]);

        success_response([
            'currentStreak' => $current_streak,
            'lastLogDate' => $last_log_date ?? '',
            'longestStreak' => $longest_streak,
        ]);
    }
}
