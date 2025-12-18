"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, FileText } from "lucide-react";

interface POItem {
    id: string;
    po_item_no: number;
    material_code: string;
    material_description: string;
    drawing_number: string;
    unit: string;
    ord_qty: number;
    po_rate: number;
    hsn_code: string;
}

interface PODetail {
    po_number: number;
    po_date: string;
    supplier_name: string;
    supplier_code: string;
    customer_name: string;
    customer_gstin: string;
    delivery_address: string;
    billing_address: string;
    payment_terms: string;
    delivery_terms: string;
    special_instructions: string;
    total_value: number;
    items: POItem[];
}

export default function PODetailPage() {
    const router = useRouter();
    const params = useParams();
    const poId = params?.id as string;
    const [po, setPO] = useState<PODetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [editedPO, setEditedPO] = useState<PODetail | null>(null);

    useEffect(() => {
        if (!poId) return;

        fetch(`http://localhost:8000/api/po/${poId}`)
            .then(res => res.json())
            .then(data => {
                setPO(data);
                setEditedPO(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load PO:", err);
                setLoading(false);
            });
    }, [poId]);

    const handleSave = async () => {
        if (!editedPO || !poId) return;

        try {
            const res = await fetch(`http://localhost:8000/api/po/${poId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editedPO)
            });

            if (res.ok) {
                setPO(editedPO);
                setEditMode(false);
                alert("PO updated successfully!");
            } else {
                alert("Failed to update PO");
            }
        } catch (err) {
            console.error("Failed to save PO:", err);
            alert("Failed to save changes");
        }
    };

    const handleCancel = () => {
        setEditedPO(po);
        setEditMode(false);
    };

    const updateField = (field: keyof PODetail, value: any) => {
        if (!editedPO) return;
        setEditedPO({ ...editedPO, [field]: value });
    };

    const updateItem = (index: number, field: keyof POItem, value: any) => {
        if (!editedPO) return;
        const newItems = [...editedPO.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setEditedPO({ ...editedPO, items: newItems });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (!po || !editedPO) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">PO not found</div>
            </div>
        );
    }

    const currentPO = editMode ? editedPO : po;

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <div className="flex gap-2">
                    {!editMode ? (
                        <>
                            <button
                                onClick={() => setEditMode(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit PO
                            </button>
                            <button
                                onClick={() => router.push(`/po/${params.id}/reconciliation`)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                View Reconciliation
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Save Changes
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Header Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">PO Header Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                        <input
                            type="text"
                            value={currentPO.po_number}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PO Date</label>
                        <input
                            type="text"
                            value={currentPO.po_date}
                            onChange={(e) => editMode && updateField('po_date', e.target.value)}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'bg-white' : 'bg-gray-50'}`}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                        <input
                            type="text"
                            value={currentPO.supplier_name || ''}
                            onChange={(e) => editMode && updateField('supplier_name', e.target.value)}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'bg-white' : 'bg-gray-50'}`}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Code</label>
                        <input
                            type="text"
                            value={currentPO.supplier_code || ''}
                            onChange={(e) => editMode && updateField('supplier_code', e.target.value)}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'bg-white' : 'bg-gray-50'}`}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                        <input
                            type="text"
                            value={currentPO.customer_name || ''}
                            onChange={(e) => editMode && updateField('customer_name', e.target.value)}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'bg-white' : 'bg-gray-50'}`}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer GSTIN</label>
                        <input
                            type="text"
                            value={currentPO.customer_gstin || ''}
                            onChange={(e) => editMode && updateField('customer_gstin', e.target.value)}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'bg-white' : 'bg-gray-50'}`}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                        <textarea
                            value={currentPO.delivery_address || ''}
                            onChange={(e) => editMode && updateField('delivery_address', e.target.value)}
                            disabled={!editMode}
                            rows={2}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'bg-white' : 'bg-gray-50'}`}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                        <textarea
                            value={currentPO.billing_address || ''}
                            onChange={(e) => editMode && updateField('billing_address', e.target.value)}
                            disabled={!editMode}
                            rows={2}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'bg-white' : 'bg-gray-50'}`}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                        <input
                            type="text"
                            value={currentPO.payment_terms || ''}
                            onChange={(e) => editMode && updateField('payment_terms', e.target.value)}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'bg-white' : 'bg-gray-50'}`}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Terms</label>
                        <input
                            type="text"
                            value={currentPO.delivery_terms || ''}
                            onChange={(e) => editMode && updateField('delivery_terms', e.target.value)}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'bg-white' : 'bg-gray-50'}`}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                        <textarea
                            value={currentPO.special_instructions || ''}
                            onChange={(e) => editMode && updateField('special_instructions', e.target.value)}
                            disabled={!editMode}
                            rows={3}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'bg-white' : 'bg-gray-50'}`}
                        />
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">PO Items</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material Code</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drawing No</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSN</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentPO.items.map((item, index) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.po_item_no}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <input
                                            type="text"
                                            value={item.material_code}
                                            onChange={(e) => editMode && updateItem(index, 'material_code', e.target.value)}
                                            disabled={!editMode}
                                            className={`w-full px-2 py-1 border border-gray-300 rounded ${editMode ? 'bg-white' : 'bg-transparent border-transparent'}`}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-sm max-w-xs">
                                        <input
                                            type="text"
                                            value={item.material_description}
                                            onChange={(e) => editMode && updateItem(index, 'material_description', e.target.value)}
                                            disabled={!editMode}
                                            className={`w-full px-2 py-1 border border-gray-300 rounded ${editMode ? 'bg-white' : 'bg-transparent border-transparent'}`}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <input
                                            type="text"
                                            value={item.drawing_number || ''}
                                            onChange={(e) => editMode && updateItem(index, 'drawing_number', e.target.value)}
                                            disabled={!editMode}
                                            className={`w-full px-2 py-1 border border-gray-300 rounded ${editMode ? 'bg-white' : 'bg-transparent border-transparent'}`}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <input
                                            type="text"
                                            value={item.unit}
                                            onChange={(e) => editMode && updateItem(index, 'unit', e.target.value)}
                                            disabled={!editMode}
                                            className={`w-20 px-2 py-1 border border-gray-300 rounded ${editMode ? 'bg-white' : 'bg-transparent border-transparent'}`}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <input
                                            type="number"
                                            value={item.ord_qty}
                                            onChange={(e) => editMode && updateItem(index, 'ord_qty', parseInt(e.target.value))}
                                            disabled={!editMode}
                                            className={`w-20 px-2 py-1 border border-gray-300 rounded ${editMode ? 'bg-white' : 'bg-transparent border-transparent'}`}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={item.po_rate}
                                            onChange={(e) => editMode && updateItem(index, 'po_rate', parseFloat(e.target.value))}
                                            disabled={!editMode}
                                            className={`w-24 px-2 py-1 border border-gray-300 rounded ${editMode ? 'bg-white' : 'bg-transparent border-transparent'}`}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <input
                                            type="text"
                                            value={item.hsn_code || ''}
                                            onChange={(e) => editMode && updateItem(index, 'hsn_code', e.target.value)}
                                            disabled={!editMode}
                                            className={`w-24 px-2 py-1 border border-gray-300 rounded ${editMode ? 'bg-white' : 'bg-transparent border-transparent'}`}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
