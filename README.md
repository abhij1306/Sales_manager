# Sales Manager - Purchase Order Management System

## Overview

A streamlined Purchase Order (PO) management system that automates data extraction from BHEL PO HTML files, manages delivery challans (DC), and generates GST invoices. Built with Python and Streamlit for a modern, minimal UI.

## Key Features

- **Automated PO Data Extraction**: Parse HTML PO files and extract 45 fields automatically
- **Complete Data Capture**: Header fields (30), Item fields (10), Delivery schedule (5)
- **Delivery Challan Generation**: Create DCs from PO data with Excel export
- **GST Invoice Management**: Generate tax invoices from delivery records
- **Smart Overwriting**: Re-uploading POs automatically updates existing records

## System Architecture

### Business Logic & Roles
- **User (Supplier)**: The application is designed for the usage of the Supplier (e.g., **Senstographic**).
- **Buyer**: The entities issuing the Purchase Orders (e.g., BHEL, NTPC).
- **Data Mapping**:
    - `supplier_name`: Extracted from PO, typically refers to the User (Self).
    - `issuer_name` / `inspection_at`: Used to identify the Buyer/Consignee context.
    - Application logic hides `supplier_name` in list views as it is redundant for the user.

### Project Structure
```
sales-manager/
├── app.py                 # Main entry point (Streamlit)
├── config/
│   └── database.py        # Database connection & init
├── migrations/            # SQL Schema schema
├── scraper/               # PO Extraction Logic
│   ├── po_scraper.py      # BeautifulSoup extraction
│   └── ingest_po.py       # DB Ingestion service
├── src/                   # UI Modules
│   ├── dashboard.py       # Main Dashboard
│   ├── po/                # PO List & Detail Views
│   ├── dc/                # DC Creation & List
│   └── reports/           # Analysis views
└── db/                    # SQLite Database (Ignored)
```

## Data Flow

1. **Upload**: User uploads PO HTML file via UI
2. **Scraping**: `po_scraper.py` extracts structured data from HTML
3. **Ingestion**: `ingest_po.py` validates and saves to SQLite database
4. **Display**: UI components query database and display/edit data
5. **Export**: Generate DC/GST invoices using stored PO data

## Field Extraction Logic

### Scraping Strategy

The scraper uses BeautifulSoup to parse BHEL's standardized PO HTML format:

**Header Fields** (30 fields):
- Extracted from key-value pairs in header tables
- Pattern: "Field Label: Value" or adjacent cells
- Examples: PO NUMBER, PO DATE, SUPP NAME M/S, DVN, etc.

**Item Fields** (10 fields):
- Extracted from item details table (identified by "MATERIAL CODE" header)
- Each row represents one delivery line for an item
- **Description**: Found in merged cell (1-4 cells, >30 chars) below item rows
  - Strategy: Any substantial text in low-column-count rows is the description
  - Works regardless of description content (no fragile regex patterns)
- **DRG (Drawing Number)**: PO-level field extracted from header, applied to all items

**Delivery Schedule** (5 fields):
- Multiple delivery rows per item (LOT NO, DELY QTY, DELY DATE, etc.)
- Deliveries linked to parent item via `po_item_id`

### Key Assumptions

1. **PO Format**: All POs follow BHEL's standard HTML template structure
2. **Description Location**: Item description appears as merged cell below item table
3. **Field Names**: Field labels are consistent across POs (e.g., "MATERIAL CODE", not "MAT CODE")
4. **Drawing Number**: DRG is a PO-level field, same for all items in the PO
5. **Delivery Grouping**: Multiple rows with same PO ITM represent different delivery schedules
6. **Internal Fields**: SUPPLIER GSTIN and HSN CODE are added manually (not in PO)

### Robust Design Decisions

**Description Extraction**:
- ❌ Originally used regex for "DRG NO" pattern → Failed when format varied
- ✅ Now uses structural approach: merged cells with substantial text
- This works for ANY description content, regardless of keywords

**Field Name Matching**:
- Flexible matching with `.strip()` and case-insensitive search
- Handles variations in spacing/formatting

**Date Normalization**:
- All dates converted to YYYY-MM-DD format for consistency
- Handles DD-MM-YYYY, DD/MM/YYYY, and other common formats

**Upsert Logic**:
- `ON CONFLICT(po_number) DO UPDATE` for headers
- Delete and re-insert for items/deliveries to ensure data freshness

## Field Reference Matrix

