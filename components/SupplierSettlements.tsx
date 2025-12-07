
import React, { useState, useMemo } from 'react';
import { WarehouseReceipt, Language, Expense } from '../types';
import { UI_TEXT } from '../constants';

interface SupplierSettlementsProps {
  lang: Language;
  receipts: WarehouseReceipt[];
  expenses: Expense[];
  onMarkPaid: (id: number) => void;
  onDeleteReceipt: (id: number) => void;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: number) => void;
}

type Period = 'all' | 'month' | 'last_month' | 'this_week' | 'overdue';

const SupplierSettlements: React.FC<SupplierSettlementsProps> = ({ 
  lang, receipts, expenses, onMarkPaid, onDeleteReceipt, onAddExpense, onDeleteExpense 
}) => {
  const t = UI_TEXT[lang];
  const [activeTab, setActiveTab] = useState<'suppliers' | 'expenses'>('suppliers');
  
  // Suppliers State
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
  const [period, setPeriod] = useState<Period>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<WarehouseReceipt | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

  // Expenses State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    category: 'Ads',
    amount: 0,
    description: ''
  });

  // --- LOGIC: Suppliers ---
  const filteredReceipts = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    const day = startOfWeek.getDay() || 7; 
    if (day !== 1) startOfWeek.setHours(-24 * (day - 1));

    return receipts.filter(r => {
        if (filterType === 'unpaid' && r.isPaid) return false;
        if (filterType === 'paid' && !r.isPaid) return false;

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

  const supplierReceipts = useMemo(() => {
      if (!selectedSupplierId) return [];
      return filteredReceipts.filter(r => r.supplierId === selectedSupplierId);
  }, [filteredReceipts, selectedSupplierId]);

  // --- LOGIC: Expenses ---
  const handleSaveExpense = () => {
    if (newExpense.amount && newExpense.category && newExpense.date) {
        onAddExpense({
            id: Date.now(),
            category: newExpense.category,
            amount: parseFloat(newExpense.amount.toString()),
            date: newExpense.date,
            description: newExpense.description || ''
        });
        setIsExpenseModalOpen(false);
        setNewExpense({
            date: new Date().toISOString().split('T')[0],
            category: 'Ads',
            amount: 0,
            description: ''
        });
    }
  };

  const handleDeleteReceipt = (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      if(window.confirm('Are you sure you want to delete this receipt?')) onDeleteReceipt(id);
  };

  const handleDeleteExpenseAction = (id: number) => {
      if(window.confirm('Delete this expense record?')) onDeleteExpense(id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.settlements}</h2>
        
        {/* Top Level Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('suppliers')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'suppliers' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
            >
                {t.suppliers}
            </button>
            <button 
                onClick={() => setActiveTab('expenses')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
            >
                {t.businessExpenses}
            </button>
        </div>
      </div>

      {/* --- SUPPLIERS TAB --- */}
      {activeTab === 'suppliers' && (
        <>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                     {selectedSupplierId && (
                        <button onClick={() => setSelectedSupplierId(null)} className="text-slate-400 hover:text-blue-600 text-sm flex items-center gap-1">
                           <span>←</span> {t.back}
                        </button>
                     )}
                     <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                         {selectedSupplierId ? supplierSummary.find(s => s.id === selectedSupplierId)?.name : 'Accounts Payable'}
                     </h3>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                        {['unpaid', 'paid', 'all'].map((type) => (
                            <button
                            key={type}
                            onClick={() => setFilterType(type as any)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                filterType === type 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                                : 'text-slate-500'
                            }`}
                            >
                            {type === 'unpaid' ? t.paymentNotPaid : type === 'paid' ? t.paid : 'All'}
                            </button>
                        ))}
                    </div>
                    <select 
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as Period)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-2 outline-none"
                    >
                        <option value="all">{t.allTime}</option>
                        <option value="month">{t.thisMonth}</option>
                        <option value="last_month">{t.lastMonth}</option>
                        <option value="overdue">Overdue</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {!selectedSupplierId ? (
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
                            {supplierSummary.map(item => (
                                <tr key={item.id} onClick={() => setSelectedSupplierId(item.id)} className="hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-lg">{item.name}</td>
                                    <td className="px-6 py-4 text-center"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold">{item.count}</span></td>
                                    <td className="px-6 py-4 text-right font-bold text-red-500 text-lg">₴ {item.total.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-blue-600 dark:text-blue-400 font-medium">View →</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-600">
                            <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">{t.dueDate}</th>
                            <th className="px-6 py-4">Items</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {supplierReceipts.map((receipt) => (
                                <tr key={receipt.id} onClick={() => setSelectedReceipt(receipt)} className="hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                                    <td className="px-6 py-4">{receipt.date}</td>
                                    <td className={`px-6 py-4 ${!receipt.isPaid && new Date(receipt.paymentDueDate) < new Date() ? 'text-red-500 font-bold' : ''}`}>{receipt.paymentDueDate}</td>
                                    <td className="px-6 py-4 text-xs font-mono">{receipt.itemsCount} units</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-200">₴ {receipt.totalAmount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${receipt.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {receipt.isPaid ? t.paid : t.paymentNotPaid}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {!receipt.isPaid && (
                                            <button onClick={(e) => { e.stopPropagation(); onMarkPaid(receipt.id); }} className="text-blue-600 border border-blue-200 px-2 py-1 rounded text-xs">{t.markPaid}</button>
                                        )}
                                        <button onClick={(e) => handleDeleteReceipt(e, receipt.id)} className="text-slate-300 hover:text-red-500">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
      )}

      {/* --- EXPENSES TAB --- */}
      {activeTab === 'expenses' && (
          <>
            <div className="flex justify-end mb-4">
                <button 
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  + {t.addExpense}
                </button>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-600">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">{t.expenseCategory}</th>
                            <th className="px-6 py-4">{t.expenseDesc}</th>
                            <th className="px-6 py-4 text-right">{t.expenseAmount}</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {expenses.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">No expenses recorded.</td></tr>
                        ) : (
                            expenses.map(exp => (
                                <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4">{exp.date}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {exp.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{exp.description}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-200">₴ {exp.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDeleteExpenseAction(exp.id)} className="text-slate-400 hover:text-red-500">🗑️</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold">
                        <tr>
                            <td colSpan={3} className="px-6 py-3 text-right text-slate-500">{t.totalExpenses}:</td>
                            <td className="px-6 py-3 text-right text-red-600">
                                ₴ {expenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
          </>
      )}

      {/* Modal: Receipt Detail */}
      {selectedReceipt && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl p-6 border dark:border-slate-700 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.receiptDetails} #{selectedReceipt.id}</h3>
                   <p className="text-sm text-slate-500">{selectedReceipt.supplierName}</p>
                 </div>
                 <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="flex-1 overflow-auto border dark:border-slate-700 rounded-lg">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-300 sticky top-0">
                       <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3 text-center">Qty</th><th className="px-4 py-3 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                       {selectedReceipt.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                             <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{lang === Language.RU ? item.product.name_ru : item.product.name_uk}</td>
                             <td className="px-4 py-3 text-center">{item.qty}</td>
                             <td className="px-4 py-3 text-right font-medium">₴ {item.supplierTotalCost.toLocaleString()}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
         </div>
      )}

      {/* Modal: Add Expense */}
      {isExpenseModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 border dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">{t.addExpense}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.expenseCategory}</label>
                        <select 
                            value={newExpense.category}
                            onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                            className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                        >
                            <option value="Ads">{t.catAds}</option>
                            <option value="Hosting">{t.catHosting}</option>
                            <option value="Salary">{t.catSalary}</option>
                            <option value="Other">{t.catOther}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.expenseAmount}</label>
                        <input 
                            type="number"
                            min="0"
                            value={newExpense.amount}
                            onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})}
                            className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                        <input 
                            type="date"
                            value={newExpense.date}
                            onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                            className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.expenseDesc}</label>
                        <textarea 
                            value={newExpense.description}
                            onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                            className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg">{t.cancel}</button>
                    <button onClick={handleSaveExpense} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">{t.save}</button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default SupplierSettlements;
