/* =====================================================================
   router.js — Enrutador por hash (compatible con GitHub Pages)
   ===================================================================== */
export const Router = {
  routes: {},
  notFound: null,
  current: null,

  register(path, handler) { this.routes[path] = handler; },

  go(path) { if (location.hash !== '#' + path) location.hash = path; else this.resolve(); },

  resolve() {
    const path = (location.hash.replace(/^#/, '') || '/dashboard').split('?')[0];
    const handler = this.routes[path] || this.notFound;
    this.current = path;
    if (handler) handler();
  },

  start() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  },
};
