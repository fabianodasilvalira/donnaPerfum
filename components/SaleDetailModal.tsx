import React from 'react';
import Modal from './Modal';
import { Sale, Customer, Product } from '../types';
import InstallmentStatusBadge from './InstallmentStatusBadge';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface SaleDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale | null;
    customer: Customer | null;
    products: Product[];
    title?: string;
}

const SaleDetailModal: React.FC<SaleDetailModalProps> = ({ isOpen, onClose, sale, customer, products, title = "Detalhes da Venda" }) => {
    if (!isOpen || !sale || !customer) return null;

    const handleWhatsAppShare = () => {
        const phone = customer.phone.replace(/\D/g, '');
        let message = `Olá, ${customer.name}!\n\n`;
        message += `Obrigado pela sua compra realizada em ${new Date(sale.date).toLocaleDateString('pt-BR')}.\n\n`;
        message += '*Resumo da Compra:*\n';
        sale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            message += `- ${item.quantity}x ${product?.name || 'Produto desconhecido'}\n`;
        });
        message += `\n*Total: ${formatCurrency(sale.total)}*\n\n`;

        if (sale.paymentMethod === 'credit' && sale.installments.length > 0) {
            message += '*Detalhes do Parcelamento:*\n';
            sale.installments.forEach((inst, index) => {
                message += `Parcela ${index + 1}/${sale.installments.length}: ${formatCurrency(inst.amount)} (Vencimento: ${new Date(inst.dueDate).toLocaleDateString('pt-BR')})\n`;
            });
            message += '\nAgradecemos a preferência!';
        } else {
            message += 'Agradecemos a preferência!';
        }

        const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                    <h3 className="font-bold text-lg text-gray-800">{customer.name}</h3>
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                    <p className="text-sm text-gray-500">Data da Compra: {new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Itens</h4>
                    <ul className="divide-y">
                        {sale.items.map(item => {
                             const product = products.find(p => p.id === item.productId);
                             return (
                                <li key={item.productId} className="flex justify-between py-2">
                                    <div>
                                        <p className="font-medium">{product?.name || 'Produto'}</p>
                                        <p className="text-sm text-gray-500">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                                    </div>
                                    <p className="font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</p>
                                </li>
                             )
                        })}
                    </ul>
                     <div className="flex justify-end font-bold text-xl mt-2 py-2 border-t">
                        <span>Total:</span>
                        <span>{formatCurrency(sale.total)}</span>
                    </div>
                </div>

                {sale.paymentMethod === 'credit' && sale.installments.length > 0 && (
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Parcelamento</h4>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 font-semibold text-gray-600">Vencimento</th>
                                    <th className="p-2 font-semibold text-gray-600 text-right">Valor</th>
                                    <th className="p-2 font-semibold text-gray-600 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.installments.map(inst => (
                                    <tr key={inst.id} className="border-t">
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
             <div className="flex justify-end mt-6 pt-4 border-t">
                <button 
                    onClick={handleWhatsAppShare}
                    className="flex items-center bg-green-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-600 transition-colors"
                >
                    <span className="material-symbols-outlined mr-2">share</span>
                    Enviar via WhatsApp
                </button>
            </div>
        </Modal>
    );
};

export default SaleDetailModal;
