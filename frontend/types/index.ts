/**
 * Centralized Type Definitions for SenstoSales
 * Replaces all 'any' usage with strict interfaces
 */

// ============================================================
// PURCHASE ORDER TYPES
// ============================================================

export interface PODelivery {
    id?: string;
    lot_no?: number;
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
    ord_qty?: number;
    rcd_qty?: number;
    item_value?: number;
    hsn_code?: string;
    delivered_qty?: number;
    pending_qty?: number;
    deliveries: PODelivery[];
}

export interface POHeader {
    po_number: number;
    po_date?: string;
    supplier_name?: string;
    supplier_gstin?: string;
    supplier_code?: string;
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
    lot_ordered_qty?: number;
    ordered_qty?: number;
    already_dispatched?: number;
    remaining_qty?: number;
    dispatch_qty?: number; // API field
    dispatch_quantity: number; // UI field (primary)
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
}

export interface DCDetail {
    header: DCHeader;
    items: DCItemRow[];
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
