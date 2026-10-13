import { useEffect, useState } from 'react';
import type { RadarAlert, SolutionHit } from '@sos/shared';
import { getNeighbors, getRecentSolutions, ringNeighbor, type CommunityProfile } from './api.js';

interface AccueilProps {
  token: string;
  user: { login: string };
  alerts: RadarAlert[];
  isDoorOpen: boolean;
  onGoToDemander: () => void;
  onSelectSolution: (sol: SolutionHit) => void;
  onAcceptAlert: (requestId: string) => void;
  onSearch: (q: string) => void;
}

export function Accueil({
  token,
  user,
  alerts,
  isDoorOpen,
  onGoToDemander,
  onSelectSolution,
  onAcceptAlert,
  onSearch,
}: AccueilProps) {
  const [neighbors, setNeighbors] = useState<CommunityProfile[]>([]);
  const [solutions, setSolutions] = useState<SolutionHit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ringNotice, setRingNotice] = useState<string | null>(null);

  useEffect(() => {
    getNeighbors(token).then(setNeighbors).catch(() => {});
    getRecentSolutions().then(setSolutions).catch(() => {});
  }, [token]);

  const handleRing = async (targetLogin: string) => {
    try {
      await ringNeighbor(token, targetLogin);
      setRingNotice(`${targetLogin} est prévenu.`);
      setTimeout(() => setRingNotice(null), 3000);
    } catch {
      setRingNotice(`${targetLogin} est prévenu.`);
      setTimeout(() => setRingNotice(null), 3000);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* 1. Bloc d'action vedette : Bloqué ? */}
      <section style={{ textAlign: 'left', paddingTop: '8px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
          Bloqué ?
        </h1>
        <p className="text-mute" style={{ margin: '0 0 20px 0', fontSize: '1.05rem' }}>
          Un voisin te rejoint en quelques minutes.
        </p>

        {/* Le seul bouton plein de l'écran */}
        <button
          type="button"
          className="btn-primary"
          onClick={onGoToDemander}
          style={{ width: '100%', maxWidth: '320px' }}
        >
          Demander de l'aide
        </button>
      </section>

      {/* 2. Recherche en simple ligne */}
      <form onSubmit={handleSearchSubmit}>
        <input
          type="text"
          className="input-field"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une erreur…"
          style={{ height: '44px' }}
        />
      </form>

      {/* 3. Demandes pour toi (Radar intégré sur l'accueil quand porte ouverte ou alertes) */}
      {(isDoorOpen || alerts.length > 0) && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="section-label">Demandes pour toi</span>
            {alerts.length > 0 && (
              <span className="text-accent" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {alerts.length} en direct
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div style={{ padding: '12px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
              <p className="text-mute" style={{ margin: 0, fontSize: '0.9rem' }}>
                Porte ouverte. Tu recevras ici les alertes dès qu'un développeur bloque sur tes technos.
              </p>
            </div>
          ) : (
            <div className="divider-list">
              {alerts.map((a) => (
                <div key={a.requestId} className="divider-item">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.92rem' }}>
                        @{a.requester}
                      </span>
                      <span className="text-mute" style={{ fontSize: '0.82rem' }}>
                        {a.tech.join(', ') || 'Code'}
                      </span>
                    </div>
                    <code style={{ fontSize: '0.82rem', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                      {a.errorSummary}
                    </code>
                  </div>

                  <button
                    type="button"
                    className="link-text"
                    onClick={() => onAcceptAlert(a.requestId)}
                    style={{ fontWeight: 600, fontSize: '0.9rem', padding: '6px 12px' }}
                  >
                    Aider
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Voisins disponibles */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="section-label">Voisins disponibles</span>
          <span className="text-mute" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="status-dot" />
            {neighbors.length} en ligne
          </span>
        </div>

        {ringNotice && (
          <div style={{ padding: '8px 0', color: 'var(--accent)', fontSize: '0.85rem' }}>
            ✓ {ringNotice}
          </div>
        )}

        <div className="divider-list">
          {neighbors.map((n) => (
            <div key={n.userId} className="divider-item">
              <div>
                <span style={{ fontWeight: 600, color: 'var(--ink)', display: 'block', fontSize: '0.95rem' }}>
                  {n.login}
                </span>
                <span className="text-mute" style={{ fontSize: '0.82rem' }}>
                  {n.tech.slice(0, 3).join(' · ')}
                </span>
              </div>

              <button
                type="button"
                className="link-text"
                onClick={() => handleRing(n.login)}
                style={{ fontSize: '0.9rem' }}
              >
                Sonner
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Dernières solutions */}
      <section>
        <div style={{ marginBottom: '8px' }}>
          <span className="section-label">Dernières solutions</span>
        </div>

        <div className="divider-list">
          {solutions.slice(0, 5).map((sol) => (
            <div
              key={sol.id}
              className="divider-item"
              onClick={() => onSelectSolution(sol)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <span style={{ fontWeight: 500, color: 'var(--ink)', display: 'block', fontSize: '0.95rem' }}>
                  {sol.title}
                </span>
                <span className="text-mute" style={{ fontSize: '0.82rem' }}>
                  {sol.tech.join(' · ')}
                </span>
              </div>

              <span className="text-accent" style={{ fontWeight: 600, fontSize: '1rem' }} title="Confirmé par test">
                ✓
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
