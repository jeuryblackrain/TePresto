
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    leftIcon?: React.ElementType;
    rightIcon?: React.ElementType;
}

const Button: React.FC<ButtonProps> = ({ 
    children, 
    variant = 'primary', 
    size = 'md',
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className = '', 
    ...props 
}) => {
    const baseClasses = "inline-flex items-center justify-center font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    const iconSizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            {...props}
        >
            {LeftIcon && <LeftIcon className={`${iconSizeClasses[size]} mr-2 -ml-1`} />}
            {children}
            {RightIcon && <RightIcon className={`${iconSizeClasses[size]} ml-2 -mr-1`} />}
        </button>
    );
};

export default Button;
