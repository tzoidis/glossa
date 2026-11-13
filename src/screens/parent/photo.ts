// A parent's photo for «Δικές μου λέξεις» (PRD §7): cropped to a square and
// re-encoded through a canvas at most 512px wide, so EXIF data and the location
// are not kept. Stored as a data URL so the backup file carries it as text.

const MAX_SIDE = 512;
const QUALITY = 0.85;

export async function photoDataUrl(file: Blob): Promise<string> {
  const image = await createImageBitmap(file); // turned upright from EXIF by the browser
  try {
    const side = Math.min(image.width, image.height);
    const size = Math.min(MAX_SIDE, side);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext('2d');
    if (!g) throw new Error('no canvas');
    g.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', QUALITY);
  } finally {
    image.close();
  }
}

/** Pictures offered first in the picker: people and pets (the rest of the bundled ones follow). */
export const PEOPLE_AND_PETS = [
  '1F467', '1F466', '1F9D2', '1F476', '1F469', '1F468', '1F475', '1F474',
  '1F46A', '1F415', '1F408', '1F407', '1F439', '1F41F', '1F426', '1F422',
];
