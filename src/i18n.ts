import ui from './content/ui.el.json';

export type UiKey = keyof typeof ui;

// All UI text lives in content/ui.el.json; components never hardcode Greek.
export function t(key: UiKey): string {
  return ui[key];
}
