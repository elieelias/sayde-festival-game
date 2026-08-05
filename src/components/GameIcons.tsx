import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

export function HeatDropIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 96 112" role="img" aria-label="Heat hazard">
      <path d="M51 4c8 25 35 34 35 66 0 23-16 38-38 38S10 93 10 71c0-17 11-29 22-39 2 13 7 20 13 22-2-22 0-35 6-50Z" fill="#f26a21" stroke="#4a1f12" strokeWidth="3" />
      <path d="M49 43c5 14 17 20 17 34 0 11-8 19-18 19s-18-8-18-19c0-8 4-14 10-20 1 7 4 10 7 12-1-11 0-19 2-26Z" fill="#f6b92d" stroke="#4a1f12" strokeWidth="3" />
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
    <Tile className={className} label="Slowdown power-up">
      <path d="M22 67c5-6 12-8 21-6l15 3c3-9 8-14 15-13 8 1 12 9 8 15-4 7-14 9-28 8H24c-5 0-6-4-2-7Z" fill="#fff4d9" stroke="#4a1f12" strokeLinejoin="round" strokeWidth="4" />
      <circle cx="42" cy="50" r="17" fill="#f6b92d" stroke="#4a1f12" strokeWidth="4" />
      <path d="M48 50c0-5-4-9-9-9s-9 4-9 9 4 9 9 9c4 0 7-3 7-6 0-3-2-5-5-5" fill="none" stroke="#4a1f12" strokeLinecap="round" strokeWidth="3" />
      <path d="m69 53 3-10m4 10 7-8" fill="none" stroke="#4a1f12" strokeLinecap="round" strokeWidth="3" />
      <circle cx="72" cy="42" r="2.5" fill="#4a1f12" />
      <circle cx="84" cy="44" r="2.5" fill="#4a1f12" />
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
