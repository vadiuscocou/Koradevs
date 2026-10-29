import { useEffect, useState } from 'react';
import { getNetwork, type NetworkInfo } from './api.js';
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

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const CITY_KEYS = Object.fromEntries(Object.entries(CITIES).map(([k, v]) => [norm(k), v]));
/** Country centres (longitude, latitude) for when the city is not one we know. */
const COUNTRIES: Record<string, [number, number]> = {
  senegal: [-14.5, 14.5], "cote d'ivoire": [-5.5, 7.5], 'cote d ivoire': [-5.5, 7.5], ghana: [-1.2, 7.9], nigeria: [8, 9.5],
  benin: [2.3, 9.3], togo: [1.2, 8.6], cameroun: [12.4, 5.7], cameroon: [12.4, 5.7], gabon: [11.8, -0.8], congo: [15.8, -0.7],
  rdc: [23.6, -2.9], 'rd congo': [23.6, -2.9], kenya: [37.9, 0.2], rwanda: [29.9, -1.9], tanzanie: [34.9, -6.4], ouganda: [32.3, 1.4],
  ethiopie: [40.5, 9.1], egypte: [30.8, 26.8], maroc: [-6.8, 31.8], tunisie: [9.5, 34], algerie: [2.6, 28], mali: [-3.5, 17.6],
  'burkina faso': [-1.6, 12.2], niger: [8, 17.6], guinee: [-10.9, 10.4], madagascar: [46.8, -19.4], 'afrique du sud': [24.7, -29],
  angola: [17.9, -12.3], mozambique: [35.5, -18.7], zambie: [27.8, -13.1], zimbabwe: [29.9, -19], burundi: [29.9, -3.4], tchad: [18.7, 15.4],
};

const place = (city: string, country: string): [number, number] | null => {
  const c = CITY_KEYS[norm(city)];
  if (c) return c;
  const g = COUNTRIES[norm(country)];
  return g ? [(g[0] + 18) / 1.6, (37.5 - g[1]) / 1.6] : null;
};

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
  const [net, setNet] = useState<NetworkInfo | null>(null);
  useEffect(() => {
    getNetwork().then(setNet, () => undefined);
  }, []);
  const real = net ? net.places.map((p) => place(p.city, p.country)).filter((p): p is [number, number] => !!p) : [];
  const live = (net?.recent ?? []).flatMap((r) => {
    const at = place(r.city, r.country);
    return at ? [{ at, helper: r.helper, title: r.title, place: r.city || r.country }] : [];
  });
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % STORIES.length), 4200);
    return () => clearInterval(t);
  }, []);
  const s = STORIES[i]!;
  const a = CITIES[s.from]!;
  const b = CITIES[s.to]!;
  const hasReal = real.length > 0;
  const proof = live.length ? live[i % live.length]! : null;
  return (
    <div className="amap" aria-hidden="true">
      <svg viewBox={`-10 -10 ${AFRICA_SIZE.w * U + 20} ${AFRICA_SIZE.h * U + 20}`} className="amap-svg">
        <g className="amap-dots">
          {AFRICA_DOTS.map(([x, y], k) => (
            <circle key={k} cx={x * U} cy={y * U} r="2.1" />
          ))}
        </g>
        {(hasReal ? real : HELPERS.map((c) => CITIES[c]!)).map(([x, y], k) => (
          <circle key={k} className="amap-helper" cx={x * U} cy={y * U} r="3.4" />
        ))}
        {proof && hasReal && (
          <g key={`p${i}`}>
            <circle className="amap-ok" style={{ animationDelay: '0.2s' }} cx={proof.at[0] * U} cy={proof.at[1] * U} r="6" />
            <circle className="amap-ring r2" style={{ animationDelay: '0.2s' }} cx={proof.at[0] * U} cy={proof.at[1] * U} r="6" />
          </g>
        )}
        {!hasReal && <g key={i}>
          <path className="amap-line" d={arc(a, b)} pathLength={1} />
          <circle className="amap-ask" cx={a[0] * U} cy={a[1] * U} r="5" />
          <circle className="amap-ring" cx={a[0] * U} cy={a[1] * U} r="5" />
          <circle className="amap-ok" cx={b[0] * U} cy={b[1] * U} r="6" />
          <circle className="amap-ring r2" cx={b[0] * U} cy={b[1] * U} r="6" />
        </g>}
      </svg>
      <div className="amap-card" key={`c${i}`}>
        {hasReal ? (
          <>
            <span className="amap-live"><i /> {real.length} aidant{real.length > 1 ? 's' : ''} à leur porte</span>
            {proof ? (
              <p className="ok" style={{ animationDelay: '0.2s' }}>✓ <b>@{proof.helper}</b>{proof.place ? ` · ${proof.place}` : ''} <span>a résolu « {proof.title} »</span></p>
            ) : (
              <p><span>Chaque point est un développeur prêt à aider.</span></p>
            )}
          </>
        ) : (
          <>
            <span className="amap-live"><i /> exemple</span>
            <p><b>{s.who}</b> · {s.from} <span>bloque sur « {s.what} »</span></p>
            <p className="ok">✓ <b>{s.helper}</b> · {s.to} le rejoint</p>
          </>
        )}
      </div>
    </div>
  );
}
