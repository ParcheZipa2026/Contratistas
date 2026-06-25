/* =====================================================================
   views/informes.js — Generador de informes con IA
   ---------------------------------------------------------------------
   El usuario elige fecha inicial y final. La IA analiza las actividades
   y se genera un documento Word agrupando por obligación.
   - En producción: el backend (Apps Script) crea el .docx en Drive y
     devuelve su URL de descarga.
   - En modo demo: se construye un Word (.doc compatible) en el navegador
     para que puedas ver la estructura exacta del informe.
   ===================================================================== */
import { Store } from '../store.js';
import { API } from '../api.js';
import { IS_DEMO } from '../config.js';
import { el, icon, toast, money, fmtDate, fmtDateLong, field, input } from '../ui.js';

export function renderInformes(mount) {
  mount.innerHTML = '';
  const acts = Store.visibleActividades();
  const fechas = acts.map(a => a.fecha).sort();
  const defFrom = fechas[0] || new Date().toISOString().slice(0, 10);
  const defTo = fechas[fechas.length - 1] || new Date().toISOString().slice(0, 10);

  const from = input({ type: 'date', value: defFrom });
  const to = input({ type: 'date', value: defTo });

  // ---------- Panel de control ----------
  const analyzeBtn = el('button', { class: 'btn btn-ghost', html: icon('psychology') + ' Analizar con IA' });
  const genBtn = el('button', { class: 'btn btn-primary', html: icon('description') + ' Generar Informe Word' });

  mount.appendChild(el('div', { class: 'card', style: 'margin-bottom:18px' }, [
    el('div', { class: 'spread', style: 'margin-bottom:16px' }, [
      el('h3', { html: icon('auto_awesome') + ' Generador de informes' }),
      el('span', { class: 'ai-tag', html: icon('bolt') + ' IA' }),
    ]),
    el('p', { class: 'muted', style: 'margin-bottom:16px', text: 'Selecciona el periodo. La IA agrupa automáticamente las actividades por obligación y construye el informe — el contratista no redacta nada.' }),
    el('div', { class: 'row wrap', style: 'gap:14px;align-items:flex-end' }, [
      field('Fecha inicial', from), field('Fecha final', to),
      el('div', { class: 'row', style: 'gap:10px' }, [analyzeBtn, genBtn]),
    ]),
  ]));

  const out = el('div', { id: 'informe-out' });
  mount.appendChild(out);

  analyzeBtn.onclick = async () => {
    analyzeBtn.disabled = true; analyzeBtn.innerHTML = '<span class="spinner"></span> Analizando…';
    try { renderAnalysis(out, await API.analyze({ from: from.value, to: to.value }), from.value, to.value); }
    catch (e) { toast(e.message, 'err'); }
    analyzeBtn.disabled = false; analyzeBtn.innerHTML = icon('psychology') + ' Analizar con IA';
  };

  genBtn.onclick = async () => {
    genBtn.disabled = true; genBtn.innerHTML = '<span class="spinner"></span> Generando…';
    try {
      if (IS_DEMO()) {
        const analysis = await API.analyze({ from: from.value, to: to.value });
        buildWordClient(from.value, to.value, analysis);
        toast('Informe Word descargado (modo demo)', 'ok');
      } else {
        const res = await API.generateReport({ from: from.value, to: to.value });
        if (res?.url) { window.open(res.url, '_blank'); toast('Informe generado en Drive', 'ok'); }
        else toast('El backend no devolvió la URL del informe', 'err');
      }
    } catch (e) { toast(e.message, 'err'); }
    genBtn.disabled = false; genBtn.innerHTML = icon('description') + ' Generar Informe Word';
  };

  // Análisis automático al entrar
  analyzeBtn.click();
}

/* ---------- Render del análisis IA en pantalla ---------- */
function renderAnalysis(out, A, from, to) {
  out.innerHTML = '';
  const ind = A.indicadores || {};

  out.appendChild(el('div', { class: 'grid grid-kpi', style: 'margin-bottom:18px' }, [
    kpi('assignment', 'var(--purple)', ind.totalActividades ?? 0, 'Actividades'),
    kpi('photo_library', 'var(--neon-deep)', ind.totalFotos ?? 0, 'Evidencias'),
    kpi('percent', (ind.cumplimiento ?? 0) >= 75 ? 'var(--ok)' : 'var(--warn)', (ind.cumplimiento ?? 0) + '%', 'Cumplimiento'),
  ]));

  out.appendChild(el('div', { class: 'ai-box', style: 'margin-bottom:18px' }, [
    el('span', { class: 'ai-tag', html: icon('summarize') + ' Resumen ejecutivo' }),
    el('p', { style: 'margin-top:10px', text: A.resumen }),
  ]));

  const cols = el('div', { class: 'grid grid-2' });
  cols.appendChild(listCard('travel_explore', 'Hallazgos', A.hallazgos, 'warn'));
  cols.appendChild(listCard('verified', 'Fortalezas', A.fortalezas, 'ok'));
  out.appendChild(cols);
  out.appendChild(el('div', { style: 'margin-top:18px' }, [listCard('lightbulb', 'Recomendaciones', A.recomendaciones, 'info')]));
}

