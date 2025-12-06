
import React, { useState, useMemo } from 'react';
import { Product, Language, Supplier } from '../types';
import { UI_TEXT } from '../constants';

interface WarehouseProps {
  products: Product[];
  lang: Language;
  onUpdateProduct: (product: Product) => void;
  suppliers: Supplier[];
}

interface ReceiptItem {
  product: Product;
  qty: number;
  supplierUnitPrice: number; // Price we pay the supplier
  originalDbPrice: number; // Price currently in DB
}

const Warehouse: React.FC<WarehouseProps> = ({ products, lang, onUpdateProduct, suppliers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Receipt State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptSupplier, setReceiptSupplier] = useState<string>('');
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [globalExtraCosts, setGlobalExtraCosts] = useState<string>('0');
  
  // Current Line Item State
  const [receiptProduct, setReceiptProduct] = useState<Product | null>(null);
  const [receiptProductSearch, setReceiptProductSearch] = useState('');
  const [receiveQty, setReceiveQty] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
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
      setReceiptItems([]);
      setReceiveQty('');
      setGlobalExtraCosts('0');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      
      if (preselectedProduct) {
          handleSelectProduct(preselectedProduct);
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

  const handleAddToReceiptList = () => {
      if (!receiptProduct) return;
      const qty = parseInt(receiveQty);
      const price = parseFloat(purchasePrice);

      if (isNaN(qty) || isNaN(price) || qty <= 0) return;

      const newItem: ReceiptItem = {
          product: receiptProduct,
          qty: qty,
          supplierUnitPrice: price,
          originalDbPrice: receiptProduct.purchasePrice
      };

      setReceiptItems([...receiptItems, newItem]);

      // Reset Line Item Inputs
      setReceiptProduct(null);
      setReceiptProductSearch('');
      setReceiveQty('');
      setPurchasePrice('');
  };

  const handleRemoveFromList = (index: number) => {
      const newList = [...receiptItems];
      newList.splice(index, 1);
      setReceiptItems(newList);
  };

  // derived state for calculations
  const { calculatedItems, totalSupplierValue, totalLandedValue } = useMemo(() => {
    const totalSupplier = receiptItems.reduce((acc, item) => acc + (item.qty * item.supplierUnitPrice), 0);
    const extra = parseFloat(globalExtraCosts) || 0;

    const items = receiptItems.map(item => {
        const itemSupplierTotal = item.qty * item.supplierUnitPrice;
        // Distribute extra costs based on value ratio
        const ratio = totalSupplier > 0 ? itemSupplierTotal / totalSupplier : 0;
        const allocatedExtra = extra * ratio;
        const landedTotal = itemSupplierTotal + allocatedExtra;
        const landedUnit = landedTotal / item.qty;

        return {
            ...item,
            supplierTotalCost: itemSupplierTotal,
            landedUnitCost: landedUnit,
            landedTotalCost: landedTotal
        };
    });

    const totalLanded = items.reduce((acc, item) => acc + item.landedTotalCost, 0);
    return { calculatedItems: items, totalSupplierValue: totalSupplier, totalLandedValue: totalLanded };
  }, [receiptItems, globalExtraCosts]);


  const handleFinalizeReceipt = () => {
      // Apply updates to all products with the calculated Landed Unit Cost
      calculatedItems.forEach(item => {
           const updatedProduct: Product = {
               ...item.product,
               stock: item.product.stock + item.qty,
               purchasePrice: parseFloat(item.landedUnitCost.toFixed(2)) // Updates to new Landed Cost
           };
           onUpdateProduct(updatedProduct);
      });

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

      {/* Batch Receipt Modal */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-5xl p-6 border border-slate-200 dark:border-slate-700 h-[85vh] flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                <span>📦</span> {t.receiving}
            </h3>
            
            <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Left: Input Form */}
                <div className="w-1/3 flex flex-col gap-4 border-r border-slate-100 dark:border-slate-700 pr-6 overflow-y-auto">
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.supplier} & Info</label>
                        <select 
                            value={receiptSupplier}
                            onChange={(e) => setReceiptSupplier(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                        >
                            <option value="">{t.selectSupplier}</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        
                        <input 
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="pt-2">
                        <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-3">Add Line Item</label>
                        
                        <div className="relative mb-3">
                            <input 
                                type="text"
                                value={receiptProductSearch}
                                onChange={(e) => {
                                    setReceiptProductSearch(e.target.value);
                                    if (receiptProduct && e.target.value !== (lang === Language.RU ? receiptProduct.name_ru : receiptProduct.name_uk)) {
                                        setReceiptProduct(null);
                                    }
                                }}
                                placeholder={t.searchPlaceholder}
                                className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none ${receiptProduct ? 'border-green-500 ring-1 ring-green-500' : 'border-slate-300 dark:border-slate-600'}`}
                            />
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

                        <div className="grid grid-cols-2 gap-3 mb-4">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.qty}</label>
                                <input 
                                    type="number" 
                                    value={receiveQty}
                                    onChange={(e) => setReceiveQty(e.target.value)}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                />
                             </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.unitCost} (Supplier)</label>
                                <input 
                                    type="number" 
                                    value={purchasePrice}
                                    onChange={(e) => setPurchasePrice(e.target.value)}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                             </div>
                        </div>

                        <button 
                            onClick={handleAddToReceiptList}
                            disabled={!receiptProduct || !receiveQty}
                            className="w-full py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {t.addToReceipt}
                        </button>
                    </div>
                </div>

                {/* Right: Items Table */}
                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-end mb-2">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">{t.receiptList} ({receiptItems.length})</h4>
                        <div className="w-48">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 text-right">{t.extraCosts} (Global)</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1.5 text-slate-400 text-xs">₴</span>
                                <input 
                                    type="number" 
                                    value={globalExtraCosts}
                                    onChange={(e) => setGlobalExtraCosts(e.target.value)}
                                    className="w-full border border-orange-200 dark:border-orange-900/50 rounded px-2 py-1 pl-5 text-sm text-right bg-orange-50 dark:bg-orange-900/10 text-slate-900 dark:text-white focus:ring-1 focus:ring-orange-500 outline-none font-medium"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col">
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-300 font-semibold sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-2">Product</th>
                                        <th className="px-4 py-2 text-center">Qty</th>
                                        <th className="px-4 py-2 text-right">{t.unitCost}</th>
                                        <th className="px-4 py-2 text-right bg-blue-50/50 dark:bg-blue-900/10">{t.landedCost}</th>
                                        <th className="px-4 py-2 text-right">{t.total}</th>
                                        <th className="px-2 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {calculatedItems.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                                List is empty. Add products from the left.
                                            </td>
                                        </tr>
                                    )}
                                    {calculatedItems.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">
                                                {lang === Language.RU ? item.product.name_ru : item.product.name_uk}
                                                <div className="text-xs text-slate-400 font-mono">{item.product.sku}</div>
                                            </td>
                                            <td className="px-4 py-2 text-center">{item.qty}</td>
                                            <td className="px-4 py-2 text-right text-slate-500">
                                                {item.supplierUnitPrice}
                                            </td>
                                            <td className="px-4 py-2 text-right font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10">
                                                {item.landedUnitCost.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 text-right text-slate-800 dark:text-slate-200">
                                                {item.supplierTotalCost.toLocaleString()}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <button onClick={() => handleRemoveFromList(idx)} className="text-red-400 hover:text-red-600">×</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Financial Summary */}
                        <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
                            <div className="grid grid-cols-3 gap-8">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">{t.totalGoodsValue}</p>
                                    <p className="text-xl font-bold text-slate-800 dark:text-white">₴ {totalSupplierValue.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400">Payable to Supplier</p>
                                </div>
                                <div className="text-center">
                                     <p className="text-xs text-orange-500 uppercase font-bold mb-1">{t.shippingCost}</p>
                                     <p className="text-xl font-bold text-orange-600">₴ {parseFloat(globalExtraCosts || '0').toLocaleString()}</p>
                                     <p className="text-[10px] text-slate-400">{t.costDistribution}</p>
                                </div>
                                <div className="text-right">
                                     <p className="text-xs text-blue-600 uppercase font-bold mb-1">{t.totalLandedValue}</p>
                                     <p className="text-xl font-bold text-blue-700 dark:text-blue-400">₴ {totalLandedValue.toLocaleString()}</p>
                                     <p className="text-[10px] text-slate-400">New Inventory Value</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => setIsReceiptModalOpen(false)} 
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleFinalizeReceipt} 
                disabled={receiptItems.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.finishReceipt}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouse;
