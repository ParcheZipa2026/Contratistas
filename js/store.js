/* =====================================================================
   store.js — Estado de la aplicación (cliente)
   ---------------------------------------------------------------------
   - Mantiene sesión, datos cacheados y modo demo.
   - Persiste sesión en localStorage.
   - En modo demo, genera datos de ejemplo realistas.
   ===================================================================== */
import { IS_DEMO } from './config.js';

const LS_KEY = 'pz.session';

export const Store = {
  session: null,          // { role, name, contractistaId? }
  contracts: [],
  contractistas: [],
  obligaciones: [],
  actividades: [],
  config: {},

  // --- Sesión ---
  loadSession() {
    try { this.session = JSON.parse(localStorage.getItem(LS_KEY)) || null; }
    catch { this.session = null; }
    return this.session;
  },
  setSession(s) { this.session = s; localStorage.setItem(LS_KEY, JSON.stringify(s)); },
  clearSession() { this.session = null; localStorage.removeItem(LS_KEY); },

  isSupervisor() { return this.session?.role === 'supervisor'; },

  // Obligaciones visibles según rol (al contratista solo las suyas).
  visibleObligaciones() {
    if (this.isSupervisor()) return this.obligaciones;
    const id = this.session?.contractistaId;
    return this.obligaciones.filter(o => !o.contractistaId || o.contractistaId === id);
  },

  // Actividades visibles según rol.
  visibleActividades() {
    if (this.isSupervisor()) return this.actividades;
    const id = this.session?.contractistaId;
    return this.actividades.filter(a => a.contractistaId === id);
  },
};

/* ---------------------------------------------------------------------
   Datos demo
   ------------------------------------------------------------------- */
export function seedDemo() {
  if (!IS_DEMO()) return;

  Store.contractistas = [
    { id: 'c1', nombre: 'Laura Gómez', documento: '1075xxx123', email: 'laura@parchezipa.co', telefono: '3001234567', cargo: 'Gestora Casa de Juventud' },
    { id: 'c2', nombre: 'Andrés Rincón', documento: '1075xxx987', email: 'andres@parchezipa.co', telefono: '3019876543', cargo: 'Promotor cultural' },
  ];

  Store.contracts = [{
    id: 'k1', contractistaId: 'c1',
    numero: 'SFDS-2026-014',
    objeto: 'Apoyar la coordinación y el funcionamiento de la Casa de la Juventud del municipio de Zipaquirá.',
    dependencia: 'Secretaría de Familia y Desarrollo Social',
    supervisor: 'Carolina Méndez',
    plazoInicial: '4 meses', prorroga: '1 mes', plazoTotal: '5 meses',
    valorInicial: 12000000, valorAdicion: 3000000, valorTotal: 15000000,
    fechaInicio: '2026-02-01', fechaTerminacion: '2026-06-30',
    fechaCorte: '2026-06-24', fechaEntregaInforme: '2026-06-30',
  }];

  Store.obligaciones = [
    { id: 'o1', contractistaId: 'c1', orden: 1, nombre: 'Coordinar el funcionamiento de la Casa de Juventud', descripcion: 'Garantizar la apertura, agenda y atención de la Casa de la Juventud.', color: '#6C3BFF', icon: 'home_work', estado: 'activa' },
    { id: 'o2', contractistaId: 'c1', orden: 2, nombre: 'Promover actividades de participación juvenil', descripcion: 'Diseñar y ejecutar encuentros con jóvenes del municipio.', color: '#2BFFAC', icon: 'groups', estado: 'activa' },
    { id: 'o3', contractistaId: 'c1', orden: 3, nombre: 'Articular con instituciones educativas', descripcion: 'Coordinar con colegios y entidades aliadas.', color: '#FFC700', icon: 'school', estado: 'activa' },
    { id: 'o4', contractistaId: 'c1', orden: 4, nombre: 'Reportar evidencias y documentación', descripcion: 'Registrar evidencias y soportes de cada actividad.', color: '#3B9BFF', icon: 'fact_check', estado: 'activa' },
  ];

  const today = new Date();
  const d = (off) => { const x = new Date(today); x.setDate(x.getDate() - off); return x.toISOString().slice(0, 10); };
  const ph = (q) => `https://picsum.photos/seed/${q}/400/300`;

  Store.actividades = [
    { id: 'a1', contractistaId: 'c1', obligacionId: 'o1', fecha: d(1), lugar: 'Casa de la Juventud', descripcion: 'Apertura y atención de jóvenes; organización de la agenda semanal y recepción de inquietudes.', fotos: [ph('cj1'), ph('cj2')] },
    { id: 'a2', contractistaId: 'c1', obligacionId: 'o2', fecha: d(2), lugar: 'Parque Villaveces', descripcion: 'Encuentro de participación juvenil con 25 asistentes; dinámicas de liderazgo.', fotos: [ph('pj1')] },
    { id: 'a3', contractistaId: 'c1', obligacionId: 'o1', fecha: d(3), lugar: 'Casa de la Juventud', descripcion: 'Coordinación logística para el taller de la próxima semana y mantenimiento de espacios.', fotos: [ph('cj3')] },
    { id: 'a4', contractistaId: 'c1', obligacionId: 'o3', fecha: d(5), lugar: 'I.E. Técnico Industrial', descripcion: 'Reunión de articulación con rectoría para agenda conjunta de jóvenes.', fotos: [ph('ie1'), ph('ie2')] },
    { id: 'a5', contractistaId: 'c1', obligacionId: 'o2', fecha: d(7), lugar: 'Plaza de los Comuneros', descripcion: 'Jornada cultural juvenil; muestra artística y convocatoria.', fotos: [ph('pl1')] },
    { id: 'a6', contractistaId: 'c1', obligacionId: 'o1', fecha: d(9), lugar: 'Casa de la Juventud', descripcion: 'Atención y seguimiento a procesos; actualización del tablero de actividades.', fotos: [ph('cj4')] },
    { id: 'a7', contractistaId: 'c1', obligacionId: 'o4', fecha: d(11), lugar: 'Casa de la Juventud', descripcion: 'Consolidación de evidencias del mes y archivo fotográfico.', fotos: [ph('ev1')] },
  ];

  Store.session = Store.session; // se mantiene si ya hay sesión
}
