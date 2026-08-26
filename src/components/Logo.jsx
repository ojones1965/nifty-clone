// Simple inline logo: near-black rounded square with an ochre check mark
// (2b editorial theme).
export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1a1917" />
      <path
        d="M9 16.5l5 5 9-11"
        fill="none"
        stroke="oklch(0.78 0.13 80)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
