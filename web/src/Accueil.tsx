import { useEffect, useState } from 'react';
import type { RadarAlert, SolutionHit } from '@sos/shared';
import { getNeighbors, getRecentSolutions, ringNeighbor, type CommunityProfile } from './api.js';

interface AccueilProps {
  token: string;
  user: { login: string };
  alerts: RadarAlert[];
  isDoorOpen: boolean;
  onGoToDemander: () => void;
  onGoToProjets: () => void;
  onGoToFiches: () => void;
  onToggleDoor: () => void;
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
  onGoToProjets,
  onGoToFiches,
  onToggleDoor,
  onSelectSolution,
  onAcceptAlert,
  onSearch,
}: AccueilProps) {
  const [neighbors, setNeighbors] = useState<CommunityProfile[]>([]);
  const [solutions, setSolutions] = useState<SolutionHit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ringStatus, setRingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getNeighbors(token).then(setNeighbors).catch(() => {});
    getRecentSolutions().then(setSolutions).catch(() => {});
  }, [token]);

  const handleRing = async (targetLogin: string) => {
    try {
      await ringNeighbor(token, targetLogin);
      setRingStatus((prev) => ({ ...prev, [targetLogin]: true }));
      setTimeout(() => {
        setRingStatus((prev) => ({ ...prev, [targetLogin]: false }));
      }, 3000);
    } catch {
      setRingStatus((prev) => ({ ...prev, [targetLogin]: true }));
      setTimeout(() => {
        setRingStatus((prev) => ({ ...prev, [targetLogin]: false }));
      }, 3000);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Carte Vedette : Bloqué sur un bug ? */}
      <section className="card-hero">
        <div className="hero-circle-1" />
        <div className="hero-circle-2" />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '0.9rem', color: '#DDF7E8', fontWeight: 600 }}>
            Salut {user.login}
          </span>

          <div>
            <h1 style={{ color: '#FFFFFF', fontSize: '2rem', lineHeight: 1.15, margin: '0 0 6px 0', fontWeight: 800 }}>
              Bloqué sur<br />un bug ?
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: 0, fontSize: '1rem', maxWidth: '380px' }}>
              Un voisin te rejoint en quelques minutes.
            </p>
          </div>

          <div style={{ marginTop: '6px' }}>
            <button
              type="button"
              className="btn-hero"
              onClick={onGoToDemander}
              style={{ width: '100%', maxWidth: '340px' }}
            >
              Demander de l'aide
            </button>
          </div>

          {/* 3 Raccourcis pilule sous la carte */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onGoToFiches}
              className="pill"
              style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
            >
              🔍 Rechercher
            </button>

            <button
              type="button"
              onClick={onGoToProjets}
              className="pill"
              style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
            >
              🚀 Projets
            </button>

            <button
              type="button"
              onClick={onToggleDoor}
              className="pill"
              style={{
                background: isDoorOpen ? '#DDF7E8' : 'rgba(255, 255, 255, 0.15)',
                color: isDoorOpen ? '#0B6B38' : '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isDoorOpen ? '🚪 Porte ouverte' : '🚪 Porte fermée'}
            </button>
          </div>
        </div>
      </section>

      {/* 2. Recherche en champ blanc arrondi */}
      <form onSubmit={handleSearchSubmit}>
        <input
          type="text"
          className="input-box"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une erreur, un bug, une techno…"
          style={{ height: '48px' }}
        />
      </form>

      {/* 3. Demandes pour toi (si en ligne ou alertes actives) */}
      {(isDoorOpen || alerts.length > 0) && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Demandes pour toi</h2>
            <span className="pill pill-mint">
              {alerts.length > 0 ? `${alerts.length} en direct` : 'Radar actif'}
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="card" style={{ padding: '16px 20px' }}>
              <p style={{ margin: 0, color: 'var(--color-mute)', fontSize: '0.92rem' }}>
                Ta porte est ouverte. Dès qu'un collègue demande de l'aide sur tes technos, l'alerte apparaît ici !
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alerts.map((a) => (
                <div key={a.requestId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800 }}>@{a.requester}</span>
                      <span className="pill pill-sky">{a.tech.join(' · ') || 'Code'}</span>
                    </div>
                    <code style={{ fontSize: '0.85rem', color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}>
                      {a.errorSummary}
                    </code>
                  </div>

                  <button
                    type="button"
                    className="btn-pill-deep"
                    onClick={() => onAcceptAlert(a.requestId)}
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
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Voisins disponibles</h2>
          <span className="pill pill-mint">
            {neighbors.length} en ligne
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {neighbors.map((n) => {
            const hasRung = ringStatus[n.login];
            const initial = (n.login || 'V').slice(0, 1).toUpperCase();

            return (
              <div
                key={n.userId}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-mint-bg)',
                      color: 'var(--color-mint-fg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                    }}
                  >
                    {initial}
                  </div>

                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'block' }}>
                      {n.login}
                    </span>
                    <span className="pill pill-sky" style={{ padding: '2px 8px', fontSize: '11px' }}>
                      {n.tech.slice(0, 2).join(' · ') || 'Tech'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={hasRung ? 'btn-secondary' : 'btn-pill-deep'}
                  onClick={() => handleRing(n.login)}
                >
                  {hasRung ? 'Prévenu ✓' : 'Sonner'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Dernières solutions */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Dernières solutions</h2>
          <button type="button" className="link-text" onClick={onGoToFiches} style={{ fontSize: '0.85rem' }}>
            Voir tout
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {solutions.slice(0, 4).map((sol) => (
            <div
              key={sol.id}
              className="card"
              onClick={() => onSelectSolution(sol)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'block', marginBottom: '4px' }}>
                  {sol.title}
                </span>
                <span className="pill pill-sky" style={{ padding: '2px 8px', fontSize: '11px' }}>
                  {sol.tech[0] || 'Code'}
                </span>
              </div>

              <span className="pill pill-mint">
                Confirmé
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
