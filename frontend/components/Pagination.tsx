"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
}: PaginationProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalItems === 0 || totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const handlePrevious = () => {
        if (currentPage > 1) onPageChange(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    };

    // Calculate page range to show
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-between px-2 py-4 border-t border-border mt-4">
            <div className="hidden sm:flex flex-1 items-center justify-between">
                <div>
                    <p className="text-[13px] text-text-secondary">
                        Showing <span className="font-semibold text-text-primary">{startItem}</span> to <span className="font-semibold text-text-primary">{endItem}</span> of <span className="font-semibold text-text-primary">{totalItems}</span> entries
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handlePrevious}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 flex items-center gap-1 rounded-md border border-border bg-white text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Previous</span>
                    </button>

                    <div className="flex items-center gap-1 mx-2">
                        {getPageNumbers().map((page, idx) => (
                            typeof page === 'number' ? (
                                <button
                                    key={idx}
                                    onClick={() => onPageChange(page)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${currentPage === page
                                            ? "bg-primary text-white"
                                            : "bg-white border border-border text-text-secondary hover:bg-gray-50"
                                        }`}
                                >
                                    {page}
                                </button>
                            ) : (
                                <span key={idx} className="w-8 h-8 flex items-center justify-center text-xs text-text-secondary">
                                    ...
                                </span>
                            )
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 flex items-center gap-1 rounded-md border border-border bg-white text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                        <span className="text-xs font-medium">Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            {/* Mobile View */}
            <div className="flex sm:hidden justify-between w-full">
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 flex items-center gap-1 rounded-md border border-border bg-white text-text-secondary disabled:opacity-50 hover:bg-gray-50"
                >
                    <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 flex items-center gap-1 rounded-md border border-border bg-white text-text-secondary disabled:opacity-50 hover:bg-gray-50"
                >
                    Next <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
