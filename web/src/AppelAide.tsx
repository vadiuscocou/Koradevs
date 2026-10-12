import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  LifeBuoy,
  FileCode,
  Terminal,
  Layers,
} from 'lucide-react';
import { KNOWN_TECH, maskSecrets, type SolutionHit, type SosRequest } from '@sos/shared';
import { createWebRequest, searchSolutions } from './api.js';

export function AppelAide({ token, user, onSuccess }: { token: string; user: { login: string }; onSuccess: (requestId: string) => void }) {
  const [step, setStep] = useState<1 | 2>(1); // 1 = Quoi ?, 2 = Aperçu & Confirmation
  const [command, setCommand] = useState('npm run dev');
  const [errorText, setErrorText] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [selectedTech, setSelectedTech] = useState<string[]>(['TypeScript', 'React']);
  const [solutions, setSolutions] = useState<SolutionHit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  // Masquage temps réel
  const [maskedCode, setMaskedCode] = useState('');
  const [secretsCount, setSecretsCount] = useState(0);

  useEffect(() => {
    if (!codeSnippet) {
      setMaskedCode('');
      setSecretsCount(0);
      return;
    }
    const res = maskSecrets(codeSnippet);
    setMaskedCode(res.text);
    setSecretsCount(res.findings.length);
  }, [codeSnippet]);

  // Suggestions automatiques
  useEffect(() => {
    if (errorText.trim().length > 6) {
      const timer = setTimeout(() => {
        searchSolutions(errorText)
          .then(setSolutions)
          .catch(() => {});
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSolutions([]);
    }
  }, [errorText]);

  const toggleTech = (t: string) => {
    setSelectedTech((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  };

  const goToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!errorText.trim()) {
      setErrorNotice('Veuillez indiquer le message d’erreur.');
      return;
    }
    if (selectedTech.length === 0) {
      setErrorNotice('Veuillez sélectionner au moins une technologie.');
      return;
    }
    setErrorNotice('');
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorNotice('');

    try {
      const safeError = maskSecrets(errorText).text;
      const safeCode = maskedCode || '// Aucun extrait de code fourni';

      const payload: SosRequest = {
        version: '1',
        createdAt: new Date().toISOString(),
        command,
        exitCode: 1,
        output: safeError,
        tech: selectedTech,
        files: [
          {
            path: 'src/App.tsx',
            content: safeCode,
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
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* 3 Étapes visibles (Quoi ? -> Aperçu -> Envoyer) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: step === 1 ? 'var(--color-brand)' : 'var(--color-brand-soft)', color: step === 1 ? '#fff' : 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
            1
          </span>
          <span style={{ fontWeight: step === 1 ? 700 : 500, fontSize: '0.9rem', color: step === 1 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
            Quoi ?
          </span>
        </div>

        <span style={{ color: 'var(--color-border)', fontSize: '1.2rem' }}>—</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: step === 2 ? 'var(--color-coral)' : 'var(--color-border)', color: step === 2 ? '#fff' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
            2
          </span>
          <span style={{ fontWeight: step === 2 ? 700 : 500, fontSize: '0.9rem', color: step === 2 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
            Aperçu & Sécurité
          </span>
        </div>

        <span style={{ color: 'var(--color-border)', fontSize: '1.2rem' }}>—</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-border)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
            3
          </span>
          <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Envoyer
          </span>
        </div>
      </div>

      {errorNotice && (
        <div style={{ background: 'rgba(228, 87, 46, 0.1)', border: '1px solid var(--color-coral)', color: 'var(--color-coral)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
          {errorNotice}
        </div>
      )}

      {step === 1 ? (
        /* ÉTAPE 1 : QUOI ? */
        <main className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Décris ton blocage</h2>
          <p className="hint" style={{ marginBottom: '20px' }}>
            Renseigne ta commande, sélectionne tes technos et colle l'erreur.
          </p>

          <form onSubmit={goToPreview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
              Commande ou Contexte
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="ex: npm run dev, cargo build, python app.py"
                required
              />
            </label>

            <div>
              <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
                Technologie principale
              </span>
              <div className="chips">
                {KNOWN_TECH.slice(0, 8).map((t) => (
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

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
              Ton erreur
              <textarea
                value={errorText}
                onChange={(e) => setErrorText(e.target.value)}
                placeholder="Colle la ligne d'erreur ou la trace ici…"
                rows={3}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                required
              />
            </label>

            {solutions.length > 0 && (
              <div style={{ background: 'var(--color-sun-soft)', border: '1px solid rgba(242, 169, 59, 0.4)', padding: '12px', borderRadius: '8px' }}>
                <b style={{ color: '#8C5609', fontSize: '0.88rem' }}>💡 Une fiche existante résout peut-être ce problème :</b>
                <div style={{ fontSize: '0.85rem', color: '#14201C', marginTop: '4px' }}>
                  {solutions[0]?.title} : <i>{solutions[0]?.fix}</i>
                </div>
              </div>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
              Ton extrait de code
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="Colle le fichier ou la fonction où se produit le bug…"
                rows={6}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
              />
            </label>

            {/* Info Masquage */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--color-brand-soft)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-brand)' }}>
              <ShieldCheck size={18} />
              <span>
                {secretsCount > 0 ? (
                  <b>{secretsCount} secret(s) masqué(s) en direct.</b>
                ) : (
                  'Secrets analysés et protégés automatiquement avant tout envoi.'
                )}
              </span>
            </div>

            <button type="submit" style={{ width: '100%', marginTop: '8px' }}>
              Voir l'aperçu avant envoi
              <ArrowRight size={18} />
            </button>
          </form>
        </main>
      ) : (
        /* ÉTAPE 2 : APERÇU ET CONFIRMATION SÉCURISÉE */
        <main className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Aperçu de la demande</h2>
            <button
              type="button"
              className="link"
              onClick={() => setStep(1)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={16} />
              Modifier
            </button>
          </div>

          <p className="hint" style={{ marginBottom: '16px' }}>
            Voici exactement ce que verra l'aidant qui te rejoindra. Rien d'autre n'est transmis.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--color-bg)', padding: '10px 14px', borderRadius: '8px' }}>
              <span className="hint" style={{ fontSize: '0.8rem', display: 'block' }}>COMMANDE</span>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>$ {command}</code>
            </div>

            <div style={{ background: 'var(--color-bg)', padding: '10px 14px', borderRadius: '8px' }}>
              <span className="hint" style={{ fontSize: '0.8rem', display: 'block' }}>ERREUR MASQUÉE</span>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-coral)' }}>
                {maskSecrets(errorText).text}
              </code>
            </div>

            <div style={{ background: 'var(--color-bg)', padding: '10px 14px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="hint" style={{ fontSize: '0.8rem' }}>CODE PROTÉGÉ</span>
                {secretsCount > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-coral)', fontWeight: 600 }}>
                    🛡️ {secretsCount} secret(s) masqué(s)
                  </span>
                )}
              </div>
              <pre
                style={{
                  margin: 0,
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text)',
                  overflowX: 'auto',
                  maxHeight: '200px',
                }}
              >
                {maskedCode || '// Aucun extrait de code'}
              </pre>
            </div>
          </div>

          <button
            type="button"
            className="coral"
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            style={{ width: '100%', minHeight: '48px', fontSize: '1rem' }}
          >
            <LifeBuoy size={20} />
            {isSubmitting ? 'Connexion à la salle…' : 'Appeler un voisin (Entrer dans CodeFlash)'}
          </button>
        </main>
      )}
    </div>
  );
}
