<?php
require_once __DIR__ . '/config.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/');
$uri = preg_replace('#^/api#', '', $uri);
$method = $_SERVER['REQUEST_METHOD'];

// ============================================================
// ROUTING
// ============================================================

// Auth routes
if ($uri === '/auth/send-otp' && $method === 'POST') {
    handleSendOTP();
}
if ($uri === '/auth/verify-otp' && $method === 'POST') {
    handleVerifyOTP();
}
if ($uri === '/auth/logout' && $method === 'POST') {
    handleLogout();
}
if ($uri === '/auth/check' && $method === 'GET') {
    handleAuthCheck();
}

// Profile routes
if ($uri === '/profile' && $method === 'GET') {
    handleGetProfile();
}
if ($uri === '/profile' && $method === 'PUT') {
    handleUpdateProfile();
}

// Meals routes
if ($uri === '/meals' && $method === 'GET') {
    handleGetMeals();
}
if ($uri === '/meals' && $method === 'POST') {
    handleAddMeal();
}
if (preg_match('#^/meals/(.+)$#', $uri, $m) && $method === 'DELETE') {
    handleDeleteMeal($m[1]);
}

// Weight routes
if ($uri === '/weight' && $method === 'GET') {
    handleGetWeight();
}
if ($uri === '/weight' && $method === 'POST') {
    handleAddWeight();
}

// Achievements routes
if ($uri === '/achievements' && $method === 'GET') {
    handleGetAchievements();
}
if ($uri === '/achievements' && $method === 'POST') {
    handleUnlockAchievement();
}

// Progress photos routes
if ($uri === '/photos' && $method === 'GET') {
    handleGetPhotos();
}
if ($uri === '/photos' && $method === 'POST') {
    handleAddPhoto();
}
if (preg_match('#^/photos/(.+)$#', $uri, $m) && $method === 'DELETE') {
    handleDeletePhoto($m[1]);
}

// Streak routes
if ($uri === '/streak' && $method === 'GET') {
    handleGetStreak();
}
if ($uri === '/streak' && $method === 'PUT') {
    handleUpdateStreak();
}

// Meal plan routes
if ($uri === '/meal-plan' && $method === 'GET') {
    handleGetMealPlan();
}
if ($uri === '/meal-plan' && $method === 'POST') {
    handleSaveMealPlan();
}

// Settings routes
if ($uri === '/settings' && $method === 'GET') {
    handleGetSettings();
}
if ($uri === '/settings' && $method === 'PUT') {
    handleUpdateSettings();
}

// Data management
if ($uri === '/data/clear-records' && $method === 'POST') {
    handleClearRecords();
}
if ($uri === '/data/reset-all' && $method === 'POST') {
    handleResetAll();
}

// 404
errorResponse('Endpoint topilmadi', 404);


// ============================================================
// AUTH HANDLERS
// ============================================================

function handleSendOTP(): void {
    $input = getJsonInput();
    $method = $input['method'] ?? '';
    $identifier = trim($input['identifier'] ?? '');

    if (!in_array($method, ['phone', 'email'])) {
        errorResponse('Noto\'g\'ri login usuli');
    }
    if (empty($identifier)) {
        errorResponse('Telefon raqam yoki email kiritilmagan');
    }

    $db = Database::get();
    $otp = generateOTP();
    $expiresAt = date('Y-m-d H:i:s', time() + OTP_EXPIRY_MINUTES * 60);

    if ($method === 'phone') {
        $stmt = $db->prepare('SELECT id FROM users WHERE phone = ?');
        $stmt->execute([$identifier]);
        $user = $stmt->fetch();

        if ($user) {
            $db->prepare('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?')
               ->execute([$otp, $expiresAt, $user['id']]);
        } else {
            $db->prepare('INSERT INTO users (phone, login_method, otp_code, otp_expires_at) VALUES (?, ?, ?, ?)')
               ->execute([$identifier, 'phone', $otp, $expiresAt]);
        }

        $message = "NutriUZ tasdiqlash kodi: $otp";
        sendSMS($identifier, $message);
    } else {
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$identifier]);
        $user = $stmt->fetch();

        if ($user) {
            $db->prepare('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?')
               ->execute([$otp, $expiresAt, $user['id']]);
        } else {
            $db->prepare('INSERT INTO users (email, login_method, otp_code, otp_expires_at) VALUES (?, ?, ?, ?)')
               ->execute([$identifier, 'email', $otp, $expiresAt]);
        }

        $subject = 'NutriUZ - Tasdiqlash kodi';
        $body = "<h2>NutriUZ</h2><p>Sizning tasdiqlash kodingiz: <strong>$otp</strong></p><p>Kod $otp_expiry_minutes daqiqa ichida amal qiladi.</p>";
        sendEmail($identifier, $subject, $body);
    }

    jsonResponse([
        'success' => true,
        'message' => 'Tasdiqlash kodi yuborildi',
        'otp_debug' => $otp, // PRODUCTION-da olib tashlang!
    ]);
}

