// Word pictures. Until the OpenMoji subset is bundled (build-openmoji-subset),
// this renders the same code point with the device's emoji font.

const TEXT_DEFAULT_BELOW = 0x1f000; // older symbols need VS16 to render as emoji

export function emojiFromCode(code: string): string {
  const points = code.split('-').map((h) => parseInt(h, 16));
  const text = String.fromCodePoint(...points);
  return points.length === 1 && points[0]! < TEXT_DEFAULT_BELOW ? `${text}️` : text;
}

export function Picture({ imageId, size = 120, className }: { imageId: string; size?: number; className?: string }) {
  return (
    <span className={`picture ${className ?? ''}`} style={{ fontSize: size * 0.8, width: size, height: size }} aria-hidden>
      {emojiFromCode(imageId)}
    </span>
  );
}
