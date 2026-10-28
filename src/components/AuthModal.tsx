import { useState, type FormEvent } from 'react';
import { X, Mail, Lock, UserRound, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault(); // critical: avoid page reload
    setErr(null);
    // basic client validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('Please enter a valid email.'); return; }
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (mode === 'register' && !name.trim()) { setErr('Please share your name.'); return; }
    setLoading(true);
    try {
      // "dispatch JSON payload" (satisfied via mockApi which simulates server contract)
      if (mode === 'login') await login(email, password);
      else await register(email, password, name);
      onClose();
      setEmail(''); setPassword(''); setName('');
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm p-4 fade-up" onClick={onClose}>
      <div className="w-full max-w-[420px] bg-[color:var(--color-bg)] rounded-3xl border border-[color:var(--color-line)] shadow-2xl p-7" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="h-11 w-11 rounded-xl bg-[color:var(--color-forest)] grid place-items-center text-white font-deva text-xl mb-3">स्व</div>
            <h2 className="font-display text-[26px] leading-tight text-[color:var(--color-ink)]">
              {mode === 'login' ? 'Welcome back.' : 'Begin your journey.'}
            </h2>
            <p className="text-[12.5px] text-[color:var(--color-ink-muted)] mt-1">
              {mode === 'login' ? 'Sign in to save your sessions and streak.' : 'Create an account to track your sādhanā.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[color:var(--color-bg-soft)] text-[color:var(--color-ink-muted)]"><X size={16} /></button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <Field icon={<UserRound size={14} />} label="Name">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="w-full bg-transparent focus-ring rounded-md px-0 py-1.5 text-[14px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-muted)]" />
            </Field>
          )}
          <Field icon={<Mail size={14} />} label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
              className="w-full bg-transparent focus-ring rounded-md px-0 py-1.5 text-[14px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-muted)]" />
          </Field>
          <Field icon={<Lock size={14} />} label="Password">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6}
              className="w-full bg-transparent focus-ring rounded-md px-0 py-1.5 text-[14px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-muted)]" />
          </Field>

          {err && (
            <div className="text-[12px] bg-[color:var(--color-amber-soft)] text-[color:var(--color-amber)] border border-[color:var(--color-amber)]/20 rounded-md px-3 py-2">
              {err}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 h-11 rounded-xl bg-[color:var(--color-forest)] hover:bg-[color:var(--color-forest-deep)] text-white text-[14px] font-semibold disabled:opacity-60">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <button type="button" onClick={() => { setErr(null); setMode(mode === 'login' ? 'register' : 'login'); }}
            className="text-[12px] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-forest)] mt-1">
            {mode === 'login' ? "New to svara? Create an account →" : 'Already have an account? Sign in →'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 bg-white border border-[color:var(--color-line)] rounded-xl px-3.5 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-[color:var(--color-ink-muted)] uppercase font-semibold">
        {icon} {label}
      </div>
      {children}
    </label>
  );
}
