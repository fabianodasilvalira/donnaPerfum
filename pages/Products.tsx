import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { Product } from '../types';

interface ProductsContext {
    products: Product[];
    addProduct: (product: Omit<Product, 'id' | 'status'>) => void;
    updateProduct: (product: Product) => void;
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


const Products: React.FC = () => {
    const { products, addProduct, updateProduct } = useOutletContext<ProductsContext>();
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();

    const [view, setView] = useState<'list' | 'form' | 'confirmToggle'>('list');
    const [productToToggle, setProductToToggle] = useState<Product | null>(null);

    const selectedProduct = useMemo(() => {
        return products.find(p => p.id === productId) || null;
    }, [products, productId]);
    
    useEffect(() => {
        if (productId) {
            if (selectedProduct) {
                setView('form');
            } else {
                // Product not found, maybe redirect to list
                navigate('/products');
            }
        } else {
            setView('list');
        }
    }, [productId, selectedProduct, navigate]);
    

    const [showInactive, setShowInactive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const initialProductState: Omit<Product, 'id' | 'status' | 'photo'> & { photo?: string } = { name: '', brand: '', description: '', price: 0, costPrice: 0, stock: 0, photo: '' };
    const [productForm, setProductForm] = useState(initialProductState);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!productForm.name.trim()) newErrors.name = "Nome do produto é obrigatório.";
        if (!productForm.brand.trim()) newErrors.brand = "Marca é obrigatória.";
        if (!productForm.description.trim()) newErrors.description = "Descrição é obrigatória.";
        if (productForm.price <= 0) newErrors.price = "Preço de venda deve ser maior que zero.";
        if (productForm.costPrice < 0) newErrors.costPrice = "Preço de custo não pode ser negativo.";
        if (productForm.stock < 0) newErrors.stock = "Estoque não pode ser negativo.";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (view === 'form' && selectedProduct) {
            const { name, brand, description, price, costPrice, stock, photo } = selectedProduct;
            setProductForm({ name, brand, description, price, costPrice, stock, photo: photo || '' });
        } else {
            setProductForm(initialProductState);
        }
    }, [selectedProduct, view]);
    
    const handleBack = () => {
        navigate('/products');
        setErrors({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setProductForm(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setProductForm(prev => ({...prev, photo: event.target?.result as string}));
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        if (selectedProduct) {
            const updatedProductData: Product = {
                id: selectedProduct.id,
                status: selectedProduct.status,
                name: productForm.name,
                brand: productForm.brand,
                description: productForm.description,
                price: productForm.price,
                costPrice: productForm.costPrice,
                stock: productForm.stock,
                photo: productForm.photo,
            };
            updateProduct(updatedProductData);
        } else {
            addProduct(productForm);
        }
        handleBack();
    };

    const handleDeactivateToggle = (product: Product) => {
        setProductToToggle(product);
        setView('confirmToggle');
    };
    
    const confirmDeactivation = () => {
        if (productToToggle) {
            updateProduct({ ...productToToggle, status: productToToggle.status === 'active' ? 'inactive' : 'active' });
        }
        setProductToToggle(null);
        setView('list');
    };
    
    const filteredProducts = useMemo(() => {
        const activeOrInactive = showInactive ? products : products.filter(p => p.status === 'active');
        if (!searchTerm) {
            return activeOrInactive;
        }
        return activeOrInactive.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.brand.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, showInactive, searchTerm]);
    
    if (view === 'confirmToggle' && productToToggle) {
        const actionText = productToToggle.status === 'active' ? 'desativar' : 'reativar';
        const confirmButtonColor = productToToggle.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
        return (
            <div>
                <BackButton onClick={() => setView('list')} />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Confirmar {actionText.charAt(0).toUpperCase() + actionText.slice(1)}</h1>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Tem certeza que deseja {actionText} o produto "{productToToggle.name}"?</p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setView('list')} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancelar</button>
                        <button onClick={confirmDeactivation} className={`text-white font-bold py-2 px-6 rounded-lg transition-colors ${confirmButtonColor}`}>{actionText.charAt(0).toUpperCase() + actionText.slice(1)}</button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'form') {
        return (
            <div>
                <BackButton onClick={handleBack} />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                     <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{selectedProduct ? "Editar Produto" : "Adicionar Novo Produto"}</h1>
                     <form onSubmit={handleSubmit} noValidate>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Produto</label>
                                <input type="text" name="name" placeholder="Ex: Bolsa Tote" value={productForm.name} onChange={handleInputChange} required className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
                                <input type="text" name="brand" placeholder="Ex: Arezzo" value={productForm.brand} onChange={handleInputChange} required className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.brand ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                                <textarea name="description" placeholder="Ex: Couro sintético, cor preta" value={productForm.description} onChange={handleInputChange} required className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço de Custo</label>
                                    <input type="number" name="costPrice" placeholder="Ex: 180.00" value={productForm.costPrice} onChange={handleInputChange} required step="0.01" className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.costPrice ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                    {errors.costPrice && <p className="text-red-500 text-xs mt-1">{errors.costPrice}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço de Venda</label>
                                    <input type="number" name="price" placeholder="Ex: 299.90" value={productForm.price} onChange={handleInputChange} required step="0.01" className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estoque</label>
                                <input type="number" name="stock" placeholder="Ex: 10" value={productForm.stock} onChange={handleInputChange} required className={`w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.stock ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Foto do Produto</label>
                                <input type="file" name="photo" onChange={handleFileChange} accept="image/*" className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-700 dark:file:text-primary-200 dark:hover:file:bg-primary-600" />
                            </div>
                            {productForm.photo && <img src={productForm.photo} alt="Preview" className="w-24 h-24 rounded-md object-cover mx-auto" />}
                        </div>
                        <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-700">
                            <button type="submit" className="bg-primary-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors">Salvar Produto</button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="w-full md:w-auto flex-1">
                    <input
                        type="text"
                        placeholder="Buscar por nome ou marca..."
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
                        onClick={() => setView('form')}
                        className="flex items-center justify-center bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors"
                    >
                        <span className="material-symbols-outlined mr-2">add</span>
                        Novo Produto
                    </button>
                </div>
            </div>

             <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-md">
                {/* Table for larger screens */}
                <table className="hidden lg:table w-full text-left">
                    <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Foto</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Nome</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Estoque</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Preço</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => (
                            <tr key={product.id} onClick={() => navigate(`/products/${product.id}`)} className={`border-b border-gray-100 dark:border-gray-700 transition-colors cursor-pointer ${product.status === 'inactive' ? 'bg-gray-200 dark:bg-gray-900 opacity-60' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                <td className="py-3 px-4">
                                    <img src={product.photo || 'https://via.placeholder.com/40'} alt={product.name} className="w-10 h-10 rounded-md object-cover" />
                                </td>
                                <td className="py-3 px-4">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{product.name} ({product.brand})</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{product.description}</p>
                                </td>
                                <td className="py-3 px-4">
                                    <span className={`px-2 py-1 rounded-full text-sm font-semibold ${product.stock <= 5 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'}`}>
                                        {product.stock} unidades
                                    </span>
                                </td>
                                <td className="py-3 px-4 font-medium">{formatCurrency(product.price)}</td>
                                <td className="py-3 px-4 text-center">
                                    <button onClick={(e) => { e.stopPropagation(); handleDeactivateToggle(product); }} className={`${product.status === 'active' ? 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300' : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300'} p-1 rounded-full transition-colors`}>
                                        <span className="material-symbols-outlined">{product.status === 'active' ? 'toggle_off' : 'toggle_on'}</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {/* Cards for smaller screens */}
                 <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredProducts.map(product => (
                        <div key={product.id} onClick={() => navigate(`/products/${product.id}`)} className={`p-4 rounded-lg shadow-sm border dark:border-gray-700 cursor-pointer ${product.status === 'inactive' ? 'bg-gray-200 dark:bg-gray-900 opacity-70' : 'bg-white dark:bg-gray-800'}`}>
                            <div className="flex items-start gap-4">
                                <img src={product.photo || 'https://via.placeholder.com/64'} alt={product.name} className="w-16 h-16 rounded-md object-cover" />
                                <div className="flex-1">
                                    <p className="font-bold text-lg">{product.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{product.brand}</p>
                                </div>
                            </div>
                             <div className="mt-4 flex justify-between items-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${product.stock <= 5 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'}`}>
                                    {product.stock} un.
                                </span>
                                <p className="font-semibold text-lg">{formatCurrency(product.price)}</p>
                            </div>
                            <div className="mt-4 pt-2 border-t dark:border-gray-700 flex justify-end items-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleDeactivateToggle(product); }} className={`${product.status === 'active' ? 'text-red-600 hover:text-red-800 dark:text-red-400' : 'text-green-600 hover:text-green-800 dark:text-green-400'} p-1 rounded-full transition-colors`}><span className="material-symbols-outlined">{product.status === 'active' ? 'toggle_off' : 'toggle_on'}</span></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Products;