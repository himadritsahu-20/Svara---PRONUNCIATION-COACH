import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const quickItems = [
  { glyph: 'गु', title: 'Guru mantra',  sub: 'Short phrase · 4 syllables', text: 'गुरुर्ब्रह्मा' },
  { glyph: 'श्लो', title: 'Guru shloka', sub: 'Classic verse · 2 lines',   text: 'गुरुर्ब्रह्मा गुरुर्विष्णुः' },
  { glyph: 'शा', title: 'Śāntiḥ',         sub: 'Single word · 3 sounds',   text: 'शान्तिः' },
];

export default function RightSidebar({ onPick }: { onPick: (text: string) => void }) {
  const { user, sessionCount } = useAuth();
  const streak = user?.streak ?? 3;

  return (
    <aside className="w-[340px] shrink-0 h-screen sticky top-0 overflow-y-auto px-5 py-6 border-l border-[color:var(--color-line)]">
      {/* NĀDA concept */}
      <div className="rounded-2xl bg-[color:var(--color-forest-soft)] border border-[color:var(--color-forest)]/10 p-5 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-[120px] font-deva text-[color:var(--color-forest)]/5 leading-none select-none">नाद</div>
        <div className="flex items-center gap-2 text-[11px] text-[color:var(--color-forest)] font-semibold tracking-[0.14em]">
          <span className="font-deva">स्वर</span> ✳ ✧ <span className="font-deva">नाद</span>
        </div>
        <div className="mt-3 font-display text-[22px] leading-[1.15] text-[color:var(--color-forest-deep)]">
          NĀDA — The resonance of every sound.
        </div>
      </div>

      {/* Mindful quote */}
      <div className="mt-5 rounded-2xl border border-[color:var(--color-line)] bg-white p-5">
        <div className="flex items-center gap-2 text-[10.5px] tracking-[0.2em] text-[color:var(--color-amber)] font-semibold mb-3">
          <span>✻</span> A SMALL REMINDER
        </div>
        <blockquote className="font-display text-[18px] leading-snug text-[color:var(--color-ink)]">
          “Each Sanskrit sound has a place of origin. Let your awareness begin there.”
        </blockquote>
        <p className="text-[11px] text-[color:var(--color-ink-muted)] mt-3">A note on mindful recitation</p>
      </div>

      {/* Quick practice */}
      <div className="mt-5 rounded-2xl border border-[color:var(--color-line)] bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10.5px] tracking-[0.2em] font-semibold text-[color:var(--color-ink-muted)]">QUICK PRACTICE</div>
          <button className="text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-forest)]"><RefreshCw size={13} /></button>
        </div>
        <ul className="flex flex-col">
          {quickItems.map((it, i) => (
            <li key={i}>
              <button
                onClick={() => onPick(it.text)}
                className="w-full flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-[color:var(--color-bg-soft)] text-left group"
              >
                <div className="h-9 w-9 rounded-lg bg-[color:var(--color-bg-soft)] grid place-items-center font-deva text-[color:var(--color-forest)]">
                  {it.glyph}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-[color:var(--color-ink)]">{it.title}</div>
                  <div className="text-[10.5px] text-[color:var(--color-ink-muted)]">{it.sub}</div>
                </div>
                <ArrowUpRight size={14} className="text-[color:var(--color-ink-muted)] group-hover:text-[color:var(--color-forest)]" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Stats pill */}
      <div className="mt-5 rounded-2xl border border-[color:var(--color-line)] bg-white p-4 flex items-center gap-5">
        <div>
          <div className="font-display text-[28px] text-[color:var(--color-ink)] leading-none">{sessionCount}</div>
          <div className="text-[10.5px] text-[color:var(--color-ink-muted)]">sessions practiced</div>
        </div>
        <div className="h-10 w-px bg-[color:var(--color-line)]" />
        <div>
          <div className="font-display text-[28px] text-[color:var(--color-amber)] leading-none">{streak}<span className="text-[13px] ml-1 text-[color:var(--color-ink-muted)]">days</span></div>
          <div className="text-[10.5px] text-[color:var(--color-ink-muted)]">current streak</div>
        </div>
      </div>
    </aside>
  );
}
