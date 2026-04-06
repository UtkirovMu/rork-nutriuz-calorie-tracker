<?php

require_once __DIR__ . '/../config/config.php';

class MealsController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getAll(array $params = []): void {
        $user_id = get_auth_user_id();
        $date = $_GET['date'] ?? null;

        if ($date) {
            $stmt = $this->db->prepare(
                "SELECT * FROM meals WHERE user_id = ? AND meal_date = ? ORDER BY timestamp ASC"
            );
            $stmt->execute([$user_id, $date]);
        } else {
            $stmt = $this->db->prepare(
                "SELECT * FROM meals WHERE user_id = ? ORDER BY meal_date DESC, timestamp ASC"
            );
            $stmt->execute([$user_id]);
        }

        $rows = $stmt->fetchAll();
        $meals = array_map([$this, 'formatMeal'], $rows);

        success_response($meals);
    }

    public function add(array $params = []): void {
        $user_id = get_auth_user_id();
        $body = get_json_body();

        $meal_id = $body['id'] ?? uniqid('meal_');
        $meal_type = $body['mealType'] ?? 'snack';
        $meal_date = $body['date'] ?? date('Y-m-d');
        $timestamp = $body['timestamp'] ?? (int)(microtime(true) * 1000);
        $food = $body['foodItem'] ?? [];

        if (empty($food['name'])) {
            error_response('Ovqat nomi kiritilmagan');
        }

        $stmt = $this->db->prepare(
            "INSERT INTO meals (user_id, meal_id, meal_type, meal_date, timestamp, 
             food_name, food_name_uz, calories, protein, carbs, fats, 
             portion_size, portion_unit, image_uri)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $user_id,
            $meal_id,
            $meal_type,
            $meal_date,
            $timestamp,
            $food['name'] ?? '',
            $food['nameUz'] ?? null,
            $food['calories'] ?? 0,
            $food['protein'] ?? 0,
            $food['carbs'] ?? 0,
            $food['fats'] ?? 0,
            $food['portionSize'] ?? 0,
            $food['portionUnit'] ?? 'g',
            $food['imageUri'] ?? null,
        ]);

        $stmt = $this->db->prepare("SELECT * FROM meals WHERE user_id = ? AND meal_id = ?");
        $stmt->execute([$user_id, $meal_id]);
        $row = $stmt->fetch();

        success_response($this->formatMeal($row));
    }

    public function remove(array $params = []): void {
        $user_id = get_auth_user_id();
        $meal_id = $params['id'] ?? '';

        if (empty($meal_id)) {
            error_response('Meal ID kiritilmagan');
        }

        $stmt = $this->db->prepare("DELETE FROM meals WHERE user_id = ? AND meal_id = ?");
        $stmt->execute([$user_id, $meal_id]);

        success_response(null, 'Ovqat o\'chirildi');
    }

    private function formatMeal(array $row): array {
        return [
            'id' => $row['meal_id'],
            'mealType' => $row['meal_type'],
            'date' => $row['meal_date'],
            'timestamp' => (int) $row['timestamp'],
            'foodItem' => [
                'id' => $row['meal_id'],
                'name' => $row['food_name'],
                'nameUz' => $row['food_name_uz'],
                'calories' => (float) $row['calories'],
                'protein' => (float) $row['protein'],
                'carbs' => (float) $row['carbs'],
                'fats' => (float) $row['fats'],
                'portionSize' => (float) $row['portion_size'],
                'portionUnit' => $row['portion_unit'],
                'imageUri' => $row['image_uri'],
            ],
        ];
    }
}
