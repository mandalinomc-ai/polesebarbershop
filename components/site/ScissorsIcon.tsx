type ScissorsIconProps = {
  className?: string;
  variant?: "countdown" | "intro";
};

const PIVOT_X = 50;
const PIVOT_Y = 70;

/** Full barber scissors — silver/metal blades, both tips visible, no gold. */
export function ScissorsIcon({ className, variant = "countdown" }: ScissorsIconProps) {
  const rootClass = [
    "scissors-icon",
    variant === "intro" ? "scissors-icon--intro" : "scissors-icon--countdown",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const gradId = variant === "intro" ? "scissors-metal-intro" : "scissors-metal-countdown";
  const shineId = variant === "intro" ? "scissors-shine-intro" : "scissors-shine-countdown";
  const shadowId = variant === "intro" ? "scissors-shadow-intro" : "scissors-shadow-countdown";

  return (
    <svg
      className={rootClass}
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="20" y1="8" x2="80" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECECEC" />
          <stop offset="30%" stopColor="#B8B8B8" />
          <stop offset="65%" stopColor="#8A8A8A" />
          <stop offset="100%" stopColor="#3A3A3A" />
        </linearGradient>
        <linearGradient id={shineId} x1="50" y1="6" x2="50" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
          <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
        </linearGradient>
        <filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0B0B0B" floodOpacity="0.4" />
          <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="#FFFFFF" floodOpacity="0.2" />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <circle
          className="scissors-ring scissors-ring--left"
          cx="28"
          cy="94"
          r="9"
          stroke={`url(#${gradId})`}
          strokeWidth="2.4"
          fill="none"
        />
        <circle
          className="scissors-ring scissors-ring--right"
          cx="72"
          cy="94"
          r="9"
          stroke={`url(#${gradId})`}
          strokeWidth="2.4"
          fill="none"
        />

        <path
          className="scissors-blade scissors-blade--left"
          d="M28 86 L40 18 L44 20 L32 90 Z"
          fill={`url(#${gradId})`}
        />
        <path
          className="scissors-blade scissors-blade--right"
          d="M72 86 L60 18 L56 20 L68 90 Z"
          fill={`url(#${gradId})`}
        />

        <path
          className="scissors-blade-shine scissors-blade-shine--left"
          d="M30 82 L39 24 L41 25 L33 86 Z"
          fill={`url(#${shineId})`}
          opacity="0.85"
        />
        <path
          className="scissors-blade-shine scissors-blade-shine--right"
          d="M70 82 L61 24 L59 25 L67 86 Z"
          fill={`url(#${shineId})`}
          opacity="0.85"
        />

        <circle cx={PIVOT_X} cy={PIVOT_Y} r="3.2" fill={`url(#${gradId})`} />
        <circle cx={PIVOT_X} cy={PIVOT_Y} r="1.4" fill="#E8E8E8" opacity="0.9" />
      </g>
    </svg>
  );
}
