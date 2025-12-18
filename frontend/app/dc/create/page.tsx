"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

// Mock PO Notes Templates (Replace with API fetch if needed)
const PO_NOTE_TEMPLATES = [
    { id: 't1', title: 'Standard Dispatch Note', content: 'Material is being dispatched against PO No: ... dated ...' },
    { id: 't2', title: 'Warranty Note', content: 'Standard Manufacturer Warranty applicable.' },
    { id: 't3', title: 'Inspection Note', content: 'Material inspected by ... on ...' },
    { id: 't4', title: 'Excise Gate Pass', content: 'Excise Gate Pass No: ... Date: ...' }
];

interface DCItemRow {
    id: string; // Unique ID for the row (can be combination of item_no + lot_no)
    lot_no: string;
    description: string;
    total_quantity: number;
    dispatch_quantity: number;
    po_item_id: string;
}

export default function CreateDCPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialPoNumber = searchParams ? searchParams.get('po_number') : "";

    const [activeTab, setActiveTab] = useState("basic");
    const [poNumber, setPONumber] = useState(initialPoNumber || "");
    const [items, setItems] = useState<DCItemRow[]>([]);

    // Notes Logic
    const [notes, setNotes] = useState<string[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState("");

    const [formData, setFormData] = useState({
        // Basic Info
        dc_number: "",
        dc_date: new Date().toISOString().split('T')[0],
        supplier_phone: "0755 – 4247748",
        supplier_gstin: "23AACFS6810L1Z7",
        consignee_name: "The Sr. Manager (CRX)",
        consignee_address: "M/S Bharat Heavy Eletrical Ltd. Bhopal",
        department_no: "", // Can be fetched from PO

        // Transport Details
        mode_of_transport: "",
        vehicle_number: "",
        transporter_name: "",
        lr_number: "",
        eway_bill_number: "",
    });

    useEffect(() => {
        if (initialPoNumber) {
            handleLoadItems(initialPoNumber);
        }
    }, [initialPoNumber]);

    const handleLoadItems = async (po: string) => {
        if (!po) return;
        try {
            // Fetch PO Details to populate items
            // Assuming endpoint exists or using reconciliation endpoint which returns items
            const res = await fetch(`http://localhost:8000/api/reconciliation/po/${po}`);
            if (res.ok) {
                const data = await res.json();

                // Transform PO Items into Layout: Lot No | Description | Total Qty
                // If backend data doesn't have lots, we might mock or use item number
                const mappedItems: DCItemRow[] = data.items.map((item: any, index: number) => ({
                    id: `row-${index}`,
                    lot_no: item.lot_no || (index + 1).toString(), // Fallback if no lot_no
                    description: item.material_description,
                    total_quantity: item.ord_qty, // Or pending_qty?
                    dispatch_quantity: 0,
                    po_item_id: item.id
                }));
                setItems(mappedItems);
            }
        } catch (err) {
            console.error("Failed to load PO items", err);
        }
    };

    const handleAddNote = () => {
        const template = PO_NOTE_TEMPLATES.find(t => t.id === selectedTemplate);
        if (template) {
            setNotes([...notes, template.content]);
            setSelectedTemplate(""); // Reset dropdown
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
        const newItem: DCItemRow = {
            id: `new-${Date.now()}`,
            lot_no: "",
            description: "",
            total_quantity: 0,
            dispatch_quantity: 0,
            po_item_id: ""
        };
        setItems([...items, newItem]);
    };

    const handleSave = async () => {
        // Construct payload matchign backend expectation
        // Note: Backend might need updates to accept this structure
        alert("Save functionality coming soon!");
    };


    // Form Field Helper - Updated for visibility
    const Field = ({ label, value, onChange, placeholder = "", disabled = false }: any) => (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
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
                        <h1 className="text-2xl font-semibold text-gray-900">Create Delivery Challan</h1>
                        <p className="text-sm text-gray-500 mt-1">Generate DC from PO</p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {/* PO Search Bar */}
                    <input
                        type="text"
                        value={poNumber}
                        onChange={(e) => setPONumber(e.target.value)}
                        className="w-48 px-3 py-2 border rounded-lg text-sm"
                        placeholder="PO Number"
                    />
                    <button
                        onClick={() => handleLoadItems(poNumber)}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
                    >
                        Fetch Items
                    </button>
                    <button onClick={() => router.back()} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        Create DC
                    </button>
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
                                    label="Create DC Number"
                                    value={formData.dc_number}
                                    onChange={(v: string) => setFormData({ ...formData, dc_number: v })}
                                    placeholder="Auto-generated if empty"
                                />
                                <Field
                                    label="DC Date"
                                    value={formData.dc_date}
                                    onChange={(v: string) => setFormData({ ...formData, dc_date: v })}
                                    type="date"
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
                                        className="w-full px-3 py-2 text-sm border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
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
                    <button onClick={handleAddItem} className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center">
                        <Plus className="w-4 h-4 mr-1" /> Add Row
                    </button>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 text-left">
                            <th className="px-4 py-2 font-medium text-gray-600 w-24">Lot No</th>
                            <th className="px-4 py-2 font-medium text-gray-600">Description</th>
                            <th className="px-4 py-2 font-medium text-gray-600 w-32">Total Qty</th>
                            <th className="px-4 py-2 font-medium text-gray-600 w-32">Dispatch Qty</th>
                            <th className="px-4 py-2 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {items.length > 0 ? items.map((item, idx) => (
                            <tr key={idx} className="group hover:bg-gray-50">
                                <td className="p-2">
                                    <input
                                        type="text"
                                        value={item.lot_no}
                                        onChange={(e) => handleItemChange(item.id, 'lot_no', e.target.value)}
                                        style={{ color: '#111827' }}
                                        className="w-full border-2 border-gray-400 rounded px-2 py-1 font-medium focus:border-blue-500"
                                    />
                                </td>
                                <td className="p-2">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                        style={{ color: '#111827' }}
                                        className="w-full border-2 border-gray-400 rounded px-2 py-1 font-medium focus:border-blue-500"
                                    />
                                </td>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        value={item.total_quantity}
                                        onChange={(e) => handleItemChange(item.id, 'total_quantity', parseFloat(e.target.value))}
                                        style={{ color: '#111827' }}
                                        className="w-full border-2 border-gray-400 rounded px-2 py-1 bg-gray-50 font-medium focus:border-blue-500"
                                    />
                                </td>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        value={item.dispatch_quantity}
                                        onChange={(e) => handleItemChange(item.id, 'dispatch_quantity', parseFloat(e.target.value))}
                                        style={{ color: '#111827' }}
                                        className="w-full border-2 border-gray-600 rounded px-2 py-1 font-bold focus:border-blue-600"
                                        placeholder="0"
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-6 text-gray-500 italic">
                                    No items added. Fetch from PO or add manually.
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

                <div className="space-y-3">
                    {notes.map((note, index) => (
                        <div key={index} className="flex gap-3 items-start group">
                            <textarea
                                value={note}
                                onChange={(e) => handleNoteChange(index, e.target.value)}
                                rows={2}
                                className="flex-1 border-2 border-gray-400 rounded-lg text-sm text-gray-900 font-medium focus:ring-blue-500 focus:border-blue-500 p-3"
                            />
                            <button
                                onClick={() => handleRemoveNote(index)}
                                className="mt-2 text-red-400 hover:text-red-600 p-1"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
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
