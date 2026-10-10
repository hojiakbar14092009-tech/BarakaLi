import { CATERING_SERVICE_TYPES, type CateringServiceType } from '@barakali/shared';
import { CakeSlice, Flower2, PenTool, Scissors, type LucideIcon } from 'lucide-react';
import type { Language } from '../../i18n';

export type ServiceType = (typeof CATERING_SERVICE_TYPES)[number];

export const SERVICE_ICONS: Record<CateringServiceType['icon'], LucideIcon> = {
  Scissors,
  CakeSlice,
  Flower2,
  PenTool,
};

export function serviceTitle(type: CateringServiceType, language: Language): string {
  return language === 'ru' ? type.title_ru : type.title_uz;
}

export function serviceDescription(type: CateringServiceType, language: Language): string {
  return language === 'ru' ? type.description_ru : type.description_uz;
}
