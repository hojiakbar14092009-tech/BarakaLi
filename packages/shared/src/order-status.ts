export const ORDER_STATUSES = [
  'awaiting_payment',
  'new',
  'accepted',
  'in_progress',
  'ready',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  awaiting_payment: ['new', 'cancelled'],
  new: ['accepted', 'refunded'],
  accepted: ['in_progress'],
  in_progress: ['ready'],
  ready: ['delivered'],
  delivered: [],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export const WORKER_ACTIONABLE_STATUSES: readonly OrderStatus[] = [
  'new',
  'accepted',
  'in_progress',
  'ready',
];

/** Statuses after which the counterpart phone number may be shown. */
export const PHONE_VISIBLE_STATUSES: readonly OrderStatus[] = [
  'accepted',
  'in_progress',
  'ready',
  'delivered',
];

/** Statuses in which a service order still holds its time slot (mirrors the DB exclusion constraint). */
export const SLOT_HOLDING_STATUSES = [
  'awaiting_payment',
  'new',
  'accepted',
  'in_progress',
] as const satisfies readonly OrderStatus[];
