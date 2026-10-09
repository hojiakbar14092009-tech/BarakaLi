import { LazyMotion, m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

const loadFeatures = () => import('./motionFeatures').then((mod) => mod.default);

interface MotionFadeProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Entry animation for the home page only; disabled under prefers-reduced-motion. */
export function MotionFade({ children, delay = 0, className }: MotionFadeProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <LazyMotion features={loadFeatures} strict>
      <m.div
        className={className}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
