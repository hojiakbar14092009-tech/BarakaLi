import {
  ClipboardList,
  LayoutDashboard,
  MessageSquareWarning,
  Package,
  Receipt,
  ScrollText,
  Settings,
  Spool,
  Tags,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  to: string;
  /** Key under `admin.nav`. */
  key: string;
  icon: LucideIcon;
  end?: boolean;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { to: '/admin', key: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/hunarmandlar', key: 'workers', icon: UsersRound },
  { to: '/admin/mahsulotlar', key: 'products', icon: Package },
  { to: '/admin/buyurtmalar', key: 'orders', icon: Receipt },
  { to: '/admin/foydalanuvchilar', key: 'users', icon: Users },
  { to: '/admin/sharhlar', key: 'moderation', icon: MessageSquareWarning },
  { to: '/admin/xizmat-turlari', key: 'categories', icon: Tags },
  { to: '/admin/materiallar', key: 'materials', icon: Spool },
  { to: '/admin/sozlamalar', key: 'settings', icon: Settings },
  { to: '/admin/audit', key: 'audit', icon: ScrollText },
];

export const ADMIN_PENDING_ICON = ClipboardList;
