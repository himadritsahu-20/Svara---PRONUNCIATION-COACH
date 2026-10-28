import { X, RotateCw, Save, Check } from 'lucide-react';
import type { AnalysisResult } from '../lib/audioAnalysis';

export default function ReportModal({
  open, result, sanskritText, onClose, onPracticeAgain, onSave, saved,
}: {
  open: boolean;
  result: AnalysisResult | null;
  sanskritText: string;
  onClose: () => void;
  onPracticeAgain: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  if (!open || !result) return null;
  const { overall, clarity, pitch, timing, syllables, summary } = result;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 backdrop-blur-sm p-4 fade-up" onClick={onClose}>
      <div className="w-full max-w-[760px] max-h-[92vh] overflow-y-auto bg-[color:var(--color-bg)] rounded-3xl border border-[color:var(--color-line)] shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="p-7 pb-5 border-b border-[color:var(--color-line)] flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-[10.5px] tracking-[0.22em] text-[color:var(--color-amber)] font-semibold mb-2">YOUR PRONUNCIATION REPORT</div>
            <h2 className="font-display text-[32px] text-[color:var(--color-ink)] leading-tight">
              {summary}
            </h2>
            <div className="mt-2 font-deva text-[18px] text-[color:var(--color-forest)]">{sanskritText}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[color:var(--color-bg-soft)] text-[color:var(--color-ink-muted)]"><X size={16} /></button>
        </div>

        {/* body */}
        <div className="p-7 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-7">
          {/* overall score dial */}
          <div className="flex flex-col items-center gap-3">
            <Dial value={overall} />
            <div className="text-[11px] tracking-[0.18em] text-[color:var(--color-ink-muted)] font-semibold">OVERALL ACCURACY</div>
            <div className="text-[11.5px] text-[color:var(--color-ink-muted)] text-center leading-snug">
              {result.durationStudent.toFixed(1)}s recitation vs {result.durationTeacher.toFixed(1)}s reference
            </div>
          </div>

          {/* meters */}
          <div className="flex flex-col gap-4">
            <Meter label="Clarity"  value={clarity}  hint="Energy envelope match — how closely your sound-shape follows the teacher." />
            <Meter label="Pitch · svara" value={pitch} hint="Pitch contour correlation (log-domain, octave tolerant)." />
            <Meter label="Timing & visarga" value={timing} hint="Overall duration + release of final breath (visarga)." />
          </div>
        </div>

        {/* syllable feedback */}
        <div className="px-7 pb-6">
          <div className="text-[10.5px] tracking-[0.22em] text-[color:var(--color-ink-muted)] font-semibold mb-3">SYLLABLE-BY-SYLLABLE</div>
          <div className="flex flex-wrap gap-2">
            {syllables.length === 0 && <div className="text-[12.5px] text-[color:var(--color-ink-muted)]">Enter Sanskrit text to receive per-syllable feedback.</div>}
            {syllables.map((s, i) => (
              <div key={i} className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border text-[12px] ${
                s.status === 'good' ? 'bg-[color:var(--color-forest-soft)] border-[color:var(--color-forest)]/15 text-[color:var(--color-forest)]'
                : s.status === 'ok' ? 'bg-[color:var(--color-amber-soft)] border-[color:var(--color-amber)]/20 text-[color:var(--color-amber)]'
                : 'bg-white border-[color:var(--color-line)] text-[color:var(--color-ink-soft)]'
              }`}>
                <span className="font-deva text-[14px]">{s.text}</span>
                <span className="text-[11px] opacity-80">{s.label.split(':')[1]?.trim() ?? s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* actions */}
        <div className="px-7 pb-7 pt-2 flex items-center justify-between gap-3 border-t border-[color:var(--color-line)]">
          <div className="text-[11px] text-[color:var(--color-ink-muted)]">
            Engine: <span className="font-semibold text-[color:var(--color-ink-soft)]">internal (acoustic)</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onPracticeAgain}
              className="h-10 px-4 rounded-xl border border-[color:var(--color-line)] bg-white text-[13px] font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-bg-soft)] flex items-center gap-2">
              <RotateCw size={14} /> Practice again
            </button>
            <button onClick={onSave} disabled={saved}
              className="h-10 px-4 rounded-xl bg-[color:var(--color-forest)] text-white text-[13px] font-semibold hover:bg-[color:var(--color-forest-deep)] disabled:opacity-70 flex items-center gap-2">
              {saved ? <><Check size={14} /> Saved to history</> : <><Save size={14} /> Save to history</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dial({ value }: { value: number }) {
  const r = 70, c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <div className="relative h-[180px] w-[180px]">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
        <circle cx="90" cy="90" r={r} stroke="var(--color-line)" strokeWidth="12" fill="none" />
        <circle cx="90" cy="90" r={r} stroke="var(--color-forest)" strokeWidth="12" strokeLinecap="round"
          fill="none" strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-[48px] leading-none text-[color:var(--color-forest)]">{value}<span className="text-[22px] text-[color:var(--color-ink-muted)]">%</span></div>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[12.5px] font-semibold text-[color:var(--color-ink)]">{label}</div>
        <div className="text-[12.5px] font-display text-[color:var(--color-forest)]">{value}%</div>
      </div>
      <div className="h-2 rounded-full bg-[color:var(--color-bg-soft)] overflow-hidden">
        <div className="h-full rounded-full bg-[color:var(--color-forest)]" style={{ width: `${value}%`, transition: 'width 1s ease' }} />
      </div>
      <div className="text-[11px] text-[color:var(--color-ink-muted)] mt-1.5">{hint}</div>
    </div>
  );
}
