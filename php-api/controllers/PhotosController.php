<?php

require_once __DIR__ . '/../config/config.php';

class PhotosController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getAll(array $params = []): void {
        $user_id = get_auth_user_id();

        $stmt = $this->db->prepare(
            "SELECT * FROM progress_photos WHERE user_id = ? ORDER BY timestamp DESC"
        );
        $stmt->execute([$user_id]);
        $rows = $stmt->fetchAll();

        $photos = array_map(function ($row) {
            return [
                'id' => $row['photo_id'],
                'uri' => $row['uri'],
                'date' => $row['photo_date'],
                'timestamp' => (int) $row['timestamp'],
                'note' => $row['note'],
            ];
        }, $rows);

        success_response($photos);
    }

    public function add(array $params = []): void {
        $user_id = get_auth_user_id();
        $body = get_json_body();

        $photo_id = $body['id'] ?? uniqid('photo_');
        $uri = $body['uri'] ?? '';
        $photo_date = $body['date'] ?? date('Y-m-d');
        $timestamp = $body['timestamp'] ?? (int)(microtime(true) * 1000);
        $note = $body['note'] ?? null;

        if (empty($uri)) {
            error_response('Rasm URI kiritilmagan');
        }

        $stmt = $this->db->prepare(
            "INSERT INTO progress_photos (user_id, photo_id, uri, photo_date, timestamp, note)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$user_id, $photo_id, $uri, $photo_date, $timestamp, $note]);

        success_response([
            'id' => $photo_id,
            'uri' => $uri,
            'date' => $photo_date,
            'timestamp' => $timestamp,
            'note' => $note,
        ]);
    }

    public function remove(array $params = []): void {
        $user_id = get_auth_user_id();
        $photo_id = $params['id'] ?? '';

        if (empty($photo_id)) {
            error_response('Photo ID kiritilmagan');
        }

        $stmt = $this->db->prepare("DELETE FROM progress_photos WHERE user_id = ? AND photo_id = ?");
        $stmt->execute([$user_id, $photo_id]);

        success_response(null, 'Rasm o\'chirildi');
    }
}
