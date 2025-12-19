"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Calendar, Truck, FileText, Check, AlertCircle, Save } from 'lucide-react';
import { api } from "@/lib/api";

// Mock PO Notes Templates (Replace with API fetch if needed)
const PO_NOTE_TEMPLATES = [
    { id: 't1', title: 'Standard Dispatch Note', content: 'Material is being dispatched against PO No: ... dated ...' },
    { id: 't2', title: 'Warranty Note', content: 'Standard Manufacturer Warranty applicable.' },
    { id: 't3', title: 'Inspection Note', content: 'Material inspected by ... on ...' },
    { id: 't4', title: 'Excise Gate Pass', content: 'Excise Gate Pass No: ... Date: ...' }
];

interface DCItemRow {
    id: string; // Unique ID for the row
    lot_no: string;
    description: string;
    ordered_qty: number;
    already_dispatched: number;
    remaining_qty: number;
    dispatch_quantity: number;
    po_item_id: string;
}

const TableInput = ({ value, onChange, type = "text", placeholder = "", className = "", disabled = false }: any) => (
    <input
        type={type}
        value={value}
        onChange={e => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-2 py-1 text-xs border border-border rounded focus:ring-1 focus:ring-primary focus:border-primary bg-white text-text-primary ${className} ${disabled ? 'bg-gray-50 text-text-secondary' : ''}`}
    />
);

function CreateDCPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialPoNumber = searchParams ? searchParams.get('po') : "";
    const poId = initialPoNumber;

    const [poNumber, setPONumber] = useState(initialPoNumber || "");
    const [items, setItems] = useState<DCItemRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [poData, setPOData] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notes, setNotes] = useState<string[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState("");

    const [formData, setFormData] = useState({
        dc_number: "",
        dc_date: new Date().toISOString().split('T')[0],
        supplier_phone: "0755 – 4247748",
        supplier_gstin: "23AACFS6810L1Z7",
        consignee_name: '',
        consignee_address: ''
    });

    useEffect(() => {
        if (initialPoNumber) {
            handleLoadItems(initialPoNumber);
            fetchPOData(initialPoNumber);
        }
    }, [initialPoNumber]);

    const fetchPOData = async (po: string) => {
        try {
            const data = await api.getPODetail(parseInt(po));
            if (data && data.header) {
                setPOData(data.header);
                setFormData(prev => ({
                    ...prev,
                    consignee_name: data.header?.consignee_name || '',
                    consignee_address: data.header?.consignee_address || '',
                    supplier_phone: data.header?.supplier_phone || '',
                    supplier_gstin: data.header?.supplier_gstin || '23AACFS6810L1Z7' // Preserve default if not in PO
                }));
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
            const data = await api.getReconciliationLots(parseInt(po));
            const mappedItems: DCItemRow[] = data.lots.map((lot: any) => ({
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

    const handleSubmit = async () => {
        setError(null);
        setIsSubmitting(true);

        if (!formData.dc_number || !formData.dc_date) {
            setError("DC number and date are required");
            setIsSubmitting(false);
            return;
        }

        if (items.length === 0) {
            setError("At least one item is required");
            setIsSubmitting(false);
            return;
        }

        // Filter items to only include those with dispatch quantity > 0
        // This allows creating DCs with partial items from a PO
        const itemsToDispatch = items.filter(item => item.dispatch_quantity && item.dispatch_quantity > 0);

        if (itemsToDispatch.length === 0) {
            setError("At least one item must have a dispatch quantity greater than 0");
            setIsSubmitting(false);
            return;
        }

        try {
            const dcPayload = {
                dc_number: formData.dc_number,
                dc_date: formData.dc_date,
                po_number: poNumber ? parseInt(poNumber) : undefined,
                supplier_phone: formData.supplier_phone,
                supplier_gstin: formData.supplier_gstin,
                remarks: notes.join("\n\n")
            };

            const itemsPayload = itemsToDispatch.map(item => ({
                po_item_id: item.po_item_id,
                lot_no: item.lot_no ? parseInt(item.lot_no) : undefined,
                dispatch_qty: item.dispatch_quantity,
                hsn_code: null,
                hsn_rate: null
            }));

            await api.createDC(dcPayload, itemsPayload);
            router.push(`/dc/${formData.dc_number}`);
        } catch (err) {
            console.error("Failed to create DC", err);
            setError(err instanceof Error ? err.message : "Failed to create DC");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">{/* Removed pb-24 since footer is gone */}
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="text-text-secondary hover:text-text-primary transition-colors p-1"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-[20px] font-semibold text-text-primary flex items-center gap-3">
                            Create Delivery Challan
                            {initialPoNumber && (
                                <span className="text-[11px] font-medium text-text-secondary bg-gray-100 px-2 py-0.5 rounded border border-border flex items-center gap-1">
                                    PO: <span className="text-primary hover:underline cursor-pointer" onClick={() => router.push(`/po/${initialPoNumber}`)}>{initialPoNumber}</span>
                                </span>
                            )}
                        </h1>
                        <p className="text-[13px] text-text-secondary mt-0.5">
                            Date: {formData.dc_date}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {!initialPoNumber && (
                        <>
                            <input
                                type="text"
                                value={poNumber}
                                onChange={(e) => setPONumber(e.target.value)}
                                className="w-48 px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="PO Number"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => handleLoadItems(poNumber)}
                                disabled={isLoading || !poNumber}
                                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading ? 'Loading...' : (
                                    <>
                                        <FileText className="w-4 h-4" /> Fetch Items
                                    </>
                                )}
                            </button>
                        </>
                    )}
                    {/* Action Buttons */}
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Saving...' : (
                            <>
                                <Save className="w-4 h-4" /> Save Challan
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* PO Reference - Removed Blue Box as per user request */}

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-3 text-danger">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Basic Details Card */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border bg-gray-50/30">
                    <h2 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        Basic Details
                    </h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">DC Number</label>
                        <input
                            type="text"
                            value={formData.dc_number}
                            onChange={(e) => setFormData({ ...formData, dc_number: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary bg-white text-sm"
                            placeholder="Enter DC No."
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Date</label>
                        <input
                            type="date"
                            value={formData.dc_date}
                            onChange={(e) => setFormData({ ...formData, dc_date: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary bg-white text-sm"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Supplier Phone</label>
                        <input
                            type="text"
                            value={formData.supplier_phone}
                            onChange={(e) => setFormData({ ...formData, supplier_phone: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary bg-white text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Supplier GSTIN</label>
                        <input
                            type="text"
                            value={formData.supplier_gstin}
                            onChange={(e) => setFormData({ ...formData, supplier_gstin: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary bg-white text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Consignee Name</label>
                        <input
                            type="text"
                            value={formData.consignee_name}
                            onChange={(e) => setFormData({ ...formData, consignee_name: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary bg-white text-sm"
                        />
                    </div>
                    <div className="col-span-1 md:col-span-3 space-y-1">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Consignee Address</label>
                        <input
                            type="text"
                            value={formData.consignee_address}
                            onChange={(e) => setFormData({ ...formData, consignee_address: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary bg-white text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/30">
                    <h3 className="text-[14px] font-semibold text-text-primary">Items Dispatched</h3>
                    <button onClick={handleAddItem} className="text-primary hover:text-blue-700 text-xs font-medium flex items-center gap-1 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-text-secondary border-b border-border text-[11px] uppercase tracking-wider font-semibold">
                                <th className="px-4 py-3 w-16">Lot</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3 w-24 text-right">Ordered</th>
                                <th className="px-4 py-3 w-24 text-right">Sent</th>
                                <th className="px-4 py-3 w-24 text-right">Rem.</th>
                                <th className="px-4 py-3 w-32 text-right">Dispatch</th>
                                <th className="px-4 py-3 w-12 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 bg-white">
                            {items.length > 0 ? items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-4 py-2">
                                        <TableInput
                                            value={item.lot_no}
                                            onChange={(v: string) => handleItemChange(item.id, 'lot_no', v)}
                                            readOnly
                                            disabled
                                            className="text-center"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <TableInput
                                            value={item.description}
                                            onChange={(v: string) => handleItemChange(item.id, 'description', v)}
                                            readOnly
                                            disabled
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right text-[13px] text-text-secondary font-medium">{item.ordered_qty}</td>
                                    <td className="px-4 py-2 text-right text-[13px] text-text-secondary font-medium">{item.already_dispatched}</td>
                                    <td className="px-4 py-2 text-right text-[13px] text-text-primary font-bold">{item.remaining_qty}</td>
                                    <td className="px-4 py-2">
                                        <TableInput
                                            type="number"
                                            value={item.dispatch_quantity}
                                            onChange={(v: number) => handleItemChange(item.id, 'dispatch_quantity', v)}
                                            placeholder="0"
                                            max={item.remaining_qty}
                                            className="text-right font-bold text-primary border-primary/30 focus:border-primary"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="text-text-secondary hover:text-danger p-1.5 rounded transition-colors hover:bg-red-50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-text-secondary text-sm italic">
                                        No items added. Fetch from PO or add manually.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PO Notes Section */}
            <div className="glass-card p-4">
                <div className="mb-4">
                    <h2 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        PO Standard Notes
                    </h2>
                    <p className="text-[12px] text-text-secondary mt-0.5">Select notes to include in the challan</p>
                </div>

                <div className="flex gap-2 mb-4">
                    <div className="flex-1 relative">
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="w-full appearance-none px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-text-primary"
                        >
                            <option value="">-- Select Note Template --</option>
                            {PO_NOTE_TEMPLATES.map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                            <Plus className="h-4 w-4 rotate-45" />
                        </div>
                    </div>
                    <button
                        onClick={handleAddNote}
                        disabled={!selectedTemplate}
                        className="px-4 py-2 bg-text-primary text-white rounded-lg hover:bg-black text-sm font-medium disabled:opacity-50 disabled:bg-gray-300 transition-colors"
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
                                className="flex-1 border border-border rounded-lg text-sm text-text-primary py-2 px-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-white"
                            />
                            <button
                                onClick={() => handleRemoveNote(index)}
                                className="mt-2 text-text-secondary hover:text-danger p-1 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {notes.length === 0 && (
                        <div className="text-center py-6 bg-gray-50/50 rounded-lg border border-dashed border-border text-text-secondary text-sm">
                            No notes added yet. Select a template above.
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}

export default function CreateDCPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-primary font-medium">Loading...</div></div>}>
            <CreateDCPageContent />
        </Suspense>
    );
}
