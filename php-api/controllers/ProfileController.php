<?php

require_once __DIR__ . '/../config/config.php';

class ProfileController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function get(array $params = []): void {
        $user_id = get_auth_user_id();

        $stmt = $this->db->prepare("SELECT * FROM profiles WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $row = $stmt->fetch();

        if (!$row) {
            $stmt = $this->db->prepare("INSERT INTO profiles (user_id) VALUES (?)");
            $stmt->execute([$user_id]);
            $stmt = $this->db->prepare("SELECT * FROM profiles WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $row = $stmt->fetch();
        }

        success_response($this->formatProfile($row));
    }

    public function update(array $params = []): void {
        $user_id = get_auth_user_id();
        $body = get_json_body();

        $allowed = [
            'name', 'gender', 'age', 'height', 'weight',
            'target_weight', 'goal', 'activity_level',
            'onboarding_complete', 'email', 'phone',
        ];

        $field_map = [
            'targetWeight' => 'target_weight',
            'activityLevel' => 'activity_level',
            'onboardingComplete' => 'onboarding_complete',
        ];

        $sets = [];
        $values = [];

        foreach ($body as $key => $value) {
            $db_key = $field_map[$key] ?? $key;
            if (in_array($db_key, $allowed)) {
                if ($db_key === 'onboarding_complete') {
                    $value = $value ? 1 : 0;
                }
                $sets[] = "$db_key = ?";
                $values[] = $value;
            }
        }

        if (empty($sets)) {
            error_response('Yangilanadigan ma\'lumot yo\'q');
        }

        $values[] = $user_id;
        $sql = "UPDATE profiles SET " . implode(', ', $sets) . " WHERE user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($values);

        $stmt = $this->db->prepare("SELECT * FROM profiles WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $row = $stmt->fetch();

        success_response($this->formatProfile($row));
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
