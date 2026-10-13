import { useState } from 'react';
import { sendReport } from './api.js';

interface SignalerModalProps {
  token: string;
  targetType: 'fiche' | 'projet' | 'utilisateur';
  targetId: string;
  targetTitle: string;
  onClose: () => void;
}

export function SignalerModal({ token, targetType, targetId, targetTitle, onClose }: SignalerModalProps) {
  const [reason, setReason] = useState<'pas_clair' | 'doublon' | 'inapproprie'>('pas_clair');
  const [details, setDetails] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendReport(token, {
        targetType,
        targetId,
        reason,
        details,
      });
      setSent(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>
          Signaler {targetType === 'fiche' ? 'une fiche' : targetType === 'projet' ? 'un projet' : 'un utilisateur'}
        </h2>
        <p className="text-mute" style={{ fontSize: '0.85rem', margin: '0 0 16px 0' }}>
          Élément : <span style={{ color: 'var(--ink)' }}>{targetTitle}</span>
        </p>

        {sent ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--accent)' }}>
            ✓ Signalement transmis à l'équipe.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>
              Motif du signalement
              <select
                className="input-field"
                value={reason}
                onChange={(e) => setReason(e.target.value as 'pas_clair' | 'doublon' | 'inapproprie')}
                style={{ marginTop: '4px' }}
              >
                <option value="pas_clair">Pas clair / Erreur non résolue</option>
                <option value="doublon">Doublon d'une fiche ou d'un projet existant</option>
                <option value="inapproprie">Contenu inapproprié</option>
              </select>
            </label>

            <label style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>
              Précisions (facultatif)
              <textarea
                className="textarea-field"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explique brièvement le problème…"
                rows={3}
                style={{ marginTop: '4px' }}
              />
            </label>

            {error && <p className="text-danger" style={{ margin: 0, fontSize: '0.85rem' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" className="link-text" onClick={onClose} style={{ color: 'var(--mute)' }}>
                Annuler
              </button>
              <button type="submit" className="link-text" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                Signaler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
