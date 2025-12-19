/**
 * UI-Specific Type Definitions for Invoice Components
 * 
 * These types represent the VIEW MODEL layer - what the UI needs to display and edit.
 * They are intentionally separate from API types to allow independent evolution.
 * 
 * API Types (backend contract) → Adapters → UI Types (view model)
 */

/**
 * Invoice UI Model
 * Optimized for form editing and display
 */
export interface InvoiceUI {
    // Identity
    invoiceNumber: string;
    invoiceDate: string;

    // References
    dcNumber: string;
    poNumber?: string;

    // Buyer Information (editable in UI)
    buyer: {
        name: string;
        address: string;
        gstin: string;
        state: string;
        stateCode: string;
        placeOfSupply: string;
    };

    // Order Details (read-only from DC/PO)
    order: {
        orderNumber?: string;
        orderDate?: string;
    };

    // Transport Details (editable)
    transport: {
        vehicleNumber?: string;
        lrNumber?: string;
        transporterName?: string;
        destination?: string;
        termsOfDelivery?: string;
    };

    // Payment & Financial
    payment: {
        gemcNumber?: string;
        modeOfPayment?: string;
        paymentTerms: string; // default: "45 Days"
    };

    // Additional Documents
    documents: {
        despatchDocNumber?: string;
        srvNumber?: string;
        srvDate?: string;
    };

    // Items (computed from DC)
    items: InvoiceItemUI[];

    // Totals (computed by backend, read-only in UI)
    totals: {
        taxableValue: number;
        cgst: number;
        sgst: number;
        igst: number;
        totalInvoiceValue: number;
    };

    // Metadata
    remarks?: string;
    createdAt?: string;
}

/**
 * Invoice Item UI Model
 * Optimized for table display
 */
export interface InvoiceItemUI {
    // Display fields
    lotNumber: string;
    description: string;
    hsnCode: string;

    // Quantity & Unit
    quantity: number;
    unit: string; // "NO", "KG", etc.

    // Pricing
    rate: number;
    taxableValue: number;

    // Tax breakdown (read-only, computed by backend)
    tax: {
        cgstRate: number;
        cgstAmount: number;
        sgstRate: number;
        sgstAmount: number;
        igstRate: number;
        igstAmount: number;
    };

    // Total
    totalAmount: number;

    // Optional
    numberOfPackets?: number;
}

/**
 * Invoice Form Data
 * Used for form state management
 * NOTE: Uses snake_case to match existing component implementation
 */
export interface InvoiceFormData {
    // Auto-generated or provided
    invoice_number: string;
    invoice_date: string;

    // Required reference
    dc_number: string;
    challan_date?: string; // DC date for display

    // Buyer details (all editable)
    buyer_name: string;
    buyer_address?: string;
    buyer_gstin?: string;
    buyer_state?: string;
    buyer_state_code?: string;
    place_of_supply?: string;

    // Order details (from DC/PO)
    buyers_order_no?: string;
    buyers_order_date?: string;

    // Transport
    vehicle_no?: string;
    lr_no?: string;
    transporter?: string;
    destination?: string;
    terms_of_delivery?: string;

    // Payment
    gemc_number?: string;
    mode_of_payment?: string;
    payment_terms?: string;

    // Documents
    despatch_doc_no?: string;
    srv_no?: string;
    srv_date?: string;

    // Notes
    remarks?: string;

    // Computed totals (read-only, calculated by backend)
    taxable_value?: number;
    cgst?: number;
    sgst?: number;
    total_invoice_value?: number;
}

/**
 * Invoice List Item UI
 * Optimized for list/table display
 */
export interface InvoiceListItemUI {
    invoiceNumber: string;
    invoiceDate: string;
    buyerName: string;
    dcNumber: string;
    totalAmount: number;
    status: 'paid' | 'pending' | 'overdue';
    createdAt: string;
}

/**
 * Invoice Creation Request
 * What we send to the API
 */
export interface InvoiceCreateRequest {
    invoice_number?: string; // Optional, backend can generate
    invoice_date: string;
    dc_number: string;

    // Buyer
    buyer_name: string;
    buyer_address?: string;
    buyer_gstin?: string;
    buyer_state?: string;
    buyer_state_code?: string;
    place_of_supply?: string;

    // Order
    buyers_order_no?: string;
    buyers_order_date?: string;

    // Transport
    vehicle_no?: string;
    lr_no?: string;
    transporter?: string;
    destination?: string;
    terms_of_delivery?: string;

    // Payment
    gemc_number?: string;
    mode_of_payment?: string;
    payment_terms?: string;

    // Documents
    despatch_doc_no?: string;
    srv_no?: string;
    srv_date?: string;

    remarks?: string;
}

/**
 * Invoice Detail Response from API
 */
export interface InvoiceDetailResponse {
    header: {
        invoice_number: string;
        invoice_date: string;
        linked_dc_numbers: string;
        po_numbers?: string;
        buyer_name: string;
        buyer_address?: string;
        buyer_gstin?: string;
        buyer_state?: string;
        buyer_state_code?: string;
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
        taxable_value: number;
        cgst: number;
        sgst: number;
        igst: number;
        total_invoice_value: number;
        remarks?: string;
        created_at?: string;
    };
    items: Array<{
        po_sl_no: string;
        description: string;
        hsn_sac: string;
        quantity: number;
        unit: string;
        rate: number;
        taxable_value: number;
        cgst_rate: number;
        cgst_amount: number;
        sgst_rate: number;
        sgst_amount: number;
        igst_rate: number;
        igst_amount: number;
        total_amount: number;
        no_of_packets?: number;
    }>;
    linked_dcs?: any[];
}
