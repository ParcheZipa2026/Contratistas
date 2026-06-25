/* =====================================================================
   views/buscador.js — Buscador inteligente de actividades
   ---------------------------------------------------------------------
   Encuentra actividades por: palabra (descripción/lugar), fecha (rango),
   lugar, contratista (solo supervisor) y obligación.
   - Filtros combinables en tiempo real (sin recargar).
   - Resultados resaltando el término buscado.
   - Respeta el rol: el contratista solo ve sus propias actividades.
   ===================================================================== */
import { Store } from '../store.js';
import { el, icon, fmtDateLong, lightbox, field, input, select, emptyState } from '../ui.js';

// Estado de filtros persistente durante la sesión de vista.
const F = { q: '', from: '', to: '', lugar: '', contratista: 'all', obligacion: 'all' };

export function renderBuscador(mount) {
  mount.innerHTML = '';

  mount.appendChild(el('div', { style: 'margin-bottom:18px' }, [
    el('h2', { style: 'font-size:22px', text: 'Buscador inteligente' }),
    el('p', { class: 'muted', text: 'Filtra y encuentra cualquier evidencia registrada.' }),
  ]));

  // --------------------------------------------------------------
  // Panel de filtros
  // --------------------------------------------------------------
  const obls = Store.visibleObligaciones();
  const cts = Store.contractistas;

  // Lugares únicos para autocompletar visualmente.
  const lugares = [...new Set(Store.visibleActividades().map(a => a.lugar).filter(Boolean))].sort();

  const qInput = input({
    type: 'search', placeholder: 'Buscar palabra clave, lugar, descripción…', value: F.q,
    oninput: (e) => { F.q = e.target.value; paint(); },
  });

  const fromInput = input({ type: 'date', value: F.from, oninput: (e) => { F.from = e.target.value; paint(); } });
  const toInput = input({ type: 'date', value: F.to, oninput: (e) => { F.to = e.target.value; paint(); } });

  const lugarSel = select(
    [{ value: '', label: 'Todos los lugares' }, ...lugares.map(l => ({ value: l, label: l }))],
    F.lugar, { onchange: (e) => { F.lugar = e.target.value; paint(); } }
  );

  const oblSel = select(
    [{ value: 'all', label: 'Todas las obligaciones' }, ...obls.map(o => ({ value: o.id, label: o.nombre }))],
    F.obligacion, { onchange: (e) => { F.obligacion = e.target.value; paint(); } }
  );

  const filtersGrid = el('div', { class: 'form-grid' }, [
    field('Palabra clave', qInput, true),
    field('Desde', fromInput),
    field('Hasta', toInput),
    field('Lugar', lugarSel),
    field('Obligación', oblSel),
  ]);

  // El filtro por contratista solo tiene sentido para el supervisor.
  if (Store.isSupervisor()) {
    const ctSel = select(
      [{ value: 'all', label: 'Todos los contratistas' }, ...cts.map(c => ({ value: c.id, label: c.nombre }))],
      F.contratista, { onchange: (e) => { F.contratista = e.target.value; paint(); } }
    );
    filtersGrid.appendChild(field('Contratista', ctSel));
  }

  const clearBtn = el('button', {
    class: 'btn btn-ghost', html: icon('filter_alt_off') + ' Limpiar filtros',
    onclick: () => {
      F.q = ''; F.from = ''; F.to = ''; F.lugar = ''; F.contratista = 'all'; F.obligacion = 'all';
      qInput.value = ''; fromInput.value = ''; toInput.value = '';
      lugarSel.value = ''; oblSel.value = 'all';
      renderBuscador(mount);
    },
  });

  mount.appendChild(el('div', { class: 'card', style: 'margin-bottom:18px' }, [
    filtersGrid,
    el('div', { class: 'row', style: 'justify-content:flex-end;margin-top:14px' }, [clearBtn]),
  ]));

  // Contador + contenedor de resultados.
  const counter = el('div', { class: 'muted', style: 'margin-bottom:12px;font-weight:600' });
  const results = el('div');
  mount.appendChild(counter);
  mount.appendChild(results);

  // --------------------------------------------------------------
  // Motor de filtrado
  // --------------------------------------------------------------
  function matches(a) {
    if (F.from && a.fecha < F.from) return false;
    if (F.to && a.fecha > F.to) return false;
    if (F.lugar && a.lugar !== F.lugar) return false;
    if (F.obligacion !== 'all' && a.obligacionId !== F.obligacion) return false;
    if (Store.isSupervisor() && F.contratista !== 'all' && a.contractistaId !== F.contratista) return false;
    if (F.q) {
      const q = F.q.toLowerCase().trim();
      const obl = obls.find(o => o.id === a.obligacionId);
      const hay = [
        a.descripcion, a.lugar, a.fecha,
        obl?.nombre, ctName(a.contractistaId),
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function ctName(id) { return cts.find(c => c.id === id)?.nombre || ''; }

  // Resalta el término buscado dentro de un texto.
  function highlight(text = '') {
    if (!F.q) return document.createTextNode(text);
    const q = F.q.trim();
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return document.createTextNode(text);
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createTextNode(text.slice(0, idx)));
    frag.appendChild(el('mark', { text: text.slice(idx, idx + q.length) }));
    frag.appendChild(document.createTextNode(text.slice(idx + q.length)));
    return frag;
  }

  function paint() {
    const list = Store.visibleActividades()
      .filter(matches)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    counter.textContent = `${list.length} resultado${list.length === 1 ? '' : 's'}`;
    results.innerHTML = '';

    if (!list.length) {
      results.appendChild(emptyState('search_off', 'Sin coincidencias', 'Ajusta los filtros o limpia la búsqueda.'));
      return;
    }

    const grid = el('div', { class: 'cards-grid' });
    list.forEach(a => {
      const o = obls.find(x => x.id === a.obligacionId) || {};
      const thumbs = el('div', { class: 'row wrap', style: 'gap:6px;margin-top:10px' });
      (a.fotos || []).forEach(src => thumbs.appendChild(
        el('img', { src, alt: 'evidencia', class: 'thumb', style: 'width:64px;height:64px;border-radius:12px;object-fit:cover;cursor:pointer', onclick: () => lightbox(src) })
      ));

      const desc = el('p', { style: 'margin:8px 0 0;line-height:1.5' });
      desc.appendChild(highlight(a.descripcion || ''));

      const card = el('div', { class: 'card hover-lift' }, [
        el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, [
          el('span', { class: 'chip', style: `background:${(o.color || '#999')}22;color:${o.color || '#555'}`, html: icon(o.icon || 'task') + ' ' + (o.nombre || 'Sin obligación') }),
        ]),
        el('div', { class: 'row', style: 'gap:14px;margin-top:10px;flex-wrap:wrap;color:var(--muted);font-size:13px' }, [
          el('span', { html: icon('event') + ' ' + fmtDateLong(a.fecha) }),
          el('span', { html: icon('place') + ' ' + (a.lugar || '—') }),
          ...(Store.isSupervisor() ? [el('span', { html: icon('person') + ' ' + ctName(a.contractistaId) })] : []),
          el('span', { html: icon('photo_library') + ' ' + (a.fotos?.length || 0) }),
        ]),
        desc,
        thumbs,
      ]);
      grid.appendChild(card);
    });
    results.appendChild(grid);
  }

  paint();
}
