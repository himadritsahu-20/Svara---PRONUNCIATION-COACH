import { useAuth } from '../context/AuthContext';
import * as api from '../lib/mockApi';
import { Clock3, ArrowRight } from 'lucide-react';

export default function History({ onSignIn }: { onSignIn: () => void }) {
  const { user } = useAuth();
  const sessions = user ? api.getSessions(user.id) : [];

  return (
    <div className="flex-1 max-w-[760px] mx-auto px-6 py-10">
      <div className="text-[10.5px] tracking-[0.22em] text-[color:var(--color-amber)] font-semibold mb-3">✻ YOUR JOURNEY</div>
      <h1 className="font-display text-[40px] leading-tight text-[color:var(--color-ink)]">My history</h1>
      <p className="font-display text-[18px] text-[color:var(--color-ink-soft)] mt-1 mb-6">Every session you’ve saved — a quiet record of your sādhanā.</p>

      {!user && (
        <div className="rounded-3xl border border-[color:var(--color-line)] bg-white p-8 text-center">
          <div className="font-display text-[22px] text-[color:var(--color-ink)]">Sign in to view your history.</div>
          <p className="text-[13px] text-[color:var(--color-ink-muted)] mt-1 mb-4">Your sessions are kept private, linked to your account.</p>
          <button onClick={onSignIn} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[color:var(--color-forest)] text-white font-semibold text-[13px]">
            Sign in <ArrowRight size={14} />
          </button>
        </div>
      )}

      {user && sessions.length === 0 && (
        <div className="rounded-3xl border border-dashed border-[color:var(--color-line)] bg-white p-10 text-center">
          <Clock3 className="mx-auto text-[color:var(--color-ink-muted)] mb-3" />
          <div className="font-display text-[22px] text-[color:var(--color-ink)]">No sessions yet.</div>
          <p className="text-[13px] text-[color:var(--color-ink-muted)] mt-1">Analyze your first recitation and save it to history.</p>
        </div>
      )}

      {user && sessions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {sessions.map(s => (
            <li key={s.id} className="rounded-2xl bg-white border border-[color:var(--color-line)] p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-[color:var(--color-forest-soft)] grid place-items-center font-deva text-[18px] text-[color:var(--color-forest)]">
                {s.sanskrit_text.trim().slice(0, 2) || '॥'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-deva text-[16px] text-[color:var(--color-ink)] truncate">{s.sanskrit_text}</div>
                <div className="text-[11.5px] text-[color:var(--color-ink-muted)]">
                  {new Date(s.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-[26px] leading-none text-[color:var(--color-forest)]">{s.score}<span className="text-[13px] text-[color:var(--color-ink-muted)]">%</span></div>
                <div className="text-[10.5px] tracking-[0.14em] text-[color:var(--color-ink-muted)]">OVERALL</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
