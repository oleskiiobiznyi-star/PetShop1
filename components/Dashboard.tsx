import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { DashboardMetrics, Language } from '../types';
import { UI_TEXT } from '../constants';

interface DashboardProps {
  metrics: DashboardMetrics;
  lang: Language;
}

const data = [
  { name: 'Mon', sales: 4000, orders: 24 },
  { name: 'Tue', sales: 3000, orders: 18 },
  { name: 'Wed', sales: 2000, orders: 12 },
  { name: 'Thu', sales: 2780, orders: 20 },
  { name: 'Fri', sales: 1890, orders: 15 },
  { name: 'Sat', sales: 6390, orders: 45 },
  { name: 'Sun', sales: 3490, orders: 30 },
];

const Dashboard: React.FC<DashboardProps> = ({ metrics, lang }) => {
  const t = UI_TEXT[lang];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">{t.totalSales}</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">₴ {metrics.totalSales.toLocaleString()}</p>
          <span className="text-xs text-green-500 font-medium flex items-center mt-2">
            ▲ 12% vs last week
          </span>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">{t.totalOrders}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{metrics.totalOrders}</p>
          <span className="text-xs text-green-500 font-medium flex items-center mt-2">
            ▲ 5 new today
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">AVG Check</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">₴ {metrics.averageCheck.toFixed(0)}</p>
          <span className="text-xs text-red-500 font-medium flex items-center mt-2">
            ▼ 2% vs last week
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Pending Orders</p>
          <p className="text-3xl font-bold text-orange-500 mt-2">{metrics.pendingOrders}</p>
          <span className="text-xs text-slate-400 font-medium flex items-center mt-2">
            Requires action
          </span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Revenue Analytics (Weekly)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Order Volume Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
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
