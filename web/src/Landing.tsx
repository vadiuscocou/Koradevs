import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Bell, BookOpen, Check, Code2, Fingerprint, LifeBuoy, Lock, Play, ShieldCheck, Smartphone, Users } from 'lucide-react';
import type { SolutionHit } from '@sos/shared';
import { getRecentSolutions, getStats } from './api.js';
import { Logo } from './Logo.js';
import { ThemeButton } from './ui.js';
import { CodeScene, CountUp } from './Visuals.js';

const STEPS = [
  { icon: LifeBuoy, title: 'Tu colles ton erreur', text: 'Ton message d’erreur et ton code. Les mots de passe et les clés sont masqués avant l’envoi, tu vois exactement ce qui part.' },
  { icon: Users, title: 'Un voisin te rejoint', text: 'Un développeur qui connaît ta techno reçoit l’alerte en direct. Même si personne n’est là, ta demande reste ouverte et on te prévient.' },
  { icon: Play, title: 'Vous corrigez ensemble', text: 'Une salle de code partagée en direct, un chat, et un bouton pour exécuter le code. Le test passe au vert devant vous deux.' },
  { icon: BadgeCheck, title: 'Tout le monde y gagne', text: 'La solution devient une fiche que les suivants retrouvent. Ton aidant gagne une preuve dans son Passeport.' },
] as const;

const REASONS = [
  { icon: ShieldCheck, title: 'Tes secrets restent à toi', text: 'Masqués dans ton navigateur, puis une seconde fois sur le serveur. Ton code est effacé dès que c’est résolu.' },
  { icon: Code2, title: 'Le code s’exécute chez toi', text: 'Dans un espace isolé de ton navigateur. Le serveur n’exécute jamais de code : rien à pirater de ce côté.' },
  { icon: Fingerprint, title: 'Un Passeport vérifiable', text: 'Chaque preuve a une empreinte que n’importe qui peut recalculer, avec un QR code. Personne ne peut tricher.' },
  { icon: Bell, title: 'Tu n’as pas à attendre', text: 'Ferme la page : une notification te prévient quand un aidant arrive, sur ton téléphone ou ton ordinateur.' },
  { icon: Smartphone, title: 'Léger, en français', text: 'Pensé pour le téléphone et les connexions lentes. Installable comme une application.' },
  { icon: Lock, title: 'Pas de classement toxique', text: 'Pas de votes négatifs ni de séries à entretenir. On aide, on prouve, on partage.' },
] as const;

