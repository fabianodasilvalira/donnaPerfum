import React from 'react';
import { InstallmentStatus } from '../types';

interface InstallmentStatusBadgeProps {
    status: InstallmentStatus;
}

const InstallmentStatusBadge: React.FC<InstallmentStatusBadgeProps> = ({ status }) => {
    const statusInfo = {
        paid: { text: 'Paga', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
        pending: { text: 'Pendente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' },
        overdue: { text: 'Atrasada', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
    };
    const info = statusInfo[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${info.color}`}>{info.text}</span>;
};

export default InstallmentStatusBadge;