function handleVerifyOTP(): void {
    $input = getJsonInput();
    $method = $input['method'] ?? '';
    $identifier = trim($input['identifier'] ?? '');
    $otp = trim($input['otp'] ?? '');

    if (empty($identifier) || empty($otp)) {
        errorResponse('Telefon/email va kod kiritilmagan');
    }

    $db = Database::get();

    if ($method === 'phone') {
        $stmt = $db->prepare('SELECT * FROM users WHERE phone = ? AND otp_code = ? AND otp_expires_at > NOW()');
        $stmt->execute([$identifier, $otp]);
    } else {
        $stmt = $db->prepare('SELECT * FROM users WHERE email = ? AND otp_code = ? AND otp_expires_at > NOW()');
        $stmt->execute([$identifier, $otp]);
    }

    $user = $stmt->fetch();
    if (!$user) {
        errorResponse('Noto\'g\'ri kod yoki muddati o\'tgan', 401);
    }

    $token = generateToken();
    $tokenExpires = date('Y-m-d H:i:s', time() + TOKEN_EXPIRY_DAYS * 86400);

    $db->prepare('UPDATE users SET token = ?, token_expires_at = ?, otp_code = NULL, otp_expires_at = NULL WHERE id = ?')
       ->execute([$token, $tokenExpires, $user['id']]);

    // Check if profile exists
    $stmt = $db->prepare('SELECT onboarding_complete FROM profiles WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $profile = $stmt->fetch();

    // Create default profile if not exists
    if (!$profile) {
        $db->prepare('INSERT INTO profiles (user_id) VALUES (?)')->execute([$user['id']]);
        $db->prepare('INSERT INTO streaks (user_id) VALUES (?)')->execute([$user['id']]);
        $db->prepare('INSERT INTO settings (user_id) VALUES (?)')->execute([$user['id']]);
    }

    // Create streak if not exists
    $stmt = $db->prepare('SELECT id FROM streaks WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    if (!$stmt->fetch()) {
        $db->prepare('INSERT INTO streaks (user_id) VALUES (?)')->execute([$user['id']]);
    }

    // Create settings if not exists
    $stmt = $db->prepare('SELECT id FROM settings WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    if (!$stmt->fetch()) {
        $db->prepare('INSERT INTO settings (user_id) VALUES (?)')->execute([$user['id']]);
    }

    jsonResponse([
        'success' => true,
        'token' => $token,
        'user_id' => $user['id'],
        'is_new_user' => !$profile || !$profile['onboarding_complete'],
        'onboarding_complete' => (bool)($profile['onboarding_complete'] ?? false),
    ]);
}

function handleLogout(): void {
    $user = requireAuth();
    $db = Database::get();
    $db->prepare('UPDATE users SET token = NULL, token_expires_at = NULL WHERE id = ?')
       ->execute([$user['id']]);
    jsonResponse(['success' => true]);
}

function handleAuthCheck(): void {
    $user = getAuthUser();
    if (!$user) {
        jsonResponse(['success' => true, 'authenticated' => false]);
    }
    
    $db = Database::get();
    $stmt = $db->prepare('SELECT onboarding_complete FROM profiles WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $profile = $stmt->fetch();

    jsonResponse([
        'success' => true,
        'authenticated' => true,
        'user_id' => $user['id'],
        'identifier' => $user['phone'] ?? $user['email'],
        'login_method' => $user['login_method'],
        'onboarding_complete' => (bool)($profile['onboarding_complete'] ?? false),
    ]);
}

// ============================================================
// PROFILE HANDLERS
// ============================================================

function handleGetProfile(): void {
    $user = requireAuth();
    $db = Database::get();
    $stmt = $db->prepare('SELECT * FROM profiles WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $profile = $stmt->fetch();

    if (!$profile) {
        errorResponse('Profil topilmadi', 404);
    }

    jsonResponse([
        'success' => true,
        'profile' => [
            'name' => $profile['name'],
            'gender' => $profile['gender'],
            'age' => (int)$profile['age'],
            'height' => (int)$profile['height'],
            'weight' => (int)$profile['weight'],
            'targetWeight' => (int)$profile['target_weight'],
            'goal' => $profile['goal'],
            'activityLevel' => $profile['activity_level'],
            'onboardingComplete' => (bool)$profile['onboarding_complete'],
            'email' => $user['email'],
            'phone' => $user['phone'],
        ],
    ]);
}

function handleUpdateProfile(): void {
    $user = requireAuth();
    $input = getJsonInput();
    $db = Database::get();

    $fields = [];
    $values = [];

    $map = [
        'name' => 'name',
        'gender' => 'gender',
        'age' => 'age',
        'height' => 'height',
        'weight' => 'weight',
        'targetWeight' => 'target_weight',
        'goal' => 'goal',
        'activityLevel' => 'activity_level',
        'onboardingComplete' => 'onboarding_complete',
    ];

    foreach ($map as $jsonKey => $dbKey) {
        if (array_key_exists($jsonKey, $input)) {
            $fields[] = "$dbKey = ?";
            $val = $input[$jsonKey];
            if ($jsonKey === 'onboardingComplete') {
                $val = $val ? 1 : 0;
            }
            $values[] = $val;
        }
    }

    if (empty($fields)) {
        errorResponse('Yangilanadigan ma\'lumot yo\'q');
    }

    $values[] = $user['id'];
    $sql = 'UPDATE profiles SET ' . implode(', ', $fields) . ' WHERE user_id = ?';
    $db->prepare($sql)->execute($values);

    // Return updated profile
    handleGetProfile();
}

// ============================================================
// MEALS HANDLERS
// ============================================================

function handleGetMeals(): void {
    $user = requireAuth();
    $db = Database::get();

    $date = $_GET['date'] ?? null;
    $limit = (int)($_GET['limit'] ?? 1000);

    if ($date) {
        $stmt = $db->prepare('SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY timestamp DESC');
        $stmt->execute([$user['id'], $date]);
    } else {
        $stmt = $db->prepare('SELECT * FROM meals WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?');
        $stmt->execute([$user['id'], $limit]);
    }

    $meals = $stmt->fetchAll();
    $result = array_map(function($m) {
        return [
            'id' => $m['id'],
            'foodItem' => [
                'id' => $m['id'],
                'name' => $m['food_name'],
                'nameUz' => $m['food_name_uz'],
                'calories' => (float)$m['calories'],
                'protein' => (float)$m['protein'],
                'carbs' => (float)$m['carbs'],
                'fats' => (float)$m['fats'],
                'portionSize' => (float)$m['portion_size'],
                'portionUnit' => $m['portion_unit'],
                'imageUri' => $m['image_uri'],
            ],
            'mealType' => $m['meal_type'],
            'date' => $m['date'],
            'timestamp' => (int)$m['timestamp'],
        ];
    }, $meals);

    jsonResponse(['success' => true, 'meals' => $result]);
}

function handleAddMeal(): void {
    $user = requireAuth();
    $input = getJsonInput();
    $db = Database::get();

    $id = $input['id'] ?? uniqid('meal_');
    $food = $input['foodItem'] ?? [];

    $stmt = $db->prepare('INSERT INTO meals (id, user_id, food_name, food_name_uz, calories, protein, carbs, fats, portion_size, portion_unit, image_uri, meal_type, date, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $id,
        $user['id'],
        $food['name'] ?? '',
        $food['nameUz'] ?? null,
        $food['calories'] ?? 0,
        $food['protein'] ?? 0,
        $food['carbs'] ?? 0,
        $food['fats'] ?? 0,
        $food['portionSize'] ?? 0,
        $food['portionUnit'] ?? 'g',
        $food['imageUri'] ?? null,
        $input['mealType'] ?? 'snack',
        $input['date'] ?? date('Y-m-d'),
        $input['timestamp'] ?? (time() * 1000),
    ]);

    jsonResponse(['success' => true, 'id' => $id], 201);
}

function handleDeleteMeal(string $id): void {
    $user = requireAuth();
    $db = Database::get();
    $stmt = $db->prepare('DELETE FROM meals WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user['id']]);
    jsonResponse(['success' => true]);
}

// ============================================================
// WEIGHT HANDLERS
// ============================================================

function handleGetWeight(): void {
    $user = requireAuth();
    $db = Database::get();
    $stmt = $db->prepare('SELECT date, weight FROM weight_history WHERE user_id = ? ORDER BY date ASC');
    $stmt->execute([$user['id']]);
    $entries = $stmt->fetchAll();
    
    $result = array_map(function($w) {
        return ['date' => $w['date'], 'weight' => (float)$w['weight']];
    }, $entries);

    jsonResponse(['success' => true, 'weightHistory' => $result]);
}

function handleAddWeight(): void {
    $user = requireAuth();
    $input = getJsonInput();
    $db = Database::get();

    $date = $input['date'] ?? date('Y-m-d');
    $weight = (float)($input['weight'] ?? 0);

    if ($weight < 20 || $weight > 300) {
        errorResponse('Noto\'g\'ri vazn qiymati');
    }

    $stmt = $db->prepare('INSERT INTO weight_history (user_id, date, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = VALUES(weight)');
    $stmt->execute([$user['id'], $date, $weight]);

    jsonResponse(['success' => true]);
}

// ============================================================
// ACHIEVEMENTS HANDLERS
// ============================================================

function handleGetAchievements(): void {
    $user = requireAuth();
    $db = Database::get();
    $stmt = $db->prepare('SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $entries = $stmt->fetchAll();

    $result = array_map(function($a) {
        return ['id' => $a['achievement_id'], 'unlockedAt' => (int)$a['unlocked_at']];
    }, $entries);

    jsonResponse(['success' => true, 'achievements' => $result]);
}

function handleUnlockAchievement(): void {
    $user = requireAuth();
    $input = getJsonInput();
    $db = Database::get();

    $achievementId = $input['achievementId'] ?? '';
    if (empty($achievementId)) {
        errorResponse('Achievement ID kerak');
    }

    // Check if already unlocked
    $stmt = $db->prepare('SELECT id FROM achievements WHERE user_id = ? AND achievement_id = ?');
    $stmt->execute([$user['id'], $achievementId]);
    if ($stmt->fetch()) {
        jsonResponse(['success' => true, 'alreadyUnlocked' => true]);
    }

    $stmt = $db->prepare('INSERT INTO achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)');
    $stmt->execute([$user['id'], $achievementId, round(microtime(true) * 1000)]);

    jsonResponse(['success' => true, 'alreadyUnlocked' => false], 201);
}

// ============================================================
// PHOTOS HANDLERS
// ============================================================

function handleGetPhotos(): void {
    $user = requireAuth();
    $db = Database::get();
    $stmt = $db->prepare('SELECT * FROM progress_photos WHERE user_id = ? ORDER BY timestamp DESC');
    $stmt->execute([$user['id']]);
    $photos = $stmt->fetchAll();

    $result = array_map(function($p) {
        return [
            'id' => $p['id'],
            'uri' => $p['uri'],
            'date' => $p['date'],
            'timestamp' => (int)$p['timestamp'],
            'note' => $p['note'],
        ];
    }, $photos);

    jsonResponse(['success' => true, 'photos' => $result]);
}

function handleAddPhoto(): void {
    $user = requireAuth();
    $input = getJsonInput();
    $db = Database::get();

    $id = $input['id'] ?? (string)(round(microtime(true) * 1000));
    $uri = $input['uri'] ?? '';
    $date = $input['date'] ?? date('Y-m-d');
    $timestamp = $input['timestamp'] ?? round(microtime(true) * 1000);
    $note = $input['note'] ?? null;

    if (empty($uri)) {
        errorResponse('Rasm URI kerak');
    }

    $stmt = $db->prepare('INSERT INTO progress_photos (id, user_id, uri, date, timestamp, note) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$id, $user['id'], $uri, $date, $timestamp, $note]);

    jsonResponse(['success' => true, 'id' => $id], 201);
}

function handleDeletePhoto(string $id): void {
    $user = requireAuth();
    $db = Database::get();
    $stmt = $db->prepare('DELETE FROM progress_photos WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user['id']]);
    jsonResponse(['success' => true]);
}

// ============================================================
// STREAK HANDLERS
// ============================================================

function handleGetStreak(): void {
    $user = requireAuth();
    $db = Database::get();
    $stmt = $db->prepare('SELECT * FROM streaks WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $streak = $stmt->fetch();

    if (!$streak) {
        jsonResponse(['success' => true, 'streak' => ['currentStreak' => 0, 'lastLogDate' => '', 'longestStreak' => 0]]);
    }

    jsonResponse([
        'success' => true,
        'streak' => [
            'currentStreak' => (int)$streak['current_streak'],
            'lastLogDate' => $streak['last_log_date'] ?? '',
            'longestStreak' => (int)$streak['longest_streak'],
        ],
    ]);
}

function handleUpdateStreak(): void {
    $user = requireAuth();
    $input = getJsonInput();
    $db = Database::get();

    $currentStreak = (int)($input['currentStreak'] ?? 0);
    $lastLogDate = $input['lastLogDate'] ?? null;
    $longestStreak = (int)($input['longestStreak'] ?? 0);

    $stmt = $db->prepare('INSERT INTO streaks (user_id, current_streak, last_log_date, longest_streak) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE current_streak = VALUES(current_streak), last_log_date = VALUES(last_log_date), longest_streak = VALUES(longest_streak)');
    $stmt->execute([$user['id'], $currentStreak, $lastLogDate, $longestStreak]);

    jsonResponse(['success' => true]);
}

// ============================================================
// MEAL PLAN HANDLERS
// ============================================================

function handleGetMealPlan(): void {
    $user = requireAuth();
    $db = Database::get();
    $stmt = $db->prepare('SELECT plan_data, created_at FROM meal_plans WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $plan = $stmt->fetch();

    if (!$plan) {
        jsonResponse(['success' => true, 'mealPlan' => null]);
    }

    jsonResponse([
        'success' => true,
        'mealPlan' => json_decode($plan['plan_data'], true),
        'generatedAt' => $plan['created_at'],
    ]);
}

function handleSaveMealPlan(): void {
    $user = requireAuth();
    $input = getJsonInput();
    $db = Database::get();

    $planData = json_encode($input['planData'] ?? $input, JSON_UNESCAPED_UNICODE);

    $stmt = $db->prepare('INSERT INTO meal_plans (user_id, plan_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE plan_data = VALUES(plan_data), created_at = NOW()');
    $stmt->execute([$user['id'], $planData]);

    jsonResponse(['success' => true]);
}

// ============================================================
// SETTINGS HANDLERS
// ============================================================

function handleGetSettings(): void {
    $user = requireAuth();
    $db = Database::get();
    $stmt = $db->prepare('SELECT * FROM settings WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $settings = $stmt->fetch();

    if (!$settings) {
        jsonResponse(['success' => true, 'settings' => ['themeMode' => 'system', 'language' => 'uz']]);
    }

    jsonResponse([
        'success' => true,
        'settings' => [
            'themeMode' => $settings['theme_mode'],
            'language' => $settings['language'],
        ],
    ]);
}

function handleUpdateSettings(): void {
    $user = requireAuth();
    $input = getJsonInput();
    $db = Database::get();

    $fields = [];
    $values = [];

    if (isset($input['themeMode'])) {
        $fields[] = 'theme_mode = ?';
        $values[] = $input['themeMode'];
    }
    if (isset($input['language'])) {
        $fields[] = 'language = ?';
        $values[] = $input['language'];
    }

    if (empty($fields)) {
        errorResponse('Yangilanadigan sozlama yo\'q');
    }

    $values[] = $user['id'];
    $sql = 'UPDATE settings SET ' . implode(', ', $fields) . ' WHERE user_id = ?';
    $db->prepare($sql)->execute($values);

    jsonResponse(['success' => true]);
}

// ============================================================
// DATA MANAGEMENT HANDLERS
// ============================================================

function handleClearRecords(): void {
    $user = requireAuth();
    $db = Database::get();

    $db->prepare('DELETE FROM meals WHERE user_id = ?')->execute([$user['id']]);
    $db->prepare('DELETE FROM weight_history WHERE user_id = ?')->execute([$user['id']]);
    $db->prepare('DELETE FROM progress_photos WHERE user_id = ?')->execute([$user['id']]);
    $db->prepare('DELETE FROM meal_plans WHERE user_id = ?')->execute([$user['id']]);
    $db->prepare('UPDATE streaks SET current_streak = 0, last_log_date = NULL, longest_streak = 0 WHERE user_id = ?')
       ->execute([$user['id']]);

    jsonResponse(['success' => true, 'message' => 'Yozuvlar tozalandi']);
}

function handleResetAll(): void {
    $user = requireAuth();
    $db = Database::get();

    $db->prepare('DELETE FROM meals WHERE user_id = ?')->execute([$user['id']]);
    $db->prepare('DELETE FROM weight_history WHERE user_id = ?')->execute([$user['id']]);
    $db->prepare('DELETE FROM achievements WHERE user_id = ?')->execute([$user['id']]);
    $db->prepare('DELETE FROM progress_photos WHERE user_id = ?')->execute([$user['id']]);
    $db->prepare('DELETE FROM meal_plans WHERE user_id = ?')->execute([$user['id']]);
    $db->prepare('DELETE FROM streaks WHERE user_id = ?')->execute([$user['id']]);
    $db->prepare('UPDATE profiles SET name = "", onboarding_complete = 0 WHERE user_id = ?')
       ->execute([$user['id']]);

    jsonResponse(['success' => true, 'message' => 'Barcha ma\'lumotlar tozalandi']);
}