export function Landing({ dark, toggleTheme }: { dark: boolean; toggleTheme: () => void }) {
  const [stats, setStats] = useState<{ fiches: number; aides: number; confirmees: number; aidants: number } | null>(null);
  const [fiches, setFiches] = useState<SolutionHit[]>([]);

  useEffect(() => {
    getStats().then(setStats, () => undefined);
    getRecentSolutions().then((list) => setFiches(list.slice(0, 4)), () => undefined);
  }, []);

  const go = (hash: string) => {
    location.hash = hash;
  };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="lp">
      <button type="button" className="skip" onClick={() => document.getElementById('contenu')?.focus()}>Aller au contenu</button>

      <header className="lp-nav">
        <div className="lp-wrap row between">
          <button type="button" className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="KoraDevs, haut de page">
            <Logo size={30} light />
          </button>
          <nav className="lp-links" aria-label="Sections">
            <button type="button" onClick={() => scrollTo('comment')}>Comment ça marche</button>
            <button type="button" onClick={() => scrollTo('pourquoi')}>Pourquoi KoraDevs</button>
            <button type="button" onClick={() => scrollTo('fiches')}>Les fiches</button>
          </nav>
          <div className="row">
            <ThemeButton dark={dark} toggle={toggleTheme} />
            <button type="button" className="btn btn-ghost btn-sm lp-login" onClick={() => go('#/connexion')}>Se connecter</button>
            <button type="button" className="btn btn-neon btn-sm" onClick={() => go('#/inscription')}>Créer un compte</button>
          </div>
        </div>
      </header>

      <main id="contenu" tabIndex={-1}>
        <section className="lp-hero" aria-labelledby="titre">
          <div className="lp-wrap lp-hero-grid">
            <div>
              <span className="eyebrow"><LifeBuoy size={14} /> Entraide entre développeurs africains</span>
              <h1 id="titre">Quand tu bloques, un voisin te rejoint.</h1>
              <p>
                Colle ton erreur : un développeur disponible entre avec toi dans une salle de code partagée, sans rien installer. Vous corrigez ensemble, le test passe au vert, et la solution aide tous les suivants.
              </p>
              <div className="lp-cta">
                <button type="button" className="btn btn-neon btn-lg" onClick={() => go('#/inscription')}>
                  Créer mon compte <ArrowRight size={18} />
                </button>
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => scrollTo('comment')}>Voir comment ça marche</button>
              </div>
              <ul className="lp-checks">
                <li><Check size={16} /> Gratuit</li>
                <li><Check size={16} /> En français</li>
                <li><Check size={16} /> Sans installation</li>
              </ul>
            </div>
            <div className="lp-scene" aria-hidden="true"><CodeScene /></div>
          </div>
        </section>

        {stats && (
          <section className="lp-wrap lp-stats" aria-label="Chiffres de la plateforme">
            <div className="stat-tile"><b><CountUp value={stats.fiches} /></b><span>fiche{stats.fiches > 1 ? 's' : ''} solution{stats.fiches > 1 ? 's' : ''}</span></div>
            <div className="stat-tile"><b><CountUp value={stats.aides} /></b><span>aide{stats.aides > 1 ? 's' : ''} publiée{stats.aides > 1 ? 's' : ''}</span></div>
            <div className="stat-tile"><b><CountUp value={stats.aidants} /></b><span>aidant{stats.aidants > 1 ? 's' : ''} à leur porte</span></div>
          </section>
        )}

        <section id="comment" className="lp-section" aria-labelledby="t-comment">
          <div className="lp-wrap">
            <h2 id="t-comment">Comment ça marche</h2>
            <p className="lp-lead">Quatre étapes, de l’erreur à la solution.</p>
            <ol className="lp-steps">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="lp-step">
                  <span className="lp-num">{i + 1}</span>
                  <Icon size={26} aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pourquoi" className="lp-section lp-soft" aria-labelledby="t-pourquoi">
          <div className="lp-wrap">
            <h2 id="t-pourquoi">Pensé pour de vrai</h2>
            <p className="lp-lead">Ce qui rend l’aide fiable, et ce qu’on a choisi de ne pas faire.</p>
            <div className="lp-grid">
              {REASONS.map(({ icon: Icon, title, text }) => (
                <article key={title} className="lp-card">
                  <span className="lp-icon"><Icon size={22} aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section" aria-labelledby="t-preuve">
          <div className="lp-wrap lp-proof">
            <div>
              <h2 id="t-preuve">Une preuve, pas une promesse</h2>
              <p className="lp-lead" style={{ textAlign: 'left' }}>
                Un test confirmé n’est pas une case cochée : c’est le code du demandeur qui s’exécute au vert, devant son aidant. La fiche n’est publiée qu’avec l’accord des deux.
              </p>
            </div>
            <ol className="lp-chain" aria-label="De l’aide à la preuve">
              <li>Le code du demandeur passe au vert</li>
              <li>La fiche est validée par les deux</li>
              <li>Une preuve entre dans le Passeport</li>
              <li>L’empreinte se vérifie par QR code</li>
            </ol>
          </div>
        </section>

        <section id="fiches" className="lp-section lp-soft" aria-labelledby="t-fiches">
          <div className="lp-wrap">
            <h2 id="t-fiches">La bibliothèque grandit à chaque aide</h2>
            <p className="lp-lead">Quelques fiches déjà disponibles. Tu les retrouves avec ton compte.</p>
            {fiches.length > 0 ? (
              <ul className="lp-fiches">
                {fiches.map((f) => (
                  <li key={f.id} className="card tight">
                    <BookOpen size={18} aria-hidden="true" />
                    <span className="grow"><strong>{f.title}</strong></span>
                    <span className="small muted">{f.tech.slice(0, 2).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lp-lead">La bibliothèque se remplit avec la communauté.</p>
            )}
          </div>
        </section>

        <section className="lp-final" aria-labelledby="t-final">
          <div className="lp-wrap">
            <h2 id="t-final">Prêt à ne plus rester bloqué ?</h2>
            <p>Crée ton compte en moins d’une minute, avec ton e-mail ou GitHub.</p>
            <div className="lp-cta" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-neon btn-lg" onClick={() => go('#/inscription')}>Créer mon compte <ArrowRight size={18} /></button>
              <button type="button" className="btn btn-ghost btn-lg" onClick={() => go('#/connexion')}>J’ai déjà un compte</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-wrap row between wrap">
          <Logo size={24} />
          <span className="small muted">Projet KoraDevs · CADEV 2026, Systalink</span>
        </div>
      </footer>
    </div>
  );
}
