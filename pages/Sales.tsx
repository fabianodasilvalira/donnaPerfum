import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Sale, Product, Customer, PaymentMethod, SaleItem, Installment } from '../types';
import InstallmentStatusBadge from '../components/InstallmentStatusBadge';
import PaymentBooklet from '../components/PaymentBooklet';

interface SalesContext {
    sales: Sale[];
    products: Product[];
    customers: Customer[];
    addSale: (sale: Omit<Sale, 'id' | 'installments' | 'status'> & { numInstallments?: number }) => Sale;
    cancelSale: (saleId: string) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300 mb-6 group">
        <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
        <span className="ml-2 font-semibold">Voltar</span>
    </button>
);

const Sales: React.FC = () => {
    const { sales, products, customers, addSale, cancelSale } = useOutletContext<SalesContext>();
    const { saleId } = useParams<{ saleId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [view, setView] = useState<'list' | 'form' | 'details' | 'confirmCancel'>('list');
    
    const selectedSale = useMemo(() => sales.find(s => s.id === saleId), [sales, saleId]);

    useEffect(() => {
        if (saleId) {
            setView(selectedSale ? 'details' : 'list');
        } else if (location.pathname === '/sales/new') {
            setView('form');
        } else {
            setView('list');
        }
    }, [saleId, location.pathname, selectedSale]);

    const [showBooklet, setShowBooklet] = useState(false);
    
    const initialSaleState = {
        customerId: '',
        items: [] as (Omit<SaleItem, 'unitCostPrice'> & { name: string; unitCostPrice: number })[],
        paymentMethod: 'cash' as PaymentMethod,
        numInstallments: 1,
        firstDueDate: new Date()
    };
    
    const [newSale, setNewSale] = useState(initialSaleState);
    const [currentItem, setCurrentItem] = useState<{ productId: string, quantity: number }>({ productId: '', quantity: 1 });
    const [productSearch, setProductSearch] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [saleToCancelId, setSaleToCancelId] = useState<string | null>(null);

    const salesWithDetails = useMemo(() => {
        return sales.map(sale => ({
            ...sale,
            customerName: customers.find(c => c.id === sale.customerId)?.name || 'Cliente não encontrado',
        })).sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [sales, customers]);

    const handleAddItem = () => {
        if (!currentItem.productId || currentItem.quantity <= 0) return;
        const product = products.find(p => p.id === currentItem.productId);
        if (product) {
            setNewSale(prev => ({
                ...prev,
                items: [...prev.items, { productId: product.id, quantity: currentItem.quantity, unitPrice: product.price, unitCostPrice: product.costPrice, name: product.name }]
            }));
            setCurrentItem({ productId: '', quantity: 1 });
            setProductSearch('');
            setErrors(prev => ({...prev, items: ''})); // Clear item error on add
        }
    };

    const availableProductsForSearch = useMemo(() => {
        if (!productSearch) return [];
        const itemsInCart = newSale.items.map(i => i.productId);
        return products
            .filter(p => p.status === 'active' && p.stock > 0 && !itemsInCart.includes(p.id))
            .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
    }, [productSearch, products, newSale.items]);
    
    
    const handleRemoveItem = (productId: string) => {
        setNewSale(prev => ({
            ...prev,
            items: prev.items.filter(item => item.productId !== productId)
        }));
    };

    const totalNewSale = newSale.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const totalCostNewSale = newSale.items.reduce((sum, item) => sum + (item.unitCostPrice * item.quantity), 0);

    const validateSaleForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!newSale.customerId) newErrors.customerId = "É obrigatório selecionar um cliente.";
        if (newSale.items.length === 0) newErrors.items = "Adicione pelo menos um item à venda.";
        if (newSale.paymentMethod === 'credit' && newSale.numInstallments < 1) newErrors.numInstallments = "O número de parcelas deve ser no mínimo 1.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!validateSaleForm()) {
            return;
        }

        const saleDataForApp = {
            customerId: newSale.customerId,
            items: newSale.items.map(({name, ...rest}) => rest),
            paymentMethod: newSale.paymentMethod,
            numInstallments: newSale.paymentMethod === 'credit' ? newSale.numInstallments : undefined,
            total: totalNewSale,
            totalCost: totalCostNewSale,
            date: new Date(),
            firstDueDate: newSale.firstDueDate
        };
        
        const completedSale = addSale(saleDataForApp);
        setNewSale(initialSaleState);
        setErrors({});
        navigate(`/sales/${completedSale.id}`);
    };
    
    const handleCancelSale = (saleId: string) => {
        setSaleToCancelId(saleId);
        setView('confirmCancel');
    };

    const confirmCancellation = () => {
        if (saleToCancelId) {
            cancelSale(saleToCancelId);
        }
        setSaleToCancelId(null);
        setView('list');
    };
    
    if (view === 'confirmCancel' && saleToCancelId) {
        return (
            <div>
                <BackButton onClick={() => setView('list')} />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Confirmar Cancelamento</h1>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Tem certeza que deseja cancelar esta venda? O estoque dos produtos será devolvido.</p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setView('list')} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Não</button>
                        <button onClick={confirmCancellation} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Sim, Cancelar Venda</button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'details' && selectedSale) {
        const customer = customers.find(c => c.id === selectedSale.customerId);
        const profit = selectedSale.total - selectedSale.totalCost;

        const handleSendPurchaseSummary = () => {
            if (!customer) return;
            const phone = customer.phone.replace(/\D/g, '');
            let message = `Olá, ${customer.name}!\n\n`;
            message += `Obrigado pela sua compra em nossa loja, realizada em ${new Date(selectedSale.date).toLocaleDateString('pt-BR')}.\n\n`;
            message += '*Resumo da Compra:*\n';
            selectedSale.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                message += `- ${item.quantity}x ${product?.name || 'Produto desconhecido'}\n`;
            });
            message += `\n*Total: ${formatCurrency(selectedSale.total)}*\n\n`;
    
            if (selectedSale.paymentMethod === 'credit' && selectedSale.installments.length > 0) {
                message += '*Detalhes do Parcelamento:*\n';
                selectedSale.installments.forEach((inst, index) => {
                    message += `Parcela ${index + 1}/${selectedSale.installments.length}: ${formatCurrency(inst.amount)} (Vencimento: ${new Date(inst.dueDate).toLocaleDateString('pt-BR')})\n`;
                });
                message += '\nAgradecemos a preferência!';
            } else {
                message += 'Agradecemos a preferência!';
            }
    
            const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        };

        return (
            <>
                {showBooklet && customer && (
                    <PaymentBooklet 
                        sale={selectedSale}
                        customer={customer}
                        onClose={() => setShowBooklet(false)}
                    />
                )}
                <div>
                    <BackButton onClick={() => navigate('/sales')} />
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                        <div className="flex justify-between items-start">
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Detalhes da Venda</h1>
                             <div className="text-right">
                                <p className="font-semibold text-lg text-green-600 dark:text-green-400">Lucro: {formatCurrency(profit)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {customer && (
                                 <div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{customer.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Data da Compra: {new Date(selectedSale.date).toLocaleDateString('pt-BR')}</p>
                                </div>
                            )}
                            <div className="border-t dark:border-gray-700 pt-4">
                                <h4 className="font-semibold mb-2">Itens</h4>
                                <ul className="divide-y dark:divide-gray-700">
                                    {selectedSale.items.map(item => {
                                        const product = products.find(p => p.id === item.productId);
                                        return (
                                            <li key={item.productId} className="flex justify-between py-2">
                                                <div>
                                                    <p className="font-medium">{product?.name || 'Produto'}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                                                </div>
                                                <p className="font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</p>
                                            </li>
                                        )
                                    })}
                                </ul>
                                <div className="flex justify-end font-bold text-xl mt-2 py-2 border-t dark:border-gray-700">
                                    <span>Total:</span>
                                    <span>{formatCurrency(selectedSale.total)}</span>
                                </div>
                            </div>

                            {selectedSale.paymentMethod === 'credit' && selectedSale.installments.length > 0 && (
                                <div className="border-t dark:border-gray-700 pt-4">
                                    <h4 className="font-semibold mb-2">Parcelamento</h4>
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-100 dark:bg-gray-700">
                                            <tr>
                                                <th className="p-2 font-semibold text-gray-600 dark:text-gray-300">Vencimento</th>
                                                <th className="p-2 font-semibold text-gray-600 dark:text-gray-300 text-right">Valor</th>
                                                <th className="p-2 font-semibold text-gray-600 dark:text-gray-300 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedSale.installments.map(inst => (
                                                <tr key={inst.id} className="border-t dark:border-gray-700">
                                                    <td className="p-2">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</td>
                                                    <td className="p-2 text-right font-medium">{formatCurrency(inst.amount)}</td>
                                                    <td className="p-2 text-center">
                                                        <InstallmentStatusBadge status={inst.status} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end items-center mt-6 pt-4 border-t dark:border-gray-700 gap-4">
                             {selectedSale.paymentMethod === 'credit' && (
                                <button
                                    onClick={() => setShowBooklet(true)}
                                    className="flex items-center bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined mr-2">receipt_long</span>
                                    Gerar Carnê
                                </button>
                            )}
                            <button 
                                onClick={handleSendPurchaseSummary}
                                className="flex items-center bg-green-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-600 transition-colors"
                            >
                                <span className="material-symbols-outlined mr-2">share</span>
                                Enviar Resumo da Compra
                            </button>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    if (view === 'form') {
        return (
            <div>
                <BackButton onClick={() => navigate('/sales')} />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                     <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Registrar Nova Venda</h1>
                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        <div>
                            <div>
                                <label className="block font-medium dark:text-gray-300 mb-1">Cliente</label>
                                <select value={newSale.customerId} onChange={e => setNewSale(p => ({ ...p, customerId: e.target.value }))} required className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.customerId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                    <option value="">Selecione um cliente</option>
                                    {customers.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId}</p>}
                            </div>

                            <div className="border dark:border-gray-700 p-4 rounded-lg space-y-2 mt-4">
                                <h3 className="font-bold">Itens da Venda</h3>
                                <div className="flex flex-col sm:flex-row gap-2 items-end">
                                    <div className="flex-1 w-full relative">
                                        <label className="block font-medium dark:text-gray-300 mb-1 text-sm">Produto</label>
                                        <input 
                                            type="text" 
                                            placeholder="Digite para buscar..." 
                                            value={productSearch}
                                            onChange={e => {
                                                setProductSearch(e.target.value);
                                                if(currentItem.productId) setCurrentItem(prev => ({...prev, productId: ''}));
                                            }}
                                            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                                        />
                                        {availableProductsForSearch.length > 0 && productSearch && (
                                            <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border dark:border-gray-600 shadow-lg rounded-md mt-1 max-h-60 overflow-y-auto">
                                                {availableProductsForSearch.map(p => (
                                                    <li
                                                        key={p.id}
                                                        className="p-2 hover:bg-primary-50 dark:hover:bg-primary-700/20 cursor-pointer"
                                                        onMouseDown={() => {
                                                            setCurrentItem(prev => ({ ...prev, productId: p.id }));
                                                            setProductSearch(p.name);
                                                        }}
                                                    >
                                                        {p.name} ({p.stock} un.) - {formatCurrency(p.price)}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="w-full sm:w-auto">
                                        <label className="block font-medium dark:text-gray-300 mb-1 text-sm">Qtd.</label>
                                        <input type="number" value={currentItem.quantity} onChange={e => setCurrentItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} min="1" className="w-full sm:w-20 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"/>
                                    </div>
                                    <button type="button" onClick={handleAddItem} disabled={!currentItem.productId} className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 w-full sm:w-auto disabled:bg-gray-400">Adicionar</button>
                                </div>
                                {errors.items && <p className="text-red-500 text-xs mt-2">{errors.items}</p>}
                                <ul className="divide-y dark:divide-gray-700">
                                    {newSale.items.map(item => (
                                        <li key={item.productId} className="flex justify-between items-center py-2">
                                            <span>{item.name} (x{item.quantity})</span>
                                            <div className="flex items-center gap-4">
                                            <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                                            <button type="button" onClick={() => handleRemoveItem(item.productId)} className="text-red-500 hover:text-red-700">
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="text-right text-2xl font-bold mt-4">Total: {formatCurrency(totalNewSale)}</div>

                            <div className="mt-4">
                                <label className="block font-medium dark:text-gray-300 mb-1">Forma de Pagamento</label>
                                <select value={newSale.paymentMethod} onChange={e => setNewSale(p => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                                    <option value="cash">À vista (Dinheiro/Cartão)</option>
                                    <option value="credit">Crediário</option>
                                </select>
                            </div>
                            {newSale.paymentMethod === 'credit' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block font-medium dark:text-gray-300 mb-1">Número de Parcelas</label>
                                        <input type="number" value={newSale.numInstallments || ''} onChange={e => setNewSale(p => ({ ...p, numInstallments: parseInt(e.target.value) || 1 }))} min="1" className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.numInstallments ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} required />
                                        {errors.numInstallments && <p className="text-red-500 text-xs mt-1">{errors.numInstallments}</p>}
                                    </div>
                                    <div>
                                        <label className="block font-medium dark:text-gray-300 mb-1">Venc. 1ª Parcela</label>
                                        <input type="date" value={newSale.firstDueDate.toISOString().split('T')[0]} onChange={e => setNewSale(p => ({ ...p, firstDueDate: new Date(e.target.value) }))} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" required />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-700">
                            <button type="submit" className="bg-primary-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors">Finalizar Venda</button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div></div>
                <button
                    onClick={() => navigate('/sales/new')}
                    className="flex w-full md:w-auto items-center justify-center bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors"
                >
                    <span className="material-symbols-outlined mr-2">add_shopping_cart</span>
                    Nova Venda
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-md">
                <div className="space-y-4">
                    {salesWithDetails.map(sale => (
                         <div 
                            key={sale.id} 
                            onClick={() => navigate(`/sales/${sale.id}`)}
                            className={`p-4 rounded-lg border dark:border-gray-700 cursor-pointer transition-all ${sale.status === 'canceled' ? 'bg-red-50 dark:bg-red-900/20 text-gray-500 dark:text-gray-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md'}`}
                        >
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                <div className="mb-2 sm:mb-0">
                                    <p className="font-bold text-gray-800 dark:text-gray-200">{sale.customerName}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(sale.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-left sm:text-right mr-4">
                                        <p className={`font-bold text-lg ${sale.status === 'canceled' ? 'text-red-500 dark:text-red-400 line-through' : 'text-gray-800 dark:text-gray-100'}`}>{formatCurrency(sale.total)}</p>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${sale.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                                            {sale.status === 'completed' ? 'Finalizada' : 'Cancelada'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (sale.status !== 'canceled') handleCancelSale(sale.id);
                                        }}
                                        disabled={sale.status === 'canceled'}
                                        className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                        title="Cancelar Venda"
                                    >
                                        <span className="material-symbols-outlined">cancel</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Sales;