| Category | Fields | Scraper Keys | DB Columns |
|----------|--------|--------------|------------|
| **Header** | 30 | PO NUMBER, PO DATE, SUPP NAME M/S, DVN, ENQUIRY, TIN NO, ECC NO, MPCT NO, PO-VALUE, CURRENCY, etc. | `po_number`, `po_date`, `supplier_name`, `department_no`, `enquiry_no`, `tin_no`, `ecc_no`, `mpct_no`, `po_value`, `currency`, etc. |
| **Items** | 10 | PO ITM, MATERIAL CODE, DESCRIPTION, DRG, MTRL CAT, UNIT, PO RATE, ORD QTY, RCD QTY, ITEM VALUE | `po_item_no`, `material_code`, `material_description`, `drg_no`, `mtrl_cat`, `unit`, `po_rate`, `ord_qty`, `rcd_qty`, `item_value` |
| **Delivery** | 5 | LOT NO, DELY QTY, DELY DATE, ENTRY ALLOW DATE, DEST CODE | `lot_no`, `dely_qty`, `dely_date`, `entry_allow_date`, `dest_code` |
| **Internal** | 2 | N/A (manual entry) | `supplier_gstin`, `hsn_code` |

**Total**: 47 fields (45 from PO + 2 internal)

See [FIELD_VERIFICATION.md](FIELD_VERIFICATION.md) for complete field mapping details.

## Setup

### Prerequisites
- Python 3.8+
- pip

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
streamlit run app.py
```

The app will open at `http://localhost:8501`

### First-Time Setup

1. Database is created automatically on first run
2. Navigate to "Purchase Orders" → "Upload PO"
3. Upload BHEL PO HTML files
4. System will extract and save all data automatically

## Usage

### Upload Purchase Orders

1. Go to **Purchase Orders** page
2. Click **⬆ Upload PO** button
3. Select one or more PO HTML files
4. System extracts data and confirms success
5. Re-uploading same PO number updates existing record

### View PO Details

1. Select a PO from the list
2. View all 47 fields organized in tabs:
   - **Key Info**: PO basics, dates, supplier
   - **Financials & Tax**: Values, rates, tax numbers
   - **Logistics & Ref**: References, enquiry, quotation
   - **Issuer Details**: PO issuer information
3. Edit any field and click **💾 Save Changes**
4. View **Order Items** table with description, DRG, quantities, rates

### Create Delivery Challan

1. Open a PO detail view
2. Click **📄 Create DC** (top right)
3. Fill in delivery details
4. Click **Download DC** for Excel export

### Manage GST Invoices

1. Go to **GST Invoices** page
2. Create invoice from DC record
3. System auto-populates from PO + DC data
4. Add HSN code and your GSTIN
5. Generate and download invoice

## Database Schema

**Tables**:
- `purchase_orders` - PO header data (30+ fields)
- `purchase_order_items` - Item details (10+ fields)
- `purchase_order_deliveries` - Delivery schedules (5+ fields)
- `delivery_challans` - DC records
- `gst_invoices` - Tax invoices

See `migrations/v1_initial.sql` for complete schema.

## Customization

### Adding New Fields

1. **Scraper**: Add extraction logic in `po_scraper.py`
2. **Database**: Add column in `migrations/` and update schema
3. **Ingestion**: Map field in `ingest_po.py`
4. **UI**: Add display/edit field in `src/po/po_detail.py`

### Changing DC Template

Edit `src/dc/dc_service.py` → `generate_dc_excel()` function

### UI Customization

- **Theme**: Modify in `app.py` (Streamlit theme settings)
- **Layout**: Edit component files in `src/`
- **Styling**: Update inline styles or add custom CSS

## Known Limitations

1. **PO Format**: Only works with BHEL's standard HTML PO format
2. **Description**: Assumes description is in merged cell; may fail if format changes
3. **Single Currency**: Currently assumes single currency per PO
4. **No Multi-User**: SQLite-based, not designed for concurrent users

## Future Enhancements

- [ ] Support for multiple PO formats/vendors
- [ ] PDF PO parsing (currently HTML only)
- [ ] Automated DC number generation
- [ ] E-way bill integration
- [ ] Email DC/Invoice directly from app
- [ ] PostgreSQL support for multi-user scenarios
- [ ] API endpoints for integration with other systems

## Troubleshooting

**Description not showing?**
- Ensure PO HTML has merged cell with description text (>30 chars)
- Check if description row has 1-4 cells (merged cell indicator)

**Fields missing after upload?**
- Check field labels in PO HTML match expected keys
- Review `FIELD_VERIFICATION.md` for correct field names

**Database errors?**
- Delete `db/business.db` and restart app to recreate schema

## Support

For issues or questions, refer to:
- `FIELD_VERIFICATION.md` - Complete field mapping reference
- `migrations/v1_initial.sql` - Database schema documentation

## License

Internal use only.
