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
  materialOrderId: string | null;
  readAt: string | null;
  createdAt: string;
}

export type NotificationKind =
  | 'order_new'
  | 'worker_application_received'
  | 'worker_approved'
  | 'worker_rejected'
  | 'worker_suspended'
  /** To every administrator: a worker paid for materials, the order is waiting to go out. */
  | 'material_order_paid'
  /** To the worker: the materials order is on its way with a courier. */
  | 'material_order_shipped';

export interface NotificationsDto {
  /** Unread new-order notifications (the badge on the orders entry). */
  unread: number;
  /** Unread materials notifications (the badge on the materials entry). */
  unreadMaterials: number;
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

export interface MaterialCourierDto {
  name: string;
  phone: string;
}

export interface MaterialOrderDto {
  id: string;
  status: MaterialOrderStatus;
  total: number;
  items: MaterialOrderItemDto[];
  /** Null on orders placed before materials were delivered. */
  deliveryAddress: string | null;
  /** Set once an administrator sends the order out. */
  courier: MaterialCourierDto | null;
  shippedAt: string | null;
  deliveredAt: string | null;
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

export interface AdminProductDto {
  id: string;
  title: string;
  description: string;
  workerId: string;
  workerName: string;
  categoryId: string;
  categorySlug: string;
  retailPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  stock: number;
  status: ProductStatus;
  imageUrl: string | null;
  /** How many order lines refer to it; such a product can be hidden but never deleted. */
  ordersCount: number;
  createdAt: string;
}

export interface RefundDto {
  id: string;
  amount: number;
  commissionReversed: number;
  reason: string | null;
  adminName: string | null;
  createdAt: string;
}

export interface AdminOrderPartyDto {
  id: string;
  name: string | null;
  phone: string;
}

export interface AdminOrderDetailDto {
  id: string;
  type: OrderType;
  status: OrderStatus;
  total: number;
  commission: number;
  commissionRate: number;
  workerAmount: number;
  fulfillment: FulfillmentType;
  deliveryAddress: string | null;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  customer: AdminOrderPartyDto;
  worker: AdminOrderPartyDto;
  paymentStatus: PaymentStatus | null;
  items: OrderItemDto[];
  refunds: RefundDto[];
  /** Statuses the administrator may move this order to next (refund has its own action). */
  allowedTransitions: OrderStatus[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDto {
  id: string;
  name: string | null;
  phone: string;
  role: UserRole;
  language: 'uz' | 'ru';
  workerId: string | null;
  workerStatus: WorkerStatus | null;
  ordersCount: number;
  blockedAt: string | null;
  blockReason: string | null;
  createdAt: string;
}

export interface AdminCategoryDto {
  id: string;
  slug: string;
  nameUz: string;
  nameRu: string;
  isActive: boolean;
  productsCount: number;
}

export interface PublicSettingsDto {
  acceptApplications: boolean;
  announcement: { uz: string; ru: string } | null;
}

export interface PlatformSettingsDto extends PublicSettingsDto {
  /** Read-only here: the rate lives in code (COMMISSION_RATE_PERCENT). */
  commissionPercent: number;
  updatedAt: string;
}

export interface AdminReviewDto {
  id: string;
  orderId: string;
  workerName: string;
  authorName: string | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  moderationReason: string | null;
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
  adminNote: string | null;
  createdAt: string;
}

export interface AdminMaterialOrderDto extends MaterialOrderDto {
  workerName: string;
  /** The worker's account phone: the courier calls it to hand the order over. Admins only. */
  workerPhone: string;
}
