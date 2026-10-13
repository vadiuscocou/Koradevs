export function Logo({ size = 28, showSlogan = false }: { size?: number; showSlogan?: boolean }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      {/* Kora Silhouette with neon glow */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          flexShrink: 0,
          filter: 'drop-shadow(0 0 6px rgba(77, 240, 140, 0.45))',
        }}
      >
        {/* Kora calabash resonator */}
        <polygon
          points="18,18 27,24 25,32 11,32 9,24"
          fill="#14181A"
          stroke="#4DF08C"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Soundboard lines */}
        <line x1="14" y1="26" x2="22" y2="26" stroke="#4DF08C" strokeWidth="1" opacity="0.6" />
        <line x1="18" y1="21" x2="18" y2="31" stroke="#4DF08C" strokeWidth="1.2" />

        {/* Neck / Mast */}
        <line x1="18" y1="4" x2="18" y2="21" stroke="#4DF08C" strokeWidth="2.2" strokeLinecap="round" />

        {/* Diagonal Crossbar */}
        <line x1="18" y1="16" x2="28" y2="8" stroke="#4DF08C" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="28" cy="8" r="1.5" fill="#4DF08C" />

        {/* Kora strings */}
        <line x1="15" y1="9" x2="16" y2="24" stroke="#4DF08C" strokeWidth="0.8" opacity="0.8" />
        <line x1="21" y1="9" x2="20" y2="24" stroke="#4DF08C" strokeWidth="0.8" opacity="0.8" />
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: size > 30 ? '1.35rem' : '1.15rem',
            fontWeight: 700,
            color: '#4DF08C',
            letterSpacing: '-0.02em',
            textShadow: '0 0 12px rgba(77, 240, 140, 0.35)',
          }}
        >
          Kora<span style={{ color: '#E8EEEA' }}>Devs</span>
        </span>
        {showSlogan && (
          <span style={{ fontSize: '0.7rem', color: '#8A9892', fontWeight: 400, marginTop: '2px' }}>
            Code. Community. Kora.
          </span>
        )}
      </div>
    </div>
  );
}
