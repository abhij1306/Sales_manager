/**
 * UI Adapters - Transform between API types and UI types
 * 
 * This module provides bidirectional transformation functions:
 * - API Response → UI Model (for display/editing)
 * - UI Model → API Request (for submission)
 * 
 * Benefits:
 * - Decouples UI from API contract changes
 * - Centralizes field name mapping (snake_case ↔ camelCase)
 * - Provides validation and default values
 * - Enables independent evolution of frontend and backend
 */

import type {
    InvoiceUI,
    InvoiceItemUI,
    InvoiceFormData,
    InvoiceCreateRequest,
    InvoiceDetailResponse,
    DCUI,
    DCItemUIRow,
    DCFormData,
    DCCreateRequest,
    DCItemRequest,
    DCDetailResponse
} from '@/types/ui';

// ============================================================
// INVOICE ADAPTERS
// ============================================================

/**
 * Transform API invoice response to UI model
 */
export function invoiceApiToUi(response: InvoiceDetailResponse): InvoiceUI {
    const { header, items } = response;

    return {
        invoiceNumber: header.invoice_number,
        invoiceDate: header.invoice_date,
        dcNumber: header.linked_dc_numbers,
        poNumber: header.po_numbers,

        buyer: {
            name: header.buyer_name,
            address: header.buyer_address || '',
            gstin: header.buyer_gstin || '',
            state: header.buyer_state || '',
            stateCode: header.buyer_state_code || '',
            placeOfSupply: header.place_of_supply || ''
        },

        order: {
            orderNumber: header.buyers_order_no,
            orderDate: header.buyers_order_date
        },

        transport: {
            vehicleNumber: header.vehicle_no,
            lrNumber: header.lr_no,
            transporterName: header.transporter,
            destination: header.destination,
            termsOfDelivery: header.terms_of_delivery
        },

        payment: {
            gemcNumber: header.gemc_number,
            modeOfPayment: header.mode_of_payment,
            paymentTerms: header.payment_terms || '45 Days'
        },

        documents: {
            despatchDocNumber: header.despatch_doc_no,
            srvNumber: header.srv_no,
            srvDate: header.srv_date
        },

        items: items.map(invoiceItemApiToUi),

        totals: {
            taxableValue: header.taxable_value,
            cgst: header.cgst,
            sgst: header.sgst,
            igst: header.igst,
            totalInvoiceValue: header.total_invoice_value
        },

        remarks: header.remarks,
        createdAt: header.created_at
    };
}

/**
 * Transform API invoice item to UI model
 */
export function invoiceItemApiToUi(item: InvoiceDetailResponse['items'][0]): InvoiceItemUI {
    return {
        lotNumber: item.po_sl_no,
        description: item.description,
        hsnCode: item.hsn_sac,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        taxableValue: item.taxable_value,
        tax: {
            cgstRate: item.cgst_rate,
            cgstAmount: item.cgst_amount,
            sgstRate: item.sgst_rate,
            sgstAmount: item.sgst_amount,
            igstRate: item.igst_rate,
            igstAmount: item.igst_amount
        },
        totalAmount: item.total_amount,
        numberOfPackets: item.no_of_packets
    };
}

/**
 * Transform UI form data to API request
 */
export function invoiceUiToApi(formData: InvoiceFormData): InvoiceCreateRequest {
    return {
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        dc_number: formData.dc_number,

        // Buyer
        buyer_name: formData.buyer_name,
        buyer_address: formData.buyer_address,
        buyer_gstin: formData.buyer_gstin,
        buyer_state: formData.buyer_state,
        buyer_state_code: formData.buyer_state_code,
        place_of_supply: formData.place_of_supply,

        // Order
        buyers_order_no: formData.buyers_order_no,
        buyers_order_date: formData.buyers_order_date,

        // Transport
        vehicle_no: formData.vehicle_no,
        lr_no: formData.lr_no,
        transporter: formData.transporter,
        destination: formData.destination,
        terms_of_delivery: formData.terms_of_delivery,

        // Payment
        gemc_number: formData.gemc_number,
        mode_of_payment: formData.mode_of_payment,
        payment_terms: formData.payment_terms,

        // Documents
        despatch_doc_no: formData.despatch_doc_no,
        srv_no: formData.srv_no,
        srv_date: formData.srv_date,

        remarks: formData.remarks
    };
}

/**
 * Create default invoice form data
 */
export function createDefaultInvoiceForm(dcNumber?: string): InvoiceFormData {
    return {
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        dc_number: dcNumber || '',

        buyer_name: 'The Sr. Manager (CRX)',
        buyer_address: 'M/S Bharat Heavy Eletrical Ltd. Bhopal',
        buyer_gstin: '',
        buyer_state: 'Madhya Pradesh',
        buyer_state_code: '23',
        place_of_supply: 'Madhya Pradesh',

        buyers_order_no: '',
        buyers_order_date: '',

        vehicle_no: '',
        lr_no: '',
        transporter: '',
        destination: '',
        terms_of_delivery: '',

        gemc_number: '',
        mode_of_payment: '',
        payment_terms: '45 Days',

        despatch_doc_no: '',
        srv_no: '',
        srv_date: '',

        remarks: ''
    };
}

