import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, LifeBuoy, ShieldCheck, Users } from 'lucide-react';
import type { PublicUser } from '@sos/shared';
import { GITHUB_LOGIN_URL, authConfig, loginDev } from './api.js';
import { Logo } from './Logo.js';
import { Spinner, ThemeButton } from './ui.js';

export function Login({ onLogin, dark, toggleTheme }: { onLogin: (token: string, user: PublicUser) => void; dark: boolean; toggleTheme: () => void }) {
  const [pseudo, setPseudo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [devAuth, setDevAuth] = useState(true);
  const [githubWeb, setGithubWeb] = useState(false);

  useEffect(() => {
    authConfig().then(
      (c) => {
        setDevAuth(c.devAuth);
        setGithubWeb(c.githubWeb);
      },
      () => undefined,
    );
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const login = pseudo.trim();
    if (!login) return;
    setBusy(true);
    setError('');
    try {
      const session = await loginDev(login);
      onLogin(session.token, session.user);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login-art">
        <Logo size={36} light />
        <div>
          <h1>Quand tu bloques, un voisin te rejoint.</h1>
          <p style={{ marginTop: 14, color: 'rgba(255,255,255,.8)', maxWidth: 440 }}>
            Un quartier de développeurs, en français, léger. L’aide arrive en direct, la solution est confirmée par un test et devient un savoir partagé.
          </p>
          <ul>
            <li><LifeBuoy size={20} /> Un aidant te rejoint dans une salle de code partagée</li>
            <li><ShieldCheck size={20} /> Tes secrets sont masqués avant tout envoi</li>
            <li><BadgeCheck size={20} /> Chaque aide construit ton Passeport de compétences</li>
            <li><Users size={20} /> Présente ton projet et trouve des coéquipiers</li>
          </ul>
        </div>
        <span className="small" style={{ color: 'rgba(255,255,255,.55)' }}>Projet KoraDevs · Concours Systalink</span>
      </section>

      <section className="login-form">
        <div className="theme">
          <ThemeButton dark={dark} toggle={toggleTheme} />
        </div>
        <form className="login-box col" style={{ gap: 18 }} onSubmit={submit}>
          <div>
            <h2 style={{ fontSize: '1.7rem' }}>Bienvenue</h2>
            <p className="muted" style={{ marginTop: 6 }}>{githubWeb ? 'Connecte-toi pour entrer dans le quartier.' : 'Choisis un pseudo pour entrer dans le quartier.'}</p>
          </div>

          {githubWeb && (
            <a className="btn btn-primary btn-lg btn-block" href={GITHUB_LOGIN_URL}>
              <GithubMark /> Continuer avec GitHub
            </a>
          )}
          {githubWeb && devAuth && <div className="faint small" style={{ textAlign: 'center' }}>ou, pour tester</div>}

          {devAuth ? (
            <>
              <label className="field">
                <span className="label">Ton pseudo</span>
                <input
                  className="input"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  placeholder="awa, koffi, fatou…"
                  autoFocus
                  autoComplete="username"
                  maxLength={39}
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !pseudo.trim()}>
                {busy ? <Spinner /> : null}
                Entrer
                {!busy && <ArrowRight size={18} />}
              </button>
              <p className="faint small">Mode démo : aucun mot de passe, n’importe quel pseudo est accepté.{!githubWeb && <> La connexion GitHub n’est pas activée sur ce serveur.</>}</p>
            </>
          ) : (
            !githubWeb && (
              <div className="card tint-rose">
                Aucune méthode de connexion n’est activée sur ce serveur. Connecte-toi depuis le terminal avec <span className="mono">sos login</span>.
              </div>
            )
          )}
          {error && <div className="card tint-rose tight" role="alert">{error}</div>}
        </form>
      </section>
    </div>
  );
}

function GithubMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
