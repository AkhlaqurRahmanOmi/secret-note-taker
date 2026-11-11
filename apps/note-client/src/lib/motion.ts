import type { Transition, Variants } from 'motion/react';

/** Short ease-out, no bounce. */
export const ease = [0.16, 1, 0.3, 1] as const;
export const quick: Transition = { duration: 0.22, ease };
export const slide: Transition = { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 };

export const list: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.025 } },
};

export const row: Variants = {
  hidden: { opacity: 0, y: 6 },
  shown: { opacity: 1, y: 0, transition: quick },
};
