import { useEffect, useState } from 'react';
import { myProfile } from './api.js';

interface ProfileData {
  stats: {
    resolvedCount: number;
    averageResolutionTime: number;
  };
  tech: string[];
}

export function Profil({ token, onBack }: { token: string; onBack: () => void }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    myProfile(token)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) {
    return (
      <main className="card narrow">
        <h1>Mon Profil</h1>
        <p className="error">{error}</p>
        <button onClick={onBack}>Retour</button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="card narrow">
        <h1>Mon Profil</h1>
        <p>Chargement...</p>
      </main>
    );
  }

  const avgMinutes = Math.round(data.stats.averageResolutionTime / 60000);

  return (
    <main className="card narrow">
      <h1>Mon Profil</h1>
      <section>
        <h2>Statistiques</h2>
        <ul>
          <li>Demandes résolues : {data.stats.resolvedCount}</li>
          <li>Temps moyen de résolution : {avgMinutes} min</li>
        </ul>
      </section>
      <section>
        <h2>Technologies</h2>
        {data.tech.length > 0 ? (
          <div className="chips">
            {data.tech.map((t) => (
              <span key={t} className="chip on">
                {t}
              </span>
            ))}
          </div>
        ) : (
          <p className="hint">Aucune technologie renseignée.</p>
        )}
      </section>
      <button onClick={onBack} style={{ marginTop: '1rem' }}>Retour</button>
    </main>
  );
}
