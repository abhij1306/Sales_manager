"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, FileText, Plus, Trash2, Truck, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { DCItemRow as DCItemRowType } from "@/types";

const PO_NOTE_TEMPLATES = [
    { id: 't1', title: 'Standard Dispatch Note', content: 'Material is being dispatched against PO No: ... dated ...' },
    { id: 't2', title: 'Warranty Note', content: 'Standard Manufacturer Warranty applicable.' },
    { id: 't3', title: 'Inspection Note', content: 'Material inspected by ... on ...' },
    { id: 't4', title: 'Excise Gate Pass', content: 'Excise Gate Pass No: ... Date: ...' }
];



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

    const [items, setItems] = useState<DCItemRowType[]>([]);
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

                    if (data.items && data.items.length > 0) {
                        const mappedItems: DCItemRowType[] = data.items.map((item: DCItemRowType, idx: number) => ({
                            id: `item-${idx}`,
                            lot_no: item.lot_no?.toString() || (idx + 1).toString(),
                            description: item.material_description || item.description || "",
                            ordered_qty: item.lot_ordered_qty || item.ordered_qty || 0,
                            remaining_post_dc: item.remaining_post_dc || 0,
                            dispatch_quantity: item.dispatch_qty || item.dispatch_quantity || 0,
                            po_item_id: item.po_item_id
                        }));
                        setItems(mappedItems);
                    } else if (data.header.po_number) {
                        await fetchPOItems(data.header.po_number);
                    }

                    if (data.header.remarks) {
                        setNotes([...data.header.remarks.split('\n\n')]);
                    }
                }

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
                const mappedItems: DCItemRowType[] = data.items.map((item: any, idx: number) => ({
                    id: `item-${idx}`,
                    lot_no: item.lot_no?.toString() || (idx + 1).toString(),
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

    const handleItemChange = (id: string, field: keyof DCItemRowType, value: string | number) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleDeleteItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleAddItem = () => {
        alert("Adding items to existing DC is mostly restricted to existing PO lots. Please create new DC for new items or ensure you map PO Item ID correctly.");
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
            setEditMode(false);
            window.location.reload();
        } catch (err) {
            console.error("Failed to update DC", err);
            setError(err instanceof Error ? err.message : "Failed to update DC");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-primary font-medium">Loading...</div>
            </div>
        );
    }

    interface FieldProps {
        label: string;
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        disabled?: boolean;
    }

    const Field = ({ label, value, onChange, placeholder = "", disabled = false }: FieldProps) => (
        <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled || !editMode}
                className={`w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary bg-white ${disabled || !editMode ? 'bg-gray-50 text-text-secondary' : ''}`}
            />
        </div>
    );

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary p-1">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-[20px] font-semibold text-text-primary flex items-center gap-3">
                            Delivery Challan {formData.dc_number}
                            {formData.po_number && (
                                <span className="text-[11px] font-medium text-text-secondary bg-gray-100 px-2 py-0.5 rounded border border-border flex items-center gap-1">
                                    PO: <button onClick={() => router.push(`/po/${formData.po_number}`)} className="text-primary hover:underline">{formData.po_number}</button>
                                </span>
                            )}
                        </h1>
                        <p className="text-[13px] text-text-secondary mt-0.5">
                            Date: {formData.dc_date}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {editMode ? (
                        <>
                            <button
                                onClick={() => setEditMode(false)}
                                className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <X className="w-4 h-4" /> Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <Save className="w-4 h-4" /> Save
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
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors ${hasInvoice
                                    ? 'bg-primary hover:bg-blue-700'
                                    : 'bg-success hover:bg-green-700'
                                    }`}
                            >
                                <FileText className="w-4 h-4" />
                                {hasInvoice ? 'View Invoice' : 'Create Invoice'}
                            </button>
                            <button
                                onClick={() => setEditMode(true)}
                                disabled={hasInvoice}
                                className="px-4 py-2 text-sm font-medium bg-white text-text-primary border border-border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                title={hasInvoice ? "Cannot edit DC - already has invoice" : ""}
                            >
                                <Edit2 className="w-4 h-4" /> Edit
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-3 text-danger">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Tabs & Content */}
            <div className="glass-card overflow-hidden">
                <div className="flex border-b border-border bg-gray-50/30 px-4 pt-1">
                    <button
                        onClick={() => setActiveTab('basic')}
                        className={`px-4 py-3 text-[13px] font-semibold transition-all relative top-[1px] border-b-2 mr-2 ${activeTab === 'basic'
                            ? "border-primary text-primary bg-transparent"
                            : "border-transparent text-text-secondary hover:text-text-primary"
                            }`}
                    >
                        Basic Info
                    </button>
                    <button
                        onClick={() => setActiveTab('transport')}
                        className={`px-4 py-3 text-[13px] font-semibold transition-all relative top-[1px] border-b-2 ${activeTab === 'transport'
                            ? "border-primary text-primary bg-transparent"
                            : "border-transparent text-text-secondary hover:text-text-primary"
                            }`}
                    >
                        Transport Details
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'basic' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            <Field
                                label="Consignee Name"
                                value={formData.consignee_name}
                                onChange={(v: string) => setFormData({ ...formData, consignee_name: v })}
                            />
                            <div className="col-span-1">
                                <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-1">Consignee Address</label>
                                <textarea
                                    value={formData.consignee_address}
                                    onChange={(e) => setFormData({ ...formData, consignee_address: e.target.value })}
                                    disabled={!editMode}
                                    rows={2}
                                    className={`w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary bg-white ${!editMode ? 'bg-gray-50 text-text-secondary' : ''}`}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'transport' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/30">
                    <h3 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        Items Dispatched
                    </h3>
                    {editMode && (
                        <button onClick={handleAddItem} className="text-primary hover:text-blue-700 text-xs font-medium flex items-center gap-1 transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Add Row
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-text-secondary border-b border-border text-[11px] uppercase tracking-wider font-semibold">
                                <th className="px-4 py-3 w-16">Lot</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3 w-24 text-right">Ordered</th>
                                <th className="px-4 py-3 w-24 text-right">Rem.</th>
                                <th className="px-4 py-3 w-32 text-right">Dispatch</th>
                                {editMode && <th className="px-4 py-3 w-16 text-center"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 bg-white">
                            {items.length > 0 ? items.map((item, idx) => (
                                <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-2">
                                        {editMode ? (
                                            <input
                                                type="text"
                                                value={item.lot_no}
                                                onChange={(e) => handleItemChange(item.id, 'lot_no', e.target.value)}
                                                className="w-full border border-border rounded px-2 py-1 focus:ring-1 focus:ring-primary text-sm bg-white"
                                                readOnly
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-text-primary">{item.lot_no}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        {editMode ? (
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                className="w-full border border-border rounded px-2 py-1 focus:ring-1 focus:ring-primary text-sm bg-white"
                                                readOnly
                                            />
                                        ) : (
                                            <span className="text-sm text-text-primary line-clamp-1" title={item.description}>{item.description}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right text-[13px] text-text-secondary font-medium">
                                        {item.ordered_qty}
                                    </td>
                                    <td className="px-4 py-2 text-right text-[13px] text-text-primary font-bold">
                                        {item.remaining_post_dc}
                                    </td>
                                    <td className="px-4 py-2">
                                        {editMode ? (
                                            <input
                                                type="number"
                                                value={item.dispatch_quantity}
                                                onChange={(e) => handleItemChange(item.id, 'dispatch_quantity', parseFloat(e.target.value))}
                                                className="w-full border border-primary/30 rounded px-2 py-1 font-bold text-primary text-sm text-right bg-white focus:ring-1 focus:ring-primary"
                                                placeholder="0"
                                            />
                                        ) : (
                                            <div className="text-right font-bold text-primary text-[13px]">{item.dispatch_quantity}</div>
                                        )}
                                    </td>
                                    {editMode && (
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="text-text-secondary hover:text-danger p-1.5 rounded transition-colors hover:bg-red-50"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={editMode ? 6 : 5} className="text-center py-8 text-text-secondary text-sm italic">
                                        No items found.
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
                    <h3 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        PO Notes
                    </h3>
                    <p className="text-[12px] text-text-secondary mt-0.5">Standard terms and conditions for this delivery.</p>
                </div>

                {editMode && (
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
                            Add Note
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
                                className={`flex-1 border border-border rounded-lg text-sm text-text-primary py-2 px-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-white ${!editMode ? 'bg-gray-50 text-text-secondary border-transparent' : ''}`}
                            />
                            {editMode && (
                                <button
                                    onClick={() => handleRemoveNote(index)}
                                    className="mt-2 text-text-secondary hover:text-danger p-1 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    {notes.length === 0 && (
                        <div className="text-center py-6 bg-gray-50/50 rounded-lg border border-dashed border-border text-text-secondary text-sm">
                            No notes added yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
