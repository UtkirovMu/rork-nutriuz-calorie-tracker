<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

cors();

$route = getRoute();
$method = getMethod();

// ============ AUTH ============

if ($route === '/auth/send-code' && $method === 'POST') {
    $input = getInput();
    $loginMethod = $input['method'] ?? '';
    $identifier = trim($input['identifier'] ?? '');

    if (!in_array($loginMethod, ['email', 'phone'])) {
        error('Login usuli noto\'g\'ri');
    }
    if (empty($identifier)) {
        error('Identifikator bo\'sh');
    }

    $db = getDB();

    // Eski OTP larni o'chirish
    $db->prepare("DELETE FROM otp_codes WHERE identifier = ? AND method = ?")->execute([$identifier, $loginMethod]);

    $code = generateOTP();
    $expiresAt = date('Y-m-d H:i:s', time() + OTP_EXPIRY);

    $stmt = $db->prepare("INSERT INTO otp_codes (identifier, code, method, expires_at) VALUES (?, ?, ?, ?)");
    $stmt->execute([$identifier, $code, $loginMethod, $expiresAt]);

    // TODO: Haqiqiy SMS/Email yuborish
    // Hozircha faqat logga yozamiz
    error_log("OTP for $identifier: $code");

    success(['message' => 'Kod yuborildi'], 'Kod yuborildi');
}

elseif ($route === '/auth/verify-code' && $method === 'POST') {
    $input = getInput();
    $loginMethod = $input['method'] ?? '';
    $identifier = trim($input['identifier'] ?? '');
    $code = trim($input['code'] ?? '');

    if (empty($identifier) || empty($code)) {
        error('Ma\'lumotlar to\'liq emas');
    }

    $db = getDB();

    // OTP tekshirish
    $stmt = $db->prepare(
        "SELECT id FROM otp_codes WHERE identifier = ? AND code = ? AND method = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1"
    );
    $stmt->execute([$identifier, $code, $loginMethod]);
    $otp = $stmt->fetch();

    if (!$otp) {
        error('Kod noto\'g\'ri yoki muddati tugagan', 401);
    }

    // OTP ni ishlatilgan deb belgilash
    $db->prepare("UPDATE otp_codes SET used = 1 WHERE id = ?")->execute([$otp['id']]);

    // Foydalanuvchini topish yoki yaratish
    $stmt = $db->prepare("SELECT id FROM users WHERE identifier = ? AND login_method = ?");
    $stmt->execute([$identifier, $loginMethod]);
    $user = $stmt->fetch();

    $isNewUser = false;

    if (!$user) {
        $isNewUser = true;
        $stmt = $db->prepare("INSERT INTO users (login_method, identifier) VALUES (?, ?)");
        $stmt->execute([$loginMethod, $identifier]);
        $userId = (int)$db->lastInsertId();

        // Default profil yaratish
        $stmt = $db->prepare("INSERT INTO profiles (user_id) VALUES (?)");
        $stmt->execute([$userId]);

        // Default streak yaratish
        $stmt = $db->prepare("INSERT INTO streaks (user_id) VALUES (?)");
        $stmt->execute([$userId]);

        // Default sozlamalar
        $stmt = $db->prepare("INSERT INTO settings (user_id) VALUES (?)");
        $stmt->execute([$userId]);
    } else {
        $userId = (int)$user['id'];
    }

    $token = createJWT($userId);

    // Profilni olish
    $stmt = $db->prepare("SELECT * FROM profiles WHERE user_id = ?");
    $stmt->execute([$userId]);
    $profile = $stmt->fetch();

    $profileData = $profile ? [
        'name' => $profile['name'],
        'gender' => $profile['gender'],
        'age' => (int)$profile['age'],
        'height' => (int)$profile['height'],
        'weight' => (float)$profile['weight'],
        'targetWeight' => (float)$profile['target_weight'],
        'goal' => $profile['goal'],
        'activityLevel' => $profile['activity_level'],
        'onboardingComplete' => (bool)$profile['onboarding_complete'],
        'email' => $profile['email'],
        'phone' => $profile['phone'],
    ] : null;

    success([
        'token' => $token,
        'isNewUser' => $isNewUser,
        'profile' => $profileData,
    ]);
}

elseif ($route === '/auth/logout' && $method === 'POST') {
    // Token ni bekor qilish (oddiy holda hech narsa qilmaymiz, client tokenni o'chiradi)
    success(null, 'Chiqildi');
}

