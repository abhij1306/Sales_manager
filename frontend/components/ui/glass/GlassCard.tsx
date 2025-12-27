import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard = ({ children, className, hoverEffect = true, ...props }: GlassCardProps) => {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 border border-white/40 shadow-sm",
        hoverEffect && "hover:shadow-md hover:bg-white/80 transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
