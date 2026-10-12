import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  Compass,
  HandHelping,
  LifeBuoy,
  FolderGit2,
  House,
  Bell,
  Sun,
  Moon,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { KNOWN_TECH, type PublicUser, type RadarAlert, type RadarStage, type ServerMessage } from '@sos/shared';
import { connectRadar, forgetToken, loginDev, logout, me, savedToken } from './api.js';
import { Logo } from './Logo.js';

// Lazy views
const Salle = lazy(() => import('./Salle.js').then((m) => ({ default: m.Salle })));
const Decouvrir = lazy(() => import('./Decouvrir.js').then((m) => ({ default: m.Decouvrir })));
const AppelAide = lazy(() => import('./AppelAide.js').then((m) => ({ default: m.AppelAide })));
const Projets = lazy(() => import('./Projets.js').then((m) => ({ default: m.Projets })));
const Maison = lazy(() => import('./Maison.js').then((m) => ({ default: m.Maison })));

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '16px' }}>
      <main className="card" style={{ maxWidth: '420px', width: '100%', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Logo size={48} showSlogan={true} />
        </div>
        <p className="hint" style={{ marginBottom: '24px' }}>
          Quand l'IA ne suffit plus, un développeur te rejoint instantanément en live-coding avec <b>CodeFlash</b>.
        </p>

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
          style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Pseudo de développeur (Mode Démo)
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="ex: awa, prince, koffi, fatou..."
              autoFocus
              required
              style={{ width: '100%', marginTop: '6px' }}
            />
          </label>
          <button type="submit" style={{ width: '100%', marginTop: '8px' }}>
            Entrer dans le Quartier
          </button>
          {error && <p className="error">{error}</p>}
        </form>

        <div style={{ marginTop: '20px', padding: '10px', background: 'var(--color-brand-soft)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-brand)' }}>
          💡 Connexion instantanée sans mot de passe pour tester.
        </div>
      </main>
    </div>
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
  const [isDark, setIsDark] = useState<boolean>(() => localStorage.getItem('kd.theme') === 'dark');

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('kd.theme', isDark ? 'dark' : 'light');
  }, [isDark]);

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

  // Salle CodeFlash en plein écran avec thème sombre
  if (salle) {
    return (
      <div className="salle-dark-mode">
        <Suspense fallback={<div className="card narrow" style={{ margin: '80px auto', textAlign: 'center' }}>Ouverture de CodeFlash…</div>}>
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
      </div>
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
      setNotice('Choisis au moins une technologie dans tes compétences.');
    }
  };

  return (
    <div className="app-layout">
      {/* 1. Sidebar Gauche Desktop (240px) */}
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => switchTab('decouvrir')}>
          <Logo size={36} showSlogan={true} />
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-btn ${activeTab === 'decouvrir' ? 'active' : ''}`}
            onClick={() => switchTab('decouvrir')}
          >
            <Compass size={18} />
            Découvrir
          </button>

          <button
            className={`sidebar-btn ${activeTab === 'radar' ? 'active' : ''}`}
            onClick={() => switchTab('radar')}
          >
            <HandHelping size={18} />
            Aider {alerts.length > 0 && <span className="badge-confirmed" style={{ marginLeft: 'auto', padding: '2px 6px' }}>{alerts.length}</span>}
          </button>

          {/* Bouton SOS Corail bien visible */}
          <button
            className="sidebar-btn sos-btn"
            onClick={() => switchTab('appel')}
          >
            <LifeBuoy size={20} />
            SOS Dev
          </button>

          <button
            className={`sidebar-btn ${activeTab === 'projets' ? 'active' : ''}`}
            onClick={() => switchTab('projets')}
          >
            <FolderGit2 size={18} />
            Projets
          </button>

          <button
            className={`sidebar-btn ${activeTab === 'maison' ? 'active' : ''}`}
            onClick={() => switchTab('maison')}
          >
            <House size={18} />
            Maison & Passeport
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-btn"
            onClick={() => setIsDark(!isDark)}
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? 'Mode clair' : 'Mode sombre'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>@{user.login}</span>
            <button
              className="link"
              onClick={() => void logout(token).finally(() => (setToken(null), setUser(null)))}
              style={{ fontSize: '0.8rem', color: 'var(--color-coral)' }}
            >
              Quitter
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Contenu Central avec En-tête 64px et Panneau Droit */}
      <div className="content-wrapper">
        <header className="top-header">
          {/* Logo compact sur mobile */}
          <div style={{ display: 'none' }} className="mobile-only-logo">
            <Logo size={28} showSlogan={false} />
          </div>

          <div className="header-search">
            <Search size={16} color="var(--color-slate)" />
            <input
              type="text"
              placeholder="Rechercher une fiche, un bug, une techno…"
              onFocus={() => {
                if (activeTab !== 'decouvrir') switchTab('decouvrir');
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="network-badge">
              <span className={connected ? 'dot on' : 'dot'} />
              <span>{connected ? 'En ligne' : 'Connexion…'}</span>
            </div>

            <button
              type="button"
              className="link"
              onClick={() => switchTab('radar')}
              style={{ position: 'relative', color: 'var(--color-text-muted)' }}
              title="Notifications"
            >
              <Bell size={18} />
              {alerts.length > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-coral)' }} />
              )}
            </button>

            <div
              onClick={() => switchTab('maison')}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--color-brand)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
              title="Voir ma Maison"
            >
              {user.login.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Grille principale */}
        <div className={`content-grid ${activeTab === 'decouvrir' ? 'with-panel' : ''}`}>
          <main>
            <Suspense fallback={<div className="card"><p>Chargement…</p></div>}>
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
                  <section className="card" style={{ marginBottom: '20px' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <HandHelping size={20} color="var(--color-brand)" />
                      Radar des aidants disponibles
                    </h2>
                    <p className="hint">
                      Coche tes technologies de prédilection et active ta disponibilité pour recevoir les alertes.
                    </p>
                    <div className="chips" style={{ marginBottom: '14px' }}>
                      {KNOWN_TECH.map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={tech.includes(t) ? 'chip on' : 'chip'}
                          onClick={() => toggleTech(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <button
                      className={available ? 'secondary' : ''}
                      onClick={toggleAvailable}
                      disabled={!connected}
                      style={{ width: '100%' }}
                    >
                      {available ? 'Mettre en pause mes disponibilités' : 'Me rendre disponible sur le Radar'}
                    </button>
                    {notice && <p className="error" style={{ marginTop: '8px' }}>{notice}</p>}
                  </section>

                  {taken && (
                    <section className="card" style={{ borderColor: 'var(--color-brand)', marginBottom: '16px' }}>
                      <h3>Demande prise !</h3>
                      <p>Tu aides actuellement @{taken.requester.login}.</p>
                      <button onClick={() => (location.hash = `#/salle/${taken.requestId}`)}>
                        Rejoindre la salle CodeFlash
                      </button>
                    </section>
                  )}

                  <section>
                    <h3>Demandes d'entraide {available && <small>({alerts.length})</small>}</h3>
                    {!available && <p className="hint">Rends-toi disponible ci-dessus pour capter les demandes en direct.</p>}
                    {available && alerts.length === 0 && (
                      <p className="hint">Aucune demande en attente. Tu seras alerté dès qu'un développeur est bloqué !</p>
                    )}
                    {alerts.map((a) => (
                      <article key={a.requestId} className="card" style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span className="badge-confirmed">{a.tech.join(' · ') || 'Techno'}</span>
                          <span className="hint">@{a.requester} · {since(a.createdAt, now)}</span>
                        </div>
                        <code style={{ display: 'block', background: 'var(--color-bg)', padding: '8px', borderRadius: '6px', color: 'var(--color-coral)', fontSize: '0.85rem' }}>
                          {a.errorSummary}
                        </code>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                          <span className="hint">$ {a.command}</span>
                          <button onClick={() => radar.current?.send({ type: 'accepter', requestId: a.requestId })}>
                            Prendre l'appel (CodeFlash)
                          </button>
                        </div>
                      </article>
                    ))}
                  </section>
                </div>
              )}
            </Suspense>
          </main>

          {/* 3. Panneau Droit (320px) : Demandes en direct & Prochaines étapes */}
          {activeTab === 'decouvrir' && (
            <aside className="right-panel">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Demandes en direct</h3>
                  <span className="dot on" title="Radar actif" />
                </div>
                {alerts.length === 0 ? (
                  <p className="hint" style={{ fontSize: '0.85rem', margin: 0 }}>
                    Aucun blocage signalé en ce moment. Les voisins codent tranquillement !
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {alerts.slice(0, 3).map((a) => (
                      <div key={a.requestId} style={{ background: 'var(--color-bg)', padding: '10px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                          <b>{a.tech[0] || 'Code'}</b>
                          <span className="hint">@{a.requester}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-coral)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.errorSummary}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => switchTab('radar')}
                  style={{ width: '100%', marginTop: '12px', fontSize: '0.85rem', minHeight: '36px' }}
                >
                  Ouvrir le Radar complet
                </button>
              </div>

              <div className="card">
                <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>Prochaines étapes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  <div>✓ 1. Configurer sa Maison & sa ville</div>
                  <div>✓ 2. Renseigner sa stack technique</div>
                  <div style={{ color: 'var(--color-brand)', fontWeight: 600 }}>→ 3. Résoudre un 1er bug pour obtenir le badge Confirmé</div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* 4. Navigation Mobile : Barre Fixe en Bas avec SOS surélevé au centre */}
      <nav className="bottom-bar">
        <button
          className={`bottom-tab ${activeTab === 'decouvrir' ? 'active' : ''}`}
          onClick={() => switchTab('decouvrir')}
        >
          <Compass size={20} />
          <span>Découvrir</span>
        </button>

        <button
          className={`bottom-tab ${activeTab === 'radar' ? 'active' : ''}`}
          onClick={() => switchTab('radar')}
        >
          <HandHelping size={20} />
          <span>Aider</span>
        </button>

        {/* Bouton SOS Corail Surélevé */}
        <button
          className="bottom-tab sos-floating"
          onClick={() => switchTab('appel')}
          title="Appel à l'aide d'urgence"
        >
          <LifeBuoy size={24} />
        </button>

        <button
          className={`bottom-tab ${activeTab === 'projets' ? 'active' : ''}`}
          onClick={() => switchTab('projets')}
        >
          <FolderGit2 size={20} />
          <span>Projets</span>
        </button>

        <button
          className={`bottom-tab ${activeTab === 'maison' ? 'active' : ''}`}
          onClick={() => switchTab('maison')}
        >
          <House size={20} />
          <span>Maison</span>
        </button>
      </nav>
    </div>
  );
}
