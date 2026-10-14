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

  // Formulaire nouveau projet
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRoles, setNewRoles] = useState('');
  const [newTech, setNewTech] = useState('TypeScript, React');
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
      const techList = newTech.split(',').map((t) => t.trim()).filter(Boolean);
      await createProject(token, {
        title: newTitle.trim(),
        description: newDesc.trim() || 'Projet communautaire développé avec soin.',
        tech: techList.length ? techList : ['TypeScript', 'React'],
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Haut : Titre + Bouton créer + Filtres */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
              Projets communautaires
            </h1>
            <p className="text-mute" style={{ margin: '4px 0 0 0', fontSize: '0.92rem' }}>
              Les bâtisseurs se rassemblent pour concevoir et livrer ensemble.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ height: '42px', padding: '0 20px', fontSize: '14px', borderRadius: '9999px' }}
          >
            + Proposer
          </button>
        </div>

        {/* Deux onglets : Tous / Cherchent du monde */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className={`bottom-tab ${filter === 'tous' ? 'active' : ''}`}
            onClick={() => setFilter('tous')}
            style={{ fontSize: '0.9rem' }}
          >
            Tous les projets ({projects.length})
          </button>
          <button
            type="button"
            className={`bottom-tab ${filter === 'cherchent' ? 'active' : ''}`}
            onClick={() => setFilter('cherchent')}
            style={{ fontSize: '0.9rem' }}
          >
            Cherchent du monde ({projects.filter((p) => p.neededRoles.length > 0).length})
          </button>
        </div>
      </div>

      {/* 2. Liste de cartes blanches arrondies 22px */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {displayedProjects.length === 0 ? (
          <div className="card" style={{ padding: '36px 20px', textAlign: 'center' }}>
            <p className="text-mute" style={{ margin: 0 }}>
              Aucun projet pour ce filtre. Sois le premier à présenter une idée !
            </p>
          </div>
        ) : (
          displayedProjects.map((p) => {
            const isMember = p.members.includes(user.login);
            const isExpanded = selectedProjectId === p.id;
            const completedCount = p.tasks.filter((t) => t.status === 'termine').length;

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  borderColor: isExpanded ? 'var(--color-green)' : 'var(--color-line)',
                }}
                onClick={() => setSelectedProjectId(isExpanded ? null : p.id)}
              >
                {/* En-tête de la carte */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: 'var(--color-ink)', fontSize: '1.1rem' }}>
                        {p.title}
                      </span>
                      <span className="text-mute" style={{ fontSize: '0.82rem' }}>
                        📍 {p.city} · {p.members.length} membre{p.members.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <p style={{ margin: '6px 0 0 0', fontSize: '0.92rem', color: 'var(--color-ink)', lineHeight: 1.5 }}>
                      {p.description}
                    </p>
                  </div>

                  {/* Bouton pilule vert sombre "Rejoindre" ou pastille "Membre" */}
                  <div style={{ flexShrink: 0 }}>
                    {!isMember ? (
                      <button
                        type="button"
                        className="btn-pill-deep"
                        onClick={(e) => handleJoin(e, p.id)}
                      >
                        Rejoindre
                      </button>
                    ) : (
                      <span className="pill pill-mint">
                        ✓ Membre
                      </span>
                    )}
                  </div>
                </div>

                {/* Étiquettes : Ciel pour technos, Pêche pour rôles */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {p.tech.map((t) => (
                    <span key={t} className="pill pill-sky">
                      {t}
                    </span>
                  ))}

                  {p.neededRoles.map((role) => (
                    <span key={role} className="pill pill-peach">
                      Cherche : {role}
                    </span>
                  ))}
                </div>

                {/* Barre de résumé / Dépliage */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--color-line)', fontSize: '0.84rem' }}>
                  <span className="text-mute">
                    {p.tasks.length === 0
                      ? 'Aucune tâche définie'
                      : `${completedCount}/${p.tasks.length} tâche${p.tasks.length > 1 ? 's' : ''} terminée${completedCount > 1 ? 's' : ''}`}
                  </span>
                  <span className="link-text" style={{ fontSize: '0.85rem' }}>
                    {isExpanded ? 'Masquer les tâches ▲' : 'Voir les tâches ▼'}
                  </span>
                </div>

                {/* Section détaillée des tâches */}
                {isExpanded && (
                  <div
                    style={{
                      paddingTop: '8px',
                      cursor: 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Formulaire ajout tâche */}
                    <form onSubmit={(e) => handleAddTask(e, p.id)} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="input-box"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Ajouter une tâche au chantier…"
                        style={{ height: '40px', padding: '0 14px', fontSize: '0.88rem' }}
                      />
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ height: '40px', padding: '0 18px', fontSize: '0.88rem', borderRadius: '14px', whiteSpace: 'nowrap' }}
                      >
                        Ajouter
                      </button>
                    </form>

                    {/* Liste des tâches */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {p.tasks.length === 0 ? (
                        <p className="text-mute" style={{ fontSize: '0.85rem', margin: 0 }}>
                          Pas encore de tâches. Ajoute la première ci-dessus !
                        </p>
                      ) : (
                        p.tasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleToggleTask(p.id, t.id, t.status)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              borderRadius: '12px',
                              backgroundColor: 'var(--color-bg)',
                              cursor: 'pointer',
                              border: '1px solid var(--color-line)',
                              transition: 'all 150ms ease',
                            }}
                          >
                            <span
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 800,
                                backgroundColor: t.status === 'termine' ? 'var(--color-green)' : 'transparent',
                                color: t.status === 'termine' ? '#FFFFFF' : 'var(--color-mute)',
                                border: t.status === 'termine' ? 'none' : '2px solid var(--color-mute)',
                              }}
                            >
                              {t.status === 'termine' ? '✓' : ''}
                            </span>
                            <span
                              style={{
                                fontSize: '0.9rem',
                                color: t.status === 'termine' ? 'var(--color-mute)' : 'var(--color-ink)',
                                textDecoration: t.status === 'termine' ? 'line-through' : 'none',
                                flex: 1,
                              }}
                            >
                              {t.title}
                            </span>
                            {t.assignee && (
                              <span className="text-mute" style={{ fontSize: '0.78rem' }}>
                                @{t.assignee}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Modale création de projet */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '8px' }}>Proposer un projet</h2>
            <p className="text-mute" style={{ fontSize: '0.88rem', margin: '0 0 20px 0' }}>
              Rassemble des pairs autour d'une idée utile pour la communauté.
            </p>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)', display: 'block', marginBottom: '6px' }}>
                  Titre du projet
                </label>
                <input
                  type="text"
                  className="input-box"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ex: KoraPay Mobile ou Passerelle SMS"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)', display: 'block', marginBottom: '6px' }}>
                  Description de la mission
                </label>
                <textarea
                  className="textarea-field"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ce que construit le projet, pourquoi c'est utile…"
                  rows={3}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)', display: 'block', marginBottom: '6px' }}>
                  Technologies utilisées (séparées par des virgules)
                </label>
                <input
                  type="text"
                  className="input-box"
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  placeholder="TypeScript, React, Python…"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)', display: 'block', marginBottom: '6px' }}>
                  Profils recherchés (séparés par des virgules)
                </label>
                <input
                  type="text"
                  className="input-box"
                  value={newRoles}
                  onChange={(e) => setNewRoles(e.target.value)}
                  placeholder="UI/UX, Backend Node, Testeur…"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)', display: 'block', marginBottom: '6px' }}>
                  Ville de base
                </label>
                <input
                  type="text"
                  className="input-box"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Cotonou, Lomé, Dakar…"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary" style={{ height: '42px', padding: '0 24px', fontSize: '14px' }}>
                  Publier le projet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
