/** Kora emblem (a calabash-harp seen from above) and wordmark. */
export function Logo({ size = 30, light = false }: { size?: number; light?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect width="36" height="36" rx="10" fill="#0F3D2A" />
        <path d="M18 7.5 28 15.2 25.8 28.5H10.2L8 15.2Z" fill="#12A150" stroke="#4DF08C" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M18 11v16M13.5 16.5v10M22.5 16.5v10" stroke="#4DF08C" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span style={{ fontWeight: 800, fontSize: size * 0.68, letterSpacing: '-0.03em', color: light ? '#fff' : 'var(--ink)' }}>
        Kora<span style={{ color: light ? 'var(--neon)' : 'var(--link)' }}>Devs</span>
      </span>
    </span>
  );
}
