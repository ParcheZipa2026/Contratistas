/* =====================================================================
   views/actividades.js — Registro de actividades + Historial (timeline)
   ---------------------------------------------------------------------
   El contratista NO redacta informes: solo registra actividades.
   Formulario: fecha, obligación (obligatoria), lugar, descripción,
   máximo 2 fotos. Extras: dictado por voz, geolocalización.
   Historial: línea de tiempo con editar / eliminar / duplicar / ver fotos.
   Filtro por obligación (agrupación que alimenta el informe).
   ===================================================================== */
import { Store } from '../store.js';
import { API } from '../api.js';
import { CONFIG } from '../config.js';
import { el, icon, toast, modal, confirmDialog, fmtDate, fmtDateLong, lightbox, field, input, textarea, fileToBase64 } from '../ui.js';

let activeFilter = 'all';

export function renderActividades(mount) {
  mount.innerHTML = '';

  mount.appendChild(el('div', { class: 'spread', style: 'margin-bottom:18px' }, [
    el('div', {}, [el('h2', { style: 'font-size:22px', text: 'Actividades' }), el('p', { class: 'muted', text: 'Registra una actividad y agrúpala por obligación.' })]),
    el('button', { class: 'btn btn-yellow', onclick: () => openForm(), html: icon('add_a_photo') + ' Registrar actividad' }),
  ]));

  // ---------- Filtro por obligación ----------
  const obls = Store.visibleObligaciones();
  const filterBar = el('div', { class: 'row wrap', style: 'gap:8px;margin-bottom:18px' });
  const chip = (id, label, color) => el('button', {
    class: 'chip' + (activeFilter === id ? '' : ''),
    style: `cursor:pointer;height:34px;${activeFilter === id ? `background:${color || 'var(--purple)'};color:#fff` : ''}`,
    onclick: () => { activeFilter = id; renderActividades(mount); }, text: label,
  });
  filterBar.appendChild(chip('all', 'Todas', 'var(--ink)'));
  obls.forEach(o => filterBar.appendChild(chip(o.id, o.nombre.length > 26 ? o.nombre.slice(0, 26) + '…' : o.nombre, o.color)));
  mount.appendChild(filterBar);

  // ---------- Timeline ----------
  let acts = Store.visibleActividades().sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (activeFilter !== 'all') acts = acts.filter(a => a.obligacionId === activeFilter);

  if (!acts.length) {
    mount.appendChild(el('div', { class: 'empty' }, [el('span', { class: 'material-symbols-rounded', text: 'photo_camera' }), el('h4', { text: 'Sin actividades' }), el('p', { class: 'muted', text: 'Registra tu primera actividad del periodo.' })]));
    return;
  }

  const tl = el('div', { class: 'timeline' });
  acts.forEach(a => {
    const o = obls.find(x => x.id === a.obligacionId) || {};
    const photos = el('div', { class: 'tl-photos' });
    (a.fotos || []).forEach(src => photos.appendChild(el('img', { src, alt: 'evidencia', onclick: () => lightbox(src) })));

    tl.appendChild(el('div', { class: 'tl-item' }, [
      el('div', { class: 'tl-dot', style: `background:${o.color || 'var(--lilac)'}` }),
      el('div', { class: 'tl-card' }, [
        el('div', { class: 'spread', style: 'margin-bottom:6px' }, [
          el('div', { class: 'row', style: 'gap:8px' }, [
            el('span', { class: 'chip', style: `background:${(o.color || '#999')}22;color:${o.color || '#555'}`, html: icon(o.icon || 'task') + ' ' + (o.nombre || 'Sin obligación') }),
          ]),
          el('div', { class: 'row', style: 'gap:2px' }, [
            el('button', { class: 'icon-btn', title: 'Editar', onclick: () => openForm(a), html: icon('edit') }),
            el('button', { class: 'icon-btn', title: 'Duplicar', onclick: () => dup(a), html: icon('content_copy') }),
            el('button', { class: 'icon-btn', title: 'Eliminar', onclick: () => del(a), html: icon('delete') }),
          ]),
        ]),
        el('p', { style: 'font-weight:500;margin:4px 0', text: a.descripcion }),
        el('div', { class: 'row muted tiny', style: 'gap:14px' }, [
          el('span', { class: 'row', html: icon('event') + ' ' + fmtDate(a.fecha) }),
          el('span', { class: 'row', html: icon('location_on') + ' ' + a.lugar }),
          (a.fotos?.length ? el('span', { class: 'row', html: icon('image') + ' ' + a.fotos.length + ' foto(s)' }) : null),
        ]),
        a.fotos?.length ? photos : null,
      ]),
    ]));
  });
  mount.appendChild(tl);

  function del(a) { confirmDialog('¿Eliminar esta actividad?', async () => { await API.deleteActividad(a.id); Store.actividades = Store.actividades.filter(x => x.id !== a.id); toast('Actividad eliminada', 'ok'); renderActividades(mount); }); }
  async function dup(a) { try { const c = await API.duplicateActividad(a.id); if (c) { Store.actividades.unshift(c); } toast('Actividad duplicada', 'ok'); renderActividades(mount); } catch (e) { toast(e.message, 'err'); } }

  /* ---------- Formulario ---------- */
  function openForm(a = {}) {
    const obls = Store.visibleObligaciones();
    if (!obls.length) return toast('No hay obligaciones asignadas todavía.', 'err');

    const fecha = input({ type: 'date', value: a.fecha || new Date().toISOString().slice(0, 10) });
    const oblSel = el('select', {});
    obls.forEach(o => { const op = el('option', { value: o.id, text: o.nombre }); if (o.id === a.obligacionId) op.selected = true; oblSel.appendChild(op); });
    const lugar = input({ value: a.lugar || '', placeholder: 'Ej: Casa de la Juventud' });
    const desc = textarea({ value: a.descripcion || '', placeholder: 'Describe qué hiciste, con quién y los resultados…' });

    // Geolocalización
    const geoBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-sm', html: icon('my_location') + ' Usar mi ubicación' });
    geoBtn.onclick = () => {
      if (!navigator.geolocation) return toast('Geolocalización no disponible', 'err');
      geoBtn.innerHTML = '<span class="spinner"></span> Ubicando…';
      navigator.geolocation.getCurrentPosition(
        pos => { lugar.value = lugar.value || `Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}`; geoBtn.innerHTML = icon('check') + ' Ubicación añadida'; toast('Ubicación detectada', 'ok'); },
        () => { geoBtn.innerHTML = icon('my_location') + ' Usar mi ubicación'; toast('No se pudo obtener la ubicación', 'err'); }
      );
    };

    // Dictado por voz (Web Speech API)
    const micBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-sm', html: icon('mic') + ' Dictar descripción' });
    setupDictation(micBtn, desc);

    // Fotos (máx 2) — dropzone + carga
    let fotos = [...(a.fotos || [])]; // urls existentes
    let nuevos = []; // archivos nuevos (dataUrl)
    const thumbs = el('div', { class: 'thumbs' });
    const fileInput = input({ type: 'file', accept: 'image/*', multiple: 'true', style: 'display:none' });
    const dz = el('div', { class: 'dropzone' }, [el('span', { class: 'material-symbols-rounded', style: 'font-size:36px', text: 'cloud_upload' }), el('p', { text: 'Arrastra o toca para subir (máx. ' + CONFIG.MAX_PHOTOS + ')' })]);

    function renderThumbs() {
      thumbs.innerHTML = '';
      const all = [...fotos.map(u => ({ url: u, existing: true })), ...nuevos.map(n => ({ url: n.dataUrl }))];
      all.forEach((p, i) => thumbs.appendChild(el('div', { class: 'thumb' }, [
        el('img', { src: p.url }),
        el('button', { type: 'button', onclick: () => { if (p.existing) fotos.splice(fotos.indexOf(p.url), 1); else nuevos.splice(i - fotos.length, 1); renderThumbs(); }, html: icon('close') }),
      ])));
    }
    async function addFiles(list) {
      for (const file of list) {
        if (fotos.length + nuevos.length >= CONFIG.MAX_PHOTOS) { toast('Máximo ' + CONFIG.MAX_PHOTOS + ' fotos', 'err'); break; }
        if (file.size > CONFIG.PHOTO_MAX_MB * 1024 * 1024) { toast('Imagen muy pesada (máx ' + CONFIG.PHOTO_MAX_MB + 'MB)', 'err'); continue; }
        nuevos.push(await fileToBase64(file));
      }
      renderThumbs();
    }
    dz.onclick = () => fileInput.click();
    fileInput.onchange = e => addFiles([...e.target.files]);
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove('over'); addFiles([...e.dataTransfer.files]); };
    renderThumbs();

    const body = el('div', {}, [
      el('div', { class: 'form-grid' }, [
        field('Fecha', fecha),
        field('Obligación (obligatoria)', oblSel),
        field('Lugar', lugar, true),
      ]),
      el('div', { class: 'row', style: 'gap:8px;margin-bottom:10px' }, [geoBtn, micBtn]),
      field('Descripción de la actividad', desc, true),
      el('label', { style: 'font-size:12.5px;font-weight:600;color:var(--text-soft);display:block;margin-bottom:6px', text: 'Evidencias fotográficas' }),
      dz, fileInput, thumbs,
    ]);

    const save = el('button', { class: 'btn btn-primary', html: icon('save') + ' Guardar actividad' });
    const cancel = el('button', { class: 'btn btn-ghost', text: 'Cancelar' });
    const m = modal({ title: a.id ? 'Editar actividad' : 'Registrar actividad', body, footer: [cancel, save], size: 'lg' });
    cancel.onclick = m.close;

    save.onclick = async () => {
      if (!desc.value.trim()) return toast('Describe la actividad', 'err');
      save.disabled = true; save.innerHTML = '<span class="spinner"></span> Guardando…';
      try {
        const payload = {
          id: a.id, fecha: fecha.value, obligacionId: oblSel.value, lugar: lugar.value.trim() || 'No especificado',
          descripcion: desc.value.trim(),
          fotos,                      // urls que se conservan
          nuevasFotos: nuevos,        // {name,type,base64} -> backend sube a Drive
          contractistaId: a.contractistaId || Store.session.contractistaId,
        };
        const saved = await API.saveActividad(payload);
        // En demo, las nuevas fotos quedan como dataURL para previsualización.
        if (saved && !saved.fotos) saved.fotos = [...fotos, ...nuevos.map(n => n.dataUrl)];
        if (!a.id) Store.actividades.unshift(saved); else Object.assign(Store.actividades.find(x => x.id === a.id), saved);
        toast('Actividad guardada', 'ok'); m.close(); renderActividades(mount);
      } catch (e) { toast(e.message, 'err'); save.disabled = false; save.innerHTML = icon('save') + ' Guardar actividad'; }
    };
  }
}

/* Dictado por voz con reconocimiento del navegador */
function setupDictation(btn, target) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { btn.disabled = true; btn.title = 'No soportado en este navegador'; return; }
  const rec = new SR(); rec.lang = 'es-CO'; rec.interimResults = true; rec.continuous = true;
  let on = false, base = '';
  rec.onresult = (e) => {
    let txt = '';
    for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
    target.value = (base ? base + ' ' : '') + txt;
  };
  rec.onend = () => { on = false; btn.innerHTML = icon('mic') + ' Dictar descripción'; btn.style.background = ''; };
  btn.onclick = () => {
    if (on) { rec.stop(); return; }
    base = target.value.trim(); on = true; btn.innerHTML = icon('stop_circle') + ' Grabando… (toca para parar)'; btn.style.background = 'var(--bad)'; btn.style.color = '#fff';
    try { rec.start(); } catch { /* ya activo */ }
  };
}
