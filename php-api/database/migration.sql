-- NutriUZ Database Schema
-- Run this SQL to create all tables

CREATE DATABASE IF NOT EXISTS nutriuz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nutriuz;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login_method ENUM('email', 'phone') NOT NULL,
    identifier VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_identifier (identifier),
    INDEX idx_method (login_method)
) ENGINE=InnoDB;

-- OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    method ENUM('email', 'phone') NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifier_code (identifier, code),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- Auth tokens table
CREATE TABLE IF NOT EXISTS auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_token (token_hash)
) ENGINE=InnoDB;

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    name VARCHAR(100) DEFAULT '',
    gender ENUM('male', 'female') DEFAULT 'male',
    age INT DEFAULT 25,
    height INT DEFAULT 170,
    weight DECIMAL(5,1) DEFAULT 70.0,
    target_weight DECIMAL(5,1) DEFAULT 70.0,
    goal ENUM('lose', 'maintain', 'gain') DEFAULT 'maintain',
    activity_level ENUM('sedentary', 'moderate', 'active') DEFAULT 'moderate',
    onboarding_complete TINYINT(1) DEFAULT 0,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Meals table
CREATE TABLE IF NOT EXISTS meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    meal_id VARCHAR(100) NOT NULL,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
    meal_date DATE NOT NULL,
    timestamp BIGINT NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    food_name_uz VARCHAR(255) DEFAULT NULL,
    calories DECIMAL(8,1) NOT NULL DEFAULT 0,
    protein DECIMAL(8,1) NOT NULL DEFAULT 0,
    carbs DECIMAL(8,1) NOT NULL DEFAULT 0,
    fats DECIMAL(8,1) NOT NULL DEFAULT 0,
    portion_size DECIMAL(8,1) NOT NULL DEFAULT 0,
    portion_unit VARCHAR(20) DEFAULT 'g',
    image_uri TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, meal_date),
    INDEX idx_meal_id (meal_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Weight history table
CREATE TABLE IF NOT EXISTS weight_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    weight_date DATE NOT NULL,
    weight DECIMAL(5,1) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_date (user_id, weight_date),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id VARCHAR(50) NOT NULL,
    unlocked_at BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_achievement (user_id, achievement_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Progress photos table
CREATE TABLE IF NOT EXISTS progress_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    photo_id VARCHAR(100) NOT NULL,
    uri TEXT NOT NULL,
    photo_date DATE NOT NULL,
    timestamp BIGINT NOT NULL,
    note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_photo_id (photo_id)
) ENGINE=InnoDB;

-- Streak data table
CREATE TABLE IF NOT EXISTS streaks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    current_streak INT DEFAULT 0,
    last_log_date DATE DEFAULT NULL,
    longest_streak INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Meal plans (cached) table
CREATE TABLE IF NOT EXISTS meal_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    plan_data JSON NOT NULL,
    generated_at BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    theme VARCHAR(20) DEFAULT 'system',
    language VARCHAR(10) DEFAULT 'uz',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
