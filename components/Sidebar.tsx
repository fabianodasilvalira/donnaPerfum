import React from 'react';
import { NavLink } from 'react-router-dom';
import { Page } from '../types';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    themeColor: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, themeColor }) => {
    const navItems: { id: Page; name: string; icon: string, path: string }[] = [
        { id: 'dashboard', name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
        { id: 'products', name: 'Estoque', icon: 'inventory_2', path: '/products' },
        { id: 'sales', name: 'Vendas', icon: 'point_of_sale', path: '/sales' },
        { id: 'customers', name: 'Clientes', icon: 'group', path: '/customers' },
        { id: 'reports', name: 'Relatórios', icon: 'bar_chart', path: '/reports' },
        { id: 'settings', name: 'Configurações', icon: 'settings', path: '/settings' },
    ];
    
    const headerTextColor = themeColor === 'white' ? 'text-gray-900' : 'text-white';
    
    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center py-3 px-4 rounded-lg transition-all duration-200 ${
            isActive
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-700/20 hover:text-primary-600 dark:hover:text-primary-300'
        }`;

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Sidebar */}
            <aside className={`w-64 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex flex-col shadow-lg fixed lg:relative inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:transform-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className={`h-20 flex items-center justify-center bg-primary-600`}>
                    <span className={`material-symbols-outlined text-4xl ${headerTextColor}`}>storefront</span>
                    <h1 className={`text-2xl font-bold ml-2 ${headerTextColor}`}>Donna Parfum</h1>
                </div>
                <nav className="flex-1 px-4 py-6">
                    <ul>
                        {navItems.map((item) => (
                            <li key={item.id} className="mb-2">
                                <NavLink
                                    to={item.path}
                                    onClick={onClose}
                                    className={navLinkClasses}
                                >
                                    <span className="material-symbols-outlined mr-4">{item.icon}</span>
                                    <span className="font-medium">{item.name}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="p-4 border-t-2 border-gray-100 dark:border-gray-700">
                    <a 
                        href="https://wa.me/5586998181489" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-center block text-gray-400 dark:text-gray-500 hover:underline"
                    >
                        desenvolvido por Fabiano Lira<br/>(86) 99818-1489
                    </a>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;