elseif ($route === '/auth/check' && $method === 'GET') {
    $userId = getAuthUserId();
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM profiles WHERE user_id = ?");
    $stmt->execute([$userId]);
    $profile = $stmt->fetch();

    success([
        'profile' => $profile ? formatProfile($profile) : null,
    ]);
}

// ============ PROFILE ============

elseif ($route === '/profile' && $method === 'GET') {
    $userId = getAuthUserId();
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM profiles WHERE user_id = ?");
    $stmt->execute([$userId]);
    $profile = $stmt->fetch();

    if (!$profile) {
        error('Profil topilmadi', 404);
    }

    success(['profile' => formatProfile($profile)]);
}

elseif ($route === '/profile' && $method === 'PUT') {
    $userId = getAuthUserId();
    $input = getInput();
    $db = getDB();

    $fields = [];
    $values = [];

    $mapping = [
        'name' => 'name',
        'gender' => 'gender',
        'age' => 'age',
        'height' => 'height',
        'weight' => 'weight',
        'targetWeight' => 'target_weight',
        'goal' => 'goal',
        'activityLevel' => 'activity_level',
        'onboardingComplete' => 'onboarding_complete',
        'email' => 'email',
        'phone' => 'phone',
    ];

    foreach ($mapping as $inputKey => $dbKey) {
        if (array_key_exists($inputKey, $input)) {
            $fields[] = "$dbKey = ?";
            $val = $input[$inputKey];
            if ($inputKey === 'onboardingComplete') {
                $val = $val ? 1 : 0;
            }
            $values[] = $val;
        }
    }

    if (!empty($fields)) {
        $values[] = $userId;
        $sql = "UPDATE profiles SET " . implode(', ', $fields) . " WHERE user_id = ?";
        $db->prepare($sql)->execute($values);
    }

    $stmt = $db->prepare("SELECT * FROM profiles WHERE user_id = ?");
    $stmt->execute([$userId]);
    $profile = $stmt->fetch();

    success(['profile' => formatProfile($profile)]);
}

// ============ MEALS ============

elseif ($route === '/meals' && $method === 'GET') {
    $userId = getAuthUserId();
    $db = getDB();

    $date = $_GET['date'] ?? null;

    if ($date) {
        $stmt = $db->prepare("SELECT * FROM meals WHERE user_id = ? AND meal_date = ? ORDER BY timestamp ASC");
        $stmt->execute([$userId, $date]);
    } else {
        $stmt = $db->prepare("SELECT * FROM meals WHERE user_id = ? ORDER BY timestamp ASC");
        $stmt->execute([$userId]);
    }

    $rows = $stmt->fetchAll();
    $meals = array_map('formatMeal', $rows);

    success(['meals' => $meals]);
}

elseif ($route === '/meals' && $method === 'POST') {
    $userId = getAuthUserId();
    $input = getInput();
    $db = getDB();

    $id = $input['id'] ?? uniqid();
    $food = $input['foodItem'] ?? [];
    $mealType = $input['mealType'] ?? 'snack';
    $mealDate = $input['date'] ?? date('Y-m-d');
    $timestamp = $input['timestamp'] ?? (int)(microtime(true) * 1000);

    $stmt = $db->prepare(
        "INSERT INTO meals (id, user_id, food_name, food_name_uz, calories, protein, carbs, fats, portion_size, portion_unit, image_uri, meal_type, meal_date, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE food_name=VALUES(food_name), calories=VALUES(calories), protein=VALUES(protein), carbs=VALUES(carbs), fats=VALUES(fats)"
    );
    $stmt->execute([
        $id, $userId,
        $food['name'] ?? '', $food['nameUz'] ?? null,
        $food['calories'] ?? 0, $food['protein'] ?? 0, $food['carbs'] ?? 0, $food['fats'] ?? 0,
        $food['portionSize'] ?? 0, $food['portionUnit'] ?? 'g',
        $food['imageUri'] ?? null,
        $mealType, $mealDate, $timestamp,
    ]);

    success(['meal' => $input], 'Ovqat qo\'shildi');
}

elseif (preg_match('#^/meals/(.+)$#', $route, $m) && $method === 'DELETE') {
    $userId = getAuthUserId();
    $mealId = $m[1];
    $db = getDB();

    $db->prepare("DELETE FROM meals WHERE id = ? AND user_id = ?")->execute([$mealId, $userId]);
    success(null, 'Ovqat o\'chirildi');
}

