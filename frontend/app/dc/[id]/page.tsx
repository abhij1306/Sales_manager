"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, FileText, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

// Mock PO Notes Templates
const PO_NOTE_TEMPLATES = [
    { id: 't1', title: 'Standard Dispatch Note', content: 'Material is being dispatched against PO No: ... dated ...' },
    { id: 't2', title: 'Warranty Note', content: 'Standard Manufacturer Warranty applicable.' },
    { id: 't3', title: 'Inspection Note', content: 'Material inspected by ... on ...' },
    { id: 't4', title: 'Excise Gate Pass', content: 'Excise Gate Pass No: ... Date: ...' }
];

interface DCItemRow {
    id: string;
    lot_no: string;
    description: string;
    ordered_qty: number;
    remaining_post_dc: number;
    dispatch_quantity: number;
    po_item_id: string;
}

export default function DCDetailPage() {
    const router = useRouter();
    const params = useParams();
    const dcId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState("basic");
    const [hasInvoice, setHasInvoice] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [items, setItems] = useState<DCItemRow[]>([]);
    const [notes, setNotes] = useState<string[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState("");

    const [formData, setFormData] = useState({
        dc_number: "",
        dc_date: "",
        po_number: "",
        supplier_phone: "0755 – 4247748",
        supplier_gstin: "23AACFS6810L1Z7",
        consignee_name: "The Sr. Manager (CRX)",
        consignee_address: "M/S Bharat Heavy Eletrical Ltd. Bhopal",
        department_no: "",
        mode_of_transport: "",
        vehicle_number: "",
        transporter_name: "",
        lr_number: "",
        eway_bill_number: "",
    });

    useEffect(() => {
        if (!dcId) return;

        const loadDCData = async () => {
            try {
                // Load DC data
                const data = await api.getDCDetail(dcId);

                if (data.header) {
                    setFormData({
                        dc_number: data.header.dc_number || "",
                        dc_date: data.header.dc_date || "",
                        po_number: data.header.po_number || "",
                        supplier_phone: data.header.supplier_phone || "0755 – 4247748",
                        supplier_gstin: data.header.supplier_gstin || "23AACFS6810L1Z7",
                        consignee_name: data.header.consignee_name || "The Sr. Manager (CRX)",
                        consignee_address: data.header.consignee_address || "M/S Bharat Heavy Eletrical Ltd. Bhopal",
                        department_no: data.header.department_no || "",
                        mode_of_transport: data.header.mode_of_transport || "",
                        vehicle_number: data.header.vehicle_no || "",
                        transporter_name: data.header.transporter || "",
                        lr_number: data.header.lr_no || "",
                        eway_bill_number: data.header.eway_bill_no || "",
                    });

                    // Transform items
                    if (data.items && data.items.length > 0) {
                        const mappedItems = data.items.map((item: any, idx: number) => ({
                            id: `item-${idx}`,
                            lot_no: item.lot_no || (idx + 1).toString(),
                            description: item.material_description || "",
                            ordered_qty: item.lot_ordered_qty || 0,
                            remaining_post_dc: item.remaining_post_dc || 0,
                            dispatch_quantity: item.dispatch_qty || 0,
                            po_item_id: item.po_item_id
                        }));
                        setItems(mappedItems);
                    } else if (data.header.po_number) {
                        await fetchPOItems(data.header.po_number);
                    }

                    if (data.header.remarks) {
                        setNotes([data.header.remarks]);
                    }
                }

                // Check if DC has Invoice
                const invoiceData = await api.checkDCHasInvoice(dcId);
                if (invoiceData && invoiceData.has_invoice) {
                    setHasInvoice(true);
                    setInvoiceNumber(invoiceData.invoice_number);
                }

                setLoading(false);
            } catch (err) {
                console.error("Failed to load DC:", err);
                setError(err instanceof Error ? err.message : "Failed to load DC");
                setLoading(false);
            }
        };

        loadDCData();
    }, [dcId]);

    const fetchPOItems = async (poNumber: string) => {
        try {
            const data = await api.getReconciliation(parseInt(poNumber));
            if (data.items) {
                const mappedItems = data.items.map((item: any, idx: number) => ({
                    id: `item-${idx}`,
                    lot_no: item.lot_no || (idx + 1).toString(),
                    description: item.material_description || "",
                    ordered_qty: item.ordered_qty || 0,
                    remaining_post_dc: item.remaining_qty || 0,
                    dispatch_quantity: 0,
                    po_item_id: item.po_item_id
                }));
                setItems(mappedItems);
            }
        } catch (err) {
            console.error("Failed to fetch PO items:", err);
        }
    };

    const handleAddNote = () => {
        const template = PO_NOTE_TEMPLATES.find(t => t.id === selectedTemplate);
        if (template) {
            setNotes([...notes, template.content]);
            setSelectedTemplate("");
        }
    };

    const handleRemoveNote = (index: number) => {
        const newNotes = [...notes];
        newNotes.splice(index, 1);
        setNotes(newNotes);
    };

    const handleNoteChange = (index: number, text: string) => {
        const newNotes = [...notes];
        newNotes[index] = text;
        setNotes(newNotes);
    };

    const handleItemChange = (id: string, field: keyof DCItemRow, value: any) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleDeleteItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleAddItem = () => {
        alert("Adding items to existing DC is mostly restricted to existing PO lots. Please create new DC for new items or ensure you map PO Item ID correctly.");
        // For now, disable add row in edit mode to avoid complexity of selecting PO items
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const dcPayload = {
                dc_number: formData.dc_number,
                dc_date: formData.dc_date,
                po_number: formData.po_number ? parseInt(formData.po_number) : undefined,
                consignee_name: formData.consignee_name,
                consignee_address: formData.consignee_address,
                vehicle_no: formData.vehicle_number,
                lr_no: formData.lr_number,
                transporter: formData.transporter_name,
                mode_of_transport: formData.mode_of_transport,
                eway_bill_number: formData.eway_bill_number,
                remarks: notes.join("\n\n")
            };

            const itemsPayload = items.map(item => ({
                po_item_id: item.po_item_id,
                lot_no: item.lot_no ? parseInt(item.lot_no) : undefined,
                dispatch_qty: item.dispatch_quantity
            }));

            await api.updateDC(dcId, dcPayload, itemsPayload);
            alert("DC updated successfully");
            setEditMode(false);
            window.location.reload(); // Reload to refresh data
        } catch (err: any) {
            console.error("Failed to update DC", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    // Form Field Helper - Updated for visibility
    const Field = ({ label, value, onChange, placeholder = "", disabled = false }: any) => (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled || !editMode}
                style={{ color: '#111827' }}
                className="w-full px-3 py-2 text-sm border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-white disabled:bg-gray-100"
            />
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Delivery Challan {formData.dc_number}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Date: {formData.dc_date} | PO: {formData.po_number ? (
                                <button
                                    onClick={() => router.push(`/po/${formData.po_number}`)}
                                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                                >
                                    {formData.po_number}
                                </button>
                            ) : '-'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {editMode ? (
                        <>
                            <button
                                onClick={() => setEditMode(false)}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                <X className="w-4 h-4 inline mr-2" />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Save className="w-4 h-4 inline mr-2" />
                                Save Changes
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    if (hasInvoice && invoiceNumber) {
                                        router.push(`/invoice/${invoiceNumber}`);
                                    } else {
                                        router.push(`/invoice/create?dc=${dcId}`);
                                    }
                                }}
                                className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${hasInvoice
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                <FileText className="w-4 h-4" />
                                {hasInvoice ? 'View Invoice' : 'Create Invoice'}
                            </button>
                            <button
                                onClick={() => setEditMode(true)}
                                disabled={hasInvoice}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={hasInvoice ? "Cannot edit DC - already has invoice" : ""}
                            >
                                <Edit2 className="w-4 h-4 inline mr-2" />
                                Edit
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="flex gap-1 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('basic')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'basic' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Basic Info
                    </button>
                    <button
                        onClick={() => setActiveTab('transport')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transport' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Transport Details
                    </button>
                </div>

                <div className="bg-white p-6 rounded-b-lg border border-gray-200 border-t-0 -mt-[1px]">
                    {activeTab === 'basic' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <Field
                                    label="DC Number"
                                    value={formData.dc_number}
                                    onChange={(v: string) => setFormData({ ...formData, dc_number: v })}
                                    disabled={true}
                                />
                                <Field
                                    label="DC Date"
                                    value={formData.dc_date}
                                    onChange={(v: string) => setFormData({ ...formData, dc_date: v })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <Field
                                    label="Supplier Phone No"
                                    value={formData.supplier_phone}
                                    onChange={(v: string) => setFormData({ ...formData, supplier_phone: v })}
                                />
                                <Field
                                    label="Supplier GSTIN"
                                    value={formData.supplier_gstin}
                                    onChange={(v: string) => setFormData({ ...formData, supplier_gstin: v })}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Field
                                    label="Consignee Name"
                                    value={formData.consignee_name}
                                    onChange={(v: string) => setFormData({ ...formData, consignee_name: v })}
                                />
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Consignee Address</label>
                                    <textarea
                                        value={formData.consignee_address}
                                        onChange={(e) => setFormData({ ...formData, consignee_address: e.target.value })}
                                        rows={3}
                                        disabled={!editMode}
                                        style={{ color: '#111827' }}
                                        className="w-full px-3 py-2 text-sm border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium disabled:bg-gray-100"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transport' && (
                        <div className="grid grid-cols-2 gap-6">
                            <Field
                                label="Mode of Transport"
                                value={formData.mode_of_transport}
                                onChange={(v: string) => setFormData({ ...formData, mode_of_transport: v })}
                            />
                            <Field
                                label="Vehicle Number"
                                value={formData.vehicle_number}
                                onChange={(v: string) => setFormData({ ...formData, vehicle_number: v })}
                            />
                            <Field
                                label="Transporter Name"
                                value={formData.transporter_name}
                                onChange={(v: string) => setFormData({ ...formData, transporter_name: v })}
                            />
                            <Field
                                label="LR Number"
                                value={formData.lr_number}
                                onChange={(v: string) => setFormData({ ...formData, lr_number: v })}
                            />
                            <Field
                                label="E-Way Bill Number"
                                value={formData.eway_bill_number}
                                onChange={(v: string) => setFormData({ ...formData, eway_bill_number: v })}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6 font-mono text-sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Items Dispatched</h3>
                    {editMode && (
                        <button onClick={handleAddItem} className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center">
                            <Plus className="w-4 h-4 mr-1" /> Add Row
                        </button>
                    )}
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 text-left">
                            <th className="px-4 py-2 font-medium text-gray-600 w-16">Lot</th>
                            <th className="px-4 py-2 font-medium text-gray-600">Description</th>
                            <th className="px-4 py-2 font-medium text-gray-600 w-24">Ordered</th>
                            <th className="px-4 py-2 font-medium text-gray-600 w-24">Rem.</th>
                            <th className="px-4 py-2 font-medium text-gray-600 w-32">Dispatch</th>
                            {editMode && <th className="px-4 py-2 w-16"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {items.length > 0 ? items.map((item, idx) => (
                            <tr key={idx} className="group hover:bg-gray-50">
                                <td className="p-2">
                                    {editMode ? (
                                        <input
                                            type="text"
                                            value={item.lot_no}
                                            onChange={(e) => handleItemChange(item.id, 'lot_no', e.target.value)}
                                            className="w-full border-2 border-gray-400 rounded px-2 py-1 font-medium focus:border-blue-500 text-gray-900"
                                            readOnly
                                        />
                                    ) : (
                                        <div className="px-2 py-1">{item.lot_no}</div>
                                    )}
                                </td>
                                <td className="p-2">
                                    {editMode ? (
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                            className="w-full border-2 border-gray-400 rounded px-2 py-1 font-medium focus:border-blue-500 text-gray-900"
                                            readOnly
                                        />
                                    ) : (
                                        <div className="px-2 py-1">{item.description}</div>
                                    )}
                                </td>
                                <td className="p-2">
                                    <div className="px-2 py-1 text-gray-600">{item.ordered_qty}</div>
                                </td>
                                <td className="p-2">
                                    <div className="px-2 py-1 font-semibold text-gray-800">{item.remaining_post_dc}</div>
                                </td>
                                <td className="p-2">
                                    {editMode ? (
                                        <input
                                            type="number"
                                            value={item.dispatch_quantity}
                                            onChange={(e) => handleItemChange(item.id, 'dispatch_quantity', parseFloat(e.target.value))}
                                            className="w-full border-2 border-gray-600 rounded px-2 py-1 font-bold focus:border-blue-600 text-gray-900"
                                            placeholder="0"
                                        />
                                    ) : (
                                        <div className="px-2 py-1 font-medium">{item.dispatch_quantity}</div>
                                    )}
                                </td>
                                {editMode && (
                                    <td className="p-2 text-center">
                                        <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={editMode ? 6 : 5} className="text-center py-6 text-gray-500 italic">
                                    No items found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PO Notes Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="mb-4">
                    <h3 className="font-semibold text-gray-900">PO Notes</h3>
                    <p className="text-xs text-gray-500">Select standard notes or add custom ones.</p>
                </div>

                {editMode && (
                    <div className="flex gap-3 mb-6">
                        <div className="flex-1">
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                            >
                                <option value="">-- Select Note Template --</option>
                                {PO_NOTE_TEMPLATES.map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleAddNote}
                            disabled={!selectedTemplate}
                            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm disabled:opacity-50 disabled:bg-gray-300"
                        >
                            Add Selected Note
                        </button>
                    </div>
                )}

                <div className="space-y-3">
                    {notes.map((note, index) => (
                        <div key={index} className="flex gap-3 items-start group">
                            <textarea
                                value={note}
                                onChange={(e) => handleNoteChange(index, e.target.value)}
                                rows={2}
                                disabled={!editMode}
                                style={{ color: '#111827' }}
                                className="flex-1 border-2 border-gray-400 rounded-lg text-sm font-medium focus:ring-blue-500 focus:border-blue-500 p-3 disabled:bg-gray-50"
                            />
                            {editMode && (
                                <button
                                    onClick={() => handleRemoveNote(index)}
                                    className="mt-2 text-red-400 hover:text-red-600 p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    {notes.length === 0 && (
                        <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm">
                            No notes added yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
