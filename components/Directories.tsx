
import React, { useState } from 'react';
import { Supplier, Customer, Language, Category } from '../types';
import { UI_TEXT } from '../constants';

interface DirectoriesProps {
  lang: Language;
  suppliers: Supplier[];
  customers: Customer[];
  categories: Category[];
  onUpdateSupplier: (supplier: Supplier) => void;
  onAddSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: number) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onAddCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: number) => void;
  onUpdateCategory: (category: Category) => void;
  onAddCategory: (category: Category) => void;
  onDeleteCategory: (id: number) => void;
}

const Directories: React.FC<DirectoriesProps> = ({
  lang,
  suppliers,
  customers,
  categories,
  onUpdateSupplier,
  onAddSupplier,
  onDeleteSupplier,
  onUpdateCustomer,
  onAddCustomer,
  onDeleteCustomer,
  onUpdateCategory,
  onAddCategory,
  onDeleteCategory
}) => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'customers' | 'categories'>('suppliers');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const t = UI_TEXT[lang];

  const handleOpenModal = (item?: any) => {
    setEditingItem(item || {});
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (activeTab === 'suppliers') {
      const supplier = editingItem as Supplier;
      if (supplier.id) {
        onUpdateSupplier(supplier);
      } else {
        onAddSupplier({ ...supplier, id: Date.now() });
      }
    } else if (activeTab === 'customers') {
      const customer = editingItem as Customer;
      if (customer.id) {
        onUpdateCustomer(customer);
      } else {
        onAddCustomer({ ...customer, id: Date.now() });
      }
    } else {
        const category = editingItem as Category;
        if (category.id) {
            onUpdateCategory(category);
        } else {
            onAddCategory({ ...category, id: Date.now() });
        }
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
      if (confirm('Are you sure you want to delete this item?')) {
          if (activeTab === 'suppliers') {
              onDeleteSupplier(id);
          } else if (activeTab === 'customers') {
              onDeleteCustomer(id);
          } else {
              onDeleteCategory(id);
          }
      }
  };

  // --- Category Tree Logic ---
  const renderCategoryRows = (parentId: number | null = null, level: number = 0) => {
      const children = categories.filter(c => (c.parentId === undefined ? null : c.parentId) === parentId);
      if (children.length === 0) return null;

      return children.map(cat => (
          <React.Fragment key={cat.id}>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                      <div style={{ marginLeft: `${level * 24}px` }} className="flex items-center">
                          {level > 0 && <span className="text-slate-300 mr-2">└─</span>}
                          <span className="font-medium text-slate-900 dark:text-white">
                              {lang === Language.RU ? cat.name_ru : cat.name_uk}
                          </span>
                      </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                      ID: {cat.id}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {cat.parentId ? `Parent: ${cat.parentId}` : 'Root'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenModal(cat)} className="text-blue-600 dark:text-blue-400 hover:underline">{t.edit}</button>
                      <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:underline">{t.delete}</button>
                  </td>
              </tr>
              {renderCategoryRows(cat.id, level + 1)}
          </React.Fragment>
      ));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.directories}</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'suppliers'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {t.suppliers} ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'customers'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {t.customers} ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'categories'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {t.categories} ({categories.length})
          </button>
        </nav>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end">
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          + {activeTab === 'suppliers' ? t.addSupplier : activeTab === 'customers' ? t.addCustomer : t.addCategory}
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">{activeTab === 'suppliers' ? t.contactPerson : activeTab === 'customers' ? t.city : 'Info'}</th>
                <th className="px-6 py-4">{activeTab === 'categories' ? 'Structure' : t.phone}</th>
                <th className="px-6 py-4">{activeTab === 'suppliers' ? '' : activeTab === 'customers' ? t.email : ''}</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {activeTab === 'suppliers' && (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{s.name}</td>
                    <td className="px-6 py-4">{s.contactPerson}</td>
                    <td className="px-6 py-4">{s.phone}</td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenModal(s)} className="text-blue-600 dark:text-blue-400 hover:underline">{t.edit}</button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:underline">{t.delete}</button>
                    </td>
                  </tr>
                ))
              )}

              {activeTab === 'customers' && (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-6 py-4">{c.city || '-'}</td>
                    <td className="px-6 py-4">{c.phone}</td>
                    <td className="px-6 py-4">{c.email || '-'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenModal(c)} className="text-blue-600 dark:text-blue-400 hover:underline">{t.edit}</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline">{t.delete}</button>
                    </td>
                  </tr>
                ))
              )}

              {activeTab === 'categories' && renderCategoryRows(null, 0)}

            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              {editingItem.id ? t.edit : t.add} {activeTab === 'suppliers' ? t.supplier : activeTab === 'customers' ? t.customer : t.category}
            </h3>
            
            <div className="space-y-4">
              {/* Common Fields */}
              {activeTab !== 'categories' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Name</label>
                  <input 
                    type="text" 
                    value={editingItem.name || ''} 
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              {activeTab === 'categories' && (
                  <>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.nameRU}</label>
                        <input 
                            type="text" 
                            value={editingItem.name_ru || ''} 
                            onChange={(e) => setEditingItem({ ...editingItem, name_ru: e.target.value })}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.nameUK}</label>
                        <input 
                            type="text" 
                            value={editingItem.name_uk || ''} 
                            onChange={(e) => setEditingItem({ ...editingItem, name_uk: e.target.value })}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.parentCategory}</label>
                        <select 
                            value={editingItem.parentId || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, parentId: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">{t.rootCategory}</option>
                            {categories
                                .filter(c => c.id !== editingItem.id) // Prevent selecting self as parent
                                .map(c => (
                                <option key={c.id} value={c.id}>
                                    {lang === Language.RU ? c.name_ru : c.name_uk}
                                </option>
                            ))}
                        </select>
                    </div>
                  </>
              )}

              {/* Supplier/Customer Fields */}
              {activeTab !== 'categories' && (
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.phone}</label>
                    <input 
                    type="text" 
                    value={editingItem.phone || ''} 
                    onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
              )}

              {activeTab === 'suppliers' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.contactPerson}</label>
                  <input 
                    type="text" 
                    value={editingItem.contactPerson || ''} 
                    onChange={(e) => setEditingItem({ ...editingItem, contactPerson: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
              
              {activeTab === 'customers' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.city}</label>
                    <input 
                      type="text" 
                      value={editingItem.city || ''} 
                      onChange={(e) => setEditingItem({ ...editingItem, city: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.email}</label>
                    <input 
                      type="email" 
                      value={editingItem.email || ''} 
                      onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.note}</label>
                    <textarea 
                      value={editingItem.note || ''} 
                      onChange={(e) => setEditingItem({ ...editingItem, note: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
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

export default Directories;
