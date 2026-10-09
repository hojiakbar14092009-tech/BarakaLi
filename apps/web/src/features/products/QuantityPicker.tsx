import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MAX_ITEM_QUANTITY } from '@barakali/shared';

interface QuantityPickerProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
}

export function QuantityPicker({ value, max, onChange }: QuantityPickerProps) {
  const { t } = useTranslation();
  const upper = Math.max(1, Math.min(max, MAX_ITEM_QUANTITY));
  const set = (next: number) => onChange(Math.min(Math.max(Math.floor(next) || 1, 1), upper));
  const buttonClass =
    'grid size-12 place-items-center rounded-field bg-bisque text-espresso disabled:opacity-40';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={t('product.decrease')}
        className={buttonClass}
        disabled={value <= 1}
        onClick={() => set(value - 1)}
      >
        <Minus className="size-5" aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={t('product.quantity')}
        min={1}
        max={upper}
        value={value}
        onChange={(event) => set(Number(event.target.value))}
        className="min-h-12 w-24 rounded-field border border-wheat bg-white/70 text-center text-lg font-semibold"
      />
      <button
        type="button"
        aria-label={t('product.increase')}
        className={buttonClass}
        disabled={value >= upper}
        onClick={() => set(value + 1)}
      >
        <Plus className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
