import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Bell,
  Flag,
  Share2,
  Search,
  ExternalLink,
  Users,
  LifeBuoy,
} from 'lucide-react';
import type { SolutionHit } from '@sos/shared';
import { getCommunityProfile, getNeighbors, getRecentSolutions, ringNeighbor, searchSolutions, type CommunityProfile } from './api.js';
import { AfricanPatternBanner } from './Logo.js';
import { SignalerModal } from './SignalerModal.js';

export function Decouvrir({ token, user, onGoToAppel, onGoToProjets }: { token: string; user: { login: string }; onGoToAppel: () => void; onGoToProjets: () => void }) {
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [solutions, setSolutions] = useState<SolutionHit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [neighbors, setNeighbors] = useState<CommunityProfile[]>([]);
  const [ringNotice, setRingNotice] = useState<string | null>(null);
  const [reportingSolution, setReportingSolution] = useState<SolutionHit | null>(null);

  useEffect(() => {
    getCommunityProfile(token).then(setProfile).catch(() => {});
    getRecentSolutions().then(setSolutions).catch(() => {});
    getNeighbors(token).then(setNeighbors).catch(() => {});
  }, [token]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      getRecentSolutions().then(setSolutions).catch(() => {});
      return;
    }
    setIsSearching(true);
    try {
      const hits = await searchSolutions(searchQuery);
      setSolutions(hits);
    } catch {
      // fallback
    } finally {
      setIsSearching(false);
    }
  };

  const handleRing = async (targetLogin: string) => {
    try {
      const res = await ringNeighbor(token, targetLogin);
      setRingNotice(res.message);
      setTimeout(() => setRingNotice(null), 3500);
    } catch {
      setRingNotice(`Sonnette activée chez @${targetLogin}`);
      setTimeout(() => setRingNotice(null), 3500);
    }
  };

  const shareOnWhatsApp = (sol: SolutionHit) => {
    const text = `💡 Fiche solution KoraDevs : ${sol.title}\n\nErreur : ${sol.error}\nCorrection : ${sol.fix}\n\nValidé par les pairs sur KoraDevs !`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="decouvrir-container">
      {/* Salutation sobre en haut */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>
          Salut {user.login}
        </h1>
        <p className="hint" style={{ margin: '2px 0 0' }}>
          📍 {profile?.city || 'Cotonou'} · {profile?.doorStatus === 'ouverte' ? '🚪 porte ouverte' : '🚪 porte fermée'}
        </p>
      </div>

      {/* Carte Vedette Émeraude avec bande motif ouest-africain */}
      <section className="card hero-banner" style={{ padding: 0, marginBottom: '24px' }}>
        <AfricanPatternBanner height={8} />
        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
            Bloqué sur un bug ? Un voisin te rejoint.
          </h2>
          <p style={{ margin: '0 0 18px', opacity: 0.9, fontSize: '0.95rem' }}>
            Quand l'IA tourne en rond, appelle un développeur qui connaît ta techno. Pas de visio interminable : un mini-IDE en direct.
          </p>
          <button
            type="button"
            className="btn-action"
            onClick={onGoToAppel}
            style={{ minHeight: '44px', padding: '10px 20px', cursor: 'pointer' }}
          >
            <LifeBuoy size={18} />
            Appeler un voisin
          </button>
        </div>
      </section>

      {/* Voisins disponibles (Rond d'avatars avec initiale) */}
      <section style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Voisins disponibles</h2>
          <span className="hint" style={{ fontSize: '0.85rem' }}>
            Portes ouvertes dans le quartier
          </span>
        </div>

        {ringNotice && (
          <div style={{ background: 'var(--color-brand-soft)', border: '1px solid var(--color-brand)', color: 'var(--color-brand)', padding: '8px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.88rem' }}>
            🔔 {ringNotice}
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
          {neighbors.map((n) => (
            <div
              key={n.userId}
              onClick={() => handleRing(n.login)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                minWidth: '64px',
              }}
              title={`Sonner chez @${n.login} (${n.city})`}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--color-brand-soft)',
                  border: '2px solid var(--color-brand)',
                  color: 'var(--color-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  position: 'relative',
                  transition: 'transform 0.15s ease',
                }}
              >
                {n.login.slice(0, 1).toUpperCase()}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#238636',
                    border: '2px solid var(--color-card)',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>
                {n.login}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                {n.city}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Fiches récentes confirmées */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Fiches récentes confirmées</h2>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une erreur..."
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            />
            <button type="submit" className="secondary" style={{ minHeight: '36px', padding: '6px 12px' }}>
              <Search size={14} />
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {solutions.length === 0 ? (
            <p className="hint">Aucune fiche récente trouvée.</p>
          ) : (
            solutions.map((s) => (
              <div key={s.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                  <b style={{ fontSize: '1rem', color: 'var(--color-text)' }}>{s.title}</b>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge-confirmed">
                      <BadgeCheck size={14} />
                      Confirmé
                    </span>
                    <button
                      type="button"
                      className="link"
                      onClick={() => shareOnWhatsApp(s)}
                      style={{ color: '#25D366' }}
                      title="Partager sur WhatsApp"
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      type="button"
                      className="link"
                      onClick={() => setReportingSolution(s)}
                      style={{ color: 'var(--color-slate)' }}
                      title="Signaler"
                    >
                      <Flag size={15} />
                    </button>
                  </div>
                </div>

                <div className="chips" style={{ marginBottom: '8px' }}>
                  {s.tech.map((t) => (
                    <span key={t} className="chip" style={{ fontSize: '0.75rem', padding: '2px 8px', minHeight: '24px' }}>
                      {t}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  <b>Cause :</b> {s.cause}
                </div>

                <pre
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    margin: 0,
                    fontSize: '0.82rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text)',
                    overflowX: 'auto',
                  }}
                >
                  {s.fix}
                </pre>
              </div>
            ))
          )}
        </div>
      </section>

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
