-- Migration: 003_add_drawing_number_and_po_notes
-- Description: Add drawing_number to PO items and PO notes templates
-- Applied: 2025-12-18

-- Add drawing_number to purchase_order_items
ALTER TABLE purchase_order_items ADD COLUMN drawing_number TEXT;

-- Add po_notes to delivery_challans
ALTER TABLE delivery_challans ADD COLUMN po_notes TEXT;

-- Create PO notes templates table
CREATE TABLE IF NOT EXISTS po_notes_templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for active templates
CREATE INDEX IF NOT EXISTS idx_po_notes_active ON po_notes_templates(is_active);

-- Insert sample templates
INSERT INTO po_notes_templates (id, title, content) VALUES
    ('template-001', 'Material as per drawing', 'All materials supplied as per approved engineering drawings and specifications.'),
    ('template-002', 'Subject to inspection', 'Material subject to final inspection and approval by customer quality team.'),
    ('template-003', 'Partial shipment', 'Partial shipment allowed as per delivery schedule mentioned in PO.');

-- Update schema version
INSERT INTO schema_version (version, description) VALUES 
    (3, 'Add drawing_number, po_notes, and templates table');
