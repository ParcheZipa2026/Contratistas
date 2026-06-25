/* =====================================================================
   views/dashboard.js — Tablero principal (Notion + Linear + Stripe vibes)
   KPIs, actividades por semana, top obligaciones, fotos, mapa de calor,
   lugares más visitados, últimas actividades, % cumplimiento y semáforos.
   ===================================================================== */
import { Store } from '../store.js';
import { el, icon, money, fmtDate } from '../ui.js';
import { Router } from '../router.js';

export function renderDashboard(mount) {
  const acts = Store.visibleActividades();
  const obls = Store.visibleObligaciones();
  const fotos = acts.reduce((s, a) => s + (a.fotos?.length || 0), 0);
  const oblsConActividad = new Set(acts.map(a => a.obligacionId)).size;
  const cumplimiento = obls.length ? Math.round((oblsConActividad / obls.length) * 100) : 0;

  mount.innerHTML = '';

  // ---------- KPIs ----------
  const kpis = [
    { ic: 'assignment', bg: 'var(--purple)', val: acts.length, lbl: 'Actividades', trend: '+' + lastWeek(acts) + ' esta semana', up: true },
    { ic: 'photo_library', bg: 'var(--neon-deep)', val: fotos, lbl: 'Evidencias fotográficas', trend: (fotos / Math.max(acts.length, 1)).toFixed(1) + ' por actividad', up: true },
    { ic: 'checklist', bg: 'var(--yellow-deep)', val: `${oblsConActividad}/${obls.length}`, lbl: 'Obligaciones con avance', trend: 'cobertura', up: true },
    { ic: 'percent', bg: cumplimiento >= 75 ? 'var(--ok)' : cumplimiento >= 40 ? 'var(--warn)' : 'var(--bad)', val: cumplimiento + '%', lbl: 'Cumplimiento', trend: estadoTexto(cumplimiento), up: cumplimiento >= 50 },
  ];
  const kpiGrid = el('div', { class: 'grid grid-kpi' });
  kpis.forEach(k => kpiGrid.appendChild(el('div', { class: 'card kpi hover' }, [
    el('div', { class: 'ico', style: `background:${k.bg}`, html: icon(k.ic) }),
    el('div', { class: 'val mono', text: String(k.val) }),
    el('div', { class: 'spread' }, [el('span', { class: 'lbl', text: k.lbl }), el('span', { class: 'trend ' + (k.up ? 'up' : 'down'), text: k.trend })]),
  ])));
  mount.appendChild(kpiGrid);

  // ---------- Fila: actividades por semana + top obligaciones ----------
  const row = el('div', { class: 'grid grid-2', style: 'margin-top:18px' });

  row.appendChild(el('div', { class: 'card' }, [
    cardHeader('Actividades por semana', 'bar_chart'),
    weeklyChart(acts),
  ]));

  row.appendChild(el('div', { class: 'card' }, [
    cardHeader('Obligaciones con más actividades', 'leaderboard'),
    topObligaciones(acts, obls),
  ]));
  mount.appendChild(row);

  // ---------- Fila: mapa de calor + lugares ----------
  const row2 = el('div', { class: 'grid grid-2', style: 'margin-top:18px' });
  row2.appendChild(el('div', { class: 'card' }, [cardHeader('Mapa de calor (últimas 5 semanas)', 'grid_view'), heatmap(acts)]));
  row2.appendChild(el('div', { class: 'card' }, [cardHeader('Lugares más visitados', 'location_on'), lugares(acts)]));
  mount.appendChild(row2);

  // ---------- Semáforos por obligación ----------
  const sem = el('div', { class: 'card', style: 'margin-top:18px' }, [cardHeader('Estado por obligación', 'traffic')]);
  const semGrid = el('div', { class: 'grid grid-3' });
  obls.forEach(o => {
    const n = acts.filter(a => a.obligacionId === o.id).length;
    const cls = n >= 3 ? 'ok' : n >= 1 ? 'warn' : 'bad';
    const txt = n >= 3 ? 'En buen ritmo' : n >= 1 ? 'Requiere atención' : 'Sin actividades';
    semGrid.appendChild(el('div', { class: 'row card hover', style: 'padding:14px' }, [
      el('div', { class: 'obl-ico', style: `background:${o.color};width:38px;height:38px`, html: icon(o.icon) }),
      el('div', { class: 'grow', style: 'min-width:0' }, [
        el('b', { style: 'font-family:var(--font-display);font-size:14px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', text: o.nombre }),
        el('small', { class: 'muted', text: `${n} actividad(es) · ${txt}` }),
      ]),
      el('span', { class: 'dot ' + cls }),
    ]));
  });
  sem.appendChild(semGrid);
  mount.appendChild(sem);

  // ---------- Últimas actividades ----------
  const last = el('div', { class: 'card', style: 'margin-top:18px' }, [
    el('div', { class: 'card-h' }, [
      el('h3', { html: icon('history') + ' Últimas actividades' }),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => Router.go('/actividades'), html: icon('open_in_new') + ' Ver todas' }),
    ]),
  ]);
  const recent = [...acts].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);
  if (recent.length) {
    recent.forEach(a => {
      const o = obls.find(x => x.id === a.obligacionId) || {};
      last.appendChild(el('div', { class: 'row', style: 'padding:10px 0;border-bottom:1px solid var(--border)' }, [
        el('div', { class: 'obl-ico', style: `background:${o.color || '#ccc'};width:38px;height:38px`, html: icon(o.icon || 'task') }),
        el('div', { class: 'grow', style: 'min-width:0' }, [
          el('b', { style: 'font-size:14px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', text: a.descripcion }),
          el('small', { class: 'muted', text: `${o.nombre || ''} · ${a.lugar}` }),
        ]),
        el('span', { class: 'chip', text: fmtDate(a.fecha) }),
      ]));
    });
  } else last.appendChild(el('p', { class: 'muted', text: 'Aún no hay actividades registradas.' }));
  mount.appendChild(last);
}

