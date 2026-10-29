/**
 * The KoraDevs logo, as originally drawn: the kora emblem and the wordmark.
 * `light` (alias `isDarkContext`) is for dark backgrounds, such as the green panels.
 */
export function Logo({
  size = 28,
  showSlogan = false,
  isDarkContext = false,
  light = false,
}: {
  size?: number;
  showSlogan?: boolean;
  isDarkContext?: boolean;
  light?: boolean;
}) {
  const onDark = isDarkContext || light;
  const koraColor = onDark ? '#FFFFFF' : 'var(--ink, #0E1A14)';
  const devsColor = onDark ? '#4DF08C' : '#12A150';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      {/* Kora Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{
          flexShrink: 0,
          filter: onDark ? 'drop-shadow(0 0 6px rgba(77, 240, 140, 0.5))' : 'none',
        }}
      >
        <polygon
          points="18,18 27,24 25,32 11,32 9,24"
          fill={onDark ? '#14181A' : '#E6F4ED'}
          stroke={onDark ? '#4DF08C' : '#0F3D2A'}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <line x1="14" y1="26" x2="22" y2="26" stroke={onDark ? '#4DF08C' : '#12A150'} strokeWidth="1" opacity="0.7" />
        <line x1="18" y1="21" x2="18" y2="31" stroke={onDark ? '#4DF08C' : '#12A150'} strokeWidth="1.4" />
        <line x1="18" y1="4" x2="18" y2="21" stroke={onDark ? '#4DF08C' : '#0F3D2A'} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="18" y1="16" x2="28" y2="8" stroke={onDark ? '#4DF08C' : '#12A150'} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="28" cy="8" r="1.6" fill={onDark ? '#4DF08C' : '#12A150'} />
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: size > 30 ? '1.4rem' : '1.2rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          <span style={{ color: koraColor }}>Kora</span>
          <span style={{ color: devsColor }}>Devs</span>
        </span>
        {showSlogan && (
          <span style={{ fontSize: '0.72rem', color: onDark ? '#8A9892' : '#5E7568', fontWeight: 500, marginTop: '2px' }}>
            Coder l'Afrique, construire demain.
          </span>
        )}
      </div>
    </div>
  );
}
