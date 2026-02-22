-- Migration: Add shift countdown timer feature
-- Add shift_length_hours to users table for configurable shift durations

-- Add column with default 8 hours
ALTER TABLE users ADD COLUMN shift_length_hours INTEGER DEFAULT 8;

-- Update any existing users to have 8-hour default
UPDATE users SET shift_length_hours = 8 WHERE shift_length_hours IS NULL;
