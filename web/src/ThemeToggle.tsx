export function ThemeToggle({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <button
        type="button"
        className={`theme-switch ${isDark ? 'dark' : ''}`}
        onClick={onToggle}
        title={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
        aria-label="Basculer clair / sombre"
      >
        <div className="theme-switch-slider">
          {isDark ? '🌙' : '☀️'}
        </div>
      </button>
    </div>
  );
}
