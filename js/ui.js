/* =====================================================================
   ui.js — Componentes y utilidades de interfaz reutilizables
   ===================================================================== */

/* Crea un elemento con atributos/hijos. el('div',{class:'x'},[...]) */
export function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null || c === false) return;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return n;
}

/* Icono Material Symbols */
export const icon = (name, extra = '') =>
  `<span class="material-symbols-rounded ${extra}">${name}</span>`;

/* Avatar con iniciales */
export function initials(name = '?') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ---------- Formato ---------- */
export const money = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);

export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const fmtDateLong = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/* ---------- Toast ---------- */
export function toast(msg, type = 'info', ms = 3200) {
  const root = document.getElementById('toast-root');
  const ic = { ok: 'check_circle', err: 'error', info: 'info' }[type] || 'info';
  const t = el('div', { class: `toast ${type}` }, [el('span', { class: 'material-symbols-rounded', text: ic }), el('span', { text: msg })]);
  root.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(24px)'; setTimeout(() => t.remove(), 250); }, ms);
}

/* ---------- Modal ---------- */
export function modal({ title, body, footer, size = '' }) {
  const root = document.getElementById('modal-root');
  const overlay = el('div', { class: 'overlay' });
  const m = el('div', { class: 'modal ' + size });
  const close = () => overlay.remove();
  m.appendChild(el('div', { class: 'modal-h' }, [
    el('h3', { text: title }),
    el('button', { class: 'icon-btn', onclick: close, 'aria-label': 'Cerrar', html: icon('close') }),
  ]));
  const b = el('div', { class: 'modal-b' });
  if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body);
  m.appendChild(b);
  if (footer) { const f = el('div', { class: 'modal-f' }); footer.forEach(x => f.appendChild(x)); m.appendChild(f); }
  overlay.appendChild(m);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  root.appendChild(overlay);
  return { close, body: b };
}

/* ---------- Confirmación ---------- */
export function confirmDialog(message, onYes, { danger = true, yesText = 'Eliminar' } = {}) {
  const yes = el('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), text: yesText });
  const no = el('button', { class: 'btn btn-ghost', text: 'Cancelar' });
  const m = modal({
    title: 'Confirmar',
    body: el('p', { class: 'muted', text: message }),
    footer: [no, yes],
  });
  no.onclick = m.close;
  yes.onclick = async () => { m.close(); await onYes(); };
}

/* ---------- Lightbox de imágenes ---------- */
export function lightbox(src) {
  const lb = el('div', { class: 'lightbox', onclick: () => lb.remove() }, [el('img', { src })]);
  document.body.appendChild(lb);
}

/* ---------- Estado vacío ---------- */
export const emptyState = (ic, title, sub) =>
  el('div', { class: 'empty' }, [
    el('span', { class: 'material-symbols-rounded', text: ic }),
    el('h4', { text: title }),
    el('p', { class: 'muted', text: sub || '' }),
  ]);

/* ---------- Campo de formulario ---------- */
export function field(label, inputEl, full = false) {
  const wrap = el('div', { class: 'field' + (full ? ' full' : '') }, [el('label', { text: label }), inputEl]);
  return wrap;
}
export const input = (attrs = {}) => el('input', attrs);
export const textarea = (attrs = {}) => el('textarea', attrs);
export function select(options, value, attrs = {}) {
  const s = el('select', attrs);
  options.forEach(o => {
    const opt = el('option', { value: o.value, text: o.label });
    if (o.value === value) opt.selected = true;
    s.appendChild(opt);
  });
  return s;
}

/* Convierte un File a base64 (para enviar al backend y subir a Drive). */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ name: file.name, type: file.type, dataUrl: r.result, base64: String(r.result).split(',')[1] });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* Semáforo de cumplimiento por porcentaje */
export function semaforo(pct) {
  const cls = pct >= 75 ? 'ok' : pct >= 40 ? 'warn' : 'bad';
  return el('span', { class: 'semaforo' }, [el('span', { class: 'dot ' + cls })]);
}
