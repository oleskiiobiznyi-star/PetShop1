


import React, { useState } from 'react';
import { Product, Language, Supplier } from '../types';
import { UI_TEXT } from '../constants';

interface WarehouseProps {
  products: Product[];
  lang: Language;
  onUpdateProduct: (product: Product) => void;
  suppliers: Supplier[];
}

const Warehouse: React.FC<WarehouseProps> = ({ products, lang, onUpdateProduct, suppliers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Receipt State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptSupplier, setReceiptSupplier] = useState<string>('');
  const [receiptProduct, setReceiptProduct] = useState<Product | null>(null);
  const [receiptProductSearch, setReceiptProductSearch] = useState('');
  const [receiveQty, setReceiveQty] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [extraCosts, setExtraCosts] = useState<string>('0');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const t = UI_TEXT[lang];

  // Filtering for main table
  const filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.name_ru.toLowerCase().includes(query) ||
      p.name_uk.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.includes(query))
    );
  });

  // Filtering for Receipt Modal Search
  const modalProductSuggestions = products.filter(p => {
      if (!receiptProductSearch) return false;
      const q = receiptProductSearch.toLowerCase();
      return p.name_ru.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  }).slice(0, 5);

  const handleOpenReceiptModal = (preselectedProduct?: Product) => {
      setReceiptSupplier('');
      setReceiveQty('');
      setExtraCosts('0');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      
      if (preselectedProduct) {
          setReceiptProduct(preselectedProduct);
          setReceiptProductSearch(lang === Language.RU ? preselectedProduct.name_ru : preselectedProduct.name_uk);
          setPurchasePrice(preselectedProduct.purchasePrice.toString());
      } else {
          setReceiptProduct(null);
          setReceiptProductSearch('');
          setPurchasePrice('');
      }
      setIsReceiptModalOpen(true);
  };

  const handleSelectProduct = (p: Product) => {
      setReceiptProduct(p);
      setReceiptProductSearch(lang === Language.RU ? p.name_ru : p.name_uk);
      setPurchasePrice(p.purchasePrice.toString());
  };

  const handleReceiveStock = () => {
    if (!receiptProduct) return;

    const qtyToAdd = parseInt(receiveQty);
    const price = parseFloat(purchasePrice);
    const extra = parseFloat(extraCosts);

    if (isNaN(qtyToAdd) || isNaN(price)) return;

    // Calculate new "Landed Cost" per unit if extra costs exist
    // New Cost = ((Old Stock * Old Price) + (New Qty * New Price) + Extra Costs) / (Old Stock + New Qty)
    // Simplified for this request: Just update purchase price to the new landed cost of this batch
    const landedUnitCost = (price * qtyToAdd + (isNaN(extra) ? 0 : extra)) / qtyToAdd;

    const updatedProduct = {
      ...receiptProduct,
      stock: receiptProduct.stock + qtyToAdd,
      purchasePrice: Number(landedUnitCost.toFixed(2)) 
    };

    onUpdateProduct(updatedProduct);
    setIsReceiptModalOpen(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.warehouse}</h2>
        <div className="flex gap-4">
             <div className="w-64">
                <input
                    type="text"
                    placeholder={t.search}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
            </div>
            <button 
                onClick={() => handleOpenReceiptModal()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
                <span>📥</span> {t.createReceipt}
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 overflow-hidden">
        <div className="overflow-auto h-full">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-600 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Product Info</th>
                <th className="px-6 py-4">SKU / Barcode</th>
                <th className="px-6 py-4 text-right">{t.purchasePrice}</th>
                <th className="px-6 py-4 text-center">{t.stock}</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.imageUrl} alt="" className="w-10 h-10 rounded border border-slate-200 dark:border-slate-600 object-cover" />
                      <div className="font-medium text-slate-900 dark:text-white">
                        {lang === Language.RU ? product.name_ru : product.name_uk}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs">
                    <div className="font-bold">{product.sku}</div>
                    <div className="text-slate-400">{product.barcode || '-'}</div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    ₴ {product.purchasePrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      product.stock > 10 ? 'bg-green-100 text-green-700' : 
                      product.stock > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleOpenReceiptModal(product)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium text-sm"
                    >
                      {t.receiveStock}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">{t.receiving}</h3>
            
            <div className="space-y-4">
               {/* Supplier */}
               <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.supplier}</label>
                  <select 
                     value={receiptSupplier}
                     onChange={(e) => setReceiptSupplier(e.target.value)}
                     className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                      <option value="">{t.selectSupplier}</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>

               {/* Product Search */}
               <div className="relative">
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.sku} / Product Name</label>
                   <input 
                      type="text"
                      value={receiptProductSearch}
                      onChange={(e) => {
                          setReceiptProductSearch(e.target.value);
                          if (receiptProduct && e.target.value !== (lang === Language.RU ? receiptProduct.name_ru : receiptProduct.name_uk)) {
                              setReceiptProduct(null); // Clear selection if typing
                          }
                      }}
                      placeholder={t.searchPlaceholder}
                      className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none ${receiptProduct ? 'border-green-500 ring-1 ring-green-500' : 'border-slate-300 dark:border-slate-600'}`}
                   />
                   {/* Suggestions Dropdown */}
                   {receiptProductSearch && !receiptProduct && modalProductSuggestions.length > 0 && (
                       <div className="absolute z-20 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                           {modalProductSuggestions.map(p => (
                               <div 
                                 key={p.id} 
                                 onClick={() => handleSelectProduct(p)}
                                 className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm"
                               >
                                   <div className="font-bold text-slate-800 dark:text-slate-200">{p.sku}</div>
                                   <div className="text-slate-600 dark:text-slate-400 text-xs">{lang === Language.RU ? p.name_ru : p.name_uk}</div>
                               </div>
                           ))}
                       </div>
                   )}
               </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.addStock} (Qty)</label>
                    <input 
                      type="number" 
                      value={receiveQty}
                      onChange={(e) => setReceiveQty(e.target.value)}
                      placeholder="0"
                      className="w-full border border-blue-300 dark:border-blue-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.purchasePrice} (UAH)</label>
                    <input 
                      type="number" 
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.extraCosts}</label>
                    <input 
                      type="number" 
                      value={extraCosts}
                      onChange={(e) => setExtraCosts(e.target.value)}
                      placeholder="Delivery..."
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.paymentDate}</label>
                     <input 
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                     />
                  </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => setIsReceiptModalOpen(false)} 
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleReceiveStock} 
                disabled={!receiptProduct}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouse;