/* ---------- helpers de gráficas (SVG nativo, sin librerías) ---------- */
function cardHeader(title, ic) { return el('div', { class: 'card-h' }, [el('h3', { html: icon(ic) + ' ' + title })]); }

function lastWeek(acts) {
  const wk = new Date(); wk.setDate(wk.getDate() - 7);
  const iso = wk.toISOString().slice(0, 10);
  return acts.filter(a => a.fecha >= iso).length;
}
function estadoTexto(p) { return p >= 75 ? 'Óptimo' : p >= 40 ? 'Aceptable' : 'Crítico'; }

function weeklyChart(acts) {
  // Agrupa por semana (últimas 6)
  const weeks = []; const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now); start.setDate(now.getDate() - i * 7 - now.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const c = acts.filter(a => { const d = new Date(a.fecha); return d >= start && d <= end; }).length;
    weeks.push({ label: 'S' + (6 - i), count: c });
  }
  const max = Math.max(1, ...weeks.map(w => w.count));
  const wrap = el('div', { style: 'display:flex;align-items:flex-end;gap:14px;height:170px;padding-top:12px' });
  weeks.forEach(w => {
    const h = Math.round((w.count / max) * 130) + 6;
    wrap.appendChild(el('div', { style: 'flex:1;display:flex;flex-direction:column;align-items:center;gap:8px' }, [
      el('div', { class: 'mono', style: 'font-weight:700;font-size:13px', text: String(w.count) }),
      el('div', { style: `width:100%;max-width:40px;height:${h}px;border-radius:10px 10px 4px 4px;background:linear-gradient(180deg,var(--purple),var(--lilac));transition:height .5s var(--ease)` }),
      el('small', { class: 'muted', text: w.label }),
    ]));
  });
  return wrap;
}

function topObligaciones(acts, obls) {
  const counts = obls.map(o => ({ o, n: acts.filter(a => a.obligacionId === o.id).length })).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...counts.map(c => c.n));
  const wrap = el('div', { class: 'col', style: 'gap:14px;padding-top:6px' });
  counts.forEach(({ o, n }) => {
    wrap.appendChild(el('div', {}, [
      el('div', { class: 'spread', style: 'margin-bottom:6px' }, [
        el('span', { class: 'row', style: 'gap:8px;font-size:13px;font-weight:600' }, [el('span', { class: 'material-symbols-rounded', style: `color:${o.color};font-size:18px`, text: o.icon }), o.nombre.length > 34 ? o.nombre.slice(0, 34) + '…' : o.nombre]),
        el('b', { class: 'mono', text: String(n) }),
      ]),
      el('div', { class: 'progress' }, [el('span', { style: `width:${(n / max) * 100}%;background:${o.color}` })]),
    ]));
  });
  return wrap;
}

function heatmap(acts) {
  // 5 semanas x 7 días
  const wrap = el('div', { class: 'heatmap' });
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const start = new Date(now); start.setDate(now.getDate() - 34 - now.getDay());
  for (let i = 0; i < 35; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const c = acts.filter(a => a.fecha === iso).length;
    const lvl = c === 0 ? '' : c === 1 ? 'heat-1' : c === 2 ? 'heat-2' : c === 3 ? 'heat-3' : 'heat-4';
    wrap.appendChild(el('div', { class: 'heat-cell ' + lvl, title: `${iso}: ${c} actividad(es)` }));
  }
  return el('div', {}, [wrap, el('div', { class: 'row tiny muted', style: 'gap:6px;margin-top:10px;justify-content:flex-end' }, [
    'Menos', el('span', { class: 'heat-cell', style: 'width:14px' }), el('span', { class: 'heat-cell heat-2', style: 'width:14px' }), el('span', { class: 'heat-cell heat-4', style: 'width:14px' }), 'Más',
  ])]);
}

function lugares(acts) {
  const map = {};
  acts.forEach(a => { map[a.lugar] = (map[a.lugar] || 0) + 1; });
  const list = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!list.length) return el('p', { class: 'muted', text: 'Sin lugares registrados.' });
  const wrap = el('div', { class: 'col', style: 'gap:10px;padding-top:6px' });
  list.forEach(([lugar, n], i) => wrap.appendChild(el('div', { class: 'row spread' }, [
    el('span', { class: 'row', style: 'gap:10px' }, [el('span', { class: 'chip', text: '#' + (i + 1) }), el('b', { style: 'font-size:14px', text: lugar })]),
    el('span', { class: 'chip ok', text: n + ' visita(s)' }),
  ])));
  return wrap;
}
