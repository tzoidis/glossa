// Navigation icons. Navigation never uses text (PRD §6).

const common = { width: 40, height: 40, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const HomeIcon = () => (
  <svg {...common} aria-hidden>
    <path d="M3 11 12 3l9 8" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </svg>
);

export const VillageIcon = () => (
  <svg {...common} aria-hidden>
    <path d="M2 20h20" />
    <path d="M4 20v-7l4-4 4 4v7" />
    <path d="M12 20v-5l4-4 4 4v5" />
  </svg>
);

export const NextIcon = () => (
  <svg {...common} aria-hidden>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...common} aria-hidden>
    <path d="m5 12 5 5 9-10" />
  </svg>
);

export const StarIcon = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path
      d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
      fill="var(--star)"
      stroke="var(--star-edge)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);
