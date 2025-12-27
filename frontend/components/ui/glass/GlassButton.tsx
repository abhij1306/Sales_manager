import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const GlassButton = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  ...props
}: GlassButtonProps) => {
  const baseStyles = "relative inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 border border-transparent rounded-xl",
    secondary: "bg-white/60 text-gray-700 hover:bg-white/90 border border-white/40 shadow-sm backdrop-blur-md rounded-xl",
    ghost: "text-gray-600 hover:bg-black/5 hover:text-gray-900 rounded-lg",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-xl"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base"
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};
