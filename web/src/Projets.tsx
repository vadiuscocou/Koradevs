import { useEffect, useState } from 'react';
import { addProjectTask, createProject, getProjects, joinProject, updateProjectTaskStatus, type CommunityProject } from './api.js';

interface ProjetsProps {
  token: string;
  user: { login: string };
}

export function Projets({ token, user }: ProjetsProps) {
  const [projects, setProjects] = useState<CommunityProject[]>([]);
  const [filter, setFilter] = useState<'tous' | 'cherchent'>('tous');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Formulaire nouveau projet épuré
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRoles, setNewRoles] = useState('');
  const [newCity, setNewCity] = useState('Cotonou');

  const loadProjects = () => {
    getProjects().then(setProjects).catch(() => {});
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const roles = newRoles.split(',').map((r) => r.trim()).filter(Boolean);
      await createProject(token, {
        title: newTitle.trim(),
        description: newDesc.trim() || 'Projet communautaire',
        tech: ['TypeScript', 'React'],
        neededRoles: roles.length ? roles : ['Développeur'],
        city: newCity,
        country: 'Bénin',
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewRoles('');
      loadProjects();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleJoin = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    try {
      await joinProject(token, projectId);
      loadProjects();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleAddTask = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await addProjectTask(token, projectId, newTaskTitle.trim(), user.login);
      setNewTaskTitle('');
      loadProjects();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleToggleTask = async (projectId: string, taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'termine' ? 'a_faire' : 'termine';
    try {
      await updateProjectTaskStatus(token, projectId, taskId, nextStatus);
      loadProjects();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const displayedProjects = filter === 'cherchent'
    ? projects.filter((p) => p.neededRoles.length > 0)
    : projects;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Haut : Titre + Bouton + et Onglets texte */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 600, margin: 0 }}>
            Projets
          </h1>

          <button
            type="button"
            className="link-text"
            onClick={() => setShowCreateModal(true)}
            style={{ fontSize: '1.3rem', fontWeight: 500, padding: '4px 8px' }}
            title="Publier un projet"
          >
            +
          </button>
        </div>

        {/* Deux onglets texte : Tous / Cherchent du monde */}
        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
          <button
            type="button"
            className="link-text"
            onClick={() => setFilter('tous')}
            style={{
              color: filter === 'tous' ? 'var(--ink)' : 'var(--mute)',
              fontWeight: filter === 'tous' ? 600 : 400,
              fontSize: '0.95rem',
            }}
          >
            Tous
          </button>
          <button
            type="button"
            className="link-text"
            onClick={() => setFilter('cherchent')}
            style={{
              color: filter === 'cherchent' ? 'var(--ink)' : 'var(--mute)',
              fontWeight: filter === 'cherchent' ? 600 : 400,
              fontSize: '0.95rem',
            }}
          >
            Cherchent du monde
          </button>
        </div>
      </div>

      {/* Liste épurée à filets fins */}
      <div className="divider-list">
        {displayedProjects.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p className="text-mute" style={{ margin: 0 }}>
              Aucun projet trouvé. Sois le premier à présenter une idée !
            </p>
          </div>
        ) : (
          displayedProjects.map((p) => {
            const isMember = p.members.includes(user.login);
            const isExpanded = selectedProjectId === p.id;

            return (
              <div
                key={p.id}
                style={{
                  borderBottom: '1px solid var(--line)',
                  padding: '16px 0',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedProjectId(isExpanded ? null : p.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '1rem', display: 'block' }}>
                      {p.title}
                    </span>
                    <span className="text-mute" style={{ fontSize: '0.82rem', display: 'block', margin: '2px 0 4px 0' }}>
                      {p.city} · {p.members.length} membre{p.members.length > 1 ? 's' : ''}
                    </span>
                    {p.neededRoles.length > 0 && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>
                        Cherche : <span style={{ color: 'var(--ink)' }}>{p.neededRoles.join(', ')}</span>
                      </span>
                    )}
                  </div>

                  <div>
                    {!isMember ? (
                      <button
                        type="button"
                        className="link-text"
                        onClick={(e) => handleJoin(e, p.id)}
                        style={{ fontWeight: 600, fontSize: '0.9rem' }}
                      >
                        Rejoindre
                      </button>
                    ) : (
                      <span className="text-mute" style={{ fontSize: '0.85rem' }}>
                        Membre
                      </span>
                    )}
                  </div>
                </div>

                {/* Tâches légères dépliées */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: '14px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--line)',
                      cursor: 'default',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.5 }}>
                      {p.description}
                    </p>

                    <span className="section-label">Tâches ({p.tasks.length})</span>

                    <form onSubmit={(e) => handleAddTask(e, p.id)} style={{ display: 'flex', gap: '8px', margin: '8px 0 12px 0' }}>
                      <input
                        type="text"
                        className="input-field"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Ajouter une tâche…"
                        style={{ height: '36px', fontSize: '0.85rem' }}
                      />
                      <button type="submit" className="link-text" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        Ajouter
                      </button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {p.tasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleToggleTask(p.id, t.id, t.status)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            color: t.status === 'termine' ? 'var(--mute)' : 'var(--ink)',
                            textDecoration: t.status === 'termine' ? 'line-through' : 'none',
                          }}
                        >
                          <span style={{ color: t.status === 'termine' ? 'var(--accent)' : 'var(--mute)' }}>
                            {t.status === 'termine' ? '✓' : '○'}
                          </span>
                          <span>{t.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modale de publication minimale */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Présenter un projet</h2>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>
                Titre du projet
                <input
                  type="text"
                  className="input-field"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ex: KoraPay Mobile"
                  required
                  style={{ marginTop: '4px' }}
                />
              </label>

              <label style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>
                Description
                <textarea
                  className="textarea-field"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ce que fait le projet…"
                  rows={2}
                  style={{ marginTop: '4px' }}
                />
              </label>

              <label style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>
                Rôles recherchés (séparés par des virgules)
                <input
                  type="text"
                  className="input-field"
                  value={newRoles}
                  onChange={(e) => setNewRoles(e.target.value)}
                  placeholder="UI/UX, Backend Node"
                  style={{ marginTop: '4px' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="link-text"
                  onClick={() => setShowCreateModal(false)}
                  style={{ color: 'var(--mute)' }}
                >
                  Annuler
                </button>
                <button type="submit" className="link-text" style={{ fontWeight: 600 }}>
                  Publier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
