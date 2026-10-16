import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ExternalLink, FolderKanban, Flag, Link2, Plus, UserPlus, X } from 'lucide-react';
import {
  addProjectTask,
  answerJoin,
  createProject,
  getProjects,
  joinProject,
  updateProjectTaskStatus,
  type CommunityProject,
  type TaskStatus,
} from './api.js';
import type { Shared } from './App.js';
import { SignalerModal } from './SignalerModal.js';
import { Avatar, Badge, Empty, Modal, Skeletons, Spinner, splitList, timeAgo, useToast } from './ui.js';

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: 'a_faire', label: 'À faire' },
  { status: 'en_cours', label: 'En cours' },
  { status: 'termine', label: 'Terminé' },
];

export function Projets({ shared }: { shared: Shared }) {
  const { token, user } = shared;
  const toast = useToast();
  const [projects, setProjects] = useState<CommunityProject[] | null>(null);
  const [filter, setFilter] = useState<'tous' | 'cherchent' | 'miens'>('tous');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => getProjects().then(setProjects, () => setProjects([]));
  useEffect(() => {
    void load();
  }, []);

  const open = projects?.find((p) => p.id === openId) ?? null;

  const visible = (projects ?? []).filter((p) =>
    filter === 'cherchent' ? p.neededRoles.length > 0 : filter === 'miens' ? p.members.includes(user.login) : true,
  );

  if (open) {
    return (
      <ProjectDetail
        project={open}
        shared={shared}
        onBack={() => setOpenId(null)}
        onChanged={() => void load()}
      />
    );
  }

  return (
    <div className="col" style={{ gap: 20 }}>
      <div className="row between wrap">
        <div className="page-head" style={{ margin: 0 }}>
          <h1>Projets</h1>
          <p>Présente ce que tu construis, trouve des coéquipiers.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus size={18} /> Publier un projet
        </button>
      </div>

      <div className="chips" role="group" aria-label="Filtrer">
        {([['tous', 'Tous'], ['cherchent', 'Cherchent du monde'], ['miens', 'Les miens']] as const).map(([value, label]) => (
          <button key={value} type="button" className={`chip ${filter === value ? 'on' : ''}`} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>

      {projects === null ? (
        <Skeletons count={3} />
      ) : visible.length === 0 ? (
        <Empty icon={<FolderKanban size={28} />} title={projects.length === 0 ? 'Aucun projet publié pour l’instant' : 'Rien dans ce filtre'}>
          {projects.length === 0 && (
            <div style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>Publie le premier</button>
            </div>
          )}
        </Empty>
      ) : (
        <div className="col">
          {visible.map((p) => {
            const mine = p.members.includes(user.login);
            return (
              <button key={p.id} type="button" className="card interactive" style={{ textAlign: 'left', width: '100%', font: 'inherit', color: 'inherit' }} onClick={() => setOpenId(p.id)}>
                <div className="project-top">
                  <div className="grow">
                    <h3>{p.title}</h3>
                    <div className="small muted">
                      par @{p.author}{[p.city, p.country].filter(Boolean).length > 0 && ` · ${[p.city, p.country].filter(Boolean).join(', ')}`} · {timeAgo(p.createdAt)}
                    </div>
                  </div>
                  {mine ? <Badge tone="mint">Tu en fais partie</Badge> : null}
                </div>
                <p className="muted" style={{ margin: '10px 0 12px' }}>{p.description}</p>
                <div className="row wrap" style={{ gap: 6 }}>
                  {p.tech.map((t) => <Badge key={t} tone="sky">{t}</Badge>)}
                  {p.neededRoles.map((r) => <Badge key={r} tone="peach">Cherche : {r}</Badge>)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {creating && (
        <CreateProject
          onClose={() => setCreating(false)}
          onCreate={async (data) => {
            await createProject(token, data);
            toast('ok', 'Projet publié');
            setCreating(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function CreateProject({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { title: string; description: string; tech: string[]; neededRoles: string[]; repoUrl?: string; demoUrl?: string }) => Promise<void>;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ title: '', description: '', tech: '', roles: '', repoUrl: '', demoUrl: '' });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreate({
        title: form.title,
        description: form.description,
        tech: splitList(form.tech),
        neededRoles: splitList(form.roles),
        repoUrl: form.repoUrl.trim() || undefined,
        demoUrl: form.demoUrl.trim() || undefined,
      });
    } catch (err) {
      toast('error', (err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Publier un projet" subtitle="Décris-le en quelques lignes, sépare les listes par des virgules." onClose={onClose}>
      <form className="col" style={{ gap: 14 }} onSubmit={submit}>
        <label className="field">
          <span className="label">Nom du projet *</span>
          <input className="input" value={form.title} onChange={set('title')} maxLength={80} required autoFocus />
        </label>
        <label className="field">
          <span className="label">Description *</span>
          <textarea className="textarea" value={form.description} onChange={set('description')} maxLength={600} required placeholder="Ce que ça fait, où vous en êtes…" />
        </label>
        <div className="grid-2">
          <label className="field">
            <span className="label">Technologies</span>
            <input className="input" value={form.tech} onChange={set('tech')} placeholder="React, Node.js" />
          </label>
          <label className="field">
            <span className="label">Rôles recherchés</span>
            <input className="input" value={form.roles} onChange={set('roles')} placeholder="Dev mobile, Designer" />
          </label>
          <label className="field">
            <span className="label">Dépôt (https://…)</span>
            <input className="input" type="url" value={form.repoUrl} onChange={set('repoUrl')} />
          </label>
          <label className="field">
            <span className="label">Démo (https://…)</span>
            <input className="input" type="url" value={form.demoUrl} onChange={set('demoUrl')} />
          </label>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner />} Publier</button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectDetail({ project: p, shared, onBack, onChanged }: { project: CommunityProject; shared: Shared; onBack: () => void; onChanged: () => void }) {
  const { token, user } = shared;
  const toast = useToast();
  const [taskTitle, setTaskTitle] = useState('');
  const [reporting, setReporting] = useState(false);
  const isMember = p.members.includes(user.login);
  const isAuthor = p.author === user.login;
  const asked = p.requests.includes(user.login);

  const run = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await action();
      if (success) toast('ok', success);
      onChanged();
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };

  return (
    <div className="col" style={{ gap: 22 }}>
      <div>
        <button type="button" className="btn btn-text small" onClick={onBack}><ArrowLeft size={15} /> Tous les projets</button>
      </div>

      <div className="card col" style={{ gap: 14 }}>
        <div className="project-top">
          <div className="grow">
            <h1 style={{ fontSize: '1.6rem' }}>{p.title}</h1>
            <div className="small muted">par @{p.author} · {timeAgo(p.createdAt)}{p.city && ` · ${p.city}`}</div>
          </div>
          <button type="button" className="btn btn-icon" aria-label="Signaler ce projet" onClick={() => setReporting(true)}><Flag size={16} /></button>
        </div>
        <p>{p.description}</p>
        <div className="row wrap" style={{ gap: 6 }}>
          {p.tech.map((t) => <Badge key={t} tone="sky">{t}</Badge>)}
          {p.neededRoles.map((r) => <Badge key={r} tone="peach">Cherche : {r}</Badge>)}
        </div>
        <div className="row wrap">
          {p.repoUrl && <a className="btn btn-ghost btn-sm" href={p.repoUrl} target="_blank" rel="noopener noreferrer"><Link2 size={15} /> Dépôt</a>}
          {p.demoUrl && <a className="btn btn-ghost btn-sm" href={p.demoUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Démo</a>}
          {!isMember && (
            <button type="button" className="btn btn-primary btn-sm" disabled={asked} onClick={() => void run(() => joinProject(token, p.id).then((r) => toast('ok', r.message)))}>
              <UserPlus size={15} /> {asked ? 'Demande envoyée' : 'Demander à rejoindre'}
            </button>
          )}
        </div>
      </div>

      <section>
        <div className="section-head"><h2 className="section-title">Équipe</h2><Badge>{p.members.length}</Badge></div>
        <div className="row wrap" style={{ gap: 14 }}>
          {p.members.map((m) => (
            <span key={m} className="row" style={{ gap: 8 }}>
              <Avatar name={m} size={32} />
              <span className="small"><strong>@{m}</strong>{m === p.author && <span className="muted"> · auteur</span>}</span>
            </span>
          ))}
        </div>
      </section>

      {isAuthor && p.requests.length > 0 && (
        <section>
          <div className="section-head"><h2 className="section-title">Demandes pour rejoindre</h2><Badge tone="peach">{p.requests.length}</Badge></div>
          <div className="col">
            {p.requests.map((login) => (
              <div key={login} className="card tight row">
                <Avatar name={login} size={34} />
                <strong className="grow">@{login}</strong>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => void run(() => answerJoin(token, p.id, login, true), `@${login} rejoint l’équipe`)}><Check size={15} /> Accepter</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void run(() => answerJoin(token, p.id, login, false))}><X size={15} /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-head"><h2 className="section-title">Tableau de tâches</h2></div>
        {isMember && (
          <form
            className="row"
            style={{ marginBottom: 14 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!taskTitle.trim()) return;
              void run(() => addProjectTask(token, p.id, taskTitle.trim()).then(() => setTaskTitle('')));
            }}
          >
            <input className="input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Nouvelle tâche…" maxLength={120} aria-label="Nouvelle tâche" />
            <button type="submit" className="btn btn-primary"><Plus size={18} /> Ajouter</button>
          </form>
        )}
        <div className="kanban">
          {COLUMNS.map((col) => {
            const tasks = p.tasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="kcol">
                <h4>{col.label}<span>{tasks.length}</span></h4>
                {tasks.map((t) => (
                  <div key={t.id} className="task">
                    {t.title}
                    {isMember && (
                      <div className="row">
                        <select
                          value={t.status}
                          aria-label={`Statut de ${t.title}`}
                          onChange={(e) => void run(() => updateProjectTaskStatus(token, p.id, t.id, e.target.value as TaskStatus))}
                        >
                          {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {p.tasks.length === 0 && <p className="muted small" style={{ marginTop: 10 }}>{isMember ? 'Ajoute la première tâche pour organiser le travail.' : 'Pas encore de tâche.'}</p>}
      </section>

      {reporting && <SignalerModal token={token} targetType="projet" targetId={p.id} onClose={() => setReporting(false)} />}
    </div>
  );
}
