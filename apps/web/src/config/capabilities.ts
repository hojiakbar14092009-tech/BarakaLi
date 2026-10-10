import {
  BookOpen,
  CalendarClock,
  Layers,
  ListChecks,
  PiggyBank,
  Rotate3d,
  Search,
  Spool,
  type LucideIcon,
} from 'lucide-react';

export interface Capability {
  /** i18n key under `catering.capabilities.items`. */
  key: string;
  icon: LucideIcon;
}

/**
 * What the platform does today, in one list: the catering landing renders it as is. When a
 * feature changes, change it here. Payment providers and SMS delivery are not connected yet, so
 * they are deliberately absent.
 */
export const CAPABILITIES: readonly Capability[] = [
  { key: 'search', icon: Search },
  { key: 'pricing', icon: Layers },
  { key: 'view3d', icon: Rotate3d },
  { key: 'calendar', icon: CalendarClock },
  { key: 'tracking', icon: ListChecks },
  { key: 'materials', icon: Spool },
  { key: 'earnings', icon: PiggyBank },
  { key: 'lessons', icon: BookOpen },
];
