<?php

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

cors_headers();
verify_api_key();

$request_uri = $_SERVER['REQUEST_URI'];
$base_path = '/api';
$path = parse_url($request_uri, PHP_URL_PATH);
$path = preg_replace('#^' . preg_quote($base_path) . '#', '', $path);
$path = rtrim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];

$routes = [
    'POST /auth/send-code'   => 'controllers/AuthController.php@sendCode',
    'POST /auth/verify-code'  => 'controllers/AuthController.php@verifyCode',
    'POST /auth/logout'       => 'controllers/AuthController.php@logout',
    'GET /auth/check'         => 'controllers/AuthController.php@check',

    'GET /profile'            => 'controllers/ProfileController.php@get',
    'PUT /profile'            => 'controllers/ProfileController.php@update',

    'GET /meals'              => 'controllers/MealsController.php@getAll',
    'POST /meals'             => 'controllers/MealsController.php@add',
    'DELETE /meals/{id}'      => 'controllers/MealsController.php@remove',

    'GET /weight'             => 'controllers/WeightController.php@getAll',
    'POST /weight'            => 'controllers/WeightController.php@add',

    'GET /achievements'       => 'controllers/AchievementsController.php@getAll',
    'POST /achievements'      => 'controllers/AchievementsController.php@unlock',

    'GET /photos'             => 'controllers/PhotosController.php@getAll',
    'POST /photos'            => 'controllers/PhotosController.php@add',
    'DELETE /photos/{id}'     => 'controllers/PhotosController.php@remove',

    'GET /streak'             => 'controllers/StreakController.php@get',
    'PUT /streak'             => 'controllers/StreakController.php@update',

    'GET /meal-plan'          => 'controllers/MealPlanController.php@get',
    'POST /meal-plan'         => 'controllers/MealPlanController.php@save',

    'GET /settings'           => 'controllers/SettingsController.php@get',
    'PUT /settings'           => 'controllers/SettingsController.php@update',
];

$matched = false;
$params = [];

foreach ($routes as $route => $handler) {
    [$route_method, $route_path] = explode(' ', $route, 2);

    if ($route_method !== $method) continue;

    $pattern = preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $route_path);
    $pattern = '#^' . $pattern . '$#';

    if (preg_match($pattern, $path, $matches)) {
        foreach ($matches as $key => $value) {
            if (is_string($key)) {
                $params[$key] = $value;
            }
        }

        [$file, $action] = explode('@', $handler);
        require_once __DIR__ . '/' . $file;

        $class_name = basename($file, '.php');
        $db = new Database();
        $controller = new $class_name($db->getConnection());
        $controller->$action($params);

        $matched = true;
        break;
    }
}

if (!$matched) {
    error_response('Endpoint topilmadi: ' . $method . ' ' . $path, 404);
}
