export type Lang = 'en' | 'am' | 'om';

export type I18n = Record<Lang, string>;

export type Station = 'kitchen' | 'bar';

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner' | 'all-day';

export type StaffRole = 'super_admin' | 'admin' | 'kitchen' | 'bar' | 'bartender' | 'waiter' | 'cashier' | 'owner';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

export type PaymentStatus = 'pending' | 'verified' | 'rejected';

export type TicketStatus = 'queue' | 'queued' | 'preparing' | 'ready' | 'completed' | 'served';

export type ServiceMode = 'together' | 'separate';

export type FulfillmentType = 'dine-in' | 'takeaway';

export interface Category {
  id: string;
  slug: string;
  name_i18n: I18n;
  sort_order?: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name_i18n: I18n;
  description_i18n: I18n;
  price: number; // in ETB
  image_path: string;
  dietary_tags: string[]; // e.g. ['vegan', 'spicy', 'gluten-free']
  station: Station;
  avg_prep_minutes: number;
  is_available: boolean;
  calories?: number;
  ingredients?: string[];
  rating?: number;
  reviews_count?: number;
  likes?: number;
  is_popular?: boolean;
  is_new?: boolean;
  tag?: string;
}

export interface Table {
  id: string;
  label: string;
  is_active?: boolean;
}

export interface PaymentAccount {
  id: string;
  account_type: 'bank' | 'telebirr';
  label: string;
  account_name: string;
  account_number?: string;
  phone_number?: string;
  is_active: boolean;
}

export interface CartLineItem {
  item: MenuItem;
  quantity: number;
}

export interface OrderItem {
  item_id: string;
  name_en: string;
  quantity: number;
  unit_price: number;
  station: Station;
}

export interface Order {
  id: string;
  short_code: string; // e.g. "4921"
  table_id?: string;
  table_label?: string;
  phone?: string;
  fulfillment_type: FulfillmentType;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  service_charge: number;
  total: number;
  service_mode: ServiceMode;
  status: OrderStatus;
  payment_status: PaymentStatus;
  pickup_code: string; // 4 digits e.g. "8241"
  eta_minutes: number;
  created_at: string;
  payment_id?: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  account_id: string;
  account_label: string;
  method: 'transfer' | 'cash';
  proof_image?: string;
  transaction_id?: string;
  status: PaymentStatus;
  created_at: string;
}

export interface TicketItem {
  name: string;
  quantity: number;
  notes?: string;
}

export interface Ticket {
  id: string;
  order_id: string;
  station: Station;
  table_label: string;
  items: TicketItem[];
  status: TicketStatus;
  notes?: string;
  pickup_code?: string;
  created_at: string;
  elapsed_minutes?: number;
}

export interface CallWaiterAlert {
  id: string;
  table_id: string;
  table_label: string;
  created_at: string;
  status: 'pending' | 'acknowledged';
  notes?: string;
}
