import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Hash, Newspaper, Send, UserCheck, UserPlus } from 'lucide-react';
import { getFeed, getFollowing, getSpaceMessages, getSpaces, postSpaceMessage, toggleFollow, type FeedItem, type Space, type SpaceMessage } from './api.js';
import type { Shared } from './App.js';
import { Avatar, Empty, useToast } from './ui.js';

const POLL_MS = 3000;
const FEED = 'fil';
const TEAM = 'equipe-koradevs';

const clock = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Rooms by technology, like on Discord, and a feed of what the people you follow have solved, like on GitHub. */
export function Espaces({ shared }: { shared: Shared }) {
  const { token, user } = shared;
  const toast = useToast();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [current, setCurrent] = useState<string>('general');
  const [messages, setMessages] = useState<SpaceMessage[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSpaces(token).then(setSpaces, () => undefined);
    getFollowing(token).then((f) => setFollowing(f.following), () => undefined);
  }, [token]);

  const load = useCallback(async () => {
    try {
      if (current === FEED) setFeed(await getFeed(token));
      else setMessages(await getSpaceMessages(token, current));
    } catch {
      /* the next poll will try again */
    }
  }, [token, current]);

  useEffect(() => {
    setMessages([]);
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const last = messages.length;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [last, current]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const m = await postSpaceMessage(token, current, text);
      setMessages((list) => [...list, m]);
      setText('');
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const follow = async (login: string) => {
    try {
      const r = await toggleFollow(token, login);
      setFollowing((list) => (r.following ? [...list, login] : list.filter((l) => l !== login)));
      toast('ok', r.following ? `Tu suis @${login}` : `Tu ne suis plus @${login}`);
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  const room = spaces.find((s) => s.id === current);

  return (
    <div className="espaces">
      <nav className="espaces-list" aria-label="Salons">
        <button type="button" className={`room ${current === FEED ? 'on' : ''}`} onClick={() => setCurrent(FEED)}>
          <Newspaper size={16} /> Mon fil
          {following.length > 0 && <span className="small muted">{following.length}</span>}
        </button>
        <span className="room-title">Salons</span>
        {spaces.map((s) => (
          <button key={s.id} type="button" className={`room ${current === s.id ? 'on' : ''}`} onClick={() => setCurrent(s.id)}>
            <Hash size={16} /> {s.name}
          </button>
        ))}
      </nav>

      <section className="espaces-main card">
        {current === FEED ? (
          <>
            <header>
              <h2>Mon fil</h2>
              <p className="small muted">Les aides confirmées des développeurs que tu suis.</p>
            </header>
            <div className="espaces-scroll">
              {feed.length === 0 ? (
                <Empty art="people" title={following.length ? 'Rien de nouveau pour l’instant' : 'Tu ne suis personne'}>
                  Dans un salon, clique sur <UserPlus size={14} style={{ verticalAlign: '-2px' }} /> à côté d’un nom pour suivre un développeur. Ses aides confirmées apparaîtront ici.
                </Empty>
              ) : (
                feed.map((f) => (
                  <div key={`${f.solutionId}-${f.helper}`} className="feed-item">
                    <BadgeCheck size={18} />
                    <div className="grow">
                      <a href={`#/passeport/${f.helper}`}><b>@{f.helper}</b></a> a résolu <b>{f.title}</b>
                      <div className="small muted">{f.tech.slice(0, 3).join(' · ')} · {new Date(f.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <header>
              <h2><Hash size={18} /> {room?.name ?? current}</h2>
              <p className="small muted">{room?.topic}</p>
            </header>
            <div className="espaces-scroll" aria-live="polite">
              {messages.length === 0 && <Empty art="people" title="Personne n’a encore écrit ici">Lance la discussion, quelqu’un te répondra.</Empty>}
              {messages.map((m) => (
                <div key={m.id} className="msg">
                  <Avatar name={m.author} size={34} />
                  <div className="grow">
                    <div className="small">
                      {m.author === TEAM ? <b>{m.author}</b> : <a href={`#/passeport/${m.author}`}><b>@{m.author}</b></a>} <span className="muted">· {clock(m.at)}</span>
                      {m.author !== user.login && m.author !== TEAM && (
                        <button type="button" className="btn-text follow" onClick={() => follow(m.author)} aria-label={following.includes(m.author) ? `Ne plus suivre ${m.author}` : `Suivre ${m.author}`}>
                          {following.includes(m.author) ? <UserCheck size={14} /> : <UserPlus size={14} />}
                        </button>
                      )}
                    </div>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
              <div ref={bottom} />
            </div>
            <form className="espaces-form" onSubmit={send}>
              <input className="input grow" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Écrire dans #${room?.name ?? current}`} maxLength={1000} aria-label="Ton message" />
              <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()} aria-label="Envoyer"><Send size={16} /></button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
