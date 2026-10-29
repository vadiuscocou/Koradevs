import { useEffect, useState } from 'react';
import { AFRICA_DOTS, AFRICA_SIZE, CITIES } from './africa.js';

/** Pairs shown in turn: someone is stuck in the first city, a neighbour answers from the second. */
const STORIES: { from: string; to: string; who: string; helper: string; what: string }[] = [
  { from: 'Abidjan', to: 'Dakar', who: 'Awa', helper: 'Koffi', what: 'erreur Prisma' },
  { from: 'Nairobi', to: 'Kigali', who: 'Brian', helper: 'Divine', what: 'CORS bloqué' },
  { from: 'Lagos', to: 'Accra', who: 'Tunde', helper: 'Ama', what: 'build React' },
  { from: 'Douala', to: 'Kinshasa', who: 'Yann', helper: 'Grâce', what: 'migration SQL' },
  { from: 'Casablanca', to: 'Le Caire', who: 'Sara', helper: 'Omar', what: 'token JWT' },
  { from: 'Johannesburg', to: 'Dar es Salaam', who: 'Thabo', helper: 'Neema', what: 'Docker' },
];

const HELPERS = ['Dakar', 'Abidjan', 'Accra', 'Lagos', 'Douala', 'Kinshasa', 'Nairobi', 'Kigali', 'Le Caire', 'Casablanca', 'Johannesburg', 'Bamako', 'Ouagadougou', 'Lomé', 'Addis-Abeba', 'Tunis', 'Libreville', 'Luanda', 'Dar es Salaam'];

const U = 10; // one grid unit, in svg pixels

function arc(a: [number, number], b: [number, number]): string {
  const [x1, y1] = [a[0] * U, a[1] * U];
  const [x2, y2] = [b[0] * U, b[1] * U];
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.35;
  return `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
}

/** A living map of the continent: neighbours light up, a request goes out, a helper answers. Decorative. */
export function AfricaMap() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % STORIES.length), 4200);
    return () => clearInterval(t);
  }, []);
  const s = STORIES[i]!;
  const a = CITIES[s.from]!;
  const b = CITIES[s.to]!;
  return (
    <div className="amap" aria-hidden="true">
      <svg viewBox={`-10 -10 ${AFRICA_SIZE.w * U + 20} ${AFRICA_SIZE.h * U + 20}`} className="amap-svg">
        <g className="amap-dots">
          {AFRICA_DOTS.map(([x, y], k) => (
            <circle key={k} cx={x * U} cy={y * U} r="2.1" />
          ))}
        </g>
        {HELPERS.map((c) => (
          <circle key={c} className="amap-helper" cx={CITIES[c]![0] * U} cy={CITIES[c]![1] * U} r="3.4" />
        ))}
        <g key={i}>
          <path className="amap-line" d={arc(a, b)} pathLength={1} />
          <circle className="amap-ask" cx={a[0] * U} cy={a[1] * U} r="5" />
          <circle className="amap-ring" cx={a[0] * U} cy={a[1] * U} r="5" />
          <circle className="amap-ok" cx={b[0] * U} cy={b[1] * U} r="6" />
          <circle className="amap-ring r2" cx={b[0] * U} cy={b[1] * U} r="6" />
        </g>
      </svg>
      <div className="amap-card" key={`c${i}`}>
        <span className="amap-live"><i /> en direct</span>
        <p><b>{s.who}</b> · {s.from} <span>bloque sur « {s.what} »</span></p>
        <p className="ok">✓ <b>{s.helper}</b> · {s.to} le rejoint</p>
      </div>
    </div>
  );
}
