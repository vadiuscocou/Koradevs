import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { KNOWN_TECH, type PublicUser, type RadarAlert, type RadarStage, type ServerMessage } from '@sos/shared';
import { connectRadar, forgetToken, loginDev, logout, me, savedToken } from './api.js';

// Lazy-loaded components
const Salle = lazy(() => import('./Salle.js').then((m) => ({ default: m.Salle })));
const Decouvrir = lazy(() => import('./Decouvrir.js').then((m) => ({ default: m.Decouvrir })));
const AppelAide = lazy(() => import('./AppelAide.js').then((m) => ({ default: m.AppelAide })));
const Projets = lazy(() => import('./Projets.js').then((m) => ({ default: m.Projets })));
const Maison = lazy(() => import('./Maison.js').then((m) => ({ default: m.Maison })));

const STAGE_LABEL: Record<RadarStage, string> = {
  ciblee: 'Ta techno',
  elargie: 'Alerte élargie',
  publique: 'File publique',
};

type ActiveTab = 'decouvrir' | 'radar' | 'appel' | 'projets' | 'maison';

const salleFromHash = () => /^#\/salle\/([0-9a-f-]{36})$/i.exec(location.hash)?.[1] ?? null;

const tabFromHash = (): ActiveTab => {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash === 'radar') return 'radar';
  if (hash === 'appel') return 'appel';
  if (hash === 'projets') return 'projets';
  if (hash === 'maison' || hash === 'profil') return 'maison';
  return 'decouvrir';
};

function since(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return s < 60 ? `il y a ${s} s` : `il y a ${Math.floor(s / 60)} min`;
}

function Login({ onLogin }: { onLogin: (token: string, user: PublicUser) => void }) {
  const [pseudo, setPseudo] = useState('');
  const [error, setError] = useState('');
  return (
    <main className="card narrow" style={{ marginTop: '60px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#60a5fa' }}>KoraDevs + CodeFlash</h1>
        <p className="hint">Quand l'IA ne suffit plus, un développeur te rejoint instantanément.</p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const session = await loginDev(pseudo.trim());
            onLogin(session.token, session.user);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <label htmlFor="pseudo">Pseudo de développeur (Mode Démo)</label>
        <input
          id="pseudo"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="ex: awa, prince, koffi, fatou..."
          autoFocus
          required
        />
        <button type="submit" style={{ marginTop: '8px' }}>
          Entrer dans le Quartier
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <p className="hint" style={{ marginTop: '16px', textAlign: 'center' }}>
        💡 Accès immédiat sans mot de passe pour tester toutes les fonctionnalités.
      </p>
    </main>
  );
}

