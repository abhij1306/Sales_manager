-- Enhanced Invoice Schema Migration
-- Adds fields for GST Tax Invoice format

-- Add transport and order details fields
ALTER TABLE gst_invoices ADD COLUMN gemc_number TEXT;
ALTER TABLE gst_invoices ADD COLUMN mode_of_payment TEXT;
ALTER TABLE gst_invoices ADD COLUMN payment_terms TEXT DEFAULT '45 Days';
ALTER TABLE gst_invoices ADD COLUMN buyers_order_no TEXT;
ALTER TABLE gst_invoices ADD COLUMN buyers_order_date TEXT;
ALTER TABLE gst_invoices ADD COLUMN despatch_doc_no TEXT;
ALTER TABLE gst_invoices ADD COLUMN srv_no TEXT;
ALTER TABLE gst_invoices ADD COLUMN srv_date TEXT;

-- Add transport fields (moved from DC)
ALTER TABLE gst_invoices ADD COLUMN vehicle_no TEXT;
ALTER TABLE gst_invoices ADD COLUMN lr_no TEXT;
ALTER TABLE gst_invoices ADD COLUMN transporter TEXT;
ALTER TABLE gst_invoices ADD COLUMN destination TEXT;
ALTER TABLE gst_invoices ADD COLUMN terms_of_delivery TEXT;

-- Add buyer details fields
ALTER TABLE gst_invoices ADD COLUMN buyer_name TEXT;
ALTER TABLE gst_invoices ADD COLUMN buyer_address TEXT;
ALTER TABLE gst_invoices ADD COLUMN buyer_gstin TEXT;
ALTER TABLE gst_invoices ADD COLUMN buyer_state TEXT;
ALTER TABLE gst_invoices ADD COLUMN buyer_state_code TEXT;

-- Create invoice items table for itemized breakdown
CREATE TABLE IF NOT EXISTS gst_invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL,
    po_sl_no TEXT,  -- lot_no from DC
    description TEXT NOT NULL,
    hsn_sac TEXT,
    no_of_packets INTEGER,
    quantity REAL NOT NULL,
    unit TEXT DEFAULT 'NO',
    rate REAL NOT NULL,
    taxable_value REAL NOT NULL,
    cgst_rate REAL DEFAULT 9.0,
    cgst_amount REAL NOT NULL,
    sgst_rate REAL DEFAULT 9.0,
    sgst_amount REAL NOT NULL,
    igst_rate REAL DEFAULT 0.0,
    igst_amount REAL DEFAULT 0.0,
    total_amount REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_number) REFERENCES gst_invoices(invoice_number) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_no ON gst_invoice_items(invoice_number);
