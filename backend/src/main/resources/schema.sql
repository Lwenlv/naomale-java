-- 闹麻了点单 · MySQL 8 / 5.7 兼容建表脚本
-- 首次启动自动执行；只创建不存在的表。

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(40) NOT NULL,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS families (
  id VARCHAR(40) NOT NULL,
  name VARCHAR(64) NOT NULL,
  owner_id VARCHAR(40) NOT NULL,
  invite_code CHAR(8) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_families_invite (invite_code),
  KEY idx_families_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS family_members (
  family_id VARCHAR(40) NOT NULL,
  user_id VARCHAR(40) NOT NULL,
  role VARCHAR(16) NOT NULL,
  joined_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (family_id, user_id),
  KEY idx_family_members_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) NOT NULL,
  user_id VARCHAR(40) NOT NULL,
  active_family_id VARCHAR(40) NULL,
  created_at VARCHAR(40) NOT NULL,
  expires_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (token_hash),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS family_settings (
  family_id VARCHAR(40) NOT NULL,
  ai_provider VARCHAR(16) NOT NULL DEFAULT 'deepseek',
  ai_model VARCHAR(60) NOT NULL DEFAULT 'deepseek-flash',
  deepseek_api_key VARCHAR(255) NULL,
  theme VARCHAR(20) NOT NULL DEFAULT 'spice',
  PRIMARY KEY (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_members (
  id VARCHAR(40) NOT NULL,
  family_id VARCHAR(40) NOT NULL,
  name VARCHAR(40) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT '家庭成员',
  avatar_bg VARCHAR(40) NOT NULL DEFAULT 'bg-amber-600',
  dietary_preference VARCHAR(120) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_meal_members_family (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dishes (
  id VARCHAR(40) NOT NULL,
  family_id VARCHAR(40) NOT NULL,
  name VARCHAR(80) NOT NULL,
  pinyin VARCHAR(80) NULL,
  category VARCHAR(20) NOT NULL,
  cuisine VARCHAR(60) NOT NULL,
  prep_time INT NOT NULL DEFAULT 0,
  cook_time INT NOT NULL DEFAULT 0,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'easy',
  estimated_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  servings INT NOT NULL DEFAULT 2,
  cover_image VARCHAR(500) NULL,
  description TEXT NULL,
  ingredients LONGTEXT NULL,
  steps LONGTEXT NULL,
  nutrition LONGTEXT NULL,
  tags LONGTEXT NULL,
  is_favorite TINYINT NOT NULL DEFAULT 0,
  cook_count INT NOT NULL DEFAULT 0,
  last_cooked_date VARCHAR(10) NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_dishes_family (family_id),
  KEY idx_dishes_family_favorite (family_id, is_favorite)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(40) NOT NULL,
  family_id VARCHAR(40) NOT NULL,
  title VARCHAR(80) NOT NULL,
  meal_type VARCHAR(20) NOT NULL DEFAULT 'dinner',
  meal_date VARCHAR(10) NOT NULL,
  diner_count INT NOT NULL DEFAULT 1,
  chef VARCHAR(40) NULL,
  total_estimated_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  actual_cost DECIMAL(10,2) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  notes TEXT NULL,
  is_current TINYINT NOT NULL DEFAULT 0,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_orders_family_current (family_id, is_current),
  KEY idx_orders_family_date (family_id, meal_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(40) NOT NULL,
  order_id VARCHAR(40) NOT NULL,
  dish_id VARCHAR(40) NOT NULL,
  dish_snapshot LONGTEXT NULL,
  quantity INT NOT NULL DEFAULT 1,
  member VARCHAR(40) NOT NULL DEFAULT '全家',
  notes VARCHAR(500) NULL,
  custom_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media (
  id VARCHAR(40) NOT NULL,
  family_id VARCHAR(40) NOT NULL,
  mime VARCHAR(60) NOT NULL,
  file_name VARCHAR(200) NULL,
  data LONGBLOB NOT NULL,
  bytes INT NOT NULL DEFAULT 0,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_media_family (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS backups (
  id VARCHAR(40) NOT NULL,
  family_id VARCHAR(40) NOT NULL,
  reason VARCHAR(80) NULL,
  payload LONGTEXT NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_backups_family (family_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  family_id VARCHAR(40) NULL,
  action VARCHAR(80) NOT NULL,
  detail VARCHAR(500) NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_audit_family (family_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_themes (
  user_id VARCHAR(40) NOT NULL,
  active_theme VARCHAR(20) NOT NULL DEFAULT 'spice',
  name VARCHAR(80) NULL,
  config LONGTEXT NULL,
  updated_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
