import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { imageSource, type CateringImageKey } from './images';

export const SCALE_FROM_CARD = 1.08;
export const SCALE_FROM_HERO = 1.12;

interface CateringImageProps {
  imageKey: CateringImageKey;
  /** Initial scale; the image settles to 1.00 as it scrolls through the viewport. */
  scaleFrom?: number;
  eager?: boolean;
  sizes?: string;
  className?: string;
}

/** Photo that eases from a slight zoom to its natural size while scrolling; transform only. */
export function CateringImage({
  imageKey,
  scaleFrom = SCALE_FROM_CARD,
  eager = false,
  sizes = '(min-width: 1024px) 50vw, 100vw',
  className = '',
}: CateringImageProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: eager ? ['start start', 'end start'] : ['start end', 'center center'],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [scaleFrom, 1]);
  const source = imageSource(imageKey);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <m.img
        src={source.src}
        srcSet={source.srcSet}
        sizes={sizes}
        width={source.width}
        height={source.height}
        alt={t(`catering.images.${imageKey}`)}
        loading={eager ? 'eager' : 'lazy'}
        // React 18 only forwards the lowercase HTML attribute.
        {...{ fetchpriority: eager ? 'high' : 'auto' }}
        decoding="async"
        data-scale-from={reduced ? 1 : scaleFrom}
        style={reduced ? { scale: 1 } : { scale }}
        className="h-full w-full object-cover will-change-transform"
      />
    </div>
  );
}
