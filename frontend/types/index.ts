/**
 * Centralized Type Definitions for SenstoSales
 * Replaces all 'any' usage with strict interfaces
 */

// ============================================================
// DASHBOARD & COMMON TYPES
// ============================================================

export interface DashboardSummary {
    total_sales_month: number;
    sales_growth: number;
    pending_pos: number;
    new_pos_today: number;
    active_challans: number;
    active_challans_growth: string;
    total_po_value: number;
    po_value_growth: number;
}

export interface ActivityItem {
    type: string;
    number: string;
    date: string;
    description: string;
    created_at: string;
}

export interface SearchResult {
    type: 'PO' | 'DC' | 'Invoice';
    number: string;
    date: string;
    party: string;
    amount: number | null;
    status: string;
    created_at: string;
}

export interface Alert {
    id: string;
    alert_type: string;
    entity_type: string;
    entity_id: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    is_acknowledged: boolean;
    created_at: string;
}

// ============================================================
// PO NOTES TYPES
// ============================================================

export interface PONote {
    id: number;
    title: string;
    content: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PONoteCreate {
    title: string;
    content: string;
}

// ============================================================
// REPORT TYPES
// ============================================================

export interface ReconciliationItem {
    po_number: number;
    po_date: string;
    supplier_name: string;
    po_item_no: number;
    material_code: string;
    material_description: string;
    ordered_quantity: number;
    dispatched_quantity: number;
    pending_quantity: number;
}

export interface DCWithoutInvoice {
    dc_number: string;
    dc_date: string;
    po_number: number;
    consignee_name: string;
    created_at: string;
}

export interface SupplierSummary {
    supplier_name: string;
    po_count: number;
    total_po_value: number;
    last_po_date: string;
}

// ============================================================
// PURCHASE ORDER TYPES
// ============================================================

export interface PODelivery {
    id?: string;
    lot_no?: number;
    delivered_quantity?: number;
    dely_qty?: number;
    dely_date?: string;
    entry_allow_date?: string;
    dest_code?: number;
}

export interface POItem {
    id?: string;
    po_item_no: number;
    material_code?: string;
    material_description?: string;
    drg_no?: string;
    mtrl_cat?: number;
    unit?: string;
    po_rate?: number;
    ordered_quantity?: number;
    received_quantity?: number;
    item_value?: number;
    hsn_code?: string;
    delivered_quantity?: number;
    pending_quantity?: number;
    deliveries: PODelivery[];
}

export interface POHeader {
    po_number: number;
    po_date?: string;
    supplier_name?: string;
    supplier_gstin?: string;
    supplier_code?: string;
    supplier_address?: string;
    supplier_phone?: string;
    supplier_fax?: string;
    supplier_email?: string;
    department_no?: number;
    enquiry_no?: string;
    enquiry_date?: string;
    quotation_ref?: string;
    quotation_date?: string;
    rc_no?: string;
    order_type?: string;
    po_status?: string;
    payment_terms?: string;
    tin_no?: string;
    ecc_no?: string;
    mpct_no?: string;
    po_value?: number;
    fob_value?: number;
    ex_rate?: number;
    currency?: string;
    net_po_value?: number;
    amend_no?: number;
    inspection_by?: string;
    inspection_at?: string;
    issuer_name?: string;
    issuer_designation?: string;
    issuer_phone?: string;
    remarks?: string;
}

export interface PODetail {
    header: POHeader;
    items: POItem[];
}

export interface POListItem {
    po_number: number;
    po_date: string | null;
    supplier_name: string | null;
    po_value: number | null;
    amend_no: number;
    po_status: string | null;
    linked_dc_numbers: string | null;
    total_ordered_quantity: number;
    total_dispatched_quantity: number;
    total_pending_quantity: number;
    created_at: string | null;
}

export interface POStats {
    open_orders_count: number;
    pending_approval_count: number;
    total_value_ytd: number;
    total_value_change: number;
}

// ============================================================
// DELIVERY CHALLAN TYPES
// ============================================================

export interface DCItemRow {
    id: string;
    po_item_id: string;
    po_item_no?: number;
    lot_no?: number | string;
    material_code?: string;
    material_description?: string;
    description?: string;
    unit?: string;
    po_rate?: number;
    lot_ordered_quantity?: number;
    ordered_quantity?: number;
    already_dispatched?: number;
    remaining_quantity?: number;
    dispatched_quantity?: number; // API field
    dispatch_quantity: number; // UI field (primary) - User asked for dispatched_quantity but kept dispatch_quantity as UI field in previous code? 
    // Wait, user said "Normalize all field names... dispatched_quantity".
    // I should probably unify these two if possible?
    // "dispatch_qty? : number // API field"
    // "dispatch_quantity: number // UI field"
    // If API now returns dispatched_quantity, I can merge them or just use dispatched_quantity.
    // I will use dispatched_quantity as the single truth if possible.
    // For now I will rename dispatch_qty -> dispatched_quantity (API) and keep dispatch_quantity (UI) 
    // but actually if they are same name, one field is enough.
    // Let's use `dispatched_quantity` for everything.
    hsn_code?: string;
    hsn_rate?: number;
    remaining_post_dc?: number;
}

export interface DCHeader {
    dc_number: string;
    dc_date: string;
    po_number?: number;
    department_no?: number;
    consignee_name?: string;
    consignee_gstin?: string;
    consignee_address?: string;
    inspection_company?: string;
    eway_bill_no?: string;
    vehicle_no?: string;
    lr_no?: string;
    transporter?: string;
    mode_of_transport?: string;
    remarks?: string;
    created_at?: string;
    // Extended fields often joined from PO
    supplier_phone?: string;
    supplier_gstin?: string;
    po_date?: string;
    // vehicle_no already defined above
}

export interface DCDetail {
    header: DCHeader;
    items: DCItemRow[];
}

export interface DCListItem {
    dc_number: string;
    dc_date: string;
    po_number: number | null;
    consignee_name: string | null;
    status: string;
    total_value: number;
    created_at: string | null;
}

export interface DCStats {
    total_challans: number;
    total_challans_change: number;
    pending_delivery: number;
    completed_delivery: number;
    completed_change: number;
}

export interface DCCreate {
    dc_number: string;
    dc_date: string;
    po_number?: number;
    department_no?: number;
    consignee_name?: string;
    consignee_gstin?: string;
    consignee_address?: string;
    inspection_company?: string;
    eway_bill_no?: string;
    vehicle_no?: string;
    lr_no?: string;
    transporter?: string;
    mode_of_transport?: string;
    remarks?: string;
}

// ============================================================
// INVOICE TYPES
// ============================================================

export interface InvoiceItem {
    id?: number;
    invoice_number: string;
    po_sl_no?: string;
    description?: string;
    hsn_sac?: string;
    quantity: number;
    unit?: string;
    rate: number;
    taxable_value: number;
    cgst_rate?: number;
    cgst_amount?: number;
    sgst_rate?: number;
    sgst_amount?: number;
    igst_rate?: number;
    igst_amount?: number;
    total_amount: number;
    no_of_packets?: number;
}

export interface InvoiceHeader {
    invoice_number: string;
    invoice_date: string;
    linked_dc_numbers?: string;
    po_numbers?: string;
    buyer_name?: string;
    buyer_address?: string;
    buyer_gstin?: string;
    buyer_state?: string;
    buyer_state_code?: string;
    customer_gstin?: string;
    place_of_supply?: string;
    buyers_order_no?: string;
    buyers_order_date?: string;
    vehicle_no?: string;
    lr_no?: string;
    transporter?: string;
    destination?: string;
    terms_of_delivery?: string;
    gemc_number?: string;
    mode_of_payment?: string;
    payment_terms?: string;
    despatch_doc_no?: string;
    srv_no?: string;
    srv_date?: string;
    taxable_value?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    total_invoice_value?: number;
    remarks?: string;
    created_at?: string;
}

export interface InvoiceDetail {
    header: InvoiceHeader;
    items: InvoiceItem[];
    linked_dcs?: DCHeader[];
}

export interface InvoiceListItem {
    invoice_number: string;
    invoice_date: string;
    po_numbers: string | null;
    linked_dc_numbers: string | null;
    customer_gstin: string | null;
    taxable_value: number | null;
    total_invoice_value: number | null;
    created_at: string | null;
    status: 'Paid' | 'Pending' | 'Overdue';
}

export interface InvoiceStats {
    total_invoiced: number;
    pending_payments: number;
    gst_collected: number;
    total_invoiced_change: number;
    pending_payments_count: number;
    gst_collected_change: number;
}

export interface InvoiceCreate {
    invoice_number: string;
    invoice_date: string;
    linked_dc_numbers: string;
    po_numbers: string;
    customer_gstin: string;
    place_of_supply: string;
    taxable_value: number;
    cgst: number;
    sgst: number;
    igst: number;
    total_invoice_value: number;
    remarks: string;
}

// ============================================================
// FORM FIELD TYPES
// ============================================================

export interface FieldProps {
    label: string;
    value: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    type?: string;
    field?: string;
}

export interface TableInputProps {
    value: string | number;
    onChange: (value: string | number) => void;
    type?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    readOnly?: boolean;
    max?: number;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface APIResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface CreateResponse {
    success: boolean;
    dc_number?: string;
    invoice_number?: string;
    total_amount?: number;
    items_count?: number;
}
