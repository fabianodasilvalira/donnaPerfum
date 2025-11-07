import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { Product, Customer, Sale, Page, Installment, ReportType } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ToastContainer from './components/ToastContainer';

// Custom Hook for persisting state to localStorage
function usePersistentState<T>(key: string, initialState: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const storageValue = window.localStorage.getItem(key);
            if (storageValue) {
                // Parse dates correctly
                return JSON.parse(storageValue, (k, v) => {
                    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(v)) {
                        return new Date(v);
                    }
                    return v;
                });
            }
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
        }
        return initialState;
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    }, [key, state]);

    return [state, setState];
}


const themeColors: { [key: string]: { [key: string]: string } } = {
    purple: { '50': '#F5F3FF', '100': '#EDE9FE', '300': '#C4B5FD', '600': '#8B5CF6', '700': '#7C3AED' },
    blue: { '50': '#EFF6FF', '100': '#DBEAFE', '300': '#93C5FD', '600': '#3B82F6', '700': '#2563EB' },
    green: { '50': '#F0FDF4', '100': '#DCFCE7', '300': '#86EFAC', '600': '#22C55E', '700': '#16A34A' },
    pink: { '50': '#FDF2F8', '100': '#FCE7F3', '300': '#F9A8D4', '600': '#EC4899', '700': '#DB2777' },
    white: { '50': '#f1f5f9', '100': '#e2e8f0', '300': '#cbd5e1', '600': '#ffffff', '700': '#f8fafc' },
    black: { '50': '#4b5563', '100': '#374151', '300': '#1f2937', '600': '#111827', '700': '#000000' },
};

const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/products': 'Estoque de Produtos',
    '/sales': 'Histórico de Vendas',
    '/sales/new': 'Nova Venda',
    '/customers': 'Clientes',
    '/reports': 'Relatórios',
    '/settings': 'Configurações',
};


