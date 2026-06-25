/* =====================================================================
   views/obligaciones.js — Obligaciones contractuales
   Supervisor: crear, editar, eliminar y REORDENAR con Drag & Drop.
   Contratista: solo visualiza las suyas (lectura).
   Cada obligación: nombre, descripción, color, icono, orden, estado.
   ===================================================================== */
import { Store } from '../store.js';
import { API } from '../api.js';
import { CONFIG, OBL_COLORS, OBL_ICONS } from '../config.js';
import { el, icon, toast, modal, confirmDialog, field, input, textarea } from '../ui.js';

export function renderObligaciones(mount) {
  const isSup = Store.isSupervisor();
  const obls = Store.visibleObligaciones().sort((a, b) => (a.orden || 0) - (b.orden || 0));
  mount.innerHTML = '';

  mount.appendChild(el('div', { class: 'spread', style: 'margin-bottom:18px' }, [
    el('div', {}, [el('h2', { style: 'font-size:22px', text: isSup ? 'Obligaciones contractuales' : 'Mis obligaciones' }),
      el('p', { class: 'muted', text: isSup ? 'Arrastra las tarjetas para reordenar.' : 'Estas son las obligaciones asignadas a tu contrato.' })]),
    isSup ? el('button', { class: 'btn btn-primary', onclick: () => openForm(), html: icon('add') + ' Nueva obligación' }) : null,
  ]));

  if (!obls.length) {
    mount.appendChild(el('div', { class: 'empty' }, [el('span', { class: 'material-symbols-rounded', text: 'checklist' }), el('h4', { text: 'Sin obligaciones' }), el('p', { class: 'muted', text: isSup ? 'Crea la primera obligación.' : 'Tu supervisor aún no asigna obligaciones.' })]));
    return;
  }

  const list = el('div', { class: 'obl-list' });
  obls.forEach(o => list.appendChild(card(o)));
  mount.appendChild(list);

  function card(o) {
    const nActs = Store.actividades.filter(a => a.obligacionId === o.id).length;
    const c = el('div', { class: 'obl-card', draggable: isSup ? 'true' : 'false', 'data-id': o.id }, [
      isSup ? el('span', { class: 'obl-handle material-symbols-rounded', text: 'drag_indicator' }) : el('span', { class: 'chip', text: '#' + o.orden }),
      el('div', { class: 'obl-ico', style: `background:${o.color}`, html: icon(o.icon) }),
      el('div', { class: 'obl-meta' }, [
        el('b', { text: o.nombre }),
        el('small', { text: o.descripcion || 'Sin descripción' }),
      ]),
      el('span', { class: 'obl-count', text: nActs + ' act.' }),
      o.estado === 'inactiva' ? el('span', { class: 'chip bad', text: 'Inactiva' }) : el('span', { class: 'chip ok', text: 'Activa' }),
      isSup ? el('div', { class: 'row', style: 'gap:4px' }, [
        el('button', { class: 'icon-btn', title: 'Editar', onclick: () => openForm(o), html: icon('edit') }),
        el('button', { class: 'icon-btn', title: 'Eliminar', onclick: () => del(o), html: icon('delete') }),
      ]) : null,
    ]);
    if (isSup) attachDnD(c, list);
    return c;
  }

  function del(o) {
    confirmDialog(`¿Eliminar la obligación "${o.nombre}"?`, async () => {
      await API.deleteObligacion(o.id);
      Store.obligaciones = Store.obligaciones.filter(x => x.id !== o.id);
      toast('Obligación eliminada', 'ok'); renderObligaciones(mount);
    });
  }

  /* ---------- Drag & Drop ---------- */
  function attachDnD(node, container) {
    node.addEventListener('dragstart', () => node.classList.add('dragging'));
    node.addEventListener('dragend', async () => {
      node.classList.remove('dragging');
      container.querySelectorAll('.obl-card').forEach(c => c.classList.remove('drag-over'));
      // persistir nuevo orden
      const ids = [...container.querySelectorAll('.obl-card')].map(c => c.dataset.id);
      ids.forEach((id, i) => { const ob = Store.obligaciones.find(x => x.id === id); if (ob) ob.orden = i + 1; });
      Store.obligaciones.sort((a, b) => a.orden - b.orden);
      try { await API.reorderObligaciones(ids); toast('Orden actualizado', 'ok', 1500); } catch (e) { toast(e.message, 'err'); }
    });
    node.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = container.querySelector('.dragging');
      if (!dragging || dragging === node) return;
      const rect = node.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      container.insertBefore(dragging, after ? node.nextSibling : node);
    });
  }

  /* ---------- Form crear/editar ---------- */
  function openForm(o = {}) {
    let color = o.color || OBL_COLORS[0];
    let ic = o.icon || OBL_ICONS[0];

    const nombre = input({ value: o.nombre || '', placeholder: 'Ej: Coordinar el funcionamiento de la Casa de Juventud' });
    const desc = textarea({ value: o.descripcion || '', placeholder: 'Describe brevemente la obligación…' });

    // Selector de color
    const colorRow = el('div', { class: 'row wrap', style: 'gap:8px' });
    OBL_COLORS.forEach(c => {
      const sw = el('button', { type: 'button', style: `width:34px;height:34px;border-radius:10px;background:${c};border:3px solid ${c === color ? 'var(--text)' : 'transparent'}` , onclick: () => { color = c; colorRow.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent'); sw.style.borderColor = 'var(--text)'; iconRow.querySelectorAll('button').forEach(b => b.style.color = color); } });
      colorRow.appendChild(sw);
    });

    // Selector de icono
    const iconRow = el('div', { class: 'row wrap', style: 'gap:6px' });
    OBL_ICONS.forEach(name => {
      const b = el('button', { type: 'button', class: 'icon-btn', style: `color:${color};${name === ic ? 'background:var(--lilac-soft)' : ''}`, onclick: () => { ic = name; iconRow.querySelectorAll('button').forEach(x => x.style.background = 'transparent'); b.style.background = 'var(--lilac-soft)'; }, html: icon(name) });
      iconRow.appendChild(b);
    });

    const estado = el('select', {}, []);
    [['activa', 'Activa'], ['inactiva', 'Inactiva']].forEach(([v, l]) => { const op = el('option', { value: v, text: l }); if (v === (o.estado || 'activa')) op.selected = true; estado.appendChild(op); });

    const body = el('div', {}, [
      field('Nombre', nombre, true),
      field('Descripción', desc, true),
      field('Color', colorRow, true),
      field('Icono', iconRow, true),
      field('Estado', estado, true),
    ]);

    const save = el('button', { class: 'btn btn-primary', html: icon('save') + ' Guardar' });
    const cancel = el('button', { class: 'btn btn-ghost', text: 'Cancelar' });
    const m = modal({ title: o.id ? 'Editar obligación' : 'Nueva obligación', body, footer: [cancel, save] });
    cancel.onclick = m.close;
    save.onclick = async () => {
      if (!nombre.value.trim()) return toast('Escribe un nombre', 'err');
      try {
        const payload = { id: o.id, nombre: nombre.value.trim(), descripcion: desc.value.trim(), color, icon: ic, estado: estado.value, contractistaId: o.contractistaId || Store.contractistas[0]?.id };
        const saved = await API.saveObligacion(payload);
        if (!o.id) Store.obligaciones.push(saved); else Object.assign(Store.obligaciones.find(x => x.id === o.id), saved);
        toast('Obligación guardada', 'ok'); m.close(); renderObligaciones(mount);
      } catch (e) { toast(e.message, 'err'); }
    };
  }
}
