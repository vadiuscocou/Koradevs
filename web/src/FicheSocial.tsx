import { useEffect, useState } from 'react';
import { MessageSquare, Send, ThumbsUp } from 'lucide-react';
import { getFicheSocial, postFicheComment, toggleUtile, type SpaceMessage } from './api.js';
import { Avatar, useToast } from './ui.js';

/** « Utile » and comments under a fiche, like under a GitHub issue. */
export function FicheSocial({ token, solutionId }: { token: string; solutionId: string }) {
  const toast = useToast();
  const [comments, setComments] = useState<SpaceMessage[]>([]);
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFicheSocial(token, solutionId).then((s) => {
      setComments(s.comments);
      setCount(s.count);
      setMine(s.mine);
    }, () => undefined);
  }, [token, solutionId]);

  const vote = async () => {
    try {
      const v = await toggleUtile(token, solutionId);
      setCount(v.count);
      setMine(v.mine);
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const c = await postFicheComment(token, solutionId, text);
      setComments((list) => [...list, c]);
      setText('');
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="col" style={{ gap: 12 }} aria-label="Avis et commentaires">
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className={`btn btn-sm ${mine ? 'btn-primary' : 'btn-soft'}`} onClick={vote} aria-pressed={mine}>
          <ThumbsUp size={15} /> Utile · {count}
        </button>
        <span className="small muted row" style={{ gap: 6 }}><MessageSquare size={14} /> {comments.length} commentaire{comments.length > 1 ? 's' : ''}</span>
      </div>
      {comments.map((c) => (
        <div key={c.id} className="comment">
          <Avatar name={c.author} size={30} />
          <div className="grow">
            <div className="small"><a href={`#/passeport/${c.author}`}><b>@{c.author}</b></a> <span className="muted">· {new Date(c.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span></div>
            <p style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.text}</p>
          </div>
        </div>
      ))}
      <form className="row" style={{ gap: 8 }} onSubmit={send}>
        <input className="input grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ajouter un commentaire…" maxLength={1000} aria-label="Ton commentaire" />
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()} aria-label="Envoyer"><Send size={16} /></button>
      </form>
    </section>
  );
}
