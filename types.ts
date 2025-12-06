
export enum Language {
  RU = 'ru',
  UK = 'uk'
}

export enum OrderSource {
  MY_DOG = 'my_dog',
  ROZETKA = 'rozetka',
  PROM = 'prom',
  MANUAL = 'manual'
}

export enum OrderStatus {
  NEW = 'new',           // Новый заказ
  ACCEPTED = 'accepted', // Принят
  ORDERED = 'ordered',   // Заказан (у поставщика)
  SHIPPED = 'shipped',   // Отправлен
  DELIVERED = 'delivered', // Доставлен (на отделение)
  RECEIVED = 'received',   // Получен (клиентом)
  CANCELED = 'canceled',   // Отменен
  RETURN = 'return'        // Возврат
}

export enum PaymentStatus {
  PAID = 'paid',
  NOT_PAID = 'not_paid'
}

export enum PaymentMethod {
  CARD = 'card',
  ON_RECEIPT = 'on_receipt' // При получении
}

export type DeliveryService = 'nova_poshta' | 'rozetka_delivery' | 'ukrposhta' | 'self_pickup';

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
}

export interface Product {
  id: number;
  sku: string;
  barcode?: string;
  name_ru: string;
  name_uk: string;
  description_ru: string;
  description_uk: string;
  price: number; // Sales Price
  purchasePrice: number; // Cost Price
  promotional_price?: number;
  stock: number;
  category: string;
  imageUrl: string;
}

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  discount?: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  source: OrderSource;
  sourceOrderNumber?: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress?: string;
  deliveryCity?: string;
  deliveryService?: DeliveryService;
  deliveryWarehouse?: string;
  shippingCost?: number; // Seller's expense
  ttn?: string;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  date: string;
  items: OrderItem[];
}

export interface DashboardMetrics {
  totalSales: number;
  totalOrders: number;
  averageCheck: number;
  pendingOrders: number;
}

export interface AppSettings {
  novaPoshtaApiKey: string;
  rozetkaApiKey: string;
  promApiKey: string;
  bankCommission: number; // Percentage
}

export type ViewState = 'dashboard' | 'products' | 'warehouse' | 'orders' | 'analytics' | 'settings';
