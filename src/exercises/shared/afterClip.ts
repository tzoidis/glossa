/**
 * Runs `next` once `clip` has ended and at least `minMs` have passed, unless
 * `stillHere()` is false by then. Moving on while a clip plays would cut it off.
 */
export async function afterClip(clip: Promise<unknown>, minMs: number, stillHere: () => boolean, next: () => void): Promise<void> {
  await Promise.all([clip, new Promise((r) => setTimeout(r, minMs))]);
  if (stillHere()) next();
}
