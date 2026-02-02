-- WordPress Site Manager - Database Schema
-- Run this script to initialize the database

-- ===========================================
-- USERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'team_admin', 'team_user') DEFAULT 'team_user',
  status ENUM('active', 'blocked', 'pending') DEFAULT 'pending',
  email_verified BOOLEAN DEFAULT FALSE,
  failed_login_attempts INT DEFAULT 0,
  last_failed_login TIMESTAMP NULL,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
);

-- ===========================================
-- TWO-FACTOR AUTHENTICATION
-- ===========================================
CREATE TABLE IF NOT EXISTS user_2fa (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  secret_encrypted VARCHAR(512) NOT NULL,
  backup_codes_encrypted TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_2fa (user_id)
);

-- ===========================================
-- USER SESSIONS
-- ===========================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  location VARCHAR(255),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_token_hash (token_hash)
);

-- ===========================================
-- LOGIN LOGS
-- ===========================================
CREATE TABLE IF NOT EXISTS login_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  email VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  location VARCHAR(255),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  success BOOLEAN DEFAULT FALSE,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_email (email)
);

-- ===========================================
-- SECURITY EVENTS
-- ===========================================
CREATE TABLE IF NOT EXISTS security_events (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  event_type VARCHAR(50) NOT NULL,
  event_description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at)
);

-- ===========================================
-- TEAMS
-- ===========================================
CREATE TABLE IF NOT EXISTS teams (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  description TEXT,
  created_by CHAR(36) NOT NULL,
  allowed_email_domains TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_created_by (created_by),
  INDEX idx_status (status)
);

-- ===========================================
-- TEAM MEMBERS (Many-to-Many)
-- ===========================================
CREATE TABLE IF NOT EXISTS user_teams (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  role ENUM('team_admin', 'team_member') DEFAULT 'team_member',
  approved BOOLEAN DEFAULT FALSE,
  approved_by CHAR(36),
  approved_at TIMESTAMP NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uk_user_team (user_id, team_id),
  INDEX idx_team_id (team_id),
  INDEX idx_approved (approved)
);

-- ===========================================
-- TEAM REQUESTS
-- ===========================================
CREATE TABLE IF NOT EXISTS team_requests (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by CHAR(36),
  reviewed_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_team_id (team_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- ===========================================
-- SITES
-- ===========================================
CREATE TABLE IF NOT EXISTS sites (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  team_id CHAR(36) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  url VARCHAR(512) NOT NULL,
  environment ENUM('beta', 'live') DEFAULT 'live',
  status ENUM('healthy', 'warning', 'error', 'maintenance', 'offline') DEFAULT 'healthy',
  api_key_encrypted VARCHAR(512),
  api_key_prefix VARCHAR(10),
  last_sync TIMESTAMP NULL,
  last_health_check TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE KEY uk_domain (domain),
  INDEX idx_team_id (team_id),
  INDEX idx_environment (environment),
  INDEX idx_status (status)
);

-- ===========================================
-- SITE PLUGINS
-- ===========================================
CREATE TABLE IF NOT EXISTS site_plugins (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  site_id CHAR(36) NOT NULL,
  plugin_slug VARCHAR(255) NOT NULL,
  plugin_name VARCHAR(255),
  version VARCHAR(50),
  latest_version VARCHAR(50),
  update_available BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  INDEX idx_site_id (site_id),
  UNIQUE KEY uk_site_plugin (site_id, plugin_slug)
);

-- ===========================================
-- SITE THEMES
-- ===========================================
CREATE TABLE IF NOT EXISTS site_themes (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  site_id CHAR(36) NOT NULL,
  theme_slug VARCHAR(255) NOT NULL,
  theme_name VARCHAR(255),
  version VARCHAR(50),
  latest_version VARCHAR(50),
  update_available BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  INDEX idx_site_id (site_id),
  UNIQUE KEY uk_site_theme (site_id, theme_slug)
);

-- ===========================================
-- SITE USERS (WordPress Users)
-- ===========================================
CREATE TABLE IF NOT EXISTS site_users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  site_id CHAR(36) NOT NULL,
  wp_user_id INT,
  wp_username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  INDEX idx_site_id (site_id),
  UNIQUE KEY uk_site_user (site_id, wp_username)
);

-- ===========================================
-- SITE ERRORS
-- ===========================================
CREATE TABLE IF NOT EXISTS site_errors (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  site_id CHAR(36) NOT NULL,
  severity ENUM('notice', 'warning', 'error', 'critical', 'fatal') DEFAULT 'error',
  error_type VARCHAR(255),
  message LONGTEXT,
  stack_trace LONGTEXT,
  source_file VARCHAR(512),
  line_number INT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by CHAR(36),
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_site_id (site_id),
  INDEX idx_severity (severity),
  INDEX idx_resolved (resolved),
  INDEX idx_created_at (created_at)
);

-- ===========================================
-- DOMAIN MONITORING
-- ===========================================
CREATE TABLE IF NOT EXISTS domain_monitoring (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  site_id CHAR(36) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  expiry_date DATE,
  ssl_expiry_date DATE,
  expected_nameservers TEXT,
  current_nameservers TEXT,
  ns_mismatch BOOLEAN DEFAULT FALSE,
  ssl_valid BOOLEAN DEFAULT TRUE,
  last_checked TIMESTAMP NULL,
  alert_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  INDEX idx_site_id (site_id),
  UNIQUE KEY uk_site_domain (site_id)
);

-- ===========================================
-- MAGIC LOGIN TOKENS
-- ===========================================
CREATE TABLE IF NOT EXISTS magic_login_tokens (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  site_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at)
);

