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
  const [detectedTech, setDetectedTech] = useState<string>('TypeScript');
  const [isEditingTech, setIsEditingTech] = useState(false);
  const [secretsCount, setSecretsCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Détection automatique de la techno à partir du texte collé
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

  // Détection en direct des secrets masqués
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
      setErrorMessage('Colle au moins ton message d’erreur ou ton code.');
      return;
    }

    setIsSending(true);
    setErrorMessage('');

    try {
      const masked = maskSecrets(content);
      const payload: SosRequest = {
        version: '1',
        createdAt: new Date().toISOString(),
        command: 'run',
        exitCode: 1,
        output: masked.text.slice(0, 500),
        tech: [detectedTech],
        files: [
          {
            path: 'index.ts',
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
      {/* 1. Haut : Retour et Titre */}
      <div>
        <button
          type="button"
          className="link-text"
          onClick={onBack}
          style={{ fontSize: '0.9rem', marginBottom: '12px', display: 'inline-block' }}
        >
          ← Retour
        </button>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 600, margin: '0 0 4px 0' }}>
          Demander de l'aide
        </h1>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ink)' }}>
          Colle ton erreur et ton code.
        </p>
        <p className="text-mute" style={{ margin: 0, fontSize: '0.9rem' }}>
          On s'occupe du reste.
        </p>
      </div>

      {errorMessage && (
        <div style={{ padding: '8px 12px', color: 'var(--danger)', fontSize: '0.85rem' }}>
          {errorMessage}
        </div>
      )}

      {/* 2. Milieu : Un seul champ avec techno détectée & secrets en direct */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <textarea
          className="textarea-field"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`TypeError: Cannot read properties of undefined (reading 'nom')\n  at Liste (App.jsx:24)\n\nconst KEY = "AKIAIOSFODNN7EXAMPLE"`}
          rows={10}
          autoFocus
        />

        {/* Détection de la techno */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
          <span className="text-mute">
            Techno : <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{detectedTech}</span> détectée
          </span>

          <button
            type="button"
            className="link-text"
            onClick={() => setIsEditingTech(!isEditingTech)}
            style={{ fontSize: '0.82rem' }}
          >
            {isEditingTech ? 'Fermer' : 'Modifier'}
          </button>
        </div>

        {isEditingTech && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
            {KNOWN_TECH.slice(0, 10).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => {
                  setDetectedTech(t);
                  setIsEditingTech(false);
                }}
                className="link-text"
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: detectedTech === t ? 'var(--accent-dim)' : 'var(--surface)',
                  color: detectedTech === t ? 'var(--accent)' : 'var(--ink)',
                  fontSize: '0.82rem',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Protection des secrets en direct */}
        <div style={{ fontSize: '0.85rem' }}>
          {secretsCount > 0 ? (
            <span className="text-accent" style={{ fontWeight: 500 }}>
              🛡️ {secretsCount} secret masqué avant l'envoi
            </span>
          ) : (
            <span className="text-mute">
              Aucun secret détecté. Les clés et tokens sont masqués automatiquement.
            </span>
          )}
        </div>

        {/* 3. Bas : Un seul bouton plein vert néon */}
        <button
          type="submit"
          className="btn-primary"
          disabled={isSending || !content.trim()}
          style={{ width: '100%', marginTop: '12px' }}
        >
          {isSending ? 'Connexion à la salle…' : 'Envoyer'}
        </button>
      </form>
    </div>
  );
}
