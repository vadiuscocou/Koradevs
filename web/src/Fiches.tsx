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
    setShareNotice('Lien copié / Partagé.');
    setTimeout(() => setShareNotice(null), 2500);
  };

  // VUE DÉTAIL D'UNE FICHE
  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <button
            type="button"
            className="link-text"
            onClick={() => {
              setSelected(null);
              onClearSelection?.();
            }}
            style={{ fontSize: '0.9rem', marginBottom: '16px', display: 'inline-block' }}
          >
            ← Fiches
          </button>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 600, margin: '0 0 8px 0', lineHeight: 1.25 }}>
            {selected.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="text-mute" style={{ fontSize: '0.9rem' }}>
              {selected.tech.join(' · ')}
            </span>
            <span className="badge-confirmed">
              ✓ Confirmé par test
            </span>
          </div>
        </div>

        {/* Section CAUSE */}
        <div>
          <span className="section-label">CAUSE</span>
          <p style={{ margin: '4px 0 0 0', color: 'var(--ink)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {selected.cause}
          </p>
        </div>

        {/* Section CORRECTION */}
        <div>
          <span className="section-label">CORRECTION</span>
          <pre className="code-block" style={{ marginTop: '6px' }}>
            {selected.fix}
          </pre>
        </div>

        {/* Actions texte en bas : Partager et Signaler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
          <button
            type="button"
            className="link-text"
            onClick={() => handleShare(selected)}
            style={{ fontSize: '0.9rem' }}
          >
            Partager
          </button>

          <button
            type="button"
            className="link-text"
            onClick={() => setReportingSolution(selected)}
            style={{ fontSize: '0.9rem', color: 'var(--mute)' }}
          >
            Signaler
          </button>

          {shareNotice && (
            <span className="text-accent" style={{ fontSize: '0.85rem' }}>
              ✓ {shareNotice}
            </span>
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

  // VUE LISTE DES FICHES
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 600, margin: '0 0 16px 0' }}>
          Fiches
        </h1>

        <form onSubmit={handleSearch}>
          <input
            type="text"
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une erreur, un bug, une techno…"
            style={{ height: '44px' }}
          />
        </form>
      </div>

      <div className="divider-list">
        {solutions.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p className="text-mute" style={{ margin: 0 }}>
              Aucune fiche trouvée pour cette recherche.
            </p>
          </div>
        ) : (
          solutions.map((sol) => (
            <div
              key={sol.id}
              className="divider-item"
              onClick={() => setSelected(sol)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ paddingRight: '12px' }}>
                <span style={{ fontWeight: 500, color: 'var(--ink)', display: 'block', fontSize: '0.95rem', marginBottom: '2px' }}>
                  {sol.title}
                </span>
                <span className="text-mute" style={{ fontSize: '0.82rem' }}>
                  {sol.tech.join(' · ')}
                </span>
              </div>

              <span className="badge-confirmed" style={{ flexShrink: 0 }}>
                ✓ Confirmé
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
