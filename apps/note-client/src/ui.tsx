import { motion } from 'motion/react';
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useEffect, useState } from 'react';
import { quick } from './lib/motion';

type Tone = 'solid' | 'outline';

// Disabled: a hairline outline, not grey.
const tones: Record<Tone, string> = {
  solid:
    'border border-ink bg-ink text-paper hover:border-field hover:bg-field disabled:border-rule disabled:bg-paper disabled:text-ink',
  outline: 'border border-ink text-ink hover:bg-ink hover:text-paper disabled:border-rule disabled:hover:bg-paper disabled:hover:text-ink',
};

export function Button({ tone = 'solid', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center whitespace-nowrap px-5 text-body font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${tones[tone]} ${className}`}
      {...props}
    />
  );
}

export const caption = 'text-caption font-semibold uppercase';

export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className={caption}>{label}</span>
      <input
        className="mt-2 block h-12 w-full border border-ink bg-paper px-3 text-body placeholder:text-ink/60 focus-visible:outline-offset-0"
        {...props}
      />
      {hint && <span className="mt-1.5 block text-body">{hint}</span>}
    </label>
  );
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex">
      <select
        className={`h-9 appearance-none border border-ink bg-paper pl-2.5 pr-8 text-body font-medium ${className}`}
        {...props}
      />
      <svg aria-hidden viewBox="0 0 10 6" className="pointer-events-none absolute right-2.5 top-1/2 w-2.5 -translate-y-1/2">
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <motion.p
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={quick}
      className="bg-field px-4 py-3 text-body font-medium text-paper"
    >
      {children}
    </motion.p>
  );
}

/** Click twice to confirm; no modal. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  tone = 'outline',
  disabled,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  tone?: Tone;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <Button
      type="button"
      tone={armed ? 'solid' : tone}
      disabled={disabled}
      className={armed ? '!border-field !bg-field' : ''}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? confirmLabel : label}
    </Button>
  );
}

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const tone: Tone = 'outline';
  return (
    <nav aria-label="Pagination" className="flex items-center gap-3">
      <Button tone={tone} className="h-9 px-3" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className={`${caption} tabular-nums`}>
        Page {page} / {Math.max(totalPages, 1)}
      </span>
      <Button tone={tone} className="h-9 px-3" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </nav>
  );
}
