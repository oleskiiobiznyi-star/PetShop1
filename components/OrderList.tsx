
import React from 'react';
import { Order, Language, OrderSource, OrderStatus } from '../types';
import { UI_TEXT } from '../constants';

interface OrderListProps {
  orders: Order[];
  lang: Language;
  onSelectOrder: (orderId: number) => void;
}

const OrderList: React.FC<OrderListProps> = ({ orders, lang, onSelectOrder }) => {
  const t = UI_TEXT[lang];

  const getSourceBadge = (source: OrderSource) => {
    switch(source) {
      case OrderSource.ROZETKA:
        return <span className="bg-[#00a046]/10 text-[#00a046] px-2 py-1 rounded text-xs font-bold border border-[#00a046]/20">Rozetka</span>;
      case OrderSource.PROM:
        return <span className="bg-[#7936e7]/10 text-[#7936e7] px-2 py-1 rounded text-xs font-bold border border-[#7936e7]/20">Prom.ua</span>;
      case OrderSource.MY_DOG:
        return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200">My-Dog</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">Manual</span>;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.NEW: return 'bg-blue-50 text-blue-700';
      case OrderStatus.SHIPPED: return 'bg-purple-50 text-purple-700';
      case OrderStatus.DELIVERED: return 'bg-green-50 text-green-700';
      case OrderStatus.CANCELED: return 'bg-red-50 text-red-700';
      default: return 'bg-slate-50 text-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">{t.orders}</h2>
        <div className="flex gap-2">
            <input 
                type="text" 
                placeholder={t.search} 
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
            />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">{t.source} / {t.sourceId}</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr 
                  key={order.id} 
                  onClick={() => onSelectOrder(order.id)}
                  className="hover:bg-blue-50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-mono font-medium text-slate-900 group-hover:text-blue-700">{order.orderNumber}</td>
                  <td className="px-6 py-4">{new Date(order.date).toLocaleDateString(lang === Language.UK ? 'uk-UA' : 'ru-RU')}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-start gap-1">
                      {getSourceBadge(order.source)}
                      {order.sourceOrderNumber && (
                        <span className="text-xs text-slate-400 font-mono">{order.sourceOrderNumber}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{order.customerName}</td>
                  <td className="px-6 py-4">₴ {order.total.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderList;
