import React from 'react';
import { LoanStatus, ScheduleStatus } from '../../types.ts';

interface StatusBadgeProps {
    status: LoanStatus | ScheduleStatus;
}

const statusConfig: Record<LoanStatus | ScheduleStatus, { label: string; className: string }> = {
    // Loan Statuses
    [LoanStatus.ACTIVO]: {
        label: 'Activo',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    },
    [LoanStatus.PAGADO]: {
        label: 'Pagado',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    },
    [LoanStatus.ATRASADO]: {
        label: 'Atrasado',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    },
    // Schedule Statuses
    // FIX: The entry for `ScheduleStatus.PAGADO` was removed to resolve a duplicate key error,
    // as its value ('Pagado') is the same as `LoanStatus.PAGADO`. The style for `LoanStatus.PAGADO`
    // will now be used for all 'Pagado' statuses, ensuring a consistent blue badge for paid items.
    [ScheduleStatus.PENDIENTE]: {
        label: 'Pendiente',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    },
    [ScheduleStatus.VENCIDO]: {
        label: 'Vencido',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const config = statusConfig[status] || { 
        label: status, 
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' 
    };

    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
            {config.label}
        </span>
    );
};

export default StatusBadge;
