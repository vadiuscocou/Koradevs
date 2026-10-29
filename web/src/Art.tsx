export type ArtKind = 'door' | 'doorOpen' | 'book' | 'project' | 'radar' | 'people' | 'proof' | 'lost';

/**
 * Small illustrations for empty screens. Flat shapes in the brand colours (they follow the light and dark themes),
 * a soft glow behind, and one gentle movement. No image files.
 */
export function Art({ kind }: { kind: ArtKind }) {
  return (
    <svg className={`art art-${kind}`} width="168" height="124" viewBox="0 0 168 124" fill="none" aria-hidden="true">
      <ellipse className="glow" cx="84" cy="64" rx="70" ry="48" />
      <ellipse className="ground" cx="84" cy="112" rx="52" ry="5" />
      {kind === 'door' && (
        <g className="float">
          <rect className="frame" x="54" y="14" width="60" height="94" rx="6" />
          <path className="panel" d="M62 26a22 22 0 0 1 44 0v74H62Z" />
          <circle className="knob" cx="98" cy="64" r="3.5" />
          <path className="line" d="M72 40h24M72 52h24" />
          <path className="leaf" d="M128 108c0-14 6-22 14-26 0 12-4 22-14 26Z" />
          <path className="leaf" d="M128 108c-2-12-9-18-17-20 1 11 7 18 17 20Z" />
        </g>
      )}
      {kind === 'doorOpen' && (
        <g className="float">
          <rect className="frame" x="50" y="14" width="68" height="94" rx="6" />
          <path className="light" d="M58 22h52v80H58Z" />
          <path className="panel" d="M58 22 82 30v64l-24 8Z" />
          <circle className="knob" cx="76" cy="62" r="3" />
          <path className="spill" d="M110 102 140 112H96Z" />
          <circle className="spark" cx="132" cy="34" r="3" />
          <circle className="spark s2" cx="144" cy="52" r="2" />
        </g>
      )}
      {kind === 'book' && (
        <g className="float">
          <rect className="card back" x="44" y="30" width="62" height="74" rx="8" transform="rotate(-8 75 67)" />
          <rect className="card mid" x="56" y="24" width="62" height="74" rx="8" transform="rotate(4 87 61)" />
          <rect className="card front" x="64" y="18" width="62" height="78" rx="8" />
          <path className="line" d="M76 36h38M76 48h38M76 60h24" />
          <path className="mark" d="M112 18v24l7-6 7 6V18Z" />
          <circle className="spark" cx="140" cy="30" r="3" />
          <circle className="spark s2" cx="36" cy="40" r="2.5" />
        </g>
      )}
      {kind === 'project' && (
        <g className="float">
          <rect className="frame" x="26" y="20" width="116" height="84" rx="10" />
          <rect className="col" x="34" y="30" width="32" height="66" rx="5" />
          <rect className="col" x="68" y="30" width="32" height="66" rx="5" />
          <rect className="col" x="102" y="30" width="32" height="66" rx="5" />
          <rect className="card front" x="38" y="36" width="24" height="12" rx="3" />
          <rect className="card front" x="38" y="52" width="24" height="12" rx="3" />
          <rect className="card mid" x="72" y="36" width="24" height="12" rx="3" />
          <rect className="card ok" x="106" y="36" width="24" height="12" rx="3" />
          <path className="tick" d="m112 42 3 3 6-6" />
        </g>
      )}
      {kind === 'radar' && (
        <g>
          <circle className="ring r1" cx="84" cy="62" r="18" />
          <circle className="ring r2" cx="84" cy="62" r="34" />
          <circle className="ring r3" cx="84" cy="62" r="50" />
          <path className="sweep" d="M84 62 134 62A50 50 0 0 0 119 27Z" />
          <circle className="dot" cx="84" cy="62" r="6" />
          <circle className="ping" cx="116" cy="42" r="4" />
        </g>
      )}
      {kind === 'people' && (
        <g className="float">
          <circle className="avatar a1" cx="50" cy="52" r="20" />
          <circle className="avatar a2" cx="118" cy="52" r="20" />
          <circle className="head" cx="50" cy="46" r="7" />
          <path className="body" d="M36 68a14 14 0 0 1 28 0Z" />
          <circle className="head" cx="118" cy="46" r="7" />
          <path className="body" d="M104 68a14 14 0 0 1 28 0Z" />
          <path className="link" d="M72 52h24" />
          <circle className="spark" cx="84" cy="52" r="3.5" />
        </g>
      )}
      {kind === 'proof' && (
        <g className="float">
          <path className="shield" d="M84 14 124 28v32c0 24-16 40-40 50-24-10-40-26-40-50V28Z" />
          <path className="tick" d="m66 62 14 14 26-28" />
          <circle className="spark" cx="140" cy="34" r="3" />
          <circle className="spark s2" cx="28" cy="48" r="2.5" />
        </g>
      )}
      {kind === 'lost' && (
        <g className="float">
          <circle className="avatar a1" cx="84" cy="56" r="34" />
          <path className="line" d="m70 44 28 28M98 44 70 72" />
          <path className="leaf" d="M30 108c0-12 5-19 12-22 0 10-3 18-12 22Z" />
        </g>
      )}
    </svg>
  );
}
