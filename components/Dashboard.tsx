


import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { DashboardMetrics, Language, Order, OrderStatus, WarehouseReceipt } from '../types';
import { UI_TEXT } from '../constants';

interface DashboardProps {
  orders: Order[];
  warehouseReceipts: WarehouseReceipt[];
  metrics: DashboardMetrics;
  lang: Language;
}

type Period = 'today' | 'tomorrow' | 'week' | 'last_week' | 'month' | 'last_month' | 'all';

const Dashboard: React.FC<DashboardProps> = ({ orders, warehouseReceipts, metrics: globalMetrics, lang }) => {
  const t = UI_TEXT[lang];
  const [period, setPeriod] = useState<Period>('month');

  // Filter Data based on Period
  const { filteredOrders, filteredReceipts } = useMemo(() => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      const tomorrowStart = new Date(startOfDay); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(endOfDay); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

      const startOfWeek = new Date(startOfDay);
      const day = startOfWeek.getDay() || 7; // Get current day number, converting Sun(0) to 7
      if (day !== 1) startOfWeek.setHours(-24 * (day - 1));
      
      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      const endOfLastWeek = new Date(startOfWeek);
      endOfLastWeek.setDate(endOfLastWeek.getDate() - 1); // Sunday

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const checkDate = (dateStr: string, type: 'order' | 'receipt') => {
          if (period === 'all') return true;
          const d = new Date(dateStr);
          
          switch(period) {
              case 'today': return d >= startOfDay && d <= endOfDay;
              case 'tomorrow': return d >= tomorrowStart && d <= tomorrowEnd;
              case 'week': return d >= startOfWeek;
              case 'last_week': return d >= startOfLastWeek && d <= endOfLastWeek;
              case 'month': return d >= startOfMonth;
              case 'last_month': return d >= startOfLastMonth && d <= endOfLastMonth;
              default: return true;
          }
      };

      return {
          filteredOrders: orders.filter(o => checkDate(o.date, 'order')),
          filteredReceipts: warehouseReceipts.filter(r => {
             // For receipts, we care about Payment Due Date for the "Accounts Payable" metric in this period
             if (period === 'all') return true;
             const d = new Date(r.paymentDueDate);
             switch(period) {
                case 'today': return d >= startOfDay && d <= endOfDay;
                case 'tomorrow': return d >= tomorrowStart && d <= tomorrowEnd;
                case 'week': return d >= startOfWeek;
                case 'last_week': return d >= startOfLastWeek && d <= endOfLastWeek;
                case 'month': return d >= startOfMonth;
                case 'last_month': return d >= startOfLastMonth && d <= endOfLastMonth;
                default: return true;
             }
          })
      };
  }, [orders, warehouseReceipts, period]);

  // Recalculate Metrics for the selected period
  const localMetrics = useMemo(() => {
      const totalSales = filteredOrders.reduce((acc, o) => acc + o.total, 0);
      const totalOrders = filteredOrders.length;
      
      // Net Profit (Simplified logic for demo)
      let netProfit = 0;
      filteredOrders.forEach(order => {
          if (order.status !== OrderStatus.CANCELED && order.status !== OrderStatus.RETURN) {
              // Assuming ~30% simplified margin if detailed cost calc isn't available on order object directly here
              // In real app, we would sum up (item.price - item.cost)
              const estimatedCost = order.total * 0.7; 
              netProfit += (order.total - estimatedCost - (order.shippingCost || 0));
          }
      });

      // Accounts Payable due in this period
      const accountsPayable = filteredReceipts
          .filter(r => !r.isPaid)
          .reduce((acc, r) => acc + r.totalAmount, 0);

      return { totalSales, totalOrders, netProfit, accountsPayable };
  }, [filteredOrders, filteredReceipts]);

  // Chart Data Preparation (Mock for demo, normally would aggregate by date)
  const data = [
    { name: 'Mon', sales: 4000, orders: 24 },
    { name: 'Tue', sales: 3000, orders: 18 },
    { name: 'Wed', sales: 2000, orders: 12 },
    { name: 'Thu', sales: 2780, orders: 20 },
    { name: 'Fri', sales: 1890, orders: 15 },
    { name: 'Sat', sales: 6390, orders: 45 },
    { name: 'Sun', sales: 3490, orders: 30 },
  ];

  const filterButtons = [
      { id: 'today', label: t.today },
      { id: 'tomorrow', label: t.tomorrow },
      { id: 'week', label: t.thisWeek },
      { id: 'last_week', label: t.lastWeek },
      { id: 'month', label: t.thisMonth },
      { id: 'last_month', label: t.lastMonth },
      { id: 'all', label: t.allTime }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.dashboard}</h2>
         <div className="flex flex-wrap bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            {filterButtons.map((p) => (
               <button
                 key={p.id}
                 onClick={() => setPeriod(p.id as Period)}
                 className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    period === p.id 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                 }`}
               >
                 {p.label}
               </button>
            ))}
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{t.totalSales}</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">₴ {localMetrics.totalSales.toLocaleString()}</p>
          <span className="text-xs text-green-500 font-medium flex items-center mt-2">
            Revenue ({period === 'all' ? 'All Time' : 'Selected Period'})
          </span>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{t.netProfit}</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">₴ {localMetrics.netProfit.toLocaleString()}</p>
          <span className="text-xs text-slate-400 font-medium flex items-center mt-2">
            Est. Profit
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{t.accountsPayable}</p>
          <p className="text-3xl font-bold text-red-500 mt-2">₴ {localMetrics.accountsPayable.toLocaleString()}</p>
          <span className="text-xs text-slate-400 font-medium flex items-center mt-2">
            Due {period === 'all' ? 'Total' : 'in Period'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{t.totalOrders}</p>
          <p className="text-3xl font-bold text-orange-500 mt-2">{localMetrics.totalOrders}</p>
          <span className="text-xs text-slate-400 font-medium flex items-center mt-2">
             Count
          </span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Revenue Analytics</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Order Volume Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
