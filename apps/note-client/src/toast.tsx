import { AnimatePresence, motion } from 'motion/react';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { quick, slide } from './lib/motion';

type Tone = 'done' | 'error';

interface ToastInput {
  title: string;
  detail?: string;
  tone?: Tone;
}

interface Toast extends Required<Omit<ToastInput, 'detail'>> {
  id: number;
  detail?: string;
}

const ToastContext = createContext<(toast: ToastInput) => void>(
  () => undefined,
);

const DURATION_MS: Record<Tone, number> = { done: 4000, error: 6500 };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    [],
  );

  const show = useCallback(({ title, detail, tone = 'done' }: ToastInput) => {
    const id = nextId.current++;
    // Newest last (nearest the corner); at most three on screen.
    setToasts((all) => [...all.slice(-2), { id, title, detail, tone }]);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Phones: under the header, clear of the editor's buttons. Wider screens: bottom left. */}
      <section
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 top-[4.5rem] z-50 flex flex-col gap-2 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:left-6 sm:w-[23rem]"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </section>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const error = toast.tone === 'error';
  return (
    <motion.div
      layout
      role={error ? 'alert' : 'status'}
      initial={{ opacity: 0, x: -40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1, transition: slide }}
      exit={{ opacity: 0, x: -40, transition: quick }}
      className={`group pointer-events-auto relative flex items-start gap-3 overflow-hidden border py-3 pl-3 pr-2 shadow-[0_8px_24px_-12px_rgb(11_11_12/0.35)] ${
        error
          ? 'border-field bg-field text-paper'
          : 'border-ink bg-paper text-ink'
      }`}
    >
      <motion.span
        aria-hidden
        initial={{ scale: 0.4, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...slide, delay: 0.08 }}
        className={`grid size-7 shrink-0 place-items-center ${error ? 'bg-paper text-field' : 'bg-field text-paper'}`}
      >
        {error ? (
          <svg viewBox="0 0 16 16" className="size-4">
            <path
              d="M8 3.5v5.5M8 11.5v1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="size-4">
            <motion.path
              d="M3.5 8.5l3 3 6-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.18, ease: 'easeOut' }}
            />
          </svg>
        )}
      </motion.span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-body font-semibold leading-snug">{toast.title}</p>
        {toast.detail && (
          <p
            className={`mt-0.5 truncate text-[0.9375rem] ${error ? 'text-paper/85' : 'text-ink/70'}`}
          >
            {toast.detail}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className={`grid size-7 shrink-0 place-items-center transition-colors ${
          error ? 'hover:bg-paper/15' : 'hover:bg-index-hover'
        }`}
      >
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
          <path
            d="M2 2l8 8M10 2l-8 8"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>

      {/* Time left before it closes; hovering pauses it. Its end dismisses the toast. */}
      <span
        aria-hidden
        onAnimationEnd={onDismiss}
        style={{ animationDuration: `${DURATION_MS[toast.tone]}ms` }}
        className={`absolute inset-x-0 bottom-0 h-[3px] origin-left animate-[toast-timer_linear_forwards] group-hover:[animation-play-state:paused] ${
          error ? 'bg-paper/70' : 'bg-field'
        }`}
      />
    </motion.div>
  );
}

/** `toast({ title: 'Changes saved', detail: 'Weekly review' })`; add `tone: 'error'` for problems. */
export const useToast = () => useContext(ToastContext);
