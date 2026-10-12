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
      setTimeout(onClose, 2000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Signaler {targetType === 'fiche' ? 'une fiche' : targetType === 'projet' ? 'un projet' : 'un utilisateur'}</h2>
        <p className="hint">Élément : <b>{targetTitle}</b></p>

        {sent ? (
          <div className="card success" style={{ textAlign: 'center' }}>
            <p>✅ Merci ! Votre signalement a été transmis à la modération.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              Motif du signalement :
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as 'pas_clair' | 'doublon' | 'inapproprie')}
                style={{ width: '100%', marginTop: '6px', padding: '8px', background: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
              >
                <option value="pas_clair">Pas clair / Erreur non résolue</option>
                <option value="doublon">Doublon d'une fiche ou d'un projet existant</option>
                <option value="inapproprie">Contenu inapproprié ou toxique</option>
              </select>
            </label>

            <label>
              Précisions (facultatif) :
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Expliquez brièvement le problème..."
                rows={3}
                style={{ width: '100%', marginTop: '6px', padding: '8px', background: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
              />
            </label>

            {error && <p className="error">{error}</p>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="link" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" style={{ background: '#da3633' }}>
                Confirmer le signalement
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
