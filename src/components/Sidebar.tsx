import { NavLink } from 'react-router-dom';
import { Home, Mic2, Clock3, BookOpen, Flame, Settings, LogOut, LogIn, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Sidebar({ onLoginClick }: { onLoginClick: () => void }) {
  const { user, logout, sessionCount } = useAuth();
  const streak = user?.streak ?? 3;

  const nav = [
    { to: '/',          label: 'Home',             icon: Home,     count: null as string | null },
    { to: '/practice',  label: 'Practice',         icon: Mic2,     count: '01' },
    { to: '/history',   label: 'My history',       icon: Clock3,   count: sessionCount ? String(sessionCount).padStart(2,'0') : null },
    { to: '/library',   label: 'Learning library', icon: BookOpen, count: null },
  ];

  // Mark the first N weekdays "lit" based on streak (simple visual)
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0..Sun=6
  const litSet = new Set<number>();
  for (let i = 0; i < Math.min(streak, 7); i++) litSet.add((todayIdx - i + 7) % 7);

  return (
    <aside className="w-[260px] shrink-0 h-screen sticky top-0 border-r border-[color:var(--color-line)] bg-[color:var(--color-bg)] flex flex-col">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-[color:var(--color-forest)] grid place-items-center text-white font-deva text-2xl">स्व</div>
        <div className="leading-tight">
          <div className="font-display text-[22px] text-[color:var(--color-ink)] tracking-tight">svara</div>
          <div className="text-[10px] tracking-[0.18em] text-[color:var(--color-ink-muted)]">PRONUNCIATION COACH</div>
        </div>
      </div>

      {/* Nav */}
      <div className="px-5 mt-4">
        <div className="text-[10px] tracking-[0.2em] text-[color:var(--color-ink-muted)] mb-3">LEARNING SPACE</div>
        <nav className="flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, count }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition
                 ${isActive
                   ? 'bg-[color:var(--color-forest-soft)] text-[color:var(--color-forest)] font-semibold'
                   : 'text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-bg-soft)]'}`
              }
            >
              <Icon size={17} strokeWidth={1.9} />
              <span className="flex-1">{label}</span>
              {count && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[color:var(--color-bg-soft)] text-[color:var(--color-ink-muted)] group-aria-[current=page]:bg-white">{count}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Streak card */}
      <div className="mx-5 mt-6 rounded-2xl bg-[color:var(--color-bg-soft)] border border-[color:var(--color-line)] p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="font-display text-[17px] leading-tight text-[color:var(--color-ink)]">A little practice,<br />every day.</div>
          <div className="text-[color:var(--color-amber)] text-lg">✻</div>
        </div>
        <p className="text-[11.5px] text-[color:var(--color-ink-muted)] leading-relaxed mb-3">
          Your voice is your best teacher. Keep your streak alive.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-[color:var(--color-amber-soft)] text-[color:var(--color-amber)] px-2 py-1 rounded-full text-[11px] font-semibold">
            <Flame size={12} /> {streak} day streak
          </div>
          <div className="flex gap-1.5">
            {days.map((d, i) => (
              <span key={i}
                className={`text-[10px] w-4 text-center ${litSet.has(i) ? 'text-[color:var(--color-forest)] font-bold' : 'text-[color:var(--color-ink-muted)]'}`}>
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Profile footer */}
      <div className="mt-auto px-5 pb-5 pt-6">
        <div className="rounded-2xl bg-white border border-[color:var(--color-line)] p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[color:var(--color-forest-soft)] grid place-items-center text-[color:var(--color-forest)]">
            <UserRound size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-[color:var(--color-ink)] truncate">
              {user ? user.name : 'Guest profile'}
            </div>
            <div className="text-[10.5px] text-[color:var(--color-ink-muted)] truncate">
              {user ? user.email : 'Sign in to save your journey'}
            </div>
          </div>
          {user ? (
            <button onClick={logout} title="Sign out" className="p-1.5 rounded hover:bg-[color:var(--color-bg-soft)] text-[color:var(--color-ink-muted)]">
              <LogOut size={14} />
            </button>
          ) : (
            <button onClick={onLoginClick} title="Sign in" className="p-1.5 rounded hover:bg-[color:var(--color-bg-soft)] text-[color:var(--color-ink-muted)]">
              <LogIn size={14} />
            </button>
          )}
          <button title="Settings" className="p-1.5 rounded hover:bg-[color:var(--color-bg-soft)] text-[color:var(--color-ink-muted)]">
            <Settings size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
