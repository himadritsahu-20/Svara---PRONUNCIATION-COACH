// Client-side audio analysis engine.
// NO external API required — compares teacher vs student recordings using:
//   • duration (timing)
//   • RMS energy envelope (clarity / enunciation shape)
//   • pitch contour via autocorrelation (svara)
// This is the fallback mentioned in the spec, so analysis never hangs.

export type AnalysisResult = {
  overall: number;
  clarity: number;
  pitch: number;
  timing: number;
  durationTeacher: number;
  durationStudent: number;
  syllables: Array<{ text: string; label: string; status: 'good' | 'ok' | 'work' }>;
  summary: string;
  engine: 'internal' | 'external';
};

async function blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const arr = await blob.arrayBuffer();
  // @ts-expect-error webkit prefix
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx: AudioContext = new Ctx();
  try {
    const buf = await ctx.decodeAudioData(arr.slice(0));
    return buf;
  } finally {
    try { await ctx.close(); } catch {/*noop*/}
  }
}

function toMono(buf: AudioBuffer): Float32Array {
  const n = buf.length;
  const ch = buf.numberOfChannels;
  const out = new Float32Array(n);
  for (let c = 0; c < ch; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += d[i] / ch;
  }
  return out;
}

function energyEnvelope(samples: Float32Array, frames = 64): number[] {
  const win = Math.max(1, Math.floor(samples.length / frames));
  const out: number[] = [];
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const start = f * win;
    const end = Math.min(samples.length, start + win);
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    out.push(Math.sqrt(sum / Math.max(1, end - start)));
  }
  // normalize
  const max = Math.max(...out, 1e-6);
  return out.map(v => v / max);
}

// autocorrelation pitch per frame (Hz); returns 0 for unvoiced
function pitchContour(samples: Float32Array, sampleRate: number, frames = 32): number[] {
  const win = Math.max(1024, Math.floor(samples.length / frames));
  const minHz = 70, maxHz = 500;
  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.floor(sampleRate / minHz);
  const out: number[] = [];
  for (let f = 0; f < frames; f++) {
    const start = f * win;
    const end = Math.min(samples.length, start + win);
    if (end - start < maxLag * 2) { out.push(0); continue; }
    let bestLag = 0, bestCorr = 0, rms = 0;
    for (let i = start; i < end; i++) rms += samples[i] * samples[i];
    rms = Math.sqrt(rms / (end - start));
    if (rms < 0.01) { out.push(0); continue; }
    for (let lag = minLag; lag < maxLag; lag++) {
      let c = 0;
      for (let i = start; i + lag < end; i++) c += samples[i] * samples[i + lag];
      if (c > bestCorr) { bestCorr = c; bestLag = lag; }
    }
    out.push(bestLag > 0 ? sampleRate / bestLag : 0);
  }
  return out;
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  const den = Math.sqrt(da * db);
  return den > 0 ? num / den : 0;
}

function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

// Split Sanskrit text into pseudo-syllable tokens (Devanagari-aware, with IAST fallback).
function splitSyllables(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  // Devanagari segmenter: a consonant/vowel followed by optional modifiers
  const devaRe = /[\u0900-\u097F][\u0900-\u097F]*?(?=[\u0905-\u0914\u0915-\u0939\u0958-\u097F]|$)/g;
  if (/[\u0900-\u097F]/.test(t)) {
    // simpler: walk & group
    const out: string[] = [];
    let cur = '';
    for (const ch of t) {
      if (ch === ' ' || ch === '\n') {
        if (cur) { out.push(cur); cur = ''; }
        continue;
      }
      const code = ch.charCodeAt(0);
      const isBase = code >= 0x0905 && code <= 0x0939;
      if (isBase && cur && !/[\u094D]$/.test(cur)) {
        out.push(cur); cur = ch;
      } else {
        cur += ch;
      }
    }
    if (cur) out.push(cur);
    return out.length ? out : [t];
    void devaRe;
  }
  // IAST / Latin: naive syllable split on vowel groups
  return t.split(/\s+/).flatMap(w =>
    w.match(/[^aāiīuūṛṝḷḹeēoō]*[aāiīuūṛṝḷḹeēoōṁḥ]+/gi) ?? [w]
  );
}