-- ===========================================
-- ACTIVITY LOGS (Immutable Audit Trail)
-- ===========================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  team_id CHAR(36),
  site_id CHAR(36),
  action VARCHAR(255) NOT NULL,
  action_category VARCHAR(50),
  target_type VARCHAR(50),
  target_id CHAR(36),
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  location VARCHAR(255),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_team_id (team_id),
  INDEX idx_site_id (site_id),
  INDEX idx_action (action),
  INDEX idx_action_category (action_category),
  INDEX idx_created_at (created_at)
);

-- ===========================================
-- EMAIL SETTINGS
-- ===========================================
CREATE TABLE IF NOT EXISTS email_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INT DEFAULT 587,
  smtp_user VARCHAR(255),
  smtp_pass_encrypted VARCHAR(512),
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  use_ssl BOOLEAN DEFAULT FALSE,
  secure BOOLEAN DEFAULT TRUE,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===========================================
-- SYSTEM SETTINGS
-- ===========================================
CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
);

-- ===========================================
-- ALLOWED DOMAINS (For Registration)
-- ===========================================
CREATE TABLE IF NOT EXISTS allowed_domains (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  domain VARCHAR(255) NOT NULL UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_domain (domain),
  INDEX idx_active (active)
);

-- ===========================================
-- WEBHOOKS
-- ===========================================
CREATE TABLE IF NOT EXISTS webhooks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(512) NOT NULL,
  secret_encrypted VARCHAR(512),
  events JSON,
  active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP NULL,
  last_status INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===========================================
-- INSTALLATION LOG
-- ===========================================
CREATE TABLE IF NOT EXISTS installation_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  step VARCHAR(100),
  admin_id CHAR(36),
  error_message TEXT,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ===========================================
-- PASSWORD RESET TOKENS
-- ===========================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at)
);

-- ===========================================
-- INSERT DEFAULT SETTINGS
-- ===========================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('site_name', 'WordPress Site Manager', 'string', 'Application name'),
('session_timeout', '60', 'number', 'Session timeout in minutes'),
('max_login_attempts', '3', 'number', 'Max failed login attempts before lockout'),
('lockout_duration', '15', 'number', 'Account lockout duration in minutes'),
('enforce_2fa', 'false', 'boolean', 'Enforce 2FA for all users'),
('installation_complete', 'false', 'boolean', 'Whether installation is complete')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
