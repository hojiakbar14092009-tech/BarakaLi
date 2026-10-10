import type {
  ComplaintStatus,
  FulfillmentType,
  MaterialOrderStatus,
  OrderType,
  PaymentStatus,
  PriceType,
  ProductStatus,
  ReviewStatus,
  UserRole,
  WorkerStatus,
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
  /** Public name of the worker profile this account owns (what customers see on its products). */
  workerName: string | null;
  /** Application state of the worker profile this account owns; null for non-workers. */
  workerStatus: WorkerStatus | null;
  workerRejectReason: string | null;
  /** Own worker profile's Telegram handle (no leading '@'), null if not set or not a worker. */
  workerTelegramUsername: string | null;
}

export interface NotificationDto {
  id: string;
  kind: NotificationKind;
  /** Extra text for the notification, e.g. the reason an application was rejected. */
  detail: string | null;
  orderId: string | null;
  readAt: string | null;
  createdAt: string;
}

export type NotificationKind =
  | 'order_new'
  | 'worker_application_received'
  | 'worker_approved'
  | 'worker_rejected'
  | 'worker_suspended';

export interface NotificationsDto {
  unread: number;
  items: NotificationDto[];
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

export interface ReviewDto {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
}

export interface ComplaintDto {
  id: string;
  orderId: string;
  reason: string;
  status: ComplaintStatus;
  createdAt: string;
}

export interface OrderDto {
  id: string;
  type: OrderType;
  status: OrderStatus;
  /** Which side of the order the requesting user is on. */
  viewerRole: 'customer' | 'worker';
  total: number;
  commission: number;
  /** Rate applied to this order (e.g. 0.02); older orders keep the rate they were placed at. */
  commissionRate: number;
  workerAmount: number;
  fulfillment: FulfillmentType;
  deliveryAddress: string | null;
  items: OrderItemDto[];
  /** phone/telegramUsername are null until the order is accepted, and telegramUsername is only
   *  ever set for the worker side (customers have no Telegram field on their profile). */
  counterpart: { name: string | null; phone: string | null; telegramUsername: string | null };
  paymentStatus: PaymentStatus | null;
  /** The customer's review, once written. */
  review: ReviewDto | null;
  /** The requesting user's own most recent complaint on this order. */
  complaint: ComplaintDto | null;
  /** Service orders only: booked slot, brief and reference photos. */
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  deadline: string | null;
  images: string[];
  createdAt: string;
}

export interface TimeRangeDto {
  startTime: string;
  endTime: string;
}

export interface AvailabilityWindowDto extends TimeRangeDto {
  id: string;
}

/** Free windows plus slots already taken inside them; carries no customer data. */
export interface AvailabilityDto {
  windows: AvailabilityWindowDto[];
  booked: TimeRangeDto[];
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

export interface MaterialDto {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercent: number;
  /** Price a worker pays: `price` after the discount. */
  unitPrice: number;
  stock: number;
  isActive: boolean;
}

export interface MaterialOrderItemDto {
  id: string;
  materialId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface MaterialOrderDto {
  id: string;
  status: MaterialOrderStatus;
  total: number;
  items: MaterialOrderItemDto[];
  createdAt: string;
}

export interface SavingsGoalDto {
  targetAmount: number;
  /** Earnings (after commission) received since the goal was set. */
  saved: number;
  createdAt: string;
}

export interface PublicReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface AdminAuditEntryDto {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  adminName: string | null;
  createdAt: string;
}

export interface AdminStatsDto {
  users: number;
  workers: number;
  approvedWorkers: number;
  pendingWorkers: number;
  rejectedWorkers: number;
  ordersByStatus: Record<string, number>;
  /** Orders created since midnight in Asia/Tashkent. */
  ordersToday: number;
  turnover: number;
  commission: number;
  openComplaints: number;
  hiddenReviews: number;
}

export interface AdminWorkerDto {
  id: string;
  userId: string;
  displayName: string;
  phone: string;
  /** Only administrators see the handle before an order is accepted. */
  telegramUsername: string | null;
  bio: string | null;
  categorySlug: string;
  status: WorkerStatus;
  /** Reason given on rejection or suspension. */
  rejectReason: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  productsCount: number;
  rating: number;
  reviewsCount: number;
  createdAt: string;
}

export interface AdminOrderDto {
  id: string;
  type: OrderType;
  status: OrderStatus;
  total: number;
  commission: number;
  customerName: string | null;
  workerName: string;
  paymentStatus: PaymentStatus | null;
  createdAt: string;
}

export interface AdminReviewDto {
  id: string;
  orderId: string;
  workerName: string;
  authorName: string | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
}

export interface AdminComplaintDto {
  id: string;
  orderId: string;
  authorName: string | null;
  authorRole: 'customer' | 'worker';
  reason: string;
  status: ComplaintStatus;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus | null;
  createdAt: string;
}

export interface AdminMaterialOrderDto extends MaterialOrderDto {
  workerName: string;
}
