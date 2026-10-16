import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, LifeBuoy, ShieldCheck, Users } from 'lucide-react';
import type { PublicUser } from '@sos/shared';
import { authConfig, loginDev } from './api.js';
import { Logo } from './Logo.js';
import { Spinner, ThemeButton } from './ui.js';

export function Login({ onLogin, dark, toggleTheme }: { onLogin: (token: string, user: PublicUser) => void; dark: boolean; toggleTheme: () => void }) {
  const [pseudo, setPseudo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [devAuth, setDevAuth] = useState(true);

  useEffect(() => {
    authConfig().then((c) => setDevAuth(c.devAuth), () => undefined);
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
            <p className="muted" style={{ marginTop: 6 }}>Choisis un pseudo pour entrer dans le quartier.</p>
          </div>

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
              <p className="faint small">Mode démo : aucun mot de passe. La connexion GitHub se fait depuis le terminal avec <span className="mono">sos login</span>.</p>
            </>
          ) : (
            <div className="card tint-rose">
              Le mode démo est désactivé sur ce serveur. Connecte-toi depuis le terminal avec <span className="mono">sos login</span>.
            </div>
          )}
          {error && <div className="card tint-rose tight" role="alert">{error}</div>}
        </form>
      </section>
    </div>
  );
}
