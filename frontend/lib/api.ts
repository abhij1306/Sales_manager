// API client for backend communication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface POListItem {
    po_number: number;
    po_date: string | null;
    supplier_name: string | null;
    po_value: number | null;
    amend_no: number;
    po_status?: string;
    created_at: string | null;
}

export interface POHeader {
    po_number: number;
    po_date: string | null;
    supplier_name: string | null;
    supplier_code: string | null;
    po_value: number | null;
    // ... add other fields as needed
}

export interface POItem {
    po_item_no: number;
    material_code: string | null;
    material_description: string | null;
    ord_qty: number | null;
    po_rate: number | null;
    item_value: number | null;
}

export interface PODetail {
    header: POHeader;
    items: POItem[];
}

export interface DashboardSummary {
    total_pos: number;
    total_dcs: number;
    total_invoices: number;
    total_po_value: number;
}

export interface ActivityItem {
    type: string;
    number: string;
    date: string;
    description: string;
    created_at: string;
}

export interface DCListItem {
    dc_number: string;
    dc_date: string;
    po_number: number | null;
    consignee_name: string | null;
    created_at: string | null;
}

export interface InvoiceListItem {
    invoice_number: string;
    invoice_date: string;
    po_numbers: string | null;
    total_invoice_value: number | null;
    created_at: string | null;
}

// API Functions
export const api = {
    // Dashboard
    async getDashboardSummary(): Promise<DashboardSummary> {
        const res = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
        if (!res.ok) throw new Error('Failed to fetch dashboard summary');
        return res.json();
    },

    async getRecentActivity(limit = 10): Promise<ActivityItem[]> {
        const res = await fetch(`${API_BASE_URL}/api/activity?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch activity');
        return res.json();
    },

    // Purchase Orders
    async listPOs(): Promise<POListItem[]> {
        const res = await fetch(`${API_BASE_URL}/api/po/`);
        if (!res.ok) throw new Error('Failed to fetch POs');
        return res.json();
    },

    async getPODetail(poNumber: number): Promise<PODetail> {
        const res = await fetch(`${API_BASE_URL}/api/po/${poNumber}`);
        if (!res.ok) throw new Error('Failed to fetch PO detail');
        return res.json();
    },

    async uploadPOHTML(file: File): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE_URL}/api/po/upload`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload PO');
        return res.json();
    },

    // Delivery Challans
    async listDCs(poNumber?: number): Promise<DCListItem[]> {
        const url = poNumber
            ? `${API_BASE_URL}/api/dc/?po=${poNumber}`
            : `${API_BASE_URL}/api/dc/`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch DCs');
        return res.json();
    },

    // Invoices
    async listInvoices(poNumber?: number, dcNumber?: string): Promise<InvoiceListItem[]> {
        let url = `${API_BASE_URL}/api/invoice/`;
        if (poNumber) url += `?po=${poNumber}`;
        else if (dcNumber) url += `?dc=${dcNumber}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch invoices');
        return res.json();
    },
};
