import { useEffect, useState } from 'react';
import { KNOWN_TECH, maskSecrets, type SosRequest } from '@sos/shared';
import { createWebRequest } from './api.js';

interface DemanderAideProps {
  token: string;
  user: { login: string };
  onBack: () => void;
  onSuccess: (requestId: string) => void;
}

export function DemanderAide({ token, user, onBack, onSuccess }: DemanderAideProps) {
  const [content, setContent] = useState('');
  const [detectedTech, setDetectedTech] = useState<string>('React');
  const [isEditingTech, setIsEditingTech] = useState(false);
  const [secretsCount, setSecretsCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Détection automatique de la technologie
  useEffect(() => {
    const text = content.toLowerCase();
    if (text.includes('react') || text.includes('jsx') || text.includes('usestate') || text.includes('useeffect')) {
      setDetectedTech('React');
    } else if (text.includes('python') || text.includes('def ') || text.includes('.py') || text.includes('traceback')) {
      setDetectedTech('Python');
    } else if (text.includes('docker') || text.includes('dockerfile') || text.includes('container')) {
      setDetectedTech('Docker');
    } else if (text.includes('rust') || text.includes('cargo') || text.includes('fn main')) {
      setDetectedTech('Rust');
    } else if (text.includes('typeerror') || text.includes('ts(') || text.includes('typescript')) {
      setDetectedTech('TypeScript');
    } else if (text.includes('node') || text.includes('express') || text.includes('npm')) {
      setDetectedTech('Node.js');
    }
  }, [content]);

  // Analyse des secrets en direct
  useEffect(() => {
    if (!content.trim()) {
      setSecretsCount(0);
      return;
    }
    const res = maskSecrets(content);
    setSecretsCount(res.findings.length);
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage('Colle au moins ton message d’erreur ou un extrait de code.');
      return;
    }

    setIsSending(true);
    setErrorMessage('');

    try {
      const masked = maskSecrets(content);
      const payload: SosRequest = {
        version: '1',
        createdAt: new Date().toISOString(),
        command: 'npm start',
        exitCode: 1,
        output: masked.text.slice(0, 500),
        tech: [detectedTech],
        files: [
          {
            path: 'src/App.tsx',
            content: masked.text,
          },
        ],
      };

      const created = await createWebRequest(token, payload);
      onSuccess(created.id);
    } catch (err) {
      setErrorMessage((err as Error).message);
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Haut : Retour, 3 étapes, Titre */}
      <div>
        <button
          type="button"
          className="link-text"
          onClick={onBack}
          style={{ fontSize: '0.95rem', marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          ← Demander de l'aide
        </button>

        <span className="pill pill-sky" style={{ marginBottom: '8px' }}>
          Étape 1 sur 3 · Quoi ?
        </span>

        <h1 style={{ fontSize: '1.8rem', lineHeight: 1.2, margin: '6px 0 2px 0' }}>
          Colle ton erreur<br />et ton code
        </h1>
        <p style={{ margin: 0, color: 'var(--color-mute)', fontSize: '0.95rem' }}>
          On s'occupe du reste.
        </p>
      </div>

      {errorMessage && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)', color: 'var(--color-danger)', padding: '12px 16px' }}>
          {errorMessage}
        </div>
      )}

      {/* 2. Milieu : Éditeur sombre #0F1A16 */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            className="code-editor-box"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`TypeError: Cannot read properties of undefined (reading 'nom')\n at Liste (App.jsx:24)\n\nconst KEY = "[masqué]"`}
            rows={10}
            style={{ width: '100%', resize: 'vertical' }}
            autoFocus
          />
        </div>

        {/* Ligne Techno détectée */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--color-mute)' }}>
            Techno détectée : <span className="pill pill-sky" style={{ marginLeft: '4px' }}>{detectedTech}</span>
          </span>

          <button
            type="button"
            className="link-text"
            onClick={() => setIsEditingTech(!isEditingTech)}
            style={{ fontSize: '0.85rem' }}
          >
            {isEditingTech ? 'Fermer' : 'Modifier'}
          </button>
        </div>

        {isEditingTech && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {KNOWN_TECH.slice(0, 10).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => {
                  setDetectedTech(t);
                  setIsEditingTech(false);
                }}
                className={`pill ${detectedTech === t ? 'pill-mint' : 'pill-sky'}`}
                style={{ border: 'none', cursor: 'pointer' }}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Carte menthe rassurante */}
        <div
          className="card"
          style={{
            backgroundColor: 'var(--color-mint-bg)',
            color: 'var(--color-mint-fg)',
            borderColor: 'transparent',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
            🛡️ {secretsCount > 0 ? `${secretsCount} secret(s) masqué(s) avant l'envoi.` : '1 secret masqué avant l\'envoi.'}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            Tu valides l'aperçu avant d'appeler un aidant.
          </div>
        </div>

        {/* 3. Bas : Gros bouton plein vert profond 54px */}
        <button
          type="submit"
          className="btn-primary"
          disabled={isSending || !content.trim()}
          style={{ width: '100%', marginTop: '8px' }}
        >
          {isSending ? 'Préparation…' : 'Voir l\'aperçu et envoyer'}
        </button>
      </form>
    </div>
  );
}
