import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const THEME_STORAGE_KEY = 'ui-theme';

export function resolveTheme(theme) {
  if (theme === 'dark' || theme === 'light') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyResolved(resolved) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function readStoredTheme() {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return 'system';
    const p = JSON.parse(raw);
    const t = p?.state?.theme;
    if (t === 'light' || t === 'dark' || t === 'system') return t;
  } catch {
    /* ignore */
  }
  return 'system';
}

const initialTheme = readStoredTheme();
const initialResolved = resolveTheme(initialTheme);
if (typeof document !== 'undefined') {
  applyResolved(initialResolved);
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: initialTheme,
      resolved: initialResolved,
      syncTheme() {
        const resolved = resolveTheme(get().theme);
        applyResolved(resolved);
        set({ resolved });
      },
      setTheme(theme) {
        set({ theme });
        get().syncTheme();
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
);

useThemeStore.persist.onFinishHydration(() => {
  useThemeStore.getState().syncTheme();
});
