import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, DoorClosed, DoorOpen, FolderKanban, Home, LifeBuoy, LogOut, User } from 'lucide-react';
import type { PublicUser, RadarAlert, RadarStage, RequestSummary, ServerMessage, SolutionHit } from '@sos/shared';
import {
  connectRadar,
  consumeOAuthHash,
  forgetToken,
  getCommunityProfile,
  logout,
  me,
  myRequests,
  savedToken,
  updateCommunityProfile,
  type CommunityProfile,
  type Radar,
} from './api.js';
import { Login } from './Login.js';
import { Logo } from './Logo.js';
import { Avatar, Spinner, ThemeButton, ToastProvider, useToast } from './ui.js';

const Accueil = lazy(() => import('./Accueil.js').then((m) => ({ default: m.Accueil })));
const Fiches = lazy(() => import('./Fiches.js').then((m) => ({ default: m.Fiches })));
const Projets = lazy(() => import('./Projets.js').then((m) => ({ default: m.Projets })));
const Moi = lazy(() => import('./Moi.js').then((m) => ({ default: m.Moi })));
const DemanderAide = lazy(() => import('./DemanderAide.js').then((m) => ({ default: m.DemanderAide })));
const Salle = lazy(() => import('./Salle.js').then((m) => ({ default: m.Salle })));
const PasseportPublic = lazy(() => import('./Passeport.js').then((m) => ({ default: m.PasseportPublic })));

type Tab = 'accueil' | 'fiches' | 'projets' | 'moi';

interface Route {
  tab: Tab;
  demander: boolean;
  salle: string | null;
  passeport: string | null;
  /** Logged-out visitors: the sign-in or sign-up page (otherwise they see the public home page). */
  auth: 'login' | 'signup' | null;
}

function readRoute(): Route {
  const path = location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const salle = /^salle\/([0-9a-f-]{36})$/i.exec(path)?.[1] ?? null;
  const passeport = /^passeport\/([\w.-]{1,40})$/i.exec(path)?.[1] ?? null;
  const tab: Tab = path === 'fiches' ? 'fiches' : path === 'projets' ? 'projets' : path === 'moi' ? 'moi' : 'accueil';
  const auth = path === 'connexion' ? 'login' : path === 'inscription' ? 'signup' : null;
  return { tab, demander: path === 'demander', salle, passeport, auth };
}

/** Where the person's own request stands while they wait for a helper. */
export interface Waiting {
  requestId: string;
  stage: RadarStage;
  alerted: number;
  online: number;
}

export interface Shared {
  token: string;
  user: PublicUser;
  profile: CommunityProfile | null;
  setProfile: (profile: CommunityProfile) => void;
  alerts: RadarAlert[];
  connected: boolean;
  waiting: Waiting | null;
  /** My requests that are still alive (open, or taken by a helper). */
  mine: RequestSummary[];
  refreshMine: () => void;
  follow: (requestId: string) => void;
  stopFollowing: () => void;
  accept: (requestId: string) => void;
  setDoor: (open: boolean) => Promise<void>;
  go: (hash: string) => void;
  openFiche: (solution: SolutionHit | null, query?: string) => void;
}

const NAV: Array<{ tab: Tab; label: string; icon: typeof Home }> = [
  { tab: 'accueil', label: 'Accueil', icon: Home },
  { tab: 'fiches', label: 'Fiches', icon: BookOpen },
  { tab: 'projets', label: 'Projets', icon: FolderKanban },
  { tab: 'moi', label: 'Moi', icon: User },
];

function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kd.theme');
      if (saved) return saved === 'dark';
    } catch {
      /* private mode */
    }
    return false;
  });
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem('kd.theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);
  return [dark, () => setDark((d) => !d)] as const;
}

export function App() {
  return (
    <ToastProvider>
      <Root />
    </ToastProvider>
  );
}