// ============ WEIGHT ============

elseif ($route === '/weight' && $method === 'GET') {
    $userId = getAuthUserId();
    $db = getDB();

    $stmt = $db->prepare("SELECT weight_date, weight FROM weight_history WHERE user_id = ? ORDER BY weight_date ASC");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    $entries = array_map(function ($r) {
        return ['date' => $r['weight_date'], 'weight' => (float)$r['weight']];
    }, $rows);

    success(['entries' => $entries]);
}

elseif ($route === '/weight' && $method === 'POST') {
    $userId = getAuthUserId();
    $input = getInput();
    $db = getDB();

    $date = $input['date'] ?? date('Y-m-d');
    $weight = (float)($input['weight'] ?? 0);

    if ($weight < 20 || $weight > 300) {
        error('Vazn noto\'g\'ri');
    }

    $stmt = $db->prepare(
        "INSERT INTO weight_history (user_id, weight_date, weight) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE weight = VALUES(weight)"
    );
    $stmt->execute([$userId, $date, $weight]);

    success(['entry' => ['date' => $date, 'weight' => $weight]]);
}

// ============ ACHIEVEMENTS ============

elseif ($route === '/achievements' && $method === 'GET') {
    $userId = getAuthUserId();
    $db = getDB();

    $stmt = $db->prepare("SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = ?");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    $achievements = array_map(function ($r) {
        return ['id' => $r['achievement_id'], 'unlockedAt' => (int)$r['unlocked_at']];
    }, $rows);

    success(['achievements' => $achievements]);
}

elseif ($route === '/achievements' && $method === 'POST') {
    $userId = getAuthUserId();
    $input = getInput();
    $db = getDB();

    $achievementId = $input['id'] ?? '';
    if (empty($achievementId)) {
        error('Achievement ID bo\'sh');
    }

    $unlockedAt = (int)(microtime(true) * 1000);

    $stmt = $db->prepare(
        "INSERT IGNORE INTO achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)"
    );
    $stmt->execute([$userId, $achievementId, $unlockedAt]);

    success(['achievement' => ['id' => $achievementId, 'unlockedAt' => $unlockedAt]]);
}

// ============ PHOTOS ============

elseif ($route === '/photos' && $method === 'GET') {
    $userId = getAuthUserId();
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM progress_photos WHERE user_id = ? ORDER BY timestamp DESC");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    $photos = array_map(function ($r) {
        return [
            'id' => $r['id'],
            'uri' => $r['uri'],
            'date' => $r['photo_date'],
            'timestamp' => (int)$r['timestamp'],
            'note' => $r['note'],
        ];
    }, $rows);

    success(['photos' => $photos]);
}

elseif ($route === '/photos' && $method === 'POST') {
    $userId = getAuthUserId();
    $input = getInput();
    $db = getDB();

    $id = $input['id'] ?? uniqid();
    $uri = $input['uri'] ?? '';
    $date = $input['date'] ?? date('Y-m-d');
    $timestamp = $input['timestamp'] ?? (int)(microtime(true) * 1000);
    $note = $input['note'] ?? null;

    $stmt = $db->prepare(
        "INSERT INTO progress_photos (id, user_id, uri, photo_date, timestamp, note) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE uri=VALUES(uri), note=VALUES(note)"
    );
    $stmt->execute([$id, $userId, $uri, $date, $timestamp, $note]);

    success(['photo' => $input]);
}

elseif (preg_match('#^/photos/(.+)$#', $route, $m) && $method === 'DELETE') {
    $userId = getAuthUserId();
    $photoId = $m[1];
    $db = getDB();

    $db->prepare("DELETE FROM progress_photos WHERE id = ? AND user_id = ?")->execute([$photoId, $userId]);
    success(null, 'Rasm o\'chirildi');
}

// ============ STREAK ============

elseif ($route === '/streak' && $method === 'GET') {
    $userId = getAuthUserId();
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM streaks WHERE user_id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    $streak = $row ? [
        'currentStreak' => (int)$row['current_streak'],
        'lastLogDate' => $row['last_log_date'] ?? '',
        'longestStreak' => (int)$row['longest_streak'],
    ] : ['currentStreak' => 0, 'lastLogDate' => '', 'longestStreak' => 0];

    success(['streak' => $streak]);
}

