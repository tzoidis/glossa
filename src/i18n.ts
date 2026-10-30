import ui from './content/ui.el.json';

export type UiKey = keyof typeof ui;

// All UI text lives in content/ui.el.json; components never hardcode Greek.
// Placeholders: {name} is replaced by vars.name.
export function t(key: UiKey, vars?: Record<string, string | number>): string {
  const text = ui[key];
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;
}
