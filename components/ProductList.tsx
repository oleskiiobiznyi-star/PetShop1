import React, { useState, useMemo } from 'react';
import { Product, Language } from '../types';
import { UI_TEXT } from '../constants';
import { generateProductDescription } from '../services/geminiService';

interface ProductListProps {
  products: Product[];
  lang: Language;
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (id: number) => void;
}

interface ColumnMapping {
  sku: string;
  name_ru: string;
  name_uk: string;
  price: string;
  stock: string;
  category: string;
}

// Helper for Diff
interface DiffItem {
  type: 'new' | 'update';
  newProduct: Product;
  existingProduct?: Product;
  changes?: string[];
  selected: boolean;
}

const ProductList: React.FC<ProductListProps> = ({ products, lang, onUpdateProduct, onAddProduct, onDeleteProduct }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // State for Import
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    sku: '', name_ru: '', name_uk: '', price: '', stock: '', category: ''
  });
  const [diffItems, setDiffItems] = useState<DiffItem[]>([]);
  
  // State for the Margin Calculator
  const [calcMargin, setCalcMargin] = useState<number>(0);

  const t = UI_TEXT[lang];

  // Derive categories from products
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name_ru.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.name_uk.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));
      
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    const margin = product.purchasePrice > 0 
      ? ((product.price - product.purchasePrice) / product.purchasePrice) * 100 
      : 0;
    setCalcMargin(Number(margin.toFixed(2)));
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
        onDeleteProduct(id);
    }
  };

  const handleAddNew = () => {
    setEditingProduct({
      id: Date.now(),
      stock: 0,
      price: 0,
      purchasePrice: 0,
      imageUrl: 'https://picsum.photos/200/200'
    });
    setCalcMargin(0);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingProduct.id && editingProduct.name_ru) {
      if (products.some(p => p.id === editingProduct.id)) {
        onUpdateProduct(editingProduct as Product);
      } else {
        onAddProduct(editingProduct as Product);
      }
      setIsModalOpen(false);
    }
  };

  // --- Calculator Logic ---
  const handlePurchasePriceChange = (cost: number) => {
    const updated = { ...editingProduct, purchasePrice: cost };
    setEditingProduct(updated);
    if (cost > 0 && (updated.price || 0) > 0) {
      const margin = ((updated.price! - cost) / cost) * 100;
      setCalcMargin(Number(margin.toFixed(2)));
    }
  };

  const handlePriceChange = (price: number) => {
    const updated = { ...editingProduct, price: price };
    setEditingProduct(updated);
    if ((updated.purchasePrice || 0) > 0) {
      const margin = ((price - updated.purchasePrice!) / updated.purchasePrice!) * 100;
      setCalcMargin(Number(margin.toFixed(2)));
    }
  };

  const handleMarginChange = (margin: number) => {
    setCalcMargin(margin);
    if ((editingProduct.purchasePrice || 0) > 0) {
      const newPrice = editingProduct.purchasePrice! * (1 + margin / 100);
      setEditingProduct({ ...editingProduct, price: Number(newPrice.toFixed(2)) });
    }
  };

  const handleGenerateDescription = async (targetLang: Language) => {
    if (!editingProduct.name_ru && !editingProduct.name_uk) return;
    setIsGenerating(true);
    const name = targetLang === Language.RU ? editingProduct.name_ru : editingProduct.name_uk;
    const desc = await generateProductDescription(name || 'Pet Product', editingProduct.category || 'General', targetLang);
    setEditingProduct(prev => ({
      ...prev,
      [targetLang === Language.RU ? 'description_ru' : 'description_uk']: desc
    }));
    setIsGenerating(false);
  };

  // --- Import Logic ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setTimeout(() => {
        setFileHeaders(['SKU', 'Name_RU', 'Price', 'Stock', 'Category', 'Legacy_Code']);
        setImportStep(2);
      }, 500);
    }
  };

  const handleAnalyzeImport = () => {
    // Mock parsing data based on mapping
    // Here we simulate 1 New Product and 1 Existing Product (Collision)
    const mockParsedData: Partial<Product>[] = [
      {
        sku: "DOG-FOOD-001", // Collides with mock product 1
        name_ru: "Корм для собак Премиум 10кг (Updated)",
        price: 1300, // Changed from 1200
        stock: 50,
        category: "Food"
      },
      {
        sku: "NEW-ITEM-999",
        name_ru: "Новый Импортный Товар",
        name_uk: "Новий Імпортний Товар",
        price: 900,
        stock: 20,
        category: "Accessories"
      }
    ];

    const comparison: DiffItem[] = mockParsedData.map(row => {
        const existing = products.find(p => p.sku === row.sku);
        if (existing) {
            const changes = [];
            if (row.price !== existing.price) changes.push(`Price: ${existing.price} -> ${row.price}`);
            if (row.stock !== existing.stock) changes.push(`Stock: ${existing.stock} -> ${row.stock}`);
            
            return {
                type: 'update',
                newProduct: { ...existing, ...row } as Product,
                existingProduct: existing,
                changes,
                selected: true
            };
        } else {
            return {
                type: 'new',
                newProduct: { ...row, id: Date.now() + Math.random(), purchasePrice: 0, imageUrl: 'https://picsum.photos/200/200' } as Product,
                selected: true
            };
        }
    });

    setDiffItems(comparison);
    setImportStep(3);
  };

  const handleExecuteImport = () => {
      diffItems.forEach(item => {
          if (item.selected) {
              if (item.type === 'update') {
                  onUpdateProduct(item.newProduct);
              } else {
                  onAddProduct(item.newProduct);
              }
          }
      });
      setIsImportModalOpen(false);
      setImportStep(1);
      setImportFile(null);
  };

  const toggleDiffSelection = (index: number) => {
      const newItems = [...diffItems];
      newItems[index].selected = !newItems[index].selected;
      setDiffItems(newItems);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      {/* Category Sidebar */}
      <div className="w-48 flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-3 text-sm uppercase">{t.category}</h3>
        <div className="space-y-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === cat 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'all' ? t.allCategories : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 w-full max-w-md">
             <input 
                 type="text" 
                 placeholder={t.search} 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm dark:bg-slate-800 dark:text-white"
             />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <span>📥</span> {t.import}
            </button>
            <button 
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              + {t.addProduct}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase font-semibold text-xs border-b border-slate-200 dark:border-slate-600 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">SKU / Barcode</th>
                  <th className="px-6 py-4">Name ({lang.toUpperCase()})</th>
                  <th className="px-6 py-4 text-right">{t.purchasePrice}</th>
                  <th className="px-6 py-4 text-right">{t.price}</th>
                  <th className="px-6 py-4 text-right">{t.margin}</th>
                  <th className="px-6 py-4">{t.stock}</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredProducts.map((product) => {
                   const margin = product.purchasePrice > 0 
                     ? ((product.price - product.purchasePrice) / product.purchasePrice) * 100 
                     : 0;
                   return (
                    <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <td className="px-6 py-3">
                        <img src={product.imageUrl} alt={product.sku} className="h-10 w-10 rounded-md object-cover border border-slate-200 dark:border-slate-600" />
                      </td>
                      <td className="px-6 py-3 font-mono text-xs">
                        <div className="font-bold text-slate-700 dark:text-slate-200">{product.sku}</div>
                        <div className="text-slate-400">{product.barcode || '-'}</div>
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                        {lang === Language.RU ? product.name_ru : product.name_uk}
                      </td>
                      <td className="px-6 py-3 text-right">₴ {product.purchasePrice}</td>
                      <td className="px-6 py-3 text-right font-bold text-slate-800 dark:text-slate-200">
                         {product.promotional_price ? (
                            <span className="flex flex-col">
                               <span className="line-through text-slate-400 text-xs">₴ {product.price}</span>
                               <span className="text-red-500">₴ {product.promotional_price}</span>
                            </span>
                         ) : `₴ ${product.price}`}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${margin < 20 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {product.stock} units
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          {t.edit}
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="text-red-500 hover:text-red-700 font-medium"
                        >
                          {t.delete}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full ${importStep === 3 ? 'max-w-4xl' : 'max-w-xl'} p-6 border dark:border-slate-700 flex flex-col max-h-[90vh]`}>
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                   {t.import} - {importStep === 1 ? 'Select File' : importStep === 2 ? 'Map Columns' : 'Review & Confirm'}
               </h3>
               <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
             </div>

             {/* Step 1: File Selection */}
             {importStep === 1 && (
               <div className="space-y-6">
                 <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <span className="text-4xl mb-3">📂</span>
                    <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">{t.importDesc}</p>
                    <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm">
                      {t.selectFile}
                      <input type="file" className="hidden" accept=".csv,.xlsx,.xml" onChange={handleFileSelect} />
                    </label>
                 </div>
               </div>
             )}

             {/* Step 2: Mapping */}
             {importStep === 2 && (
               <div className="space-y-4">
                 <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.mapDesc}</p>
                 <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
                   {[
                     { key: 'sku', label: 'SKU (Key)' },
                     { key: 'name_ru', label: 'Name (RU)' },
                     { key: 'price', label: 'Price' },
                     { key: 'stock', label: 'Stock' },
                     { key: 'category', label: 'Category' }
                   ].map((field) => (
                     <div key={field.key} className="flex items-center justify-between mb-3 last:mb-0">
                       <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-1/3">{field.label}</span>
                       <span className="text-slate-400">→</span>
                       <select 
                         className="w-1/2 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                         value={columnMapping[field.key as keyof ColumnMapping]}
                         onChange={(e) => setColumnMapping({...columnMapping, [field.key]: e.target.value})}
                       >
                         <option value="">-- {t.fileColumn} --</option>
                         {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                       </select>
                     </div>
                   ))}
                 </div>
                 <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={() => setImportStep(1)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 text-sm font-medium">{t.back}</button>
                    <button onClick={handleAnalyzeImport} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">{t.reviewChanges}</button>
                 </div>
               </div>
             )}

             {/* Step 3: Diff Review */}
             {importStep === 3 && (
                 <div className="flex flex-col flex-1 overflow-hidden">
                     <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.reviewDesc}</p>
                     
                     <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                         <table className="w-full text-sm text-left">
                             <thead className="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-300 font-semibold sticky top-0">
                                 <tr>
                                     <th className="px-4 py-2 w-10"></th>
                                     <th className="px-4 py-2">Product</th>
                                     <th className="px-4 py-2">Status</th>
                                     <th className="px-4 py-2">Changes</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                 {diffItems.map((item, idx) => (
                                     <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${!item.selected ? 'opacity-50' : ''}`}>
                                         <td className="px-4 py-3">
                                             <input type="checkbox" checked={item.selected} onChange={() => toggleDiffSelection(idx)} />
                                         </td>
                                         <td className="px-4 py-3">
                                             <div className="font-bold text-slate-800 dark:text-slate-200">{lang === Language.RU ? item.newProduct.name_ru : item.newProduct.name_uk}</div>
                                             <div className="text-xs text-slate-500 font-mono">{item.newProduct.sku}</div>
                                         </td>
                                         <td className="px-4 py-3">
                                             <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.type === 'new' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                 {item.type === 'new' ? t.newProduct : t.updateProduct}
                                             </span>
                                         </td>
                                         <td className="px-4 py-3 text-xs">
                                             {item.type === 'new' ? (
                                                 <span className="text-slate-400">Ready to create</span>
                                             ) : (
                                                 <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400">
                                                     {item.changes && item.changes.length > 0 ? item.changes.map((c, i) => (
                                                         <li key={i}>{c}</li>
                                                     )) : (
                                                         <li>No significant changes</li>
                                                     )}
                                                 </ul>
                                             )}
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>

                     <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
                        <button onClick={() => setImportStep(2)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 text-sm font-medium">{t.back}</button>
                        <button onClick={handleExecuteImport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">{t.applyUpdate}</button>
                     </div>
                 </div>
             )}
           </div>
        </div>
      )}

      {/* Edit Modal (Kept from previous steps) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border dark:border-slate-700">
             {/* ... (Existing Edit Modal Content) ... */}
             <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingProduct.id ? t.edit : t.addProduct}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Core Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">SKU</label>
                  <input 
                    type="text" 
                    value={editingProduct.sku || ''}
                    onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                 <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.barcode}</label>
                  <input 
                    type="text" 
                    value={editingProduct.barcode || ''}
                    onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                 <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.category}</label>
                  <input 
                    type="text" 
                    value={editingProduct.category || ''}
                    onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                    list="category-suggestions"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <datalist id="category-suggestions">
                    {categories.filter(c => c !== 'all').map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {/* Price & Margin Calculator */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900">
                <h4 className="font-bold text-slate-700 dark:text-blue-300 mb-3 text-sm">Pricing Calculator</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.purchasePrice} (UAH)</label>
                    <input 
                      type="number" 
                      value={editingProduct.purchasePrice || 0}
                      onChange={e => handlePurchasePriceChange(Number(e.target.value))}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  
                  <div className="flex flex-col justify-end">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.margin} (%)</label>
                    <input 
                      type="number" 
                      value={calcMargin}
                      onChange={e => handleMarginChange(Number(e.target.value))}
                      className="w-full border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.price} (UAH)</label>
                    <input 
                      type="number" 
                      value={editingProduct.price || 0}
                      onChange={e => handlePriceChange(Number(e.target.value))}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Promo Price (Optional)</label>
                    <input 
                      type="number" 
                      value={editingProduct.promotional_price || ''}
                      onChange={e => setEditingProduct({...editingProduct, promotional_price: Number(e.target.value)})}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-red-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.stock}</label>
                <input 
                  type="number" 
                  value={editingProduct.stock || 0}
                  onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                  className="w-32 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Multilingual Fields */}
              <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300">Russian Content</h4>
                  <button 
                    onClick={() => handleGenerateDescription(Language.RU)}
                    disabled={isGenerating}
                    className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-md flex items-center hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                  >
                    ✨ {isGenerating ? t.loading : 'Generate Desc (AI)'}
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="Product Name (RU)"
                  value={editingProduct.name_ru || ''}
                  onChange={e => setEditingProduct({...editingProduct, name_ru: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 mb-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <textarea 
                  placeholder="Description (RU)"
                  value={editingProduct.description_ru || ''}
                  onChange={e => setEditingProduct({...editingProduct, description_ru: e.target.value})}
                  rows={3}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300">Ukrainian Content</h4>
                  <button 
                    onClick={() => handleGenerateDescription(Language.UK)}
                    disabled={isGenerating}
                    className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-md flex items-center hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                  >
                    ✨ {isGenerating ? t.loading : 'Generate Desc (AI)'}
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="Product Name (UK)"
                  value={editingProduct.name_uk || ''}
                  onChange={e => setEditingProduct({...editingProduct, name_uk: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 mb-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <textarea 
                  placeholder="Description (UK)"
                  value={editingProduct.description_uk || ''}
                  onChange={e => setEditingProduct({...editingProduct, description_uk: e.target.value})}
                  rows={3}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end space-x-3 sticky bottom-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
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

export default ProductList;