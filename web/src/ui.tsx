import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, Loader2, Moon, Sun, TriangleAlert, X } from 'lucide-react';

// --- Notifications ----------------------------------------------------------

type ToastKind = 'ok' | 'error';
interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  text?: string;
}

const ToastContext = createContext<(kind: ToastKind, title: string, text?: string) => void>(() => undefined);

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const push = useCallback((kind: ToastKind, title: string, text?: string) => {
    const id = next.current++;
    setItems((list) => [...list.slice(-3), { id, kind, title, text }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 5200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'ok' ? <CircleCheck size={18} /> : <TriangleAlert size={18} />}
            <div className="grow">
              <strong>{t.title}</strong>
              {t.text && <div className="small" style={{ opacity: 0.8 }}>{t.text}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// --- Petits composants ------------------------------------------------------

const VARIANTS = ['', 'v1', 'v2', 'v3'];

export function Avatar({ name, size = 40, src }: { name: string; size?: number; src?: string | null }) {
  const variant = VARIANTS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % VARIANTS.length];
  const style = { '--size': `${size}px` } as React.CSSProperties;
  if (src) return <img className="avatar" style={style} src={src} alt="" />;
  return (
    <span className={`avatar ${variant}`} style={style} aria-hidden="true">
      {(name || '?').charAt(0)}
    </span>
  );
}

export function Badge({ tone = '', children }: { tone?: 'mint' | 'sky' | 'peach' | 'rose' | 'violet' | ''; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 className="spinner" size={size} aria-hidden="true" />;
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <strong>{title}</strong>
      {children && <span className="small">{children}</span>}
    </div>
  );
}

export function Skeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="col" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div style={{ marginTop: 18 }}>{children}</div>
      </div>
    </div>
  );
}

/** Splits a free-text list (« React, Node »), trimmed, without duplicates. */
export const splitList = (text: string): string[] => [...new Set(text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean))];

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'à l’instant';
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)} h`;
  return `il y a ${Math.floor(seconds / 86400)} j`;
}

export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function shareWhatsApp(text: string): void {
  if (navigator.share) {
    navigator.share({ text }).catch(() => undefined);
  } else {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }
}

export function ThemeButton({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button type="button" className="btn btn-icon" onClick={toggle} aria-label={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
