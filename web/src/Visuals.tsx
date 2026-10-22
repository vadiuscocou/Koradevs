import { useEffect, useMemo, useRef, useState } from 'react';

/** A miniature of the product: two people fixing a bug together, the test turning green. Pure CSS, no image. */
export function CodeScene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene-win">
        <div className="scene-bar">
          <i />
          <i />
          <i />
          <span>users.js</span>
          <em>en direct</em>
        </div>
        <div className="scene-code">
          <p><b>export const</b> greet = (u) =&gt;</p>
          <p className="bug">  u.name.toUpperCase();</p>
          <p className="fix">  u?.name?.toUpperCase() ?? 'ami';</p>
        </div>
        <span className="cur c1">@awa</span>
        <span className="cur c2">@koffi</span>
        <div className="scene-test">
          <span className="ko">✗ le test échoue</span>
          <span className="ok">✓ test confirmé</span>
        </div>
      </div>
    </div>
  );
}

const COLORS = ['#4df08c', '#12a150', '#dff6e8', '#f9d56e', '#7cc4f7', '#ff9c8a'];

/** One burst of confetti from the top centre. The parent remounts it (new `key`) to fire it again. */
export function Confetti({ pieces = 48 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        angle: Math.random() * 360,
        distance: 140 + Math.random() * 260,
        size: 6 + Math.random() * 7,
        color: COLORS[i % COLORS.length]!,
        delay: Math.random() * 0.25,
        spin: Math.random() * 900 - 450,
      })),
    [pieces],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {items.map((p, i) => (
        <span
          key={i}
          style={
            {
              '--a': `${p.angle}deg`,
              '--d': `${p.distance}px`,
              '--s': `${p.size}px`,
              '--c': p.color,
              '--t': `${p.delay}s`,
              '--r': `${p.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Number that counts up from 0 when it appears (and goes straight to the value if motion is reduced). */
export function CountUp({ value, ms = 900 }: { value: number; ms?: number }) {
  const [shown, setShown] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || value === 0) {
      setShown(value);
      return undefined;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, ms]);

  return <>{shown}</>;
}

/** Check mark that draws itself. */
export function DrawnCheck({ size = 72 }: { size?: number }) {
  return (
    <svg className="drawn-check" width={size} height={size} viewBox="0 0 52 52" aria-hidden="true">
      <circle className="ring" cx="26" cy="26" r="23" fill="none" strokeWidth="3" />
      <path className="tick" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M15 27l8 8 14-16" />
    </svg>
  );
}
