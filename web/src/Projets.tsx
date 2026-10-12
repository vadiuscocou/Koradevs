import { useEffect, useState } from 'react';
import {
  Plus,
  Share2,
  Flag,
  Users,
  CheckCircle2,
  Clock,
  ListTodo,
} from 'lucide-react';
import { KNOWN_TECH } from '@sos/shared';
import { addProjectTask, createProject, getProjects, joinProject, updateProjectTaskStatus, type CommunityProject } from './api.js';
import { SignalerModal } from './SignalerModal.js';

export function Projets({ token, user }: { token: string; user: { login: string } }) {
  const [projects, setProjects] = useState<CommunityProject[]>([]);
  const [filter, setFilter] = useState<'tous' | 'cherchent'>('tous');
  const [selectedProject, setSelectedProject] = useState<CommunityProject | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reportingProject, setReportingProject] = useState<CommunityProject | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTech, setNewTech] = useState<string[]>(['TypeScript', 'React']);
  const [newRoles, setNewRoles] = useState('');
  const [newCity, setNewCity] = useState('Cotonou');
  const [newCountry, setNewCountry] = useState('Bénin');
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
        city: newCity,
        country: newCountry,
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewRoles('');
      loadProjects();
      setActionNotice('🎉 Projet publié avec succès !');
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleJoin = async (projectId: string) => {
    try {
      const res = await joinProject(token, projectId);
      loadProjects();
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 3500);
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
    const text = `🚀 Découvre le projet KoraDevs : ${proj.title}\n\n${proj.description}\nCherche : ${proj.neededRoles.join(' · ')}\n\nRejoins l'équipe sur KoraDevs !`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const displayedProjects = filter === 'cherchent'
    ? projects.filter((p) => p.neededRoles.length > 0)
    : projects;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* 1. HAUT : Titre, bouton +, Filtres rapides */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>Projets</h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{ minHeight: '36px', padding: '6px 12px', fontSize: '0.85rem' }}
        >
          <Plus size={16} />
          Nouveau
        </button>
      </div>

      {actionNotice && (
        <div style={{ background: 'var(--color-brand-soft)', border: '1px solid var(--color-brand)', color: 'var(--color-brand)', padding: '8px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.88rem' }}>
          {actionNotice}
        </div>
      )}

      {/* Filtres rapides : Tous / Cherchent du monde */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          className={filter === 'tous' ? '' : 'secondary'}
          onClick={() => setFilter('tous')}
          style={{ minHeight: '36px', padding: '6px 16px', fontSize: '0.85rem' }}
        >
          Tous
        </button>
        <button
          type="button"
          className={filter === 'cherchent' ? '' : 'secondary'}
          onClick={() => setFilter('cherchent')}
          style={{ minHeight: '36px', padding: '6px 16px', fontSize: '0.85rem' }}
        >
          Cherchent du monde
        </button>
      </div>

      {/* 2. MILIEU : Cartes avec rôles recherchés en surbrillance Soleil léger */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {displayedProjects.map((p) => {
          const isMember = p.members.includes(user.login);
          const isSelected = selectedProject?.id === p.id;

          return (
            <div key={p.id} className="card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <h2 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-text)' }}>{p.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="link"
                    onClick={() => shareProjectOnWhatsApp(p)}
                    style={{ color: '#25D366' }}
                    title="Partager sur WhatsApp"
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    type="button"
                    className="link"
                    onClick={() => setReportingProject(p)}
                    style={{ color: 'var(--color-slate)' }}
                    title="Signaler"
                  >
                    <Flag size={15} />
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                Par @{p.author} · {p.city} · {p.members.length} membre{p.members.length > 1 ? 's' : ''}
              </div>

              <p style={{ margin: '0 0 12px', fontSize: '0.92rem', color: 'var(--color-text)', lineHeight: 1.4 }}>
                {p.description}
              </p>

              <div className="chips" style={{ marginBottom: '12px' }}>
                {p.tech.map((t) => (
                  <span key={t} className="chip" style={{ fontSize: '0.75rem', padding: '2px 8px', minHeight: '24px' }}>
                    {t}
                  </span>
                ))}
              </div>

              {/* Rôles recherchés en surbrillance claire (Soleil léger) */}
              {p.neededRoles.length > 0 && (
                <div
                  style={{
                    background: 'var(--color-sun-soft)',
                    border: '1px solid rgba(242, 169, 59, 0.4)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    marginBottom: '14px',
                    color: '#8C5609',
                  }}
                >
                  <b>Cherche :</b> {p.neededRoles.join(' · ')}
                </div>
              )}

              {/* 3. BAS : Tâches (x) et Rejoindre */}
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSelectedProject(isSelected ? null : p)}
                  style={{ flex: 1, minHeight: '38px', padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  <ListTodo size={16} />
                  Tâches ({p.tasks.length})
                </button>

                {!isMember ? (
                  <button
                    type="button"
                    onClick={() => handleJoin(p.id)}
                    style={{ minHeight: '38px', padding: '6px 16px', fontSize: '0.85rem' }}
                  >
                    Rejoindre
                  </button>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-brand)', fontWeight: 600, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                    ✓ Membre
                  </span>
                )}
              </div>

              {/* Tableau de tâches dépliable */}
              {isSelected && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Tâches du projet</h3>

                  <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Ajouter une tâche (ex: Formulaire de contact)…"
                      style={{ flex: 1, fontSize: '0.85rem', padding: '6px 10px' }}
                    />
                    <button type="submit" style={{ minHeight: '36px', padding: '6px 12px', fontSize: '0.85rem' }}>
                      Ajouter
                    </button>
                  </form>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {p.tasks.length === 0 ? (
                      <p className="hint" style={{ fontSize: '0.82rem' }}>Aucune tâche pour l'instant.</p>
                    ) : (
                      p.tasks.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: 'var(--color-bg)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                          }}
                        >
                          <span style={{ textDecoration: t.status === 'termine' ? 'line-through' : 'none', color: t.status === 'termine' ? 'var(--color-slate)' : 'var(--color-text)' }}>
                            {t.title}
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {t.status !== 'termine' ? (
                              <button
                                type="button"
                                className="link"
                                onClick={() => handleUpdateTask(t.id, 'termine')}
                                style={{ fontSize: '0.8rem', color: 'var(--color-brand)' }}
                              >
                                ✓ Valider
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-brand)' }}>Fait</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Nouveau Projet */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Présenter un projet</h2>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Titre du projet
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ex: KoraPay Mobile"
                  required
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </label>

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Description
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ce que fait le projet, le problème qu'il résout…"
                  rows={3}
                  required
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Ville
                  <input type="text" value={newCity} onChange={(e) => setNewCity(e.target.value)} style={{ width: '100%', marginTop: '4px' }} />
                </label>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Pays
                  <input type="text" value={newCountry} onChange={(e) => setNewCountry(e.target.value)} style={{ width: '100%', marginTop: '4px' }} />
                </label>
              </div>

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Rôles recherchés (ex: UI/UX, Backend Python)
                <input
                  type="text"
                  value={newRoles}
                  onChange={(e) => setNewRoles(e.target.value)}
                  placeholder="UI/UX · Backend Node"
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="secondary" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </button>
                <button type="submit">Publier</button>
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
