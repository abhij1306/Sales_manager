/**
 * Data Adapters for API ↔ UI Transformation
 * Ensures type safety between backend (snake_case) and frontend (camelCase)
 */

import type {
    DCItemRow,
    DCHeader,
    POItem,
    POHeader,
    InvoiceItem,
    InvoiceHeader
} from '@/types';

// ============================================================
// DC ITEM ADAPTERS
// ============================================================

/**
 * Transform API DC item to UI format
 */
export function dcItemFromAPI(apiItem: any): DCItemRow {
    return {
        id: apiItem.id || `${apiItem.po_item_id}-${apiItem.lot_no}`,
        po_item_id: apiItem.po_item_id,
        po_item_no: apiItem.po_item_no,
        lot_no: apiItem.lot_no,
        material_code: apiItem.material_code,
        material_description: apiItem.material_description,
        description: apiItem.material_description || apiItem.description,
        unit: apiItem.unit,
        po_rate: apiItem.po_rate,
        lot_ordered_qty: apiItem.lot_ordered_qty,
        ordered_qty: apiItem.ordered_qty || apiItem.lot_ordered_qty,
        already_dispatched: apiItem.already_dispatched,
        remaining_qty: apiItem.remaining_qty,
        dispatch_qty: apiItem.dispatch_qty || 0,
        dispatch_quantity: apiItem.dispatch_qty || apiItem.dispatch_quantity || 0,
        hsn_code: apiItem.hsn_code,
        hsn_rate: apiItem.hsn_rate,
        remaining_post_dc: apiItem.remaining_post_dc
    };
}

/**
 * Transform UI DC item to API format
 */
export function dcItemToAPI(uiItem: DCItemRow): any {
    return {
        po_item_id: uiItem.po_item_id,
        lot_no: uiItem.lot_no ? parseInt(String(uiItem.lot_no)) : undefined,
        dispatch_qty: uiItem.dispatch_quantity || uiItem.dispatch_qty,
        hsn_code: uiItem.hsn_code,
        hsn_rate: uiItem.hsn_rate
    };
}

// ============================================================
// PO ITEM ADAPTERS
// ============================================================

/**
 * Transform API PO item to UI format
 */
export function poItemFromAPI(apiItem: any): POItem {
    return {
        id: apiItem.id,
        po_item_no: apiItem.po_item_no,
        material_code: apiItem.material_code,
        material_description: apiItem.material_description,
        drg_no: apiItem.drg_no,
        mtrl_cat: apiItem.mtrl_cat,
        unit: apiItem.unit,
        po_rate: apiItem.po_rate,
        ord_qty: apiItem.ord_qty,
        rcd_qty: apiItem.rcd_qty,
        item_value: apiItem.item_value,
        hsn_code: apiItem.hsn_code,
        delivered_qty: apiItem.delivered_qty,
        pending_qty: apiItem.pending_qty,
        deliveries: apiItem.deliveries || []
    };
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Validate DC item before sending to API
 * Throws error if validation fails
 */
export function validateDCItem(item: DCItemRow): void {
    const dispatchQty = item.dispatch_quantity || item.dispatch_qty;

    if (!item.po_item_id) {
        throw new Error('PO item ID is required');
    }

    if (dispatchQty <= 0) {
        throw new Error('Dispatch quantity must be greater than 0');
    }

    if (item.remaining_qty !== undefined && dispatchQty > item.remaining_qty) {
        throw new Error(
            `Cannot dispatch ${dispatchQty} units. Only ${item.remaining_qty} remaining.`
        );
    }
}

/**
 * Batch validate DC items
 */
export function validateDCItems(items: DCItemRow[]): void {
    if (items.length === 0) {
        throw new Error('At least one item is required');
    }

    items.forEach((item, index) => {
        try {
            validateDCItem(item);
        } catch (error) {
            throw new Error(`Item ${index + 1}: ${error instanceof Error ? error.message : 'Invalid item'}`);
        }
    });
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Safe number parsing with fallback
 */
export function parseNumber(value: any, fallback: number = 0): number {
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safe string conversion
 */
export function toString(value: any): string {
    return value === null || value === undefined ? '' : String(value);
}
