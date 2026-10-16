import { useEffect, useRef, useState } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import { ArrowLeft, CircleCheck, CircleX, Code2, MessageSquare, Send, Terminal } from 'lucide-react';
import type { ChatMessage, PublicUser, SalleMember, SalleState, ServerMessage } from '@sos/shared';
import { connectRadar } from './api.js';
import { Avatar, Badge, Modal, Spinner } from './ui.js';

const REMOTE = 'serveur';

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

function language(path: string) {
  if (/\.py$/.test(path)) return [python()];
  if (/\.[cm]?[jt]sx?$/.test(path)) return [javascript({ typescript: /\.[cm]?tsx?$/.test(path), jsx: /x$/.test(path) })];
  return [];
}

/** One CodeMirror editor bound to the Y.Text of a shared file. */
function Editor({ doc, path, line }: { doc: Y.Doc; path: string; line?: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const text = doc.getText(path);
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: text.toString(),
        extensions: [
          basicSetup,
          oneDark,
          ...language(path),
          yCollab(text, null),
          EditorView.theme({
            '&': { height: '100%', backgroundColor: '#0e1914' },
            '.cm-content': { fontFamily: 'var(--mono)', fontSize: '14px' },
            '.cm-gutters': { backgroundColor: '#0e1914', color: '#5e7568', borderRight: '1px solid #1d2e26' },
          }),
        ],
      }),
    });
    if (line && line <= view.state.doc.lines) {
      const pos = view.state.doc.line(line).from;
      view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
    }
    return () => view.destroy();
  }, [doc, path, line]);
  return <div style={{ height: '100%' }} ref={host} />;
}

type Closed = { raison: 'resolue' | 'annulee' | 'expiree'; by?: string };

