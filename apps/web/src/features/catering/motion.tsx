import { domAnimation, LazyMotion, m, MotionConfig, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

export const EASE = [0.22, 1, 0.36, 1] as const;
export const DURATION = 0.65;
export const STAGGER = 0.08;
export const IN_VIEW = { once: true, amount: 0.25 } as const;

/** One motion setup for the whole landing; movement is dropped under reduced motion, opacity stays. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: DURATION, ease: EASE }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION, ease: EASE } },
};

export const staggerChildren = (delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER, delayChildren } },
});

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** Fades and rises once when a quarter of it scrolls into view. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <m.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={IN_VIEW}
      variants={riseIn}
      transition={{ delay }}
    >
      {children}
    </m.div>
  );
}
