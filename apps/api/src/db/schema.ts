import type { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type CreatedAt = ColumnType<Date, Date | string | undefined, never>;

export interface CategoriesTable {
  id: Generated<string>;
  slug: string;
  name_uz: string;
  name_ru: string;
  position: Generated<number>;
  is_active: Generated<boolean>;
}

export interface UsersTable {
  id: Generated<string>;
  phone: string;
  name: string | null;
  role: Generated<'customer' | 'worker' | 'admin'>;
  language: Generated<'uz' | 'ru'>;
  created_at: CreatedAt;
}

export interface WorkersTable {
  id: Generated<string>;
  user_id: string;
  category_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  rating: Generated<number>;
  reviews_count: Generated<number>;
  status: Generated<'pending' | 'approved' | 'rejected'>;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  reject_reason: string | null;
  telegram_username: string | null;
  created_at: CreatedAt;
}

export interface ProductsTable {
  id: Generated<string>;
  worker_id: string;
  category_id: string;
  title: string;
  description: Generated<string>;
  retail_price: number;
  wholesale_price: number | null;
  wholesale_min_qty: number | null;
  stock: Generated<number>;
  status: Generated<'draft' | 'published' | 'hidden'>;
  created_at: CreatedAt;
  updated_at: Timestamp;
}

export interface ProductImagesTable {
  id: Generated<string>;
  product_id: string;
  url: string;
  position: Generated<number>;
}

export interface ProductModelsTable {
  id: Generated<string>;
  product_id: string;
  file_url: string;
  file_size: number;
  poster_url: string | null;
  created_at: CreatedAt;
}

export interface OrdersTable {
  id: Generated<string>;
  type: 'service' | 'product';
  customer_id: string;
  worker_id: string;
  status: Generated<string>;
  total: number;
  commission_amount: number;
  /** numeric(5,4): parsed to a JS number by the driver. */
  commission_rate: number;
  worker_amount: number;
  fulfillment: Generated<'pickup' | 'delivery'>;
  delivery_address: string | null;
  start_time: Date | null;
  end_time: Date | null;
  description: string | null;
  deadline: string | null;
  created_at: CreatedAt;
  updated_at: Timestamp;
}

export interface OrderItemsTable {
  id: Generated<string>;
  order_id: string;
  product_id: string | null;
  title_snapshot: string;
  unit_price: number;
  quantity: number;
  price_type: 'retail' | 'wholesale';
}

export interface PaymentsTable {
  id: Generated<string>;
  order_id: string;
  amount: number;
  status: Generated<'pending' | 'paid' | 'refunded' | 'failed'>;
  provider: string;
  provider_ref: string | null;
  idempotency_key: string;
  created_at: CreatedAt;
}

export interface EarningsTable {
  id: Generated<string>;
  order_id: string;
  worker_id: string;
  amount: number;
  commission: number;
  created_at: CreatedAt;
}

export interface SmsCodesTable {
  id: Generated<string>;
  phone: string;
  code_hash: string;
  expires_at: Timestamp;
  attempts: Generated<number>;
  consumed_at: Date | null;
  created_at: CreatedAt;
}

export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Timestamp;
  revoked_at: Date | null;
  created_at: CreatedAt;
}

export interface FilesTable {
  name: string;
  content_type: string;
  size: number;
  data: Buffer;
  created_at: CreatedAt;
}

export interface ReviewsTable {
  id: Generated<string>;
  order_id: string;
  customer_id: string;
  worker_id: string;
  rating: number;
  comment: string | null;
  status: Generated<'visible' | 'hidden'>;
  created_at: CreatedAt;
}

export interface ComplaintsTable {
  id: Generated<string>;
  order_id: string;
  user_id: string;
  reason: string;
  status: Generated<'open' | 'resolved' | 'dismissed'>;
  created_at: CreatedAt;
}

export interface AvailabilityTable {
  id: Generated<string>;
  worker_id: string;
  start_time: Date | string;
  end_time: Date | string;
  created_at: CreatedAt;
}

export interface OrderImagesTable {
  id: Generated<string>;
  order_id: string;
  url: string;
  position: Generated<number>;
}

export interface MaterialsTable {
  id: Generated<string>;
  name: string;
  description: Generated<string>;
  price: number;
  discount_percent: Generated<number>;
  stock: Generated<number>;
  is_active: Generated<boolean>;
  created_at: CreatedAt;
}

export interface MaterialOrdersTable {
  id: Generated<string>;
  worker_id: string;
  status: Generated<'awaiting_payment' | 'paid' | 'delivered' | 'cancelled'>;
  total: number;
  created_at: CreatedAt;
  updated_at: Timestamp;
}

export interface MaterialOrderItemsTable {
  id: Generated<string>;
  material_order_id: string;
  material_id: string | null;
  name_snapshot: string;
  unit_price: number;
  quantity: number;
}

export interface MaterialPaymentsTable {
  id: Generated<string>;
  material_order_id: string;
  amount: number;
  status: Generated<'pending' | 'paid' | 'refunded' | 'failed'>;
  provider: string;
  provider_ref: string | null;
  idempotency_key: string;
  created_at: CreatedAt;
}

export interface SavingsGoalsTable {
  id: Generated<string>;
  worker_id: string;
  target_amount: number;
  created_at: CreatedAt;
  updated_at: Timestamp;
}

export interface NotificationsTable {
  id: Generated<string>;
  user_id: string;
  kind: 'order_new' | 'worker_application_received' | 'worker_approved' | 'worker_rejected';
  detail: string | null;
  order_id: string | null;
  read_at: Date | null;
  created_at: CreatedAt;
}

export interface Database {
  categories: CategoriesTable;
  users: UsersTable;
  workers: WorkersTable;
  products: ProductsTable;
  product_images: ProductImagesTable;
  product_models: ProductModelsTable;
  orders: OrdersTable;
  order_items: OrderItemsTable;
  payments: PaymentsTable;
  earnings: EarningsTable;
  sms_codes: SmsCodesTable;
  refresh_tokens: RefreshTokensTable;
  reviews: ReviewsTable;
  complaints: ComplaintsTable;
  files: FilesTable;
  availability: AvailabilityTable;
  order_images: OrderImagesTable;
  materials: MaterialsTable;
  material_orders: MaterialOrdersTable;
  material_order_items: MaterialOrderItemsTable;
  material_payments: MaterialPaymentsTable;
  savings_goals: SavingsGoalsTable;
  notifications: NotificationsTable;
}
