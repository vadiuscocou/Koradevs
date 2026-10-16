import { useEffect, useState } from 'react';
import { ArrowRight, BellRing, BookOpen, Check, Clock, DoorOpen, LifeBuoy, Radio, Search, Sparkles, Users, X } from 'lucide-react';
import type { SolutionHit } from '@sos/shared';
import { cancelRequest, getConfirmedIds, getNeighbors, getRecentSolutions, getStats, ringNeighbor, type CommunityProfile } from './api.js';
import type { Shared } from './App.js';
import { Avatar, Badge, Empty, Skeletons, timeAgo, useToast } from './ui.js';

export function Accueil({ shared }: { shared: Shared }) {
  const { token, user, profile, alerts, connected, go, mine } = shared;
  const toast = useToast();
  const [neighbors, setNeighbors] = useState<CommunityProfile[] | null>(null);
  const [solutions, setSolutions] = useState<SolutionHit[] | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [rang, setRang] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<{ fiches: number; aides: number; confirmees: number; aidants: number } | null>(null);
  const [guideHidden, setGuideHidden] = useState(() => {
    try {
      return localStorage.getItem('kd.guide') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    getNeighbors(token).then(setNeighbors, () => setNeighbors([]));
    getRecentSolutions().then(setSolutions, () => setSolutions([]));
    getConfirmedIds().then((ids) => setConfirmed(new Set(ids)), () => undefined);
    getStats().then(setStats, () => undefined);
  }, [token]);

  const ring = async (login: string) => {
    try {
      const result = await ringNeighbor(token, login);
      toast(result.success ? 'ok' : 'error', result.message);
      if (result.success) setRang((r) => ({ ...r, [login]: true }));
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };

  const doorOpen = profile?.doorStatus === 'ouverte';
  const ready = !!profile && profile.tech.length > 0 && doorOpen;
  const hideGuide = () => {
    setGuideHidden(true);
    try {
      localStorage.setItem('kd.guide', '1');
    } catch {
      /* ignore */
    }
  };
  const steps = [
    { done: ready, title: 'Choisis tes technos et ouvre ta porte', text: 'Tu reçois en direct les demandes que tu sais résoudre.', action: 'Ouvrir ma porte', go: '#/moi' },
    { done: mine.length > 0, title: 'Demande de l’aide quand tu bloques', text: 'Colle ton erreur : un voisin te rejoint, même si tu fermes la page.', action: 'Demander', go: '#/demander' },
    { done: false, title: 'Cherche avant de demander', text: 'Chaque aide résolue devient une fiche que tout le monde retrouve.', action: 'Voir les fiches', go: '#/fiches' },
  ];

  return (
    <div className="stack-lg">
      <section className="hero">
        <span className="eyebrow">
          <Sparkles size={14} /> Salut @{user.login}
        </span>
        <h1>Bloqué sur un bug ?<br />Un voisin te rejoint.</h1>
        <p>Colle ton erreur : un développeur disponible entre avec toi dans une salle de code partagée, sans rien installer.</p>
        <div className="actions">
          <button type="button" className="btn btn-neon btn-lg" onClick={() => go('#/demander')}>
            <LifeBuoy size={19} /> Demander de l’aide
          </button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => go('#/fiches')}>
            <BookOpen size={19} /> Parcourir les fiches
          </button>
        </div>
      </section>

      {stats && (
        <div className="grid-3" aria-label="Chiffres de la plateforme">
          <div className="stat-tile"><b>{stats.fiches}</b><span>fiche{stats.fiches > 1 ? 's' : ''} solution{stats.fiches > 1 ? 's' : ''}</span></div>
          <div className="stat-tile"><b>{stats.aides}</b><span>aide{stats.aides > 1 ? 's' : ''} publiée{stats.aides > 1 ? 's' : ''}</span></div>
          <div className="stat-tile"><b>{stats.aidants}</b><span>aidant{stats.aidants > 1 ? 's' : ''} à leur porte</span></div>
        </div>
      )}

      {!guideHidden && !(ready && mine.length > 0) && (
        <section className="card col" style={{ gap: 14 }}>
          <div className="row between">
            <div>
              <h2 className="section-title">Pour bien démarrer</h2>
              <p className="muted small">Trois gestes, deux minutes.</p>
            </div>
            <button type="button" className="btn btn-icon" aria-label="Masquer le guide" onClick={hideGuide}><X size={16} /></button>
          </div>
          <ol className="guide">
            {steps.map((s, i) => (
              <li key={s.title} className={s.done ? 'done' : ''}>
                <span className="n">{s.done ? <Check size={14} /> : i + 1}</span>
                <div className="grow">
                  <strong>{s.title}</strong>
                  <div className="small muted">{s.text}</div>
                </div>
                {!s.done && <button type="button" className="btn btn-soft btn-sm" onClick={() => go(s.go)}>{s.action}</button>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {mine.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="section-title">Mes demandes</h2>
            <Badge tone="peach">{mine.length}</Badge>
          </div>
          <div className="col">
            {mine.map((r) => (
              <div key={r.id} className={`alert-card ${r.status === 'acceptee' ? 'live' : ''}`}>
                {r.status === 'acceptee' && r.helper ? <Avatar name={r.helper} /> : <Clock size={22} color="var(--faint)" />}
                <div className="grow">
                  <strong>
                    {r.status === 'acceptee' ? `@${r.helper ?? 'un aidant'} t’attend dans la salle` : 'En attente d’un aidant'}
                  </strong>
                  <span className="error-line" title={r.errorSummary}>{r.errorSummary || r.command}</span>
                  <span className="small faint">
                    {r.tech.join(' · ')} · {timeAgo(r.createdAt)}
                    {r.status === 'ouverte' && ' · reste ouverte jusqu’à 24 h'}
                  </span>
                </div>
                {r.status === 'acceptee' ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => go(`#/salle/${r.id}`)}>Entrer</button>
                ) : (
                  <>
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => go('#/demander')}>Voir</button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      aria-label="Annuler cette demande"
                      onClick={async () => {
                        await cancelRequest(token, r.id).catch(() => undefined);
                        shared.stopFollowing();
                      }}
                    >
                      Annuler
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) shared.openFiche(null, query.trim());
        }}
      >
        <Search size={19} />
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher une erreur, un message, une techno…" aria-label="Rechercher une fiche" />
      </form>

      <section>
        <div className="section-head">
          <h2 className="section-title">Demandes pour toi</h2>
          {alerts.length > 0 ? <Badge tone="mint">{alerts.length} en direct</Badge> : <Badge tone={doorOpen && connected ? 'mint' : ''}>{doorOpen && connected ? 'Radar actif' : 'Radar éteint'}</Badge>}
        </div>

        {alerts.length > 0 ? (
          <div className="col">
            {alerts.map((a) => (
              <div key={a.requestId} className="alert-card live">
                <Avatar name={a.requester} />
                <div className="grow">
                  <div className="row wrap" style={{ gap: 8 }}>
                    <strong>@{a.requester}</strong>
                    <Badge tone="sky">{a.tech.join(' · ') || 'Code'}</Badge>
                    {a.stage !== 'ciblee' && <Badge tone="peach">{a.stage === 'publique' ? 'file publique' : 'technos proches'}</Badge>}
                  </div>
                  <span className="error-line" title={a.errorSummary}>{a.errorSummary}</span>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => shared.accept(a.requestId)}>
                  Aider
                </button>
              </div>
            ))}
          </div>
        ) : doorOpen ? (
          <Empty icon={<Radio size={26} />} title="Ta porte est ouverte">
            {connected ? 'Dès qu’une demande correspond à tes technos, elle apparaît ici.' : 'Connexion au Radar en cours…'}
          </Empty>
        ) : (
          <Empty icon={<DoorOpen size={26} />} title="Ta porte est fermée">
            <button type="button" className="btn btn-soft btn-sm" style={{ marginTop: 8 }} onClick={() => void shared.setDoor(true)}>
              Ouvrir ma porte pour aider
            </button>
          </Empty>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2 className="section-title">Voisins à leur porte</h2>
          <Badge>{neighbors?.length ?? 0} en ligne</Badge>
        </div>
        {neighbors === null ? (
          <Skeletons count={2} />
        ) : neighbors.length === 0 ? (
          <Empty icon={<Users size={26} />} title="Personne n’a ouvert sa porte pour l’instant">
            Invite un ami développeur : dès qu’il ouvre sa porte, il apparaît ici.
          </Empty>
        ) : (
          <div className="grid-2">
            {neighbors.map((n) => (
              <div key={n.userId} className="card tight row">
                <Avatar name={n.login} size={42} />
                <div className="grow">
                  <strong>@{n.login}</strong>
                  <div className="small muted">{[n.city, n.country].filter(Boolean).join(', ') || 'Lieu non renseigné'}</div>
                  <div className="row wrap" style={{ gap: 4, marginTop: 6 }}>
                    {n.tech.slice(0, 3).map((t) => (
                      <Badge key={t} tone="sky">{t}</Badge>
                    ))}
                  </div>
                </div>
                <button type="button" className={`btn btn-sm ${rang[n.login] ? 'btn-ghost' : 'btn-soft'}`} onClick={() => void ring(n.login)} disabled={rang[n.login]}>
                  <BellRing size={15} /> {rang[n.login] ? 'Prévenu' : 'Sonner'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2 className="section-title">Dernières fiches</h2>
          <button type="button" className="btn btn-text small" onClick={() => go('#/fiches')}>
            Tout voir <ArrowRight size={14} />
          </button>
        </div>
        {solutions === null ? (
          <Skeletons count={3} />
        ) : solutions.length === 0 ? (
          <Empty icon={<BookOpen size={26} />} title="Aucune fiche pour le moment">Chaque aide résolue ajoute une fiche à la bibliothèque.</Empty>
        ) : (
          <div className="col">
            {solutions.slice(0, 4).map((s) => (
              <button key={s.id} type="button" className="card interactive fiche-row" style={{ textAlign: 'left', width: '100%', font: 'inherit', color: 'inherit' }} onClick={() => shared.openFiche(s)}>
                <div className="grow">
                  <h3>{s.title}</h3>
                  <div className="row wrap" style={{ gap: 6 }}>
                    {s.tech.slice(0, 3).map((t) => (
                      <Badge key={t} tone="sky">{t}</Badge>
                    ))}
                  </div>
                </div>
                {confirmed.has(s.id) && <Badge tone="mint">Confirmé</Badge>}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
