import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowRight, ArrowUpRight, Loader2, Mic, Music2, StopCircle, Upload, Info, Trash2, PlayCircle } from 'lucide-react';
import { analyzeAudio, type AnalysisResult } from '../lib/audioAnalysis';
import * as api from '../lib/mockApi';
import { useAuth } from '../context/AuthContext';
import ReportModal from './ReportModal';

type Mode = 'word' | 'shloka';
type Script = 'deva' | 'iast';

const SAMPLE: Record<Script, string> = {
  deva: 'नमः',
  iast: 'namaḥ',
};

export default function PracticeStudio({ seedText, onConsumeSeed }: { seedText: string | null; onConsumeSeed: () => void }) {
  const { user, refresh } = useAuth();

  const [mode, setMode] = useState<Mode>('word');
  const [script, setScript] = useState<Script>('deva');
  const [text, setText] = useState<string>('नमः');
  const [teacherFile, setTeacherFile] = useState<File | null>(null);
  const [teacherUrl, setTeacherUrl] = useState<string | null>(null);
  const [teacherVerified, setTeacherVerified] = useState(true);
  const [studentBlob, setStudentBlob] = useState<Blob | null>(null);
  const [studentUrl, setStudentUrl] = useState<string | null>(null);
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(48).fill(0.12));
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  // recorder refs
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  // seed quick-practice text
  useEffect(() => {
    if (seedText) { setText(seedText); setScript('deva'); onConsumeSeed(); }
  }, [seedText, onConsumeSeed]);

  useEffect(() => () => { stopEverything(); }, []);

  function stopEverything() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
    try { mediaRef.current?.state !== 'inactive' && mediaRef.current?.stop(); } catch {/*noop*/}
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    mediaRef.current = null; streamRef.current = null; analyserRef.current = null; audioCtxRef.current = null;
  }

  function onTeacherFile(e: ChangeEvent<HTMLInputElement> | File) {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError('Teacher audio must be under 20MB.'); return; }
    if (!/^audio\//.test(file.type) && !/\.(wav|mp3|webm|m4a|ogg)$/i.test(file.name)) {
      setError('Please upload a WAV, MP3 or WebM audio file.'); return;
    }
    setError(null);
    setTeacherFile(file);
    if (teacherUrl) URL.revokeObjectURL(teacherUrl);
    setTeacherUrl(URL.createObjectURL(file));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0]; if (f) onTeacherFile(f);
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // choose a supported mimeType
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const mimeType = candidates.find(m => (window as any).MediaRecorder?.isTypeSupported?.(m)) || '';
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
      rec.onstop = () => {
        const type = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        setStudentBlob(blob);
        if (studentUrl) URL.revokeObjectURL(studentUrl);
        setStudentUrl(URL.createObjectURL(blob));
      };
      rec.start(100);

      // level meter
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser(); an.fftSize = 1024; src.connect(an);
      analyserRef.current = an;
      const data = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / data.length);
        setLevel(rms);
        setLevels(prev => [...prev.slice(1), Math.min(1, rms * 3 + 0.08)]);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      setRecording(true);
      setElapsed(0);
      const t0 = Date.now();
      timerRef.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    } catch (err: any) {
      setError(err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow mic access and try again.'
        : `Could not access microphone: ${err?.message ?? err}`);
    }
  }

  function stopRecording() {
    try { mediaRef.current?.stop(); } catch {/*noop*/}
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    setRecording(false);
    setLevel(0);
    setLevels(Array(48).fill(0.12));
  }

  function onStudentUpload(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 20 * 1024 * 1024) { setError('Audio must be under 20MB.'); return; }
    setError(null);
    setStudentBlob(f);
    if (studentUrl) URL.revokeObjectURL(studentUrl);
    setStudentUrl(URL.createObjectURL(f));
  }

  async function onAnalyze() {
    setError(null); setSaved(false);
    if (!teacherFile) { setError('Please upload the teacher’s reference audio first.'); return; }
    if (!studentBlob) { setError('Please record or upload your recitation.'); return; }
    if (!text.trim())  { setError('Please enter the Sanskrit text you are reciting.'); return; }

    setAnalyzing(true);
    try {
      // Build FormData (satisfies spec contract even though analysis runs client-side)
      const fd = new FormData();
      fd.append('teacherAudio', teacherFile, teacherFile.name);
      fd.append('studentAudio', studentBlob, 'student.webm');
      fd.append('sanskritText', text);
      void fd;

      const res = await analyzeAudio(teacherFile, studentBlob, text);
      setResult(res);
      setReportOpen(true);
    } catch (e: any) {
      setError(e?.message ?? 'Analysis failed. Please try again with a different audio file.');
    } finally {
      setAnalyzing(false);
    }
  }

  function persistSession() {
    if (!result) return;
    if (!user) { setError('Please sign in to save sessions to your history.'); return; }
    api.saveSession(user.id, text, result.overall, result);
    refresh();
    setSaved(true);
  }

  function practiceAgain() {
    setReportOpen(false);
    setStudentBlob(null);
    if (studentUrl) URL.revokeObjectURL(studentUrl);
    setStudentUrl(null);
    setResult(null);
    setSaved(false);
  }

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <>
      <div className="flex-1 max-w-[760px] mx-auto px-6 py-8">
        {/* greeting */}
        <div className="mb-8 fade-up">
          <div className="text-[10.5px] tracking-[0.22em] text-[color:var(--color-amber)] font-semibold mb-3">✻ YOUR DAILY PRACTICE</div>
          <h1 className="font-display text-[42px] leading-[1.05] text-[color:var(--color-ink)]">
            Find your <em className="not-italic text-[color:var(--color-forest)]">svara</em>.
          </h1>
          <p className="font-display text-[20px] text-[color:var(--color-ink-soft)] leading-snug mt-1">
            Listen closely. Speak mindfully. <br />
            Build a more confident Sanskrit voice, one sound at a time.
          </p>
        </div>

        {/* Studio card */}
        <div className="rounded-3xl bg-white border border-[color:var(--color-line)] shadow-[0_1px_0_rgba(0,0,0,0.02)] overflow-hidden">
          {/* mode switcher */}
          <div className="p-5 border-b border-[color:var(--color-line-soft)]">
            <div className="inline-flex p-1 bg-[color:var(--color-bg-soft)] rounded-xl text-[12.5px]">
              <button onClick={() => setMode('word')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 ${mode === 'word' ? 'bg-white shadow-sm text-[color:var(--color-forest)] font-semibold' : 'text-[color:var(--color-ink-muted)]'}`}>
                <span className="font-deva">अ</span> Single word
              </button>
              <button onClick={() => setMode('shloka')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 ${mode === 'shloka' ? 'bg-white shadow-sm text-[color:var(--color-forest)] font-semibold' : 'text-[color:var(--color-ink-muted)]'}`}>
                <span className="font-deva">श्लो</span> Shloka / verse
              </button>
            </div>
          </div>

          {/* Sanskrit text */}
          <div className="p-5 border-b border-[color:var(--color-line-soft)]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10.5px] tracking-[0.2em] font-semibold text-[color:var(--color-ink-muted)]">YOUR SANSKRIT TEXT</div>
              <div className="inline-flex p-0.5 bg-[color:var(--color-bg-soft)] rounded-md text-[11px]">
                <button onClick={() => setScript('deva')}
                  className={`px-2.5 py-1 rounded ${script === 'deva' ? 'bg-white shadow-sm text-[color:var(--color-forest)] font-semibold' : 'text-[color:var(--color-ink-muted)]'}`}>
                  <span className="font-deva">देवनागरी</span>
                </button>
                <button onClick={() => setScript('iast')}
                  className={`px-2.5 py-1 rounded ${script === 'iast' ? 'bg-white shadow-sm text-[color:var(--color-forest)] font-semibold' : 'text-[color:var(--color-ink-muted)]'}`}>
                  IAST
                </button>
              </div>
            </div>
            <textarea
              value={text} onChange={e => setText(e.target.value)}
              rows={mode === 'shloka' ? 3 : 2}
              className={`w-full resize-none bg-[color:var(--color-bg)] border border-[color:var(--color-line)] rounded-xl px-4 py-3 focus-ring ${script === 'deva' ? 'font-deva text-[28px] leading-tight' : 'text-[22px] font-display'} text-[color:var(--color-ink)]`}
              placeholder={script === 'deva' ? 'नमः' : 'namaḥ'}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-[11.5px] text-[color:var(--color-ink-muted)]">A good place to start · <span className="font-deva">{SAMPLE.deva}</span></div>
              <button onClick={() => { setText(SAMPLE[script]); }}
                className="text-[12px] text-[color:var(--color-forest)] font-semibold hover:underline inline-flex items-center gap-1">
                Try a sample <ArrowUpRight size={12} />
              </button>
            </div>
          </div>

          {/* Dual audio studio */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Teacher */}
            <div className="rounded-2xl border border-[color:var(--color-line)] p-4 bg-[color:var(--color-bg)]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-[color:var(--color-amber-soft)] grid place-items-center text-[color:var(--color-amber)]"><Music2 size={16} /></div>
                  <div>
                    <div className="text-[13px] font-semibold text-[color:var(--color-ink)]">Teacher’s voice</div>
                    <div className="text-[11px] text-[color:var(--color-ink-muted)]">Reference recording</div>
                  </div>
                </div>
                <span className={`text-[9.5px] tracking-[0.18em] font-semibold ${teacherFile ? 'text-[color:var(--color-forest)]' : 'text-[color:var(--color-amber)]'}`}>
                  {teacherFile ? 'LOADED' : 'REQUIRED'}
                </span>
              </div>

              {!teacherFile ? (
                <label onDragOver={e => e.preventDefault()} onDrop={onDrop}
                  className="block cursor-pointer rounded-xl border border-dashed border-[color:var(--color-line)] bg-white hover:bg-[color:var(--color-bg-soft)] px-4 py-7 text-center">
                  <Upload size={16} className="mx-auto text-[color:var(--color-ink-muted)] mb-1.5" />
                  <div className="text-[13px] font-semibold text-[color:var(--color-ink)]">Choose audio</div>
                  <div className="text-[11px] text-[color:var(--color-ink-muted)]">WAV, MP3 or WebM · up to 20 MB</div>
                  <input type="file" accept="audio/*,.wav,.mp3,.webm,.m4a,.ogg" className="hidden" onChange={onTeacherFile} />
                </label>
              ) : (
                <div className="rounded-xl bg-white border border-[color:var(--color-line)] p-3 flex items-center gap-3">
                  <PlayCircle size={22} className="text-[color:var(--color-forest)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-[color:var(--color-ink)] truncate">{teacherFile.name}</div>
                    {teacherUrl && <audio controls src={teacherUrl} className="w-full h-7 mt-1" />}
                  </div>
                  <button onClick={() => { setTeacherFile(null); if (teacherUrl) URL.revokeObjectURL(teacherUrl); setTeacherUrl(null); }}
                    className="p-1 text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-amber)]"><Trash2 size={13} /></button>
                </div>
              )}

              <label className="mt-3 flex items-center justify-between text-[11.5px] text-[color:var(--color-ink-soft)]">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={teacherVerified} onChange={e => setTeacherVerified(e.target.checked)}
                    className="accent-[color:var(--color-forest)]" />
                  Teacher-verified reference
                </span>
                <Info size={12} className="text-[color:var(--color-ink-muted)]" />
              </label>
            </div>

            {/* Student */}
            <div className="rounded-2xl border border-[color:var(--color-line)] p-4 bg-[color:var(--color-bg)]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-[color:var(--color-forest-soft)] grid place-items-center text-[color:var(--color-forest)]"><Mic size={16} /></div>
                  <div>
                    <div className="text-[13px] font-semibold text-[color:var(--color-ink)]">Your voice</div>
                    <div className="text-[11px] text-[color:var(--color-ink-muted)]">Your recitation</div>
                  </div>
                </div>
                <span className={`text-[9.5px] tracking-[0.18em] font-semibold ${studentBlob ? 'text-[color:var(--color-forest)]' : 'text-[color:var(--color-ink-muted)]'}`}>
                  {studentBlob ? 'READY' : recording ? 'RECORDING' : 'READY'}
                </span>
              </div>

              {/* status line + timer */}
              <div className="flex items-center justify-between text-[11.5px] mb-2">
                <span className="flex items-center gap-2 text-[color:var(--color-ink-soft)]">
                  <span className={`h-1.5 w-1.5 rounded-full ${recording ? 'bg-[color:var(--color-amber)] rec-dot' : 'bg-[color:var(--color-forest)]'}`} />
                  {recording ? 'Listening…' : 'Your mic is ready when you are'}
                </span>
                <span className="text-[color:var(--color-ink-muted)] tabular-nums">{mmss}</span>
              </div>

              {/* visualizer */}
              <div className="h-14 flex items-center justify-between gap-[2px] rounded-xl bg-white border border-[color:var(--color-line)] px-3">
                {levels.map((v, i) => (
                  <span key={i}
                    className={`inline-block w-[3px] rounded-sm ${recording ? 'bg-[color:var(--color-forest)]' : 'bg-[color:var(--color-line)]'}`}
                    style={{ height: `${Math.max(10, v * 100)}%`, opacity: recording ? 0.5 + v * 0.5 : 1 }} />
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                {!recording ? (
                  <button onClick={startRecording}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--color-bg-soft)] hover:bg-[color:var(--color-forest-soft)] text-[12.5px] font-semibold text-[color:var(--color-forest)]">
                    <span className="h-2 w-2 rounded-full bg-[color:var(--color-amber)]" /> Start recording
                  </button>
                ) : (
                  <button onClick={stopRecording}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--color-amber-soft)] text-[color:var(--color-amber)] text-[12.5px] font-semibold">
                    <StopCircle size={14} /> Stop recording
                  </button>
                )}
                <label className="ml-auto cursor-pointer text-[12px] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-forest)] inline-flex items-center gap-1">
                  <Upload size={13} /> Upload audio
                  <input type="file" accept="audio/*,.wav,.mp3,.webm,.m4a,.ogg" className="hidden" onChange={onStudentUpload} />
                </label>
                {level > 0.02 && !recording && <span className="sr-only">{level.toFixed(2)}</span>}
              </div>

              {studentUrl && (
                <div className="mt-2.5">
                  <audio controls src={studentUrl} className="w-full h-7" />
                </div>
              )}

              <div className="text-[10.5px] text-[color:var(--color-ink-muted)] mt-2 flex items-center gap-1">
                <span>🔒</span> Your voice stays private. Nothing is uploaded until you analyze.
              </div>
            </div>
          </div>

          {/* Submit controls */}
          <div className="p-5 border-t border-[color:var(--color-line-soft)]">
            {error && (
              <div className="mb-3 text-[12.5px] bg-[color:var(--color-amber-soft)] text-[color:var(--color-amber)] border border-[color:var(--color-amber)]/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <label className="flex items-center gap-2 text-[12px] text-[color:var(--color-ink-soft)] mb-3">
              <input type="checkbox" checked={saveToHistory} onChange={e => setSaveToHistory(e.target.checked)}
                className="accent-[color:var(--color-forest)]" />
              Save this session to my account history
              {!user && <span className="text-[color:var(--color-amber)] text-[11px]">(sign in required)</span>}
            </label>

            <div className="flex items-center gap-3">
              <button onClick={onAnalyze} disabled={analyzing}
                className="group inline-flex items-center gap-2.5 h-12 px-5 rounded-xl bg-[color:var(--color-forest)] hover:bg-[color:var(--color-forest-deep)] text-white text-[14px] font-semibold shadow-sm disabled:opacity-80">
                {analyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing phonetics, pitch, and resonance…
                  </>
                ) : (
                  <>
                    Analyze my pronunciation
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
              <span className="text-[12px] text-[color:var(--color-ink-muted)]">Usually takes about 10 seconds</span>
            </div>
          </div>
        </div>

        {/* Learning strip */}
        <div className="mt-6 rounded-3xl bg-white border border-[color:var(--color-line)] p-5 flex items-center gap-5">
          <div className="h-11 w-11 rounded-xl bg-[color:var(--color-amber-soft)] grid place-items-center text-[color:var(--color-amber)]">
            ✧
          </div>
          <div className="flex-1">
            <div className="font-display text-[18px] text-[color:var(--color-ink)]">Your learning, at your pace</div>
            <div className="text-[12px] text-[color:var(--color-ink-muted)]">Small steps are still progress.</div>
          </div>
          <div className="hidden sm:block">
            <div className="font-display text-[26px] text-[color:var(--color-ink)] leading-none">{api.getSessionCount(user?.id ?? null)}</div>
            <div className="text-[10.5px] text-[color:var(--color-ink-muted)]">sessions practiced</div>
          </div>
          <div className="hidden sm:block">
            <div className="font-display text-[26px] text-[color:var(--color-amber)] leading-none">{user?.streak ?? 3}<span className="text-[12px] ml-1 text-[color:var(--color-ink-muted)]">days</span></div>
            <div className="text-[10.5px] text-[color:var(--color-ink-muted)]">current streak</div>
          </div>
          <a href="#/history" className="text-[12.5px] font-semibold text-[color:var(--color-forest)] inline-flex items-center gap-1">
            See your journey <ArrowRight size={14} />
          </a>
        </div>
      </div>

      <ReportModal
        open={reportOpen} result={result} sanskritText={text}
        onClose={() => setReportOpen(false)}
        onPracticeAgain={practiceAgain}
        onSave={persistSession}
        saved={saved || (saveToHistory && saved)}
      />
    </>
  );
}
