// ─── Auth & Roles ──────────────────────────────────────────────────────────────

export type Role = 'owner' | 'manager' | 'employee';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

// ─── Order Lifecycle ───────────────────────────────────────────────────────────

export type OrderStatus =
  | 'placed'
  | 'reviewed'
  | 'planning'
  | 'production'
  | 'shipping'
  | 'warehouse'
  | 'delivery'
  | 'follow_up';

export const ORDER_STATUSES: OrderStatus[] = [
  'placed',
  'reviewed',
  'planning',
  'production',
  'shipping',
  'warehouse',
  'delivery',
  'follow_up',
];

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string;
  note: string | null;
  created_at: string;
}

// ─── Orders ────────────────────────────────────────────────────────────────────

export interface Order {
  id: string;
  wc_order_id: number;
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  billing_address: Address;
  shipping_address: Address;
  line_items: LineItem[];
  total: number;
  currency: string;
  note: string | null;
  wc_created_at: string;
  wc_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
  sku: string | null;
  image_url: string | null;
}

export interface Address {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string | null;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string | null;
}

// ─── Products ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  wc_product_id: number;
  name: string;
  sku: string | null;
  price: number;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  image_url: string | null;
  categories: string[];
  wc_created_at: string;
  updated_at: string;
}

// ─── Production ────────────────────────────────────────────────────────────────

export type ProductionPhase =
  | 'queue'
  | 'cutting'
  | 'assembly'
  | 'finishing'
  | 'quality_check'
  | 'ready';

export const PRODUCTION_PHASES: ProductionPhase[] = [
  'queue',
  'cutting',
  'assembly',
  'finishing',
  'quality_check',
  'ready',
];

export interface ProductionCard {
  id: string;
  order_id: string;
  order_wc_id: number;
  customer_name: string;
  product_name: string;
  quantity: number;
  phase: ProductionPhase;
  assigned_to: string | null;
  note: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Warehouse ─────────────────────────────────────────────────────────────────

export interface WarehouseItem {
  id: string;
  product_id: string;
  wc_product_id: number;
  product_name: string;
  sku: string | null;
  quantity: number;
  location: string | null;
  updated_at: string;
}

export interface StockReceiving {
  id: string;
  product_id: string;
  quantity_received: number;
  received_by: string;
  note: string | null;
  received_at: string;
}

// ─── Customers ─────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  wc_customer_id: number | null;
  full_name: string;
  email: string;
  phone: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
}

// ─── WooCommerce Raw API Types ─────────────────────────────────────────────────

export interface WCOrder {
  id: number;
  status: string;
  currency: string;
  date_created: string;
  date_modified: string;
  total: string;
  customer_note: string;
  billing: WCAddress;
  shipping: WCAddress;
  line_items: WCLineItem[];
  customer_id: number;
}

export interface WCAddress {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

export interface WCLineItem {
  id: number;
  name: string;
  product_id: number;
  quantity: number;
  price: number;
  total: string;
  sku: string;
  image: { src: string } | null;
}

export interface WCProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  stock_quantity: number | null;
  stock_status: string;
  images: { src: string }[];
  categories: { id: number; name: string }[];
  date_created: string;
}

// ─── API Utilities ─────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  per_page: number;
}

export interface ApiResponse<T> {
  data: T;
  total: number;
  total_pages: number;
}
