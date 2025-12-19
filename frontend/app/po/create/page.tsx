"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, X, ChevronDown, ChevronUp } from "lucide-react";

export default function CreatePOPage() {
    const router = useRouter();

    // Initial Empty Data System
    const initialData = {
        header: {
            po_number: '',
            po_date: new Date().toISOString().split('T')[0], // Default to today
            supplier_name: '',
            supplier_code: '',
            supplier_phone: '',
            supplier_fax: '',
            supplier_email: '',
            department_no: '',
            enquiry_no: '',
            enquiry_date: '',
            quotation_ref: '',
            quotation_date: '',
            rc_no: '',
            order_type: '',
            po_status: 'New',
            amend_no: 0,
            po_value: 0,
            fob_value: 0,
            net_po_value: 0,
            tin_no: '',
            ecc_no: '',
            mpct_no: '',
            inspection_by: '',
            issuer_name: '',
            issuer_designation: '',
            issuer_phone: '',
            remarks: ''
        },
        items: []
    };

    const [data, setData] = useState<any>(initialData);
    const [activeTab, setActiveTab] = useState("basic");
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
    const [saving, setSaving] = useState(false);

    // Helper functions (Identical to Edit Page)
    const toggleItem = (itemNo: number) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(itemNo)) {
            newExpanded.delete(itemNo);
        } else {
            newExpanded.add(itemNo);
        }
        setExpandedItems(newExpanded);
    };

    const addItem = () => {
        if (!data || !data.items) return;
        const maxItemNo = data.items.length > 0 ? Math.max(...data.items.map((i: any) => i.po_item_no || 0)) : 0;
        const newItem = {
            po_item_no: maxItemNo + 1,
            material_code: '',
            material_description: '',
            drg_no: '',
            unit: '',
            ord_qty: 0,
            po_rate: 0,
            item_value: 0,
            deliveries: []
        };
        setData({ ...data, items: [...data.items, newItem] });
        setExpandedItems(new Set([...expandedItems, maxItemNo + 1]));
    };

    const removeItem = (itemNo: number) => {
        if (!data || !data.items) return;
        const newItems = data.items.filter((i: any) => i.po_item_no !== itemNo);
        setData({ ...data, items: newItems });
        const newExpanded = new Set(expandedItems);
        newExpanded.delete(itemNo);
        setExpandedItems(newExpanded);
    };

    const addDelivery = (itemNo: number) => {
        if (!data || !data.items) return;
        const newItems = data.items.map((item: any) => {
            if (item.po_item_no === itemNo) {
                const newDelivery = {
                    lot_no: (item.deliveries?.length || 0) + 1,
                    dely_qty: 0,
                    dely_date: '',
                    entry_allow_date: '',
                    dest_code: ''
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

    const removeDelivery = (itemNo: number, deliveryIndex: number) => {
        if (!data || !data.items) return;
        const newItems = data.items.map((item: any) => {
            if (item.po_item_no === itemNo) {
                const newDeliveries = item.deliveries.filter((_: any, idx: number) => idx !== deliveryIndex);
                return { ...item, deliveries: newDeliveries };
            }
            return item;
        });
        setData({ ...data, items: newItems });
    };

    const handleSave = async () => {
        setSaving(true);
        // Simulate API call
        setTimeout(() => {
            alert('Save functionality coming soon (Phase 2)');
            setSaving(false);
            // In future: POST /api/po/ then router.push(`/po/${data.header.po_number}`)
        }, 1000);
    };

    const { header, items } = data;

    // Modified Field component that assumes Edit Mode is ALWAYS ON
    const Field = ({ label, value, field, type = "text" }: { label: string; value: any; field: string; type?: string }) => {
        return (
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                    type={type}
                    value={value || ''}
                    onChange={(e) => {
                        setData({
                            ...data,
                            header: { ...data.header, [field]: e.target.value }
                        });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
            </div>
        );
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Create Purchase Order
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Create a new manual purchase order
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <X className="w-4 h-4 inline mr-2" />
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 inline mr-2" />
                        {saving ? 'Saving...' : 'Save PO'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 mb-4">
                <div className="border-b border-gray-200">
                    <div className="flex gap-1 p-1">
                        {[
                            { id: 'basic', label: 'Basic Info' },
                            { id: 'references', label: 'References' },
                            { id: 'financial', label: 'Financial & Tax' },
                            { id: 'issuer', label: 'Issuer & Inspection' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'basic' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Field label="PO Number" value={header.po_number} field="po_number" />
                            <Field label="PO Date" value={header.po_date} field="po_date" type="date" />
                            <Field label="Supplier Name" value={header.supplier_name} field="supplier_name" />
                            <Field label="Supplier Code" value={header.supplier_code} field="supplier_code" />
                            <Field label="Phone" value={header.supplier_phone} field="supplier_phone" />
                            <Field label="Fax" value={header.supplier_fax} field="supplier_fax" />
                            <Field label="Email" value={header.supplier_email} field="supplier_email" />
                            <Field label="Department No (DVN)" value={header.department_no} field="department_no" />
                        </div>
                    )}

                    {activeTab === 'references' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Field label="Enquiry No" value={header.enquiry_no} field="enquiry_no" />
                            <Field label="Enquiry Date" value={header.enquiry_date} field="enquiry_date" type="date" />
                            <Field label="Quotation Ref" value={header.quotation_ref} field="quotation_ref" />
                            <Field label="Quotation Date" value={header.quotation_date} field="quotation_date" type="date" />
                            <Field label="RC No" value={header.rc_no} field="rc_no" />
                            <Field label="Order Type" value={header.order_type} field="order_type" />
                            <Field label="PO Status" value={header.po_status} field="po_status" />
                            <Field label="Amendment No" value={header.amend_no} field="amend_no" type="number" />
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Field label="PO Value" value={header.po_value} field="po_value" type="number" />
                            <Field label="FOB Value" value={header.fob_value} field="fob_value" type="number" />
                            <Field label="Net PO Value" value={header.net_po_value} field="net_po_value" type="number" />
                            <Field label="TIN No" value={header.tin_no} field="tin_no" />
                            <Field label="ECC No" value={header.ecc_no} field="ecc_no" />
                            <Field label="MPCT No" value={header.mpct_no} field="mpct_no" />
                        </div>
                    )}

                    {activeTab === 'issuer' && (
                        <div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Field label="Inspection By" value={header.inspection_by} field="inspection_by" />
                                <Field label="Issuer Name" value={header.issuer_name} field="issuer_name" />
                                <Field label="Issuer Designation" value={header.issuer_designation} field="issuer_designation" />
                                <Field label="Issuer Phone" value={header.issuer_phone} field="issuer_phone" />
                            </div>
                            <div className="mt-4">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                                <textarea
                                    value={header.remarks || ''}
                                    onChange={(e) => setData({
                                        ...data,
                                        header: { ...data.header, remarks: e.target.value }
                                    })}
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg !text-gray-900 bg-white"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Items & Deliveries */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Order Items & Delivery Schedule</h2>
                    <button
                        onClick={addItem}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                        <span>+</span> Add Item
                    </button>
                </div>
                {items && items.length > 0 ? (
                    <div className="space-y-4">
                        {items.map((item: any) => (
                            <div key={item.po_item_no} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Item Header */}
                                <div className="bg-gray-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="grid grid-cols-9 gap-4 flex-1 text-sm">
                                            <div>
                                                <span className="text-xs text-gray-600">Item #</span>
                                                <div className="font-medium text-gray-900">{item.po_item_no}</div>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-600">Code</span>
                                                <input
                                                    type="text"
                                                    value={item.material_code || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        const idx = newItems.findIndex(i => i.po_item_no === item.po_item_no);
                                                        if (idx !== -1) {
                                                            newItems[idx] = { ...newItems[idx], material_code: e.target.value };
                                                            setData({ ...data, items: newItems });
                                                        }
                                                    }}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-xs text-gray-600">Description</span>
                                                <input
                                                    type="text"
                                                    value={item.material_description || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        const idx = newItems.findIndex(i => i.po_item_no === item.po_item_no);
                                                        if (idx !== -1) {
                                                            newItems[idx] = { ...newItems[idx], material_description: e.target.value };
                                                            setData({ ...data, items: newItems });
                                                        }
                                                    }}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-600">DRG</span>
                                                <input
                                                    type="text"
                                                    value={item.drg_no || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        const idx = newItems.findIndex(i => i.po_item_no === item.po_item_no);
                                                        if (idx !== -1) {
                                                            newItems[idx] = { ...newItems[idx], drg_no: e.target.value };
                                                            setData({ ...data, items: newItems });
                                                        }
                                                    }}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-600">Unit</span>
                                                <input
                                                    type="text"
                                                    value={item.unit || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        const idx = newItems.findIndex(i => i.po_item_no === item.po_item_no);
                                                        if (idx !== -1) {
                                                            newItems[idx] = { ...newItems[idx], unit: e.target.value };
                                                            setData({ ...data, items: newItems });
                                                        }
                                                    }}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-600">Qty</span>
                                                <input
                                                    type="number"
                                                    value={item.ord_qty || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        const idx = newItems.findIndex(i => i.po_item_no === item.po_item_no);
                                                        if (idx !== -1) {
                                                            newItems[idx] = { ...newItems[idx], ord_qty: parseFloat(e.target.value) };
                                                            setData({ ...data, items: newItems });
                                                        }
                                                    }}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-600">Rate</span>
                                                <input
                                                    type="number"
                                                    value={item.po_rate || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        const idx = newItems.findIndex(i => i.po_item_no === item.po_item_no);
                                                        if (idx !== -1) {
                                                            newItems[idx] = { ...newItems[idx], po_rate: parseFloat(e.target.value) };
                                                            setData({ ...data, items: newItems });
                                                        }
                                                    }}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-600">Value</span>
                                                <div className="text-gray-900">₹{(item.ord_qty * item.po_rate || 0).toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => removeItem(item.po_item_no)}
                                                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => toggleItem(item.po_item_no)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                {expandedItems.has(item.po_item_no) ? (
                                                    <ChevronUp className="w-5 h-5" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Delivery Schedule Table */}
                                {expandedItems.has(item.po_item_no) && (
                                    <div className="p-4 border-t border-gray-200 bg-white">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-medium text-gray-700">Delivery Schedule</h4>
                                            <button
                                                onClick={() => addDelivery(item.po_item_no)}
                                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                            >
                                                + Add Delivery
                                            </button>
                                        </div>
                                        {item.deliveries && item.deliveries.length > 0 ? (
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Lot No</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Delivery Qty</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Delivery Date</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Entry Allow Date</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Dest Code</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {item.deliveries.map((delivery: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-3 py-2 text-gray-900">{delivery.lot_no}</td>
                                                            <td className="px-3 py-2">
                                                                <input
                                                                    type="number"
                                                                    value={delivery.dely_qty || 0}
                                                                    className="w-20 border rounded px-1 py-0.5 text-gray-900"
                                                                    onChange={(e) => {
                                                                        const newItems = [...items];
                                                                        const idxItem = newItems.findIndex(i => i.po_item_no === item.po_item_no);
                                                                        newItems[idxItem].deliveries[idx].dely_qty = parseFloat(e.target.value);
                                                                        setData({ ...data, items: newItems });
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <input
                                                                    type="date"
                                                                    value={delivery.dely_date || ''}
                                                                    className="w-28 border rounded px-1 py-0.5 text-gray-900"
                                                                    onChange={(e) => {
                                                                        const newItems = [...items];
                                                                        const idxItem = newItems.findIndex(i => i.po_item_no === item.po_item_no);
                                                                        newItems[idxItem].deliveries[idx].dely_date = e.target.value;
                                                                        setData({ ...data, items: newItems });
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <input
                                                                    type="date"
                                                                    value={delivery.entry_allow_date || ''}
                                                                    className="w-28 border rounded px-1 py-0.5 text-gray-900"
                                                                    onChange={(e) => {
                                                                        const newItems = [...items];
                                                                        const idxItem = newItems.findIndex(i => i.po_item_no === item.po_item_no);
                                                                        newItems[idxItem].deliveries[idx].entry_allow_date = e.target.value;
                                                                        setData({ ...data, items: newItems });
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <input
                                                                    type="text"
                                                                    value={delivery.dest_code || ''}
                                                                    className="w-20 border rounded px-1 py-0.5 text-gray-900"
                                                                    onChange={(e) => {
                                                                        const newItems = [...items];
                                                                        const idxItem = newItems.findIndex(i => i.po_item_no === item.po_item_no);
                                                                        newItems[idxItem].deliveries[idx].dest_code = e.target.value;
                                                                        setData({ ...data, items: newItems });
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <button
                                                                    onClick={() => removeDelivery(item.po_item_no, idx)}
                                                                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="text-gray-500 text-xs italic p-2">No deliveries added.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No items added. Click "Add Item" to start.
                    </div>
                )}
            </div>
        </div>
    );
}
