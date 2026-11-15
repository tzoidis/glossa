// Sizes on the child's screens are in rem, so they shrink with the screen
// (see `html` in index.css): a size designed in px for the tablet, as rem.

export const rem = (px: number): string => `${px / 16}rem`;

/** width and height of a square element, as a style */
export const square = (px: number) => ({ width: rem(px), height: rem(px) });

/** The length of a written word, for `.reading-word` to shrink a long one to the screen. */
export const wordFit = (text: string, extra = 0) => ({ '--chars': Array.from(text).length + extra }) as React.CSSProperties;