function Root() {
  const toast = useToast();
  const [dark, toggleTheme] = useTheme();
  const [oauth] = useState(consumeOAuthHash);
  const [route, setRoute] = useState<Route>(readRoute);
  const [token, setToken] = useState<string | null>(oauth.token ?? savedToken());
  const [user, setUser] = useState<PublicUser | null>(null);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<RadarAlert[]>([]);
  const [waiting, setWaiting] = useState<Waiting | null>(null);
  const waitingRef = useRef<Waiting | null>(null);
  waitingRef.current = waiting;
  const [mine, setMine] = useState<RequestSummary[]>([]);
  const [ficheQuery, setFicheQuery] = useState('');
  const [ficheOpen, setFicheOpen] = useState<SolutionHit | null>(null);
  const radar = useRef<Radar | null>(null);
  const profileRef = useRef<CommunityProfile | null>(null);
  profileRef.current = profile;

  const oauthShown = useRef(false);
  useEffect(() => {
    if (oauth.error && !oauthShown.current) {
      oauthShown.current = true;
      toast('error', 'Connexion GitHub impossible', oauth.error);
    }
  }, [oauth, toast]);

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
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
    getCommunityProfile(token).then(setProfile, () => undefined);
  }, [token]);

  /** Tells the Radar whether this person can be alerted: door open AND at least one technology. */
  const syncRadar = useCallback((p: CommunityProfile | null) => {
    if (!radar.current) return;
    if (p && p.doorStatus === 'ouverte' && p.tech.length > 0) radar.current.send({ type: 'disponible', tech: p.tech });
    else radar.current.send({ type: 'pause' });
  }, []);

  const inSalle = route.salle !== null;

  /** Requests stay open for up to 24 h: coming back later, we find them again (and re-follow the open ones). */
  const refreshMine = useCallback(() => {
    if (!token) return;
    myRequests(token).then(
      (list) => {
        const alive = list.filter((r) => r.status === 'ouverte' || r.status === 'acceptee');
        setMine(alive);
        const open = alive.find((r) => r.status === 'ouverte');
        if (open) {
          if (!waitingRef.current) setWaiting({ requestId: open.id, stage: 'ciblee', alerted: 0, online: 0 });
          // The server only tells us when a helper takes the request if this connection follows it.
          radar.current?.send({ type: 'suivre', requestId: open.id });
        }
      },
      () => undefined,
    );
  }, [token]);

  useEffect(() => {
    if (token && user) refreshMine();
  }, [token, user, refreshMine, route.salle]);

  useEffect(() => {
    if (!token || !user || inSalle) return;
    const onMessage = (m: ServerMessage) => {
      switch (m.type) {
        case 'bienvenue':
          setConnected(true);
          syncRadar(profileRef.current);
          refreshMine();
          break;
        case 'alerte':
          setAlerts((list) => [m.alert, ...list.filter((a) => a.requestId !== m.alert.requestId)]);
          if (m.alert.stage === 'ciblee') toast('ok', `@${m.alert.requester} a besoin d’aide`, m.alert.tech.join(' · '));
          break;
        case 'retirer':
          setAlerts((list) => list.filter((a) => a.requestId !== m.requestId));
          break;
        case 'prise':
          setAlerts((list) => list.filter((a) => a.requestId !== m.requestId));
          location.hash = `#/salle/${m.requestId}`;
          break;
        case 'statut':
          setWaiting((w) => (w && w.requestId === m.requestId ? { ...w, stage: m.stage, alerted: m.alerted, online: m.online } : w));
          break;
        case 'acceptee':
          if (waitingRef.current?.requestId === m.requestId && location.hash === '#/demander') {
            setWaiting(null);
            toast('ok', `@${m.helper.login} arrive`, 'Tu entres dans la salle d’aide.');
            location.hash = `#/salle/${m.requestId}`;
          } else {
            setWaiting((w) => (w?.requestId === m.requestId ? null : w));
            toast('ok', `@${m.helper.login} t’attend dans la salle`, 'Retrouve ta demande sur l’accueil.');
            refreshMine();
          }
          break;
        case 'fermee':
          setWaiting((w) => (w?.requestId === m.requestId ? null : w));
          refreshMine();
          break;
        case 'sonnette':
          toast('ok', `@${m.from} sonne à ta porte`, 'Il ou elle aimerait ton aide.');
          break;
        case 'erreur':
          toast('error', m.message);
          break;
      }
    };
    const socket = connectRadar(token, onMessage, () => setConnected(false));
    radar.current = socket;
    return () => {
      socket.close();
      radar.current = null;
      setConnected(false);
    };
  }, [token, user, inSalle, syncRadar, toast, refreshMine]);

  const go = useCallback((hash: string) => {
    location.hash = hash;
  }, []);

  const setDoor = useCallback(
    async (open: boolean) => {
      if (!token) return;
      const current = profileRef.current;
      if (open && current && current.tech.length === 0) {
        toast('error', 'Choisis d’abord tes technos', 'Sans elles, le Radar ne sait pas quelles demandes te montrer.');
        go('#/moi');
        return;
      }
      try {
        const updated = await updateCommunityProfile(token, { doorStatus: open ? 'ouverte' : 'fermee' });
        setProfile(updated);
        syncRadar(updated);
        toast('ok', open ? 'Ta porte est ouverte' : 'Ta porte est fermée', open ? 'Tu reçois les demandes de tes technos.' : 'Tu ne reçois plus de demandes.');
      } catch (e) {
        toast('error', (e as Error).message);
      }
    },
    [token, toast, go, syncRadar],
  );

  const updateProfile = useCallback(
    (p: CommunityProfile) => {
      setProfile(p);
      syncRadar(p);
    },
    [syncRadar],
  );

  if (route.passeport) {
    return (
      <Suspense fallback={<PageLoading />}>
        <PasseportPublic login={route.passeport} dark={dark} toggleTheme={toggleTheme} signedIn={!!user} />
      </Suspense>
    );
  }

  if (!token || !user) {
    return <Login key={route.auth ?? 'login'} initialMode={route.auth ?? 'login'} dark={dark} toggleTheme={toggleTheme} onLogin={(t, u) => { setToken(t); setUser(u); }} />;
  }

  if (route.salle) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Salle
          token={token}
          user={user}
          requestId={route.salle}
          onLeave={() => {
            history.replaceState(null, '', location.pathname);
            go('#/accueil');
          }}
        />
      </Suspense>
    );
  }

  const shared: Shared = {
    token,
    user,
    profile,
    setProfile: updateProfile,
    alerts,
    connected,
    waiting,
    mine,
    refreshMine,
    follow: (requestId) => {
      setWaiting({ requestId, stage: 'ciblee', alerted: 0, online: 0 });
      radar.current?.send({ type: 'suivre', requestId });
      refreshMine();
    },
    stopFollowing: () => {
      setWaiting(null);
      refreshMine();
    },
    accept: (requestId) => radar.current?.send({ type: 'accepter', requestId }),
    setDoor,
    go,
    openFiche: (solution, query = '') => {
      setFicheOpen(solution);
      setFicheQuery(query);
      go('#/fiches');
    },
  };

  const doorOpen = profile?.doorStatus === 'ouverte';
  const activeTab = route.demander ? null : route.tab;

  const signOut = () =>
    void logout(token).finally(() => {
      setToken(null);
      setUser(null);
      setProfile(null);
      setAlerts([]);
      go('#/accueil');
    });

  return (
    <div className="app">
      <button type="button" className="skip" onClick={() => document.getElementById('contenu')?.focus()}>Aller au contenu</button>
      <aside className="sidebar">
        <button type="button" className="brand" onClick={() => go('#/accueil')} aria-label="Accueil">
          <Logo size={32} />
        </button>

        {NAV.map(({ tab, label, icon: Icon }) => (
          <button key={tab} type="button" className={`nav-item ${activeTab === tab ? 'active' : ''}`} onClick={() => go(`#/${tab}`)}>
            <Icon size={19} />
            {label}
            {tab === 'accueil' && alerts.length > 0 && <span className="count">{alerts.length}</span>}
          </button>
        ))}

        <button type="button" className="btn btn-neon btn-block" style={{ marginTop: 12 }} onClick={() => go('#/demander')}>
          <LifeBuoy size={18} />
          Demander de l’aide
        </button>

        <div className="spacer" />

        <button type="button" className={`door ${doorOpen ? 'open' : ''}`} onClick={() => void setDoor(!doorOpen)} aria-pressed={doorOpen}>
          {doorOpen ? <DoorOpen size={22} /> : <DoorClosed size={22} />}
          <div className="grow">
            <strong>{doorOpen ? 'Porte ouverte' : 'Porte fermée'}</strong>
            <span>{doorOpen ? (connected ? 'Tu reçois les demandes' : 'Connexion…') : 'Clique pour aider'}</span>
          </div>
        </button>

        <div className="row" style={{ marginTop: 4 }}>
          <button type="button" className="me-card grow" onClick={() => go('#/moi')}>
            <Avatar name={user.login} size={34} src={user.avatarUrl} />
            <div className="grow">
              <strong style={{ display: 'block', fontSize: '0.88rem' }}>@{user.login}</strong>
              <span className="row small muted" style={{ gap: 6 }}>
                <span className={`dot ${connected ? 'live' : ''}`} />
                {connected ? 'en ligne' : 'hors ligne'}
              </span>
            </div>
          </button>
          <ThemeButton dark={dark} toggle={toggleTheme} />
        </div>
        <button type="button" className="btn btn-text small muted" onClick={signOut} style={{ justifyContent: 'flex-start' }}>
          <LogOut size={14} /> Me déconnecter
        </button>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="brand" style={{ background: 'none', border: 0 }} onClick={() => go('#/accueil')} aria-label="Accueil">
            <Logo size={28} />
          </button>
          <div className="row">
            <button type="button" className={`badge ${doorOpen ? 'mint' : ''}`} style={{ border: 0, height: 34, cursor: 'pointer' }} onClick={() => void setDoor(!doorOpen)}>
              {doorOpen ? <DoorOpen size={14} /> : <DoorClosed size={14} />}
              {doorOpen ? 'Ouverte' : 'Fermée'}
            </button>
            <ThemeButton dark={dark} toggle={toggleTheme} />
          </div>
        </header>

        <main id="contenu" tabIndex={-1} className="page" key={route.demander ? 'demander' : route.tab}>
          <Suspense fallback={<PageLoading inline />}>
            {route.demander ? (
              <DemanderAide shared={shared} />
            ) : route.tab === 'accueil' ? (
              <Accueil shared={shared} />
            ) : route.tab === 'fiches' ? (
              <Fiches shared={shared} initialQuery={ficheQuery} initialOpen={ficheOpen} />
            ) : route.tab === 'projets' ? (
              <Projets shared={shared} />
            ) : (
              <Moi shared={shared} dark={dark} toggleTheme={toggleTheme} onLogout={signOut} />
            )}
          </Suspense>
        </main>

        <nav className="tabbar" aria-label="Navigation">
          {NAV.map(({ tab, label, icon: Icon }) => (
            <button key={tab} type="button" className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => go(`#/${tab}`)}>
              <Icon size={21} />
              {label}
              {tab === 'accueil' && alerts.length > 0 && <span className="count">{alerts.length}</span>}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function PageLoading({ inline = false }: { inline?: boolean }) {
  return (
    <div className="row" style={{ justifyContent: 'center', padding: inline ? '60px 0' : '120px 0', color: 'var(--mute)' }}>
      <Spinner /> Chargement…
    </div>
  );
}
