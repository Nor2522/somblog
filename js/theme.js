// Applies the saved theme (or system preference) and wires up any
// [data-theme-toggle] button on the page. The actual "apply before paint"
// step lives in a tiny inline script in each page's <head> so there's no
// flash of the wrong theme; this file just keeps things in sync afterwards.
(function () {
  const STORAGE_KEY = 'somblog-theme';

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      // localStorage may be unavailable (private mode, etc.) - theme just
      // won't persist across visits, which is a harmless degradation.
    }
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      const icons = window.SomBlog ? window.SomBlog.icons : null;
      if (icons) {
        btn.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
      }
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('title', theme === 'dark' ? 'Light mode' : 'Dark mode');
    });
  }

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    setStoredTheme(next);
    applyTheme(next);
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme());
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', toggleTheme);
    });
  });
})();
