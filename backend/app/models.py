"""
Pydantic Models for API Request/Response
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

# ============================================================
# PURCHASE ORDER MODELS
# ============================================================

class POHeader(BaseModel):
    """Purchase Order Header"""
    po_number: int
    po_date: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_gstin: Optional[str] = None
    supplier_code: Optional[str] = None
    supplier_phone: Optional[str] = None
    supplier_fax: Optional[str] = None
    supplier_email: Optional[str] = None
    department_no: Optional[int] = None
    
    # Reference Info
    enquiry_no: Optional[str] = None
    enquiry_date: Optional[str] = None
    quotation_ref: Optional[str] = None
    quotation_date: Optional[str] = None
    rc_no: Optional[str] = None
    order_type: Optional[str] = None
    po_status: Optional[str] = None
    
    # Financials & Tax
    tin_no: Optional[str] = None
    ecc_no: Optional[str] = None
    mpct_no: Optional[str] = None
    po_value: Optional[float] = None
    fob_value: Optional[float] = None
    ex_rate: Optional[float] = None
    currency: Optional[str] = None
    net_po_value: Optional[float] = None
    amend_no: Optional[int] = 0
    inspection_by: Optional[str] = None
    inspection_at: Optional[str] = None
    issuer_name: Optional[str] = None
    issuer_designation: Optional[str] = None
    issuer_phone: Optional[str] = None
    remarks: Optional[str] = None

class PODelivery(BaseModel):
    """Purchase Order Delivery Schedule"""
    id: Optional[str] = None
    lot_no: Optional[int] = None
    dely_qty: Optional[float] = None
    dely_date: Optional[str] = None
    entry_allow_date: Optional[str] = None
    dest_code: Optional[int] = None

class POItem(BaseModel):
    """Purchase Order Item"""
    id: Optional[str] = None
    po_item_no: int
    material_code: Optional[str] = None
    material_description: Optional[str] = None
    drg_no: Optional[str] = None
    mtrl_cat: Optional[int] = None
    unit: Optional[str] = None
    po_rate: Optional[float] = None
    ord_qty: Optional[float] = None
    rcd_qty: Optional[float] = 0
    item_value: Optional[float] = None
    hsn_code: Optional[str] = None
    delivered_qty: Optional[float] = 0
    pending_qty: Optional[float] = None
    deliveries: List['PODelivery'] = []

class POListItem(BaseModel):
    """Purchase Order List Item (Summary)"""
    po_number: int
    po_date: Optional[str] = None
    supplier_name: Optional[str] = None
    po_value: Optional[float] = None
    amend_no: Optional[int] = 0
    po_status: Optional[str] = None
    linked_dc_numbers: Optional[str] = None
    total_ordered_qty: float = 0.0
    total_dispatched_qty: float = 0.0
    total_pending_qty: float = 0.0
    created_at: Optional[str] = None

class POStats(BaseModel):
    """PO Page KPIs"""
    open_orders_count: int
    pending_approval_count: int
    total_value_ytd: float
    total_value_change: float # Mock percentage change

class PODetail(BaseModel):
    """Purchase Order Detail (Full)"""
    header: POHeader
    items: List[POItem]

# ============================================================
# DELIVERY CHALLAN MODELS
# ============================================================

class DCCreate(BaseModel):
    """Create Delivery Challan"""
    dc_number: str
    dc_date: str
    po_number: Optional[int] = None
    department_no: Optional[int] = None
    consignee_name: Optional[str] = None
    consignee_gstin: Optional[str] = None
    consignee_address: Optional[str] = None
    inspection_company: Optional[str] = None
    eway_bill_no: Optional[str] = None
    vehicle_no: Optional[str] = None
    lr_no: Optional[str] = None
    transporter: Optional[str] = None
    mode_of_transport: Optional[str] = None
    remarks: Optional[str] = None

class DCListItem(BaseModel):
    """Delivery Challan List Item"""
    dc_number: str
    dc_date: str
    po_number: Optional[int] = None
    consignee_name: Optional[str] = None
    status: Optional[str] = "Pending"
    total_value: float = 0.0
    created_at: Optional[str] = None

class DCStats(BaseModel):
    """Delivery Challan KPIs"""
    total_challans: int
    total_challans_change: float = 0.0
    pending_delivery: int
    completed_delivery: int
    completed_change: float = 0.0

# ============================================================
# INVOICE MODELS
# ============================================================

class InvoiceCreate(BaseModel):
    """Create Invoice"""
    invoice_number: str
    invoice_date: str
    linked_dc_numbers: Optional[str] = None
    po_numbers: Optional[str] = None
    customer_gstin: Optional[str] = None
    place_of_supply: Optional[str] = None
    taxable_value: Optional[float] = None
    cgst: Optional[float] = 0
    sgst: Optional[float] = 0
    igst: Optional[float] = 0
    total_invoice_value: Optional[float] = None
    remarks: Optional[str] = None

class InvoiceListItem(BaseModel):
    """Invoice List Item"""
    invoice_number: str
    invoice_date: str
    po_numbers: Optional[str] = None
    linked_dc_numbers: Optional[str] = None  # Added
    customer_gstin: Optional[str] = None     # Added
    taxable_value: Optional[float] = None    # Added
    total_invoice_value: Optional[float] = None
    created_at: Optional[str] = None

class InvoiceStats(BaseModel):
    """Invoice Page KPIs"""
    total_invoiced: float
    pending_payments: float
    gst_collected: float
    total_invoiced_change: float  # Percentage change 
    pending_payments_count: int
    gst_collected_change: float

# ============================================================
# DASHBOARD MODELS
# ============================================================

class DashboardSummary(BaseModel):
    """Dashboard KPIs"""
    total_sales_month: float
    sales_growth: float
    pending_pos: int
    new_pos_today: int
    active_challans: int
    active_challans_growth: str # e.g. "Stable"
    total_po_value: float
    po_value_growth: float

class ActivityItem(BaseModel):
    """Recent Activity Item"""
    type: str  # "PO", "DC", "Invoice"
    number: str
    date: str
    description: str
    created_at: str
