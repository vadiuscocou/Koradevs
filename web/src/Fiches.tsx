import { useEffect, useState } from 'react';
import type { SolutionHit } from '@sos/shared';
import { getRecentSolutions, searchSolutions } from './api.js';
import { SignalerModal } from './SignalerModal.js';

interface FichesProps {
  token: string;
  initialQuery?: string;
  selectedSolution?: SolutionHit | null;
  onClearSelection?: () => void;
}

export function Fiches({ token, initialQuery = '', selectedSolution: propSelected, onClearSelection }: FichesProps) {
  const [solutions, setSolutions] = useState<SolutionHit[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<SolutionHit | null>(propSelected || null);
  const [reportingSolution, setReportingSolution] = useState<SolutionHit | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    if (propSelected) {
      setSelected(propSelected);
    }
  }, [propSelected]);

  useEffect(() => {
    if (initialQuery.trim()) {
      setSearchQuery(initialQuery);
      searchSolutions(initialQuery).then(setSolutions).catch(() => {});
    } else {
      getRecentSolutions().then(setSolutions).catch(() => {});
    }
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      getRecentSolutions().then(setSolutions).catch(() => {});
      return;
    }
    searchSolutions(searchQuery).then(setSolutions).catch(() => {});
  };

  const handleShare = (sol: SolutionHit) => {
    const text = `💡 Fiche solution KoraDevs : ${sol.title}\n\nCause : ${sol.cause}\nCorrection : ${sol.fix}\n\nConfirmé par test sur KoraDevs !`;
    if (navigator.share) {
      navigator.share({ title: sol.title, text }).catch(() => {});
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
    setShareNotice('Partagé ✓');
    setTimeout(() => setShareNotice(null), 2500);
  };

  // VUE DÉTAIL D'UNE FICHE
  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <button
            type="button"
            className="link-text"
            onClick={() => {
              setSelected(null);
              onClearSelection?.();
            }}
            style={{ fontSize: '0.95rem', marginBottom: '12px', display: 'inline-block' }}
          >
            ← Fiche solution
          </button>

          <h1 style={{ fontSize: '1.6rem', lineHeight: 1.25, margin: '0 0 10px 0' }}>
            {selected.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {selected.tech.map((t) => (
              <span key={t} className="pill pill-sky">
                {t}
              </span>
            ))}
            <span className="pill pill-mint">
              Confirmé par test
            </span>
          </div>
        </div>

        {/* Cause */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-mute)', letterSpacing: '0.04em' }}>
            Cause
          </span>
          <p style={{ margin: '6px 0 0 0', color: 'var(--color-ink)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {selected.cause}
          </p>
        </div>

        {/* Correction dans un bloc de code sombre #0F1A16 */}
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-mute)', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
            Correction
          </span>
          <pre className="code-editor-box" style={{ margin: 0 }}>
            {selected.fix}
          </pre>
        </div>

        {/* Carte menthe : Réglé en 6 minutes... */}
        <div
          className="card"
          style={{
            backgroundColor: 'var(--color-mint-bg)',
            color: 'var(--color-mint-fg)',
            borderColor: 'transparent',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
            Réglé en 6 minutes avec un aidant.
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            Publié avec l'accord des deux développeurs.
          </div>
        </div>

        {/* Bouton Partager (vert profond) et lien Signaler */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginTop: '6px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleShare(selected)}
            style={{ flex: 1 }}
          >
            {shareNotice || 'Partager'}
          </button>

          <button
            type="button"
            className="link-text"
            onClick={() => setReportingSolution(selected)}
            style={{ fontSize: '0.9rem', color: 'var(--color-mute)' }}
          >
            Signaler
          </button>
        </div>

        {reportingSolution && (
          <SignalerModal
            token={token}
            targetType="fiche"
            targetId={reportingSolution.id}
            targetTitle={reportingSolution.title}
            onClose={() => setReportingSolution(null)}
          />
        )}
      </div>
    );
  }

  // VUE LISTE DES FICHES
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', margin: '0 0 14px 0' }}>
          Fiches solutions
        </h1>

        <form onSubmit={handleSearch}>
          <input
            type="text"
            className="input-box"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une erreur, un bug, une techno…"
            style={{ height: '48px' }}
          />
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {solutions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <p style={{ margin: 0, color: 'var(--color-mute)' }}>
              Aucune fiche trouvée pour cette recherche.
            </p>
          </div>
        ) : (
          solutions.map((sol) => (
            <div
              key={sol.id}
              className="card"
              onClick={() => setSelected(sol)}
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
                <div style={{ display: 'flex', gap: '6px' }}>
                  {sol.tech.slice(0, 2).map((t) => (
                    <span key={t} className="pill pill-sky" style={{ padding: '2px 8px', fontSize: '11px' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <span className="pill pill-mint">
                Confirmé par test
              </span>
            </div>
          ))
        )}
      </div>

      {reportingSolution && (
        <SignalerModal
          token={token}
          targetType="fiche"
          targetId={reportingSolution.id}
          targetTitle={reportingSolution.title}
          onClose={() => setReportingSolution(null)}
        />
      )}
    </div>
  );
}
