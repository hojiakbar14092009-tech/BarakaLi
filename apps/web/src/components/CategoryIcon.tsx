import { CakeSlice, Flower2, Palette, Scissors, Store, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  tikuvchilik: Scissors,
  pishiriq: CakeSlice,
  'qol-mehnati': Flower2,
  dizayn: Palette,
};

interface CategoryIconProps {
  slug: string;
  className?: string;
}

export function CategoryIcon({ slug, className = 'size-8' }: CategoryIconProps) {
  const Icon = ICONS[slug] ?? Store;
  return <Icon className={className} strokeWidth={1.5} aria-hidden="true" />;
}
