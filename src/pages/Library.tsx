const chapters = [
  { title: 'The 5 places of articulation', sub: 'Guttural, palatal, retroflex, dental, labial.', glyph: 'क' },
  { title: 'Visarga & anusvāra', sub: 'The breath that closes a word.', glyph: 'ः' },
  { title: 'Vowel length', sub: 'Short, long, protracted — mora in practice.', glyph: 'ा' },
  { title: 'The sacred syllable', sub: 'Oṁ — resonance across chest, throat and crown.', glyph: 'ॐ' },
  { title: 'Śāntiḥ pāṭha', sub: 'Peace invocations across the Upaniṣads.', glyph: 'शा' },
  { title: 'Reading a śloka', sub: 'Meter, caesura, breath points.', glyph: 'श्लो' },
];

export default function Library() {
  return (
    <div className="flex-1 max-w-[920px] mx-auto px-6 py-10">
      <div className="text-[10.5px] tracking-[0.22em] text-[color:var(--color-amber)] font-semibold mb-3">✻ LEARNING LIBRARY</div>
      <h1 className="font-display text-[40px] leading-tight text-[color:var(--color-ink)]">Short lessons.<br />Deep listening.</h1>
      <p className="font-display text-[18px] text-[color:var(--color-ink-soft)] mt-1 mb-8">A quiet library of ideas to accompany your practice.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {chapters.map(c => (
          <article key={c.title} className="rounded-2xl bg-white border border-[color:var(--color-line)] p-5 hover:shadow-sm transition">
            <div className="h-12 w-12 rounded-xl bg-[color:var(--color-forest-soft)] grid place-items-center font-deva text-[22px] text-[color:var(--color-forest)]">
              {c.glyph}
            </div>
            <div className="mt-4 font-display text-[20px] text-[color:var(--color-ink)] leading-tight">{c.title}</div>
            <div className="text-[12.5px] text-[color:var(--color-ink-muted)] mt-1">{c.sub}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
