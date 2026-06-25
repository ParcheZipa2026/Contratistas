/* =====================================================================
   config.js — Configuración global
   ---------------------------------------------------------------------
   Configuración de Parche Zipa
   ===================================================================== */

export const CONFIG = {
  // URL de tu Google Apps Script
  API_URL: 'https://script.google.com/macros/s/AKfycbwYYPchbQIUN-mUJ21x3A6awxHzMDrLaiKVSVP_fLIUGg7p1qKcV10uqRdUZHDD0es7jA/exec',

  APP_NAME: 'Parche Zipa',
  ORG: 'Programa de Juventudes · Secretaría de Familia y Desarrollo Social de Zipaquirá',

  // Debe ser el mismo token que está en Apps Script
  API_TOKEN: 'parche-zipa-2026',

  MAX_PHOTOS: 2,
  PHOTO_MAX_MB: 8,

  // IA que usará el backend
  AI_PROVIDER: 'claude',

  REMINDER_HOUR: 18 // 6:00 PM
};

// Paletas de colores
export const OBL_COLORS = [
  '#6C3BFF',
  '#2BFFAC',
  '#FFC700',
  '#FF5470',
  '#3B9BFF',
  '#FF8A3D',
  '#16C784',
  '#B79CFF'
];

// Iconos
export const OBL_ICONS = [
  'home_work',
  'groups',
  'event',
  'campaign',
  'school',
  'handshake',
  'volunteer_activism',
  'sports_esports',
  'local_library',
  'palette',
  'forum',
  'map',
  'fact_check',
  'diversity_3',
  'celebration',
  'mic'
];

// Detecta si la aplicación está en modo demo
export const IS_DEMO = () => !CONFIG.API_URL;