import type { Theme } from "./types";

export const SETTINGS_STORAGE_KEY = "mmf-schedule";

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/**
 * Выполняется до первой отрисовки, иначе при сохранённой светлой теме
 * страница успевает мигнуть тёмной.
 */
export const THEME_BOOTSTRAP_SCRIPT = `
try {
  var saved = JSON.parse(localStorage.getItem("${SETTINGS_STORAGE_KEY}") || "{}");
  document.documentElement.dataset.theme = saved.theme === "light" ? "light" : "dark";
} catch (error) {
  document.documentElement.dataset.theme = "dark";
}
`;
