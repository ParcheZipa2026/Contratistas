/* =====================================================================
   api.js — Capa de comunicación con el backend (Google Apps Script)
   ---------------------------------------------------------------------
   - Habla con Apps Script vía fetch (acción + payload).
   - En MODO DEMO opera 100% en memoria (sin red) para probar la UI.
   - Centraliza subida de fotos (base64 -> Drive en el backend).
   ===================================================================== */
import { CONFIG, IS_DEMO } from './config.js';
import { Store } from './store.js';

const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);

/* Llamada genérica al backend. Apps Script recibe JSON por POST. */
async function call(action, payload = {}) {
  if (IS_DEMO()) return demo(action, payload);
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    // text/plain evita el preflight CORS de Apps Script.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: CONFIG.API_TOKEN, payload }),
  });
  if (!res.ok) throw new Error('Error de red: ' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error del servidor');
  return data.result;
}

export const API = {
  // ---- Sesión ----
  login: (role, name, contractistaId) => call('login', { role, name, contractistaId }),

  // ---- Datos base ----
  bootstrap: () => call('bootstrap'),

  // ---- Contratistas (CRUD) ----
  listContractistas: () => call('listContractistas'),
  saveContractista: (c) => call('saveContractista', c),
  deleteContractista: (id) => call('deleteContractista', { id }),
  saveContract: (k) => call('saveContract', k),

  // ---- Obligaciones (CRUD + reordenar) ----
  saveObligacion: (o) => call('saveObligacion', o),
  deleteObligacion: (id) => call('deleteObligacion', { id }),
  reorderObligaciones: (ids) => call('reorderObligaciones', { ids }),

  // ---- Actividades (CRUD + fotos) ----
  saveActividad: (a) => call('saveActividad', a),
  deleteActividad: (id) => call('deleteActividad', { id }),
  duplicateActividad: (id) => call('duplicateActividad', { id }),

  // ---- IA + Informes ----
  analyze: (range) => call('analyzeIA', range),
  generateReport: (range) => call('generateReport', range), // devuelve {url} del .docx en Drive
};

/* ---------------------------------------------------------------------
   Implementación DEMO (espejo del backend, en memoria)
   ------------------------------------------------------------------- */
async function demo(action, p) {
  await new Promise(r => setTimeout(r, 220)); // simula latencia
  const A = Store;
  switch (action) {
    case 'login':
      return { role: p.role, name: p.name, contractistaId: p.contractistaId || 'c1' };

    case 'bootstrap':
      return { contracts: A.contracts, contractistas: A.contractistas, obligaciones: A.obligaciones, actividades: A.actividades };

    case 'listContractistas':
      return A.contractistas;

    case 'saveContractista': {
      if (p.id) { Object.assign(A.contractistas.find(c => c.id === p.id), p); return p; }
      const c = { ...p, id: uid('c') }; A.contractistas.push(c); return c;
    }
    case 'deleteContractista':
      A.contractistas = A.contractistas.filter(c => c.id !== p.id); return { id: p.id };

    case 'saveContract': {
      const existing = A.contracts.find(k => k.id === p.id);
      if (existing) { Object.assign(existing, p); return existing; }
      const k = { ...p, id: uid('k') }; A.contracts.push(k); return k;
    }

    case 'saveObligacion': {
      if (p.id) { Object.assign(A.obligaciones.find(o => o.id === p.id), p); return p; }
      const o = { ...p, id: uid('o'), orden: A.obligaciones.length + 1 }; A.obligaciones.push(o); return o;
    }
    case 'deleteObligacion':
      A.obligaciones = A.obligaciones.filter(o => o.id !== p.id); return { id: p.id };
    case 'reorderObligaciones':
      p.ids.forEach((id, i) => { const o = A.obligaciones.find(x => x.id === id); if (o) o.orden = i + 1; });
      A.obligaciones.sort((a, b) => a.orden - b.orden); return { ok: true };

    case 'saveActividad': {
      if (p.id) { Object.assign(A.actividades.find(a => a.id === p.id), p); return p; }
      const a = { ...p, id: uid('a'), contractistaId: p.contractistaId || A.session?.contractistaId || 'c1' };
      A.actividades.unshift(a); return a;
    }
    case 'deleteActividad':
      A.actividades = A.actividades.filter(a => a.id !== p.id); return { id: p.id };
    case 'duplicateActividad': {
      const src = A.actividades.find(a => a.id === p.id);
      const copy = { ...src, id: uid('a'), fecha: new Date().toISOString().slice(0, 10) };
      A.actividades.unshift(copy); return copy;
    }

    case 'analyzeIA':
      return demoAnalysis(range(p));
    case 'generateReport':
      return { url: '#demo-no-backend', demo: true };

    default:
      throw new Error('Acción demo no soportada: ' + action);
  }
}

function range(p) {
  const all = Store.visibleActividades();
  if (!p?.from && !p?.to) return all;
  return all.filter(a => (!p.from || a.fecha >= p.from) && (!p.to || a.fecha <= p.to));
}

/* Análisis IA simulado (en producción lo hace el backend con la API real). */
function demoAnalysis(acts) {
  const byObl = {};
  Store.obligaciones.forEach(o => byObl[o.id] = { nombre: o.nombre, count: 0 });
  acts.forEach(a => { if (byObl[a.obligacionId]) byObl[a.obligacionId].count++; });
  const sin = Object.values(byObl).filter(o => o.count === 0).map(o => o.nombre);
  const pocas = Object.values(byObl).filter(o => o.count > 0 && o.count < 2).map(o => o.nombre);

  return {
    resumen: `Durante el periodo se registraron ${acts.length} actividades distribuidas en ${Object.values(byObl).filter(o => o.count > 0).length} obligaciones. El nivel de evidencia es adecuado, con oportunidad de mejora en la cobertura de algunas obligaciones.`,
    hallazgos: [
      ...(sin.length ? [`Obligaciones sin actividades: ${sin.join('; ')}.`] : []),
      ...(pocas.length ? [`Obligaciones con baja actividad: ${pocas.join('; ')}.`] : []),
      'Se identifica concentración de actividades en la Casa de la Juventud.',
    ],
    fortalezas: [
      'Registro constante de evidencias fotográficas.',
      'Diversidad de lugares y públicos atendidos.',
    ],
    recomendaciones: [
      ...(sin.length ? ['Programar actividades para las obligaciones sin evidencia.'] : []),
      'Ampliar descripciones para evitar textos repetidos.',
      'Mantener mínimo dos evidencias por actividad.',
    ],
    indicadores: {
      totalActividades: acts.length,
      totalFotos: acts.reduce((s, a) => s + (a.fotos?.length || 0), 0),
      cumplimiento: Math.round((Object.values(byObl).filter(o => o.count > 0).length / Object.keys(byObl).length) * 100),
    },
    porObligacion: byObl,
  };
}
