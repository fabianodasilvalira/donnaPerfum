import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { Sale, Product, Customer, FilterType, ReportType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface ReportsContext {
    sales: Sale[];
    products: Product[];
    customers: Customer[];
    chartThemeColor: string;
}

const Reports: React.FC = () => {
    const { sales, products, customers, chartThemeColor } = useOutletContext<ReportsContext>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [filterType, setFilterType] = useState<FilterType>('week');
    const [reportType, setReportType] = useState<ReportType>(searchParams.get('type') as ReportType || 'sales');
    const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const typeFromUrl = searchParams.get('type') as ReportType;
        if (typeFromUrl && typeFromUrl !== reportType) {
            setReportType(typeFromUrl);
        }
    }, [searchParams, reportType]);

    const handleSetReportType = (type: ReportType) => {
        setReportType(type);
        setSearchParams({ type });
    };

    const reportOptions: { id: ReportType, name: string, icon: string }[] = [
        { id: 'sales', name: 'Vendas', icon: 'monitoring' },
        { id: 'profit', name: 'Lucro', icon: 'show_chart' },
        { id: 'sold_products', name: 'Produtos Vendidos', icon: 'receipt_long' },
        { id: 'canceled_sales', name: 'Vendas Canceladas', icon: 'cancel' },
        { id: 'overdue', name: 'Cobranças', icon: 'pending_actions' },
        { id: 'low_stock', name: 'Estoque Baixo', icon: 'production_quantity_limits' }
    ];

    const completedSales = useMemo(() => sales.filter(s => s.status === 'completed'), [sales]);
    const canceledSales = useMemo(() => sales.filter(s => s.status === 'canceled'), [sales]);
    
    const useFilteredSales = (baseSales: Sale[]) => {
        return useMemo(() => {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            if (filterType === 'today') {
                return baseSales.filter(s => new Date(s.date).toDateString() === today.toDateString());
            }
            if (filterType === 'custom') {
                const selected = new Date(customDate);
                const selectedLocal = new Date(selected.valueOf() + selected.getTimezoneOffset() * 60 * 1000);
                return baseSales.filter(s => new Date(s.date).toDateString() === selectedLocal.toDateString());
            }
            if (filterType === 'week') {
                const dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday
                const firstDayOfWeek = new Date(today);
                firstDayOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                
                const lastDayOfWeek = new Date(firstDayOfWeek);
                lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

                return baseSales.filter(s => {
                    const saleDate = new Date(s.date);
                    return saleDate >= firstDayOfWeek && saleDate <= lastDayOfWeek;
                });
            }
            if (filterType === 'to_date') { // "Até hoje"
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                return baseSales.filter(s => new Date(s.date) >= monthStart);
            }
            if (filterType === 'month') {
                return baseSales.filter(s => 
                    new Date(s.date).getMonth() === today.getMonth() &&
                    new Date(s.date).getFullYear() === today.getFullYear()
                );
            }
            return [];
        }, [baseSales, filterType, customDate]);
    }

    const filteredCompletedSales = useFilteredSales(completedSales);
    const filteredCanceledSales = useFilteredSales(canceledSales);

    const SalesReport = () => {
        const totalRevenue = filteredCompletedSales.reduce((sum, s) => sum + s.total, 0);
        const totalProfit = filteredCompletedSales.reduce((sum, s) => sum + (s.total - s.totalCost), 0);
        const totalSales = filteredCompletedSales.length;

        const chartData = useMemo(() => {
            if (filterType === 'today' || filterType === 'custom' || filterType === 'to_date') {
               let dateLabel = 'Período';
               if(filterType === 'today') dateLabel = 'Hoje';
               if(filterType === 'custom') dateLabel = new Date(customDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
               if(filterType === 'to_date') dateLabel = `Mês até Hoje`;
               return [{ name: dateLabel, Receita: totalRevenue, Lucro: totalProfit }];
            } else if (filterType === 'week') {
                const weekData: { [key: string]: {receita: number, lucro: number} } = {};
                const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                daysOfWeek.forEach(day => weekData[day] = {receita: 0, lucro: 0});
                
                filteredCompletedSales.forEach(s => {
                    const day = daysOfWeek[new Date(s.date).getDay()];
                    weekData[day].receita += s.total;
                    weekData[day].lucro += (s.total - s.totalCost);
                });
                return Object.entries(weekData).map(([name, values]) => ({ name, Receita: values.receita, Lucro: values.lucro }));
            } else if (filterType === 'month') {
                const monthData: { [key: string]: {receita: number, lucro: number} } = {};
                filteredCompletedSales.forEach(s => {
                    const dateKey = new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    if(!monthData[dateKey]) monthData[dateKey] = {receita: 0, lucro: 0};
                    monthData[dateKey].receita += s.total;
                    monthData[dateKey].lucro += (s.total - s.totalCost);
                });
                return Object.entries(monthData).map(([name, values]) => ({ name, Receita: values.receita, Lucro: values.lucro })).sort((a,b) => a.name.localeCompare(b.name));
            }
            return [];
        }, [filteredCompletedSales, filterType, totalRevenue, totalProfit, customDate]);

        const topSellingProducts = useMemo(() => {
            const productCount: {[key: string]: number} = {};
            filteredCompletedSales.forEach(sale => {
                sale.items.forEach(item => {
                    productCount[item.productId] = (productCount[item.productId] || 0) + item.quantity;
                });
            });

            return Object.entries(productCount).sort(([, a], [, b]) => b - a).slice(0, 5).map(([productId, quantity]) => ({
                product: products.find(p => p.id === productId),
                quantity
            }));
        }, [filteredCompletedSales, products]);

        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                        <div className="flex items-center justify-center gap-1">
                            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Receita Total</h3>
                            <div className="relative group flex items-center">
                                <span className="material-symbols-outlined text-gray-400 cursor-help text-base">info</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 text-sm font-normal text-left text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 dark:bg-gray-700">
                                    Receita Bruta: O valor total de todas as suas vendas no período, sem descontar nenhum custo.
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 dark:border-t-gray-700"></div>
                                </div>
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-green-600 dark:text-green-400 mt-2">{formatCurrency(totalRevenue)}</p>
                    </div>
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                        <div className="flex items-center justify-center gap-1">
                            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Lucro Total</h3>
                             <div className="relative group flex items-center">
                                <span className="material-symbols-outlined text-gray-400 cursor-help text-base">info</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-sm font-normal text-left text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 dark:bg-gray-700">
                                    Lucro Bruto: O valor que sobra da receita após subtrair o custo dos produtos vendidos.
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 dark:border-t-gray-700"></div>
                                </div>
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-purple-600 dark:text-purple-400 mt-2">{formatCurrency(totalProfit)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                        <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Número de Vendas</h3>
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">{totalSales}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md h-96">
                        <h2 className="text-xl font-bold mb-4">Performance de Vendas</h2>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128, 128, 128, 0.3)" />
                                <XAxis dataKey="name" tick={{ fill: 'rgb(156 163 175)' }} />
                                <YAxis tickFormatter={(value) => formatCurrency(value as number)} tick={{ fill: 'rgb(156 163 175)' }}/>
                                <Tooltip 
                                    formatter={(value) => formatCurrency(value as number)}
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                                        borderColor: 'rgba(55, 65, 81, 1)',
                                        borderRadius: '0.5rem'
                                    }}
                                    labelStyle={{ color: '#E5E7EB' }}
                                />
                                <Legend wrapperStyle={{color: '#9CA3AF'}} />
                                <Bar dataKey="Receita" fill={chartThemeColor} />
                                <Bar dataKey="Lucro" fill="#16A34A" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                        <h2 className="text-xl font-bold mb-4">Produtos Mais Vendidos</h2>
                         <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {topSellingProducts.map(({product, quantity}) => product ? (
                                <li key={product.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{product.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{product.brand}</p>
                                    </div>
                                    <p className="font-semibold text-primary-600 dark:text-primary-300">{quantity} un.</p>
                                </li>
                            ) : null)}
                        </ul>
                    </div>
                </div>
            </>
        );
    };

    const ProfitReport = () => {
        const totalRevenue = filteredCompletedSales.reduce((sum, s) => sum + s.total, 0);
        const totalCost = filteredCompletedSales.reduce((sum, s) => sum + s.totalCost, 0);
        const grossProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        const chartData = useMemo(() => {
            const processData = (sales: Sale[]) => {
                const revenue = sales.reduce((sum, s) => sum + s.total, 0);
                const cost = sales.reduce((sum, s) => sum + s.totalCost, 0);
                const profit = revenue - cost;
                return { Receita: revenue, Custo: cost, Lucro: profit };
            };

            if (filterType === 'today' || filterType === 'custom' || filterType === 'to_date') {
               let dateLabel = 'Período';
               if(filterType === 'today') dateLabel = 'Hoje';
               if(filterType === 'custom') dateLabel = new Date(customDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
               if(filterType === 'to_date') dateLabel = `Mês até Hoje`;
               return [{ name: dateLabel, ...processData(filteredCompletedSales)}];
            } else if (filterType === 'week') {
                const weekData: { [key: string]: {receita: number, custo: number, lucro: number} } = {};
                const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                daysOfWeek.forEach(day => weekData[day] = {receita: 0, custo: 0, lucro: 0});
                
                filteredCompletedSales.forEach(s => {
                    const day = daysOfWeek[new Date(s.date).getDay()];
                    const revenue = s.total;
                    const cost = s.totalCost;
                    const profit = revenue - cost;
                    weekData[day].receita += revenue;
                    weekData[day].custo += cost;
                    weekData[day].lucro += profit;
                });
                return Object.entries(weekData).map(([name, values]) => ({ name, Receita: values.receita, Custo: values.custo, Lucro: values.lucro }));
            } else if (filterType === 'month') {
                const monthData: { [key: string]: {receita: number, custo: number, lucro: number} } = {};
                filteredCompletedSales.forEach(s => {
                    const dateKey = new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    if(!monthData[dateKey]) monthData[dateKey] = {receita: 0, custo: 0, lucro: 0};
                    const revenue = s.total;
                    const cost = s.totalCost;
                    const profit = revenue - cost;
                    monthData[dateKey].receita += revenue;
                    monthData[dateKey].custo += cost;
                    monthData[dateKey].lucro += profit;
                });
                return Object.entries(monthData).map(([name, values]) => ({ name, Receita: values.receita, Custo: values.custo, Lucro: values.lucro })).sort((a,b) => a.name.localeCompare(b.name));
            }
            return [];
        }, [filteredCompletedSales, filterType, customDate]);

        const mostProfitableProducts = useMemo(() => {
            const productProfits: {[key: string]: { product: Product | undefined, totalProfit: number, quantity: number, totalRevenue: number }} = {};

            filteredCompletedSales.forEach(sale => {
                sale.items.forEach(item => {
                    if (!productProfits[item.productId]) {
                        productProfits[item.productId] = {
                            product: products.find(p => p.id === item.productId),
                            totalProfit: 0,
                            quantity: 0,
                            totalRevenue: 0,
                        };
                    }
                    const profit = (item.unitPrice - item.unitCostPrice) * item.quantity;
                    const revenue = item.unitPrice * item.quantity;
                    if(productProfits[item.productId]) {
                        productProfits[item.productId].totalProfit += profit;
                        productProfits[item.productId].quantity += item.quantity;
                        productProfits[item.productId].totalRevenue += revenue;
                    }
                });
            });

            return Object.values(productProfits).sort((a, b) => b.totalProfit - a.totalProfit);

        }, [filteredCompletedSales, products]);
        
        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                        <div className="flex items-center justify-center gap-1">
                            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Receita Bruta</h3>
                            <div className="relative group flex items-center">
                                <span className="material-symbols-outlined text-gray-400 cursor-help text-base">info</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 text-sm font-normal text-left text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 dark:bg-gray-700">
                                    Receita Bruta: O valor total de todas as suas vendas no período, sem descontar nenhum custo.
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 dark:border-t-gray-700"></div>
                                </div>
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-green-600 dark:text-green-400 mt-2">{formatCurrency(totalRevenue)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                        <div className="flex items-center justify-center gap-1">
                            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Custo Total</h3>
                            <div className="relative group flex items-center">
                                <span className="material-symbols-outlined text-gray-400 cursor-help text-base">info</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 text-sm font-normal text-left text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 dark:bg-gray-700">
                                    Custo Total: A soma de quanto você pagou pelos produtos que foram vendidos no período.
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 dark:border-t-gray-700"></div>
                                </div>
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-red-600 dark:text-red-400 mt-2">{formatCurrency(totalCost)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                        <div className="flex items-center justify-center gap-1">
                            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Lucro Bruto</h3>
                            <div className="relative group flex items-center">
                                <span className="material-symbols-outlined text-gray-400 cursor-help text-base">info</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-sm font-normal text-left text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 dark:bg-gray-700">
                                    Lucro Bruto: O valor que sobra da receita após subtrair o custo dos produtos vendidos. (Receita - Custo)
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 dark:border-t-gray-700"></div>
                                </div>
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-purple-600 dark:text-purple-400 mt-2">{formatCurrency(grossProfit)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                        <div className="flex items-center justify-center gap-1">
                            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Margem de Lucro</h3>
                            <div className="relative group flex items-center">
                                <span className="material-symbols-outlined text-gray-400 cursor-help text-base">info</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-sm font-normal text-left text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 dark:bg-gray-700">
                                    Margem de Lucro: A porcentagem do lucro em relação à receita. (Lucro / Receita * 100)
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 dark:border-t-gray-700"></div>
                                </div>
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">{profitMargin.toFixed(2)}%</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md h-96">
                        <h2 className="text-xl font-bold mb-4">Análise Financeira</h2>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128, 128, 128, 0.3)" />
                                <XAxis dataKey="name" tick={{ fill: 'rgb(156 163 175)' }} />
                                <YAxis tickFormatter={(value) => formatCurrency(value as number)} tick={{ fill: 'rgb(156 163 175)' }}/>
                                <Tooltip 
                                    formatter={(value) => formatCurrency(value as number)}
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                                        borderColor: 'rgba(55, 65, 81, 1)',
                                        borderRadius: '0.5rem'
                                    }}
                                    labelStyle={{ color: '#E5E7EB' }}
                                />
                                <Legend wrapperStyle={{color: '#9CA3AF'}} />
                                <Bar dataKey="Receita" fill={chartThemeColor} />
                                <Bar dataKey="Custo" fill="#EF4444" />
                                <Bar dataKey="Lucro" fill="#16A34A" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                        <h2 className="text-xl font-bold mb-4">Produtos Mais Lucrativos</h2>
                        <div className="overflow-y-auto max-h-80">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                                    <tr>
                                        <th className="py-2 font-semibold text-gray-600 dark:text-gray-300">Produto</th>
                                        <th className="py-2 font-semibold text-gray-600 dark:text-gray-300 text-right">Lucro Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mostProfitableProducts.map(({ product, totalProfit }) => product ? (
                                        <tr key={product.id} className="border-t border-gray-100 dark:border-gray-700">
                                            <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{product.name}</td>
                                            <td className="py-2 font-semibold text-purple-600 dark:text-purple-400 text-right">{formatCurrency(totalProfit)}</td>
                                        </tr>
                                    ) : null)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </>
        );
    };


    const SoldProductsReport = () => {
        const soldProductsData = useMemo(() => {
            const productData: {[key: string]: { product: Product, quantity: number, revenue: number, profit: number }} = {};
            
            filteredCompletedSales.forEach(sale => {
                sale.items.forEach(item => {
                    if (!productData[item.productId]) {
                        const product = products.find(p => p.id === item.productId);
                        if(product) productData[item.productId] = { product, quantity: 0, revenue: 0, profit: 0 };
                    }
                    if(productData[item.productId]) {
                        const revenue = item.quantity * item.unitPrice;
                        const cost = item.quantity * item.unitCostPrice;
                        productData[item.productId].quantity += item.quantity;
                        productData[item.productId].revenue += revenue;
                        productData[item.productId].profit += (revenue - cost);
                    }
                });
            });
            return Object.values(productData).sort((a,b) => b.quantity - a.quantity);
        }, [filteredCompletedSales, products]);
        
        return (
             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                <h2 className="text-2xl font-bold mb-4">Produtos Vendidos no Período</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Produto</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-center">Qtd.</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Receita</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Lucro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {soldProductsData.map(({product, quantity, revenue, profit}) => (
                                 <tr key={product.id} onClick={() => navigate(`/products/${product.id}`)} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                    <td className="py-3 px-4 font-medium">{product.name} <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">({product.brand})</span></td>
                                    <td className="py-3 px-4 text-center font-medium">{quantity}</td>
                                    <td className="py-3 px-4 font-semibold text-green-600 dark:text-green-400 text-right">{formatCurrency(revenue)}</td>
                                    <td className="py-3 px-4 font-semibold text-purple-600 dark:text-purple-400 text-right">{formatCurrency(profit)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {soldProductsData.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum produto vendido no período selecionado.</p>}
            </div>
        )
    };

    const CanceledSalesReport = () => {
        const salesWithDetails = useMemo(() => {
            return filteredCanceledSales.map(sale => ({
                ...sale,
                customerName: customers.find(c => c.id === sale.customerId)?.name || 'N/A',
            })).sort((a, b) => b.date.getTime() - a.date.getTime());
        }, [filteredCanceledSales, customers]);

        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                <h2 className="text-2xl font-bold mb-4">Vendas Canceladas no Período</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Data</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Cliente</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesWithDetails.map(sale => (
                                <tr key={sale.id} onClick={() => navigate(`/sales/${sale.id}`)} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                    <td className="py-3 px-4">{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                                    <td className="py-3 px-4 font-medium">{sale.customerName}</td>
                                    <td className="py-3 px-4 text-right font-medium text-red-600 dark:text-red-400 line-through">{formatCurrency(sale.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {salesWithDetails.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma venda cancelada no período selecionado.</p>}
            </div>
        );
    };

    const OverdueReport = () => {
        const overdueReportData = useMemo(() => {
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const report: {[key: string]: {customer: Customer, overdueAmount: number, overdueCount: number}} = {};

            sales.forEach(sale => {
                if(sale.paymentMethod !== 'credit' || sale.status === 'canceled') return;

                const overdueInstallments = sale.installments.filter(inst => new Date(inst.dueDate) < today && inst.status !== 'paid');

                if (overdueInstallments.length > 0) {
                    const customer = customers.find(c => c.id === sale.customerId);
                    if (customer) {
                        if(!report[customer.id]){
                            report[customer.id] = { customer, overdueAmount: 0, overdueCount: 0 };
                        }
                        report[customer.id].overdueAmount += overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0);
                        report[customer.id].overdueCount += overdueInstallments.length;
                    }
                }
            });

            return Object.values(report).sort((a,b) => b.overdueAmount - a.overdueAmount);
        }, [sales, customers]);

        const handleSendOverdueReminder = (customer: Customer, amount: number) => {
            const phone = customer.phone.replace(/\D/g, '');
            const value = formatCurrency(amount);
            
            let message = `Olá, ${customer.name}. Gostaríamos de lembrar sobre seu débito em aberto na Donna Parfum, no valor de ${value}.`;
            message += `\n\nPor favor, entre em contato para regularizar sua situação. Agradecemos a sua atenção!`;

            const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        };

        return (
            <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                 <h2 className="text-2xl font-bold mb-2">Clientes com Crediário Atrasado</h2>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Este relatório exibe a situação atual completa e não é afetado pelo filtro de data. Clique em uma linha para ver detalhes.</p>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Cliente</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Contato</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-center">Parcelas</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Valor Atrasado</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overdueReportData.map((data) => (
                                <tr key={data.customer.id} onClick={() => navigate(`/customers/${data.customer.id}`)} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                    <td className="py-3 px-4 font-medium">{data.customer.name}</td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 hidden md:table-cell">{data.customer.phone}</td>
                                    <td className="py-3 px-4 text-center">{data.overdueCount}</td>
                                    <td className="py-3 px-4 font-medium text-red-600 dark:text-red-400 text-right">{formatCurrency(data.overdueAmount)}</td>
                                    <td className="py-3 px-4 text-center">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendOverdueReminder(data.customer, data.overdueAmount);
                                            }}
                                            className="flex items-center justify-center gap-1 mx-auto bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 text-sm font-semibold transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-base">sms</span>
                                            Cobrar via WhatsApp
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 {overdueReportData.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum cliente com pagamentos atrasados. ✨</p>}
            </div>
            </>
        );
    }
    
    const LowStockReport = () => {
        const lowStockProducts = useMemo(() => {
            return products.filter(p => p.stock <= 5).sort((a,b) => a.stock - b.stock);
        }, [products]);

        return (
             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                 <h2 className="text-2xl font-bold mb-2">Produtos com Estoque Baixo (5 ou menos unidades)</h2>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Este relatório exibe a situação atual completa e não é afetado pelo filtro de data.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Foto</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Produto</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 hidden sm:table-cell">Marca</th>
                                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-center">Estoque</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lowStockProducts.map(product => (
                                <tr key={product.id} onClick={() => navigate(`/products/${product.id}`)} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                    <td className="py-3 px-4">
                                        <img src={product.photo || 'https://via.placeholder.com/40'} alt={product.name} className="w-10 h-10 rounded-md object-cover" />
                                    </td>
                                    <td className="py-3 px-4 font-medium">{product.name}</td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{product.brand}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="font-bold text-lg text-red-600 dark:text-red-400">{product.stock}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
                 {lowStockProducts.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum produto com estoque baixo.</p>}
            </div>
        );
    }

    const renderReport = () => {
        switch(reportType) {
            case 'sales': return <SalesReport />;
            case 'profit': return <ProfitReport />;
            case 'overdue': return <OverdueReport />;
            case 'sold_products': return <SoldProductsReport />;
            case 'low_stock': return <LowStockReport />;
            case 'canceled_sales': return <CanceledSalesReport />;
            default: return null;
        }
    }
    
    return (
        <div>
            <div className="print-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <button
                    onClick={() => window.print()}
                    className="flex items-center justify-center bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700 transition-colors"
                >
                    <span className="material-symbols-outlined mr-2">print</span>
                    Imprimir
                </button>
                <div className="w-full md:w-auto">
                    {/* Desktop */}
                    <div className="hidden md:flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                        {(['today', 'week', 'to_date', 'month'] as FilterType[]).map(p => (
                            <button 
                                key={p}
                                onClick={() => setFilterType(p)}
                                className={`px-3 py-1.5 rounded-md font-semibold transition-colors text-sm ${filterType === p ? 'bg-white dark:bg-gray-800 text-primary-700 dark:text-primary-300 shadow-sm' : 'bg-transparent text-gray-600 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-300'}`}
                            >
                                {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'to_date' ? 'Até Hoje' : 'Mês'}
                            </button>
                        ))}
                        <input
                            type="date"
                            value={customDate}
                            onChange={(e) => {
                                setCustomDate(e.target.value);
                                setFilterType('custom');
                            }}
                            className={`px-3 py-1 rounded-md font-semibold text-sm border-2 transition-colors ${filterType === 'custom' ? 'bg-white dark:bg-gray-800 text-primary-700 dark:text-primary-300 border-primary-300 shadow-sm' : 'bg-transparent text-gray-600 dark:text-gray-300 border-transparent hover:text-primary-700 dark:hover:text-primary-300'}`}
                            style={{height: '34px', outline: 'none'}}
                        />
                    </div>
                     {/* Mobile */}
                    <div className="md:hidden space-y-2">
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value as FilterType)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 shadow-sm"
                        >
                            <option value="today">Hoje</option>
                            <option value="week">Esta Semana</option>
                            <option value="to_date">Este Mês (até hoje)</option>
                            <option value="month">Mês (completo)</option>
                            <option value="custom">Data específica...</option>
                        </select>
                        {filterType === 'custom' && (
                            <input
                                type="date"
                                value={customDate}
                                onChange={e => setCustomDate(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 shadow-sm"
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-8 print-hidden">
                <div className="flex space-x-1 sm:space-x-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-x-auto">
                    {reportOptions.map(opt => (
                        <button 
                            key={opt.id}
                            onClick={() => handleSetReportType(opt.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all duration-300 whitespace-nowrap ${
                                reportType === opt.id
                                    ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-300 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-300'
                            }`}
                        >
                            <span className="material-symbols-outlined text-xl">{opt.icon}</span>
                            <span className="text-sm">{opt.name}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="printable-content">
                {renderReport()}
            </div>
        </div>
    );
};

export default Reports;