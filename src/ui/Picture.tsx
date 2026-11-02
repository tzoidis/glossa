// Word pictures: the OpenMoji SVGs bundled by scripts/build-openmoji-subset.ts
// (src/assets/openmoji/<code>.svg), so they look the same on every device. A code
// without a bundled picture falls back to the device's emoji font.

const files = import.meta.glob('../assets/openmoji/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const BY_CODE = new Map(Object.entries(files).map(([path, url]) => [path.replace(/^.*\/|\.svg$/g, ''), url]));

export function pictureUrl(code: string): string | undefined {
  return BY_CODE.get(code);
}

const TEXT_DEFAULT_BELOW = 0x1f000; // older symbols need VS16 to render as emoji

export function emojiFromCode(code: string): string {
  const points = code.split('-').map((h) => parseInt(h, 16));
  const text = String.fromCodePoint(...points);
  return points.length === 1 && points[0]! < TEXT_DEFAULT_BELOW ? `${text}️` : text;
}

export function Picture({ imageId, size = 120, className }: { imageId: string; size?: number; className?: string }) {
  const url = pictureUrl(imageId);
  return (
    <span className={`picture ${className ?? ''}`} style={{ fontSize: size * 0.8, width: size, height: size }} aria-hidden>
      {url ? <img src={url} alt="" width={size} height={size} draggable={false} /> : emojiFromCode(imageId)}
    </span>
  );
}
