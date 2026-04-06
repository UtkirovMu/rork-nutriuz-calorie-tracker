-- NutriUZ Database Schema
-- MySQL 5.7+ / MariaDB 10.3+

CREATE DATABASE IF NOT EXISTS nutriuz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nutriuz;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    login_method ENUM('phone', 'email') NOT NULL,
    otp_code VARCHAR(6) DEFAULT NULL,
    otp_expires_at DATETIME DEFAULT NULL,
    token VARCHAR(255) DEFAULT NULL,
    token_expires_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_phone (phone),
    UNIQUE KEY unique_email (email),
    INDEX idx_token (token)
) ENGINE=InnoDB;

-- User profiles
CREATE TABLE profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT '',
    gender ENUM('male', 'female') NOT NULL DEFAULT 'male',
    age INT NOT NULL DEFAULT 25,
    height INT NOT NULL DEFAULT 170,
    weight INT NOT NULL DEFAULT 70,
    target_weight INT NOT NULL DEFAULT 70,
    goal ENUM('lose', 'maintain', 'gain') NOT NULL DEFAULT 'maintain',
    activity_level ENUM('sedentary', 'moderate', 'active') NOT NULL DEFAULT 'moderate',
    onboarding_complete TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Meals
CREATE TABLE meals (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    food_name_uz VARCHAR(255) DEFAULT NULL,
    calories DECIMAL(10,2) NOT NULL DEFAULT 0,
    protein DECIMAL(10,2) NOT NULL DEFAULT 0,
    carbs DECIMAL(10,2) NOT NULL DEFAULT 0,
    fats DECIMAL(10,2) NOT NULL DEFAULT 0,
    portion_size DECIMAL(10,2) NOT NULL DEFAULT 0,
    portion_unit VARCHAR(20) NOT NULL DEFAULT 'g',
    image_uri TEXT DEFAULT NULL,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
    date DATE NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Weight history
CREATE TABLE weight_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    weight DECIMAL(5,1) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Achievements
CREATE TABLE achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id VARCHAR(50) NOT NULL,
    unlocked_at BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_achievement (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Progress photos
CREATE TABLE progress_photos (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    uri TEXT NOT NULL,
    date DATE NOT NULL,
    timestamp BIGINT NOT NULL,
    note TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Streak
CREATE TABLE streaks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    current_streak INT NOT NULL DEFAULT 0,
    last_log_date DATE DEFAULT NULL,
    longest_streak INT NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Meal plans (cached)
CREATE TABLE meal_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_data JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- User settings
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    theme_mode ENUM('light', 'dark', 'system') NOT NULL DEFAULT 'system',
    language VARCHAR(5) NOT NULL DEFAULT 'uz',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