elseif ($route === '/streak' && $method === 'PUT') {
    $userId = getAuthUserId();
    $input = getInput();
    $db = getDB();

    $currentStreak = (int)($input['currentStreak'] ?? 0);
    $lastLogDate = $input['lastLogDate'] ?? null;
    $longestStreak = (int)($input['longestStreak'] ?? 0);

    $stmt = $db->prepare(
        "INSERT INTO streaks (user_id, current_streak, last_log_date, longest_streak) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE current_streak=VALUES(current_streak), last_log_date=VALUES(last_log_date), longest_streak=VALUES(longest_streak)"
    );
    $stmt->execute([$userId, $currentStreak, $lastLogDate ?: null, $longestStreak]);

    success(['streak' => [
        'currentStreak' => $currentStreak,
        'lastLogDate' => $lastLogDate ?? '',
        'longestStreak' => $longestStreak,
    ]]);
}

// ============ MEAL PLAN ============

elseif ($route === '/meal-plan' && $method === 'GET') {
    $userId = getAuthUserId();
    $db = getDB();

    $stmt = $db->prepare("SELECT plan_data FROM meal_plans WHERE user_id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    $plan = $row ? json_decode($row['plan_data'], true) : null;
    success(['mealPlan' => $plan]);
}

elseif ($route === '/meal-plan' && $method === 'POST') {
    $userId = getAuthUserId();
    $input = getInput();
    $db = getDB();

    $planData = json_encode($input['plan'] ?? $input, JSON_UNESCAPED_UNICODE);

    $stmt = $db->prepare(
        "INSERT INTO meal_plans (user_id, plan_data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE plan_data=VALUES(plan_data), generated_at=NOW()"
    );
    $stmt->execute([$userId, $planData]);

    success(['mealPlan' => json_decode($planData, true)]);
}

// ============ SETTINGS ============

elseif ($route === '/settings' && $method === 'GET') {
    $userId = getAuthUserId();
    $db = getDB();

    $stmt = $db->prepare("SELECT theme, language FROM settings WHERE user_id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    $settings = $row ? [
        'theme' => $row['theme'],
        'language' => $row['language'],
    ] : ['theme' => 'system', 'language' => 'uz'];

    success(['settings' => $settings]);
}

elseif ($route === '/settings' && $method === 'PUT') {
    $userId = getAuthUserId();
    $input = getInput();
    $db = getDB();

    $fields = [];
    $values = [];

    if (isset($input['theme'])) {
        $fields[] = "theme = ?";
        $values[] = $input['theme'];
    }
    if (isset($input['language'])) {
        $fields[] = "language = ?";
        $values[] = $input['language'];
    }

    if (!empty($fields)) {
        $values[] = $userId;
        $sql = "UPDATE settings SET " . implode(', ', $fields) . " WHERE user_id = ?";
        $db->prepare($sql)->execute($values);
    }

    $stmt = $db->prepare("SELECT theme, language FROM settings WHERE user_id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    success(['settings' => [
        'theme' => $row['theme'] ?? 'system',
        'language' => $row['language'] ?? 'uz',
    ]]);
}

// ============ 404 ============

else {
    error('Endpoint topilmadi: ' . $method . ' ' . $route, 404);
}

// ============ HELPERS ============

function formatProfile($row): array {
    return [
        'name' => $row['name'] ?? '',
        'gender' => $row['gender'] ?? 'male',
        'age' => (int)($row['age'] ?? 25),
        'height' => (int)($row['height'] ?? 170),
        'weight' => (float)($row['weight'] ?? 70),
        'targetWeight' => (float)($row['target_weight'] ?? 70),
        'goal' => $row['goal'] ?? 'maintain',
        'activityLevel' => $row['activity_level'] ?? 'moderate',
        'onboardingComplete' => (bool)($row['onboarding_complete'] ?? false),
        'email' => $row['email'] ?? null,
        'phone' => $row['phone'] ?? null,
    ];
}

function formatMeal($row): array {
    return [
        'id' => $row['id'],
        'foodItem' => [
            'id' => $row['id'],
            'name' => $row['food_name'],
            'nameUz' => $row['food_name_uz'],
            'calories' => (float)$row['calories'],
            'protein' => (float)$row['protein'],
            'carbs' => (float)$row['carbs'],
            'fats' => (float)$row['fats'],
            'portionSize' => (float)$row['portion_size'],
            'portionUnit' => $row['portion_unit'],
            'imageUri' => $row['image_uri'],
        ],
        'mealType' => $row['meal_type'],
        'date' => $row['meal_date'],
        'timestamp' => (int)$row['timestamp'],
    ];
}
