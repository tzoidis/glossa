// Child screens grow to fill the screen (robot player review: on a tablet the games used
// only the middle third). Every child size is in rem, so the whole screen scales with the
// root font-size. The CSS sets a safe base that fits the longest content on any screen
// (index.css, `html`); here each screen is measured at that base and the root grows as
// far as it can, up to MAX_GROW, while the content still fits and no row of choices,
// tiles or keys and no sentence breaks into more lines than at the base: the layout only
// gets bigger, never rearranged. Phones are already at their limit and stay as they are.
//
// Within one round the size never grows from question to question (a jumping screen
// would move the answers under the child's finger); it only shrinks if a longer word
// needs it. A new screen or a new round starts again. The parent screen (documents, 16px)
// and the village (an absolutely placed scene) keep the base.

import { useEffect } from 'react';

/** at most this much bigger than the base */
export const MAX_GROW = 1.5;
/** and never above this (a desktop or TV screen) */
export const MAX_PX = 30;
/** room kept free, so a shadow or the demo hand is not cut */
const SLACK = 0.96;
/** how much taller (relative to the font) a block may get before it counts as wrapped */
const WRAP_TOLERANCE = 1.08;

/** The first guess: the growth that makes content this high fill the height, within the limits. */
export function growFactor(naturalHeight: number, spaceHeight: number, base: number): number {
  if (naturalHeight <= 0) return 1;
  return Math.max(1, Math.min((spaceHeight / naturalHeight) * SLACK, MAX_GROW, MAX_PX / base));
}

/** Blocks whose line count must not change: rows that wrap, sentences, the parts of a game. */
const TRACKED = '.exercise-stage > *, .choices, .tiles, .slots, .keyboard, .stations, .memory-grid, .reading-sentence, .story-lines, .letter-return__letters, .tray';

const keepsBase = (main: Element) => main.matches('.village') || document.documentElement.classList.contains('parent-mode');

function contentSize(main: HTMLElement): { w: number; h: number } {
  // the content's own height: the screen itself is 100% high
  const height = main.style.height;
  main.style.height = 'auto';
  const size = { w: main.scrollWidth, h: main.scrollHeight };
  main.style.height = height;
  return size;
}

/**
 * Sets the root font-size for `main`: the largest up to `cap` at which it fits `space`
 * and nothing wraps more than at the base. Runs inside one frame, so nothing flickers.
 */
function fitMain(main: HTMLElement, space: { w: number; h: number }, cap: (base: number) => number): HTMLElement[] {
  const root = document.documentElement;
  root.style.fontSize = '';
  const base = parseFloat(getComputedStyle(root).fontSize);
  const blocks = [...main.querySelectorAll<HTMLElement>(TRACKED)];
  const atBase = blocks.map((b) => b.offsetHeight / base);
  const fits = (size: number) => {
    root.style.fontSize = `${size}px`;
    // as laid out: something hanging out of its box (the demo hand) shows only here
    if (root.scrollHeight > space.h + 1 || root.scrollWidth > space.w + 1) return false;
    const s = contentSize(main);
    if (s.h > space.h || s.w > space.w) return false;
    return blocks.every((b, i) => b.offsetHeight / size <= atBase[i]! * WRAP_TOLERANCE + 1 / size);
  };

  const high = Math.min(base * growFactor(contentSize(main).h, space.h, base), cap(base));
  let best = base;
  if (high > base + 0.25) {
    if (fits(high)) best = high;
    else {
      let low = base;
      let top = high;
      for (let k = 0; k < 6; k++) {
        const mid = (low + top) / 2;
        if (fits(mid)) low = mid;
        else top = mid;
      }
      best = low;
    }
  }
  root.style.fontSize = best > base + 0.25 ? `${best}px` : '';
  return blocks;
}

/** Keeps the root font-size fitted to the child screen on show. */
export function useFit(): void {
  useEffect(() => {
    const root = document.documentElement;
    let lastMain: Element | null = null;
    let lastStage: Element | null = null;
    let frame = 0;

    const fit = () => {
      frame = 0;
      const main = document.querySelector<HTMLElement>('#root main');
      const space = { w: root.clientWidth, h: root.clientHeight };
      if (!main || space.w <= 0 || space.h <= 0) return;
      if (keepsBase(main)) {
        root.style.fontSize = '';
        lastMain = main;
        return;
      }
      const stage = main.querySelector('.exercise-stage');
      const fresh = main !== lastMain || stage !== lastStage;
      lastMain = main;
      lastStage = stage;
      // a new question in the same round: never bigger than now
      const now = parseFloat(root.style.fontSize) || 0;
      const blocks = fitMain(main, space, (base) => (fresh ? base * MAX_GROW : Math.max(base, now)));
      // a picture or the font arriving later changes sizes without changing the page
      sizes.disconnect();
      blocks.forEach((b) => sizes.observe(b));
    };
    const later = () => {
      if (!frame) frame = requestAnimationFrame(fit);
    };
    const sizes = new ResizeObserver(later);
    const changes = new MutationObserver(later);
    changes.observe(document.getElementById('root')!, { childList: true, subtree: true, characterData: true });
    const resized = () => {
      lastMain = null; // start again
      later();
    };
    window.addEventListener('resize', resized);
    later();
    return () => {
      changes.disconnect();
      sizes.disconnect();
      window.removeEventListener('resize', resized);
      cancelAnimationFrame(frame);
      root.style.fontSize = '';
    };
  }, []);
}
