// The hedgehog guide (PRD §6). Moods: happy, thinking, encouraging, surprised.
// Never sad.

export type Mood = 'happy' | 'thinking' | 'encouraging' | 'surprised';

const SPIKES = Array.from({ length: 9 }, (_, i) => {
  const a = Math.PI * (0.95 + (i / 8) * 1.1);
  const r1 = 52;
  const r2 = 74;
  const x = (r: number, da = 0) => 100 + r * Math.cos(a + da);
  const y = (r: number, da = 0) => 104 + r * Math.sin(a + da);
  return `${x(r1, -0.17)},${y(r1, -0.17)} ${x(r2)},${y(r2)} ${x(r1, 0.17)},${y(r1, 0.17)}`;
});

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'happy':
      return <path d="M128 122 q12 12 24 0" stroke="var(--mascot-ink)" strokeWidth="4" fill="none" strokeLinecap="round" />;
    case 'encouraging':
      return <path d="M130 124 q10 7 20 0" stroke="var(--mascot-ink)" strokeWidth="4" fill="none" strokeLinecap="round" />;
    case 'thinking':
      return <path d="M131 125 h17" stroke="var(--mascot-ink)" strokeWidth="4" strokeLinecap="round" />;
    case 'surprised':
      return <ellipse cx="140" cy="125" rx="6" ry="8" fill="var(--mascot-ink)" />;
  }
}

export function Mascot({ mood = 'happy', size = 200 }: { mood?: Mood; size?: number }) {
  const eyeY = mood === 'thinking' ? 96 : 100;
  return (
    <svg className={`mascot mascot--${mood}`} width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <ellipse cx="100" cy="178" rx="70" ry="8" fill="var(--shadow)" />
      {SPIKES.map((points, i) => (
        <polygon key={i} points={points} fill="var(--mascot-spikes)" />
      ))}
      <ellipse cx="96" cy="112" rx="60" ry="54" fill="var(--mascot-spikes)" />
      <path d="M100 66 C150 66 176 96 172 124 C168 150 140 164 112 160 C96 158 88 140 92 118 C96 96 92 78 100 66 Z" fill="var(--mascot-face)" />
      <circle cx="172" cy="122" r="7" fill="var(--mascot-ink)" />
      <circle cx="132" cy={eyeY} r={mood === 'surprised' ? 7 : 6} fill="var(--mascot-ink)" />
      <circle cx="134" cy={eyeY - 2} r="2" fill="#fff" />
      {mood === 'thinking' && <path d="M122 84 q10 -6 20 -2" stroke="var(--mascot-ink)" strokeWidth="3" fill="none" strokeLinecap="round" />}
      <circle cx="118" cy="128" r="8" fill="var(--mascot-cheek)" />
      <Mouth mood={mood} />
      <ellipse cx="78" cy="166" rx="14" ry="8" fill="var(--mascot-face)" />
      <ellipse cx="124" cy="166" rx="14" ry="8" fill="var(--mascot-face)" />
    </svg>
  );
}
