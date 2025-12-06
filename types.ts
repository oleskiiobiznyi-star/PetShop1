
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
  NEW = 'new',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled'
}

export enum PaymentStatus {
  PAID = 'paid',
  NOT_PAID = 'not_paid',
  PARTIALLY_PAID = 'partially_paid'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  IBAN = 'iban',
  COD = 'cod' // Cash on Delivery
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
