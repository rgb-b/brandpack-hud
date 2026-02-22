-- ============================================================================
-- Authentication System Migration
-- Adds user roles, sessions table, and migrates existing productivity data
-- ============================================================================

-- Step 1: Add role column to users table
-- Default role is 'user', with CHECK constraint for valid roles
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Step 2: Create sessions table for express-session with connect-sqlite3
-- This table is used by connect-sqlite3 to store session data
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY NOT NULL,
  sess TEXT NOT NULL,
  expired INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);

-- Step 3: Insert System user (id = 1)
-- This user owns all existing productivity data from the legacy system
INSERT INTO users (id, username, pin, role, created_at)
VALUES (1, 'System', '0000', 'user', CURRENT_TIMESTAMP);

-- Step 4: Migrate existing productivity data to System user (user_id = 1)
-- Update all productivity tables to assign user_id = 1 for existing data

-- Update productivity_tasks
UPDATE productivity_tasks
SET user_id = 1
WHERE user_id IS NULL;

-- Update productivity_history
UPDATE productivity_history
SET user_id = 1
WHERE user_id IS NULL;

-- Update productivity_daily_totals
UPDATE productivity_daily_totals
SET user_id = 1
WHERE user_id IS NULL;

-- Update productivity_task_totals
UPDATE productivity_task_totals
SET user_id = 1
WHERE user_id IS NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
