import type { Theme } from "./types";

export const SETTINGS_STORAGE_KEY = "mmf-schedule";

/** Цвета canvas — совпадают с CSS и с chrome браузера / status bar. */
export const THEME_COLORS = {
  dark: "#101311",
  light: "#f6f5f2",
} as const;

function setMeta(name: string, content: string): void {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

/**
 * Тема приложения + chrome браузера:
 * theme-color (Android Chrome, Safari toolbar/status в PWA),
 * color-scheme, apple-mobile-web-app-status-bar-style.
 */
export function applyTheme(theme: Theme): void {
  const color = THEME_COLORS[theme];
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  setMeta("theme-color", color);
  // default ≈ светлый status bar, black-translucent ≈ тёмный, контент под баром
  setMeta(
    "apple-mobile-web-app-status-bar-style",
    theme === "dark" ? "black-translucent" : "default",
  );
}

/**
 * Выполняется до первой отрисовки, иначе при сохранённой светлой теме
 * страница успевает мигнуть тёмной, а status bar — чужим цветом.
 */
export const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  var dark = "${THEME_COLORS.dark}";
  var light = "${THEME_COLORS.light}";
  var theme = "dark";
  try {
    var saved = JSON.parse(localStorage.getItem("${SETTINGS_STORAGE_KEY}") || "{}");
    theme = saved.theme === "light" ? "light" : "dark";
  } catch (error) {}
  var color = theme === "light" ? light : dark;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  function setMeta(name, content) {
    var meta = document.querySelector('meta[name="' + name + '"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", name);
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }
  setMeta("theme-color", color);
  setMeta(
    "apple-mobile-web-app-status-bar-style",
    theme === "dark" ? "black-translucent" : "default"
  );
  try {
    var standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true;
    if (standalone) document.documentElement.classList.add("pwa-standalone");
  } catch (error) {}
})();
`;
