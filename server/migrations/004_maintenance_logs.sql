-- ============================================================================
-- Migration 004: Maintenance Logs
-- Create table for logging weekly/routine maintenance sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,                       -- YYYY-MM-DD when maintenance was performed
  time TIME,                                -- HH:MM when maintenance was performed (optional)
  machines TEXT,                            -- JSON array of machines worked on (optional)
  description TEXT NOT NULL,                -- What maintenance was performed
  notes TEXT,                               -- Additional notes
  performed_by TEXT,                        -- Who performed the maintenance (optional)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_date ON maintenance_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_created ON maintenance_logs(created_at DESC);

CREATE TRIGGER IF NOT EXISTS update_maintenance_log_timestamp
AFTER UPDATE ON maintenance_logs
BEGIN
  UPDATE maintenance_logs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
