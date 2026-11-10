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

export const LockIcon = () => (
  <svg {...common} width={28} height={28} aria-hidden>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const SpeakerIcon = () => (
  <svg {...common} aria-hidden>
    <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
    <path d="M16 9a4 4 0 0 1 0 6" />
    <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
);

/** erase the last letter: a key with a cross */
export const BackspaceIcon = () => (
  <svg {...common} aria-hidden>
    <path d="M21 5H9l-6 7 6 7h12z" />
    <path d="m12 9 6 6M18 9l-6 6" />
  </svg>
);

/** «show me again»: a circling arrow */
export const ReplayIcon = () => (
  <svg {...common} aria-hidden>
    <path d="M4 12a8 8 0 1 0 2.5-5.8" />
    <path d="M4 4v4h4" />
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
