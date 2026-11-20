// Αγκαθούλης in what the child bought him with stars (src/village/shop.ts). Used on the
// big screens; the small round-bar button and the loading screen show him plain.

import { useApp } from '../app/AppContext.tsx';
import { Mascot, type Mood } from '../ui/Mascot.tsx';
import { Picture } from '../ui/Picture.tsx';
import { square } from '../ui/rem.ts';
import { shopItem } from './shop.ts';

/** how big each kind of outfit is, against the mascot */
const SCALE = { head: 0.42, face: 0.3, neck: 0.36 } as const;

export function Dressed({ wearing, mood, size }: { wearing: readonly string[]; mood: Mood; size: number }) {
  return (
    <span className="dressed" style={square(size)}>
      <Mascot mood={mood} size={size} />
      {wearing.map((id) => {
        const slot = shopItem(id)?.slot;
        if (!slot) return null;
        return (
          <span key={id} className={`outfit outfit--${slot}`}>
            <Picture imageId={id} size={size * SCALE[slot]} />
          </span>
        );
      })}
    </span>
  );
}

export function DressedMascot({ mood = 'happy', size = 200 }: { mood?: Mood; size?: number }) {
  const { child } = useApp();
  return <Dressed wearing={child.wearing ?? []} mood={mood} size={size} />;
}
