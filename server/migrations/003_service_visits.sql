-- Migration 003: Service Visits Feature
-- Replaces daily checklist with service visit tracking
-- Adds comprehensive visit logging for maintenance history

-- ============================================================================
-- REMOVE DEPRECATED FEATURES
-- ============================================================================

-- Drop maintenance checklist table (deprecated feature)
DROP TABLE IF EXISTS maintenance_checklist;
DROP INDEX IF EXISTS idx_checklist_date;
DROP INDEX IF EXISTS idx_checklist_completed;

-- ============================================================================
-- CREATE SERVICE VISITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  time TIME,
  technician TEXT NOT NULL,
  company TEXT,
  machine TEXT NOT NULL,
  visit_type TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  cost DECIMAL(10, 2),
  linked_issue_id INTEGER REFERENCES maintenance_issues(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (visit_type IN ('scheduled', 'emergency', 'warranty', 'installation'))
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Index for date-based queries (calendar view, date range filters)
CREATE INDEX IF NOT EXISTS idx_visits_date ON service_visits(date);

-- Index for machine-specific history lookups
CREATE INDEX IF NOT EXISTS idx_visits_machine ON service_visits(machine);

-- Index for visit type filtering and reporting
CREATE INDEX IF NOT EXISTS idx_visits_visit_type ON service_visits(visit_type);

-- Composite index for common query pattern: machine + date range
CREATE INDEX IF NOT EXISTS idx_visits_machine_date ON service_visits(machine, date);

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Automatically update updated_at timestamp on row modification
CREATE TRIGGER IF NOT EXISTS update_visit_timestamp
AFTER UPDATE ON service_visits
BEGIN
  UPDATE service_visits SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Verify table exists:
-- SELECT name FROM sqlite_master WHERE type='table' AND name='service_visits';

-- Verify checklist removed:
-- SELECT name FROM sqlite_master WHERE type='table' AND name='maintenance_checklist';

-- Verify indexes:
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='service_visits';

-- Test insert:
-- INSERT INTO service_visits (date, technician, machine, visit_type, description)
-- VALUES ('2026-02-03', 'John Doe', 'Epson 9900', 'scheduled', 'Routine maintenance');
