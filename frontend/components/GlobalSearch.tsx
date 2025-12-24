"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, FileText, Truck, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, SearchResult } from "@/lib/api";

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const search = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                // Mock search for now until endpoint is verified
                // const data = await api.searchGlobal(query);
                // setResults(data);

                // Temporary mock data to verify UI
                setResults([
                    { type: 'PO' as const, number: '1125394', date: '2023-12-01', party: 'BHEL', amount: 50000, status: 'Active', created_at: '2023-12-01' },
                    { type: 'DC' as const, number: 'DC-001', date: '2023-12-05', party: 'NTPC', amount: 25000, status: 'Pending', created_at: '2023-12-05' }
                ].filter(i => i.number.toLowerCase().includes(query.toLowerCase()) || i.party.toLowerCase().includes(query.toLowerCase())));
            } catch (error) {
                console.error('Search failed:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleResultClick = (result: SearchResult) => {
        setIsOpen(false);
        setQuery("");

        if (result.type === "PO") {
            router.push(`/po/${result.number}`);
        } else if (result.type === "DC") {
            router.push(`/dc/${result.number}`);
        } else if (result.type === "Invoice") {
            router.push(`/invoice/${result.number}`);
        }
    };

    const getTypeBadgeColor = (type: string) => {
        switch (type) {
            case "PO": return "bg-blue-100 text-blue-700";
            case "DC": return "bg-green-100 text-green-700";
            case "INVOICE": return "bg-purple-100 text-purple-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-500 bg-white/50 border border-gray-200 rounded-xl hover:bg-white/80 hover:border-blue-300 transition-all shadow-sm"
            >
                <Search className="w-4 h-4" />
                <span>Search...</span>
                <div className="flex-1" />
                <kbd className="px-2 py-0.5 text-xs bg-white border border-gray-200 rounded text-gray-400 font-sans">Ctrl K</kbd>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/20 backdrop-blur-sm transition-all">
            <div ref={searchRef} className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4">
                <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search POs, Challans, Invoices..."
                        className="flex-1 outline-none text-lg text-gray-900 placeholder:text-gray-400"
                    />
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                    {loading && (
                        <div className="p-8 text-center text-gray-500">Searching...</div>
                    )}

                    {!loading && query.length >= 2 && results.length === 0 && (
                        <div className="p-8 text-center text-gray-500">No results found for "{query}"</div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="py-2">
                            {results.map((result, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleResultClick(result)}
                                    className="w-full px-4 py-3 hover:bg-blue-50 flex items-center justify-between text-left transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${getTypeBadgeColor(result.type)}`}>
                                            {result.type}
                                        </span>
                                        <div>
                                            <div className="font-medium text-gray-900 group-hover:text-blue-700">{result.number}</div>
                                            <div className="text-sm text-gray-500">{result.party || "-"}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {result.amount && (
                                            <div className="font-medium text-gray-900">₹{result.amount.toLocaleString()}</div>
                                        )}
                                        <div className="text-sm text-gray-500">{result.date}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && query.length < 2 && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            Type at least 2 characters to search
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
                    <div className="flex gap-2">
                        <span>Use arrow keys to navigate</span>
                        <span>•</span>
                        <span>Enter to select</span>
                    </div>
                    <span>ESC to close</span>
                </div>
            </div>
        </div>
    );
}
