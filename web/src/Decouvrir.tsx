import { useEffect, useState } from 'react';
import type { SolutionHit } from '@sos/shared';
import { getCountryStats, getNeighbors, getRecentSolutions, ringNeighbor, searchSolutions, type CommunityProfile } from './api.js';
import { SignalerModal } from './SignalerModal.js';

export function Decouvrir({ token, user, onGoToAppel, onGoToProjets }: { token: string; user: { login: string }; onGoToAppel: () => void; onGoToProjets: () => void }) {
  const [solutions, setSolutions] = useState<SolutionHit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [neighbors, setNeighbors] = useState<CommunityProfile[]>([]);
  const [countries, setCountries] = useState<Array<{ country: string; points: number }>>([]);
  const [ringNotice, setRingNotice] = useState<string | null>(null);
  const [reportingSolution, setReportingSolution] = useState<SolutionHit | null>(null);

  useEffect(() => {
    getRecentSolutions().then(setSolutions).catch(() => {});
    getNeighbors(token).then(setNeighbors).catch(() => {});
    getCountryStats().then(setCountries).catch(() => {});
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
      setTimeout(() => setRingNotice(null), 4000);
    } catch {
      setRingNotice(`Impossible de sonner chez @${targetLogin}`);
    }
  };

  const shareOnWhatsApp = (sol: SolutionHit) => {
    const text = `💡 Fiche solution KoraDevs : ${sol.title}\n\nCause : ${sol.cause}\nCorrection : ${sol.fix}\n\nRetrouve plus de solutions sur KoraDevs !`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="decouvrir-page">
      {/* Hero Banner */}
      <section className="card hero-card" style={{ background: 'linear-gradient(135deg, #161b22 0%, #1f2937 100%)', border: '1px solid #3b82f6', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#60a5fa', marginBottom: '8px' }}>
          Bienvenue dans le Quartier KoraDevs 👋
        </h1>
        <p style={{ margin: '0 0 16px', color: '#cbd5e1', lineHeight: '1.5' }}>
          La plateforme d’échange et d’entraide panafricaine pour les développeurs.
          Quand tu bloques, un voisin te rejoint instantanément en live-coding avec <b>CodeFlash</b>.
          Chaque aide résolue devient un savoir partagé et nourrit ton <b>Passeport de compétences</b>.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={onGoToAppel} style={{ background: '#2563eb', padding: '10px 16px' }}>
            🆘 Lancer un Appel à l'aide
          </button>
          <button onClick={onGoToProjets} style={{ background: '#10b981', padding: '10px 16px' }}>
            🚀 Découvrir la Vitrine Projets
          </button>
        </div>
      </section>

      {/* Grid: Coupe par pays & Chantiers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Widget Coupe par Pays */}
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{ margin: 0 }}>🏆 Coupe d’Afrique de l’Entraide</h2>
            <span style={{ fontSize: '0.8rem', background: '#374151', padding: '2px 8px', borderRadius: '12px', color: '#93c5fd' }}>
              Cette semaine
            </span>
          </div>
          <p className="hint" style={{ marginBottom: '12px' }}>
            Classement collectif des pays selon les blocages résolus ensemble. Aucun classement toxique individuel !
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {countries.map((c, i) => (
              <div
                key={c.country}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  background: i === 0 ? '#1e3a5f' : '#0d1117',
                  borderRadius: '6px',
                  border: i === 0 ? '1px solid #3b82f6' : '1px solid #21262d',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 'bold', width: '20px', color: i === 0 ? '#fbbf24' : '#9ca3af' }}>
                    #{i + 1}
                  </span>
                  <span>{c.country}</span>
                </div>
                <b style={{ color: '#60a5fa' }}>{c.points} pts</b>
              </div>
            ))}
          </div>
        </section>

        {/* Chantiers « Premier correctif » */}
        <section className="card">
          <h2 style={{ margin: '0 0 8px' }}>🛠️ Chantiers « Premier correctif »</h2>
          <p className="hint" style={{ marginBottom: '12px' }}>
            Besoin d’aider pour faire tes preuves ? Rejoins un premier ticket facile pour débuter sur la plateforme :
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ background: '#0d1117', padding: '10px', borderRadius: '6px', border: '1px solid #30363d' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>Correction CSS sur les formulaires mobiles</b>
                <span className="stage ciblee">Facile</span>
              </div>
              <p className="hint" style={{ margin: '4px 0 0' }}>Projet : AfriCode Hub · Technos : CSS, React</p>
            </div>
            <div style={{ background: '#0d1117', padding: '10px', borderRadius: '6px', border: '1px solid #30363d' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>Validation de numéro Mobile Money Bénin / Togo</b>
                <span className="stage elargie">Intermédiaire</span>
              </div>
              <p className="hint" style={{ margin: '4px 0 0' }}>Projet : KoraPay · Technos : Python, Regex</p>
            </div>
          </div>
        </section>
      </div>

      {/* Voisins du Quartier */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <h2>🏡 Voisins disponibles dans le Quartier</h2>
        <p className="hint">
          Les développeurs qui ont leur <b>porte ouverte</b>. Tu peux sonner à leur porte pour échanger ou demander un coup de main !
        </p>
        {ringNotice && (
          <div className="card success" style={{ padding: '8px 12px', marginBottom: '12px' }}>
            {ringNotice}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
          {neighbors.map((n) => (
            <div
              key={n.userId}
              style={{
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <b style={{ color: '#58a6ff' }}>@{n.login}</b>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '99px',
                      background: n.doorStatus === 'ouverte' ? '#238636' : '#6e7681',
                      color: '#fff',
                    }}
                  >
                    {n.doorStatus === 'ouverte' ? '🚪 Porte ouverte' : '🚪 Porte fermée'}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#8b949e', margin: '0 0 6px' }}>
                  📍 {n.city}, {n.country}
                </p>
                <p style={{ fontSize: '0.85rem', margin: '0 0 10px', color: '#c9d1d9' }}>
                  {n.bio}
                </p>
                <div className="chips" style={{ marginBottom: '10px' }}>
                  {n.tech.map((t) => (
                    <span key={t} className="chip on" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRing(n.login)}
                style={{
                  background: '#21262d',
                  border: '1px solid #30363d',
                  color: '#c9d1d9',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                🔔 Sonner à sa porte
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Bibliothèque de fiches solutions */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <h2>📚 Bibliothèque de Fiches Solutions</h2>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: '1', maxWidth: '400px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une erreur, un bug, une techno..."
              style={{ flex: 1, padding: '8px 12px' }}
            />
            <button type="submit" disabled={isSearching}>
              {isSearching ? '...' : 'Chercher'}
            </button>
          </form>
        </div>

        {solutions.length === 0 ? (
          <p className="hint">Aucune fiche solution ne correspond à cette recherche.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {solutions.map((sol) => (
              <article
                key={sol.id}
                style={{
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: '#58a6ff' }}>{sol.title}</h3>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="stage" style={{ background: '#238636' }}>
                      ✓ Confirmé
                    </span>
                    <button
                      type="button"
                      className="link"
                      onClick={() => shareOnWhatsApp(sol)}
                      style={{ color: '#25D366', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      📲 WhatsApp
                    </button>
                    <button
                      type="button"
                      className="link"
                      onClick={() => setReportingSolution(sol)}
                      style={{ color: '#8b949e', fontSize: '0.85rem' }}
                    >
                      ⚠️ Signaler
                    </button>
                  </div>
                </div>

                <div className="chips" style={{ margin: '6px 0 10px' }}>
                  {sol.tech.map((t) => (
                    <span key={t} className="chip" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                      {t}
                    </span>
                  ))}
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <b style={{ color: '#ff7b72', fontSize: '0.9rem' }}>Erreur : </b>
                  <code style={{ background: '#161b22', padding: '2px 6px', borderRadius: '4px', color: '#ff7b72', fontSize: '0.85rem' }}>
                    {sol.error}
                  </code>
                </div>

                <div style={{ marginBottom: '6px', fontSize: '0.9rem' }}>
                  <b style={{ color: '#d29922' }}>Cause : </b>
                  <span style={{ color: '#c9d1d9' }}>{sol.cause}</span>
                </div>

                <div style={{ fontSize: '0.9rem' }}>
                  <b style={{ color: '#3fb950' }}>Correction validée : </b>
                  <pre
                    style={{
                      background: '#161b22',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      margin: '6px 0 0',
                      overflowX: 'auto',
                      color: '#e6edf3',
                      fontSize: '0.85rem',
                    }}
                  >
                    {sol.fix}
                  </pre>
                </div>
              </article>
            ))}
          </div>
        )}
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
