
import React, { useState, useMemo } from 'react';
import { WarehouseReceipt, Language } from '../types';
import { UI_TEXT } from '../constants';

interface SupplierSettlementsProps {
  lang: Language;
  receipts: WarehouseReceipt[];
  onMarkPaid: (id: number) => void;
  onDeleteReceipt: (id: number) => void;
}

type Period = 'all' | 'month' | 'last_month' | 'this_week' | 'overdue';

const SupplierSettlements: React.FC<SupplierSettlementsProps> = ({ lang, receipts, onMarkPaid, onDeleteReceipt }) => {
  const t = UI_TEXT[lang];
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
  const [period, setPeriod] = useState<Period>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<WarehouseReceipt | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

  // 1. Filter Receipts based on Status and Date Period
  const filteredReceipts = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Start of week
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    const day = startOfWeek.getDay() || 7; 
    if (day !== 1) startOfWeek.setHours(-24 * (day - 1));

    return receipts.filter(r => {
        // Status Filter
        if (filterType === 'unpaid' && r.isPaid) return false;
        if (filterType === 'paid' && !r.isPaid) return false;

        // Date Period Filter (Using Payment Due Date)
        const d = new Date(r.paymentDueDate);
        
        switch (period) {
            case 'month': return d >= startOfMonth;
            case 'last_month': return d >= startOfLastMonth && d <= endOfLastMonth;
            case 'this_week': return d >= startOfWeek;
            case 'overdue': return !r.isPaid && d < startOfDay;
            case 'all': default: return true;
        }
    });
  }, [receipts, filterType, period]);

  // 2. Group by Supplier for Summary View
  const supplierSummary = useMemo(() => {
      const map = new Map<number, { id: number, name: string, count: number, total: number }>();

      filteredReceipts.forEach(r => {
          const current = map.get(r.supplierId) || { id: r.supplierId, name: r.supplierName, count: 0, total: 0 };
          current.count += 1;
          current.total += r.totalAmount;
          map.set(r.supplierId, current);
      });

      return Array.from(map.values());
  }, [filteredReceipts]);

  // 3. Drill-down: Receipts for specific supplier
  const supplierReceipts = useMemo(() => {
      if (!selectedSupplierId) return [];
      return filteredReceipts.filter(r => r.supplierId === selectedSupplierId);
  }, [filteredReceipts, selectedSupplierId]);

  const handleDelete = (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      if(window.confirm('Are you sure you want to delete this receipt? This will affect financial records.')) {
          onDeleteReceipt(id);
      }
  };

  const selectedSupplierName = supplierSummary.find(s => s.id === selectedSupplierId)?.name;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {selectedSupplierId && (
                <button onClick={() => setSelectedSupplierId(null)} className="text-slate-400 hover:text-blue-600 mr-2 text-sm flex items-center gap-1">
                   <span>←</span> {t.back}
                </button>
            )}
            {selectedSupplierId ? `${selectedSupplierName}` : t.settlements}
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            {['unpaid', 'paid', 'all'].map((type) => (
                <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filterType === type 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
                >
                {type === 'unpaid' ? t.paymentNotPaid : type === 'paid' ? t.paid : 'All'}
                </button>
            ))}
            </div>

            {/* Date Period Filter */}
            <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="all">{t.allTime}</option>
                <option value="month">{t.thisMonth}</option>
                <option value="last_month">{t.lastMonth}</option>
                <option value="this_week">{t.thisWeek}</option>
                <option value="overdue">Overdue</option>
            </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* VIEW 1: Summary by Supplier */}
        {!selectedSupplierId && (
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-600">
                    <tr>
                        <th className="px-6 py-4">{t.supplier}</th>
                        <th className="px-6 py-4 text-center">{t.invoicesCount}</th>
                        <th className="px-6 py-4 text-right">{t.totalDebt}</th>
                        <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {supplierSummary.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No data found for selected period.</td></tr>
                    ) : (
                        supplierSummary.map(item => (
                            <tr 
                                key={item.id} 
                                onClick={() => setSelectedSupplierId(item.id)}
                                className="hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                            >
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-lg">
                                    {item.name}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold">
                                        {item.count}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-red-500 text-lg">
                                    ₴ {item.total.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right text-blue-600 dark:text-blue-400 font-medium">
                                    View Invoices →
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        )}

        {/* VIEW 2: Receipts List for Selected Supplier */}
        {selectedSupplierId && (
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-600">
                <tr>
                <th className="px-6 py-4">Receipt Date</th>
                <th className="px-6 py-4">{t.dueDate}</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {supplierReceipts.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                            No invoices found.
                        </td>
                    </tr>
                ) : (
                    supplierReceipts.map((receipt) => {
                    const isOverdue = !receipt.isPaid && new Date(receipt.paymentDueDate) < new Date();
                    return (
                        <tr 
                        key={receipt.id} 
                        onClick={() => setSelectedReceipt(receipt)}
                        className="hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                        >
                        <td className="px-6 py-4">{receipt.date}</td>
                        <td className={`px-6 py-4 ${isOverdue ? 'text-red-500 font-bold' : ''}`}>
                            {receipt.paymentDueDate}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono">{receipt.itemsCount} units</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                            ₴ {receipt.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                            receipt.isPaid 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                            {receipt.isPaid ? t.paid : t.paymentNotPaid}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                            {!receipt.isPaid && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkPaid(receipt.id);
                                }}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium px-3 py-1 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-slate-700"
                            >
                                {t.markPaid}
                            </button>
                            )}
                            <button 
                                onClick={(e) => handleDelete(e, receipt.id)}
                                className="text-slate-300 hover:text-red-500 font-medium px-2 py-1"
                                title="Delete Receipt"
                            >
                                🗑️
                            </button>
                        </td>
                        </tr>
                    );
                    })
                )}
            </tbody>
            </table>
        )}
      </div>

      {/* Detail Modal (Items in Receipt) */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl p-6 border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.receiptDetails} #{selectedReceipt.id}</h3>
                  <p className="text-sm text-slate-500">{selectedReceipt.supplierName} • {selectedReceipt.date}</p>
                </div>
                <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-600">✕</button>
             </div>

             <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-300 sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Landed Cost</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                          selectedReceipt.items.map((item, idx) => (
                             <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3">
                                   <div className="font-medium text-slate-800 dark:text-slate-200">{lang === Language.RU ? item.product.name_ru : item.product.name_uk}</div>
                                   <div className="text-xs text-slate-400 font-mono">{item.product.sku}</div>
                                </td>
                                <td className="px-4 py-3 text-center">{item.qty}</td>
                                <td className="px-4 py-3 text-right">₴ {item.supplierUnitPrice}</td>
                                <td className="px-4 py-3 text-right font-medium">₴ {item.supplierTotalCost.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-slate-500">₴ {item.landedUnitCost.toFixed(2)}</td>
                             </tr>
                          ))
                      ) : (
                          <tr><td colSpan={5} className="p-4 text-center text-slate-400">Item details not available for legacy data.</td></tr>
                      )}
                   </tbody>
                   <tfoot className="bg-slate-50 dark:bg-slate-700 font-bold text-slate-800 dark:text-slate-200">
                      <tr>
                         <td colSpan={3} className="px-4 py-3 text-right">Total Payable:</td>
                         <td className="px-4 py-3 text-right text-lg">₴ {selectedReceipt.totalAmount.toLocaleString()}</td>
                         <td></td>
                      </tr>
                   </tfoot>
                </table>
             </div>
             
             <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {t.close}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierSettlements;
