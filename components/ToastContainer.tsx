import React from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ message, type }) => {
    const baseClasses = "flex items-center w-full max-w-xs p-4 space-x-4 text-gray-500 bg-white divide-x divide-gray-200 rounded-lg shadow-lg dark:text-gray-400 dark:divide-gray-700 space-x dark:bg-gray-800";
    const typeClasses = {
        success: "text-green-500 bg-green-100 dark:bg-green-800 dark:text-green-200",
        error: "text-red-500 bg-red-100 dark:bg-red-800 dark:text-red-200",
    };
    const icon = {
        success: "check_circle",
        error: "error",
    };

    return (
        <div className={baseClasses} role="alert">
            <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${typeClasses[type]}`}>
                <span className="material-symbols-outlined text-xl">{icon[type]}</span>
            </div>
            <div className="pl-4 text-sm font-normal">{message}</div>
        </div>
    );
};


interface ToastContainerProps {
    toasts: { id: number; message: string; type: 'success' | 'error' }[];
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
    return (
        <div className="fixed top-5 right-5 z-[100] space-y-2">
            {toasts.map(toast => (
                <Toast key={toast.id} message={toast.message} type={toast.type} />
            ))}
        </div>
    );
};

export default ToastContainer;