const App: React.FC = () => {
    const [themeColor, setThemeColor] = usePersistentState<string>('themeColor', 'purple');
    const [themeMode, setThemeMode] = usePersistentState<'light' | 'dark'>('themeMode', 'light');
    const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'error' }[]>([]);

    const addToast = (message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
        }, 3000);
    };

    const toggleThemeMode = () => {
        setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    useEffect(() => {
        const root = document.documentElement;
        if (themeMode === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [themeMode]);

    const [products, setProducts] = usePersistentState<Product[]>('products', [
        { id: 'p1', name: 'Essencial Oud', brand: 'Natura', description: '100ml, Deo Parfum', price: 196.00, costPrice: 120.00, stock: 15, photo: 'https://i.imgur.com/v20yB1G.png', status: 'active' },
        { id: 'p2', name: 'Malbec Gold', brand: 'O Boticário', description: '100ml, Desodorante Colônia', price: 179.90, costPrice: 100.00, stock: 3, photo: 'https://i.imgur.com/r3n2Snd.png', status: 'active' },
        { id: 'p3', name: 'Bolsa Tote', brand: 'Arezzo', description: 'Couro sintético, cor preta', price: 299.90, costPrice: 180.00, stock: 8, photo: 'https://i.imgur.com/s4z4s9M.png', status: 'active' },
        { id: 'p4', name: 'Base Cover Up', brand: 'Mari Maria', description: 'Cor 04, Efeito Matte', price: 59.90, costPrice: 35.00, stock: 25, photo: 'https://i.imgur.com/jH9a3KX.png', status: 'active' },
        { id: 'p5', name: '212 VIP Rosé', brand: 'Carolina Herrera', description: '80ml, Eau de Parfum', price: 499.00, costPrice: 350.00, stock: 5, photo: 'https://i.imgur.com/KMN8s91.png', status: 'active' },
    ]);

    const [customers, setCustomers] = usePersistentState<Customer[]>('customers', [
        { id: 'c1', name: 'Maria Silva', phone: '(11) 98765-4321', address: 'Rua das Flores, 123, São Paulo, SP', cpf: '111.222.333-44', status: 'active' },
        { id: 'c2', name: 'João Pereira', phone: '(21) 91234-5678', address: 'Avenida Brasil, 456, Rio de Janeiro, RJ', cpf: '222.333.444-55', status: 'active' },
        { id: 'c3', name: 'Ana Costa', phone: '(31) 99999-8888', address: 'Praça da Liberdade, 789, Belo Horizonte, MG', cpf: '333.444.555-66', status: 'active' },
    ]);
    
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(today.getMonth() - 2);

    const [sales, setSales] = usePersistentState<Sale[]>('sales', [
        { id: 's1', customerId: 'c1', items: [{ productId: 'p1', quantity: 1, unitPrice: 196.00, unitCostPrice: 120.00 }], total: 196.00, totalCost: 120.00, paymentMethod: 'cash', installments: [], date: yesterday, status: 'completed' },
        { id: 's2', customerId: 'c2', items: [{ productId: 'p2', quantity: 1, unitPrice: 179.90, unitCostPrice: 100.00 }, { productId: 'p4', quantity: 1, unitPrice: 59.90, unitCostPrice: 35.00 }], total: 239.80, totalCost: 135.00, paymentMethod: 'credit', status: 'completed',
          installments: [
            { id: 'i1', saleId: 's2', amount: 119.90, dueDate: lastMonth, status: 'pending' },
            { id: 'i2', saleId: 's2', amount: 119.90, dueDate: today, status: 'pending' },
          ],
          date: twoMonthsAgo
        },
        { id: 's3', customerId: 'c3', items: [{ productId: 'p5', quantity: 1, unitPrice: 499.00, unitCostPrice: 350.00 }, { productId: 'p3', quantity: 1, unitPrice: 299.90, unitCostPrice: 180.00 }], total: 798.90, totalCost: 530.00, paymentMethod: 'credit', status: 'completed',
          installments: [
            { id: 'i1_s3', saleId: 's3', amount: 399.45, dueDate: twoMonthsAgo, status: 'paid' },
            { id: 'i2_s3', saleId: 's3', amount: 399.45, dueDate: lastMonth, status: 'pending' },
          ],
          date: twoMonthsAgo
        },
    ]);

    // Effect to update installment statuses from 'pending' to 'overdue' immutably.
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const needsUpdate = sales.some(sale =>
            sale.status !== 'canceled' &&
            sale.installments.some(inst => {
                const dueDate = new Date(inst.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return inst.status === 'pending' && dueDate < today;
            })
        );

        if (needsUpdate) {
            setSales(currentSales => 
                currentSales.map(sale => {
                    if (sale.status === 'canceled' || sale.paymentMethod !== 'credit') {
                        return sale;
                    }

                    const hasOverdueInstallments = sale.installments.some(inst => {
                         const dueDate = new Date(inst.dueDate);
                         dueDate.setHours(0, 0, 0, 0);
                         return inst.status === 'pending' && dueDate < today;
                    });
                    
                    if (!hasOverdueInstallments) {
                        return sale;
                    }

                    return {
                        ...sale,
                        installments: sale.installments.map(inst => {
                            const dueDate = new Date(inst.dueDate);
                            dueDate.setHours(0, 0, 0, 0);
                            if (inst.status === 'pending' && dueDate < today) {
                                return { ...inst, status: 'overdue' };
                            }
                            return inst;
                        }),
                    };
                })
            );
        }
    }, [sales, setSales]);


    useEffect(() => {
        const root = document.documentElement;
        const colors = themeColors[themeColor] || themeColors.purple;
        for (const [key, value] of Object.entries(colors)) {
            root.style.setProperty(`--color-primary-${key}`, value);
        }
    }, [themeColor]);
    
    const activeSales = useMemo(() => sales.filter(s => s.status === 'completed'), [sales]);
    
    const chartThemeColor = useMemo(() => {
        const colorMap: { [key: string]: string } = {
            purple: '#8B5CF6',
            blue: '#3B82F6',
            green: '#22C55E',
            pink: '#EC4899',
            white: '#374151',
            black: '#E5E7EB'
        };
        return colorMap[themeColor] || colorMap.purple;
    }, [themeColor]);


    const addProduct = useCallback((product: Omit<Product, 'id' | 'status'>) => {
        setProducts(prev => [...prev, { ...product, id: `p${Date.now()}`, status: 'active' }]);
        addToast('Produto adicionado com sucesso!');
    }, [setProducts, addToast]);
    
    const updateProduct = useCallback((updatedProduct: Product) => {
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        addToast('Produto atualizado com sucesso!');
    }, [setProducts, addToast]);

    const addSale = useCallback((sale: Omit<Sale, 'id' | 'installments'| 'status'> & { numInstallments?: number }): Sale => {
        const newSaleId = `s${Date.now()}`;
        let newInstallments: Installment[] = [];
        if (sale.paymentMethod === 'credit' && sale.numInstallments && sale.numInstallments > 0) {
            const installmentAmount = sale.total / sale.numInstallments;
            const baseDate = sale.firstDueDate ? new Date(sale.firstDueDate) : new Date(sale.date);

            for (let i = 0; i < sale.numInstallments; i++) {
                const dueDate = new Date(baseDate);
                const userTimezoneOffset = dueDate.getTimezoneOffset() * 60000;
                const dateInUTC = new Date(dueDate.getTime() + userTimezoneOffset);
                dateInUTC.setMonth(dateInUTC.getMonth() + i);

                newInstallments.push({
                    id: `i${i + 1}_${newSaleId}`,
                    saleId: newSaleId,
                    amount: installmentAmount,
                    dueDate: dateInUTC,
                    status: 'pending'
                });
            }
        }

        const newSale: Sale = { ...sale, id: newSaleId, installments: newInstallments, status: 'completed' };
        setSales(prev => [...prev, newSale]);

        setProducts(prevProducts => prevProducts.map(p => {
            const itemSold = sale.items.find(item => item.productId === p.id);
            if (itemSold) {
                return { ...p, stock: p.stock - itemSold.quantity };
            }
            return p;
        }));
        addToast('Venda registrada com sucesso!');
        return newSale;
    }, [setSales, setProducts, addToast]);

    const cancelSale = useCallback((saleId: string) => {
        setSales(prevSales => {
            const saleToCancel = prevSales.find(s => s.id === saleId);
            if (!saleToCancel || saleToCancel.status === 'canceled') {
                return prevSales;
            }
    
            setProducts(prevProducts => {
                return prevProducts.map(p => {
                    const itemSold = saleToCancel.items.find(item => item.productId === p.id);
                    if (itemSold) {
                        return { ...p, stock: p.stock + itemSold.quantity };
                    }
                    return p;
                });
            });
    
            addToast('Venda cancelada e estoque devolvido.', 'error');
            return prevSales.map(s => {
                if (s.id === saleId) {
                    return { ...s, status: 'canceled' };
                }
                return s;
            });
        });
    }, [setSales, setProducts, addToast]);
    
    const addCustomer = useCallback((customer: Omit<Customer, 'id' | 'status'>) => {
        setCustomers(prev => [...prev, { ...customer, id: `c${Date.now()}`, status: 'active' }]);
        addToast('Cliente adicionado com sucesso!');
    }, [setCustomers, addToast]);

    const updateCustomer = useCallback((updatedCustomer: Customer) => {
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        addToast('Cliente atualizado com sucesso!');
    }, [setCustomers, addToast]);

    const payInstallment = useCallback((saleId: string, installmentId: string) => {
        setSales(prevSales => prevSales.map(sale => {
            if (sale.id === saleId) {
                return {
                    ...sale,
                    installments: sale.installments.map(inst => {
                        if (inst.id === installmentId) {
                            return { ...inst, status: 'paid' };
                        }
                        return inst;
                    })
                };
            }
            return sale;
        }));
        addToast('Parcela marcada como paga!');
    }, [setSales, addToast]);
    
    const overdueInstallments = useMemo(() => {
        const overdue: (Installment & { customerName: string, customerId: string, customerPhone: string })[] = [];
        sales.forEach(sale => {
            if (sale.status === 'canceled') return;
            const customer = customers.find(c => c.id === sale.customerId);
            if(customer) {
                sale.installments.forEach(inst => {
                    if(inst.status === 'overdue') {
                        overdue.push({...inst, customerName: customer.name, customerId: sale.customerId, customerPhone: customer.phone });
                    }
                });
            }
        });
        return overdue;
    }, [sales, customers]);
    
    const outletContext = {
        products, customers, sales, activeSales,
        addProduct, updateProduct,
        addSale, cancelSale,
        addCustomer, updateCustomer, payInstallment,
        overdueInstallments,
        chartThemeColor,
        themeColor, setThemeColor, themeMode, toggleThemeMode,
    };
    
    return (
      <Routes>
        <Route path="/" element={<AppLayout toasts={toasts} themeColor={themeColor} context={outletContext} />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:productId" element={<Products />} />
            <Route path="sales" element={<Sales />} />
            <Route path="sales/new" element={<Sales />} />
            <Route path="sales/:saleId" element={<Sales />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:customerId" element={<Customers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    );
};

const AppLayout: React.FC<{ toasts: any[], themeColor: string, context: any }> = ({ toasts, themeColor, context }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const getTitle = (pathname: string) => {
        if (pathname.startsWith('/products/') && pathname !== '/products') return 'Detalhes do Produto';
        if (pathname.startsWith('/sales/') && pathname !== '/sales' && pathname !== '/sales/new') return 'Detalhes da Venda';
        if (pathname.startsWith('/customers/') && pathname !== '/customers') return 'Detalhes do Cliente';
        return pageTitles[pathname] || 'Dashboard';
    };
    
    const pageTitle = getTitle(location.pathname);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100">
            <ToastContainer toasts={toasts} />
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} themeColor={themeColor} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    pageTitle={pageTitle}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    themeColor={themeColor}
                />
                <main className="flex-1 overflow-y-auto p-4 sm:p-8">
                    <Outlet context={context} />
                </main>
            </div>
        </div>
    );
};

export default App;