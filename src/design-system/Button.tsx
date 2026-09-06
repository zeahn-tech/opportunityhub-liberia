import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ochre' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...rest
}) => {
  // Base styles: mobile touch target minimum 44px, rounded-2xl, smooth transitions
  let baseStyles =
    'inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-150 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100 min-h-[44px] whitespace-nowrap cursor-pointer select-none';

  // Size specifications
  let sizeStyles = 'text-xs sm:text-sm px-5 py-2.5 gap-2';
  if (size === 'sm') {
    sizeStyles = 'text-xs px-3.5 py-2 gap-1.5 min-h-[38px] sm:min-h-[40px]';
  } else if (size === 'lg') {
    sizeStyles = 'text-sm sm:text-base px-7 py-3.5 gap-2.5 min-h-[48px]';
  }

  // Variant color palettes (Natural Tones)
  let variantStyles = '';
  switch (variant) {
    case 'primary':
      variantStyles = 'bg-[#283618] hover:bg-[#132A13] text-white shadow-sm border border-[#283618]';
      break;
    case 'secondary':
      variantStyles = 'bg-[#ECF3E9] hover:bg-[#DEEBD8] text-[#283618] border border-[#D5E4CF]';
      break;
    case 'ochre':
      variantStyles = 'bg-[#BC6C25] hover:bg-[#A35919] text-white shadow-sm border border-[#BC6C25]';
      break;
    case 'outline':
      variantStyles = 'bg-white hover:bg-[#F9F8F6] text-[#283618] border border-[#E8E4D9] shadow-xs';
      break;
    case 'ghost':
      variantStyles = 'bg-transparent hover:bg-[#E8E4D9]/40 text-[#606C38] hover:text-[#132A13]';
      break;
    case 'danger':
      variantStyles = 'bg-[#FCF0E8] hover:bg-[#F8DFD3] text-[#8C2F1B] border border-[#F2C0A2]';
      break;
  }

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
