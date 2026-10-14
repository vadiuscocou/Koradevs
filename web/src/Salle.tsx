import { useEffect, useRef, useState } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import type { ChatMessage, PublicUser, SalleMember, SalleState, ServerMessage } from '@sos/shared';
import { connectRadar } from './api.js';

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
            '&': { height: '100%', backgroundColor: '#0F1A16', color: '#E8EEEA' },
            '.cm-content': { fontFamily: 'var(--font-mono)', fontSize: '14px' },
            '.cm-gutters': { backgroundColor: '#0F1A16', color: '#5E7568', borderRight: '1px solid #1C2E26' },
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
  const [showChat, setShowChat] = useState(false);
  const [closed, setClosed] = useState<Closed | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [showFicheModal, setShowFicheModal] = useState(false);
  const [ficheDraft, setFicheDraft] = useState({ error: '', cause: '', fix: '' });
  const [ficheValidatedByMe, setFicheValidatedByMe] = useState(false);
  const [ficheValidatedByOther, setFicheValidatedByOther] = useState(false);
  const socket = useRef<ReturnType<typeof connectRadar> | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

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
          setError('');
          return;
        }
        case 'yjs':
          if (current) Y.applyUpdate(current, fromBase64(m.update), REMOTE);
          return;
        case 'message':
          return setChat((list) => [...list, m.message]);
        case 'salle-fermee':
          current?.destroy();
          current = null;
          setDoc(null);
          return setClosed({ raison: m.raison, by: m.by });
        case 'erreur':
          return setError(m.message);
        case 'fiche-proposee':
          setFicheDraft({ error: m.error, cause: m.cause, fix: m.fix });
          setShowFicheModal(true);
          return;
        case 'fiche-validee':
          setFicheValidatedByOther(true);
          return;
      }
    };
    socket.current = connectRadar(token, onMessage, () => setError((e) => e || 'Connexion perdue. Recharge la page pour revenir dans la salle.'));
    return () => {
      socket.current?.close();
      current?.destroy();
    };
  }, [token, requestId]);

  useEffect(() => chatEnd.current?.scrollTo(0, chatEnd.current.scrollHeight), [chat]);

  if (closed) {
    const text = {
      resolue: `Problème résolu${closed.by ? ` (par @${closed.by})` : ''}. Le code a été effacé du serveur.`,
      annulee: 'Le demandeur a annulé sa demande.',
      expiree: 'La salle a expiré.',
    }[closed.raison];
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.4rem' }}>Salle fermée</h1>
        <p className="text-mute" style={{ margin: '12px 0 24px 0' }}>{text}</p>
        <button type="button" className="btn-primary" onClick={onLeave}>
          Retour à l'accueil
        </button>
      </div>
    );
  }

  if (!salle || !doc) {
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.4rem' }}>Salle d'aide</h1>
        <p className="text-mute">{error || 'Connexion au mini-IDE CodeFlash…'}</p>
        <button type="button" className="link-text" onClick={onLeave} style={{ marginTop: '16px' }}>
          Retour
        </button>
      </div>
    );
  }

  const isHelper = salle.role === 'aidant';
  const other = isHelper ? salle.requester : salle.helper;
  const current = salle.files.find((f) => f.path === file);

  return (
    <div className="salle-screen">
      {/* 1. Haut : Qui est là + En direct */}
      <header className="salle-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.95rem' }}>
            {salle.tech[0] || 'Code'} · avec @{other?.login || 'voisin'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--accent)' }}>
            <span className="status-dot" />
            En direct
          </span>
        </div>

        <button
          type="button"
          className="link-text"
          onClick={onLeave}
          style={{ fontSize: '0.85rem', color: 'var(--mute)' }}
        >
          Quitter
        </button>
      </header>

      {/* 2. Onglets fichiers si plusieurs */}
      {salle.files.length > 1 && (
        <div style={{ display: 'flex', gap: '4px', padding: '6px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
          {salle.files.map((f) => (
            <button
              key={f.path}
              type="button"
              className="link-text"
              onClick={() => setFile(f.path)}
              style={{
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
                color: f.path === file ? 'var(--accent)' : 'var(--mute)',
                padding: '4px 8px',
              }}
            >
              {f.path}
            </button>
          ))}
        </div>
      )}

      {/* 3. Milieu : L'éditeur occupe tout l'écran */}
      <div className="salle-editor-area" style={{ flex: 1, minHeight: 0 }}>
        {current ? (
          <Editor key={current.path} doc={doc} path={current.path} line={current.line} />
        ) : (
          <div style={{ padding: '24px', color: 'var(--mute)' }}>Aucun fichier partagé.</div>
        )}
      </div>

      {/* Volet Chat rétractable */}
      {showChat && (
        <div style={{ height: '180px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }} ref={chatEnd}>
            {chat.map((m) => (
              <div key={m.id} style={{ fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: m.from === user.login ? 'var(--accent)' : 'var(--ink)' }}>
                  @{m.from} :
                </span>{' '}
                <span style={{ color: 'var(--ink)' }}>{m.text}</span>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              socket.current?.send({ type: 'message', requestId, text: draft });
              setDraft('');
            }}
            style={{ display: 'flex', borderTop: '1px solid var(--line)' }}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Écrire un message…"
              style={{ flex: 1, background: 'transparent', border: 'none', padding: '8px 16px', color: 'var(--ink)', fontSize: '0.85rem', outline: 'none' }}
            />
            <button type="submit" className="link-text" style={{ padding: '0 16px', fontSize: '0.85rem' }}>
              Envoyer
            </button>
          </form>
        </div>
      )}

      {/* 4. Bas : Carte menthe du test réussi, Chat, et bouton vert néon Problème résolu */}
      <footer className="salle-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div
            style={{
              backgroundColor: 'var(--color-mint-bg)',
              color: 'var(--color-mint-fg)',
              padding: '6px 14px',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span style={{ fontWeight: 800, fontSize: '0.86rem' }}>
              ✓ Test réussi
            </span>
            <span style={{ fontSize: '0.74rem', opacity: 0.9 }}>
              Avant : 1 échec. Maintenant : 1 sur 1.
            </span>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowChat(!showChat)}
            style={{ height: '36px', padding: '0 14px', fontSize: '0.85rem', borderColor: '#2A4437', color: '#E8EEEA' }}
          >
            {showChat ? 'Masquer Chat' : `💬 Chat (${chat.length})`}
          </button>
        </div>

        {/* Le seul bouton plein vert néon de l'écran */}
        <button
          type="button"
          className="btn-hero"
          onClick={() => {
            setShowFicheModal(true);
            if (!ficheDraft.error) setFicheDraft({ error: salle.errorSummary, cause: 'Erreur identifiée et corrigée', fix: 'Code ajusté dans la session' });
          }}
          style={{ height: '46px', padding: '0 24px', fontSize: '15px' }}
        >
          Problème résolu
        </button>
      </footer>

      {/* Modale de validation de la Fiche Solution */}
      {showFicheModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Fiche solution</h2>
            <p className="text-mute" style={{ fontSize: '0.85rem', margin: '0 0 16px 0' }}>
              Cette fiche devient un savoir partagé dans la bibliothèque.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--mute)' }}>
                Erreur
                <input
                  type="text"
                  className="input-field"
                  value={ficheDraft.error}
                  onChange={(e) => setFicheDraft({ ...ficheDraft, error: e.target.value })}
                  style={{ marginTop: '4px' }}
                />
              </label>

              <label style={{ fontSize: '0.82rem', color: 'var(--mute)' }}>
                Cause
                <textarea
                  className="textarea-field"
                  value={ficheDraft.cause}
                  onChange={(e) => setFicheDraft({ ...ficheDraft, cause: e.target.value })}
                  rows={2}
                  style={{ marginTop: '4px' }}
                />
              </label>

              <label style={{ fontSize: '0.82rem', color: 'var(--mute)' }}>
                Correction
                <textarea
                  className="textarea-field"
                  value={ficheDraft.fix}
                  onChange={(e) => setFicheDraft({ ...ficheDraft, fix: e.target.value })}
                  rows={3}
                  style={{ marginTop: '4px' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="link-text"
                  onClick={() => setShowFicheModal(false)}
                  style={{ color: 'var(--mute)' }}
                >
                  Annuler
                </button>

                <button
                  type="button"
                  className="link-text"
                  onClick={() => {
                    setFicheValidatedByMe(true);
                    socket.current?.send({ type: 'valider-fiche', requestId, ...ficheDraft });
                  }}
                  disabled={ficheValidatedByMe}
                  style={{ fontWeight: 600 }}
                >
                  {ficheValidatedByMe ? (ficheValidatedByOther ? 'Enregistrement…' : 'En attente de l’autre…') : 'Valider la fiche'}
                </button>
              </div>

              {ficheValidatedByOther && !ficheValidatedByMe && (
                <p style={{ color: 'var(--accent)', fontSize: '0.82rem', margin: 0 }}>
                  L'autre développeur a validé la fiche. Clique sur Valider pour terminer !
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
