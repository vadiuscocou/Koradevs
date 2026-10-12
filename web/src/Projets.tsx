import { useEffect, useState } from 'react';
import { KNOWN_TECH } from '@sos/shared';
import { addProjectTask, createProject, getProjects, joinProject, updateProjectTaskStatus, type CommunityProject } from './api.js';
import { SignalerModal } from './SignalerModal.js';

export function Projets({ token, user }: { token: string; user: { login: string } }) {
  const [projects, setProjects] = useState<CommunityProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<CommunityProject | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reportingProject, setReportingProject] = useState<CommunityProject | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Formulaire nouveau projet
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTech, setNewTech] = useState<string[]>(['TypeScript', 'React']);
  const [newRoles, setNewRoles] = useState('');
  const [newRepo, setNewRepo] = useState('');
  const [newDemo, setNewDemo] = useState('');
  const [newCity, setNewCity] = useState('Cotonou');
  const [newCountry, setNewCountry] = useState('Bénin');

  // Nouvelle tâche
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const loadProjects = () => {
    getProjects()
      .then((list) => {
        setProjects(list);
        if (selectedProject) {
          const updated = list.find((p) => p.id === selectedProject.id);
          if (updated) setSelectedProject(updated);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const roles = newRoles
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      await createProject(token, {
        title: newTitle,
        description: newDesc,
        tech: newTech,
        neededRoles: roles.length ? roles : ['Contributeur Open Source'],
        repoUrl: newRepo || undefined,
        demoUrl: newDemo || undefined,
        city: newCity,
        country: newCountry,
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewRoles('');
      setNewRepo('');
      setNewDemo('');
      loadProjects();
      setActionNotice('🎉 Votre projet a été publié dans la vitrine !');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleJoin = async (projectId: string) => {
    try {
      const res = await joinProject(token, projectId);
      loadProjects();
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newTaskTitle.trim()) return;
    try {
      await addProjectTask(token, selectedProject.id, newTaskTitle.trim(), user.login);
      setNewTaskTitle('');
      loadProjects();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleUpdateTask = async (taskId: string, newStatus: 'a_faire' | 'en_cours' | 'termine') => {
    if (!selectedProject) return;
    try {
      await updateProjectTaskStatus(token, selectedProject.id, taskId, newStatus);
      loadProjects();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const shareProjectOnWhatsApp = (proj: CommunityProject) => {
    const text = `🚀 Découvre le projet KoraDevs : ${proj.title}\n\n${proj.description}\nRôles recherchés : ${proj.neededRoles.join(', ')}\n\nRejoins-nous sur KoraDevs pour collaborer !`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="projets-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0 }}>🚀 Vitrine de Projets & Collaboration</h1>
          <p className="hint" style={{ margin: '4px 0 0' }}>
            Partage ton projet, trouve des coéquipiers passionnés et collabore avec le tableau de tâches intégré.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} style={{ background: '#238636', padding: '10px 16px' }}>
          + Publier un projet
        </button>
      </div>

      {actionNotice && (
        <div className="card success" style={{ marginBottom: '16px', padding: '10px 16px' }}>
          {actionNotice}
        </div>
      )}

      {/* Grid of Projects */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {projects.map((p) => {
          const isMember = p.members.includes(user.login);
          const isSelected = selectedProject?.id === p.id;

          return (
            <div
              key={p.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderColor: isSelected ? '#58a6ff' : '#30363d',
                background: '#161b22',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h2 style={{ margin: '0 0 6px', color: '#58a6ff' }}>{p.title}</h2>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="link"
                      onClick={() => shareProjectOnWhatsApp(p)}
                      style={{ color: '#25D366', fontWeight: 'bold' }}
                    >
                      📲 WhatsApp
                    </button>
                    <button
                      type="button"
                      className="link"
                      onClick={() => setReportingProject(p)}
                      style={{ color: '#8b949e', fontSize: '0.8rem' }}
                    >
                      ⚠️
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#8b949e', margin: '0 0 8px' }}>
                  Par @{p.author} · 📍 {p.city}, {p.country} · {p.members.length} membre(s)
                </p>

                <p style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#c9d1d9', lineHeight: '1.4' }}>
                  {p.description}
                </p>

                <div className="chips" style={{ marginBottom: '10px' }}>
                  {p.tech.map((t) => (
                    <span key={t} className="chip on" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                      {t}
                    </span>
                  ))}
                </div>

                <div style={{ background: '#0d1117', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                  <b style={{ fontSize: '0.85rem', color: '#d29922' }}>Rôles recherchés : </b>
                  <span style={{ fontSize: '0.85rem', color: '#e6edf3' }}>{p.neededRoles.join(' · ')}</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', marginBottom: '14px' }}>
                  {p.repoUrl && (
                    <a href={p.repoUrl} target="_blank" rel="noreferrer" style={{ color: '#58a6ff' }}>
                      🔗 Code source
                    </a>
                  )}
                  {p.demoUrl && (
                    <a href={p.demoUrl} target="_blank" rel="noreferrer" style={{ color: '#3fb950' }}>
                      🌐 Démo en ligne
                    </a>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #21262d', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedProject(isSelected ? null : p)}
                  style={{ flex: 1, background: isSelected ? '#1f6feb' : '#21262d' }}
                >
                  {isSelected ? 'Fermer le tableau' : `📋 Tâches & Suivi (${p.tasks.length})`}
                </button>

                {!isMember ? (
                  <button type="button" onClick={() => handleJoin(p.id)} style={{ background: '#238636' }}>
                    Rejoindre
                  </button>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: '#3fb950', display: 'flex', alignItems: 'center' }}>
                    ✓ Membre
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Kanban / Tasks Board for Selected Project */}
      {selectedProject && (
        <section className="card" style={{ background: '#0d1117', border: '1px solid #388bfd', marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0 }}>
                📋 Tableau de collaboration : <span style={{ color: '#58a6ff' }}>{selectedProject.title}</span>
              </h2>
              <p className="hint" style={{ margin: '4px 0 0' }}>
                Membres actifs : {selectedProject.members.map((m) => `@${m}`).join(', ')}
              </p>
            </div>
            <button className="link" onClick={() => setSelectedProject(null)}>
              ✕ Fermer
            </button>
          </div>

          {/* Add task input */}
          <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Ajouter une tâche pour l'équipe (ex: Corriger le bug de scroll sur mobile)..."
              style={{ flex: 1 }}
            />
            <button type="submit">+ Ajouter tâche</button>
          </form>

          {/* Kanban Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {/* À FAIRE */}
            <div style={{ background: '#161b22', padding: '12px', borderRadius: '8px', border: '1px solid #30363d' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: '#8b949e' }}>
                📌 À Faire ({selectedProject.tasks.filter((t) => t.status === 'a_faire').length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedProject.tasks
                  .filter((t) => t.status === 'a_faire')
                  .map((t) => (
                    <div key={t.id} style={{ background: '#0d1117', padding: '10px', borderRadius: '6px', border: '1px solid #21262d' }}>
                      <p style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>{t.title}</p>
                      <button
                        type="button"
                        onClick={() => handleUpdateTask(t.id, 'en_cours')}
                        style={{ background: '#d29922', padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Passer En cours →
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* EN COURS */}
            <div style={{ background: '#161b22', padding: '12px', borderRadius: '8px', border: '1px solid #30363d' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: '#d29922' }}>
                ⚡ En Cours ({selectedProject.tasks.filter((t) => t.status === 'en_cours').length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedProject.tasks
                  .filter((t) => t.status === 'en_cours')
                  .map((t) => (
                    <div key={t.id} style={{ background: '#0d1117', padding: '10px', borderRadius: '6px', border: '1px solid #21262d' }}>
                      <p style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>{t.title}</p>
                      {t.assignee && <p className="hint" style={{ margin: '0 0 8px', fontSize: '0.75rem' }}>@{t.assignee}</p>}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateTask(t.id, 'a_faire')}
                          style={{ background: '#30363d', padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          ← À faire
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateTask(t.id, 'termine')}
                          style={{ background: '#238636', padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Terminer ✓
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* TERMINÉ */}
            <div style={{ background: '#161b22', padding: '12px', borderRadius: '8px', border: '1px solid #30363d' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: '#3fb950' }}>
                ✅ Terminé ({selectedProject.tasks.filter((t) => t.status === 'termine').length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedProject.tasks
                  .filter((t) => t.status === 'termine')
                  .map((t) => (
                    <div key={t.id} style={{ background: '#0d1117', padding: '10px', borderRadius: '6px', border: '1px solid #21262d' }}>
                      <p style={{ margin: '0', fontSize: '0.9rem', textDecoration: 'line-through', color: '#8b949e' }}>
                        {t.title}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Modal Publier un Projet */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Publier un projet dans la Vitrine</h2>
            <form onSubmit={handleCreateProject}>
              <label>
                Titre du projet :
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ex: KoraPay Mobile"
                  required
                />
              </label>

              <label>
                Description :
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Expliquez ce que fait le projet, le problème résolu..."
                  rows={3}
                  required
                  style={{ width: '100%', marginTop: '6px', padding: '8px', background: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>
                  Ville :
                  <input type="text" value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Dakar, Cotonou..." />
                </label>
                <label>
                  Pays :
                  <input type="text" value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="Sénégal, Bénin..." />
                </label>
              </div>

              <label>
                Rôles recherchés (séparés par des virgules) :
                <input
                  type="text"
                  value={newRoles}
                  onChange={(e) => setNewRoles(e.target.value)}
                  placeholder="ex: Dev Frontend React, Expert Docker, Designer UI"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>
                  Lien GitHub (facultatif) :
                  <input type="url" value={newRepo} onChange={(e) => setNewRepo(e.target.value)} placeholder="https://github.com/..." />
                </label>
                <label>
                  Lien Démo (facultatif) :
                  <input type="url" value={newDemo} onChange={(e) => setNewDemo(e.target.value)} placeholder="https://demo..." />
                </label>
              </div>

              <div style={{ marginTop: '10px' }}>
                <b style={{ display: 'block', marginBottom: '6px' }}>Technologies du projet :</b>
                <div className="chips">
                  {KNOWN_TECH.map((t) => (
                    <button
                      type="button"
                      key={t}
                      className={newTech.includes(t) ? 'chip on' : 'chip'}
                      onClick={() => setNewTech((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="link" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </button>
                <button type="submit">Publier mon projet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reportingProject && (
        <SignalerModal
          token={token}
          targetType="projet"
          targetId={reportingProject.id}
          targetTitle={reportingProject.title}
          onClose={() => setReportingProject(null)}
        />
      )}
    </div>
  );
}
