export type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "theme";

function getPreferredTheme(): Theme {
  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

export function getStoredTheme(): Theme | null {
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  if (value === "dark" || value === "light") {
    return value;
  }
  return null;
}

export function resolveTheme(): Theme {
  return getStoredTheme() ?? getPreferredTheme();
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function initializeTheme() {
  applyTheme(resolveTheme());
}
