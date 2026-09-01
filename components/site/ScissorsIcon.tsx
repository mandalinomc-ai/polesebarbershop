type ScissorsIconProps = {
  className?: string;
  variant?: "countdown" | "intro";
};

/** Animated barber scissors — blades open/close via CSS keyed off variant class. */
export function ScissorsIcon({ className, variant = "countdown" }: ScissorsIconProps) {
  const rootClass = [
    "scissors-icon",
    variant === "intro" ? "scissors-icon--intro" : "scissors-icon--countdown",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={rootClass}
      viewBox="-2 -2 68 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        className="scissors-ring scissors-ring--left"
        cx="16"
        cy="48"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        className="scissors-ring scissors-ring--right"
        cx="48"
        cy="48"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        className="scissors-blade scissors-blade--left"
        d="M16 40 L32 8 L36 12 L20 44 Z"
        fill="currentColor"
      />
      <path
        className="scissors-blade scissors-blade--right"
        d="M48 40 L32 8 L28 12 L44 44 Z"
        fill="currentColor"
      />
    </svg>
  );
}
