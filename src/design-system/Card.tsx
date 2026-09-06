import React, { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  padding = 'md',
  className = '',
  ...rest
}) => {
  let paddingStyle = 'p-5 sm:p-6';
  if (padding === 'none') paddingStyle = 'p-0';
  if (padding === 'sm') paddingStyle = 'p-3 sm:p-4';
  if (padding === 'lg') paddingStyle = 'p-6 sm:p-8';

  const interactiveStyle = interactive
    ? 'transition-all duration-200 hover:border-[#606C38]/40 hover:shadow-md cursor-pointer active:scale-[0.99]'
    : '';

  return (
    <div
      className={`bg-white rounded-3xl border border-[#E8E4D9] ${paddingStyle} ${interactiveStyle} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
