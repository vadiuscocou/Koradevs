import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, BadgeCheck, Copy, Fingerprint, MapPin, Printer, Share2, ShieldCheck, ShieldX } from 'lucide-react';
import { getPassport, type Passport } from './api.js';
import { Logo } from './Logo.js';
import { verifyPassport } from './verify.js';
import { Badge, Empty, Spinner, ThemeButton, copyText, shareWhatsApp, timeAgo, useToast } from './ui.js';

export const passportUrl = (login: string) => `${location.origin}${location.pathname}#/passeport/${encodeURIComponent(login)}`;

/** The passport card: the same component is used in « Moi » and on the public page. */
export function PasseportCard({ passport }: { passport: Passport }) {
  const toast = useToast();
  const green = passport.proofs.filter((p) => p.testPassed).length;
  const place = [passport.city, passport.country].filter(Boolean).join(', ');
  const [qr, setQr] = useState('');
  const [verdict, setVerdict] = useState<'idle' | 'ok' | 'ko'>('idle');

  useEffect(() => {
    setVerdict('idle');
    QRCode.toString(passportUrl(passport.login), { type: 'svg', margin: 1, width: 132, color: { dark: '#0b1712', light: '#ffffff' } }).then(setQr, () => setQr(''));
  }, [passport.login, passport.hash]);

  return (
    <div className="col" style={{ gap: 18 }}>
      <section className="passport">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="kicker">Passeport de compétences</div>
            <h2 style={{ marginTop: 6 }}>@{passport.login}</h2>
            {place && (
              <div className="row small" style={{ marginTop: 6, color: 'rgba(255,255,255,.75)', gap: 6 }}>
                <MapPin size={14} /> {place}
              </div>
            )}
          </div>
          <span className="seal" aria-hidden="true"><BadgeCheck size={30} color="#4DF08C" /></span>
        </div>

        <div className="stat-row">
          <div className="stat"><b>{passport.confirmedCount}</b><span>aide{passport.confirmedCount > 1 ? 's' : ''} publiée{passport.confirmedCount > 1 ? 's' : ''}</span></div>
          <div className="stat"><b>{green}</b><span>confirmée{green > 1 ? 's' : ''} par test</span></div>
          <div className="stat"><b>{passport.tech.length}</b><span>techno{passport.tech.length > 1 ? 's' : ''}</span></div>
        </div>

        <div className="row wrap" style={{ gap: 6, marginBottom: 18 }}>
          {passport.tech.length > 0 ? passport.tech.map((t) => <Badge key={t}>{t}</Badge>) : <span className="small" style={{ color: 'rgba(255,255,255,.6)' }}>Aucune techno renseignée</span>}
        </div>

        <div className="row small" style={{ gap: 6, marginBottom: 6, color: 'rgba(255,255,255,.7)' }}>
          <Fingerprint size={15} /> Empreinte SHA-256 du contenu
        </div>
        <code className="hash">{passport.hash}</code>

        <div className="verify">
          {qr && <div className="qr" role="img" aria-label="QR code vers ce Passeport" dangerouslySetInnerHTML={{ __html: qr }} />}
          <div className="grow">
            <strong>Vérifie-le toi-même</strong>
            <div className="small" style={{ color: 'rgba(255,255,255,.72)', margin: '4px 0 10px' }}>
              Scanne le code, ou recalcule l’empreinte dans ton navigateur : personne n’a besoin de croire le serveur sur parole.
            </div>
            <button type="button" className="btn btn-neon btn-sm no-print" onClick={async () => setVerdict((await verifyPassport(passport as never)) ? 'ok' : 'ko')}>
              <Fingerprint size={14} /> Vérifier l’empreinte
            </button>
            {verdict === 'ok' && <div className="verdict ok"><ShieldCheck size={16} /> Empreinte recalculée : le Passeport est authentique.</div>}
            {verdict === 'ko' && <div className="verdict ko"><ShieldX size={16} /> L’empreinte ne correspond pas : ce Passeport a été modifié.</div>}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-head"><h2 className="section-title">Preuves</h2><Badge>{passport.proofs.length}</Badge></div>
        {passport.proofs.length === 0 ? (
          <Empty art="proof" title="Pas encore de preuve">Chaque aide publiée avec l’accord des deux personnes s’ajoute ici.</Empty>
        ) : (
          passport.proofs.map((p) => (
            <div key={p.id} className="proof">
              <BadgeCheck size={20} color={p.testPassed ? 'var(--accent)' : 'var(--faint)'} />
              <div className="grow">
                <strong>{p.title}</strong>
                <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                  {p.testPassed ? <Badge tone="mint">Test confirmé</Badge> : <Badge>Sans test</Badge>}
                  {p.tech.slice(0, 3).map((t) => <Badge key={t} tone="sky">{t}</Badge>)}
                  <span className="small faint">{timeAgo(p.at)}</span>
                </div>
              </div>
              <a className="btn btn-text small" href={`#/fiches`}>Voir</a>
            </div>
          ))
        )}
      </section>

      <div className="row wrap no-print">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => shareWhatsApp(`Mon Passeport KoraDevs : ${passport.confirmedCount} aide${passport.confirmedCount > 1 ? 's' : ''} publiée${passport.confirmedCount > 1 ? 's' : ''}, ${green} confirmée${green > 1 ? 's' : ''} par test.\n${passportUrl(passport.login)}`)}
        >
          <Share2 size={16} /> Partager sur WhatsApp
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            const ok = await copyText(passportUrl(passport.login));
            toast(ok ? 'ok' : 'error', ok ? 'Lien copié' : 'Copie impossible');
          }}
        >
          <Copy size={16} /> Copier le lien
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
          <Printer size={16} /> Exporter en PDF
        </button>
      </div>
    </div>
  );
}

/** Public page `#/passeport/<login>`: no account needed to check someone's proofs. */
export function PasseportPublic({ login, dark, toggleTheme, signedIn }: { login: string; dark: boolean; toggleTheme: () => void; signedIn: boolean }) {
  const [passport, setPassport] = useState<Passport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setPassport(null);
    setError('');
    getPassport(login).then(setPassport, (e: Error) => setError(e.message));
  }, [login]);

  return (
    <div>
      <header className="no-print row between" style={{ padding: '14px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <Logo size={28} />
        <div className="row">
          <ThemeButton dark={dark} toggle={toggleTheme} />
        </div>
      </header>
      <main className="page" style={{ maxWidth: 720 }}>
        <div className="no-print" style={{ marginBottom: 16 }}>
          <a className="btn btn-text small" href="#/accueil"><ArrowLeft size={15} /> {signedIn ? 'Retour à l’accueil' : 'Rejoindre KoraDevs'}</a>
        </div>
        {error ? (
          <Empty art="lost" title="Passeport introuvable">{error}</Empty>
        ) : !passport ? (
          <div className="row" style={{ justifyContent: 'center', padding: 60, color: 'var(--mute)' }}><Spinner /> Chargement…</div>
        ) : (
          <PasseportCard passport={passport} />
        )}
      </main>
    </div>
  );
}
