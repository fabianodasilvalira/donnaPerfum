import React, { useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Sale, Product, Installment } from '../types';
import DashboardCard from '../components/DashboardCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';


interface DashboardContext {
    activeSales: Sale[];
    products: Product[];
    overdueInstallments: (Installment & { customerName: string; customerId: string; customerPhone: string })[];
    chartThemeColor: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

type ChartPeriod = 'week' | 'month' | 'last30';

const Dashboard: React.FC = () => {
    const { activeSales, products, overdueInstallments, chartThemeColor } = useOutletContext<DashboardContext>();
    const navigate = useNavigate();
    const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('week');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salesToday = activeSales.filter(s => {
        const saleDate = new Date(s.date);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === today.getTime();
    });
    
    const totalSalesToday = salesToday.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfitToday = salesToday.reduce((sum, sale) => sum + (sale.total - sale.totalCost), 0);

    const lowStockProducts = products.filter(p => p.stock <= 3);

    const chartData = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        let data: { name: string, Receita: number, Lucro: number }[] = [];
        
        const salesInPeriod = activeSales.filter(s => {
            const saleDate = new Date(s.date);
            if (chartPeriod === 'week') {
                const dayOfWeek = now.getDay();
                const firstDayOfWeek = new Date(now);
                firstDayOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                firstDayOfWeek.setHours(0,0,0,0);
                return saleDate >= firstDayOfWeek;
            }
            if (chartPeriod === 'month') {
                return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
            }
            if (chartPeriod === 'last30') {
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(now.getDate() - 30);
                return saleDate >= thirtyDaysAgo;
            }
            return false;
        });

        if (chartPeriod === 'week') {
            const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            data = daysOfWeek.map(day => ({ name: day, Receita: 0, Lucro: 0 }));
            salesInPeriod.forEach(s => {
                const dayIndex = new Date(s.date).getDay();
                data[dayIndex].Receita += s.total;
                data[dayIndex].Lucro += (s.total - s.totalCost);
            });
        } else { // month or last30
             const groupedData: { [key: string]: { Receita: number, Lucro: number } } = {};
             salesInPeriod.forEach(s => {
                const dateKey = new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                if (!groupedData[dateKey]) {
                    groupedData[dateKey] = { Receita: 0, Lucro: 0 };
                }
                groupedData[dateKey].Receita += s.total;
                groupedData[dateKey].Lucro += (s.total - s.totalCost);
            });
            data = Object.entries(groupedData).map(([name, values]) => ({ name, ...values })).sort((a,b) => a.name.localeCompare(b.name));
        }

        return data;
    }, [activeSales, chartPeriod]);


    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-8">
                <div onClick={() => navigate('/sales')} className="cursor-pointer">
                    <DashboardCard 
                        icon="attach_money" 
                        title="Vendas Hoje" 
                        value={formatCurrency(totalSalesToday)}
                        color="green" 
                        tooltipText="Receita Bruta: O valor total de todas as suas vendas hoje, sem descontar nenhum custo."
                    />
                </div>
                 <div onClick={() => navigate('/reports?type=profit')} className="cursor-pointer">
                    <DashboardCard 
                        icon="trending_up" 
                        title="Lucro Hoje" 
                        value={formatCurrency(totalProfitToday)}
                        color="purple" 
                        tooltipText="Lucro Bruto: O valor que sobra da receita de hoje após subtrair o custo dos produtos vendidos."
                    />
                </div>
                <div onClick={() => navigate('/reports?type=overdue')} className="cursor-pointer">
                    <DashboardCard 
                        icon="pending_actions" 
                        title="Cobranças Atrasadas" 
                        value={overdueInstallments.length}
                        color="red"
                    />
                </div>
                 <div onClick={() => navigate('/reports?type=low_stock')} className="cursor-pointer">
                    <DashboardCard 
                        icon="warning" 
                        title="Estoque Baixo" 
                        value={lowStockProducts.length}
                        color="blue" 
                    />
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md mb-8 h-[28rem]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <h2 className="text-xl font-bold mb-2 sm:mb-0">Visão Geral de Vendas</h2>
                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        {(['week', 'month', 'last30'] as ChartPeriod[]).map(period => (
                             <button
                                key={period}
                                onClick={() => setChartPeriod(period)}
                                className={`px-3 py-1.5 rounded-md font-semibold transition-colors text-sm ${
                                    chartPeriod === period
                                    ? 'bg-white dark:bg-gray-800 text-primary-700 dark:text-primary-300 shadow-sm'
                                    : 'bg-transparent text-gray-600 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-300'
                                }`}
                            >
                                {period === 'week' ? 'Esta Semana' : period === 'month' ? 'Este Mês' : 'Últimos 30 dias'}
                            </button>
                        ))}
                    </div>
                </div>
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


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800 dark:text-gray-100">
                        <span className="material-symbols-outlined text-red-500 mr-2">notifications_active</span>
                        Clientes com Pagamentos Atrasados
                    </h2>
                    {overdueInstallments.length > 0 ? (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {overdueInstallments.slice(0, 5).map(inst => (
                                <li key={inst.id} className="py-3">
                                    <button onClick={() => navigate(`/customers/${inst.customerId}`)} className="w-full text-left flex justify-between items-center group transition-colors">
                                        <div>
                                            <p className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-300">{inst.customerName}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Venc.: {new Date(inst.dueDate).toLocaleDateString('pt-BR')} | {inst.customerPhone}
                                            </p>
                                        </div>
                                        <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(inst.amount)}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 mt-4">Nenhuma cobrança atrasada. 🎉</p>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800 dark:text-gray-100">
                        <span className="material-symbols-outlined text-blue-500 mr-2">inventory</span>
                        Produtos com Estoque Baixo
                    </h2>
                    {lowStockProducts.length > 0 ? (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {lowStockProducts.slice(0, 5).map(product => (
                                <li key={product.id} className="py-3">
                                    <button onClick={() => navigate(`/products/${product.id}`)} className="w-full text-left flex justify-between items-center group transition-colors">
                                        <div>
                                            <p className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-300">{product.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{product.brand}</p>
                                        </div>
                                        <p className="font-semibold text-blue-600 dark:text-blue-400">{product.stock} unidades</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 mt-4">Nenhum produto com estoque baixo.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;