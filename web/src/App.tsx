import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { PublicUser, RadarAlert, ServerMessage, SolutionHit } from '@sos/shared';
import { connectRadar, forgetToken, loginDev, logout, me, savedToken } from './api.js';
import { Logo } from './Logo.js';
import { ThemeToggle } from './ThemeToggle.js';

// 4 Écrans + 1 Parcours
const Accueil = lazy(() => import('./Accueil.js').then((m) => ({ default: m.Accueil })));
const Fiches = lazy(() => import('./Fiches.js').then((m) => ({ default: m.Fiches })));
const Projets = lazy(() => import('./Projets.js').then((m) => ({ default: m.Projets })));
const Moi = lazy(() => import('./Moi.js').then((m) => ({ default: m.Moi })));
const DemanderAide = lazy(() => import('./DemanderAide.js').then((m) => ({ default: m.DemanderAide })));
const Salle = lazy(() => import('./Salle.js').then((m) => ({ default: m.Salle })));

type MainTab = 'accueil' | 'fiches' | 'projets' | 'moi';

const salleFromHash = () => /^#\/salle\/([0-9a-f-]{36})$/i.exec(location.hash)?.[1] ?? null;
const isDemanderFromHash = () => location.hash === '#/demander';

const tabFromHash = (): MainTab => {
  const hash = location.hash.replace(/^#\/?/, '').split('?')[0];
  if (hash === 'fiches') return 'fiches';
  if (hash === 'projets') return 'projets';
  if (hash === 'moi' || hash === 'maison' || hash === 'profil') return 'moi';
  return 'accueil';
};

function Login({
  onLogin,
  isDark,
  onToggleTheme,
}: {
  onLogin: (token: string, user: PublicUser) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  const [pseudo, setPseudo] = useState('');
  const [error, setError] = useState('');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)', padding: '16px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>

      <main style={{ maxWidth: '360px', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <Logo size={42} showSlogan={true} />
        </div>

        <p className="text-mute" style={{ fontSize: '0.95rem', margin: '0 0 28px 0', lineHeight: 1.5 }}>
          Quand l'IA ne suffit plus, un développeur te rejoint.
        </p>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!pseudo.trim()) return;
            try {
              const session = await loginDev(pseudo.trim());
              onLogin(session.token, session.user);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <input
            type="text"
            className="input-field"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Pseudo (ex: awa, koffi, fatou)"
            autoFocus
            required
            style={{ height: '44px', textAlign: 'center' }}
          />

          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            Entrer
          </button>

          {error && <p className="text-danger" style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>{error}</p>}
        </form>
      </main>
    </div>
  );
}

export function App() {
  const [token, setToken] = useState<string | null>(savedToken());
  const [user, setUser] = useState<PublicUser | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>(tabFromHash());
  const [salleId, setSalleId] = useState<string | null>(salleFromHash());
  const [isDemander, setIsDemander] = useState<boolean>(isDemanderFromHash());

  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<RadarAlert[]>([]);
  const [isDoorOpen, setIsDoorOpen] = useState(true);

  // Levier mode clair / mode sombre
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('kd.theme');
    if (saved) return saved === 'dark';
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('kd.theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('kd.theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((d) => !d);

  // Recherche ou fiche sélectionnée pour navigation fluide vers Fiches
  const [fichesSearchQuery, setFichesSearchQuery] = useState('');
  const [selectedSolutionForFiches, setSelectedSolutionForFiches] = useState<SolutionHit | null>(null);

  const radarSocket = useRef<ReturnType<typeof connectRadar> | null>(null);

  useEffect(() => {
    const onHash = () => {
      setSalleId(salleFromHash());
      setIsDemander(isDemanderFromHash());
      setActiveTab(tabFromHash());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!token) return;
    me(token).then(setUser, () => {
      forgetToken();
      setToken(null);
    });
  }, [token]);

  // Connexion Radar WebSocket
  useEffect(() => {
    if (!token || !user || salleId) return;
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
          setAlerts((list) => list.filter((a) => a.requestId !== m.requestId));
          location.hash = `#/salle/${m.requestId}`;
          break;
      }
    };
    radarSocket.current = connectRadar(token, onMessage, () => setConnected(false));
    return () => radarSocket.current?.close();
  }, [token, user, salleId]);

  const switchTab = (tab: MainTab) => {
    setActiveTab(tab);
    setIsDemander(false);
    setSelectedSolutionForFiches(null);
    location.hash = `#/${tab}`;
  };

  const handleLogout = () => {
    if (token) {
      void logout(token).finally(() => {
        setToken(null);
        setUser(null);
      });
    }
  };

  if (!token || !user) return <Login onLogin={(t, u) => { setToken(t); setUser(u); }} isDark={isDark} onToggleTheme={toggleTheme} />;

  // 1. Salle CodeFlash en plein écran
  if (salleId) {
    return (
      <Suspense fallback={<div style={{ padding: '80px 16px', textAlign: 'center', color: 'var(--mute)' }}>Connexion…</div>}>
        <Salle
          token={token}
          user={user}
          requestId={salleId}
          onLeave={() => {
            history.replaceState(null, '', location.pathname);
            setSalleId(null);
            switchTab('accueil');
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="layout">
      {/* 2. Mince barre en haut pour Ordinateur & Mobile */}
      <header className="top-nav">
        <div className="top-nav-inner">
          <div onClick={() => switchTab('accueil')}>
            <Logo size={26} showSlogan={false} />
          </div>

          {/* 4 liens texte pour Ordinateur */}
          <nav className="nav-links-desktop">
            <button
              type="button"
              className={`nav-link ${!isDemander && activeTab === 'accueil' ? 'active' : ''}`}
              onClick={() => switchTab('accueil')}
            >
              Accueil
            </button>
            <button
              type="button"
              className={`nav-link ${!isDemander && activeTab === 'fiches' ? 'active' : ''}`}
              onClick={() => switchTab('fiches')}
            >
              Fiches
            </button>
            <button
              type="button"
              className={`nav-link ${!isDemander && activeTab === 'projets' ? 'active' : ''}`}
              onClick={() => switchTab('projets')}
            >
              Projets
            </button>
            <button
              type="button"
              className={`nav-link ${!isDemander && activeTab === 'moi' ? 'active' : ''}`}
              onClick={() => switchTab('moi')}
            >
              Moi
            </button>
          </nav>

          {/* Levier de thème, Statut et Profil */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />

            <div className="status-indicator">
              <span
                className="status-dot"
                style={{
                  backgroundColor: connected ? 'var(--color-green)' : 'var(--color-mute)',
                }}
              />
              <span style={{ fontSize: '0.82rem' }}>
                {connected ? 'en ligne' : 'hors ligne'}
              </span>
            </div>

            <span
              onClick={() => switchTab('moi')}
              style={{
                fontSize: '0.9rem',
                color: activeTab === 'moi' ? 'var(--color-green)' : 'var(--color-ink)',
                cursor: 'pointer',
                fontWeight: 700,
              }}
              title="Voir mon profil"
            >
              @{user.login}
            </span>
          </div>
        </div>
      </header>

      {/* 3. Colonne centrale de 720px max */}
      <div className="main-column">
        <Suspense fallback={<div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--mute)' }}>Chargement…</div>}>
          {isDemander ? (
            /* Parcours dédié : Demander de l'aide */
            <DemanderAide
              token={token}
              user={user}
              onBack={() => switchTab('accueil')}
              onSuccess={(reqId) => {
                location.hash = `#/salle/${reqId}`;
              }}
            />
          ) : (
            /* 4 Écrans */
            <>
              {activeTab === 'accueil' && (
                <Accueil
                  token={token}
                  user={user}
                  alerts={alerts}
                  isDoorOpen={isDoorOpen}
                  onGoToDemander={() => {
                    setIsDemander(true);
                    location.hash = '#/demander';
                  }}
                  onSelectSolution={(sol) => {
                    setSelectedSolutionForFiches(sol);
                    switchTab('fiches');
                  }}
                  onAcceptAlert={(reqId) => {
                    radarSocket.current?.send({ type: 'accepter', requestId: reqId });
                  }}
                  onSearch={(q) => {
                    setFichesSearchQuery(q);
                    switchTab('fiches');
                  }}
                />
              )}

              {activeTab === 'fiches' && (
                <Fiches
                  token={token}
                  initialQuery={fichesSearchQuery}
                  selectedSolution={selectedSolutionForFiches}
                  onClearSelection={() => setSelectedSolutionForFiches(null)}
                />
              )}

              {activeTab === 'projets' && (
                <Projets token={token} user={user} />
              )}

              {activeTab === 'moi' && (
                <Moi
                  token={token}
                  user={user}
                  onDoorStatusChange={(isOpen) => setIsDoorOpen(isOpen)}
                  onLogout={handleLogout}
                />
              )}
            </>
          )}
        </Suspense>
      </div>

      {/* 4. Barre du bas fixe sur Mobile (4 onglets texte en bas) */}
      {!salleId && !isDemander && (
        <nav className="bottom-nav">
          <button
            type="button"
            className={`bottom-tab ${activeTab === 'accueil' ? 'active' : ''}`}
            onClick={() => switchTab('accueil')}
          >
            <span>Accueil</span>
            {activeTab === 'accueil' && <span className="tab-dot" />}
          </button>

          <button
            type="button"
            className={`bottom-tab ${activeTab === 'fiches' ? 'active' : ''}`}
            onClick={() => switchTab('fiches')}
          >
            <span>Fiches</span>
            {activeTab === 'fiches' && <span className="tab-dot" />}
          </button>

          <button
            type="button"
            className={`bottom-tab ${activeTab === 'projets' ? 'active' : ''}`}
            onClick={() => switchTab('projets')}
          >
            <span>Projets</span>
            {activeTab === 'projets' && <span className="tab-dot" />}
          </button>

          <button
            type="button"
            className={`bottom-tab ${activeTab === 'moi' ? 'active' : ''}`}
            onClick={() => switchTab('moi')}
          >
            <span>Moi</span>
            {activeTab === 'moi' && <span className="tab-dot" />}
          </button>
        </nav>
      )}
    </div>
  );
}
