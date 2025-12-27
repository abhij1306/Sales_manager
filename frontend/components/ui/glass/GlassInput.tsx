import React from 'react';
import { cn } from '@/lib/utils';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
            {label}
          </label>
        )}
        <input
          className={cn(
            "w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm",
            "text-gray-900 placeholder:text-gray-400",
            "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
            "transition-all outline-none backdrop-blur-sm",
            error && "border-red-300 focus:border-red-500 focus:ring-red-200",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500 ml-1">{error}</p>}
      </div>
    );
  }
);
GlassInput.displayName = "GlassInput";
