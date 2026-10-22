import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { diffLines } from './diff.js';
import type { ReplayFile } from './api.js';

const STEP_MS = 650;

/** « Avant / après » of a fiche: a line diff that can be replayed change by change. */
export function Replay({ files }: { files: ReplayFile[] }) {
  const [index, setIndex] = useState(0);
  const file = files[index] ?? files[0]!;
  const ops = useMemo(() => diffLines(file.before, file.after), [file]);
  const total = ops.filter((o) => o.kind !== 'same').length;
  const [step, setStep] = useState(total);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setStep(total);
    setPlaying(false);
  }, [total, file]);

  useEffect(() => {
    window.clearInterval(timer.current);
    if (!playing) return undefined;
    timer.current = window.setInterval(() => {
      setStep((s) => {
        if (s + 1 >= total) setPlaying(false);
        return Math.min(total, s + 1);
      });
    }, STEP_MS);
    return () => window.clearInterval(timer.current);
  }, [playing, total]);

  const start = () => {
    setStep(0);
    setPlaying(true);
  };

  let change = 0;
  return (
    <section className="col" style={{ gap: 10 }}>
      <div className="row between wrap">
        <div className="block-label" style={{ margin: 0 }}>Avant / après</div>
        <div className="row">
          {files.length > 1 &&
            files.map((f, i) => (
              <button key={f.path} type="button" className={`chip ${i === index ? 'on' : ''}`} onClick={() => setIndex(i)}>{f.path}</button>
            ))}
          {playing ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPlaying(false)}><Pause size={14} /> Pause</button>
          ) : (
            <button type="button" className="btn btn-soft btn-sm" onClick={start}>
              {step >= total && total > 0 ? <RotateCcw size={14} /> : <Play size={14} />} Rejouer la correction
            </button>
          )}
        </div>
      </div>
      <div className="diff" role="img" aria-label={`Différences dans ${file.path}`}>
        <div className="diff-head mono">{file.path} · {total} ligne{total > 1 ? 's' : ''} modifiée{total > 1 ? 's' : ''}</div>
        <pre>
          {ops.map((op, i) => {
            if (op.kind === 'same') return <div key={i} className="dl same"><span className="g"> </span>{op.text || ' '}</div>;
            const mine = change++;
            const applied = mine < step;
            if (op.kind === 'add' && !applied) return null;
            return (
              <div key={i} className={`dl ${op.kind === 'del' ? (applied ? 'del' : 'same') : 'add'} ${mine === step - 1 && playing ? 'flash' : ''}`}>
                <span className="g">{op.kind === 'del' ? (applied ? '−' : ' ') : '+'}</span>
                {op.text || ' '}
              </div>
            );
          })}
        </pre>
      </div>
    </section>
  );
}
