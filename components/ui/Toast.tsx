import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { ToastMessage } from '../../contexts/ToastContext.ts';

interface ToastProps {
    toast: ToastMessage;
    onDismiss: (id: number) => void;
}

const toastConfig = {
    success: {
        icon: CheckCircle,
        iconClass: 'text-green-500',
    },
    error: {
        icon: AlertTriangle,
        iconClass: 'text-red-500',
    },
    info: {
        icon: Info,
        iconClass: 'text-blue-500',
    },
};

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);
    const { message, type, id } = toast;
    const { icon: Icon, iconClass } = toastConfig[type];

     useEffect(() => {
        // Automatically start exit animation before the context removes the toast
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
        }, 4600);
        return () => clearTimeout(exitTimer);
    }, [id]);

    const handleDismiss = () => {
        setIsExiting(true);
        // Allow time for exit animation before calling remove
        setTimeout(() => onDismiss(id), 400);
    };

    return (
        <div
            role="alert"
            className={`
                w-full max-w-sm p-4 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5
                transform transition-all duration-300 ease-in-out pointer-events-auto
                ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
            `}
        >
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <Icon className={`w-6 h-6 ${iconClass}`} aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">{message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button
                        onClick={handleDismiss}
                        className="inline-flex text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        <span className="sr-only">Close</span>
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Toast;