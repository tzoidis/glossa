// What the device can do, read once at startup.

/** A finger can draw on the screen: a tablet or phone, or a laptop with a touch screen. */
export function hasTouchScreen(): boolean {
  if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
  return typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches;
}