export function App() {
  const [token, setToken] = useState<string | null>(savedToken());
  const [user, setUser] = useState<PublicUser | null>(null);
  const [tech, setTech] = useState<string[]>(() => JSON.parse(localStorage.getItem('sos.tech') ?? '[]') as string[]);
  const [available, setAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<RadarAlert[]>([]);
  const [taken, setTaken] = useState<{ requestId: string; requester: PublicUser } | null>(null);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const radar = useRef<ReturnType<typeof connectRadar> | null>(null);
  const [salle, setSalle] = useState<string | null>(salleFromHash());
  const [activeTab, setActiveTab] = useState<ActiveTab>(tabFromHash());

  useEffect(() => {
    const onHash = () => {
      setSalle(salleFromHash());
      setActiveTab(tabFromHash());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) return;
    me(token).then(setUser, () => {
      forgetToken();
      setToken(null);
    });
  }, [token]);

  useEffect(() => {
    if (!token || !user || salle) return;
    const onMessage = (m: ServerMessage) => {
      switch (m.type) {
        case 'bienvenue':
          setConnected(true);
          break;
        case 'alerte':
          setAlerts((list) => [m.alert, ...list.filter((a) => a.requestId !== m.alert.requestId)]);
          break;
        case 'retirer':
          setAlerts((list) => list.filter((a) => a.requestId !== m.requestId));
          break;
        case 'prise':
          setTaken({ requestId: m.requestId, requester: m.requester });
          setAlerts((list) => list.filter((a) => a.requestId !== m.requestId));
          location.hash = `#/salle/${m.requestId}`;
          break;
        case 'erreur':
          setNotice(m.message);
          break;
      }
    };
    radar.current = connectRadar(token, onMessage, () => {
      setConnected(false);
      setAvailable(false);
    });
    return () => radar.current?.close();
  }, [token, user, salle]);

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    location.hash = `#/${tab}`;
  };

  if (!token || !user) return <Login onLogin={(t, u) => (setToken(t), setUser(u))} />;

  // Salle SOS (CodeFlash Room)
  if (salle) {
    return (
      <Suspense fallback={<main className="card narrow">Ouverture de CodeFlash…</main>}>
        <Salle
          token={token}
          user={user}
          requestId={salle}
          onLeave={() => {
            setTaken(null);
            setAvailable(false);
            history.replaceState(null, '', location.pathname);
            setSalle(null);
          }}
        />
      </Suspense>
    );
  }

  const toggleTech = (t: string) => {
    const next = tech.includes(t) ? tech.filter((x) => x !== t) : [...tech, t];
    setTech(next);
    localStorage.setItem('sos.tech', JSON.stringify(next));
    if (available && next.length) radar.current?.send({ type: 'disponible', tech: next });
  };

  const toggleAvailable = () => {
    setNotice('');
    if (available) {
      radar.current?.send({ type: 'pause' });
      setAlerts([]);
      setAvailable(false);
    } else if (tech.length) {
      radar.current?.send({ type: 'disponible', tech });
      setAvailable(true);
    } else {
      setNotice('Choisis au moins une techno dans la liste.');
    }
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="top-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>⚡</span>
          <b style={{ fontSize: '1.15rem', color: '#60a5fa', cursor: 'pointer' }} onClick={() => switchTab('decouvrir')}>
            KoraDevs <small style={{ color: '#93c5fd', fontSize: '0.75rem', fontWeight: 'normal' }}>CodeFlash</small>
          </b>
        </div>

        <nav className="nav-tabs">
          <button className={`nav-btn ${activeTab === 'decouvrir' ? 'active' : ''}`} onClick={() => switchTab('decouvrir')}>
            🧭 Découvrir
          </button>
          <button className={`nav-btn ${activeTab === 'radar' ? 'active' : ''}`} onClick={() => switchTab('radar')}>
            📡 Radar {alerts.length > 0 && <span className="badge-count">{alerts.length}</span>}
          </button>
          <button className={`nav-btn ${activeTab === 'appel' ? 'active' : ''}`} onClick={() => switchTab('appel')} style={{ color: '#ff7b72' }}>
            🆘 Appel à l'aide
          </button>
          <button className={`nav-btn ${activeTab === 'projets' ? 'active' : ''}`} onClick={() => switchTab('projets')}>
            🚀 Vitrine Projets
          </button>
          <button className={`nav-btn ${activeTab === 'maison' ? 'active' : ''}`} onClick={() => switchTab('maison')}>
            🏠 La Maison & Passeport
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={connected ? 'dot on' : 'dot'} title={connected ? 'Connecté au Radar' : 'Déconnecté'} />
          <span className="who" style={{ fontWeight: '500' }}>@{user.login}</span>
          <button className="link" onClick={() => void logout(token).finally(() => (setToken(null), setUser(null)))}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main Content View based on activeTab */}
      <main>
        <Suspense fallback={<div className="card narrow"><p>Chargement...</p></div>}>
          {activeTab === 'decouvrir' && (
            <Decouvrir
              token={token}
              user={user}
              onGoToAppel={() => switchTab('appel')}
              onGoToProjets={() => switchTab('projets')}
            />
          )}

          {activeTab === 'appel' && (
            <AppelAide
              token={token}
              user={user}
              onSuccess={(reqId) => {
                location.hash = `#/salle/${reqId}`;
              }}
            />
          )}

          {activeTab === 'projets' && (
            <Projets token={token} user={user} />
          )}

          {activeTab === 'maison' && (
            <Maison token={token} user={user} onBack={() => switchTab('decouvrir')} />
          )}

          {activeTab === 'radar' && (
            <div>
              <section className="card">
                <h2>📡 Radar des aidants en temps réel</h2>
                <p className="hint">
                  Sélectionne tes technologies et rends-toi disponible. Dès qu'un développeur est bloqué, la demande apparaît ci-dessous !
                </p>
                <div className="chips">
                  {KNOWN_TECH.map((t) => (
                    <button key={t} className={tech.includes(t) ? 'chip on' : 'chip'} onClick={() => toggleTech(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <button className={available ? 'big off' : 'big'} onClick={toggleAvailable} disabled={!connected}>
                  {available ? 'Me mettre en pause' : 'Me rendre disponible sur le Radar'}
                </button>
                {notice && <p className="error">{notice}</p>}
              </section>

              {taken && (
                <section className="card success">
                  <h2>Tu as pris la demande de @{taken.requester.login} !</h2>
                  <p>Son terminal et son navigateur viennent d’être connectés.</p>
                  <button onClick={() => (location.hash = `#/salle/${taken.requestId}`)}>
                    Entrer dans CodeFlash (Salle SOS)
                  </button>
                </section>
              )}

              <section>
                <h2>Demandes en direct {available && <small>({alerts.length})</small>}</h2>
                {!available && <p className="hint">Rends-toi disponible ci-dessus pour recevoir les alertes.</p>}
                {available && alerts.length === 0 && (
                  <p className="hint">Aucune demande pour l’instant. Reste sur cette page, tu seras alerté en direct !</p>
                )}
                {alerts.map((a) => (
                  <article key={a.requestId} className="card alert">
                    <div className="row">
                      <span className={`stage ${a.stage}`}>{STAGE_LABEL[a.stage]}</span>
                      <span className="tech">{a.tech.join(' · ') || 'Techno inconnue'}</span>
                      <span className="hint">
                        @{a.requester} · {since(a.createdAt, now)}
                      </span>
                    </div>
                    <code className="error-line">{a.errorSummary}</code>
                    <div className="row">
                      <span className="hint">
                        $ {a.command} · {a.files} fichier(s)
                      </span>
                      <button onClick={() => radar.current?.send({ type: 'accepter', requestId: a.requestId })}>
                        Accepter & Rejoindre CodeFlash
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
}
