# SenstoSales - Complete Project Context & Intelligence

**Version**: 2.0.0 (Stable Release)  
**Last Updated**: 2025-12-18  
**Status**: Production Ready - All Core Features Complete ✅

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Business Context](#business-context)
3. [Architecture & Tech Stack](#architecture--tech-stack)
4. [Database Schema](#database-schema)
5. [Data Pipeline](#data-pipeline)
6. [Business Logic](#business-logic)
7. [API Reference](#api-reference)
8. [Frontend Architecture](#frontend-architecture)
9. [UI/UX Guidelines](#uiux-guidelines)
10. [Development Workflow](#development-workflow)
11. [Version Control](#version-control)
12. [Debugging Guide](#debugging-guide)
13. [Testing Strategy](#testing-strategy)
14. [Deployment](#deployment)
15. [Roadmap](#roadmap)

---

## Project Overview

**SenstoSales** is a comprehensive Purchase Order (PO) management system designed for **Senstographic** (supplier) to manage purchase orders received from various buyers (BHEL, NTPC, etc.). The system handles the complete lifecycle from PO ingestion to delivery challan (DC) and GST invoice generation.

### Key Capabilities
- ✅ Bulk PO upload from HTML files
- ✅ Complete PO data extraction (45 fields)
- ✅ PO list with status tracking
- ✅ Full PO detail view and editing
- ✅ Items and delivery schedule management
- 🚧 DC generation (planned)
- 🚧 GST invoice generation (planned)

---

## Business Context

### Company Profile
- **Name**: Senstographic
- **Role**: Supplier/Vendor
- **Industry**: Manufacturing/Industrial Supplies
- **Customers**: Government PSUs (BHEL, NTPC, etc.)

### Business Flow
```
1. Receive PO (HTML format) from Buyer
   ↓
2. Upload & Extract PO data (Scraper)
   ↓
3. Store in Database (Normalized schema)
   ↓
4. Manage Items & Delivery Schedules
   ↓
5. Generate Delivery Challans (DC)
   ↓
6. Generate GST Invoices
   ↓
7. Track Payments & Reconciliation
```

### Key Business Rules
1. **PO is immutable** - Original PO data should not be modified (only amendments)
2. **Items have delivery schedules** - Each item can have multiple delivery lots
3. **DCs are created from deliveries** - One DC per delivery lot
4. **Invoices are created from DCs** - One invoice can have multiple DCs
5. **Status tracking** - PO → Active → Partially Delivered → Fully Delivered → Closed

---

## Architecture & Tech Stack

### System Architecture
```
┌─────────────────┐
│   Frontend      │  Next.js 14 (TypeScript)
│   localhost:3000│
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────┐
│   Backend API   │  FastAPI (Python)
│   localhost:8000│
└────────┬────────┘
         │ SQLAlchemy ORM
         ↓
┌─────────────────┐
│   Database      │  PostgreSQL/SQLite
│   sales.db      │
└─────────────────┘
```

### Tech Stack Details

#### Backend
- **Framework**: FastAPI 0.104+
  - Async/await support
  - Automatic OpenAPI docs
  - Type validation with Pydantic
- **ORM**: SQLAlchemy 2.0+
  - Declarative models
  - Relationship management
  - Query optimization
- **Database**: SQLite (dev), PostgreSQL (prod)
- **Scraper**: BeautifulSoup4
  - HTML parsing
  - Table extraction
  - Merged cell handling

#### Frontend
- **Framework**: Next.js 14 (App Router)
  - Server components
  - Client components with 'use client'
  - File-based routing
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
  - Utility-first approach
  - Custom color palette
  - Responsive design
- **Icons**: Lucide React
- **State**: React hooks (useState, useEffect)

#### Development Tools
- **Backend**: uvicorn (ASGI server), pytest
- **Frontend**: npm, ESLint, TypeScript compiler
- **Version Control**: Git, GitHub
- **IDE**: VS Code (recommended)

---

## Database Schema

### Entity Relationship Diagram
```
purchase_orders (1) ──< (N) po_items (1) ──< (N) po_deliveries
       │
       └──> suppliers (N:1)
       └──> customers (N:1)
```

### Table: `purchase_orders`
**Purpose**: Store PO header information  
**Primary Key**: `po_number` (VARCHAR)

#### Fields (30 total)

**Identity & References**
```sql
po_number VARCHAR(50) PRIMARY KEY  -- e.g., "1125394"
po_date DATE                       -- e.g., "2022-12-07"
amend_no INTEGER DEFAULT 0         -- Amendment number
```

**Supplier/Buyer Information** (The company issuing PO to us)
```sql
supplier_name VARCHAR(200)         -- e.g., "SENSTOGRAPHIC,H-20/21,..."
supplier_code VARCHAR(50)          -- e.g., "123456"
supplier_phone VARCHAR(50)         -- e.g., "+91-755-1234567"
supplier_fax VARCHAR(50)           -- Fax number
supplier_email VARCHAR(100)        -- Email address
```

**Department & References**
```sql
dvn VARCHAR(50)                    -- Department/Division number
enquiry_no VARCHAR(50)             -- Enquiry reference
enquiry_date DATE                  -- Enquiry date
quotation_no VARCHAR(50)           -- Quotation reference
quotation_date DATE                -- Quotation date
rc_no VARCHAR(50)                  -- RC number
rc_date DATE                       -- RC date
order_type VARCHAR(50)             -- e.g., "REGULAR", "URGENT"
po_status VARCHAR(50)              -- e.g., "Active", "Closed"
```

**Financial Fields**
```sql
po_value DECIMAL(15,2)             -- Total PO value
fob_value DECIMAL(15,2)            -- FOB value
net_po_value DECIMAL(15,2)         -- Net PO value after adjustments
```

**Tax Information**
```sql
tin_no VARCHAR(50)                 -- TIN number
ecc_no VARCHAR(50)                 -- ECC number
mpct_no VARCHAR(50)                -- MPCT number
```

**Issuer Information** (Person who issued the PO)
```sql
issuer_name VARCHAR(200)           -- Issuer name
issuer_designation VARCHAR(100)    -- Issuer designation
issuer_phone VARCHAR(50)           -- Issuer phone
```

**Quality & Notes**
```sql
inspection_by VARCHAR(200)         -- e.g., "BHEL"
remarks TEXT                       -- PO remarks/terms
```

**Audit Fields**
```sql
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### Table: `po_items`
**Purpose**: Store line items for each PO  
**Primary Key**: `id` (Auto-increment)  
**Foreign Key**: `po_number` → `purchase_orders.po_number`

#### Fields (10 total)
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
po_number VARCHAR(50) REFERENCES purchase_orders(po_number)
po_item_no INTEGER                 -- Item sequence number (1, 2, 3...)
material_code VARCHAR(100)         -- Material/Part code
material_description TEXT          -- Full description (can be multi-line)
drg_no VARCHAR(100)                -- Drawing number
unit VARCHAR(20)                   -- e.g., "NOS", "KG", "MTR"
ord_qty DECIMAL(15,3)              -- Ordered quantity
po_rate DECIMAL(15,2)              -- Rate per unit
item_value DECIMAL(15,2)           -- Total value (ord_qty * po_rate)
```

**Indexes**:
- `idx_po_items_po_number` on `po_number`
- `idx_po_items_material_code` on `material_code`

### Table: `po_deliveries`
**Purpose**: Store delivery schedule for each item  
**Primary Key**: `id` (Auto-increment)  
**Foreign Key**: `po_item_id` → `po_items.id`

#### Fields (7 total)
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
po_item_id INTEGER REFERENCES po_items(id)
lot_no INTEGER                     -- Lot/batch number
dely_qty DECIMAL(15,3)             -- Delivery quantity for this lot
dely_date DATE                     -- Scheduled delivery date
entry_allow_date DATE              -- Entry allowed from date
dest_code VARCHAR(50)              -- Destination code
```

**Indexes**:
- `idx_po_deliveries_po_item_id` on `po_item_id`
- `idx_po_deliveries_dely_date` on `dely_date`

### Master Data Tables

#### `suppliers`
```sql
id INTEGER PRIMARY KEY
supplier_code VARCHAR(50) UNIQUE
supplier_name VARCHAR(200)
gstin VARCHAR(15)                  -- Your company's GSTIN
address TEXT
phone VARCHAR(50)
email VARCHAR(100)
```

#### `customers`
```sql
id INTEGER PRIMARY KEY
customer_code VARCHAR(50) UNIQUE
customer_name VARCHAR(200)
gstin VARCHAR(15)                  -- Customer's GSTIN
address TEXT
phone VARCHAR(50)
email VARCHAR(100)
```

#### `materials`
```sql
id INTEGER PRIMARY KEY
material_code VARCHAR(100) UNIQUE
material_description TEXT
hsn_code VARCHAR(10)               -- HSN classification
unit VARCHAR(20)
standard_rate DECIMAL(15,2)
```

---

## Data Pipeline

### Overview
The data pipeline transforms HTML PO documents into structured database records through multiple stages.

### Pipeline Stages

#### Stage 1: File Upload
**Location**: `frontend/app/po/page.tsx`  
**Trigger**: User selects HTML files and clicks "Upload"

```typescript
// User action
const handleUpload = async () => {
    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('files', file);
    });
    
    const response = await fetch('/api/po/upload/batch', {
        method: 'POST',
        body: formData
    });
    
    const results = await response.json();
    // Display results to user
};
```

**Input**: Multiple HTML files (multipart/form-data)  
**Output**: FormData object sent to backend

---

#### Stage 2: File Reception & Validation
**Location**: `backend/app/routers/po.py`  
**Endpoint**: `POST /api/po/upload/batch`

```python
@router.post("/upload/batch")
async def upload_batch_pos(files: List[UploadFile] = File(...)):
    results = []
    
    for file in files:
        # Validate file type
        if not file.filename.endswith('.html'):
            results.append({
                "filename": file.filename,
                "success": False,
                "message": "Invalid file type"
            })
            continue
        
        # Read file content
        content = await file.read()
        html_content = content.decode('utf-8')
        
        # Process file
        result = await process_po_file(html_content, file.filename)
        results.append(result)
    
    return {
        "total": len(files),
        "successful": sum(1 for r in results if r["success"]),
        "failed": sum(1 for r in results if not r["success"]),
        "results": results
    }
```

**Validation**:
- File extension must be `.html`
- File must be readable UTF-8
- File size < 10MB (implicit)

---

#### Stage 3: HTML Parsing & Extraction
**Location**: `backend/app/services/po_scraper.py`  
**Function**: `scrape_po_html(html_content: str) -> dict`

**Process**:
1. Parse HTML with BeautifulSoup
2. Extract header fields from key-value tables
3. Extract items from item table
4. Extract deliveries from delivery table
5. Handle merged cells in descriptions
6. Normalize dates and numbers

```python
def scrape_po_html(html_content: str) -> dict:
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extract header
    header = extract_header_fields(soup)
    
    # Extract items
    items = extract_items_table(soup)
    
    # Extract deliveries for each item
    for item in items:
        item['deliveries'] = extract_deliveries_for_item(soup, item['po_item_no'])
    
    return {
        "header": header,
        "items": items
    }
```

**Key Extraction Logic**:

**Header Extraction**:
```python
def extract_header_fields(soup):
    header = {}
    
    # Find all tables with header data
    tables = soup.find_all('table')
    
    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            
            # Key-value pairs
            for i in range(0, len(cells)-1, 2):
                key = cells[i].get_text(strip=True)
                value = cells[i+1].get_text(strip=True)
                
                # Normalize key
                key_normalized = normalize_key(key)
                if key_normalized:
                    header[key_normalized] = value
    
    return header
```

**Item Extraction** (with merged cell handling):
```python
def extract_items_table(soup):
    items = []
    item_table = find_item_table(soup)
    
    if not item_table:
        return items
    
    rows = item_table.find_all('tr')[1:]  # Skip header
    
    current_item = None
    for row in rows:
        cells = row.find_all('td')
        
        # Check if this is a new item or continuation
        if has_item_number(cells[0]):
            # New item
            if current_item:
                items.append(current_item)
            
            current_item = {
                'po_item_no': extract_item_no(cells[0]),
                'material_code': cells[1].get_text(strip=True),
                'material_description': cells[2].get_text(strip=True),
                'drg_no': cells[3].get_text(strip=True),
                'unit': cells[4].get_text(strip=True),
                'ord_qty': parse_decimal(cells[5]),
                'po_rate': parse_decimal(cells[6]),
                'item_value': parse_decimal(cells[7])
            }
        else:
            # Merged cell - append to description
            if current_item:
                current_item['material_description'] += ' ' + cells[0].get_text(strip=True)
    
    if current_item:
        items.append(current_item)
    
    return items
```

**Delivery Extraction**:
```python
def extract_deliveries_for_item(soup, item_no):
    deliveries = []
    delivery_table = find_delivery_table_for_item(soup, item_no)
    
    if not delivery_table:
        return deliveries
    
    rows = delivery_table.find_all('tr')[1:]  # Skip header
    
    for row in rows:
        cells = row.find_all('td')
        deliveries.append({
            'lot_no': parse_int(cells[0]),
            'dely_qty': parse_decimal(cells[1]),
            'dely_date': parse_date(cells[2]),
            'entry_allow_date': parse_date(cells[3]),
            'dest_code': cells[4].get_text(strip=True)
        })
    
    return deliveries
```

**Data Normalization**:
```python
def parse_date(date_str: str) -> str:
    """Convert DD/MM/YYYY to YYYY-MM-DD"""
    if not date_str or date_str == '-':
        return None
    
    try:
        parts = date_str.split('/')
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    except:
        return None

def parse_decimal(value_str: str) -> float:
    """Remove commas and convert to float"""
    if not value_str or value_str == '-':
        return 0.0
    
    cleaned = value_str.replace(',', '').strip()
    return float(cleaned)
```

**Output**: Structured dictionary with header and items

---

#### Stage 4: Data Validation
**Location**: `backend/app/services/po_ingestion.py`  
**Function**: `validate_po_data(po_data: dict) -> tuple[bool, str]`

```python
def validate_po_data(po_data: dict) -> tuple[bool, str]:
    """Validate extracted PO data before database insertion"""
    
    # Required header fields
    required_fields = ['po_number', 'po_date', 'supplier_name']
    for field in required_fields:
        if not po_data['header'].get(field):
            return False, f"Missing required field: {field}"
    
    # Validate PO number format
    po_number = po_data['header']['po_number']
    if not po_number.isdigit():
        return False, f"Invalid PO number format: {po_number}"
    
    # Validate items
    if not po_data.get('items') or len(po_data['items']) == 0:
        return False, "PO must have at least one item"
    
    # Validate each item
    for idx, item in enumerate(po_data['items']):
        if not item.get('material_code'):
            return False, f"Item {idx+1}: Missing material code"
        
        if item.get('ord_qty', 0) <= 0:
            return False, f"Item {idx+1}: Invalid quantity"
    
    return True, "Valid"
```

---

#### Stage 5: Database Insertion
**Location**: `backend/app/services/po_ingestion.py`  
**Function**: `ingest_po_to_db(po_data: dict, db: Session) -> bool`

```python
def ingest_po_to_db(po_data: dict, db: Session) -> bool:
    """Insert PO data into database with transaction"""
    
    try:
        # Start transaction
        # 1. Insert PO header
        po = PurchaseOrder(
            po_number=po_data['header']['po_number'],
            po_date=po_data['header']['po_date'],
            supplier_name=po_data['header'].get('supplier_name'),
            supplier_code=po_data['header'].get('supplier_code'),
            # ... all other header fields
        )
        db.add(po)
        db.flush()  # Get PO ID
        
        # 2. Insert items
        for item_data in po_data['items']:
            item = POItem(
                po_number=po.po_number,
                po_item_no=item_data['po_item_no'],
                material_code=item_data.get('material_code'),
                material_description=item_data.get('material_description'),
                drg_no=item_data.get('drg_no'),
                unit=item_data.get('unit'),
                ord_qty=item_data.get('ord_qty', 0),
                po_rate=item_data.get('po_rate', 0),
                item_value=item_data.get('item_value', 0)
            )
            db.add(item)
            db.flush()  # Get item ID
            
            # 3. Insert deliveries for this item
            for delivery_data in item_data.get('deliveries', []):
                delivery = PODelivery(
                    po_item_id=item.id,
                    lot_no=delivery_data.get('lot_no'),
                    dely_qty=delivery_data.get('dely_qty', 0),
                    dely_date=delivery_data.get('dely_date'),
                    entry_allow_date=delivery_data.get('entry_allow_date'),
                    dest_code=delivery_data.get('dest_code')
                )
                db.add(delivery)
        
        # Commit transaction
        db.commit()
        return True
        
    except Exception as e:
        db.rollback()
        raise e
```

**Transaction Guarantees**:
- All-or-nothing: Either entire PO is inserted or none
- Referential integrity maintained
- Rollback on any error

---

#### Stage 6: Response & UI Update
**Location**: `backend/app/routers/po.py` → `frontend/app/po/page.tsx`

```python
# Backend response
return {
    "filename": filename,
    "success": True,
    "po_number": po_number,
    "message": f"Successfully uploaded PO {po_number}"
}
```

```typescript
// Frontend handling
if (results.successful > 0) {
    await loadPOs();  // Refresh PO list
    setUploadResults(results);  // Show results
}
```

---

### Data Flow Diagram
```
HTML File
    ↓
[Upload] → FormData
    ↓
[Validate] → Check file type
    ↓
[Parse] → BeautifulSoup → Structured Dict
    ↓
[Validate] → Check required fields
    ↓
[Transform] → Normalize dates/numbers
    ↓
[Insert] → Database Transaction
    ↓
[Response] → Success/Failure
    ↓
[UI Update] → Refresh list
```

---

## Business Logic

### PO Status Lifecycle
```
New → Active → Partially Delivered → Fully Delivered → Closed
```

**Status Transitions**:
1. **New**: PO just uploaded, no deliveries made
2. **Active**: PO confirmed, deliveries in progress
3. **Partially Delivered**: Some items delivered
4. **Fully Delivered**: All items delivered
5. **Closed**: PO completed, invoiced, and paid

### Item Value Calculation
```python
item_value = ord_qty * po_rate
```

**Business Rule**: Item value is always calculated, never manually entered

### Delivery Validation Rules
1. **Sum of delivery quantities must equal ordered quantity**
   ```python
   sum(delivery.dely_qty for delivery in item.deliveries) == item.ord_qty
   ```

2. **Delivery dates must be in sequence**
   ```python
   for i in range(len(deliveries)-1):
       assert deliveries[i].dely_date <= deliveries[i+1].dely_date
   ```

3. **Entry allow date must be before or equal to delivery date**
   ```python
   delivery.entry_allow_date <= delivery.dely_date
   ```

### Amendment Handling
**Business Rule**: Amendments create new versions, original PO is preserved

```python
# When amendment is uploaded
if existing_po:
    # Create new version
    new_po = copy(existing_po)
    new_po.amend_no += 1
    new_po.created_at = now()
    # Update changed fields only
    db.add(new_po)
```

### DC Generation Logic (Planned)
```python
def create_dc_from_delivery(delivery_id: int):
    """Create Delivery Challan from a delivery schedule"""
    
    delivery = db.query(PODelivery).get(delivery_id)
    item = delivery.po_item
    po = item.purchase_order
    
    dc = DeliveryChallan(
        dc_number=generate_dc_number(),
        dc_date=date.today(),
        po_number=po.po_number,
        po_item_no=item.po_item_no,
        material_code=item.material_code,
        material_description=item.material_description,
        quantity=delivery.dely_qty,
        unit=item.unit,
        # ... other fields
    )
    
    db.add(dc)
    db.commit()
    
    return dc
```

---

## API Reference

### Base URL
- Development: `http://localhost:8000`
- Production: `https://api.senstosales.com` (TBD)

### Authentication
**Current**: None (internal use)  
**Planned**: JWT tokens with role-based access

### Endpoints

#### Purchase Orders

##### `GET /api/po`
**Description**: List all purchase orders  
**Query Parameters**:
- `skip` (int, optional): Offset for pagination (default: 0)
- `limit` (int, optional): Max records to return (default: 100)
- `status` (string, optional): Filter by status

**Response**:
```json
[
    {
        "po_number": "1125394",
        "po_date": "2022-12-07",
        "supplier_name": "SENSTOGRAPHIC...",
        "po_value": 75200.00,
        "po_status": "Active",
        "amend_no": 0
    }
]
```

---

##### `GET /api/po/{po_number}`
**Description**: Get detailed PO with items and deliveries  
**Path Parameters**:
- `po_number` (string, required): PO number

**Response**:
```json
{
    "header": {
        "po_number": "1125394",
        "po_date": "2022-12-07",
        "supplier_name": "SENSTOGRAPHIC...",
        "supplier_code": "123456",
        // ... all 30 header fields
    },
    "items": [
        {
            "po_item_no": 1,
            "material_code": "ABC123",
            "material_description": "Widget Type A",
            "drg_no": "DRG-001",
            "unit": "NOS",
            "ord_qty": 100,
            "po_rate": 752.00,
            "item_value": 75200.00,
            "deliveries": [
                {
                    "lot_no": 1,
                    "dely_qty": 50,
                    "dely_date": "2023-01-15",
                    "entry_allow_date": "2023-01-10",
                    "dest_code": "DEST01"
                }
            ]
        }
    ]
}
```

---

##### `POST /api/po/upload/batch`
**Description**: Upload multiple PO HTML files  
**Content-Type**: `multipart/form-data`  
**Body**: Form data with `files` field (multiple files)

**Response**:
```json
{
    "total": 3,
    "successful": 2,
    "failed": 1,
    "results": [
        {
            "filename": "1125394.html",
            "success": true,
            "po_number": "1125394",
            "message": "Successfully uploaded PO 1125394"
        },
        {
            "filename": "invalid.html",
            "success": false,
            "message": "Missing required field: po_number"
        }
    ]
}
```

---

##### `PUT /api/po/{po_number}` (TODO)
**Description**: Update PO data  
**Path Parameters**:
- `po_number` (string, required): PO number

**Request Body**:
```json
{
    "header": { /* updated header fields */ },
    "items": [ /* updated items with deliveries */ ]
}
```

**Response**:
```json
{
    "success": true,
    "message": "PO updated successfully"
}
```

---

#### Dashboard

##### `GET /api/dashboard/stats`
**Description**: Get dashboard statistics

**Response**:
```json
{
    "total_pos": 150,
    "active_pos": 45,
    "total_value": 15000000.00,
    "pending_deliveries": 23,
    "recent_pos": [ /* last 5 POs */ ]
}
```

---

### Error Responses

**400 Bad Request**:
```json
{
    "detail": "Invalid PO number format"
}
```

**404 Not Found**:
```json
{
    "detail": "PO not found"
}
```

**500 Internal Server Error**:
```json
{
    "detail": "Database error: ..."
}
```

---

## Frontend Architecture

### Component Hierarchy
```
App Layout (layout.tsx)
├── Dashboard (page.tsx)
├── PO Module
│   ├── PO List (po/page.tsx)
│   └── PO Detail (po/[id]/page.tsx)
├── DC Module (planned)
└── Invoice Module (planned)
```

### State Management Strategy

**Local State** (useState):
- Form inputs
- UI toggles (edit mode, expanded items)
- Temporary data

**Server State** (fetch + useEffect):
- PO data
- Lists
- Dashboard stats

**No global state library** - Keep it simple with props and context when needed

### Key Components

#### PO List Page (`frontend/app/po/page.tsx`)
**Purpose**: Display all POs with upload functionality

**State**:
```typescript
const [pos, setPOs] = useState<POListItem[]>([]);
const [loading, setLoading] = useState(true);
const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
const [uploading, setUploading] = useState(false);
const [uploadResults, setUploadResults] = useState<BatchUploadResponse | null>(null);
```

**Key Functions**:
```typescript
// Load POs from API
const loadPOs = async () => {
    const response = await fetch('/api/po');
    const data = await response.json();
    setPOs(data);
};

// Handle file upload
const handleUpload = async () => {
    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));
    
    const response = await fetch('/api/po/upload/batch', {
        method: 'POST',
        body: formData
    });
    
    const results = await response.json();
    setUploadResults(results);
    
    if (results.successful > 0) {
        await loadPOs();
    }
};
```

---

#### PO Detail Page (`frontend/app/po/[id]/page.tsx`)
**Purpose**: Display and edit complete PO data

**State**:
```typescript
const [data, setData] = useState<PODetailData | null>(null);
const [loading, setLoading] = useState(true);
const [editMode, setEditMode] = useState(false);
const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
const [activeTab, setActiveTab] = useState("basic");
```

**Key Functions**:
```typescript
// Load PO details
useEffect(() => {
    fetch(`/api/po/${poId}`)
        .then(res => res.json())
        .then(data => {
            setData(data);
            // Expand all items by default
            const allItemNos = new Set(data.items.map(i => i.po_item_no));
            setExpandedItems(allItemNos);
        });
}, [poId]);

// Add item
const addItem = () => {
    const maxItemNo = Math.max(...data.items.map(i => i.po_item_no), 0);
    const newItem = {
        po_item_no: maxItemNo + 1,
        material_code: '',
        // ... other fields
        deliveries: []
    };
    setData({ ...data, items: [...data.items, newItem] });
};

// Remove item
const removeItem = (itemNo: number) => {
    const newItems = data.items.filter(i => i.po_item_no !== itemNo);
    setData({ ...data, items: newItems });
};

// Add delivery
const addDelivery = (itemNo: number) => {
    const newItems = data.items.map(item => {
        if (item.po_item_no === itemNo) {
            const newDelivery = {
                lot_no: (item.deliveries?.length || 0) + 1,
                // ... other fields
            };
            return {
                ...item,
                deliveries: [...(item.deliveries || []), newDelivery]
            };
        }
        return item;
    });
    setData({ ...data, items: newItems });
};
```

**Field Component** (Reusable):
```typescript
const Field = ({ label, value, field, readonly = false }) => {
    const isReadonly = readonly || field === 'po_number' || field === 'po_date';
    
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
                {label}
            </label>
            {editMode && !isReadonly ? (
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => {
                        if (field) {
                            setData({
                                ...data,
                                header: { ...data.header, [field]: e.target.value }
                            });
                        }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg !text-gray-900 bg-white"
                />
            ) : (
                <div className="text-sm text-gray-900">{value || '-'}</div>
            )}
        </div>
    );
};
```

---

## UI/UX Guidelines

### Design Principles
1. **Clean & Professional**: Minimal, business-focused
2. **Data-Dense**: Maximum information, minimal clutter
3. **Inline Editing**: Edit in place, no separate forms
4. **Color Coding**: Semantic colors for status and actions
5. **Responsive**: Desktop and tablet support

### Color Palette
```css
/* Primary Actions */
--color-primary: #2563eb;        /* Blue */
--color-primary-hover: #1d4ed8;

/* Success/Add */
--color-success: #16a34a;        /* Green */
--color-success-hover: #15803d;

/* Danger/Delete */
--color-danger: #dc2626;         /* Red */
--color-danger-hover: #b91c1c;

/* Status Colors */
--status-active: #10b981;        /* Green */
--status-closed: #6b7280;        /* Gray */
--status-new: #3b82f6;           /* Blue */

/* Text Colors */
--text-primary: #111827;         /* Gray-900 */
--text-secondary: #6b7280;       /* Gray-500 */
--text-muted: #9ca3af;           /* Gray-400 */
```

### Typography Scale
```css
/* Headers */
.header-lg { font-size: 1.125rem; font-weight: 600; }  /* 18px */
.header-md { font-size: 1rem; font-weight: 600; }      /* 16px */
.header-sm { font-size: 0.875rem; font-weight: 600; }  /* 14px */

/* Body */
.body-md { font-size: 0.875rem; }                      /* 14px */
.body-sm { font-size: 0.75rem; }                       /* 12px */

/* Labels */
.label { font-size: 0.75rem; font-weight: 500; }       /* 12px */
```

### Component Patterns

**Status Badge**:
```tsx
<span className={`px-2 py-1 rounded-full text-xs font-medium ${
    status === 'Active' ? 'bg-green-100 text-green-800' :
    status === 'Closed' ? 'bg-gray-100 text-gray-800' :
    'bg-blue-100 text-blue-800'
}`}>
    {status}
</span>
```

**Action Button**:
```tsx
<button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
    Action
</button>
```

**Delete Button**:
```tsx
<button className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
    Delete
</button>
```

**Input Field**:
```tsx
<input
    type="text"
    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 !text-gray-900 bg-white"
/>
```

### Layout Patterns

**Tab Navigation**:
```tsx
<div className="flex gap-2 border-b border-gray-200 mb-4">
    {tabs.map(tab => (
        <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
            {tab.label}
        </button>
    ))}
</div>
```

**Grid Layout** (Responsive):
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {/* Fields */}
</div>
```

---

## Development Workflow

### Local Development Setup

1. **Clone Repository**
```bash
git clone https://github.com/your-org/SenstoSales.git
cd SenstoSales
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Database Setup**
```bash
# Create database directory
mkdir -p database

# Run migrations
python -c "from app.database import init_db; init_db()"
```

4. **Frontend Setup**
```bash
cd frontend
npm install
```

5. **Environment Variables**

**Backend** (`.env`):
```env
DATABASE_URL=sqlite:///./database/sales.db
CORS_ORIGINS=http://localhost:3000
```

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

6. **Run Development Servers**

Terminal 1 (Backend):
```bash
cd backend
uvicorn app.main:app --reload
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

7. **Access Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

### Development Best Practices

#### Code Style

**Python (Backend)**:
- Follow PEP 8
- Use type hints
- Max line length: 100 characters
- Use async/await for I/O operations

```python
# Good
async def get_po(po_number: str, db: Session) -> Optional[PurchaseOrder]:
    return db.query(PurchaseOrder).filter(
        PurchaseOrder.po_number == po_number
    ).first()

# Bad
def get_po(po_number, db):
    return db.query(PurchaseOrder).filter(PurchaseOrder.po_number == po_number).first()
```

**TypeScript (Frontend)**:
- Use TypeScript strict mode
- Prefer functional components
- Use hooks (useState, useEffect)
- Avoid `any` type

```typescript
// Good
interface POListItem {
    po_number: string;
    po_date: string;
    po_value: number;
}

const [pos, setPOs] = useState<POListItem[]>([]);

// Bad
const [pos, setPOs] = useState<any>([]);
```

#### Naming Conventions

**Python**:
- Variables/functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

**TypeScript**:
- Variables/functions: `camelCase`
- Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

**Database**:
- Tables: `snake_case` (plural)
- Columns: `snake_case`
- Indexes: `idx_table_column`

#### Error Handling

**Backend**:
```python
from fastapi import HTTPException

@router.get("/po/{po_number}")
async def get_po(po_number: str, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.po_number == po_number
    ).first()
    
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    return po
```

**Frontend**:
```typescript
const loadPO = async () => {
    try {
        const response = await fetch(`/api/po/${poId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        setData(data);
    } catch (error) {
        console.error("Failed to load PO:", error);
        alert("Failed to load PO. Please try again.");
    } finally {
        setLoading(false);
    }
};
```

---

## Version Control

### Git Workflow

**Branch Strategy**:
```
main (production-ready)
  ↑
develop (integration)
  ↑
feature/feature-name (development)
```

**Branch Naming**:
- Features: `feature/add-dc-generation`
- Fixes: `fix/po-upload-validation`
- Hotfixes: `hotfix/critical-bug`
- Releases: `release/v1.1.0`

### Commit Message Format
```
<type>: <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples**:
```bash
feat: add bulk PO upload functionality

Implemented batch upload endpoint that accepts multiple HTML files
and processes them in parallel. Added progress tracking and detailed
error reporting.

Closes #123

---

fix: correct item value calculation

Item value was not being calculated correctly when rate had decimals.
Changed from integer to decimal type.

---

docs: update API documentation

Added examples for all endpoints and error responses.
```

### Git Commands Reference

**Create Feature Branch**:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

**Commit Changes**:
```bash
git add .
git commit -m "feat: add new feature"
```

**Push to Remote**:
```bash
git push origin feature/my-feature
```

**Create Pull Request**:
```bash
# On GitHub, create PR from feature branch to develop
# Request review, wait for approval, then merge
```

**Update from Develop**:
```bash
git checkout develop
git pull origin develop
git checkout feature/my-feature
git merge develop
# Resolve conflicts if any
git push origin feature/my-feature
```

**Tag Release**:
```bash
git checkout main
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### .gitignore
```gitignore
# Python
__pycache__/
*.py[cod]
*.so
.Python
venv/
*.egg-info/

# Database
*.db
*.sqlite
database/*.db

# Environment
.env
.env.local

# Node
node_modules/
.next/
out/

# Test files
tests/
*.html
*.xls

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
```

---

## Debugging Guide

### Backend Debugging

#### Enable Debug Logging
```python
# app/main.py
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

@app.get("/api/po/{po_number}")
async def get_po(po_number: str):
    logger.debug(f"Fetching PO: {po_number}")
    # ... rest of code
```

#### Interactive Debugging (VS Code)
**launch.json**:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: FastAPI",
            "type": "python",
            "request": "launch",
            "module": "uvicorn",
            "args": [
                "app.main:app",
                "--reload",
                "--host", "0.0.0.0",
                "--port", "8000"
            ],
            "jinja": true,
            "justMyCode": false
        }
    ]
}
```

#### Database Debugging
```python
# Enable SQL echo
from sqlalchemy import create_engine

engine = create_engine(
    DATABASE_URL,
    echo=True  # Print all SQL queries
)
```

#### Common Issues

**Issue**: Database locked
```bash
# Solution: Close all connections
rm database/sales.db
python -c "from app.database import init_db; init_db()"
```

**Issue**: CORS errors
```python
# Solution: Update CORS origins in main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Frontend Debugging

#### React DevTools
1. Install React DevTools extension
2. Open browser DevTools
3. Go to "Components" tab
4. Inspect component state and props

#### Network Debugging
```typescript
// Add detailed logging
const loadPO = async () => {
    console.log('Loading PO:', poId);
    
    const response = await fetch(`/api/po/${poId}`);
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    setData(data);
};
```

#### Common Issues

**Issue**: Data not updating
```typescript
// Solution: Check dependencies in useEffect
useEffect(() => {
    loadPO();
}, [poId]);  // Add dependencies
```

**Issue**: State not updating immediately
```typescript
// Solution: Use functional update
setData(prevData => ({
    ...prevData,
    items: [...prevData.items, newItem]
}));
```

**Issue**: Text not visible in inputs
```css
/* Solution: Force text color */
.input {
    @apply !text-gray-900 bg-white;
}
```

---

### Performance Debugging

#### Backend Profiling
```python
import time

@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    print(f"{request.url.path}: {process_time:.3f}s")
    return response
```

#### Frontend Performance
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
    // Component logic
});

// Use useMemo for expensive calculations
const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.po_item_no - b.po_item_no);
}, [items]);
```

---

## Testing Strategy

### Backend Testing

#### Unit Tests (pytest)
```python
# tests/test_po_scraper.py
import pytest
from app.services.po_scraper import scrape_po_html

def test_scrape_po_html():
    with open('tests/1125394.html', 'r') as f:
        html_content = f.read()
    
    result = scrape_po_html(html_content)
    
    assert result['header']['po_number'] == '1125394'
    assert len(result['items']) > 0
    assert result['items'][0]['material_code'] is not None
```

#### Integration Tests
```python
# tests/test_api.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_po_list():
    response = client.get("/api/po")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_upload_po():
    with open('tests/1125394.html', 'rb') as f:
        response = client.post(
            "/api/po/upload/batch",
            files={"files": ("1125394.html", f, "text/html")}
        )
    
    assert response.status_code == 200
    result = response.json()
    assert result['successful'] == 1
```

#### Run Tests
```bash
cd backend
pytest tests/ -v
pytest tests/ --cov=app  # With coverage
```

---

### Frontend Testing

#### Component Tests (Jest + React Testing Library)
```typescript
// __tests__/POList.test.tsx
import { render, screen } from '@testing-library/react';
import POList from '@/app/po/page';

test('renders PO list', async () => {
    render(<POList />);
    
    const heading = screen.getByText(/Purchase Orders/i);
    expect(heading).toBeInTheDocument();
});
```

#### Run Tests
```bash
cd frontend
npm test
npm test -- --coverage  # With coverage
```

---

### Manual Testing Checklist

**PO Upload**:
- [ ] Upload single HTML file
- [ ] Upload multiple HTML files
- [ ] Upload invalid file (should show error)
- [ ] Upload duplicate PO (should handle gracefully)

**PO List**:
- [ ] List displays all POs
- [ ] Status badges show correct colors
- [ ] Click PO number navigates to detail

**PO Detail**:
- [ ] All header fields display correctly
- [ ] All tabs work
- [ ] Items table shows all columns
- [ ] Delivery schedules expand/collapse
- [ ] Edit mode enables all fields
- [ ] Add item button works
- [ ] Delete item button works
- [ ] Add delivery button works
- [ ] Delete delivery button works

---

## Deployment

### Production Deployment (TODO)

#### Backend Deployment
```bash
# Use Gunicorn with Uvicorn workers
gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000
```

#### Frontend Deployment
```bash
# Build production bundle
npm run build

# Start production server
npm start
```

#### Database Migration
```bash
# Use Alembic for migrations
alembic revision --autogenerate -m "Add new field"
alembic upgrade head
```

#### Environment Variables (Production)
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
CORS_ORIGINS=https://senstosales.com
SECRET_KEY=your-secret-key
```

---

## Roadmap

### Phase 1: Core PO Management ✅ (COMPLETE)
- [x] Database schema with all 45 fields
- [x] Bulk PO upload
- [x] PO list with status badges
- [x] PO detail view with all fields
- [x] Complete edit functionality
- [x] Add/delete items and deliveries
- [x] DRG field in items

### Phase 2: Save & Validation (NEXT)
- [ ] Implement `PUT /api/po/{po_number}` endpoint
- [ ] Save edited PO data to database
- [ ] Client-side validation (required fields, formats)
- [ ] Server-side validation
- [ ] Optimistic UI updates
- [ ] Undo/redo functionality

### Phase 3: Delivery Challan
- [ ] DC data model and schema
- [ ] Create DC from delivery schedule
- [ ] DC list page
- [ ] DC detail/edit page
- [ ] DC PDF generation
- [ ] DC status tracking

### Phase 4: GST Invoice
- [ ] Invoice data model and schema
- [ ] Create invoice from DC
- [ ] Invoice list page
- [ ] Invoice detail/edit page
- [ ] GST calculations (CGST, SGST, IGST)
- [ ] Invoice PDF generation
- [ ] E-way bill integration

### Phase 5: Reports & Analytics
- [ ] Dashboard with KPIs
- [ ] PO status reports
- [ ] Delivery tracking reports
- [ ] Financial reports
- [ ] Export to Excel
- [ ] Charts and visualizations

### Phase 6: Advanced Features
- [ ] User authentication (JWT)
- [ ] Role-based access control
- [ ] Audit trail
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] API rate limiting

---

## Appendix

### Field Mapping Reference

See original FIELD_VERIFICATION.md for complete mapping of all 45 fields from HTML to database.

### Database Indexes
```sql
-- Performance indexes
CREATE INDEX idx_po_date ON purchase_orders(po_date);
CREATE INDEX idx_po_status ON purchase_orders(po_status);
CREATE INDEX idx_po_items_po_number ON po_items(po_number);
CREATE INDEX idx_po_items_material_code ON po_items(material_code);
CREATE INDEX idx_po_deliveries_po_item_id ON po_deliveries(po_item_id);
CREATE INDEX idx_po_deliveries_dely_date ON po_deliveries(dely_date);
```

### Useful SQL Queries

**Get PO with items and deliveries**:
```sql
SELECT 
    po.*,
    json_agg(
        json_build_object(
            'item', i.*,
            'deliveries', (
                SELECT json_agg(d.*)
                FROM po_deliveries d
                WHERE d.po_item_id = i.id
            )
        )
    ) as items
FROM purchase_orders po
LEFT JOIN po_items i ON i.po_number = po.po_number
WHERE po.po_number = '1125394'
GROUP BY po.po_number;
```

**Get pending deliveries**:
```sql
SELECT 
    po.po_number,
    i.material_code,
    d.dely_date,
    d.dely_qty
FROM po_deliveries d
JOIN po_items i ON i.id = d.po_item_id
JOIN purchase_orders po ON po.po_number = i.po_number
WHERE d.dely_date >= CURRENT_DATE
ORDER BY d.dely_date;
```

---

**End of Document**

This CONTEXT.md serves as the complete reference for building and maintaining SenstoSales from this baseline version forward.
