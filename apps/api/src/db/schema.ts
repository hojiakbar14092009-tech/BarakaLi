import type { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type CreatedAt = ColumnType<Date, Date | string | undefined, never>;

export interface CategoriesTable {
  id: Generated<string>;
  slug: string;
  name_uz: string;
  name_ru: string;
  position: Generated<number>;
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
  is_verified: Generated<boolean>;
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
  commission: number;
  worker_amount: number;
  fulfillment: Generated<'pickup' | 'delivery'>;
  delivery_address: string | null;
  start_time: Date | null;
  end_time: Date | null;
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
}
