/* =====================================================================
   app.js — Punto de entrada, autenticación y shell de la aplicación
   ===================================================================== */
import { CONFIG, IS_DEMO } from './config.js';
import { Store, seedDemo } from './store.js';
import { API } from './api.js';
import { Router } from './router.js';
import { el, icon, toast, initials } from './ui.js';

import { renderDashboard } from './views/dashboard.js';
import { renderContractistas } from './views/contractistas.js';
import { renderObligaciones } from './views/obligaciones.js';
import { renderActividades } from './views/actividades.js';
import { renderCalendario } from './views/calendario.js';
import { renderInformes } from './views/informes.js';
import { renderBuscador } from './views/buscador.js';

const app = document.getElementById('app');

/* Navegación por rol */
const NAV = {
  supervisor: [
    { group: 'General' },
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/contractistas', icon: 'badge', label: 'Contratistas' },
    { path: '/obligaciones', icon: 'checklist', label: 'Obligaciones' },
    { group: 'Seguimiento' },
    { path: '/actividades', icon: 'assignment', label: 'Actividades' },
    { path: '/calendario', icon: 'calendar_month', label: 'Calendario' },
    { path: '/buscador', icon: 'search', label: 'Buscador' },
    { group: 'Inteligencia' },
    { path: '/informes', icon: 'auto_awesome', label: 'Informes IA' },
  ],
  contratista: [
    { group: 'Mi trabajo' },
    { path: '/dashboard', icon: 'dashboard', label: 'Resumen' },
    { path: '/actividades', icon: 'add_task', label: 'Registrar actividad' },
    { path: '/calendario', icon: 'calendar_month', label: 'Calendario' },
    { group: 'Consulta' },
    { path: '/obligaciones', icon: 'checklist', label: 'Mis obligaciones' },
    { path: '/buscador', icon: 'search', label: 'Buscar' },
    { path: '/informes', icon: 'auto_awesome', label: 'Informe del mes' },
  ],
};

const TITLES = {
  '/dashboard': ['Dashboard', 'Visión general del contrato'],
  '/contractistas': ['Contratistas', 'Administra fichas y contratos'],
  '/obligaciones': ['Obligaciones', 'Organiza con arrastrar y soltar'],
  '/actividades': ['Actividades', 'Registro e historial de evidencias'],
  '/calendario': ['Calendario', 'Actividades por día'],
  '/buscador': ['Buscador', 'Encuentra cualquier actividad'],
  '/informes': ['Informes IA', 'Genera el documento Word automáticamente'],
};

/* ------------------------------------------------------------------ */
/* LOGIN                                                               */
/* ------------------------------------------------------------------ */
function renderLogin() {
  let role = 'supervisor';

  const logoSvg = `<img src="./assets/logo.svg" alt="Parche Zipa" style="width:190px" onerror="this.style.display='none'"/>`;

  const opt = (r, ic, t, d) => el('button', {
    class: 'profile-opt' + (r === role ? ' active' : ''), type: 'button',
    onclick: (e) => { role = r; document.querySelectorAll('.profile-opt').forEach(x => x.classList.remove('active')); e.currentTarget.classList.add('active'); }
  }, [el('span', { class: 'material-symbols-rounded', text: ic }), el('b', { text: t }), el('small', { text: d })]);

  const nameInput = el('input', { id: 'login-name', placeholder: 'Tu nombre', autocomplete: 'name' });
  const cSelect = el('select', { id: 'login-c' });

  const card = el('div', { class: 'auth-card' }, [
    el('div', { class: 'auth-logo', html: logoSvg }),
    el('h1', { text: 'Gestión Contractual' }),
    el('p', { class: 'sub', text: CONFIG.ORG }),
    el('div', { class: 'profile-switch' }, [
      opt('supervisor', 'shield_person', 'Supervisor', 'Administra y supervisa'),
      opt('contratista', 'person', 'Contratista', 'Registra actividades'),
    ]),
    el('div', { class: 'field' }, [el('label', { text: 'Nombre' }), nameInput]),
    el('div', { class: 'field', id: 'c-field' }, [el('label', { text: 'Contratista' }), cSelect]),
    el('button', { class: 'btn btn-primary btn-block', style: 'margin-top:8px', onclick: doLogin }, [
      el('span', { class: 'material-symbols-rounded', text: 'login' }), 'Entrar',
    ]),
    IS_DEMO() ? el('p', { class: 'tiny muted', style: 'text-align:center;margin-top:14px',
      text: '⚡ Modo demo activo — configura API_URL en js/config.js para conectar el backend.' }) : null,
  ]);

  app.innerHTML = '';
  app.appendChild(el('div', { class: 'auth' }, [card]));

  // Poblar contratistas (demo o backend)
  bootstrapData().then(() => {
    cSelect.innerHTML = '';
    Store.contractistas.forEach(c => cSelect.appendChild(el('option', { value: c.id, text: c.nombre })));
  });

  async function doLogin() {
    const name = nameInput.value.trim() || (role === 'supervisor' ? 'Supervisor' : 'Contratista');
    const contractistaId = role === 'contratista' ? cSelect.value : null;
    try {
      const session = await API.login(role, name, contractistaId);
      Store.setSession(session);
      await mountShell();
      Router.go('/dashboard');
    } catch (e) { toast(e.message, 'err'); }
  }
}

