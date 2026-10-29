import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, BadgeCheck, Bell, BookOpenCheck, Check, Code2, MessagesSquare, RotateCcw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import type { SolutionHit } from '@sos/shared';
import { getRecentSolutions, getStats } from './api.js';
import { AfricaMap } from './AfricaMap.js';
import { Logo } from './Logo.js';
import { ThemeButton } from './ui.js';

interface Scenario {
  tab: string;
  file: string;
  bad: string;
  good: string;
  error: string;
  asker: string;
  helper: string;
  helperCity: string;
  fiche: string;
}

const SCENARIOS: Scenario[] = [
  {
    tab: 'JavaScript', file: 'users.js',
    bad: '`Bonjour ${user.name.toUpperCase()} !`', good: "`Bonjour ${(user.name ?? 'ami').toUpperCase()} !`",
    error: "TypeError: Cannot read properties of undefined (reading 'toUpperCase')",
    asker: 'Awa', helper: 'Koffi', helperCity: 'Dakar', fiche: 'Cannot read properties of undefined',
  },
  {
    tab: 'Python', file: 'moyenne.py',
    bad: 'total = sum(prix) / len(prix)', good: 'total = sum(prix) / max(len(prix), 1)',
    error: 'ZeroDivisionError: division by zero',
    asker: 'Tunde', helper: 'Ama', helperCity: 'Accra', fiche: 'ZeroDivisionError : liste vide',
  },
  {
    tab: 'SQL', file: 'requete.sql',
    bad: 'SELECT nom, COUNT(*) FROM clients;', good: 'SELECT nom, COUNT(*) FROM clients GROUP BY nom;',
    error: 'ERROR: column "clients.nom" must appear in the GROUP BY clause',
    asker: 'Yann', helper: 'Grâce', helperCity: 'Kinshasa', fiche: 'GROUP BY manquant',
  },
];

