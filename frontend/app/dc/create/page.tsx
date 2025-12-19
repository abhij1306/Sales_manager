"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";

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
    ordered_qty: number;
    already_dispatched: number;
    remaining_qty: number; // This is the authoritative remaining qty
    dispatch_quantity: number;
    po_item_id: string;
}

// Form Field Helper - Moved outside to prevent re-creation
const Field = ({ label, value, onChange, placeholder = "", disabled = false, type = "text" }: any) => (
    <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            style={{ color: '#111827' }}
            className="w-full px-3 py-2 text-sm border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-white disabled:bg-gray-100"
        />
    </div>
);

export default function CreateDCPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialPoNumber = searchParams ? searchParams.get('po') : "";

    const [activeTab, setActiveTab] = useState("basic");
    const [poNumber, setPONumber] = useState(initialPoNumber || "");
    const [items, setItems] = useState<DCItemRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [poData, setPOData] = useState<any>(null); // Store PO header data

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
            // Also fetch PO header data
            fetchPOData(initialPoNumber);
        }
    }, [initialPoNumber]);

    const fetchPOData = async (po: string) => {
        try {
            const data = await api.getPODetail(parseInt(po));
            if (data && data.header) {
                setPOData(data.header);
            }
        } catch (err) {
            console.error("Failed to fetch PO data:", err);
        }
    };

    const handleLoadItems = async (po: string) => {
        if (!po) return;

        setIsLoading(true);
        setError(null);

        try {
            // Use lot-wise reconciliation endpoint for better granularity
            const data = await api.getReconciliationLots(parseInt(po));

            // Transform lot-wise data into DC item rows
            const mappedItems: DCItemRow[] = data.lots.map((lot: any, index: number) => ({
                id: `${lot.po_item_id}-${lot.lot_no}`,
                lot_no: lot.lot_no?.toString() || "",
                description: lot.material_description || "",
                ordered_qty: lot.ordered_qty || 0,
                already_dispatched: lot.already_dispatched || 0,
                remaining_qty: lot.remaining_qty || 0,
                dispatch_quantity: 0,
                po_item_id: lot.po_item_id
            }));

            setItems(mappedItems);

            if (mappedItems.length === 0) {
                setError("No items available for dispatch (all fully dispatched or no lots found)");
            }
        } catch (err) {
            console.error("Failed to load PO items", err);
            setError(err instanceof Error ? err.message : "Failed to load PO items");
        } finally {
            setIsLoading(false);
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
            ordered_qty: 0,
            already_dispatched: 0,
            remaining_qty: 0,
            dispatch_quantity: 0,
            po_item_id: ""
        };
        setItems([...items, newItem]);
    };

    const handleSave = async () => {
        setError(null);

        // Validate
        if (!formData.dc_number || !formData.dc_date) {
            setError("DC number and date are required");
            return;
        }

        if (items.length === 0) {
            setError("At least one item is required");
            return;
        }

        // Check all items have dispatch quantity
        const invalidItems = items.filter(item => !item.dispatch_quantity || item.dispatch_quantity <= 0);
        if (invalidItems.length > 0) {
            setError("All items must have a dispatch quantity greater than 0");
            return;
        }

        setIsLoading(true);

        try {
            const dcPayload = {
                dc_number: formData.dc_number,
                dc_date: formData.dc_date,
                po_number: poNumber ? parseInt(poNumber) : undefined,
                consignee_name: formData.consignee_name,
                consignee_address: formData.consignee_address,
                vehicle_no: formData.vehicle_number,
                lr_no: formData.lr_number,
                transporter: formData.transporter_name,
                mode_of_transport: formData.mode_of_transport,
                eway_bill_no: formData.eway_bill_number,
                remarks: notes.join("\n\n")
            };

            const itemsPayload = items.map(item => ({
                po_item_id: item.po_item_id,
                lot_no: item.lot_no ? parseInt(item.lot_no) : undefined,
                dispatch_qty: item.dispatch_quantity,
                hsn_code: null,
                hsn_rate: null
            }));

            await api.createDC(dcPayload, itemsPayload);

            // Success - navigate to DC detail or list
            router.push(`/dc/${formData.dc_number}`);
        } catch (err) {
            console.error("Failed to create DC", err);
            setError(err instanceof Error ? err.message : "Failed to create DC");
        } finally {
            setIsLoading(false);
        }
    };


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
                            Delivery Challan {formData.dc_number && `${formData.dc_number}`}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Generate DC from PO</p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {/* PO Search Bar - Only show if not coming from PO */}
                    {!initialPoNumber && (
                        <>
                            <input
                                type="text"
                                value={poNumber}
                                onChange={(e) => setPONumber(e.target.value)}
                                className="w-48 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                placeholder="PO Number"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => handleLoadItems(poNumber)}
                                disabled={isLoading || !poNumber}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? "Loading..." : "Fetch Items"}
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => {
                            // Navigate to invoice create page with current DC number
                            if (formData.dc_number) {
                                router.push(`/invoice/create?dc=${formData.dc_number}`);
                            } else {
                                setError("Please enter a DC number first");
                            }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                        Create Invoice
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>

            {/* PO Reference - Show when coming from PO */}
            {initialPoNumber && poData && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 font-medium">Creating DC from Purchase Order</p>
                            <p className="text-xs text-blue-500 mt-1">
                                PO Date: {poData.po_date || 'N/A'}
                            </p>
                        </div>
                        <a
                            href={`/po/${initialPoNumber}`}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                            PO #{initialPoNumber}
                        </a>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
            )}

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
                            <th className="px-4 py-2 font-medium text-gray-600 w-16">Lot</th>
                            <th className="px-4 py-2 font-medium text-gray-600">Description</th>
                            <th className="px-4 py-2 font-medium text-gray-600 w-24">Ordered</th>
                            <th className="px-4 py-2 font-medium text-gray-600 w-24">Sent</th>
                            <th className="px-4 py-2 font-medium text-gray-600 w-24">Rem.</th>
                            <th className="px-4 py-2 font-medium text-gray-600 w-32">Dispatch</th>
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
                                        className="w-full border-2 border-gray-400 rounded px-2 py-1 font-medium focus:border-blue-500 text-gray-900"
                                        readOnly
                                    />
                                </td>
                                <td className="p-2">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                        className="w-full border-2 border-gray-400 rounded px-2 py-1 font-medium focus:border-blue-500 text-gray-900"
                                        readOnly
                                    />
                                </td>
                                <td className="p-2">
                                    <div className="px-2 py-1 text-gray-600">{item.ordered_qty}</div>
                                </td>
                                <td className="p-2">
                                    <div className="px-2 py-1 text-gray-600">{item.already_dispatched}</div>
                                </td>
                                <td className="p-2">
                                    <div className="px-2 py-1 font-semibold text-gray-800">{item.remaining_qty}</div>
                                </td>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        value={item.dispatch_quantity}
                                        onChange={(e) => handleItemChange(item.id, 'dispatch_quantity', parseFloat(e.target.value))}
                                        className="w-full border-2 border-gray-600 rounded px-2 py-1 font-bold focus:border-blue-600 text-gray-900"
                                        placeholder="0"
                                        max={item.remaining_qty}
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
                                <td colSpan={7} className="text-center py-6 text-gray-500 italic">
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
