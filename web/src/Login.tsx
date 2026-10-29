import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Eye, EyeOff, LifeBuoy, ShieldCheck, Users } from 'lucide-react';
import type { PublicUser } from '@sos/shared';
import { GITHUB_LOGIN_URL, GOOGLE_LOGIN_URL, authConfig, loginWithPassword, signup } from './api.js';
import { Logo } from './Logo.js';
import { Spinner, ThemeButton } from './ui.js';
import { AfricaMap } from './AfricaMap.js';

interface Methods {
  githubWeb: boolean;
  googleWeb: boolean;
  passwordAuth: boolean;
}

/** 0 to 4: a rough idea of how hard the password is to guess, shown while typing. */
function strength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/\d/.test(password) && /[A-Za-zÀ-ÿ]/.test(password)) score++;
  if ((/[a-zà-ÿ]/.test(password) && /[A-ZÀ-Ý]/.test(password)) || /[^A-Za-z0-9À-ÿ]/.test(password)) score++;
  return score;
}
const STRENGTH_LABEL = ['', 'Faible', 'Moyen', 'Bien', 'Solide'];

export function Login({
  onLogin,
  dark,
  toggleTheme,
  initialMode = 'login',
}: {
  onLogin: (token: string, user: PublicUser) => void;
  dark: boolean;
  toggleTheme: () => void;
  initialMode?: 'login' | 'signup';
}) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [methods, setMethods] = useState<Methods>({ githubWeb: false, googleWeb: false, passwordAuth: true });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    authConfig().then(
      (c) => {
        setMethods({ githubWeb: c.githubWeb, googleWeb: c.googleWeb, passwordAuth: c.passwordAuth });
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, []);

  const score = useMemo(() => strength(password), [password]);
  const social = methods.githubWeb || methods.googleWeb;
  const signingUp = mode === 'signup';

  const finish = async (action: () => Promise<{ token: string; user: PublicUser }>) => {
    setBusy(true);
    setError('');
    try {
      const session = await action();
      onLogin(session.token, session.user);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void finish(() => (signingUp ? signup({ email, login: pseudo.trim(), password }) : loginWithPassword({ email, password })));
  };

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setError('');
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
          <div className="login-scene"><AfricaMap /></div>
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

        <div className="login-box col" style={{ gap: 18 }}>
          <div>
            <h2 style={{ fontSize: '1.7rem' }}>{signingUp ? 'Crée ton compte' : 'Content de te revoir'}</h2>
            <p className="muted" style={{ marginTop: 6 }}>{signingUp ? 'Gratuit, en moins d’une minute.' : 'Connecte-toi pour entrer dans le quartier.'}</p>
          </div>

          {methods.passwordAuth && (
            <div className="seg-tabs" role="tablist" aria-label="Connexion ou inscription">
              <button type="button" role="tab" aria-selected={!signingUp} className={!signingUp ? 'on' : ''} onClick={() => switchMode('login')}>Se connecter</button>
              <button type="button" role="tab" aria-selected={signingUp} className={signingUp ? 'on' : ''} onClick={() => switchMode('signup')}>Créer un compte</button>
            </div>
          )}

          {social && (
            <div className="col" style={{ gap: 10 }}>
              {methods.githubWeb && (
                <a className="btn btn-primary btn-lg btn-block" href={GITHUB_LOGIN_URL}>
                  <GithubMark /> Continuer avec GitHub
                </a>
              )}
              {methods.googleWeb && (
                <a className="btn btn-google btn-lg btn-block" href={GOOGLE_LOGIN_URL}>
                  <GoogleMark /> Continuer avec Google
                </a>
              )}
            </div>
          )}

          {social && methods.passwordAuth && <div className="divider"><span>ou avec ton e-mail</span></div>}

          {methods.passwordAuth && (
            <form className="col" style={{ gap: 14 }} onSubmit={submit}>
              {signingUp && (
                <label className="field">
                  <span className="label">Ton pseudo</span>
                  <input
                    className="input"
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    placeholder="awa, koffi, fatou…"
                    autoComplete="username"
                    minLength={2}
                    maxLength={39}
                    pattern="[A-Za-z0-9][A-Za-z0-9\-]{1,38}"
                    title="2 à 39 caractères : lettres, chiffres et tirets"
                    required
                  />
                </label>
              )}
              <label className="field">
                <span className="label">Adresse e-mail</span>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" autoComplete="email" required autoFocus={!signingUp} />
              </label>
              <label className="field">
                <span className="label">Mot de passe</span>
                <span className="pw">
                  <input
                    className="input"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={signingUp ? 'new-password' : 'current-password'}
                    minLength={signingUp ? 8 : undefined}
                    maxLength={128}
                    required
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
                {signingUp && (
                  <span className="meter" aria-live="polite">
                    <span className="bars">
                      {[1, 2, 3, 4].map((i) => (
                        <i key={i} className={i <= score ? `on s${score}` : ''} />
                      ))}
                    </span>
                    <span className="small muted">{password ? STRENGTH_LABEL[score] : '8 caractères minimum, plus c’est long mieux c’est'}</span>
                  </span>
                )}
              </label>

              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !email || !password || (signingUp && !pseudo.trim())}>
                {busy ? <Spinner /> : null}
                {signingUp ? 'Créer mon compte' : 'Me connecter'}
                {!busy && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          {error && <div className="card tint-rose tight" role="alert">{error}</div>}

          {loaded && !methods.passwordAuth && !social && (
            <div className="card tint-rose">Aucune méthode de connexion n’est activée sur ce serveur.</div>
          )}

        </div>
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

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