/** Adds `in` once the element scrolls into view, so sections can animate in. */
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setSeen(true);
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`lp-reveal ${seen ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

/** Counts up to `to` the first time it is visible. */
function Count({ to }: { to: number }) {
  const ref = useRef<HTMLElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setN(to);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1200);
        setN(Math.round(to * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <b ref={ref}>{n}</b>;
}

/** Types `text` out while `on` is true. */
function Typed({ text, on, speed = 22 }: { text: string; on: boolean; speed?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return setN(0);
    const t = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed);
    return () => clearInterval(t);
  }, [on, text, speed]);
  return <>{text.slice(0, n)}</>;
}

/** The whole product in 12 seconds: an error, an alert, a helper joins, the fix, the green test, the fiche. */
function LiveRoom() {
  const [pick, setPick] = useState(0);
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);
  const s = SCENARIOS[pick]!;

  useEffect(() => {
    setStep(0);
    const at = [1900, 3300, 4800, 6700, 8100];
    const timers = at.map((ms, k) => setTimeout(() => setStep(k + 1), ms));
    const loop = setTimeout(() => setRun((r) => r + 1), 13500);
    return () => { timers.forEach(clearTimeout); clearTimeout(loop); };
  }, [pick, run]);

  const choose = (k: number) => { setPick(k); setRun((r) => r + 1); };

  return (
    <div className="lp-room" aria-label="Démonstration : une aide en direct">
      <div className="lp-room-tabs" role="tablist" aria-label="Choisis une erreur">
        {SCENARIOS.map((x, k) => (
          <button key={x.tab} type="button" role="tab" aria-selected={k === pick} className={k === pick ? 'on' : ''} onClick={() => choose(k)}>{x.tab}</button>
        ))}
        <button type="button" className="lp-replay" onClick={() => setRun((r) => r + 1)} aria-label="Rejouer la démonstration"><RotateCcw size={15} /></button>
      </div>

      <div className="lp-win">
        <div className="lp-win-bar"><i /><i /><i /><span>{s.file}</span>{step >= 2 && <em className="lp-presence"><b>{s.asker[0]}</b><b className="h">{s.helper[0]}</b></em>}</div>
        <div className="lp-code">
          <div className={`lp-line ${step >= 4 ? 'fixed' : ''}`} key={step >= 4 ? 'g' : 'b'}>{step >= 4 ? s.good : s.bad}</div>
          {step >= 3 && step < 4 && <span className="lp-cursor"><Typed text={s.helper} on speed={60} /></span>}
          {step < 5 ? (
            <div className={`lp-err ${step >= 5 ? 'gone' : ''}`}><Typed text={step >= 5 ? '' : s.error} on speed={18} /></div>
          ) : null}
          {step >= 5 && <div className="lp-ok"><Check size={18} /> 1 test passé · c’est vert</div>}
        </div>
      </div>

      <div className="lp-feed">
        <p className={`lp-ev ${step >= 1 ? 'in' : ''}`}><Bell size={16} /> Alerte envoyée aux aidants disponibles</p>
        <p className={`lp-ev ${step >= 2 ? 'in' : ''}`}><UserPlus size={16} /> <b>{s.helper}</b> · {s.helperCity} rejoint la salle de {s.asker}</p>
        <p className={`lp-ev gold ${step >= 5 ? 'in' : ''}`}><BadgeCheck size={16} /> Fiche « {s.fiche} » créée · +1 preuve au Passeport de {s.helper}</p>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Code2, title: 'Salle de code partagée', text: 'Même écran, même code, un chat et un bouton pour lancer le test ensemble.' },
  { icon: BookOpenCheck, title: 'Fiches confirmées', text: 'Chaque aide résolue devient une fiche : cause, correctif, avant et après.' },
  { icon: BadgeCheck, title: 'Passeport vérifiable', text: 'Ceux qui aident gagnent des preuves, rassemblées dans un Passeport avec QR code.' },
  { icon: MessagesSquare, title: 'Salons par techno', text: 'JavaScript, Python, PHP, DevOps… Discute, partage, suis ceux qui t’inspirent.' },
  { icon: Users, title: 'Projets et coéquipiers', text: 'Présente ton projet, dis quels profils te manquent et trouve des gens pour le construire.' },
  { icon: ShieldCheck, title: 'Secrets masqués', text: 'Mots de passe et clés sont effacés avant tout envoi. Rien de sensible ne sort.' },
];

/** Public front page for visitors who are not signed in. */
export function Landing({ dark, toggleTheme }: { dark: boolean; toggleTheme: () => void }) {
  const [stats, setStats] = useState<{ fiches: number; aides: number; confirmees: number; aidants: number } | null>(null);
  const [fiches, setFiches] = useState<SolutionHit[]>([]);
  useEffect(() => {
    getStats().then(setStats, () => undefined);
    getRecentSolutions().then((l) => setFiches(l.slice(0, 12)), () => undefined);
  }, []);

  // The glow in the hero follows the pointer.
  const glow = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div className="lp">
      <header className="lp-nav">
        <a href="#/" aria-label="KoraDevs, accueil"><Logo size={32} /></a>
        <nav className="lp-nav-right">
          <ThemeButton dark={dark} toggle={toggleTheme} />
          <a className="btn btn-ghost" href="#/connexion">Se connecter</a>
          <a className="btn btn-primary" href="#/inscription">Créer un compte</a>
        </nav>
      </header>

      <main id="main">
        <section className="lp-hero" onPointerMove={glow}>
          <div className="lp-hero-text">
            <span className="lp-pill">Concours Systalink CADEV 2026</span>
            <h1>Un bug te bloque ? <em>Quelqu’un te rejoint en direct.</em></h1>
            <p>
              KoraDevs est une plateforme d’entraide pour les développeurs africains : un aidant entre dans ta salle de code, vous corrigez ensemble, et chaque solution devient une fiche que tous retrouvent.
            </p>
            <div className="lp-cta">
              <a className="btn btn-primary btn-lg" href="#/inscription">Rejoindre KoraDevs <ArrowRight size={18} /></a>
              <a className="btn btn-soft btn-lg" href="#/connexion">J’ai déjà un compte</a>
            </div>
            <p className="lp-hint">À droite, c’est l’application pour de vrai. Choisis une erreur.</p>
          </div>
          <LiveRoom />
        </section>

        {stats && (
          <Reveal>
            <section className="lp-stats" aria-label="Chiffres du moment">
              <div><Count to={stats.fiches} /><span>fiches de solutions</span></div>
              <div><Count to={stats.aides} /><span>aides données</span></div>
              <div><Count to={stats.confirmees} /><span>confirmées par un test</span></div>
              <div><Count to={stats.aidants} /><span>aidants</span></div>
            </section>
          </Reveal>
        )}

        {fiches.length > 0 && (
          <section className="lp-section">
            <Reveal><h2>Ton erreur a peut-être déjà une réponse</h2></Reveal>
            <div className="lp-marquee" aria-label="Fiches récentes">
              <div className="lp-track">
                {[...fiches, ...fiches].map((f, k) => (
                  <a key={`${f.id}-${k}`} className="lp-fiche" href="#/inscription" tabIndex={k >= fiches.length ? -1 : 0}>
                    <code>{f.error.slice(0, 60)}</code>
                    <b>{f.title}</b>
                    <span>{f.tech.slice(0, 2).join(' · ')}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="lp-section">
          <Reveal><h2>Un continent, un réseau d’aidants</h2></Reveal>
          <Reveal delay={100}><div className="lp-map"><AfricaMap /></div></Reveal>
        </section>

        <section className="lp-section">
          <Reveal><h2>Tout ce qu’il faut, au même endroit</h2></Reveal>
          <div className="lp-grid">
            {FEATURES.map(({ icon: Icon, title, text }, k) => (
              <Reveal key={title} delay={k * 70}>
                <article className="lp-card" style={{ '--i': k } as CSSProperties}>
                  <Icon size={26} aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          <section className="lp-final">
            <h2>Ton prochain bug ne te bloquera pas seul.</h2>
            <a className="btn btn-neon btn-lg" href="#/inscription">Créer mon compte gratuitement <ArrowRight size={18} /></a>
          </section>
        </Reveal>
      </main>

      <footer className="lp-foot">KoraDevs · Coder l’Afrique, construire demain.</footer>
    </div>
  );
}
