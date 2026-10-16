import { useEffect, useState } from 'react';
import { DoorClosed, DoorOpen, LogOut, MapPin, Pencil } from 'lucide-react';
import { KNOWN_TECH } from '@sos/shared';
import { getPassport, updateCommunityProfile, type Passport } from './api.js';
import type { Shared } from './App.js';
import { PasseportCard } from './Passeport.js';
import { Avatar, Badge, Skeletons, Spinner, Switch, ThemeButton, useToast } from './ui.js';

export function Moi({ shared, dark, toggleTheme, onLogout }: { shared: Shared; dark: boolean; toggleTheme: () => void; onLogout: () => void }) {
  const { token, user, profile, connected } = shared;
  const toast = useToast();
  const [passport, setPassport] = useState<Passport | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ city: '', country: '', bio: '' });
  const [busy, setBusy] = useState(false);
  const [allTech, setAllTech] = useState(false);

  useEffect(() => {
    getPassport(user.login).then(setPassport, () => undefined);
  }, [user.login, profile?.confirmedCount, profile?.tech.length, profile?.city, profile?.country]);

  useEffect(() => {
    if (profile) setForm({ city: profile.city, country: profile.country, bio: profile.bio });
  }, [profile]);

  if (!profile) return <Skeletons count={3} />;

  const doorOpen = profile.doorStatus === 'ouverte';
  const noTech = profile.tech.length === 0;

  const toggleTech = async (tech: string) => {
    const next = profile.tech.includes(tech) ? profile.tech.filter((t) => t !== tech) : [...profile.tech, tech];
    try {
      shared.setProfile(await updateCommunityProfile(token, { tech: next }));
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      shared.setProfile(await updateCommunityProfile(token, form));
      setEditing(false);
      toast('ok', 'Profil enregistré');
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const place = [profile.city, profile.country].filter(Boolean).join(', ');

  return (
    <div className="stack-lg">
      <section className="card col" style={{ gap: 18 }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
          <Avatar name={user.login} size={64} src={user.avatarUrl} />
          <div className="grow">
            <div className="row wrap" style={{ gap: 10 }}>
              <h1 style={{ fontSize: '1.6rem' }}>@{user.login}</h1>
              <Badge tone={connected ? 'mint' : ''}><span className={`dot ${connected ? 'live' : ''}`} /> {connected ? 'en ligne' : 'hors ligne'}</Badge>
            </div>
            <div className="row small muted" style={{ marginTop: 6, gap: 6 }}>
              <MapPin size={14} /> {place || 'Ajoute ta ville et ton pays'}
            </div>
            {profile.bio && <p style={{ marginTop: 10 }}>{profile.bio}</p>}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing((v) => !v)}>
            <Pencil size={14} /> {editing ? 'Fermer' : 'Modifier'}
          </button>
        </div>

        {editing && (
          <form className="col" style={{ gap: 14 }} onSubmit={save}>
            <div className="grid-2">
              <label className="field">
                <span className="label">Ville</span>
                <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={60} placeholder="Cotonou" />
              </label>
              <label className="field">
                <span className="label">Pays</span>
                <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} maxLength={60} placeholder="Bénin" />
              </label>
            </div>
            <label className="field">
              <span className="label">Quelques mots sur toi</span>
              <textarea className="textarea" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={280} />
            </label>
            <div>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner />} Enregistrer</button>
            </div>
          </form>
        )}
      </section>

      <section className="card col" style={{ gap: 16 }}>
        <div className="row">
          {doorOpen ? <DoorOpen size={26} color="var(--accent)" /> : <DoorClosed size={26} color="var(--faint)" />}
          <div className="grow">
            <h2 className="section-title">{doorOpen ? 'Ta porte est ouverte' : 'Ta porte est fermée'}</h2>
            <p className="muted small">Ouverte, tu reçois en direct les demandes de tes technos. Fermée, personne ne te sonne.</p>
          </div>
          <Switch checked={doorOpen} onChange={(v) => void shared.setDoor(v)} label="Porte ouverte" />
        </div>

        <div>
          <div className="block-label" style={{ flexWrap: 'wrap' }}>Mes technologies {noTech && <Badge tone="peach">À choisir pour ouvrir ta porte</Badge>}</div>
          <div className="tech-picker">
            {(allTech || noTech ? KNOWN_TECH : profile.tech).map((t) => (
              <button key={t} type="button" className={`chip ${profile.tech.includes(t) ? 'on' : ''}`} aria-pressed={profile.tech.includes(t)} onClick={() => void toggleTech(t)}>
                {t}
              </button>
            ))}
            {!noTech && (
              <button type="button" className="chip" onClick={() => setAllTech((v) => !v)}>
                {allTech ? 'Réduire' : '+ Ajouter une techno'}
              </button>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="section-head"><h2 className="section-title">Mon Passeport</h2></div>
        {passport ? <PasseportCard passport={passport} /> : <Skeletons count={2} />}
      </section>

      <section className="card row between wrap">
        <div className="row">
          <span className="muted">Thème</span>
          <ThemeButton dark={dark} toggle={toggleTheme} />
        </div>
        <button type="button" className="btn btn-danger" onClick={onLogout}>
          <LogOut size={16} /> Me déconnecter
        </button>
      </section>
    </div>
  );
}
