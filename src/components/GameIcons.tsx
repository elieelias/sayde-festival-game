import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

export function HeatDropIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 96 112" role="img" aria-label="Heat hazard">
      <path d="M51 4c8 25 35 34 35 66 0 23-16 38-38 38S10 93 10 71c0-17 11-29 22-39 2 13 7 20 13 22-2-22 0-35 6-50Z" fill="#f6b92d" stroke="#4a1f12" strokeWidth="3" />
      <path d="M35 77c7 9 20 9 27 0" fill="none" stroke="#4a1f12" strokeLinecap="round" strokeWidth="5" />
      <circle cx="34" cy="68" r="4" fill="#4a1f12" />
      <circle cx="63" cy="68" r="4" fill="#4a1f12" />
    </svg>
  );
}

function Tile({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 96 96" role="img" aria-label={label}>
      <rect x="9" y="9" width="78" height="78" rx="8" fill="#fff4d9" stroke="#4a1f12" strokeWidth="4" />
      {children}
    </svg>
  );
}

export function ChillIcon({ className }: IconProps) {
  return (
    <Tile className={className} label="Chill power-up">
      <g stroke="#4a1f12" strokeLinecap="round" strokeWidth="5">
        <path d="M48 25v46M28 36l40 24M28 60l40-24" />
        <path d="m48 25-7 8m7-8 7 8M48 71l-7-8m7 8 7-8" />
      </g>
    </Tile>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <Tile className={className} label="Shield power-up">
      <path d="M48 24 69 33v17c0 14-8 23-21 29-13-6-21-15-21-29V33z" fill="#f6b92d" stroke="#4a1f12" strokeWidth="4" />
      <path d="m37 50 8 8 15-18" fill="none" stroke="#f04f78" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
    </Tile>
  );
}

export function SprinkleIcon({ className }: IconProps) {
  return (
    <Tile className={className} label="Double score power-up">
      <g strokeLinecap="round" strokeWidth="7">
        <path d="m27 35 9 5" stroke="#f04f78" />
        <path d="m55 28 3 10" stroke="#f6b92d" />
        <path d="m67 50 9-4" stroke="#4a1f12" />
        <path d="m29 64 10-3" stroke="#4a1f12" />
        <path d="m58 67 7 6" stroke="#f04f78" />
      </g>
      <text x="48" y="58" fill="#4a1f12" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="900" textAnchor="middle">2×</text>
    </Tile>
  );
}
