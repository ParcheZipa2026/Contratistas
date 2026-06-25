/* =====================================================================
   views/contractistas.js — CRUD de contratistas + ficha contractual
   (Solo Supervisor). Cada contratista tiene una ficha editable con toda
   la información contractual del brief.
   ===================================================================== */
import { Store } from '../store.js';
import { API } from '../api.js';
import { el, icon, toast, modal, confirmDialog, money, fmtDate, field, input, textarea, initials } from '../ui.js';

export function renderContractistas(mount) {
  if (!Store.isSupervisor()) {
    mount.innerHTML = '';
    mount.appendChild(el('div', { class: 'empty' }, [el('span', { class: 'material-symbols-rounded', text: 'lock' }), el('h4', { text: 'Acceso restringido' }), el('p', { class: 'muted', text: 'Solo el supervisor administra contratistas.' })]));
    return;
  }
  mount.innerHTML = '';

  mount.appendChild(el('div', { class: 'spread', style: 'margin-bottom:18px' }, [
    el('div', {}, [el('h2', { style: 'font-size:22px', text: 'Contratistas' }), el('p', { class: 'muted', text: `${Store.contractistas.length} registrados` })]),
    el('button', { class: 'btn btn-primary', onclick: () => openFicha(), html: icon('person_add') + ' Nuevo contratista' }),
  ]));

  const grid = el('div', { class: 'grid grid-3' });
  if (!Store.contractistas.length) {
    grid.appendChild(el('div', { class: 'empty', style: 'grid-column:1/-1' }, [el('span', { class: 'material-symbols-rounded', text: 'badge' }), el('h4', { text: 'Sin contratistas' }), el('p', { class: 'muted', text: 'Crea el primero para empezar.' })]));
  }
  Store.contractistas.forEach(c => {
    const contrato = Store.contracts.find(k => k.contractistaId === c.id);
    const nActs = Store.actividades.filter(a => a.contractistaId === c.id).length;
    grid.appendChild(el('div', { class: 'card hover' }, [
      el('div', { class: 'row', style: 'margin-bottom:12px' }, [
        el('div', { class: 'avatar', style: 'width:48px;height:48px;border-radius:14px;background:var(--purple);color:#fff;display:grid;place-items:center;font-family:var(--font-display);font-weight:700;font-size:18px', text: initials(c.nombre) }),
        el('div', { class: 'grow', style: 'min-width:0' }, [
          el('b', { style: 'font-family:var(--font-display);font-size:16px;display:block', text: c.nombre }),
          el('small', { class: 'muted', text: c.cargo || 'Contratista' }),
        ]),
      ]),
      el('div', { class: 'col', style: 'gap:6px;font-size:13px;margin-bottom:14px' }, [
        el('span', { class: 'row muted', html: icon('mail', '') + ' ' + (c.email || '—') }),
        el('span', { class: 'row muted', html: icon('badge') + ' ' + (contrato ? contrato.numero : 'Sin contrato') }),
        el('span', { class: 'row muted', html: icon('assignment') + ' ' + nActs + ' actividades' }),
      ]),
      el('div', { class: 'row', style: 'gap:8px' }, [
        el('button', { class: 'btn btn-ghost btn-sm grow', onclick: () => openFicha(c), html: icon('edit') + ' Editar ficha' }),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: () => del(c), html: icon('delete') }),
      ]),
    ]));
  });
  mount.appendChild(grid);

  function del(c) {
    confirmDialog(`¿Eliminar a ${c.nombre}? Se conservarán sus actividades.`, async () => {
      await API.deleteContractista(c.id);
      Store.contractistas = Store.contractistas.filter(x => x.id !== c.id);
      toast('Contratista eliminado', 'ok'); renderContractistas(mount);
    });
  }

  /* ---------- Ficha editable (contratista + contrato) ---------- */
  function openFicha(c = {}) {
    const k = Store.contracts.find(x => x.contractistaId === c.id) || {};
    const f = {}; // inputs
    const I = (key, val = '', attrs = {}) => (f[key] = input({ value: val ?? '', ...attrs }));
    const T = (key, val = '') => (f[key] = textarea({ value: val ?? '' }));

    const body = el('div', {}, [
      el('p', { class: 'ai-tag', style: 'margin-bottom:14px', html: icon('person') + ' Datos del contratista' }),
      el('div', { class: 'form-grid' }, [
        field('Nombre completo', I('nombre', c.nombre), true),
        field('Documento', I('documento', c.documento)),
        field('Teléfono', I('telefono', c.telefono)),
        field('Correo', I('email', c.email, { type: 'email' })),
        field('Cargo / rol', I('cargo', c.cargo)),
      ]),
      el('p', { class: 'ai-tag', style: 'margin:18px 0 14px', html: icon('description') + ' Información contractual' }),
      el('div', { class: 'form-grid' }, [
        field('Número del contrato', I('numero', k.numero)),
        field('Dependencia', I('dependencia', k.dependencia)),
        field('Objeto del contrato', T('objeto', k.objeto), true),
        field('Supervisor', I('supervisor', k.supervisor)),
        field('Plazo inicial', I('plazoInicial', k.plazoInicial)),
        field('Prórroga', I('prorroga', k.prorroga)),
        field('Plazo total', I('plazoTotal', k.plazoTotal)),
        field('Valor inicial', I('valorInicial', k.valorInicial, { type: 'number' })),
        field('Valor adición', I('valorAdicion', k.valorAdicion, { type: 'number' })),
        field('Valor total', I('valorTotal', k.valorTotal, { type: 'number' })),
        field('Fecha inicio', I('fechaInicio', k.fechaInicio, { type: 'date' })),
        field('Fecha terminación', I('fechaTerminacion', k.fechaTerminacion, { type: 'date' })),
        field('Fecha de corte', I('fechaCorte', k.fechaCorte, { type: 'date' })),
        field('Fecha entrega informe', I('fechaEntregaInforme', k.fechaEntregaInforme, { type: 'date' })),
      ]),
    ]);

    const save = el('button', { class: 'btn btn-primary', html: icon('save') + ' Guardar' });
    const cancel = el('button', { class: 'btn btn-ghost', text: 'Cancelar' });
    const m = modal({ title: c.id ? 'Editar ficha' : 'Nuevo contratista', body, footer: [cancel, save], size: 'lg' });
    cancel.onclick = m.close;

    save.onclick = async () => {
      const val = key => f[key]?.value;
      try {
        const contractista = await API.saveContractista({ id: c.id, nombre: val('nombre'), documento: val('documento'), telefono: val('telefono'), email: val('email'), cargo: val('cargo') });
        if (!c.id) Store.contractistas.push(contractista); else Object.assign(Store.contractistas.find(x => x.id === c.id), contractista);

        const contractData = { id: k.id, contractistaId: contractista.id,
          numero: val('numero'), dependencia: val('dependencia'), objeto: val('objeto'), supervisor: val('supervisor'),
          plazoInicial: val('plazoInicial'), prorroga: val('prorroga'), plazoTotal: val('plazoTotal'),
          valorInicial: +val('valorInicial') || 0, valorAdicion: +val('valorAdicion') || 0, valorTotal: +val('valorTotal') || 0,
          fechaInicio: val('fechaInicio'), fechaTerminacion: val('fechaTerminacion'), fechaCorte: val('fechaCorte'), fechaEntregaInforme: val('fechaEntregaInforme') };
        const saved = await API.saveContract(contractData);
        const idx = Store.contracts.findIndex(x => x.contractistaId === contractista.id);
        if (idx >= 0) Store.contracts[idx] = saved; else Store.contracts.push(saved);

        toast('Ficha guardada', 'ok'); m.close(); renderContractistas(mount);
      } catch (e) { toast(e.message, 'err'); }
    };
  }
}
