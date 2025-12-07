import React, { useState, useEffect } from 'react';
import { Language, ViewState, Product, Order, AppSettings, Supplier, Customer, OrderStatus, OrderSource, PaymentStatus, PaymentMethod, Category, WarehouseReceipt } from './types';
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_SUPPLIERS, MOCK_CUSTOMERS, MOCK_CATEGORIES, MOCK_RECEIPTS } from './constants';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import OrderList from './components/OrderList';
import OrderDetail from './components/OrderDetail';
import Settings from './components/Settings';
import Warehouse from './components/Warehouse';
import Directories from './components/Directories';
import SupplierSettlements from './components/SupplierSettlements';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [lang, setLang] = useState<Language>(Language.UK); 
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [warehouseReceipts, setWarehouseReceipts] = useState<WarehouseReceipt[]>(MOCK_RECEIPTS);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [appSettings, setAppSettings] = useState<AppSettings>({
      novaPoshtaApiKey: '',
      rozetkaApiKey: '',
      promApiKey: '',
      bankCommission: 1.5 // Default 1.5%
  });

  // Apply dark mode class to html/body wrapper
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Dashboard Metrics Calculation
  const calculateMetrics = () => {
      // 1. Sales & Orders
      const totalSales = orders.reduce((acc, curr) => acc + curr.total, 0);
      const totalOrders = orders.length;
      const averageCheck = totalOrders > 0 ? totalSales / totalOrders : 0;
      const pendingOrders = orders.filter(o => o.status === OrderStatus.NEW || o.status === OrderStatus.ACCEPTED).length;

      // 2. Net Profit Calculation (Revenue - COGS - ShippingExp - BankFee)
      // Note: This is simplified. COGS should technically track historical cost, here using current product.purchasePrice
      let netProfit = 0;
      orders.forEach(order => {
          const revenue = order.total;
          let cogs = 0;
          order.items.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              if (product) cogs += product.purchasePrice * item.quantity;
          });
          const shipping = order.shippingCost || 0;
          const bankFee = revenue * (appSettings.bankCommission / 100);
          
          if (order.status !== OrderStatus.CANCELED && order.status !== OrderStatus.RETURN) {
              netProfit += (revenue - cogs - shipping - bankFee);
          }
      });

      // 3. Accounts Payable
      const accountsPayable = warehouseReceipts
          .filter(r => !r.isPaid)
          .reduce((acc, curr) => acc + curr.totalAmount, 0);

      return { totalSales, totalOrders, averageCheck, pendingOrders, netProfit, accountsPayable };
  };

  const metrics = calculateMetrics();

  const handleNavClick = (view: ViewState) => {
    setCurrentView(view);
    setSelectedOrderId(null); 
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const handleDeleteOrder = (id: number) => {
    setOrders(orders.filter(o => o.id !== id));
    if (selectedOrderId === id) setSelectedOrderId(null);
  };

  const handleCreateOrder = () => {
    const newId = Date.now();
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const newOrder: Order = {
        id: newId,
        orderNumber: `ORD-${dateStr}-${randSuffix}`,
        source: OrderSource.MANUAL,
        customerName: '',
        status: OrderStatus.NEW,
        paymentStatus: PaymentStatus.NOT_PAID,
        paymentMethod: PaymentMethod.ON_RECEIPT,
        date: today.toISOString(),
        total: 0,
        items: []
    };
    
    setOrders([newOrder, ...orders]);
    setCurrentView('orders');
    setSelectedOrderId(newId);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (id: number) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleCreateReceipt = (receipt: WarehouseReceipt) => {
      setWarehouseReceipts([receipt, ...warehouseReceipts]);
  };

  const handleDeleteReceipt = (id: number) => {
      setWarehouseReceipts(warehouseReceipts.filter(r => r.id !== id));
  };

  const handleMarkReceiptPaid = (id: number) => {
      setWarehouseReceipts(warehouseReceipts.map(r => 
          r.id === id ? { ...r, isPaid: true } : r
      ));
  };

  // Directory Handlers
  const handleUpdateSupplier = (updated: Supplier) => {
      setSuppliers(suppliers.map(s => s.id === updated.id ? updated : s));
  };
  const handleAddSupplier = (newSupplier: Supplier) => {
      setSuppliers([...suppliers, newSupplier]);
  };
  const handleDeleteSupplier = (id: number) => {
      setSuppliers(suppliers.filter(s => s.id !== id));
  };

  const handleUpdateCustomer = (updated: Customer) => {
      setCustomers(customers.map(c => c.id === updated.id ? updated : c));
  };
  const handleAddCustomer = (newCustomer: Customer) => {
      setCustomers([...customers, newCustomer]);
  };
  const handleDeleteCustomer = (id: number) => {
      setCustomers(customers.filter(c => c.id !== id));
  };

  // Category Handlers
  const handleUpdateCategory = (updated: Category) => {
      setCategories(categories.map(c => c.id === updated.id ? updated : c));
  };
  const handleAddCategory = (newCategory: Category) => {
      setCategories([...categories, newCategory]);
  };
  const handleDeleteCategory = (id: number) => {
      setCategories(categories.filter(c => c.id !== id));
  };

  const NavItem = ({ view, icon, label }: { view: ViewState; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => handleNavClick(view)}
      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${
        currentView === view && !selectedOrderId
          ? 'bg-blue-600 text-white shadow-blue-200 dark:shadow-none shadow-md' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className={`flex h-screen font-sans text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 transition-colors duration-200`}>
      {/* Sidebar - Sticky */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 hidden md:flex flex-col h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500 dark:from-blue-400 dark:to-blue-300">
              my-dog.com.ua
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-10 font-medium tracking-wide">CRM & WMS v2.9</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem view="dashboard" icon="📊" label={lang === Language.RU ? 'Дашборд' : 'Дашборд'} />
          <NavItem view="products" icon="📦" label={lang === Language.RU ? 'Товары' : 'Товари'} />
          <NavItem view="warehouse" icon="🏭" label={lang === Language.RU ? 'Склад' : 'Склад'} />
          <NavItem view="orders" icon="🛒" label={lang === Language.RU ? 'Заказы' : 'Замовлення'} />
          <NavItem view="directories" icon="📚" label={lang === Language.RU ? 'Справочники' : 'Довідники'} />
          <NavItem view="settlements" icon="💸" label={lang === Language.RU ? 'Расчеты' : 'Розрахунки'} />
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
             <NavItem view="settings" icon="⚙️" label={lang === Language.RU ? 'Настройки' : 'Налаштування'} />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4">
             <button 
               onClick={() => setLang(Language.UK)}
               className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${lang === Language.UK ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
             >
               UA
             </button>
             <button 
               onClick={() => setLang(Language.RU)}
               className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${lang === Language.RU ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
             >
               RU
             </button>
          </div>
          
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                  AD
                </div>
                <div>
                  <p className="text-sm font-semibold">Admin</p>
                </div>
             </div>
             <button 
               onClick={() => setIsDarkMode(!isDarkMode)}
               className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
               title="Toggle Theme"
             >
               {isDarkMode ? '🌙' : '☀️'}
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto h-full relative dark:bg-slate-900">
        {/* Header Mobile */}
        <header className="md:hidden bg-white dark:bg-slate-800 h-16 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 sticky top-0 z-20">
            <span className="font-bold text-blue-600 dark:text-blue-400">My-Dog CRM</span>
            <button className="text-slate-500 dark:text-slate-400">☰</button>
        </header>

        <div className="max-w-7xl mx-auto p-4 md:p-8 pb-20">
          {currentView === 'dashboard' && <Dashboard metrics={metrics} orders={orders} warehouseReceipts={warehouseReceipts} lang={lang} />}
          
          {currentView === 'products' && (
            <ProductList 
              products={products} 
              lang={lang}
              onUpdateProduct={handleUpdateProduct}
              onAddProduct={(p) => setProducts([p, ...products])}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {currentView === 'warehouse' && (
            <Warehouse 
              products={products}
              lang={lang}
              onUpdateProduct={handleUpdateProduct}
              suppliers={suppliers}
              onCreateReceipt={handleCreateReceipt}
            />
          )}

          {currentView === 'orders' && !selectedOrderId && (
            <OrderList 
              orders={orders} 
              lang={lang} 
              onSelectOrder={(id) => setSelectedOrderId(id)}
              onCreateOrder={handleCreateOrder}
              onDeleteOrder={handleDeleteOrder}
            />
          )}

          {currentView === 'orders' && selectedOrderId && (
            <OrderDetail 
              order={orders.find(o => o.id === selectedOrderId)!} 
              products={products}
              lang={lang}
              onBack={() => setSelectedOrderId(null)}
              onUpdate={handleUpdateOrder}
              bankCommissionRate={appSettings.bankCommission}
            />
          )}

          {currentView === 'directories' && (
              <Directories 
                  lang={lang}
                  suppliers={suppliers}
                  customers={customers}
                  categories={categories}
                  onUpdateSupplier={handleUpdateSupplier}
                  onAddSupplier={handleAddSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onUpdateCustomer={handleUpdateCustomer}
                  onAddCustomer={handleAddCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                  onUpdateCategory={handleUpdateCategory}
                  onAddCategory={handleAddCategory}
                  onDeleteCategory={handleDeleteCategory}
              />
          )}

          {currentView === 'settlements' && (
              <SupplierSettlements
                  lang={lang}
                  receipts={warehouseReceipts}
                  onMarkPaid={handleMarkReceiptPaid}
                  onDeleteReceipt={handleDeleteReceipt}
              />
          )}

          {currentView === 'settings' && (
              <Settings 
                lang={lang} 
                currentSettings={appSettings}
                onUpdateSettings={setAppSettings}
              />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;