function kpi(ic, bg, val, lbl) {
  return el('div', { class: 'card kpi' }, [el('div', { class: 'ico', style: `background:${bg}`, html: icon(ic) }), el('div', { class: 'val mono', text: String(val) }), el('div', { class: 'lbl', text: lbl })]);
}
function listCard(ic, title, items, cls) {
  const ul = el('div', { class: 'col', style: 'gap:10px' });
  (items || []).forEach(t => ul.appendChild(el('div', { class: 'row', style: 'gap:10px;align-items:flex-start' }, [el('span', { class: 'material-symbols-rounded', style: 'font-size:18px;color:var(--purple)', text: 'chevron_right' }), el('span', { text: t })])));
  if (!items?.length) ul.appendChild(el('p', { class: 'muted', text: 'Sin elementos.' }));
  return el('div', { class: 'card' }, [el('div', { class: 'card-h' }, [el('h3', { html: icon(ic) + ' ' + title })]), ul]);
}

/* =====================================================================
   Generación de Word en el cliente (modo demo)
   Word abre HTML guardado como .doc, conservando estructura, tablas e
   imágenes. La versión .docx "real" la produce Apps Script.
   ===================================================================== */
function buildWordClient(from, to, A) {
  const acts = Store.visibleActividades().filter(a => (!from || a.fecha >= from) && (!to || a.fecha <= to));
  const obls = Store.visibleObligaciones();
  const contratista = Store.contractistas.find(c => c.id === Store.session.contractistaId) || Store.contractistas[0] || {};
  const k = Store.contracts.find(x => x.contractistaId === contratista.id) || Store.contracts[0] || {};

  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const row = (a, b) => `<tr><td style="background:#F4F0FF;font-weight:bold;width:35%">${a}</td><td>${esc(b) || '—'}</td></tr>`;

  // Secciones por obligación
  let oblSections = '';
  obls.forEach((o, idx) => {
    const list = acts.filter(a => a.obligacionId === o.id);
    if (!list.length) return;
    oblSections += `<h2 style="color:#6C3BFF">Obligación ${idx + 1}. ${esc(o.nombre)}</h2>`;
    oblSections += `<p><i>${esc(o.descripcion || '')}</i></p>`;
    list.forEach((a, i) => {
      oblSections += `<h3>Actividad ${i + 1} — ${fmtDate(a.fecha)} · ${esc(a.lugar)}</h3>`;
      oblSections += `<p>${esc(a.descripcion)}</p>`;
      (a.fotos || []).forEach(src => { oblSections += `<p><img src="${src}" width="320" style="border-radius:8px"/></p>`; });
    });
    oblSections += `<p style="background:#EDE6FF;padding:10px;border-left:4px solid #6C3BFF"><b>Observación IA:</b> Se evidencia cumplimiento de la obligación con ${list.length} actividad(es) y ${list.reduce((s, a) => s + (a.fotos?.length || 0), 0)} soporte(s) fotográfico(s).</p>`;
  });

  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Informe</title>
  <style>
    body{font-family:'Calibri',sans-serif;color:#1D1330;line-height:1.5;margin:48px}
    h1{color:#6C3BFF} h2{color:#6C3BFF;border-bottom:2px solid #2BFFAC;padding-bottom:4px;margin-top:28px}
    table{border-collapse:collapse;width:100%;margin:14px 0} td{border:1px solid #E7E0FB;padding:8px}
    .cover{text-align:center;padding:80px 0} .cover h1{font-size:34px}
  </style></head><body>
  <div class="cover">
    <p style="color:#6C3BFF;font-weight:bold;letter-spacing:2px">PARCHE ZIPA</p>
    <h1>INFORME DE ACTIVIDADES</h1>
    <p>${esc(Store.session.name || contratista.nombre)}</p>
    <p>Periodo: ${fmtDate(from)} — ${fmtDate(to)}</p>
    <p style="color:#6B6188">Programa de Juventudes · Secretaría de Familia y Desarrollo Social de Zipaquirá</p>
  </div>
  <h2>1. Información contractual</h2>
  <table>
    ${row('Número del contrato', k.numero)}
    ${row('Objeto', k.objeto)}
    ${row('Contratista', contratista.nombre)}
    ${row('Dependencia', k.dependencia)}
    ${row('Supervisor', k.supervisor)}
    ${row('Plazo total', k.plazoTotal)}
    ${row('Valor total', k.valorTotal ? money(k.valorTotal) : '')}
    ${row('Fecha de corte', k.fechaCorte ? fmtDate(k.fechaCorte) : '')}
  </table>
  <h2>2. Resumen ejecutivo</h2>
  <p>${esc(A.resumen)}</p>
  <h2>3. Obligaciones del contrato</h2>
  <table><tr><td style="background:#6C3BFF;color:#fff"><b>#</b></td><td style="background:#6C3BFF;color:#fff"><b>Obligación</b></td><td style="background:#6C3BFF;color:#fff"><b>Actividades</b></td></tr>
  ${obls.map((o, i) => `<tr><td>${i + 1}</td><td>${esc(o.nombre)}</td><td>${acts.filter(a => a.obligacionId === o.id).length}</td></tr>`).join('')}
  </table>
  <h2>4. Desarrollo por obligación</h2>
  ${oblSections}
  <h2>5. Conclusiones y recomendaciones</h2>
  <p><b>Fortalezas:</b></p><ul>${(A.fortalezas || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
  <p><b>Hallazgos:</b></p><ul>${(A.hallazgos || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
  <p><b>Recomendaciones:</b></p><ul>${(A.recomendaciones || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
  <h2>6. Análisis de cumplimiento (IA)</h2>
  <p>Total de actividades: ${A.indicadores?.totalActividades}. Evidencias: ${A.indicadores?.totalFotos}. Cumplimiento estimado: ${A.indicadores?.cumplimiento}%.</p>
  </body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Informe_${(contratista.nombre || 'contratista').replace(/\s+/g, '_')}_${from}_${to}.doc`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
