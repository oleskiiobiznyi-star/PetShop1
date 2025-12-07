
import React, { useState, useMemo } from 'react';
import { Product, Language, Supplier, WarehouseReceipt, ReceiptItem } from '../types';
import { UI_TEXT } from '../constants';

interface WarehouseProps {
  products: Product[];
  lang: Language;
  onUpdateProduct: (product: Product) => void;
  suppliers: Supplier[];
  onCreateReceipt: (receipt: WarehouseReceipt) => void;
}

const Warehouse: React.FC<WarehouseProps> = ({ products, lang, onUpdateProduct, suppliers, onCreateReceipt }) => {
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
          originalDbPrice: receiptProduct.purchasePrice,
          supplierTotalCost: qty * price,
          landedUnitCost: price, // Placeholder, updated in calculator
          landedTotalCost: qty * price // Placeholder
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
        const landedUnit = item.qty > 0 ? landedTotal / item.qty : 0;

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
      // 1. Update Product Costs & Stock
      calculatedItems.forEach(item => {
           const updatedProduct: Product = {
               ...item.product,
               stock: item.product.stock + item.qty,
               purchasePrice: parseFloat(item.landedUnitCost.toFixed(2)) // Updates to new Landed Cost
           };
           onUpdateProduct(updatedProduct);
      });

      // 2. Create Receipt Record for Settlements
      if (receiptSupplier) {
          const supplierObj = suppliers.find(s => s.id.toString() === receiptSupplier);
          const newReceipt: WarehouseReceipt = {
              id: Date.now(),
              supplierId: parseInt(receiptSupplier),
              supplierName: supplierObj ? supplierObj.name : 'Unknown',
              date: new Date().toISOString().split('T')[0],
              paymentDueDate: paymentDate,
              totalAmount: totalSupplierValue,
              isPaid: false,
              itemsCount: calculatedItems.reduce((acc, i) => acc + i.qty, 0),
              items: calculatedItems // Save detailed items
          };
          onCreateReceipt(newReceipt);
      }

      setIsReceiptModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.warehouse}</h2>
        <div className="flex gap-2">
            <input 
                type="text" 
                placeholder={t.search} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
             <button 
              onClick={() => handleOpenReceiptModal()}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <span>+</span> {t.createReceipt}
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 overflow-hidden flex flex-col">
         <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-600 sticky top-0">
                <tr>
                  <th className="px-6 py-4">SKU / Barcode</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4 text-center">{t.stock}</th>
                  <th className="px-6 py-4 text-right">{t.purchasePrice}</th>
                  <th className="px-6 py-4 text-right">Value (Sum)</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">
                       <div className="font-bold text-slate-700 dark:text-slate-200">{product.sku}</div>
                       <div className="text-slate-400">{product.barcode || '-'}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {lang === Language.RU ? product.name_ru : product.name_uk}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${product.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                            {product.stock}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">₴ {product.purchasePrice}</td>
                    <td className="px-6 py-4 text-right text-slate-400">
                         ₴ {(product.stock * product.purchasePrice).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <button 
                            onClick={() => handleOpenReceiptModal(product)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 font-medium"
                        >
                            + {t.addStock}
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
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col border dark:border-slate-700">
              <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.receiving}</h3>
                 <button onClick={() => setIsReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                 {/* Left Panel: Configuration & Input */}
                 <div className="w-1/3 border-r border-slate-100 dark:border-slate-700 p-6 flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                    <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-4 uppercase text-xs tracking-wider">Receipt Settings</h4>
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.supplier}</label>
                            <select 
                                value={receiptSupplier}
                                onChange={(e) => setReceiptSupplier(e.target.value)}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">{t.selectSupplier}</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.paymentDate}</label>
                            <input 
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.extraCosts} (Global)</label>
                             <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400">₴</span>
                                <input 
                                    type="number"
                                    min="0"
                                    value={globalExtraCosts}
                                    onChange={(e) => setGlobalExtraCosts(e.target.value)}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 pl-7 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                             </div>
                             <p className="text-[10px] text-slate-500 mt-1">{t.costDistribution}</p>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-4 uppercase text-xs tracking-wider">Add Item</h4>
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Product</label>
                                <input 
                                    type="text"
                                    placeholder="Search Name or SKU..."
                                    value={receiptProductSearch}
                                    onChange={(e) => {
                                        setReceiptProductSearch(e.target.value);
                                        if (e.target.value === '') setReceiptProduct(null);
                                    }}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                {receiptProductSearch && !receiptProduct && (
                                    <div className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                                        {modalProductSuggestions.map(p => (
                                            <div 
                                                key={p.id}
                                                onClick={() => handleSelectProduct(p)}
                                                className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-200"
                                            >
                                                <div className="font-medium">{lang === Language.RU ? p.name_ru : p.name_uk}</div>
                                                <div className="text-xs text-slate-400">{p.sku}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.qty}</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        value={receiveQty}
                                        onChange={(e) => setReceiveQty(e.target.value)}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Unit Cost</label>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={purchasePrice}
                                        onChange={(e) => setPurchasePrice(e.target.value)}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleAddToReceiptList}
                                disabled={!receiptProduct || !receiveQty || !purchasePrice}
                                className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                            >
                                {t.addToReceipt}
                            </button>
                        </div>
                    </div>
                 </div>

                 {/* Right Panel: List & Summary */}
                 <div className="w-2/3 flex flex-col bg-white dark:bg-slate-800">
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-300 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3 text-center">Qty</th>
                                    <th className="px-4 py-3 text-right">Supplier Price</th>
                                    <th className="px-4 py-3 text-right">Landed Cost</th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {calculatedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            List is empty. Add products from the left panel.
                                        </td>
                                    </tr>
                                ) : (
                                    calculatedItems.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                                {lang === Language.RU ? item.product.name_ru : item.product.name_uk}
                                                <div className="text-xs text-slate-400 font-mono">{item.product.sku}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">{item.qty}</td>
                                            <td className="px-4 py-3 text-right">₴ {item.supplierUnitPrice}</td>
                                            <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                                                ₴ {item.landedUnitCost.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => handleRemoveFromList(idx)} className="text-red-400 hover:text-red-600">×</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Summary Footer */}
                    <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-900/50">
                        <div className="grid grid-cols-3 gap-6 mb-4">
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-500 uppercase font-bold">{t.totalGoodsValue}</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">₴ {totalSupplierValue.toLocaleString()}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-500 uppercase font-bold">{t.shippingCost}</p>
                                <p className="text-xl font-bold text-orange-600">₴ {parseFloat(globalExtraCosts || '0').toLocaleString()}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-500 uppercase font-bold">{t.totalLandedValue}</p>
                                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">₴ {totalLandedValue.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                             <button 
                                onClick={() => setIsReceiptModalOpen(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                {t.cancel}
                            </button>
                            <button 
                                onClick={handleFinalizeReceipt}
                                disabled={calculatedItems.length === 0 || !receiptSupplier}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {t.finishReceipt}
                            </button>
                        </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Warehouse;
