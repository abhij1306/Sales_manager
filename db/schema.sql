-- Sensto Sales Manager - Database Schema
-- SQLite with WAL mode, Foreign Keys enabled

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    po_number INTEGER PRIMARY KEY,
    po_date DATE,
    supplier_name TEXT,
    supplier_gstin TEXT,
    supplier_code TEXT,
    supplier_phone TEXT,
    supplier_fax TEXT,
    supplier_email TEXT,
    department_no INTEGER,
    
    -- Reference Info
    enquiry_no TEXT,
    enquiry_date DATE,
    quotation_ref TEXT,
    quotation_date DATE,
    rc_no TEXT,
    order_type TEXT,
    po_status TEXT,
    
    -- Financials & Tax
    tin_no TEXT,
    ecc_no TEXT,
    mpct_no TEXT,
    po_value NUMERIC,
    fob_value NUMERIC,
    ex_rate NUMERIC,
    currency TEXT,
    net_po_value NUMERIC,
    
    -- Amendments
    amend_no INTEGER DEFAULT 0,
    amend_1_date DATE,
    amend_2_date DATE,
    
    -- Inspection & Issuer
    inspection_by TEXT,
    inspection_at TEXT,
    issuer_name TEXT,
    issuer_designation TEXT,
    issuer_phone TEXT,
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(po_date);
CREATE INDEX IF NOT EXISTS idx_supplier_name ON purchase_orders(supplier_name);

-- ============================================================
-- PURCHASE ORDER ITEMS (Unique items - no repetition)
-- Fields: PO ITM → ITEM VALUE
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    po_number INTEGER NOT NULL REFERENCES purchase_orders(po_number) ON DELETE CASCADE,
    po_item_no INTEGER,           -- PO ITM
    material_code TEXT,            -- MATERIAL CODE
    material_description TEXT,     -- Item description
    mtrl_cat INTEGER,              -- MTRL CAT
    unit TEXT,                     -- UNIT
    po_rate NUMERIC,               -- PO RATE
    ord_qty NUMERIC,               -- ORD QTY (total ordered)
    rcd_qty NUMERIC DEFAULT 0,     -- RCD QTY
    item_value NUMERIC,            -- ITEM VALUE
    hsn_code TEXT,                 -- HSN CODE
    delivered_qty NUMERIC DEFAULT 0,  -- Auto-calculated from deliveries
    pending_qty NUMERIC,           -- Auto-calculated
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(po_number, po_item_no)
);

CREATE INDEX IF NOT EXISTS idx_poi_po_number ON purchase_order_items(po_number);
CREATE INDEX IF NOT EXISTS idx_poi_material ON purchase_order_items(material_code);

-- ============================================================
-- PURCHASE ORDER DELIVERIES (Delivery schedule per item)
-- Fields: LOT NO → DEST CODE
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_order_deliveries (
    id TEXT PRIMARY KEY,
    po_item_id TEXT NOT NULL REFERENCES purchase_order_items(id) ON DELETE CASCADE,
    lot_no INTEGER,                -- LOT NO
    dely_qty NUMERIC,              -- DELY QTY
    dely_date DATE,                -- DELY DATE
    entry_allow_date DATE,         -- ENTRY ALLOW DATE
    dest_code INTEGER,             -- DEST CODE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pod_po_item ON purchase_order_deliveries(po_item_id);
CREATE INDEX IF NOT EXISTS idx_pod_dely_date ON purchase_order_deliveries(dely_date);

-- ============================================================
-- DELIVERY CHALLANS
-- ============================================================

CREATE TABLE IF NOT EXISTS delivery_challans (
    dc_number TEXT PRIMARY KEY,
    dc_date DATE NOT NULL,
    po_number INTEGER NOT NULL REFERENCES purchase_orders(po_number) ON DELETE CASCADE,
    department_no INTEGER,
    consignee_name TEXT,
    consignee_gstin TEXT,
    inspection_company TEXT,
    eway_bill_no TEXT,
    vehicle_no TEXT,
    mode_of_transport TEXT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dc_date ON delivery_challans(dc_date);
CREATE INDEX IF NOT EXISTS idx_dc_po_number ON delivery_challans(po_number);

-- ============================================================
-- DELIVERY CHALLAN ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS delivery_challan_items (
    id TEXT PRIMARY KEY,
    dc_number TEXT NOT NULL REFERENCES delivery_challans(dc_number) ON DELETE CASCADE,
    po_item_id TEXT NOT NULL REFERENCES purchase_order_items(id) ON DELETE CASCADE,
    dispatch_qty NUMERIC NOT NULL,
    hsn_code TEXT,
    hsn_rate NUMERIC,
    CHECK (dispatch_qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_dci_dc_number ON delivery_challan_items(dc_number);
CREATE INDEX IF NOT EXISTS idx_dci_po_item_id ON delivery_challan_items(po_item_id);

-- ============================================================
-- GST INVOICES
-- ============================================================

CREATE TABLE IF NOT EXISTS gst_invoices (
    invoice_number TEXT PRIMARY KEY,
    invoice_date DATE NOT NULL,
    linked_dc_numbers TEXT,
    taxable_value NUMERIC,
    cgst NUMERIC DEFAULT 0,
    sgst NUMERIC DEFAULT 0,
    igst NUMERIC DEFAULT 0,
    total_invoice_value NUMERIC,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_date ON gst_invoices(invoice_date);


-- ============================================================
-- HSN MASTER
-- ============================================================

CREATE TABLE IF NOT EXISTS hsn_master (
    hsn_code TEXT PRIMARY KEY,
    description TEXT,
    gst_rate NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CONSIGNEE MASTER
-- ============================================================

CREATE TABLE IF NOT EXISTS consignee_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consignee_name TEXT NOT NULL,
    consignee_gstin TEXT,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(consignee_name, consignee_gstin)
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update timestamps
CREATE TRIGGER IF NOT EXISTS update_po_timestamp
AFTER UPDATE ON purchase_orders
BEGIN
    UPDATE purchase_orders SET updated_at = CURRENT_TIMESTAMP WHERE po_number = NEW.po_number;
END;

CREATE TRIGGER IF NOT EXISTS update_poi_timestamp
AFTER UPDATE ON purchase_order_items
BEGIN
    UPDATE purchase_order_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Auto-calculate pending_qty on insert
CREATE TRIGGER IF NOT EXISTS calculate_pending_qty_insert
AFTER INSERT ON purchase_order_items
BEGIN
    UPDATE purchase_order_items 
    SET pending_qty = ord_qty - delivered_qty 
    WHERE id = NEW.id;
END;

-- Auto-calculate pending_qty on update
CREATE TRIGGER IF NOT EXISTS calculate_pending_qty_update
AFTER UPDATE ON purchase_order_items
BEGIN
    UPDATE purchase_order_items 
    SET pending_qty = ord_qty - delivered_qty 
    WHERE id = NEW.id;
END;
