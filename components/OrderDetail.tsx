



import React, { useState, useEffect } from 'react';
import { Order, Language, OrderStatus, Product, OrderItem, DeliveryService, PaymentStatus, PaymentMethod } from '../types';
import { UI_TEXT } from '../constants';
import { getShippingAdvice } from '../services/geminiService';

interface OrderDetailProps {
  order: Order;
  products: Product[];
  lang: Language;
  onBack: () => void;
  onUpdate: (updatedOrder: Order) => void;
  bankCommissionRate: number;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ order, products, lang, onBack, onUpdate, bankCommissionRate }) => {
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [packagingAdvice, setPackagingAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isFetchingShipping, setIsFetchingShipping] = useState(false);
  
  // Add Item Search State
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  
  const t = UI_TEXT[lang];

  // Common input class for consistent styling across themes
  const inputClass = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors";

  // Filter products for Add Item modal
  const searchResults = products.filter(p => {
    if (!itemSearchQuery) return false;
    const q = itemSearchQuery.toLowerCase();
    return (
      p.name_ru.toLowerCase().includes(q) ||
      p.name_uk.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q))
    );
  }).slice(0, 5); // Limit results

  // Recalculate total whenever items change
  useEffect(() => {
    const newTotal = currentOrder.items.reduce((acc, item) => {
      const itemTotal = (item.price - (item.discount || 0)) * item.quantity;
      return acc + itemTotal;
    }, 0);
    
    if (newTotal !== currentOrder.total) {
      setCurrentOrder(prev => ({ ...prev, total: newTotal }));
    }
  }, [currentOrder.items]);

  // Calculate Margin / Profit
  const calculateProfit = () => {
    let costOfGoods = 0;
    currentOrder.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const cost = product ? product.purchasePrice : 0;
      costOfGoods += cost * item.quantity;
    });
    
    const revenue = currentOrder.total;
    const shipping = currentOrder.shippingCost || 0;
    const bankFee = revenue * (bankCommissionRate / 100);
    
    const profit = revenue - costOfGoods - shipping - bankFee;
    
    return { profit, bankFee };
  };

  const { profit, bankFee } = calculateProfit();
  const profitMargin = currentOrder.total > 0 ? (profit / currentOrder.total) * 100 : 0;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updated = { ...currentOrder, status: e.target.value as OrderStatus };
    setCurrentOrder(updated);
  };

  const handlePaymentChange = (field: 'paymentStatus' | 'paymentMethod', value: string) => {
      setCurrentOrder({ ...currentOrder, [field]: value });
  };

  const handleInputChange = (field: keyof Order, value: string) => {
    setCurrentOrder({ ...currentOrder, [field]: value });
  };
  
  const handleShippingCostChange = (value: string) => {
      setCurrentOrder({ ...currentOrder, shippingCost: parseFloat(value) || 0 });
  };

  const handleSave = () => {
    onUpdate(currentOrder);
  };

  const handleGenerateTTN = () => {
    // Mock API Call to Nova Poshta / Rozetka
    const prefix = currentOrder.deliveryService === 'rozetka_delivery' ? 'ROZ' : '20';
    const mockTTN = prefix + Math.floor(Math.random() * 100000000000).toString();
    const updated = { ...currentOrder, ttn: mockTTN, status: OrderStatus.PROCESSING };
    setCurrentOrder(updated);
    onUpdate(updated);
  };

  const handleFetchShippingCost = () => {
      if (!currentOrder.ttn) return;
      setIsFetchingShipping(true);
      // Simulate API call to Nova Poshta
      setTimeout(() => {
          // Mock response: cost between 60 and 150
          const mockCost = Math.floor(Math.random() * (150 - 60 + 1) + 60);
          setCurrentOrder(prev => ({ ...prev, shippingCost: mockCost }));
          setIsFetchingShipping(false);
      }, 1000);
  };

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    const advice = await getShippingAdvice(currentOrder.items, lang);
    setPackagingAdvice(advice);
    setLoadingAdvice(false);
  };

  // --- Item Management ---

  const handleItemChange = (index: number, field: keyof OrderItem, value: number) => {
    const updatedItems = [...currentOrder.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setCurrentOrder({ ...currentOrder, items: updatedItems });
  };

  const handleDeleteItem = (index: number) => {
    const updatedItems = currentOrder.items.filter((_, i) => i !== index);
    setCurrentOrder({ ...currentOrder, items: updatedItems });
  };

  const handleSelectProductToAdd = (product: Product) => {
    const newItem: OrderItem = {
      productId: product.id,
      productName: lang === Language.RU ? product.name_ru : product.name_uk,
      price: product.price,
      quantity: 1,
      discount: 0
    };

    setCurrentOrder(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setIsAddItemOpen(false);
    setItemSearchQuery('');
  };

  // Helper to find SKU
  const getSku = (productId: number) => {
      const p = products.find(prod => prod.id === productId);
      return p ? p.sku : '---';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
          >
            ← {t.back}
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{currentOrder.orderNumber}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {new Date(currentOrder.date).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            🖨️ {t.printInvoice}
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            {t.save}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Shipping */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t.customer} & {t.payment}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.customer}</label>
                <input 
                  type="text" 
                  value={currentOrder.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.phone}</label>
                <input 
                  type="text" 
                  value={currentOrder.customerPhone || ''}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  placeholder="+380..."
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.paymentStatus}</label>
                      <select 
                          value={currentOrder.paymentStatus || PaymentStatus.NOT_PAID}
                          onChange={(e) => handlePaymentChange('paymentStatus', e.target.value)}
                          className={inputClass}
                      >
                          {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.paymentMethod}</label>
                      <select 
                          value={currentOrder.paymentMethod || PaymentMethod.COD}
                          onChange={(e) => handlePaymentChange('paymentMethod', e.target.value)}
                          className={inputClass}
                      >
                          {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                  </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t.shippingDetails}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.deliveryService}</label>
                <select 
                   value={currentOrder.deliveryService || ''} 
                   onChange={(e) => handleInputChange('deliveryService', e.target.value)}
                   className={inputClass}
                >
                  <option value="">Select Service...</option>
                  <option value="nova_poshta">Nova Poshta</option>
                  <option value="rozetka_delivery">Rozetka Delivery</option>
                  <option value="ukrposhta">Ukrposhta</option>
                  <option value="self_pickup">Self Pickup</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.city}</label>
                <input 
                  type="text" 
                  value={currentOrder.deliveryCity || ''}
                  onChange={(e) => handleInputChange('deliveryCity', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.warehouseAddress}</label>
                <input 
                  type="text" 
                  value={currentOrder.deliveryWarehouse || ''}
                  onChange={(e) => handleInputChange('deliveryWarehouse', e.target.value)}
                  placeholder="Branch #1 or Address"
                  className={inputClass}
                />
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-800/30">
                 <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-orange-800 dark:text-orange-400 uppercase">{t.shippingCost} (Expense)</label>
                    <button 
                        onClick={handleFetchShippingCost}
                        disabled={!currentOrder.ttn || isFetchingShipping}
                        className="text-xs text-blue-600 dark:text-blue-400 underline disabled:opacity-50"
                    >
                        {isFetchingShipping ? t.loading : t.fetchFromTTN}
                    </button>
                 </div>
                 <div className="relative">
                    <span className="absolute left-3 top-2 text-orange-400">₴</span>
                    <input 
                      type="number"
                      value={currentOrder.shippingCost || 0}
                      onChange={(e) => handleShippingCostChange(e.target.value)}
                      className="w-full border border-orange-200 dark:border-orange-800/50 rounded-lg px-3 py-2 pl-7 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                 </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.ttn} (Waybill)</label>
                {currentOrder.ttn ? (
                   <div className="flex items-center justify-between space-x-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 rounded-lg group">
                     <div className="flex items-center gap-2">
                        <span className="text-2xl">📦</span>
                        <div>
                        <p className="text-sm font-bold text-green-800 dark:text-green-300">{currentOrder.ttn}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Generated successfully</p>
                        </div>
                     </div>
                     <button onClick={() => handleInputChange('ttn', '')} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                   </div>
                ) : (
                  <button 
                    onClick={handleGenerateTTN}
                    className="w-full py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>⚡</span>
                    <span>{t.generateTTN}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t.items}</h3>
                <div className="flex items-center space-x-4">
                    <div className="text-right hidden md:block border-r border-slate-200 dark:border-slate-600 pr-4 mr-2">
                         <p className="text-xs text-slate-400 uppercase font-bold">{t.netProfit} (w/o {bankCommissionRate}% fee)</p>
                         <div className="flex items-end justify-end gap-2">
                            <span className={`text-sm font-bold ${profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                ₴ {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <span className={`text-xs ${profitMargin > 15 ? 'text-green-500' : 'text-orange-500'}`}>
                                ({profitMargin.toFixed(1)}%)
                            </span>
                         </div>
                    </div>
                   <div className="flex items-center space-x-2">
                       <label className="text-sm text-slate-500 dark:text-slate-400">{t.status}:</label>
                       <select 
                          value={currentOrder.status} 
                          onChange={handleStatusChange}
                          className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                       >
                         {Object.values(OrderStatus).map(s => (
                           <option key={s} value={s}>{s}</option>
                         ))}
                       </select>
                   </div>
                </div>
             </div>
             
             <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-600">
                    <tr>
                      <th className="px-4 py-3">{t.sku}</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 w-20 text-center">{t.qty}</th>
                      <th className="px-4 py-3 text-right">{t.price}</th>
                      <th className="px-4 py-3 w-28 text-right">{t.discount}</th>
                      <th className="px-4 py-3 text-right">{t.total}</th>
                      <th className="px-2 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {currentOrder.items.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                            {getSku(item.productId)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                            <div>{item.productName}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="number" 
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-16 text-center border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded px-1 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">₴ {item.price}</td>
                        <td className="px-4 py-3 text-right">
                           <input 
                            type="number" 
                            min="0"
                            value={item.discount || 0}
                            onChange={(e) => handleItemChange(idx, 'discount', parseInt(e.target.value) || 0)}
                            className="w-24 text-right border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 rounded px-1 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">
                          ₴ {((item.price - (item.discount || 0)) * item.quantity).toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button 
                             onClick={() => handleDeleteItem(idx)}
                             className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-700 font-bold text-slate-800 dark:text-slate-200">
                    <tr>
                      <td colSpan={7} className="px-4 py-3">
                         <button 
                           onClick={() => setIsAddItemOpen(true)}
                           className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline flex items-center gap-1"
                         >
                           + {t.addItem}
                         </button>
                      </td>
                    </tr>
                    <tr className="border-t border-slate-200 dark:border-slate-600">
                      <td colSpan={5} className="px-4 py-3 text-right uppercase text-xs text-slate-500 dark:text-slate-400">Order Total:</td>
                      <td className="px-4 py-3 text-right text-lg">₴ {currentOrder.total.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
             </div>
          </div>

          {/* AI Packaging Assistant */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 p-6 rounded-xl border border-blue-100 dark:border-blue-900">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-blue-900 dark:text-blue-200 font-bold flex items-center gap-2">
                  ✨ {t.aiPackaging}
                </h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                  Get AI recommendations for optimal box size and padding.
                </p>
              </div>
              <button 
                onClick={handleGetAdvice}
                disabled={loadingAdvice}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm hover:bg-blue-50 dark:hover:bg-slate-700"
              >
                {loadingAdvice ? t.loading : 'Ask AI'}
              </button>
            </div>
            {packagingAdvice && (
              <div className="mt-4 p-3 bg-white/80 dark:bg-slate-800/80 rounded-lg text-sm text-slate-700 dark:text-slate-300 border border-blue-100 dark:border-blue-900/50">
                {packagingAdvice}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddItemOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 h-[500px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.selectProduct}</h3>
                  <button onClick={() => setIsAddItemOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              
              <input 
                  type="text" 
                  placeholder={t.searchForOrder}
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                  autoFocus
              />

              <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-700 rounded-lg">
                  {itemSearchQuery.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">Start typing to search...</div>
                  ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">No products found.</div>
                  ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                          {searchResults.map(p => (
                              <li 
                                  key={p.id}
                                  onClick={() => handleSelectProductToAdd(p)}
                                  className="p-3 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                              >
                                  <div className="font-medium text-slate-800 dark:text-slate-200">{lang === Language.RU ? p.name_ru : p.name_uk}</div>
                                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                                      <span className="font-mono">{p.sku}</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-400">₴ {p.price}</span>
                                  </div>
                              </li>
                          ))}
                      </ul>
                  )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
