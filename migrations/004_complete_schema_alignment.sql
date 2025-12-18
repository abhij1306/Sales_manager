-- Migration 004 (Revised): Add only truly missing components
-- Date: 2025-12-18
-- Purpose: Add delivery schedule table, HSN master, consignee master, and triggers

-- Create delivery schedule table (if not exists)
CREATE TABLE IF NOT EXISTS purchase_order_deliveries (
    id TEXT PRIMARY KEY,
    po_item_id TEXT NOT NULL REFERENCES purchase_order_items(id) ON DELETE CASCADE,
    lot_no INTEGER,
    dely_qty NUMERIC,
    dely_date DATE,
    entry_allow_date DATE,
    dest_code INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pod_po_item ON purchase_order_deliveries(po_item_id);
CREATE INDEX IF NOT EXISTS idx_pod_dely_date ON purchase_order_deliveries(dely_date);

-- Create HSN master (if not exists)
CREATE TABLE IF NOT EXISTS hsn_master (
    hsn_code TEXT PRIMARY KEY,
    description TEXT,
    gst_rate NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create consignee master (if not exists)
CREATE TABLE IF NOT EXISTS consignee_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consignee_name TEXT NOT NULL,
    consignee_gstin TEXT,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(consignee_name, consignee_gstin)
);

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS calculate_pending_qty_insert;
DROP TRIGGER IF EXISTS calculate_pending_qty_update;

-- Create triggers for auto-calculation of pending_qty
CREATE TRIGGER calculate_pending_qty_insert
AFTER INSERT ON purchase_order_items
BEGIN
    UPDATE purchase_order_items 
    SET pending_qty = ord_qty - COALESCE(delivered_qty, 0)
    WHERE id = NEW.id;
END;

CREATE TRIGGER calculate_pending_qty_update
AFTER UPDATE ON purchase_order_items
BEGIN
    UPDATE purchase_order_items 
    SET pending_qty = ord_qty - COALESCE(delivered_qty, 0)
    WHERE id = NEW.id;
END;

-- Update schema version
INSERT OR IGNORE INTO schema_version (version, description) 
VALUES (4, 'Add delivery schedule, HSN master, consignee master, and triggers');
