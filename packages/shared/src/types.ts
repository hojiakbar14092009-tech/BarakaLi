import type {
  FulfillmentType,
  OrderType,
  PaymentStatus,
  PriceType,
  ProductStatus,
  UserRole,
} from './constants.js';
import type { OrderStatus } from './order-status.js';

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CategoryDto {
  id: string;
  slug: string;
  name: { uz: string; ru: string };
}

export interface UserDto {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  language: 'uz' | 'ru';
  workerId: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface RequestCodeResponse {
  expiresInSeconds: number;
  /** Present only when the deployment is configured to expose codes (no SMS gateway). */
  code?: string;
}

export interface WorkerSummaryDto {
  id: string;
  displayName: string;
  bio: string | null;
  categorySlug: string;
  avatarUrl: string | null;
  rating: number;
  reviewsCount: number;
  isVerified: boolean;
  minPrice: number | null;
  productsCount: number;
}

export interface ProductImageDto {
  id: string;
  url: string;
  position: number;
}

export interface ProductModelDto {
  fileUrl: string;
  fileSize: number;
  posterUrl: string | null;
}

export interface ProductDto {
  id: string;
  worker: { id: string; displayName: string; isVerified: boolean };
  categorySlug: string;
  categoryId: string;
  title: string;
  description: string;
  retailPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  stock: number;
  status: ProductStatus;
  images: ProductImageDto[];
  model: ProductModelDto | null;
  createdAt: string;
}

export interface OrderItemDto {
  id: string;
  productId: string | null;
  title: string;
  unitPrice: number;
  quantity: number;
  priceType: PriceType;
}

export interface OrderDto {
  id: string;
  type: OrderType;
  status: OrderStatus;
  total: number;
  commission: number;
  workerAmount: number;
  fulfillment: FulfillmentType;
  deliveryAddress: string | null;
  items: OrderItemDto[];
  counterpart: { name: string | null; phone: string | null };
  paymentStatus: PaymentStatus | null;
  createdAt: string;
}

export interface PaymentSessionDto {
  paymentId: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  redirectUrl: string;
}

export interface EarningsDto {
  monthTotal: number;
  allTimeTotal: number;
  history: { orderId: string; amount: number; commission: number; createdAt: string }[];
}
