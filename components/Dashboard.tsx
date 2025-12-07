import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { DashboardMetrics, Language, Order, OrderStatus, WarehouseReceipt } from '../types';
import { UI_TEXT, CITY_COORDINATES } from '../constants';

// Declare Leaflet global
declare const L: any;

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
  const mapRef = useRef<any>(null); // Leaflet Map Instance
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Helper: Get Date Ranges for Current and Previous Comparison Periods
  const getDateRanges = (p: Period) => {
      const now = new Date();
      // Reset hours to start of day
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      let start = new Date(todayStart);
      let end = new Date(todayEnd);
      let prevStart = new Date(todayStart);
      let prevEnd = new Date(todayEnd);
      let groupBy: 'hour' | 'day' = 'day';

      switch (p) {
          case 'today':
              // Current: Today 00:00 - 23:59
              // Previous: Yesterday 00:00 - 23:59
              prevStart.setDate(prevStart.getDate() - 1);
              prevEnd.setDate(prevEnd.getDate() - 1);
              groupBy = 'hour';
              break;
          case 'tomorrow':
              start.setDate(start.getDate() + 1);
              end.setDate(end.getDate() + 1);
              groupBy = 'hour';
              break;
          case 'week':
              // Current: Start of this week (Mon) to End of week (Sun)
              const day = start.getDay() || 7;
              if (day !== 1) start.setHours(-24 * (day - 1));
              end = new Date(start); 
              end.setDate(end.getDate() + 6);
              end.setHours(23, 59, 59);

              // Previous: Last Week
              prevStart = new Date(start);
              prevStart.setDate(prevStart.getDate() - 7);
              prevEnd = new Date(end);
              prevEnd.setDate(prevEnd.getDate() - 7);
              break;
          case 'last_week':
              const d = start.getDay() || 7;
              if (d !== 1) start.setHours(-24 * (d - 1));
              start.setDate(start.getDate() - 7);
              end = new Date(start);
              end.setDate(end.getDate() + 6);
              end.setHours(23, 59, 59);

              prevStart = new Date(start);
              prevStart.setDate(prevStart.getDate() - 7);
              prevEnd = new Date(end);
              prevEnd.setDate(prevEnd.getDate() - 7);
              break;
          case 'month':
              start.setDate(1); 
              end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
              
              prevStart = new Date(start);
              prevStart.setMonth(prevStart.getMonth() - 1);
              prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0, 23, 59, 59);
              break;
          case 'last_month':
              start.setMonth(start.getMonth() - 1);
              start.setDate(1);
              end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

              prevStart = new Date(start);
              prevStart.setMonth(prevStart.getMonth() - 1);
              prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0, 23, 59, 59);
              break;
          case 'all':
              start = new Date(2023, 0, 1);
              prevStart = new Date(2020, 0, 1); 
              break;
      }
      return { start, end, prevStart, prevEnd, groupBy };
  };

  const { start, end, prevStart, prevEnd, groupBy } = useMemo(() => getDateRanges(period), [period]);

  // Filter Data based on Range
  const { currentOrders, previousOrders, filteredReceipts } = useMemo(() => {
      const checkDate = (dateStr: string, s: Date, e: Date) => {
          const d = new Date(dateStr);
          return d >= s && d <= e;
      };

      return {
          currentOrders: orders.filter(o => checkDate(o.date, start, end)),
          previousOrders: orders.filter(o => checkDate(o.date, prevStart, prevEnd)),
          filteredReceipts: warehouseReceipts.filter(r => {
             if (period === 'all') return true;
             return checkDate(r.paymentDueDate, start, end);
          })
      };
  }, [orders, warehouseReceipts, start, end, prevStart, prevEnd]);

  // Recalculate Metrics
  const localMetrics = useMemo(() => {
      const totalSales = currentOrders.reduce((acc, o) => acc + o.total, 0);
      const totalOrders = currentOrders.length;
      
      let netProfit = 0;
      currentOrders.forEach(order => {
          if (order.status !== OrderStatus.CANCELED && order.status !== OrderStatus.RETURN) {
              const estimatedCost = order.total * 0.7; 
              netProfit += (order.total - estimatedCost - (order.shippingCost || 0));
          }
      });

      const accountsPayable = filteredReceipts
          .filter(r => !r.isPaid)
          .reduce((acc, r) => acc + r.totalAmount, 0);

      return { totalSales, totalOrders, netProfit, accountsPayable };
  }, [currentOrders, filteredReceipts]);

  // Chart Data Generation
  const chartData = useMemo(() => {
      const dataPoints: any[] = [];
      const labels: string[] = [];
      
      let iterations = 0;
      if (groupBy === 'hour') {
          iterations = 24;
      } else {
          const diffTime = Math.abs(end.getTime() - start.getTime());
          iterations = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      }

      for (let i = 0; i < iterations; i++) {
          let label = '';
          let currentValRevenue = 0;
          let prevValRevenue = 0;
          let currentValOrders = 0;
          let prevValOrders = 0;

          let bucketStart = new Date(start);
          let bucketEnd = new Date(start);
          let prevBucketStart = new Date(prevStart);
          let prevBucketEnd = new Date(prevStart);

          if (groupBy === 'hour') {
              bucketStart.setHours(i, 0, 0, 0);
              bucketEnd.setHours(i, 59, 59, 999);
              prevBucketStart.setHours(i, 0, 0, 0);
              prevBucketEnd.setHours(i, 59, 59, 999);
              label = `${i}:00`;
          } else {
              bucketStart.setDate(bucketStart.getDate() + i);
              bucketEnd = new Date(bucketStart); bucketEnd.setHours(23, 59, 59, 999);
              prevBucketStart.setDate(prevBucketStart.getDate() + i);
              prevBucketEnd = new Date(prevBucketStart); prevBucketEnd.setHours(23, 59, 59, 999);
              label = bucketStart.toLocaleDateString(lang === Language.RU ? 'ru-RU' : 'uk-UA', { weekday: 'short', day: 'numeric' });
          }

          currentOrders.forEach(o => {
              const d = new Date(o.date);
              if (d >= bucketStart && d <= bucketEnd) {
                  currentValRevenue += o.total;
                  currentValOrders += 1;
              }
          });

          previousOrders.forEach(o => {
              const d = new Date(o.date);
              if (d >= prevBucketStart && d <= prevBucketEnd) {
                  prevValRevenue += o.total;
                  prevValOrders += 1;
              }
          });

          dataPoints.push({
              name: label,
              sales: currentValRevenue,
              prevSales: prevValRevenue,
              orders: currentValOrders,
              prevOrders: prevValOrders
          });
      }

      return dataPoints;
  }, [currentOrders, previousOrders, start, end, prevStart, prevEnd, groupBy, lang]);

  // Geo Map Data
  const geoData = useMemo(() => {
    const cityStats: Record<string, { count: number, total: number }> = {};
    currentOrders.forEach(o => {
      if (o.deliveryCity) {
        let city = o.deliveryCity.trim();
        city = city.charAt(0).toUpperCase() + city.slice(1);
        
        if (!cityStats[city]) cityStats[city] = { count: 0, total: 0 };
        cityStats[city].count += 1;
        cityStats[city].total += o.total;
      }
    });
    return cityStats;
  }, [currentOrders]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current || typeof L === 'undefined') return;

    if (!mapRef.current) {
        // Initialize Map
        mapRef.current = L.map(mapContainerRef.current).setView([48.3794, 31.1656], 6); // Center of Ukraine
        
        // Add Tile Layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(mapRef.current);
    }

    // Clear existing layers (except tiles)
    mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.CircleMarker) {
            mapRef.current.removeLayer(layer);
        }
    });

    // Add Circle Markers
    Object.entries(geoData).forEach(([city, stats]) => {
        // Explicit cast for stats to avoid 'unknown' type error
        const s = stats as { count: number, total: number };
        const coords = CITY_COORDINATES[city];
        if (coords) {
            // Calculate radius based on sales volume (logarithmic)
            const radius = Math.max(5, Math.min(30, Math.log(s.total) * 3));
            
            // Color based on count
            const color = s.count > 5 ? '#dc2626' : s.count > 2 ? '#f97316' : '#2563eb';

            L.circleMarker([coords.lat, coords.lng], {
                radius: radius,
                fillColor: color,
                color: '#fff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            })
            .bindPopup(`
                <div style="text-align: center;">
                    <strong>${city}</strong><br/>
                    Orders: ${s.count}<br/>
                    Revenue: ₴${s.total.toLocaleString()}
                </div>
            `)
            .addTo(mapRef.current);
        }
    });

  }, [geoData]); // Re-render map markers when data changes

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
    <div className="space-y-6 animate-fade-in pb-10">
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
            Est. Profit (Gross)
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
        {/* REVENUE COMPARISON CHART */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{t.revenueComparison}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Current Period vs Previous Period</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} minTickGap={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Legend iconType="circle" />
                <Bar name="Current" dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={10} />
                <Bar name="Previous" dataKey="prevSales" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ORDER VOLUME COMPARISON CHART */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{t.ordersComparison}</h3>
           <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Current Period vs Previous Period</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} minTickGap={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} allowDecimals={false} />
                <Tooltip 
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="plainline" />
                <Line type="monotone" name="Current" dataKey="orders" stroke="#f97316" strokeWidth={3} dot={{r: 3}} activeDot={{r: 6}} />
                <Line type="monotone" name="Previous" dataKey="prevOrders" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sales Map (Leaflet) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
         <div className="flex justify-between items-center mb-4">
             <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t.geoDistribution}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sales volume by city (Interactive Map)</p>
             </div>
         </div>
         <div className="w-full h-[500px] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
             <div ref={mapContainerRef} className="w-full h-full z-0"></div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;