/* ------------------------------------------------------------------ */
/* DATOS                                                              */
/* ------------------------------------------------------------------ */
export async function bootstrapData() {
  seedDemo();
  if (!IS_DEMO()) {
    try {
      const d = await API.bootstrap();
      Store.contracts = d.contracts || [];
      Store.contractistas = d.contractistas || [];
      Store.obligaciones = (d.obligaciones || []).sort((a, b) => (a.orden || 0) - (b.orden || 0));
      Store.actividades = d.actividades || [];
    } catch (e) { toast('No se pudo cargar el backend: ' + e.message, 'err'); }
  }
}

/* ------------------------------------------------------------------ */
/* SHELL                                                              */
/* ------------------------------------------------------------------ */
async function mountShell() {
  await bootstrapData();
  const s = Store.session;
  const nav = NAV[s.role];

  const sidebar = el('aside', { class: 'sidebar', id: 'sidebar' });
  sidebar.appendChild(el('div', { class: 'brand', html: `<img src="./assets/logo.svg" alt="Parche Zipa" onerror="this.outerHTML='<b style=\\'color:#fff;font-family:var(--font-display);font-size:18px\\'>Parche Zipa</b>'"/>` }));

  const navWrap = el('nav', { class: 'col', style: 'gap:2px' });
  nav.forEach(item => {
    if (item.group) { navWrap.appendChild(el('div', { class: 'nav-group-label', text: item.group })); return; }
    const a = el('a', { class: 'nav-item', href: '#' + item.path, 'data-path': item.path }, [
      el('span', { class: 'material-symbols-rounded', text: item.icon }),
      el('span', { text: item.label }),
    ]);
    navWrap.appendChild(a);
  });
  sidebar.appendChild(navWrap);
  sidebar.appendChild(el('div', { class: 'spacer' }));

  // Toggle de tema
  sidebar.appendChild(el('button', {
    class: 'nav-item', style: 'width:100%', onclick: toggleTheme
  }, [el('span', { class: 'material-symbols-rounded', id: 'theme-ico', text: 'dark_mode' }), el('span', { text: 'Modo oscuro' })]));

  // Usuario
  sidebar.appendChild(el('div', { class: 'side-user' }, [
    el('div', { class: 'avatar', text: initials(s.name) }),
    el('div', { class: 'grow' }, [el('b', { text: s.name }), el('small', { text: s.role === 'supervisor' ? 'Supervisor' : 'Contratista' })]),
    el('button', { class: 'icon-btn', style: 'color:#fff', title: 'Salir', onclick: logout, html: icon('logout') }),
  ]));

  // Topbar
  const topbar = el('header', { class: 'topbar' }, [
    el('button', { class: 'icon-btn menu-toggle', onclick: () => sidebar.classList.toggle('open'), html: icon('menu') }),
    el('div', { class: 'page-title grow', id: 'page-title' }, [el('span', { text: 'Dashboard' }), el('small', { id: 'page-sub', text: '' })]),
    el('div', { class: 'search-box', onclick: () => Router.go('/buscador') }, [
      el('span', { class: 'material-symbols-rounded', text: 'search' }),
      el('input', { placeholder: 'Buscar actividad…', readonly: 'true' }),
    ]),
  ]);

  const content = el('main', { class: 'content', id: 'content' });
  const main = el('div', { class: 'main' }, [topbar, content]);

  app.innerHTML = '';
  app.appendChild(el('div', { class: 'app' }, [sidebar, main]));

  // Cierra el sidebar en móvil al navegar
  navWrap.addEventListener('click', () => sidebar.classList.remove('open'));
}

function setActiveNav(path) {
  document.querySelectorAll('.nav-item[data-path]').forEach(a =>
    a.classList.toggle('active', a.dataset.path === path));
  const t = TITLES[path] || ['', ''];
  const titleEl = document.getElementById('page-title');
  if (titleEl) { titleEl.firstChild.textContent = t[0]; document.getElementById('page-sub').textContent = t[1]; }
}

/* ------------------------------------------------------------------ */
/* TEMA / SESIÓN                                                      */
/* ------------------------------------------------------------------ */
function toggleTheme() {
  const root = document.documentElement;
  const dark = root.getAttribute('data-theme') === 'dark';
  root.setAttribute('data-theme', dark ? 'light' : 'dark');
  localStorage.setItem('pz.theme', dark ? 'light' : 'dark');
  const ico = document.getElementById('theme-ico');
  if (ico) ico.textContent = dark ? 'dark_mode' : 'light_mode';
}
(function initTheme() {
  const saved = localStorage.getItem('pz.theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

function logout() { Store.clearSession(); location.hash = ''; renderLogin(); }

/* ------------------------------------------------------------------ */
/* RUTAS                                                              */
/* ------------------------------------------------------------------ */
function guard(render) {
  return () => {
    if (!Store.session) { renderLogin(); return; }
    const mount = document.getElementById('content');
    if (!mount) { mountShell().then(() => { setActiveNav(Router.current); render(document.getElementById('content')); }); return; }
    setActiveNav(Router.current);
    render(mount);
  };
}

Router.register('/dashboard', guard(renderDashboard));
Router.register('/contractistas', guard(renderContractistas));
Router.register('/obligaciones', guard(renderObligaciones));
Router.register('/actividades', guard(renderActividades));
Router.register('/calendario', guard(renderCalendario));
Router.register('/informes', guard(renderInformes));
Router.register('/buscador', guard(renderBuscador));
Router.notFound = guard(renderDashboard);

/* ------------------------------------------------------------------ */
/* ARRANQUE                                                           */
/* ------------------------------------------------------------------ */
(async function start() {
  Store.loadSession();
  if (Store.session) { await mountShell(); Router.start(); }
  else { renderLogin(); }
})();