// ============================================================
// DC ADAPTERS
// ============================================================

/**
 * Transform API DC response to UI model
 */
export function dcApiToUi(response: DCDetailResponse): DCUI {
    const { header, items } = response;

    return {
        dcNumber: header.dc_number,
        dcDate: header.dc_date,
        poNumber: header.po_number,

        supplier: {
            phone: header.supplier_phone || '0755 – 4247748',
            gstin: header.supplier_gstin || '23AACFS6810L1Z7'
        },

        consignee: {
            name: header.consignee_name,
            address: header.consignee_address,
            gstin: header.consignee_gstin
        },

        departmentNumber: header.department_no,

        transport: {
            modeOfTransport: header.mode_of_transport,
            vehicleNumber: header.vehicle_no,
            transporterName: header.transporter,
            lrNumber: header.lr_no,
            ewayBillNumber: header.eway_bill_no
        },

        inspectionCompany: header.inspection_company,

        items: items.map((item, idx) => dcItemApiToUi(item, idx)),

        remarks: header.remarks,
        createdAt: header.created_at
    };
}

/**
 * Transform API DC item to UI model
 */
export function dcItemApiToUi(item: DCDetailResponse['items'][0], index: number): DCItemUIRow {
    return {
        id: `item-${index}`,
        lotNumber: item.lot_no?.toString() || (index + 1).toString(),
        description: item.material_description || '',
        orderedQuantity: item.lot_ordered_qty || 0,
        remainingQuantity: item.remaining_post_dc || 0,
        dispatchQuantity: item.dispatch_qty || 0,
        poItemId: item.po_item_id,
        hsnCode: item.hsn_code,
        hsnRate: item.hsn_rate
    };
}

/**
 * Transform UI form data to API request
 */
export function dcUiToApi(formData: DCFormData): DCCreateRequest {
    return {
        dc_number: formData.dcNumber,
        dc_date: formData.dcDate,
        po_number: formData.poNumber ? parseInt(formData.poNumber) : undefined,
        department_no: formData.departmentNo,
        consignee_name: formData.consigneeName,
        consignee_gstin: formData.consigneeGstin,
        consignee_address: formData.consigneeAddress,
        inspection_company: formData.inspectionCompany,
        eway_bill_no: formData.ewayBillNumber,
        vehicle_no: formData.vehicleNumber,
        lr_no: formData.lrNumber,
        transporter: formData.transporterName,
        mode_of_transport: formData.modeOfTransport,
        remarks: formData.remarks
    };
}

/**
 * Transform UI item to API request
 */
export function dcItemUiToApi(item: DCItemUIRow): DCItemRequest {
    return {
        po_item_id: item.poItemId,
        lot_no: item.lotNumber ? parseInt(item.lotNumber) : undefined,
        dispatch_qty: item.dispatchQuantity,
        hsn_code: item.hsnCode,
        hsn_rate: item.hsnRate
    };
}

/**
 * Create default DC form data
 */
export function createDefaultDCForm(poNumber?: number): DCFormData {
    return {
        dcNumber: '',
        dcDate: new Date().toISOString().split('T')[0],
        poNumber: poNumber?.toString(),

        supplierPhone: '0755 – 4247748',
        supplierGstin: '23AACFS6810L1Z7',

        consigneeName: 'The Sr. Manager (CRX)',
        consigneeAddress: 'M/S Bharat Heavy Eletrical Ltd. Bhopal',
        consigneeGstin: '',

        departmentNo: '',

        modeOfTransport: '',
        vehicleNumber: '',
        transporterName: '',
        lrNumber: '',
        ewayBillNumber: '',

        inspectionCompany: '',

        remarks: ''
    };
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Validate invoice form data before submission
 */
export function validateInvoiceForm(formData: InvoiceFormData): string[] {
    const errors: string[] = [];

    if (!formData.invoice_number?.trim()) {
        errors.push('Invoice number is required');
    }

    if (!formData.invoice_date) {
        errors.push('Invoice date is required');
    }

    if (!formData.dc_number?.trim()) {
        errors.push('DC number is required');
    }

    if (!formData.buyer_name?.trim()) {
        errors.push('Buyer name is required');
    }

    return errors;
}

/**
 * Validate DC form data before submission
 */
export function validateDCForm(formData: DCFormData, items: DCItemUIRow[]): string[] {
    const errors: string[] = [];

    if (!formData.dcNumber?.trim()) {
        errors.push('DC number is required');
    }

    if (!formData.dcDate) {
        errors.push('DC date is required');
    }

    if (!formData.consigneeName?.trim()) {
        errors.push('Consignee name is required');
    }

    if (!items || items.length === 0) {
        errors.push('At least one item is required');
    }

    items.forEach((item, idx) => {
        if (!item.poItemId) {
            errors.push(`Item ${idx + 1}: PO item ID is required`);
        }
        if (item.dispatchQuantity <= 0) {
            errors.push(`Item ${idx + 1}: Dispatch quantity must be positive`);
        }
    });

    return errors;
}
