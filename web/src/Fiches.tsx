import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Copy, Flag, Search, Share2 } from 'lucide-react';
import type { SolutionHit } from '@sos/shared';
import { getConfirmedIds, getRecentSolutions, getReplay, searchSolutions, type ReplayFile } from './api.js';
import { Replay } from './Replay.js';
import type { Shared } from './App.js';
import { SignalerModal } from './SignalerModal.js';
import { Badge, Empty, Skeletons, copyText, shareWhatsApp, useDebounced, useToast } from './ui.js';

export function Fiches({ shared, initialQuery, initialOpen }: { shared: Shared; initialQuery: string; initialOpen: SolutionHit | null }) {
  const toast = useToast();
  const [query, setQuery] = useState(initialQuery);
  const [tech, setTech] = useState('');
  const [items, setItems] = useState<SolutionHit[] | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<SolutionHit | null>(initialOpen);
  const [reporting, setReporting] = useState(false);
  const debounced = useDebounced(query);
  const [replay, setReplay] = useState<ReplayFile[] | null>(null);

  useEffect(() => {
    setReplay(null);
    if (!open) return undefined;
    let alive = true;
    getReplay(open.id).then(
      (r) => alive && setReplay(r.files),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    getConfirmedIds().then((ids) => setConfirmed(new Set(ids)), () => undefined);
  }, []);

  useEffect(() => {
    let alive = true;
    const request = debounced.trim() ? searchSolutions(debounced.trim(), tech || undefined) : getRecentSolutions();
    setItems(null);
    request.then(
      (list) => alive && setItems(tech && !debounced.trim() ? list.filter((s) => s.tech.includes(tech)) : list),
      () => alive && setItems([]),
    );
    return () => {
      alive = false;
    };
  }, [debounced, tech]);

  const [allTech, setAllTech] = useState<string[]>([]);
  useEffect(() => {
    if (items && !tech) setAllTech([...new Set(items.flatMap((s) => s.tech))].slice(0, 14));
  }, [items, tech]);

  if (open) {
    const isConfirmed = confirmed.has(open.id);
    return (
      <div className="col" style={{ gap: 20 }}>
        <div>
          <button type="button" className="btn btn-text small" onClick={() => setOpen(null)}>
            <ArrowLeft size={15} /> Toutes les fiches
          </button>
        </div>

        <div>
          <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
            {isConfirmed ? <Badge tone="mint">Confirmé par un test</Badge> : <Badge>Fiche de départ</Badge>}
            {open.tech.map((t) => (
              <Badge key={t} tone="sky">{t}</Badge>
            ))}
          </div>
          <h1 style={{ fontSize: '1.7rem' }}>{open.title}</h1>
        </div>

        <section>
          <div className="block-label">Erreur</div>
          <div className="code-block error">{open.error}</div>
        </section>
        <section className="card">
          <div className="block-label">Cause</div>
          <p>{open.cause}</p>
        </section>
        <section className="card" style={{ borderColor: 'var(--accent)' }}>
          <div className="block-label" style={{ color: 'var(--mint-fg)' }}>Correction</div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{open.fix}</p>
        </section>

        {replay && replay.length > 0 && <Replay files={replay} />}

        <div className="row wrap">
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              const ok = await copyText(open.fix);
              toast(ok ? 'ok' : 'error', ok ? 'Correction copiée' : 'Copie impossible');
            }}
          >
            <Copy size={16} /> Copier la correction
          </button>
          <button type="button" className="btn btn-soft" onClick={() => shareWhatsApp(`Fiche KoraDevs : ${open.title}\n\nCause : ${open.cause}\nCorrection : ${open.fix}`)}>
            <Share2 size={16} /> Partager
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setReporting(true)}>
            <Flag size={16} /> Signaler
          </button>
        </div>

        <div className="card tint-mint tight row">
          <span className="grow small">Ça ne règle pas ton problème ?</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => shared.go('#/demander')}>Demander de l’aide</button>
        </div>

        {reporting && <SignalerModal token={shared.token} targetType="fiche" targetId={open.id} onClose={() => setReporting(false)} />}
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 20 }}>
      <div className="page-head" style={{ margin: 0 }}>
        <h1>Fiches solutions</h1>
        <p>Chaque aide résolue devient un savoir partagé. Cherche avant de demander.</p>
      </div>

      <div className="search">
        <Search size={19} />
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Colle une erreur ou tape un mot-clé…" aria-label="Rechercher une fiche" autoFocus />
      </div>

      {allTech.length > 0 && (
        <div className="chips" role="group" aria-label="Filtrer par technologie">
          <button type="button" className={`chip ${tech === '' ? 'on' : ''}`} onClick={() => setTech('')}>Toutes</button>
          {allTech.map((t) => (
            <button key={t} type="button" className={`chip ${tech === t ? 'on' : ''}`} onClick={() => setTech(tech === t ? '' : t)}>{t}</button>
          ))}
        </div>
      )}

      {items === null ? (
        <Skeletons count={4} />
      ) : items.length === 0 ? (
        <Empty icon={<BookOpen size={28} />} title={debounced.trim() ? 'Aucune fiche ne correspond' : 'La bibliothèque est vide'}>
          {debounced.trim() ? 'Demande de l’aide : la solution deviendra une fiche pour les suivants.' : 'Chaque aide résolue ajoutera une fiche ici.'}
          {debounced.trim() && (
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => shared.go('#/demander')}>Demander de l’aide</button>
            </div>
          )}
        </Empty>
      ) : (
        <div className="col">
          {items.map((s) => (
            <button key={s.id} type="button" className="card interactive fiche-row" style={{ textAlign: 'left', width: '100%', font: 'inherit', color: 'inherit' }} onClick={() => setOpen(s)}>
              <div className="grow">
                <h3>{s.title}</h3>
                <div className="error-line" style={{ marginBottom: 8 }}>{s.error}</div>
                <div className="row wrap" style={{ gap: 6 }}>
                  {s.tech.slice(0, 4).map((t) => (
                    <Badge key={t} tone="sky">{t}</Badge>
                  ))}
                </div>
              </div>
              {confirmed.has(s.id) && <Badge tone="mint">Confirmé</Badge>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
