/* =====================================================================
   views/calendario.js — Calendario mensual
   Días con actividades en verde; vacíos en gris. Clic en un día muestra
   todas las actividades de esa fecha.
   ===================================================================== */
import { Store } from '../store.js';
import { el, icon, modal, fmtDateLong, lightbox } from '../ui.js';

let cur = new Date();

export function renderCalendario(mount) {
  mount.innerHTML = '';
  const acts = Store.visibleActividades();
  const obls = Store.visibleObligaciones();
  const byDay = {};
  acts.forEach(a => { (byDay[a.fecha] ||= []).push(a); });

  const y = cur.getFullYear(), m = cur.getMonth();
  const monthName = cur.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  const card = el('div', { class: 'card' });
  card.appendChild(el('div', { class: 'cal-head' }, [
    el('h3', { style: 'text-transform:capitalize;font-size:20px', text: monthName }),
    el('div', { class: 'row', style: 'gap:8px' }, [
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => { cur = new Date(y, m - 1, 1); renderCalendario(mount); }, html: icon('chevron_left') }),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => { cur = new Date(); renderCalendario(mount); }, text: 'Hoy' }),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => { cur = new Date(y, m + 1, 1); renderCalendario(mount); }, html: icon('chevron_right') }),
    ]),
  ]));

  const grid = el('div', { class: 'cal-grid' });
  ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(d => grid.appendChild(el('div', { class: 'cal-dow', text: d })));

  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const todayIso = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < first; i++) grid.appendChild(el('div', { class: 'cal-day empty' }));
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const list = byDay[iso] || [];
    const cell = el('div', { class: 'cal-day' + (list.length ? ' has' : '') + (iso === todayIso ? ' today' : ''), onclick: list.length ? () => showDay(iso, list, obls) : null }, [
      el('span', { class: 'num', text: String(d) }),
      list.length ? el('span', { class: 'pill', text: list.length + (list.length === 1 ? ' act' : ' acts') }) : null,
    ]);
    grid.appendChild(cell);
  }
  card.appendChild(grid);

  // Leyenda
  card.appendChild(el('div', { class: 'row', style: 'gap:18px;margin-top:16px' }, [
    el('span', { class: 'row tiny muted', html: `<span class="cal-day has" style="width:18px;height:18px;padding:0"></span> Con actividades` }),
    el('span', { class: 'row tiny muted', html: `<span class="cal-day" style="width:18px;height:18px;padding:0"></span> Sin actividades` }),
  ]));

  mount.appendChild(card);

  function showDay(iso, list, obls) {
    const body = el('div', { class: 'col', style: 'gap:12px' });
    list.forEach(a => {
      const o = obls.find(x => x.id === a.obligacionId) || {};
      const photos = el('div', { class: 'tl-photos' });
      (a.fotos || []).forEach(src => photos.appendChild(el('img', { src, onclick: () => lightbox(src) })));
      body.appendChild(el('div', { class: 'card', style: 'box-shadow:none' }, [
        el('span', { class: 'chip', style: `background:${(o.color || '#999')}22;color:${o.color || '#555'};margin-bottom:8px`, html: icon(o.icon || 'task') + ' ' + (o.nombre || '') }),
        el('p', { style: 'margin:4px 0', text: a.descripcion }),
        el('small', { class: 'muted row', html: icon('location_on') + ' ' + a.lugar }),
        a.fotos?.length ? photos : null,
      ]));
    });
    modal({ title: fmtDateLong(iso), body });
  }
}
