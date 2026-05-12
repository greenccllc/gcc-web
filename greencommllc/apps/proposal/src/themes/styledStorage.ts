// Persist styled HTML per (deliverable key, theme id) pair so reloads
// bring back the user's chosen styling without re-running Gemini.

const KEY_PREFIX = 'gcc-styled::';

export function load(defKey: string, themeId: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(KEY_PREFIX + defKey + '::' + themeId);
  } catch {
    return null;
  }
}

export function save(defKey: string, themeId: string, html: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY_PREFIX + defKey + '::' + themeId, html);
  } catch {
    // quota — ignore
  }
}

export function clear(defKey: string, themeId?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (themeId) {
      localStorage.removeItem(KEY_PREFIX + defKey + '::' + themeId);
      return;
    }
    // Clear every theme cached for this deliverable.
    const prefix = KEY_PREFIX + defKey + '::';
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}
