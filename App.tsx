
import React, { useState, useEffect } from 'react';
import { Language, ViewState, Product, Order, AppSettings, Supplier, OrderStatus, OrderSource, PaymentStatus, PaymentMethod } from './types';
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_SUPPLIERS } from './constants';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import OrderList from './components/OrderList';
import OrderDetail from './components/OrderDetail';
import Settings from './components/Settings';
import Warehouse from './components/Warehouse';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [lang, setLang] = useState<Language>(Language.UK); 
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
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

  const metrics = {
    totalSales: orders.reduce((acc, curr) => acc + curr.total, 0),
    totalOrders: orders.length,
    averageCheck: orders.reduce((acc, curr) => acc + curr.total, 0) / orders.length,
    pendingOrders: orders.filter(o => o.status === OrderStatus.NEW || o.status === OrderStatus.ACCEPTED).length
  };

  const handleNavClick = (view: ViewState) => {
    setCurrentView(view);
    setSelectedOrderId(null); 
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
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
          <p className="text-xs text-slate-400 mt-1 pl-10 font-medium tracking-wide">CRM & WMS v2.4</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem view="dashboard" icon="📊" label={lang === Language.RU ? 'Дашборд' : 'Дашборд'} />
          <NavItem view="products" icon="📦" label={lang === Language.RU ? 'Товары' : 'Товари'} />
          <NavItem view="warehouse" icon="🏭" label={lang === Language.RU ? 'Склад' : 'Склад'} />
          <NavItem view="orders" icon="🛒" label={lang === Language.RU ? 'Заказы' : 'Замовлення'} />
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
          {currentView === 'dashboard' && <Dashboard metrics={metrics} lang={lang} />}
          
          {currentView === 'products' && (
            <ProductList 
              products={products} 
              lang={lang}
              onUpdateProduct={handleUpdateProduct}
              onAddProduct={(p) => setProducts([p, ...products])}
            />
          )}

          {currentView === 'warehouse' && (
            <Warehouse 
              products={products}
              lang={lang}
              onUpdateProduct={handleUpdateProduct}
              suppliers={suppliers}
            />
          )}

          {currentView === 'orders' && !selectedOrderId && (
            <OrderList 
              orders={orders} 
              lang={lang} 
              onSelectOrder={(id) => setSelectedOrderId(id)}
              onCreateOrder={handleCreateOrder}
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
