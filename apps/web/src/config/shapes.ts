/**
 * Desktop (≥1280 px) bento shapes for product cards. Every class is `xl:`-prefixed so phones and
 * tablets keep the plain grid. Shapes are border-radius on the image frame only (never clip-path),
 * and the image inside keeps object-fit: contain, so the item is always shown whole.
 */
export interface CardShape {
  name: 'arch' | 'circle' | 'pill' | 'soft' | 'panorama';
  /** Grid footprint of the whole card. */
  span: string;
  /** Radius and inner padding of the image frame. */
  frame: string;
}

const ARCH: CardShape = {
  name: 'arch',
  span: '',
  frame: 'xl:rounded-t-[999px] xl:rounded-b-3xl xl:px-6 xl:pt-10',
};

export const CARD_SHAPES: readonly CardShape[] = [
  ARCH,
  { name: 'circle', span: '', frame: 'xl:rounded-full xl:p-8' },
  { name: 'pill', span: 'xl:col-span-2', frame: 'xl:rounded-full xl:px-14 xl:py-4' },
  { name: 'soft', span: '', frame: 'xl:rounded-[2.5rem] xl:p-4' },
  { name: 'panorama', span: 'xl:col-span-2', frame: 'xl:rounded-3xl xl:px-10 xl:py-4' },
];

export function cardShape(index: number): CardShape {
  return CARD_SHAPES[index % CARD_SHAPES.length] ?? ARCH;
}

/** Delay between neighbouring cards as they scroll into view. */
export const REVEAL_STAGGER_MS = 80;
export const BENTO_COLUMNS = 4;
