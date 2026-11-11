import { motion } from 'motion/react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Alert, Button, Field } from '../ui';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email'));
    const password = String(f.get('password'));
    setBusy(true);
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        const interests = String(f.get('interests'))
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        await register({ name: String(f.get('name')), email, password, interests });
      }
      navigate('/notes', { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-12">
      <section className="on-navy flex flex-col justify-between gap-16 bg-navy px-6 py-8 text-paper sm:px-10 lg:col-span-5 lg:py-10">
        <p className="text-body font-bold">Secure Notes</p>
        <p className="max-w-[9ch] text-display font-extrabold text-balance">
          {['Notes no', 'other user', 'can open.'].map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.06em]">
              <motion.span
                className="block"
                initial={{ y: '105%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.7, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-14 sm:px-10 lg:col-span-7 lg:px-20">
        <motion.form
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={onSubmit}
          className="w-full max-w-md space-y-6"
        >
          <h1 className="text-poster font-bold">{isLogin ? 'Sign in' : 'Create your account'}</h1>

          {error && <Alert>{error}</Alert>}

          {!isLogin && <Field label="Name" name="name" autoComplete="name" required />}
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={isLogin ? undefined : 8}
            hint={isLogin ? undefined : 'At least 8 characters.'}
            required
          />
          {!isLogin && (
            <Field label="Interests" name="interests" placeholder="chess, hiking, jazz" hint="Optional. Separate with commas." />
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (isLogin ? 'Signing in…' : 'Creating account…') : isLogin ? 'Sign in' : 'Create account'}
          </Button>

          <p className="border-t border-rule pt-6 text-body">
            {isLogin ? 'New here? ' : 'Already have an account? '}
            <Link to={isLogin ? '/register' : '/login'} className="font-semibold underline hover:text-field">
              {isLogin ? 'Create an account' : 'Sign in'}
            </Link>
          </p>
        </motion.form>
      </section>
    </main>
  );
}
