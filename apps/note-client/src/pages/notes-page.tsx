import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useMatch, useOutletContext, useSearchParams } from 'react-router-dom';
import { apiPage, Note, Page } from '../api';
import { useAuth } from '../auth';
import { formatDay, indexNo } from '../lib/format';
import { list as listMotion, row, slide } from '../lib/motion';
import { Alert, caption, Pager } from '../ui';

const LIMIT = 10;

export interface NotesContext {
  total: number;
  numberOf: (id: string) => number | undefined;
  refresh: () => void;
  search: string;
}

export const useNotes = () => useOutletContext<NotesContext>();

export function NotesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [list, setList] = useState<Page<Note> | null>(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const open = useMatch('/notes/:id');
  const activeId = open?.params.id;

  useEffect(() => {
    let live = true;
    apiPage<Note>(`/notes?page=${page}&limit=${LIMIT}`)
      .then((res) => live && (setList(res), setError('')))
      .catch((err: Error) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [page, version]);

  const total = list?.meta.total ?? 0;
  const offset = (page - 1) * LIMIT;
  const numberOf = useCallback(
    (id: string) => {
      const i = list?.data.findIndex((n) => n._id === id) ?? -1;
      return i < 0 ? undefined : total - offset - i;
    },
    [list, total, offset],
  );
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const search = page > 1 ? `?page=${page}` : '';

  return (
    <div className="grid h-full lg:grid-cols-12">
      <aside
        className={`flex min-h-0 flex-col border-rule bg-index lg:col-span-4 lg:border-r ${activeId ? 'hidden lg:flex' : 'flex'}`}
      >
        {/* Header shares its top line with the editor's title across the grid. */}
        <div className="px-5 pb-5 pt-6 sm:px-6 sm:pt-10">
          <h1 className="text-poster font-bold">{isAdmin ? 'All notes' : 'Your notes'}</h1>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className={caption}>
              {list ? `${total} ${total === 1 ? 'note' : 'notes'}` : 'Loading…'}
              {isAdmin ? ' · admin view' : ' · private to your account'}
            </p>
            <Link
              to={`/notes/new${search}`}
              className="inline-flex h-10 shrink-0 items-center border border-ink bg-ink px-4 text-body font-semibold text-paper hover:border-field hover:bg-field"
            >
              New note
            </Link>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-rule">
          {error && (
            <div className="p-5">
              <Alert>{error}</Alert>
            </div>
          )}
          {list && list.data.length === 0 && (
            <p className="max-w-[26ch] px-5 py-8 text-body sm:px-6">
              Nothing here yet. Start your first note.
            </p>
          )}
          {/* Keyed by page so each page cascades in; the selection bar slides between rows. */}
          <motion.ol key={page} variants={listMotion} initial="hidden" animate={list ? 'shown' : 'hidden'}>
            {list?.data.map((note, i) => {
              const active = note._id === activeId;
              return (
                <motion.li key={note._id} variants={row} className="relative border-b border-rule">
                  {active && (
                    <motion.span layoutId="active-note" transition={slide} aria-hidden className="absolute inset-0 bg-field" />
                  )}
                  <Link
                    to={`/notes/${note._id}${search}`}
                    aria-current={active ? 'page' : undefined}
                    className={`relative grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-3 px-5 py-3.5 transition-colors sm:px-6 ${active ? 'text-paper delay-100 duration-200' : 'duration-150 hover:bg-index-hover'}`}
                  >
                    <span className={`text-body font-semibold tabular-nums ${active ? '' : 'text-field'}`}>{indexNo(total - offset - i)}</span>
                    <span className="truncate text-body font-semibold">{note.title}</span>
                    <span className={caption}>{formatDay(note.updatedAt)}</span>
                  </Link>
                </motion.li>
              );
            })}
          </motion.ol>
        </div>

        {list && list.meta.totalPages > 1 && (
          <div className="border-t border-rule px-5 py-4 sm:px-6">
            <Pager page={page} totalPages={list.meta.totalPages} onPage={(p) => setParams({ page: String(p) })} />
          </div>
        )}
      </aside>

      <section className={`min-h-0 lg:col-span-8 ${activeId ? 'block' : 'hidden lg:block'}`}>
        {error && !list ? (
          <div className="p-8">
            <Alert>{error}</Alert>
          </div>
        ) : (
          <Outlet context={{ total, numberOf, refresh, search } satisfies NotesContext} />
        )}
      </section>
    </div>
  );
}

export function NoNoteSelected() {
  const { total, search } = useNotes();
  return (
    <div className="flex h-full flex-col justify-end p-8 sm:p-12">
      <motion.p
        key={total}
        initial={{ y: '0.25em', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-display font-extrabold text-field tabular-nums"
      >
        {indexNo(total + 1)}
      </motion.p>
      <p className="mt-4 max-w-[34ch] text-body">
        Pick a note from the index, or{' '}
        <Link to={`/notes/new${search}`} className="font-semibold underline hover:text-field">
          start note {indexNo(total + 1)}
        </Link>
        .
      </p>
    </div>
  );
}