export function Salle({ token, user, requestId, onLeave }: { token: string; user: PublicUser; requestId: string; onLeave: () => void }) {
  const [salle, setSalle] = useState<SalleState | null>(null);
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [file, setFile] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [terminal, setTerminal] = useState('');
  const [running, setRunning] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [execSeen, setExecSeen] = useState(false);
  const [members, setMembers] = useState<SalleMember[]>([]);
  const [closed, setClosed] = useState<Closed | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [tab, setTab] = useState<'chat' | 'terminal'>('chat');
  const [mobileSide, setMobileSide] = useState(false);
  const [ficheOpen, setFicheOpen] = useState(false);
  const [fiche, setFiche] = useState({ error: '', cause: '', fix: '' });
  const [testOk, setTestOk] = useState(false);
  const [mine, setMine] = useState(false);
  const [theirs, setTheirs] = useState(false);
  const socket = useRef<ReturnType<typeof connectRadar> | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const termEnd = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let current: Y.Doc | null = null;
    const onMessage = (m: ServerMessage) => {
      switch (m.type) {
        case 'bienvenue':
          return socket.current?.send({ type: 'rejoindre', requestId, client: 'web' });
        case 'salle': {
          current?.destroy();
          const next = new Y.Doc();
          Y.applyUpdate(next, fromBase64(m.salle.doc), REMOTE);
          next.on('update', (update: Uint8Array, origin: unknown) => {
            if (origin !== REMOTE) socket.current?.send({ type: 'yjs', requestId, update: toBase64(update) });
          });
          current = next;
          setDoc(next);
          setSalle(m.salle);
          setFile((f) => (m.salle.files.some((x) => x.path === f) ? f : (m.salle.files[0]?.path ?? '')));
          setChat(m.salle.chat);
          setTerminal(m.salle.terminal);
          setRunning(m.salle.running);
          setExitCode(m.salle.lastExitCode);
          setExecSeen(m.salle.members.some((x) => x.client === 'terminal') && m.salle.lastExitCode !== null);
          setMembers(m.salle.members);
          setFiche((f) => (f.error ? f : { ...f, error: m.salle.errorSummary }));
          setError('');
          return;
        }
        case 'yjs':
          if (current) Y.applyUpdate(current, fromBase64(m.update), REMOTE);
          return;
        case 'message':
          return setChat((list) => [...list, m.message]);
        case 'terminal':
          return setTerminal((t) => (t + m.data).slice(-60_000));
        case 'execution':
          setRunning(m.state === 'en-cours');
          setExecSeen(true);
          if (m.state === 'en-cours') setTerminal('');
          else setExitCode(m.exitCode);
          return;
        case 'presence':
          return setMembers(m.members);
        case 'salle-fermee':
          current?.destroy();
          current = null;
          setDoc(null);
          return setClosed({ raison: m.raison, by: m.by });
        case 'erreur':
          return setError(m.message);
        case 'fiche-proposee':
          setFiche({ error: m.error, cause: m.cause, fix: m.fix });
          setFicheOpen(true);
          return;
        case 'fiche-validee':
          setTheirs(true);
          setFicheOpen(true);
          return;
      }
    };
    socket.current = connectRadar(token, onMessage, () => setError((e) => e || 'Connexion perdue. Recharge la page pour revenir dans la salle.'));
    return () => {
      socket.current?.close();
      current?.destroy();
    };
  }, [token, requestId]);

  useEffect(() => {
    chatEnd.current?.scrollTo(0, chatEnd.current.scrollHeight);
  }, [chat, tab]);
  useEffect(() => {
    termEnd.current?.scrollTo(0, termEnd.current.scrollHeight);
  }, [terminal, tab]);
  useEffect(() => {
    if (execSeen && exitCode === 0) setTestOk(true);
  }, [exitCode, execSeen]);

  if (closed) {
    const text = {
      resolue: `Problème résolu${closed.by ? ` (par @${closed.by})` : ''}. Le code a été effacé du serveur.`,
      annulee: 'Le demandeur a annulé sa demande.',
      expiree: 'La salle a expiré.',
    }[closed.raison];
    return (
      <div className="login-form" style={{ minHeight: '100vh' }}>
        <div className="login-box col" style={{ textAlign: 'center', alignItems: 'center', gap: 16 }}>
          <CircleCheck size={48} color="var(--accent)" />
          <h1 style={{ fontSize: '1.6rem' }}>Salle fermée</h1>
          <p className="muted">{text}</p>
          {closed.raison === 'resolue' && <p className="small muted">La fiche validée est maintenant dans la bibliothèque, et la preuve dans le Passeport de l’aidant.</p>}
          <button type="button" className="btn btn-primary btn-lg" onClick={onLeave}>Retour à l’accueil</button>
        </div>
      </div>
    );
  }

  if (!salle || !doc) {
    return (
      <div className="login-form" style={{ minHeight: '100vh' }}>
        <div className="login-box col" style={{ textAlign: 'center', alignItems: 'center', gap: 14 }}>
          {error ? null : <Spinner size={28} />}
          <h1 style={{ fontSize: '1.4rem' }}>Salle d’aide</h1>
          <p className="muted">{error || 'Connexion à la salle de code partagée…'}</p>
          <button type="button" className="btn btn-ghost" onClick={onLeave}>Retour</button>
        </div>
      </div>
    );
  }

  const isHelper = salle.role === 'aidant';
  const other = isHelper ? salle.requester : salle.helper;
  const current = salle.files.find((f) => f.path === file);
  const hasTerminal = members.some((m) => m.client === 'terminal');
  // A web request has no program to run: its exit code (always 1) is not a test result.
  const shownExit = hasTerminal || execSeen ? exitCode : null;
  const online = (login: string) => members.some((m) => m.login === login);

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    socket.current?.send({ type: 'message', requestId, text: draft });
    setDraft('');
  };

  const canValidate = fiche.error.trim() && fiche.cause.trim() && fiche.fix.trim();

  return (
    <div className="salle">
      <header className="salle-bar">
        <div className="row" style={{ gap: 12 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onLeave}><ArrowLeft size={15} /> Quitter</button>
          <Avatar name={other.login} size={30} />
          <div>
            <strong style={{ fontSize: '0.92rem' }}>{salle.tech[0] ?? 'Code'} · avec @{other.login}</strong>
            <div className="row small" style={{ gap: 6, color: '#8aa095' }}>
              <span className={`dot ${online(other.login) ? 'live' : ''}`} /> {online(other.login) ? 'en direct' : 'absent pour l’instant'}
            </div>
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn btn-ghost btn-sm salle-tabs" onClick={() => setMobileSide((v) => !v)}>
            {mobileSide ? <Code2 size={15} /> : <MessageSquare size={15} />} {mobileSide ? 'Code' : 'Chat'}
          </button>
        </div>
      </header>

      {salle.files.length > 1 && (
        <div className="salle-files" role="tablist">
          {salle.files.map((f) => (
            <button key={f.path} type="button" role="tab" aria-selected={f.path === file} className={`salle-file ${f.path === file ? 'on' : ''}`} onClick={() => setFile(f.path)}>
              {f.path}
            </button>
          ))}
        </div>
      )}

      <div className={`salle-body ${mobileSide ? 'show-side' : ''}`}>
        <div className="salle-editor">
          {current ? <Editor key={current.path} doc={doc} path={current.path} line={current.line} /> : <div style={{ padding: 24, color: '#8aa095' }}>Aucun fichier partagé : discutez dans le chat.</div>}
        </div>

        <aside className="salle-side">
          <div className={`test-box ${running ? '' : shownExit === 0 || testOk ? 'ok' : shownExit !== null ? 'ko' : ''}`}>
            <div className="row" style={{ gap: 8 }}>
              {running ? <Spinner size={16} /> : shownExit === 0 || testOk ? <CircleCheck size={18} color="var(--neon)" /> : shownExit !== null ? <CircleX size={18} color="#ff8f80" /> : <Terminal size={18} color="#8aa095" />}
              <strong style={{ fontSize: '0.9rem' }}>
                {running ? 'Test en cours…' : shownExit === 0 ? 'Le programme repasse au vert' : testOk ? 'Test confirmé par le demandeur' : shownExit !== null ? `Le programme échoue encore (code ${shownExit})` : 'Pas encore de test'}
              </strong>
            </div>
            {!hasTerminal && !isHelper && shownExit !== 0 && (
              <label className="row small" style={{ gap: 8, marginTop: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={testOk} onChange={(e) => setTestOk(e.target.checked)} />
                Mon programme fonctionne maintenant
              </label>
            )}
            {!hasTerminal && isHelper && !testOk && <div className="small" style={{ color: '#8aa095', marginTop: 6 }}>Le demandeur confirme quand son programme fonctionne.</div>}
          </div>

          {!hasTerminal && terminal.trim() && (
            <div className="test-box" style={{ background: '#1a1210', borderColor: '#4a2a22' }}>
              <div className="block-label" style={{ color: '#ff9c8a', marginBottom: 6 }}>Erreur du demandeur</div>
              <pre className="mono" style={{ margin: 0, maxHeight: 130, overflow: 'auto', fontSize: '0.76rem', color: '#ffb4a6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{terminal}</pre>
            </div>
          )}

          <div className="row" style={{ padding: '10px 16px 0', gap: 6 }}>
            <button type="button" className={`chip ${tab === 'chat' ? 'on' : ''}`} onClick={() => setTab('chat')}>Chat ({chat.length})</button>
            {hasTerminal && <button type="button" className={`chip ${tab === 'terminal' ? 'on' : ''}`} onClick={() => setTab('terminal')}>Terminal</button>}
          </div>

          {tab === 'chat' || !hasTerminal ? (
            <>
              <div className="chat-log" ref={chatEnd}>
                {chat.length === 0 && <div className="msg sys">Dis bonjour : explique ce que tu as déjà essayé.</div>}
                {chat.map((m) => (
                  <div key={m.id} className={`msg ${m.role === 'systeme' ? 'sys' : m.from === user.login ? 'me' : ''}`}>
                    {m.role === 'systeme' ? m.text : (<><b>@{m.from}</b> {m.text}</>)}
                  </div>
                ))}
              </div>
              <form className="chat-form" onSubmit={sendChat}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrire un message…" aria-label="Message" maxLength={4000} />
                <button type="submit" className="btn btn-neon btn-icon" aria-label="Envoyer" style={{ border: 0 }}><Send size={17} /></button>
              </form>
            </>
          ) : (
            <pre ref={termEnd} className="chat-log mono" style={{ margin: 0, fontSize: '0.78rem', color: '#c4d3ca', whiteSpace: 'pre-wrap' }}>{terminal || 'Aucune sortie pour l’instant.'}</pre>
          )}
        </aside>
      </div>

      <footer className="salle-foot">
        <div className="small" style={{ color: '#8aa095' }}>{error || (isHelper ? 'Tu aides @' + salle.requester.login : 'Un aidant te rejoint en direct')}</div>
        <button type="button" className="btn btn-neon" onClick={() => setFicheOpen(true)}><CircleCheck size={18} /> Problème résolu</button>
      </footer>

      {ficheOpen && (
        <Modal title="Fiche solution" subtitle="Publiée dans la bibliothèque seulement si vous validez tous les deux. Aucun code personnel n’y figure." onClose={() => setFicheOpen(false)}>
          <form
            className="col"
            style={{ gap: 14 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!canValidate || mine) return;
              setMine(true);
              socket.current?.send({ type: 'valider-fiche', requestId, ...fiche, testOk: !isHelper && testOk });
            }}
          >
            <label className="field">
              <span className="label">Erreur</span>
              <input className="input" value={fiche.error} onChange={(e) => setFiche({ ...fiche, error: e.target.value })} maxLength={500} disabled={mine} />
            </label>
            <label className="field">
              <span className="label">Cause</span>
              <textarea className="textarea" value={fiche.cause} onChange={(e) => setFiche({ ...fiche, cause: e.target.value })} placeholder="Pourquoi ça plantait ?" maxLength={1500} disabled={mine} />
            </label>
            <label className="field">
              <span className="label">Correction</span>
              <textarea className="textarea" value={fiche.fix} onChange={(e) => setFiche({ ...fiche, fix: e.target.value })} placeholder="Ce qu’il faut faire pour régler le problème." maxLength={3000} disabled={mine} />
            </label>
            {!isHelper && (
              <label className="row small" style={{ gap: 8 }}>
                <input type="checkbox" checked={testOk} onChange={(e) => setTestOk(e.target.checked)} disabled={mine} />
                Mon programme fonctionne : la fiche aura le badge <Badge tone="mint">Confirmé</Badge>
              </label>
            )}
            {theirs && !mine && <div className="card tint-mint tight small">@{other.login} a déjà validé. Valide à ton tour pour publier.</div>}
            {mine && <div className="card tint-mint tight small row"><Spinner /> En attente de @{other.login}…</div>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setFicheOpen(false)}>Plus tard</button>
              <button type="submit" className="btn btn-primary" disabled={!canValidate || mine}>Valider la fiche</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
