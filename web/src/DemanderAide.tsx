import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Send, ShieldCheck, X } from 'lucide-react';
import { KNOWN_TECH, detectTech, errorSummary, maskSecrets, type SolutionHit, type SosRequest } from '@sos/shared';
import { cancelRequest, createWebRequest, searchSolutions } from './api.js';
import type { Shared } from './App.js';
import { Badge, Spinner, useToast } from './ui.js';

const MAX_BYTES = 150 * 1024;
const EXTENSIONS: Record<string, string> = { Python: 'py', TypeScript: 'ts', JavaScript: 'js', React: 'jsx', PHP: 'php', Java: 'java', Go: 'go', Rust: 'rs', Ruby: 'rb', Dart: 'dart' };

/** Shows `[MASQUÉ:…]` markers highlighted, so people see exactly what is protected. */
function Masked({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[MASQUÉ:[^\]]*\])/g).map((part, i) =>
        part.startsWith('[MASQUÉ:') ? (
          <span key={i} className="masked">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function guessTech(error: string, code: string, fileName: string): string {
  const fromFiles = detectTech([{ path: fileName, content: code }]);
  if (fromFiles.length > 0) return fromFiles[0]!;
  const text = `${error}\n${code}`;
  if (/Traceback|\.py\b|def \w+\(/.test(text)) return 'Python';
  if (/\.tsx?\b|TS\d{4}/.test(text)) return 'TypeScript';
  if (/useState|useEffect|React/.test(text)) return 'React';
  if (/\.php\b|Fatal error:/.test(text)) return 'PHP';
  if (/\.rs\b|cargo|panicked at/.test(text)) return 'Rust';
  if (/\.go\b|goroutine/.test(text)) return 'Go';
  if (/TypeError|ReferenceError|node:|\.js\b|npm ERR/.test(text)) return 'JavaScript';
  return '';
}

export function DemanderAide({ shared }: { shared: Shared }) {
  const { token, go, waiting } = shared;
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(waiting ? 3 : 1);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [command, setCommand] = useState('');
  const [tech, setTech] = useState('');
  const [techTouched, setTechTouched] = useState(false);
  const [matches, setMatches] = useState<SolutionHit[] | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveFile = fileName.trim() || `code.${EXTENSIONS[tech] ?? 'txt'}`;
  const detected = useMemo(() => guessTech(error, code, effectiveFile), [error, code, effectiveFile]);
  const chosenTech = techTouched ? tech : detected;

  const maskedError = useMemo(() => maskSecrets(error), [error]);
  const maskedCode = useMemo(() => maskSecrets(code), [code]);
  const secrets = maskedError.findings.length + maskedCode.findings.length;
  const bytes = new TextEncoder().encode(code).length;

  const canContinue = error.trim().length >= 5 && !!chosenTech && bytes <= MAX_BYTES;

  const toPreview = async () => {
    setStep(2);
    setMatches(null);
    try {
      setMatches((await searchSolutions(errorSummary(maskedError.text), chosenTech)).slice(0, 3));
    } catch {
      setMatches([]);
    }
  };

  const send = async () => {
    setBusy(true);
    const payload: SosRequest = {
      version: 1,
      command: command.trim() || 'depuis le site',
      exitCode: 1,
      output: maskedError.text,
      tech: [chosenTech],
      env: { os: navigator.platform || 'navigateur', arch: 'web', node: '-' },
      files: code.trim()
        ? [{ path: effectiveFile, reason: 'ajout', size: bytes, secretsMasked: maskedCode.findings.length, content: maskedCode.text }]
        : [],
      secretsMasked: secrets,
      createdAt: new Date().toISOString(),
    };
    try {
      const created = await createWebRequest(token, payload);
      shared.follow(created.id);
      setStep(3);
    } catch (e) {
      toast('error', 'Envoi impossible', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (waiting) await cancelRequest(token, waiting.requestId).catch(() => undefined);
    shared.stopFollowing();
    go('#/accueil');
  };

  const steps = ['Ton erreur', 'Aperçu', 'Un voisin arrive'];

  return (
    <div className="col" style={{ gap: 22 }}>
      <div>
        <button type="button" className="btn btn-text small" onClick={() => (step === 2 ? setStep(1) : go('#/accueil'))} disabled={step === 3}>
          <ArrowLeft size={15} /> {step === 2 ? 'Modifier' : 'Accueil'}
        </button>
      </div>

      <ol className="stepper" style={{ listStyle: 'none', padding: 0 }}>
        {steps.map((label, i) => {
          const n = i + 1;
          const state = n < step ? 'done' : n === step ? 'on' : '';
          return (
            <li key={label} className="row" style={{ flex: n < 3 ? 1 : 'none', gap: 8 }}>
              <span className={`step ${state}`}>
                <span className="n">{n < step ? <Check size={14} /> : n}</span>
                <span>{label}</span>
              </span>
              {n < 3 && <span className="step-bar" />}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="col" style={{ gap: 18 }}>
          <div className="page-head" style={{ margin: 0 }}>
            <h1>Colle ton erreur et ton code</h1>
            <p>Plus c’est précis, plus vite on te comprend. Tes secrets sont masqués avant l’envoi.</p>
          </div>

          <label className="field">
            <span className="label">Le message d’erreur *</span>
            <textarea
              className="code-input"
              style={{ minHeight: 130 }}
              value={error}
              onChange={(e) => setError(e.target.value)}
              placeholder={"TypeError: Cannot read properties of undefined (reading 'nom')\n    at Liste (App.jsx:24:18)"}
              spellCheck={false}
              autoFocus
            />
          </label>

          <label className="field">
            <span className="label">Le code concerné (conseillé)</span>
            <textarea className="code-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Colle ici le fichier ou l’extrait qui plante." spellCheck={false} />
            {bytes > MAX_BYTES && <span className="small" style={{ color: 'var(--rose-fg)' }}>Trop long ({Math.round(bytes / 1024)} Ko). Garde l’essentiel, 150 Ko maximum.</span>}
          </label>

          <div className="grid-2">
            <label className="field">
              <span className="label">Nom du fichier</span>
              <input className="input mono" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder={effectiveFile} />
            </label>
            <label className="field">
              <span className="label">Commande lancée (facultatif)</span>
              <input className="input mono" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npm start" />
            </label>
          </div>

          <div className="field">
            <span className="label">Technologie {detected && !techTouched ? '(détectée)' : '*'}</span>
            <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
              {KNOWN_TECH.slice(0, 18).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip ${chosenTech === t ? 'on' : ''}`}
                  onClick={() => {
                    setTech(t);
                    setTechTouched(true);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="card tint-mint row" style={{ alignItems: 'flex-start' }}>
            <ShieldCheck size={22} />
            <div>
              <strong>{secrets > 0 ? `${secrets} secret${secrets > 1 ? 's' : ''} détecté${secrets > 1 ? 's' : ''}, masqué${secrets > 1 ? 's' : ''} avant l’envoi` : 'Aucun secret détecté pour l’instant'}</strong>
              <div className="small" style={{ opacity: 0.85 }}>Mots de passe, clés d’API et jetons sont remplacés. Tu valides l’aperçu à l’étape suivante.</div>
            </div>
          </div>

          <button type="button" className="btn btn-primary btn-lg" disabled={!canContinue} onClick={() => void toPreview()}>
            Voir l’aperçu <ArrowRight size={18} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="col" style={{ gap: 18 }}>
          <div className="page-head" style={{ margin: 0 }}>
            <h1>Voici exactement ce qui part</h1>
            <p>Seul l’aidant qui accepte verra ton code. Il est effacé du serveur dès que c’est résolu (24 h au plus).</p>
          </div>

          <div className="preview">
            <header>
              <span>erreur</span>
              <Badge tone="sky">{chosenTech}</Badge>
            </header>
            <pre><Masked text={maskedError.text} /></pre>
          </div>

          {code.trim() && (
            <div className="preview">
              <header>
                <span>{effectiveFile}</span>
                <span>{maskedCode.findings.length} masqué{maskedCode.findings.length > 1 ? 's' : ''}</span>
              </header>
              <pre><Masked text={maskedCode.text} /></pre>
            </div>
          )}

          <section>
            <div className="section-head">
              <h2 className="section-title">Déjà résolu ailleurs ?</h2>
            </div>
            {matches === null ? (
              <div className="row muted"><Spinner /> Recherche dans les fiches…</div>
            ) : matches.length === 0 ? (
              <p className="muted small">Aucune fiche ne ressemble à ton erreur. Un voisin va t’aider.</p>
            ) : (
              <div className="col">
                {matches.map((m) => (
                  <button key={m.id} type="button" className="card interactive tight fiche-row" style={{ textAlign: 'left', font: 'inherit', color: 'inherit', width: '100%' }} onClick={() => shared.openFiche(m)}>
                    <div className="grow">
                      <strong>{m.title}</strong>
                      <div className="small muted">Correspondance {Math.round(m.score * 100)} %</div>
                    </div>
                    <BookOpen size={18} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <button type="button" className="btn btn-neon btn-lg" disabled={busy} onClick={() => void send()}>
            {busy ? <Spinner /> : <Send size={18} />} Appeler un aidant
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="col" style={{ gap: 18, alignItems: 'center', textAlign: 'center', paddingTop: 10 }}>
          <div className="radar-wait" aria-hidden="true">
            <span className="ring" />
            <span className="ring" />
            <span className="ring" />
            <span className="core"><ShieldCheck size={28} /></span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.7rem' }}>On cherche un voisin pour toi</h1>
            <p className="muted" style={{ marginTop: 8, maxWidth: 440 }}>
              {!waiting || waiting.stage === 'ciblee'
                ? `Les aidants ${chosenTech || 'de ta techno'} disponibles viennent d’être prévenus.`
                : waiting.stage === 'elargie'
                  ? 'Personne n’a répondu : on prévient aussi les technos proches.'
                  : 'Ta demande est maintenant visible de tous les aidants disponibles.'}
            </p>
          </div>

          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <Badge tone="mint">{waiting?.alerted ?? 0} aidant{(waiting?.alerted ?? 0) > 1 ? 's' : ''} prévenu{(waiting?.alerted ?? 0) > 1 ? 's' : ''}</Badge>
            <Badge>{waiting?.online ?? 0} en ligne</Badge>
          </div>

          {waiting && waiting.online === 0 && (
            <div className="card tint-rose tight small" style={{ maxWidth: 440 }}>
              Aucun aidant n’est connecté en ce moment. Ta demande reste ouverte : garde cette page ouverte, ou réessaie plus tard.
            </div>
          )}
          <p className="faint small">Garde cette page ouverte : tu entreras dans la salle dès qu’un aidant accepte.</p>
          <button type="button" className="btn btn-ghost" onClick={() => void cancel()}>
            <X size={16} /> Annuler ma demande
          </button>
        </div>
      )}
    </div>
  );
}
