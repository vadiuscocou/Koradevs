import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, BookOpenCheck, Code2, MessagesSquare, ShieldCheck } from 'lucide-react';
import { getStats } from './api.js';
import { AfricaMap } from './AfricaMap.js';
import { Logo } from './Logo.js';
import { ThemeButton } from './ui.js';

const STEPS = [
  { n: '1', title: 'Tu bloques', text: 'Tu colles ton erreur. Les mots de passe et les clés sont masqués avant tout envoi.' },
  { n: '2', title: 'Un voisin te rejoint', text: 'Un développeur disponible accepte et entre dans ta salle de code partagée, en direct.' },
  { n: '3', title: 'Le test passe au vert', text: 'La solution est confirmée par un test, puis elle devient une fiche que tout le monde retrouve.' },
];

const FEATURES = [
  { icon: Code2, title: 'Salle de code partagée', text: 'Même écran, même code, un chat et un bouton pour lancer le test ensemble.' },
  { icon: BookOpenCheck, title: 'Fiches confirmées', text: 'Chaque aide résolue devient une fiche : cause, correctif, avant et après. On la trouve, on la commente.' },
  { icon: BadgeCheck, title: 'Passeport vérifiable', text: 'Ceux qui aident gagnent des preuves, rassemblées dans un Passeport avec un QR code.' },
  { icon: MessagesSquare, title: 'Salons par techno', text: 'JavaScript, Python, PHP, DevOps… Discute, partage et suis les développeurs qui t’inspirent.' },
  { icon: ShieldCheck, title: 'Gratuit et en français', text: 'Pensé pour les développeurs africains, léger sur une connexion modeste.' },
];

/** Public front page for visitors who are not signed in. */
export function Landing({ dark, toggleTheme }: { dark: boolean; toggleTheme: () => void }) {
  const [stats, setStats] = useState<{ fiches: number; aides: number; confirmees: number; aidants: number } | null>(null);
  useEffect(() => {
    getStats().then(setStats, () => undefined);
  }, []);

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
        <section className="lp-hero">
          <div className="lp-hero-text">
            <span className="lp-pill">Concours Systalink CADEV 2026</span>
            <h1>Quand tu bloques, <em>un voisin te rejoint.</em></h1>
            <p>
              KoraDevs est le quartier des développeurs africains : l’aide arrive en direct, dans une salle de code partagée, et chaque solution devient un savoir que tous retrouvent.
            </p>
            <div className="lp-cta">
              <a className="btn btn-primary btn-lg" href="#/inscription">Rejoindre le quartier <ArrowRight size={18} /></a>
              <a className="btn btn-soft btn-lg" href="#/connexion">J’ai déjà un compte</a>
            </div>
          </div>
          <div className="lp-hero-map"><AfricaMap /></div>
        </section>

        {stats && (
          <section className="lp-stats" aria-label="Chiffres du moment">
            <div><b>{stats.fiches}</b><span>fiches de solutions</span></div>
            <div><b>{stats.aides}</b><span>aides données</span></div>
            <div><b>{stats.confirmees}</b><span>confirmées par un test</span></div>
            <div><b>{stats.aidants}</b><span>aidants</span></div>
          </section>
        )}

        <section className="lp-section">
          <h2>Comment ça marche</h2>
          <ol className="lp-steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="lp-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-section">
          <h2>Tout ce qu’il faut, au même endroit</h2>
          <div className="lp-grid">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="lp-card">
                <Icon size={26} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-final">
          <h2>Ton prochain bug sera le dernier à te bloquer seul.</h2>
          <a className="btn btn-neon btn-lg" href="#/inscription">Créer mon compte gratuitement <ArrowRight size={18} /></a>
        </section>
      </main>

      <footer className="lp-foot">KoraDevs · Coder l’Afrique, construire demain.</footer>
    </div>
  );
}
