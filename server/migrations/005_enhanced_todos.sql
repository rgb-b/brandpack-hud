-- Enhanced Todos Migration
-- Adds due dates, priority levels, user assignments, and tags to todos

-- Add new columns to dashboard_todos
ALTER TABLE dashboard_todos ADD COLUMN due_date DATE;
ALTER TABLE dashboard_todos ADD COLUMN priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE dashboard_todos ADD COLUMN assigned_to INTEGER REFERENCES users(id);
ALTER TABLE dashboard_todos ADD COLUMN tags TEXT; -- JSON array of tags

-- Create index for due date queries
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON dashboard_todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON dashboard_todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to ON dashboard_todos(assigned_to);

-- Create view for overdue todos
CREATE VIEW IF NOT EXISTS v_overdue_todos AS
SELECT *
FROM dashboard_todos
WHERE completed = 0
  AND due_date IS NOT NULL
  AND due_date < DATE('now');

-- Create view for today's todos
CREATE VIEW IF NOT EXISTS v_today_todos AS
SELECT *
FROM dashboard_todos
WHERE completed = 0
  AND due_date = DATE('now');

-- Create view for upcoming todos (next 7 days)
CREATE VIEW IF NOT EXISTS v_upcoming_todos AS
SELECT *
FROM dashboard_todos
WHERE completed = 0
  AND due_date > DATE('now')
  AND due_date <= DATE('now', '+7 days')
ORDER BY due_date ASC, priority DESC;
