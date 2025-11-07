import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { Customer, Sale, Product, Installment } from '../types';
import InstallmentStatusBadge from '../components/InstallmentStatusBadge';

interface CustomersContext {
    customers: Customer[];
    sales: Sale[];
    payInstallment: (saleId: string, installmentId: string) => void;
    addCustomer: (customer: Omit<Customer, 'id' | 'status'>) => void;
    updateCustomer: (customer: Customer) => void;
}

type CustomerView = 'list' | 'details' | 'form' | 'confirmToggle' | 'confirmPayment';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
    if (match) {
        return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
    }
    return cpf;
};

const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 10) {
        const match = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
        if (match) {
            return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
    }
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
};

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300 mb-6 group">
        <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
        <span className="ml-2 font-semibold">Voltar</span>
    </button>
);


const Customers: React.FC = () => {
    const { customers, sales, payInstallment, addCustomer, updateCustomer } = useOutletContext<CustomersContext>();
    const { customerId } = useParams<{ customerId: string }>();
    const navigate = useNavigate();

    const [view, setView] = useState<CustomerView>('list');
    const [isEditing, setIsEditing] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    
    const initialCustomerState = { name: '', phone: '', address: '', cpf: '' };
    const [customerForm, setCustomerForm] = useState<Omit<Customer, 'id' | 'status'>>(initialCustomerState);
    
    const [installmentToPay, setInstallmentToPay] = useState<{ saleId: string; installmentId: string } | null>(null);

    const selectedCustomer = useMemo(() => {
        return customers.find(c => c.id === customerId) || null;
    }, [customers, customerId]);

    useEffect(() => {
        if (customerId) {
            if (selectedCustomer) {
                setView('details');
            } else {
                navigate('/customers');
            }
        } else {
            setView('list');
        }
    }, [customerId, selectedCustomer, navigate]);

    const validateCustomerForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!customerForm.name.trim()) newErrors.name = "Nome é obrigatório.";
        if (!customerForm.address.trim()) newErrors.address = "Endereço é obrigatório.";
        
        const cleanedCpf = customerForm.cpf.replace(/\D/g, '');
        if (cleanedCpf.length !== 11) newErrors.cpf = "CPF deve conter 11 dígitos.";
        
        const cleanedPhone = customerForm.phone.replace(/\D/g, '');
        if (cleanedPhone.length < 10 || cleanedPhone.length > 11) newErrors.phone = "Telefone deve conter 10 ou 11 dígitos.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    useEffect(() => {
        if(view === 'form' && isEditing && selectedCustomer) {
            const { name, phone, address, cpf } = selectedCustomer;
            setCustomerForm({ name, phone, address, cpf });
        } else {
            setCustomerForm(initialCustomerState);
        }
    }, [view, isEditing, selectedCustomer])

    
    const filteredCustomers = useMemo(() => {
        const activeOrInactive = showInactive ? customers : customers.filter(c => c.status === 'active');
        if (!searchTerm) {
            return activeOrInactive;
        }
        return activeOrInactive.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [customers, showInactive, searchTerm]);

    const customerDebts = useMemo(() => {
        const debts: Record<string, number> = {};
        customers.forEach(c => debts[c.id] = 0);
        
        sales.forEach(sale => {
            if (sale.paymentMethod === 'credit' && sale.status === 'completed') {
                const unpaidAmount = sale.installments
                    .filter(i => i.status === 'pending' || i.status === 'overdue')
                    .reduce((sum, i) => sum + i.amount, 0);
                debts[sale.customerId] += unpaidAmount;
            }
        });
        return debts;
    }, [sales, customers]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!validateCustomerForm()) {
            return;
        }

        if (isEditing && selectedCustomer) {
            const updatedCustomerData: Customer = {
                id: selectedCustomer.id,
                status: selectedCustomer.status,
                name: customerForm.name,
                phone: customerForm.phone,
                address: customerForm.address,
                cpf: customerForm.cpf,
            };
            updateCustomer(updatedCustomerData);
        } else {
            addCustomer(customerForm);
        }
        setCustomerForm(initialCustomerState);
        setIsEditing(false);
        setErrors({});
        setView(selectedCustomer ? 'details' : 'list');
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        if (name === 'cpf') {
            value = formatCPF(value.slice(0, 14));
        }
        if (name === 'phone') {
            value = formatPhone(value.slice(0, 15));
        }
        setCustomerForm(prev => ({...prev, [name]: value}));
    };

    const confirmDeactivation = () => {
        if (selectedCustomer) {
            const updatedCustomer: Customer = { ...selectedCustomer, status: selectedCustomer.status === 'active' ? 'inactive' : 'active' };
            updateCustomer(updatedCustomer);
            setView('details');
        }
    };
        
    const handleOpenPayConfirm = (saleId: string, installmentId: string) => {
        setInstallmentToPay({ saleId, installmentId });
        setView('confirmPayment');
    };

    const handleConfirmPayment = () => {
        if (installmentToPay) {
            payInstallment(installmentToPay.saleId, installmentToPay.installmentId);
        }
        setInstallmentToPay(null);
        setView('details');
    };

    if (view === 'confirmPayment' && installmentToPay && selectedCustomer) {
        const sale = sales.find(s => s.id === installmentToPay.saleId);
        const installment = sale?.installments.find(i => i.id === installmentToPay.installmentId);

        return (
            <div>
                <BackButton onClick={() => setView('details')} />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Confirmar Pagamento</h1>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">Você tem certeza que deseja marcar a seguinte parcela como paga?</p>
                    {installment && (
                         <div className="my-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left inline-block">
                            <p><strong>Cliente:</strong> {selectedCustomer.name}</p>
                            <p><strong>Vencimento:</strong> {new Date(installment.dueDate).toLocaleDateString('pt-BR')}</p>
                            <p><strong>Valor:</strong> {formatCurrency(installment.amount)}</p>
                        </div>
                    )}
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Esta ação não pode ser desfeita.</p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setView('details')} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Voltar</button>
                        <button onClick={handleConfirmPayment} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Sim, Pagar</button>
                    </div>
                </div>
            </div>
        );
    }


    if (view === 'confirmToggle' && selectedCustomer) {
        const actionText = selectedCustomer.status === 'active' ? 'desativar' : 'reativar';
        const confirmButtonColor = selectedCustomer.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';

        return (
            <div>
                <BackButton onClick={() => setView('details')} />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Confirmar {actionText.charAt(0).toUpperCase() + actionText.slice(1)}</h1>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Tem certeza que deseja {actionText} o cliente "{selectedCustomer.name}"?</p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setView('details')} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancelar</button>
                        <button onClick={confirmDeactivation} className={`text-white font-bold py-2 px-6 rounded-lg transition-colors ${confirmButtonColor}`}>{actionText.charAt(0).toUpperCase() + actionText.slice(1)}</button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'form') {
        return (
            <div>
                 <BackButton onClick={() => { setView(selectedCustomer ? 'details' : 'list'); setErrors({}); }} />
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{isEditing ? "Editar Cliente" : "Adicionar Novo Cliente"}</h1>
                    <form onSubmit={handleFormSubmit} noValidate>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                                <input type="text" name="name" placeholder="Ex: Maria da Silva" value={customerForm.name} onChange={handleInputChange} required className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF</label>
                                <input type="text" name="cpf" placeholder="Ex: 123.456.789-00" value={customerForm.cpf} onChange={handleInputChange} required className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.cpf ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                                <input type="tel" name="phone" placeholder="Ex: (11) 98765-4321" value={customerForm.phone} onChange={handleInputChange} required className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço Completo</label>
                                <input type="text" name="address" placeholder="Ex: Rua das Flores, 123, Bairro, Cidade, UF" value={customerForm.address} onChange={handleInputChange} required className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                            </div>
                        </div>
                        <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-700">
                            <button type="submit" className="bg-primary-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors">Salvar Cliente</button>
                        </div>
                    </form>
                 </div>
            </div>
        );
    }
    
    if (view === 'details' && selectedCustomer) {
        const customerCreditSales = sales
            .filter(s => s.customerId === selectedCustomer.id && s.paymentMethod === 'credit' && s.status === 'completed')
            .sort((a,b) => b.date.getTime() - a.date.getTime());

        const customerAllSales = sales
            .filter(s => s.customerId === selectedCustomer.id && s.status === 'completed')
            .sort((a,b) => b.date.getTime() - a.date.getTime());

        const totalOverdue = customerCreditSales.reduce((total, sale) => {
            const overdueSum = sale.installments
                .filter(inst => inst.status === 'overdue')
                .reduce((sum, inst) => sum + inst.amount, 0);
            return total + overdueSum;
        }, 0);

        const handleSendDebtReminder = () => {
            const phone = selectedCustomer.phone.replace(/\D/g, '');
            const value = formatCurrency(totalOverdue);
            
            let message = `Olá, ${selectedCustomer.name}. Gostaríamos de lembrar sobre seu débito em aberto em nossa loja, no valor de ${value}.`;
            message += `\n\nPor favor, entre em contato para regularizar sua situação. Agradecemos a sua atenção!`;

            const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        };

        const handleSendReminder = (installment: Installment) => {
            const phone = selectedCustomer.phone.replace(/\D/g, '');
            const dueDate = new Date(installment.dueDate).toLocaleDateString('pt-BR');
            const value = formatCurrency(installment.amount);
            
            let message = `Olá, ${selectedCustomer.name}. Gostaríamos de lembrar sobre sua parcela conosco, no valor de ${value}, com vencimento em ${dueDate}.`;
            if (installment.status === 'overdue') {
                message = `Olá, ${selectedCustomer.name}. Gostaríamos de lembrar sobre sua parcela conosco, no valor de ${value}, que venceu em ${dueDate}.`;
            }
            message += `\n\nSe o pagamento já foi efetuado, por favor, desconsidere esta mensagem.`;
            message += `\n\nAgradecemos a sua atenção!`;

            const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        };

        return (
            <div>
                <BackButton onClick={() => navigate('/customers')} />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                     <div>
                         <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">{selectedCustomer.name}</h2>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedCustomer.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                                    {selectedCustomer.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {totalOverdue > 0 && (
                                    <button onClick={handleSendDebtReminder} className="flex items-center gap-2 text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold" title={`Cobrar Dívida Atrasada (${formatCurrency(totalOverdue)})`}>
                                        <span className="material-symbols-outlined text-base">sms</span>
                                        Cobrar via WhatsApp
                                    </button>
                                )}
                                 <button onClick={() => { setIsEditing(true); setView('form'); setErrors({}); }} className="text-blue-600 hover:text-blue-800 p-2 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/80 transition-colors" title="Editar Cliente">
                                    <span className="material-symbols-outlined">edit</span>
                                </button>
                                <button onClick={() => setView('confirmToggle')} className={`${selectedCustomer.status === 'active' ? 'text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/80' : 'text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/80'} p-2 rounded-full transition-colors`} title={selectedCustomer.status === 'active' ? 'Desativar Cliente' : 'Reativar Cliente'}>
                                    <span className="material-symbols-outlined">{selectedCustomer.status === 'active' ? 'toggle_off' : 'toggle_on'}</span>
                                </button>
                            </div>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 my-4 space-y-1">
                            <p className="flex items-center"><span className="material-symbols-outlined text-sm align-middle mr-1">call</span>{selectedCustomer.phone}</p>
                            <p className="flex items-center"><span className="material-symbols-outlined text-sm align-middle mr-1">badge</span>{selectedCustomer.cpf}</p>
                            <p className="flex items-center"><span className="material-symbols-outlined text-sm align-middle mr-1">home</span>{selectedCustomer.address}</p>
                        </div>
                        
                        <h3 className="text-xl font-bold mb-4 border-t dark:border-gray-700 pt-4">Histórico de Compras (Finalizadas)</h3>
                        <div className="space-y-2 mb-6">
                            {customerAllSales.length > 0 ? customerAllSales.map(sale => (
                                <div key={sale.id} onClick={() => navigate(`/sales/${sale.id}`)} className="border dark:border-gray-700 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${sale.paymentMethod === 'cash' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'}`}>
                                                {sale.paymentMethod === 'cash' ? 'À vista' : 'Crediário'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                           <p className="font-bold text-lg text-gray-800 dark:text-gray-100">{formatCurrency(sale.total)}</p>
                                           <p className="text-sm text-gray-500 dark:text-gray-400">{sale.items.length} item(s)</p>
                                        </div>
                                    </div>
                                </div>
                            )) : <p className="text-gray-500 dark:text-gray-400">Nenhuma compra registrada.</p>}
                        </div>

                        {customerCreditSales.length > 0 && (
                            <>
                                <h3 className="text-xl font-bold mb-4 border-t dark:border-gray-700 pt-4">Detalhes do Crediário</h3>
                                <div className="space-y-4">
                                    {customerCreditSales.map(sale => (
                                        <div key={sale.id} className="border dark:border-gray-700 rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="font-bold">Compra de {new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                                                <p className="font-semibold text-lg">{formatCurrency(sale.total)}</p>
                                            </div>
                                            <ul>
                                                {sale.installments.map(inst => (
                                                    <li key={inst.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 border-t dark:border-gray-600">
                                                        <div className="mb-2 sm:mb-0">
                                                            <p>Venc.: {new Date(inst.dueDate).toLocaleDateString('pt-BR')}</p>
                                                            <p className="font-medium">{formatCurrency(inst.amount)}</p>
                                                        </div>
                                                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                                                            <InstallmentStatusBadge status={inst.status} />
                                                             {(inst.status === 'pending' || inst.status === 'overdue') && (
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={() => handleSendReminder(inst)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm flex items-center gap-1" title="Lembrar via WhatsApp">
                                                                        <span className="material-symbols-outlined text-base">sms</span>
                                                                        Lembrar
                                                                    </button>
                                                                    <button onClick={() => handleOpenPayConfirm(sale.id, inst.id)} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm">
                                                                        Pagar
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </>
                         )}
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div>
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                 <div className="w-full md:w-auto flex-1">
                    <input
                        type="text"
                        placeholder="Buscar por nome..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:w-80 p-3 border rounded-lg shadow-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                    />
                 </div>
                 <div className="w-full md:w-auto flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <label className="flex items-center cursor-pointer whitespace-nowrap">
                        <input type="checkbox" checked={showInactive} onChange={() => setShowInactive(!showInactive)} className="mr-2 h-4 w-4 rounded text-primary-600 focus:ring-primary-500" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Mostrar inativos</span>
                    </label>
                    <button
                        onClick={() => { setIsEditing(false); setView('form'); setErrors({}); }}
                        className="flex items-center justify-center bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors"
                    >
                        <span className="material-symbols-outlined mr-2">person_add</span>
                        Novo Cliente
                    </button>
                 </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[60vh] lg:max-h-[70vh] overflow-y-auto">
                    {filteredCustomers.map(customer => (
                        <li 
                            key={customer.id} 
                            className={`py-3 cursor-pointer rounded-lg px-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${customer.status === 'inactive' ? 'opacity-60' : ''}`}
                            onClick={() => navigate(`/customers/${customer.id}`)}
                        >
                            <p className="font-medium text-gray-800 dark:text-gray-200">{customer.name}</p>
                            <p className={`text-sm ${customerDebts[customer.id] > 0 ? 'text-red-500 font-semibold dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                Dívida: {formatCurrency(customerDebts[customer.id])}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Customers;