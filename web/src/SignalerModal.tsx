import { useState } from 'react';
import { sendReport } from './api.js';
import { Modal, Spinner, useToast } from './ui.js';

const REASONS = [
  { value: 'pas_clair', label: 'Pas clair', hint: 'Difficile à comprendre ou incomplet' },
  { value: 'doublon', label: 'Doublon', hint: 'Existe déjà ailleurs' },
  { value: 'inapproprie', label: 'Inapproprié', hint: 'Contenu déplacé ou dangereux' },
] as const;

export function SignalerModal({
  token,
  targetType,
  targetId,
  onClose,
}: {
  token: string;
  targetType: 'fiche' | 'projet' | 'utilisateur';
  targetId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('pas_clair');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await sendReport(token, { targetType, targetId, reason, details: details.trim() || undefined });
      toast('ok', result.message);
      onClose();
    } catch (err) {
      toast('error', (err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Signaler" subtitle="Un humain regarde chaque signalement." onClose={onClose}>
      <form className="col" style={{ gap: 14 }} onSubmit={submit}>
        <div className="col" style={{ gap: 8 }} role="radiogroup" aria-label="Motif">
          {REASONS.map((r) => (
            <label key={r.value} className="card tight row" style={{ cursor: 'pointer', borderColor: reason === r.value ? 'var(--accent)' : undefined }}>
              <input type="radio" name="reason" checked={reason === r.value} onChange={() => setReason(r.value)} />
              <span>
                <strong>{r.label}</strong>
                <span className="small muted" style={{ display: 'block' }}>{r.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="field">
          <span className="label">Précisions (facultatif)</span>
          <textarea className="textarea" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} />
        </label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner />} Envoyer</button>
        </div>
      </form>
    </Modal>
  );
}
