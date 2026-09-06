import React, { ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div
      className={`p-8 sm:p-12 text-center bg-white rounded-3xl border border-[#E8E4D9] flex flex-col items-center justify-center ${className}`}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#ECF3E9] text-[#283618] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-serif font-bold text-[#132A13] mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-[#606C38] max-w-md mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
