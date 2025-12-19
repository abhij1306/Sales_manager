// API client for backend communication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
console.log('[API Client] API_BASE_URL:', API_BASE_URL);

// ============================================================
// TYPES
// ============================================================

export interface POListItem {
    po_number: number;
    po_date: string | null;
    supplier_name: string | null;
    po_value: number | null;
    amend_no: number;
    po_status: string | null;
    linked_dc_numbers: string | null;
    total_ordered_qty: number;
    total_dispatched_qty: number;
    total_pending_qty: number;
    created_at: string | null;
}

export interface POStats {
    open_orders_count: number;
    pending_approval_count: number;
    total_value_ytd: number;
    total_value_change: number;
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
    party: string;
    amount: number | null;
    status: string;
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

export interface InvoiceListItem {
    invoice_number: string;
    invoice_date: string;
    po_numbers: string | null;
    linked_dc_numbers: string | null;
    customer_gstin: string | null;
    taxable_value: number | null;
    total_invoice_value: number | null;
    created_at: string | null;
    status: 'Paid' | 'Pending' | 'Overdue'; // Mock for UI
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
// CENTRALIZED API FETCH
// ============================================================

/**
 * Centralized API fetch function
 * - Uses NEXT_PUBLIC_API_URL from env
 * - Adds JSON headers
 * - Parses error responses and extracts detail field
 * - Logs failures centrally
 * - Throws typed errors
 */
async function apiFetch<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const url = `${API_BASE_URL}${path}`;

    const defaultOptions: RequestInit = {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    };

    try {
        console.log(`[API] ${options?.method || 'GET'} ${path}`);

        if (options?.body) {
            console.log(`[API] Request body:`, JSON.parse(options.body as string));
        }

        const response = await fetch(url, defaultOptions);

        if (!response.ok) {
            // Try to parse error detail from backend
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    if (Array.isArray(errorData.detail)) {
                        // Handle Pydantic validation errors (array of objects)
                        errorMessage = errorData.detail
                            .map((err: any) => `${err.loc.join('.')} - ${err.msg}`)
                            .join('\n');
                    } else if (typeof errorData.detail === 'object') {
                        errorMessage = JSON.stringify(errorData.detail);
                    } else {
                        errorMessage = String(errorData.detail);
                    }
                }
            } catch {
                // If JSON parsing fails, use default message
            }

            console.error(`[API] Error: ${errorMessage}`, {
                endpoint: path,
                status: response.status,
                method: options?.method || 'GET'
            });

            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log(`[API] Success: ${path}`);
        return data as T;

    } catch (error) {
        if (error instanceof Error) {
            // Re-throw our formatted errors
            throw error;
        }

        // Network errors or other issues
        const networkError = new Error(`Network error: Failed to fetch ${path}`);
        console.error(`[API] Network error:`, {
            endpoint: path,
            error: error
        });
        throw networkError;
    }
}

// ============================================================
// API FUNCTIONS
// ============================================================

export const api = {
    // Dashboard
    async getDashboardSummary(): Promise<DashboardSummary> {
        return apiFetch<DashboardSummary>('/api/dashboard/summary');
    },

    async getRecentActivity(limit = 10): Promise<ActivityItem[]> {
        return apiFetch<ActivityItem[]>(`/api/dashboard/activity?limit=${limit}`);
    },

    // Purchase Orders
    async getPOStats(): Promise<POStats> {
        return apiFetch<POStats>('/api/po/stats');
    },

    async listPOs(): Promise<POListItem[]> {
        return apiFetch<POListItem[]>('/api/po/');
    },

    async getPODetail(poNumber: number): Promise<PODetail> {
        return apiFetch<PODetail>(`/api/po/${poNumber}`);
    },

    async uploadPOHTML(file: File): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);

        // Note: FormData sets its own Content-Type with boundary
        return apiFetch<any>('/api/po/upload', {
            method: 'POST',
            body: formData,
            headers: {}, // Let browser set Content-Type for FormData
        });
    },

    // Reconciliation
    async getReconciliation(poNumber: number): Promise<any> {
        return apiFetch<any>(`/api/reconciliation/po/${poNumber}`);
    },

    async getReconciliationLots(poNumber: number): Promise<any> {
        return apiFetch<any>(`/api/reconciliation/po/${poNumber}/lots`);
    },

    // Delivery Challans
    async getDCStats(): Promise<DCStats> {
        return apiFetch<DCStats>('/api/dc/stats');
    },

    async listDCs(poNumber?: number): Promise<DCListItem[]> {
        const url = poNumber
            ? `/api/dc/?po=${poNumber}`
            : '/api/dc/';
        return apiFetch<DCListItem[]>(url);
    },

    async getDCDetail(dcNumber: string): Promise<any> {
        return apiFetch<any>(`/api/dc/${dcNumber}`);
    },

    async createDC(dc: DCCreate, items: any[]): Promise<any> {
        return apiFetch<any>('/api/dc/', {
            method: 'POST',
            body: JSON.stringify({ dc, items }),
        });
    },

    async checkDCHasInvoice(dcNumber: string): Promise<any> {
        return apiFetch<any>(`/api/dc/${dcNumber}/invoice`);
    },

    async updateDC(dcNumber: string, dc: DCCreate, items: any[]): Promise<any> {
        return apiFetch<any>(`/api/dc/${dcNumber}`, {
            method: 'PUT',
            body: JSON.stringify({ dc, items }),
        });
    },

    // Invoices
    async getInvoiceStats(): Promise<InvoiceStats> {
        return apiFetch<InvoiceStats>('/api/invoice/stats');
    },

    async listInvoices(poNumber?: number, dcNumber?: string): Promise<InvoiceListItem[]> {
        let url = '/api/invoice/';
        if (poNumber) url += `?po=${poNumber}`;
        else if (dcNumber) url += `?dc=${dcNumber}`;
        return apiFetch<InvoiceListItem[]>(url);
    },

    async getInvoiceDetail(invoiceNumber: string): Promise<any> {
        return apiFetch<any>(`/api/invoice/${invoiceNumber}`);
    },

    async createInvoice(invoice: InvoiceCreate, dcNumbers: string[]): Promise<any> {
        return apiFetch<any>('/api/invoice/', {
            method: 'POST',
            body: JSON.stringify({ ...invoice, dc_numbers: dcNumbers }),
        });
    }
};
