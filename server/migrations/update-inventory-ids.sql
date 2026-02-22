-- Migration: Update inventory IDs to match order form product codes
-- Date: 2026-02-06
-- Updates 36 existing items and adds 3 new Roland maintenance items

BEGIN TRANSACTION;

-- Disable foreign key constraints temporarily
PRAGMA foreign_keys = OFF;

-- Drop view first (it depends on inventory_items table)
DROP VIEW IF EXISTS v_critical_stock;

-- Create temporary table with new structure
CREATE TABLE inventory_items_new (
  id TEXT PRIMARY KEY,
  printer TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  barcode TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data with ID mappings (36 updates)
INSERT INTO inventory_items_new (id, printer, category, name, stock, unit, barcode, created_at, updated_at)
SELECT
  CASE
    -- Roland VS-300i inks
    WHEN id = 'VS300-INK-CYAN' THEN 'CT-RXRXG-C'
    WHEN id = 'VS300-INK-MAGENTA' THEN 'CT-RXRXG-M'
    WHEN id = 'VS300-INK-YELLOW' THEN 'CT-RXRXG-Y'
    WHEN id = 'VS300-INK-BLACK' THEN 'CT-RXRXG-K'
    WHEN id = 'VS300-INK-ORANGE' THEN 'CT-RXRXG-O'
    WHEN id = 'VS300-INK-GREEN' THEN 'CT-RXRXG-G'
    WHEN id = 'VS300-INK-WHITE' THEN 'ESL4-WH'
    WHEN id = 'VS300-INK-METALLIC' THEN 'ESL4-MT'
    WHEN id = 'VS300-MISC-SOLVENT' THEN '6701409310'
    WHEN id = 'VS300-MISC-SWABS' THEN 'ST-037-50'
    -- Epson 9900/WT7900
    WHEN id = 'E9900-INK-CYAN' THEN 'T636200'
    WHEN id = 'E9900-INK-MAGENTA' THEN 'T636300'
    WHEN id = 'E9900-INK-YELLOW' THEN 'T636400'
    WHEN id = 'E9900-INK-BLACK' THEN 'T636100'
    WHEN id = 'E9900-INK-ORANGE' THEN 'T636A00'
    WHEN id = 'E9900-INK-GREEN' THEN 'T636B00'
    WHEN id = 'E9900-INK-LCYAN' THEN 'T636500'
    WHEN id = 'E9900-INK-LMAGENTA' THEN 'T636600'
    WHEN id = 'E9900-INK-LBLACK' THEN 'T636700'
    WHEN id = 'E9900-INK-LLBLACK' THEN 'T636900'
    WHEN id = 'E9900-INK-WHITE' THEN 'T596C00'
    WHEN id = 'E9900-MISC-FLUID' THEN 'C13T642000'
    WHEN id = 'E9900-MISC-TANK' THEN 'C12C890191'
    WHEN id = 'E9900-MEDIA' THEN 'E-PPO250/44/45'
    WHEN id = 'WT7900-MEDIA' THEN 'C13S042372'
    -- Epson P9070
    WHEN id = 'P9070-INK-CYAN' THEN 'T55J292'
    WHEN id = 'P9070-INK-MAGENTA' THEN 'T55J392'
    WHEN id = 'P9070-INK-YELLOW' THEN 'T55J492'
    WHEN id = 'P9070-INK-BLACK' THEN 'T55J192'
    WHEN id = 'P9070-INK-ORANGE' THEN 'T55JA92'
    WHEN id = 'P9070-INK-GREEN' THEN 'T55JB92'
    WHEN id = 'P9070-INK-VIOLET' THEN 'T55JD92'
    WHEN id = 'P9070-INK-LCYAN' THEN 'T55J592'
    WHEN id = 'P9070-INK-LMAGENTA' THEN 'T55J692'
    WHEN id = 'P9070-INK-LBLACK' THEN 'T55J792'
    WHEN id = 'P9070-INK-LLBLACK' THEN 'T55J992'
    WHEN id = 'P9070-MISC-TANK' THEN 'C13T699700'
    WHEN id = 'P9070-MEDIA' THEN 'E-PM120/44/45'
    -- Keep unchanged
    ELSE id
  END as id,
  printer, category, name, stock, unit, barcode, created_at, updated_at
FROM inventory_items;

-- Add 3 new Roland items
INSERT INTO inventory_items_new (id, printer, category, name, stock, unit)
VALUES
  ('1000006736', 'Roland VS-300i', 'Misc', 'Wiper Head Felt', 0, 'units'),
  ('1000006517', 'Roland VS-300i', 'Misc', 'Wiper Head', 0, 'units'),
  ('E-STF030G/24/30', 'Roland VS-300i', 'Media', 'ORIS Media Transfer Film 24" x 30m', 0, 'rolls');

-- Update inventory_usage_history foreign keys
CREATE TABLE inventory_usage_history_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  printer TEXT NOT NULL,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory_items_new(id) ON DELETE CASCADE
);

