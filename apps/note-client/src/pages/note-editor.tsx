import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, json, Note } from '../api';
import { useAuth } from '../auth';
import { formatStamp, indexNo } from '../lib/format';
import { quick } from '../lib/motion';
import { Alert, Button, caption, ConfirmButton } from '../ui';
import { useNotes } from './notes-page';

type Status = 'loading' | 'missing' | 'ready';

export function NoteEditorRoute() {
  const { id = 'new' } = useParams();
  return <NoteEditor key={id} id={id} />;
}

function NoteEditor({ id }: { id: string }) {
  const isNew = id === 'new';
  const { total, numberOf, refresh, search } = useNotes();
  const navigate = useNavigate();
  const isAdmin = useAuth().user?.role === 'admin';
  const [status, setStatus] = useState<Status>(isNew ? 'ready' : 'loading');
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    api<Note>(`/notes/${id}`)
      .then((n) => {
        setNote(n);
        setTitle(n.title);
        setContent(n.content);
        setStatus('ready');
      })
      // Missing, not yours or a bad id: all "no such note".
      .catch((err: ApiError) =>
        err.code === 'NOTE_NOT_FOUND' || err.code === 'INVALID_ID'
          ? setStatus('missing')
          : (setError(err.message), setStatus('ready')),
      );
  }, [id, isNew]);

  const dirty = isNew ? title.trim() !== '' || content.trim() !== '' : title !== note?.title || content !== note?.content;
  const number = isNew ? total + 1 : numberOf(id);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (!title.trim() || !content.trim() || busy) {
      setError(!title.trim() ? 'Give the note a title.' : !content.trim() ? 'Write something before saving.' : '');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = json({ title: title.trim(), content });
      if (isNew) {
        const created = await api<Note>('/notes', { method: 'POST', body });
        refresh();
        navigate(`/notes/${created._id}`, { replace: true });
      } else {
        const updated = await api<Note>(`/notes/${id}`, { method: 'PATCH', body });
        setNote(updated);
        setTitle(updated.title);
        refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/notes/${id}`, { method: 'DELETE' });
      refresh();
      navigate(`/notes${search}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  // On phones the admin label moves next to the back link.
  const back = (
    <div className="mb-6 flex items-baseline justify-between lg:hidden">
      <Link to={`/notes${search}`} className="text-body font-semibold underline">
        Back to notes
      </Link>
      {isAdmin && <span className={`text-field ${caption}`}>Admin view</span>}
    </div>
  );

  if (status === 'loading') return <p className="px-5 pt-6 text-body sm:px-10 sm:pt-10 lg:px-14">Opening note…</p>;
  if (status === 'missing')
    return (
      <div className="px-5 pt-6 sm:px-10 sm:pt-10 lg:px-14">
        {back}
        <h2 className="max-w-[22ch] text-poster font-bold text-balance">This note doesn’t exist, or it isn’t yours.</h2>
        <p className="mt-4 max-w-[50ch] text-body">Notes are private to the account that wrote them.</p>
      </div>
    );

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={quick}
      onSubmit={save}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
          e.preventDefault();
          save();
        }
      }}
      className="flex h-full flex-col px-5 pb-5 pt-6 sm:px-10 sm:pt-10 lg:px-14"
    >
      {back}
      <div className="flex items-baseline gap-4 sm:gap-6">
        {/* Signature move: the index number slides in from the list side. */}
        <motion.span
          initial={{ x: '-0.6em' }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          aria-label={number ? `Note number ${number}` : undefined}
          className="shrink-0 text-poster font-extrabold text-field tabular-nums"
        >
          {number ? indexNo(number) : '—'}
        </motion.span>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Title</span>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            placeholder="Untitled"
            maxLength={200}
            rows={1}
            autoFocus={isNew}
            className="block w-full resize-none overflow-hidden bg-transparent text-poster font-bold text-balance [field-sizing:content] placeholder:text-ink/55 focus-visible:outline-none"
          />
        </label>
      </div>

      <div className="mt-6 border-t border-rule" />

      <label className="flex min-h-0 flex-1 flex-col">
        <span className="sr-only">Note</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing."
          className="min-h-48 w-full max-w-[70ch] flex-1 resize-none bg-transparent py-6 text-body leading-[1.7] placeholder:text-ink/60 focus-visible:outline-none"
        />
      </label>

      {error && (
        <div className="mb-4 max-w-[70ch]">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        {/* Save only exists when there is something to save; otherwise the stamp says it's done. */}
        <AnimatePresence initial={false} mode="popLayout">
          {(isNew || dirty) && (
            <motion.div key="save" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={quick}>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : isNew ? 'Save note' : 'Save changes'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        {!isNew && <ConfirmButton label="Delete" confirmLabel="Delete for good" onConfirm={remove} disabled={busy} />}
        <span className={`ml-auto ${caption}`} aria-live="polite">
          {dirty ? 'Unsaved changes' : note ? `Saved ${formatStamp(note.updatedAt)}` : ''}
        </span>
      </div>
    </motion.form>
  );
}
