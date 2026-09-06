import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height
}) => {
  let variantStyles = 'rounded-md h-4';
  if (variant === 'circular') {
    variantStyles = 'rounded-full w-10 h-10';
  } else if (variant === 'rectangular') {
    variantStyles = 'rounded-2xl h-24';
  }

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      style={style}
      className={`animate-pulse bg-[#E8E4D9]/60 ${variantStyles} ${className}`}
      aria-hidden="true"
    />
  );
};

export const OpportunityCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl border border-[#E8E4D9] p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" className="w-12 h-12" />
          <div className="space-y-1.5">
            <Skeleton className="w-36 h-3" />
            <Skeleton className="w-48 h-5" />
          </div>
        </div>
        <Skeleton className="w-20 h-6 rounded-full" />
      </div>
      <Skeleton className="w-full h-3" />
      <Skeleton className="w-3/4 h-3" />
      <div className="flex items-center gap-2 pt-2">
        <Skeleton className="w-24 h-6 rounded-full" />
        <Skeleton className="w-20 h-6 rounded-full" />
        <Skeleton className="w-28 h-6 rounded-full" />
      </div>
    </div>
  );
};