INSERT INTO inventory_usage_history_new (id, item_id, printer, category, item_name, quantity, unit, timestamp)
SELECT
  id,
  CASE
    -- Apply same ID mapping as above
    WHEN item_id = 'VS300-INK-CYAN' THEN 'CT-RXRXG-C'
    WHEN item_id = 'VS300-INK-MAGENTA' THEN 'CT-RXRXG-M'
    WHEN item_id = 'VS300-INK-YELLOW' THEN 'CT-RXRXG-Y'
    WHEN item_id = 'VS300-INK-BLACK' THEN 'CT-RXRXG-K'
    WHEN item_id = 'VS300-INK-ORANGE' THEN 'CT-RXRXG-O'
    WHEN item_id = 'VS300-INK-GREEN' THEN 'CT-RXRXG-G'
    WHEN item_id = 'VS300-INK-WHITE' THEN 'ESL4-WH'
    WHEN item_id = 'VS300-INK-METALLIC' THEN 'ESL4-MT'
    WHEN item_id = 'VS300-MISC-SOLVENT' THEN '6701409310'
    WHEN item_id = 'VS300-MISC-SWABS' THEN 'ST-037-50'
    WHEN item_id = 'E9900-INK-CYAN' THEN 'T636200'
    WHEN item_id = 'E9900-INK-MAGENTA' THEN 'T636300'
    WHEN item_id = 'E9900-INK-YELLOW' THEN 'T636400'
    WHEN item_id = 'E9900-INK-BLACK' THEN 'T636100'
    WHEN item_id = 'E9900-INK-ORANGE' THEN 'T636A00'
    WHEN item_id = 'E9900-INK-GREEN' THEN 'T636B00'
    WHEN item_id = 'E9900-INK-LCYAN' THEN 'T636500'
    WHEN item_id = 'E9900-INK-LMAGENTA' THEN 'T636600'
    WHEN item_id = 'E9900-INK-LBLACK' THEN 'T636700'
    WHEN item_id = 'E9900-INK-LLBLACK' THEN 'T636900'
    WHEN item_id = 'E9900-INK-WHITE' THEN 'T596C00'
    WHEN item_id = 'E9900-MISC-FLUID' THEN 'C13T642000'
    WHEN item_id = 'E9900-MISC-TANK' THEN 'C12C890191'
    WHEN item_id = 'E9900-MEDIA' THEN 'E-PPO250/44/45'
    WHEN item_id = 'WT7900-MEDIA' THEN 'C13S042372'
    WHEN item_id = 'P9070-INK-CYAN' THEN 'T55J292'
    WHEN item_id = 'P9070-INK-MAGENTA' THEN 'T55J392'
    WHEN item_id = 'P9070-INK-YELLOW' THEN 'T55J492'
    WHEN item_id = 'P9070-INK-BLACK' THEN 'T55J192'
    WHEN item_id = 'P9070-INK-ORANGE' THEN 'T55JA92'
    WHEN item_id = 'P9070-INK-GREEN' THEN 'T55JB92'
    WHEN item_id = 'P9070-INK-VIOLET' THEN 'T55JD92'
    WHEN item_id = 'P9070-INK-LCYAN' THEN 'T55J592'
    WHEN item_id = 'P9070-INK-LMAGENTA' THEN 'T55J692'
    WHEN item_id = 'P9070-INK-LBLACK' THEN 'T55J792'
    WHEN item_id = 'P9070-INK-LLBLACK' THEN 'T55J992'
    WHEN item_id = 'P9070-MISC-TANK' THEN 'C13T699700'
    WHEN item_id = 'P9070-MEDIA' THEN 'E-PM120/44/45'
    ELSE item_id
  END as item_id,
  printer, category, item_name, quantity, unit, timestamp
FROM inventory_usage_history;

-- Drop old tables
DROP TABLE inventory_usage_history;
DROP TABLE inventory_items;

-- Rename new tables
ALTER TABLE inventory_items_new RENAME TO inventory_items;
ALTER TABLE inventory_usage_history_new RENAME TO inventory_usage_history;

-- Recreate indexes
CREATE INDEX idx_inventory_printer ON inventory_items(printer);
CREATE INDEX idx_inventory_category ON inventory_items(category);
CREATE INDEX idx_inventory_stock ON inventory_items(stock);
CREATE INDEX idx_inventory_barcode ON inventory_items(barcode);
CREATE INDEX idx_usage_item_id ON inventory_usage_history(item_id);
CREATE INDEX idx_usage_timestamp ON inventory_usage_history(timestamp);

-- Recreate critical stock view (dropped at start of transaction)
CREATE VIEW v_critical_stock AS
SELECT id, printer, category, name, stock, unit
FROM inventory_items
WHERE stock <= 1
ORDER BY stock ASC, printer, name;

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;

COMMIT;
