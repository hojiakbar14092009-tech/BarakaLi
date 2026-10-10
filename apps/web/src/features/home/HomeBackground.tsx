import { m, useReducedMotion } from 'framer-motion';
import {
  Brush,
  CakeSlice,
  Cookie,
  Croissant,
  Flower2,
  Gem,
  Palette,
  PenTool,
  Scissors,
  Shirt,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

interface FloatingIcon {
  icon: LucideIcon;
  /** Percent of the background box. */
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
}

// Spots sit in the gaps around the hero copy, the photos and the story text (the story text fills
// the right two thirds of the lower half), so no chip lands behind a line of text.
const ICONS: FloatingIcon[] = [
  { icon: Scissors, left: 3, top: 3, size: 44, duration: 11, delay: 0 },
  { icon: CakeSlice, left: 46, top: 2, size: 40, duration: 13, delay: 1.2 },
  { icon: Flower2, left: 72, top: 1, size: 44, duration: 12, delay: 0.6 },
  { icon: Shirt, left: 54, top: 24, size: 36, duration: 10, delay: 0.3 },
  { icon: Palette, left: 1, top: 49, size: 40, duration: 14, delay: 2 },
  { icon: PenTool, left: 40, top: 51, size: 40, duration: 11, delay: 2.4 },
  { icon: Croissant, left: 8, top: 60, size: 48, duration: 13, delay: 0.9 },
  { icon: Gem, left: 2, top: 84, size: 36, duration: 12, delay: 1.8 },
  { icon: Brush, left: 24, top: 86, size: 40, duration: 12, delay: 2.1 },
  { icon: Scissors, left: 20, top: 91, size: 36, duration: 10, delay: 1.1 },
  { icon: Sparkles, left: 3, top: 95, size: 32, duration: 9, delay: 1.5 },
  { icon: Cookie, left: 14, top: 97, size: 44, duration: 14, delay: 0.4 },
];

/** Soft glows and slowly drifting craft icons behind the hero and the story; decorative only. */
export function HomeBackground() {
  const reduced = useReducedMotion();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-x-4 inset-y-0 -z-10 overflow-hidden"
    >
      <div className="home-glow absolute -left-[10%] top-[-6%] size-[60vw] max-w-[50rem] rounded-full bg-[radial-gradient(circle,var(--color-bisque)_0%,transparent_65%)]" />
      <div className="home-glow absolute -right-[12%] top-[46%] size-[55vw] max-w-[46rem] rounded-full bg-[radial-gradient(circle,var(--color-bisque)_0%,transparent_65%)] [animation-delay:-6s]" />
      {ICONS.map(({ icon: Icon, left, top, size, duration, delay }, index) => (
        <m.span
          key={index}
          className="absolute grid place-items-center rounded-full border border-sugar/80 bg-bisque/55 text-mocha/50 shadow-soft backdrop-blur-sm"
          style={{ left: `${left}%`, top: `${top}%`, width: size * 1.9, height: size * 1.9 }}
          animate={reduced ? undefined : { y: [0, -16, 0], rotate: [0, 7, 0] }}
          transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon style={{ width: size, height: size }} strokeWidth={1.25} />
        </m.span>
      ))}
    </div>
  );
}
