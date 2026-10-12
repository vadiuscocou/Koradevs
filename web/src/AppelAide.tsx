import { useEffect, useState } from 'react';
import { KNOWN_TECH, maskSecrets, type SolutionHit, type SosRequest } from '@sos/shared';
import { createWebRequest, searchSolutions } from './api.js';

export function AppelAide({ token, user, onSuccess }: { token: string; user: { login: string }; onSuccess: (requestId: string) => void }) {
  const [command, setCommand] = useState('npm run dev');
  const [errorText, setErrorText] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [selectedTech, setSelectedTech] = useState<string[]>(['TypeScript', 'React']);
  const [solutions, setSolutions] = useState<SolutionHit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');
  const [maskedPreview, setMaskedPreview] = useState<{ maskedCode: string; findingsCount: number }>({ maskedCode: '', findingsCount: 0 });

  // Real-time secret masking preview
  useEffect(() => {
    if (!codeSnippet) {
      setMaskedPreview({ maskedCode: '', findingsCount: 0 });
      return;
    }
    const res = maskSecrets(codeSnippet);
    setMaskedPreview({ maskedCode: res.text, findingsCount: res.findings.length });
  }, [codeSnippet]);

  // Search solutions as the user types the error
  useEffect(() => {
    if (errorText.trim().length > 8) {
      const timer = setTimeout(() => {
        searchSolutions(errorText)
          .then(setSolutions)
          .catch(() => {});
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setSolutions([]);
    }
  }, [errorText]);

  const toggleTech = (t: string) => {
    setSelectedTech((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errorText.trim()) {
      setErrorNotice('Veuillez décrire ou coller votre message d’erreur.');
      return;
    }
    if (selectedTech.length === 0) {
      setErrorNotice('Veuillez sélectionner au moins une technologie.');
      return;
    }

    setIsSubmitting(true);
    setErrorNotice('');

    try {
      const maskedCode = maskSecrets(codeSnippet || '// Code non renseigné').text;
      const maskedError = maskSecrets(errorText).text;

      const payload: SosRequest = {
        version: '1',
        createdAt: new Date().toISOString(),
        command,
        exitCode: 1,
        output: maskedError,
        tech: selectedTech,
        files: [
          {
            path: 'src/main.ts',
            content: maskedCode,
          },
        ],
      };

      const created = await createWebRequest(token, payload);
      onSuccess(created.id);
    } catch (err) {
      setErrorNotice((err as Error).message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="appel-aide-page">
      <main className="card" style={{ maxWidth: '780px', margin: '0 auto' }}>
        <h1 style={{ color: '#f85149', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🆘 Appel à l'aide en direct (Web & CodeFlash)
        </h1>
        <p className="hint" style={{ marginBottom: '20px' }}>
          Colle ton erreur et ton code ici. Vos secrets et clés d'API sont <b>automatiquement masqués avant tout envoi</b>.
          Dès validation, un voisin qualifié reçoit l'alerte sur son Radar et te rejoint dans la salle d'aide collaborative.
        </p>

        {errorNotice && <p className="error">{errorNotice}</p>}

        <form onSubmit={handleSubmit}>
          {/* Contexte & Commande */}
          <label>
            <b>1. Commande ou Contexte :</b>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="ex: npm run dev, docker compose up, cargo build"
              style={{ width: '100%', marginTop: '6px' }}
              required
            />
          </label>

          {/* Technos */}
          <div style={{ marginTop: '12px' }}>
            <b style={{ display: 'block', marginBottom: '8px' }}>2. Technologies concernées :</b>
            <div className="chips">
              {KNOWN_TECH.map((t) => (
                <button
                  type="button"
                  key={t}
                  className={selectedTech.includes(t) ? 'chip on' : 'chip'}
                  onClick={() => toggleTech(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Erreur */}
          <label style={{ marginTop: '14px' }}>
            <b>3. Message d’erreur / Trace :</b>
            <textarea
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              placeholder="Colle la ligne d'erreur ou la stack trace ici..."
              rows={4}
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #30363d',
                background: '#0d1117',
                color: '#ff7b72',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.85rem',
              }}
              required
            />
          </label>

          {/* Suggestions de fiches existantes */}
          {solutions.length > 0 && (
            <div className="card" style={{ background: '#1c2128', borderColor: '#388bfd', marginTop: '10px' }}>
              <b style={{ color: '#58a6ff' }}>💡 Des fiches résolues ressemblent à votre erreur :</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {solutions.map((s) => (
                  <div key={s.id} style={{ background: '#0d1117', padding: '8px 12px', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 'bold' }}>{s.title}</div>
                    <div style={{ fontSize: '0.85rem', color: '#8b949e' }}>Cause : {s.cause}</div>
                    <div style={{ fontSize: '0.85rem', color: '#3fb950' }}>Solution : {s.fix}</div>
                  </div>
                ))}
              </div>
              <p className="hint" style={{ marginTop: '8px' }}>
                Si une fiche ci-dessus règle déjà votre problème, pas besoin d'appeler un humain !
              </p>
            </div>
          )}

          {/* Code */}
          <label style={{ marginTop: '14px' }}>
            <b>4. Extrait de code source :</b>
            <textarea
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Colle le fichier ou la fonction où se produit l'erreur..."
              rows={8}
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #30363d',
                background: '#0d1117',
                color: '#e6edf3',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.85rem',
              }}
            />
          </label>

          {/* Visualisation du masquage des secrets */}
          {codeSnippet && (
            <div style={{ marginTop: '10px', fontSize: '0.85rem' }}>
              {maskedPreview.findingsCount > 0 ? (
                <span style={{ color: '#d29922' }}>
                  🛡️ <b>{maskedPreview.findingsCount} secret(s) détecté(s) et masqué(s)</b> (clés, mots de passe, tokens).
                </span>
              ) : (
                <span style={{ color: '#3fb950' }}>🛡️ Aucun secret détecté dans le code (prêt à l'envoi sécurisé).</span>
              )}
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ background: '#da3633', fontSize: '1rem', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isSubmitting ? 'Publication en cours...' : '🚨 Lancer l’Appel SOS (Entrer dans la Salle)'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
