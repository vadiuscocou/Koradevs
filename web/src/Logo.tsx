export function Logo({ size = 32, showSlogan = true }: { size?: number; showSlogan?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', cursor: 'pointer' }}>
      {/* Maison-Kora SVG Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* House / Kora Body silhouette */}
        <rect width="40" height="40" rx="10" fill="#0F6E56" />
        {/* Roof / House shape */}
        <path d="M20 7 L32 17 L30 33 L10 33 L8 17 Z" fill="#0A4F3E" stroke="#F2A93B" strokeWidth="1.8" strokeLinejoin="round" />
        {/* Kora Neck & Bridge */}
        <line x1="20" y1="4" x2="20" y2="33" stroke="#F2A93B" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="15" y="27" width="10" height="2.5" rx="1" fill="#F2A93B" />
        {/* Kora strings */}
        <line x1="16" y1="14" x2="16" y2="27" stroke="#E6F1EE" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
        <line x1="18" y1="10" x2="18" y2="27" stroke="#E6F1EE" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
        <line x1="22" y1="10" x2="22" y2="27" stroke="#E6F1EE" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
        <line x1="24" y1="14" x2="24" y2="27" stroke="#E6F1EE" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
      </svg>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: size > 32 ? '1.4rem' : '1.2rem', fontWeight: 800, color: 'var(--color-logo-text, #0F6E56)', letterSpacing: '-0.02em' }}>
            Kora<span style={{ color: '#F2A93B' }}>Devs</span>
          </span>
        </div>
        {showSlogan && (
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #5B7083)', fontWeight: 500, lineHeight: 1.1 }}>
            Coder l'Afrique, construire demain.
          </div>
        )}
      </div>
    </div>
  );
}

/** Fine bande géométrique inspirée des tissus ouest-africains (vert émeraude et or) */
export function AfricanPatternBanner({ height = 6 }: { height?: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        background: `repeating-linear-gradient(
          45deg,
          #0F6E56,
          #0F6E56 8px,
          #F2A93B 8px,
          #F2A93B 16px,
          #0A4F3E 16px,
          #0A4F3E 24px
        )`,
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px',
      }}
    />
  );
}