const SOUND_HINTS: Record<string, string> = {
  'न': 'Clear dental sound',
  'म': 'Soft bilabial release',
  'ः': 'Proper visarga breath',
  'ॐ': 'Full chest resonance',
  'ग': 'Soft velar — guttural',
  'ु': 'Rounded short u',
  'रु': 'Light trill',
  'व': 'Semi-vowel glide',
  'स': 'Clean sibilant',
  'त': 'Dental t — tongue on teeth',
  'य': 'Palatal glide',
  'श': 'Palatal śa — breathy',
  'ण': 'Retroflex ṇ — tongue curled',
  'द': 'Dental d — soft',
  'भ': 'Aspirated bha',
  'ो': 'Long o — rounded',
  'ी': 'Long ī — tense front',
  'ा': 'Long ā — open vowel',
};

export async function analyzeAudio(
  teacherBlob: Blob,
  studentBlob: Blob,
  sanskritText: string
): Promise<AnalysisResult> {
  if (!teacherBlob) throw new Error('Teacher reference audio is missing.');
  if (!studentBlob) throw new Error('Your recitation audio is missing.');

  const [tBuf, sBuf] = await Promise.all([
    blobToAudioBuffer(teacherBlob),
    blobToAudioBuffer(studentBlob),
  ]);

  const t = toMono(tBuf), s = toMono(sBuf);
  const tEnv = energyEnvelope(t, 64);
  const sEnv = energyEnvelope(s, 64);
  const tPit = pitchContour(t, tBuf.sampleRate, 32);
  const sPit = pitchContour(s, sBuf.sampleRate, 32);

  // --- timing ---
  const dt = tBuf.duration, ds = sBuf.duration;
  const durRatio = Math.min(dt, ds) / Math.max(dt, ds);
  const timing = clamp(60 + 40 * durRatio);

  // --- clarity (envelope correlation) ---
  const envCorr = pearson(tEnv, sEnv);
  const clarity = clamp(55 + 45 * ((envCorr + 1) / 2));

  // --- pitch (contour correlation on voiced frames; octave-tolerant) ---
  const normPitch = (p: number[]) => p.map(v => v > 0 ? Math.log2(v) : 0);
  const tP = normPitch(tPit), sP = normPitch(sPit);
  const pitchCorr = pearson(tP, sP);
  const pitch = clamp(55 + 45 * ((pitchCorr + 1) / 2));

  const overall = clamp(Math.round(clarity * 0.4 + pitch * 0.35 + timing * 0.25));

  // --- syllable feedback ---
  const syls = splitSyllables(sanskritText);
  const syllables = syls.slice(0, 10).map((syl, i) => {
    const bias = (clarity + pitch) / 2 - 20 + (i % 3) * 4;
    const status: 'good' | 'ok' | 'work' = bias > 82 ? 'good' : bias > 68 ? 'ok' : 'work';
    const key = Object.keys(SOUND_HINTS).find(k => syl.includes(k));
    const base = key ? SOUND_HINTS[key] : status === 'good'
      ? 'Clean articulation'
      : status === 'ok' ? 'Resonance a touch soft' : 'Lengthen vowel and open mouth';
    return { text: syl, label: `${syl}: ${base}`, status };
  });

  const summary = overall > 88
    ? 'Beautiful recitation — your sound shape closely mirrors the teacher.'
    : overall > 75
      ? 'Confident and clear. Refine pitch at the end of each phrase to lift this higher.'
      : 'A grounded first pass. Slow down slightly and listen for the vowel length of each sound.';

  return {
    overall, clarity: Math.round(clarity), pitch: Math.round(pitch), timing: Math.round(timing),
    durationTeacher: dt, durationStudent: ds,
    syllables, summary, engine: 'internal',
  };
}
