/**
 * UI-Specific Type Definitions for DC Components
 * 
 * These types represent the VIEW MODEL layer for Delivery Challans.
 * Separate from API types to allow independent evolution.
 */

/**
 * DC UI Model
 * Optimized for form editing and display
 */
export interface DCUI {
    // Identity
    dcNumber: string;
    dcDate: string;

    // Reference
    poNumber?: number;

    // Supplier Information
    supplier: {
        phone: string;
        gstin: string;
    };

    // Consignee Information
    consignee: {
        name: string;
        address: string;
        gstin?: string;
    };

    // Department
    departmentNumber?: string;

    // Transport Details
    transport: {
        modeOfTransport?: string;
        vehicleNumber?: string;
        transporterName?: string;
        lrNumber?: string;
        ewayBillNumber?: string;
    };

    // Inspection
    inspectionCompany?: string;

    // Items
    items: DCItemUIRow[];

    // Notes
    remarks?: string;

    // Metadata
    createdAt?: string;
    hasInvoice?: boolean;
    invoiceNumber?: string;
}

/**
 * DC Item UI Row
 * Optimized for table editing
 */
export interface DCItemUIRow {
    id: string; // Local UI identifier
    lotNumber: string;
    description: string;
    orderedQuantity: number;
    remainingQuantity: number;
    dispatchQuantity: number;
    poItemId: string;
    hsnCode?: string;
    hsnRate?: number;
}

/**
 * DC Form Data
 * Used for form state management
 */
export interface DCFormData {
    dcNumber: string;
    dcDate: string;
    poNumber?: string;

    // Supplier
    supplierPhone: string;
    supplierGstin: string;

    // Consignee
    consigneeName: string;
    consigneeAddress: string;
    consigneeGstin?: string;

    // Department
    departmentNo?: string;

    // Transport
    modeOfTransport?: string;
    vehicleNumber?: string;
    transporterName?: string;
    lrNumber?: string;
    ewayBillNumber?: string;

    // Inspection
    inspectionCompany?: string;

    // Notes
    remarks?: string;
}

/**
 * DC List Item UI
 * Optimized for list/table display
 */
export interface DCListItemUI {
    dcNumber: string;
    dcDate: string;
    poNumber?: number;
    consigneeName: string;
    status: 'pending' | 'delivered';
    totalValue: number;
    createdAt: string;
}

/**
 * DC Creation Request
 * What we send to the API
 */
export interface DCCreateRequest {
    dc_number: string;
    dc_date: string;
    po_number?: number;
    department_no?: string;
    consignee_name: string;
    consignee_gstin?: string;
    consignee_address: string;
    inspection_company?: string;
    eway_bill_no?: string;
    vehicle_no?: string;
    lr_no?: string;
    transporter?: string;
    mode_of_transport?: string;
    remarks?: string;
}

/**
 * DC Item for API
 */
export interface DCItemRequest {
    po_item_id: string;
    lot_no?: number;
    dispatch_qty: number;
    hsn_code?: string;
    hsn_rate?: number;
}

/**
 * DC Detail Response from API
 */
export interface DCDetailResponse {
    header: {
        dc_number: string;
        dc_date: string;
        po_number?: number;
        department_no?: string;
        consignee_name: string;
        consignee_gstin?: string;
        consignee_address: string;
        supplier_phone?: string;
        supplier_gstin?: string;
        inspection_company?: string;
        eway_bill_no?: string;
        vehicle_no?: string;
        lr_no?: string;
        transporter?: string;
        mode_of_transport?: string;
        remarks?: string;
        created_at?: string;
    };
    items: Array<{
        lot_no?: number;
        material_description?: string;
        lot_ordered_qty?: number;
        remaining_post_dc?: number;
        dispatch_qty?: number;
        po_item_id: string;
        hsn_code?: string;
        hsn_rate?: number;
    }>;
}
