-- Migration 004: Complete Schema Alignment with Sales_Manager
-- Date: 2025-12-18
-- Purpose: Add all missing fields from scraper, create delivery schedule table

-- Add missing PO header fields
ALTER TABLE purchase_orders ADD COLUMN enquiry_no TEXT;
ALTER TABLE purchase_orders ADD COLUMN enquiry_date DATE;
ALTER TABLE purchase_orders ADD COLUMN quotation_ref TEXT;
ALTER TABLE purchase_orders ADD COLUMN quotation_date DATE;
ALTER TABLE purchase_orders ADD COLUMN rc_no TEXT;
ALTER TABLE purchase_orders ADD COLUMN order_type TEXT;
ALTER TABLE purchase_orders ADD COLUMN po_status TEXT;
ALTER TABLE purchase_orders ADD COLUMN tin_no TEXT;
ALTER TABLE purchase_orders ADD COLUMN ecc_no TEXT;
ALTER TABLE purchase_orders ADD COLUMN mpct_no TEXT;
ALTER TABLE purchase_orders ADD COLUMN fob_value NUMERIC;
ALTER TABLE purchase_orders ADD COLUMN ex_rate NUMERIC;
ALTER TABLE purchase_orders ADD COLUMN currency TEXT;
ALTER TABLE purchase_orders ADD COLUMN net_po_value NUMERIC;
ALTER TABLE purchase_orders ADD COLUMN amend_no INTEGER DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN amend_1_date DATE;
ALTER TABLE purchase_orders ADD COLUMN amend_2_date DATE;
ALTER TABLE purchase_orders ADD COLUMN inspection_by TEXT;
ALTER TABLE purchase_orders ADD COLUMN inspection_at TEXT;
ALTER TABLE purchase_orders ADD COLUMN issuer_name TEXT;
ALTER TABLE purchase_orders ADD COLUMN issuer_designation TEXT;
ALTER TABLE purchase_orders ADD COLUMN issuer_phone TEXT;

-- Add missing item fields
ALTER TABLE purchase_order_items ADD COLUMN drg_no TEXT;
ALTER TABLE purchase_order_items ADD COLUMN mtrl_cat INTEGER;
ALTER TABLE purchase_order_items ADD COLUMN rcd_qty NUMERIC DEFAULT 0;
ALTER TABLE purchase_order_items ADD COLUMN item_value NUMERIC;
ALTER TABLE purchase_order_items ADD COLUMN delivered_qty NUMERIC DEFAULT 0;
ALTER TABLE purchase_order_items ADD COLUMN pending_qty NUMERIC;

-- Create delivery schedule table
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

-- Create HSN master
CREATE TABLE IF NOT EXISTS hsn_master (
    hsn_code TEXT PRIMARY KEY,
    description TEXT,
    gst_rate NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create consignee master
CREATE TABLE IF NOT EXISTS consignee_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consignee_name TEXT NOT NULL,
    consignee_gstin TEXT,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(consignee_name, consignee_gstin)
);

-- Create triggers for auto-calculation of pending_qty
CREATE TRIGGER IF NOT EXISTS calculate_pending_qty_insert
AFTER INSERT ON purchase_order_items
BEGIN
    UPDATE purchase_order_items 
    SET pending_qty = ord_qty - COALESCE(delivered_qty, 0)
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS calculate_pending_qty_update
AFTER UPDATE ON purchase_order_items
BEGIN
    UPDATE purchase_order_items 
    SET pending_qty = ord_qty - COALESCE(delivered_qty, 0)
    WHERE id = NEW.id;
END;

-- Update schema version
INSERT INTO schema_version (version, description) 
VALUES (4, 'Complete schema alignment with Sales_Manager - all 45 fields');
