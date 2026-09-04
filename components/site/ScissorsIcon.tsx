type ScissorsIconProps = {
  className?: string;
  variant?: "countdown" | "intro";
};

const PIVOT_X = 50;
const PIVOT_Y = 72;

/** Full barber scissors — chrome/silver 3D metal, both tips visible, no gold. */
export function ScissorsIcon({ className, variant = "countdown" }: ScissorsIconProps) {
  const rootClass = [
    "scissors-icon",
    variant === "intro" ? "scissors-icon--intro" : "scissors-icon--countdown",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const metal = variant === "intro" ? "sc-metal-intro" : "sc-metal-cd";
  const shine = variant === "intro" ? "sc-shine-intro" : "sc-shine-cd";
  const edge = variant === "intro" ? "sc-edge-intro" : "sc-edge-cd";
  const shadow = variant === "intro" ? "sc-shadow-intro" : "sc-shadow-cd";

  return (
    <svg
      className={rootClass}
      viewBox="0 0 100 118"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={metal} x1="18" y1="4" x2="82" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F7F7F7" />
          <stop offset="18%" stopColor="#D8D8D8" />
          <stop offset="42%" stopColor="#9E9E9E" />
          <stop offset="68%" stopColor="#6E6E6E" />
          <stop offset="100%" stopColor="#2C2C2C" />
        </linearGradient>
        <linearGradient id={shine} x1="50" y1="2" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={edge} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1A1A1A" stopOpacity="0.45" />
        </linearGradient>
        <filter id={shadow} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#050505" floodOpacity="0.55" />
          <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodColor="#FFFFFF" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter={`url(#${shadow})`} className="scissors-float-group">
        {/* Finger rings */}
        <circle
          className="scissors-ring scissors-ring--left"
          cx="27"
          cy="102"
          r="10"
          stroke={`url(#${metal})`}
          strokeWidth="2.6"
          fill="rgba(20,20,20,0.35)"
        />
        <circle
          className="scissors-ring scissors-ring--right"
          cx="73"
          cy="102"
          r="10"
          stroke={`url(#${metal})`}
          strokeWidth="2.6"
          fill="rgba(20,20,20,0.35)"
        />
        <circle cx="27" cy="102" r="6.2" stroke={`url(#${shine})`} strokeWidth="1.1" fill="none" opacity="0.7" />
        <circle cx="73" cy="102" r="6.2" stroke={`url(#${shine})`} strokeWidth="1.1" fill="none" opacity="0.7" />

        {/* Blades — tips fully in viewBox */}
        <path
          className="scissors-blade scissors-blade--left"
          d="M28 92 L42 10 L46.5 13.5 L34 98 Z"
          fill={`url(#${metal})`}
          stroke={`url(#${edge})`}
          strokeWidth="0.4"
        />
        <path
          className="scissors-blade scissors-blade--right"
          d="M72 92 L58 10 L53.5 13.5 L66 98 Z"
          fill={`url(#${metal})`}
          stroke={`url(#${edge})`}
          strokeWidth="0.4"
        />

        {/* Specular chrome strips */}
        <path
          className="scissors-blade-shine scissors-blade-shine--left"
          d="M30.5 88 L42.5 16 L44.2 17.2 L33.2 92 Z"
          fill={`url(#${shine})`}
          opacity="0.92"
        />
        <path
          className="scissors-blade-shine scissors-blade-shine--right"
          d="M69.5 88 L57.5 16 L55.8 17.2 L66.8 92 Z"
          fill={`url(#${shine})`}
          opacity="0.92"
        />

        {/* Tip highlights */}
        <path d="M42 10 L44.2 11.2 L43.1 14 Z" fill="#F4F4F4" opacity="0.9" />
        <path d="M58 10 L55.8 11.2 L56.9 14 Z" fill="#F4F4F4" opacity="0.9" />

        {/* Pivot screw */}
        <circle cx={PIVOT_X} cy={PIVOT_Y} r="4.1" fill={`url(#${metal})`} stroke="#EDEDED" strokeWidth="0.5" />
        <circle cx={PIVOT_X} cy={PIVOT_Y} r="1.7" fill="#F2F2F2" opacity="0.95" />
        <circle cx={PIVOT_X} cy={PIVOT_Y} r="0.7" fill="#3A3A3A" opacity="0.55" />
      </g>
    </svg>
  );
}
