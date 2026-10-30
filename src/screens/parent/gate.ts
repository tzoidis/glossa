// Parent gate (PRD §7): a random two-digit × one-digit product, or the parent's
// 4-digit PIN. A long press would be found by a child within a day.

export interface GateQuestion {
  a: number;
  b: number;
  answer: number;
}

export function makeGateQuestion(rng: () => number = Math.random): GateQuestion {
  const a = 12 + Math.floor(rng() * 18); // 12..29
  const b = 3 + Math.floor(rng() * 7); // 3..9
  return { a, b, answer: a * b };
}

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

export function gatePasses(input: string, question: GateQuestion, pin: string | null): boolean {
  const value = input.trim();
  return pin ? value === pin : Number(value) === question.answer && value !== '';
}
