import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { disablePush, enablePush, pushActive, pushSupported } from './push.js';
import { Spinner, Switch, useToast } from './ui.js';

/** « Prévenez-moi quand un aidant arrive » : Web Push, même quand le site est fermé. */
export function NotifyButton({ token }: { token: string }) {
  const toast = useToast();
  const [active, setActive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void pushActive().then(setActive);
  }, []);

  if (!pushSupported() || active === null || active) return null;
  if (Notification.permission === 'denied') return null;

  return (
    <button
      type="button"
      className="btn btn-soft btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await enablePush(token);
        setBusy(false);
        if (result === 'ok') {
          setActive(true);
          toast('ok', 'Notifications activées', 'Tu seras prévenu quand un aidant arrive, même site fermé.');
        } else if (result === 'refuse') {
          toast('error', 'Notifications refusées', 'Tu peux les autoriser dans les réglages du navigateur.');
        } else {
          toast('error', 'Notifications indisponibles', 'Ce navigateur ou cette adresse ne les permet pas.');
        }
      }}
    >
      {busy ? <Spinner size={14} /> : <Bell size={14} />} Me prévenir quand un aidant arrive
    </button>
  );
}

/** The same thing as a setting, for the profile page. */
export function NotifySetting({ token }: { token: string }) {
  const toast = useToast();
  const [active, setActive] = useState(false);
  const supported = pushSupported();

  useEffect(() => {
    void pushActive().then(setActive);
  }, []);

  const change = async (value: boolean) => {
    if (value) {
      const result = await enablePush(token);
      setActive(result === 'ok');
      if (result !== 'ok') toast('error', result === 'refuse' ? 'Notifications refusées' : 'Notifications indisponibles');
    } else {
      await disablePush(token);
      setActive(false);
    }
  };

  return (
    <div className="row">
      {active ? <Bell size={24} color="var(--accent)" /> : <BellOff size={24} color="var(--faint)" />}
      <div className="grow">
        <h2 className="section-title">Notifications</h2>
        <p className="muted small">
          {supported ? 'Reçois une alerte sur ton téléphone ou ton ordinateur quand un aidant prend ta demande, même si le site est fermé.' : 'Ce navigateur ne permet pas les notifications.'}
        </p>
      </div>
      {supported && <Switch checked={active} onChange={(v) => void change(v)} label="Notifications" />}
    </div>
  );
}
