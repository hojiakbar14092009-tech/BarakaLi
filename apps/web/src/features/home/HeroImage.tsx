import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { imageSource, type HeroImageKey } from './images';

const SCALE_FROM = 1.12;

interface HeroImageProps {
  imageKey: HeroImageKey;
  eager?: boolean;
  sizes?: string;
  className?: string;
}

/** Photo that eases from a slight zoom to its natural size while scrolling; transform only. */
export function HeroImage({
  imageKey,
  eager = false,
  sizes = '40vw',
  className = '',
}: HeroImageProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [SCALE_FROM, 1]);
  const source = imageSource(imageKey);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <m.img
        src={source.src}
        srcSet={source.srcSet}
        sizes={sizes}
        width={source.width}
        height={source.height}
        alt={t(`home.hero.images.${imageKey}`)}
        loading={eager ? 'eager' : 'lazy'}
        // React 18 only forwards the lowercase HTML attribute.
        {...{ fetchpriority: eager ? 'high' : 'auto' }}
        decoding="async"
        style={reduced ? { scale: 1 } : { scale }}
        className="h-full w-full object-cover will-change-transform"
      />
    </div>
  );
}
