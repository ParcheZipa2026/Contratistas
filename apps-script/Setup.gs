/**
 * =====================================================================
 *  Setup.gs — Configuración automática del backend
 * ---------------------------------------------------------------------
 *  Ejecuta UNA VEZ  setupParcheZipa()  desde el editor de Apps Script.
 *  Crea (si no existen):
 *    - Todas las hojas con sus encabezados.
 *    - La carpeta raíz en Google Drive.
 *    - Configuración inicial y datos de ejemplo (opcional).
 * =====================================================================
 */

/** Nombres canónicos de las hojas. */
var SHEETS = {
  CONTRATOS:     'Contratos',
  CONTRATISTAS:  'Contratistas',
  OBLIGACIONES:  'Obligaciones',
  ACTIVIDADES:   'Actividades',
  FOTOGRAFIAS:   'Fotografias',
  USUARIOS:      'Usuarios',
  CONFIG:        'Configuracion',
  LOGS:          'Logs',
};

/** Esquema de columnas por hoja (orden = orden de columnas). */
var SCHEMA = {
  Contratos:     ['id', 'contractistaId', 'numero', 'objeto', 'dependencia', 'supervisor',
                  'plazoInicial', 'prorroga', 'plazoTotal', 'valorInicial', 'valorAdicion',
                  'valorTotal', 'fechaInicio', 'fechaTerminacion', 'fechaCorte', 'fechaEntregaInforme'],
  Contratistas:  ['id', 'nombre', 'documento', 'email', 'telefono', 'cargo'],
  Obligaciones:  ['id', 'contractistaId', 'orden', 'nombre', 'descripcion', 'color', 'icon', 'estado'],
  Actividades:   ['id', 'contractistaId', 'obligacionId', 'fecha', 'lugar', 'descripcion',
                  'lat', 'lng', 'createdAt'],
  Fotografias:   ['id', 'actividadId', 'url', 'driveId', 'nombre', 'createdAt'],
  Usuarios:      ['id', 'role', 'nombre', 'contractistaId', 'email', 'activo'],
  Configuracion: ['clave', 'valor'],
  Logs:          ['fecha', 'tipo', 'detalle'],
};

/**
 * Punto de entrada de configuración. Idempotente: puedes ejecutarlo
 * varias veces sin duplicar hojas ni encabezados.
 */
function setupParcheZipa() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    // Escribe encabezados si la primera fila está vacía.
    var headers = SCHEMA[name];
    var firstRow = sh.getRange(1, 1, 1, headers.length).getValues()[0];
    var empty = firstRow.every(function (c) { return c === '' || c === null; });
    if (empty) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#6C3BFF').setFontColor('#FFFFFF');
      sh.setFrozenRows(1);
    }
  });

  // Elimina la hoja por defecto "Hoja 1"/"Sheet1" si quedó vacía.
  ['Hoja 1', 'Sheet1', 'Hoja1'].forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && s.getLastRow() <= 1 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  _ensureRootFolder();
  _seedConfig();

  SpreadsheetApp.getUi && _safeAlert('✅ Parche Zipa configurado.\nHojas y carpeta de Drive listas.');
  return 'OK';
}

/** Crea / recupera la carpeta raíz en Drive y guarda su id en Config. */
function _ensureRootFolder() {
  var existing = _config('DRIVE_ROOT_ID');
  if (existing) {
    try { DriveApp.getFolderById(existing); return existing; } catch (e) { /* recrear */ }
  }
  var folder = DriveApp.createFolder('Parche Zipa — Evidencias');
  _setConfig('DRIVE_ROOT_ID', folder.getId());
  return folder.getId();
}

/** Valores de configuración por defecto. */
function _seedConfig() {
  var defaults = {
    'AI_PROVIDER': 'claude',            // claude | openai | gemini
    'AI_API_KEY': '',                   // 👉 pega aquí tu API key
    'AI_MODEL_CLAUDE': 'claude-sonnet-4-6',
    'AI_MODEL_OPENAI': 'gpt-4o-mini',
    'AI_MODEL_GEMINI': 'gemini-1.5-flash',
    'REMINDER_HOUR': '18',
    'ORG': 'Programa de Juventudes · Secretaría de Familia y Desarrollo Social de Zipaquirá',
  };
  Object.keys(defaults).forEach(function (k) {
    if (_config(k) === null) _setConfig(k, defaults[k]);
  });
}

/**
 * (Opcional) Carga datos de ejemplo equivalentes al modo demo del
 * frontend. Útil para ver la app con contenido la primera vez.
 * Ejecútalo manualmente si lo deseas.
 */
function seedDemoData() {
  // Contratista demo
  saveContractista({ id: 'c1', nombre: 'Laura Gómez', documento: '1075xxx123', email: 'laura@parchezipa.co', telefono: '3001234567', cargo: 'Gestora Casa de Juventud' });

  // Usuario asociado
  upsertRow(SHEETS.USUARIOS, { id: 'u1', role: 'contratista', nombre: 'Laura Gómez', contractistaId: 'c1', email: 'laura@parchezipa.co', activo: 'TRUE' }, 'id');

  // Contrato
  saveContract({
    id: 'k1', contractistaId: 'c1', numero: 'SFDS-2026-014',
    objeto: 'Apoyar la coordinación y el funcionamiento de la Casa de la Juventud del municipio de Zipaquirá.',
    dependencia: 'Secretaría de Familia y Desarrollo Social', supervisor: 'Carolina Méndez',
    plazoInicial: '4 meses', prorroga: '1 mes', plazoTotal: '5 meses',
    valorInicial: 12000000, valorAdicion: 3000000, valorTotal: 15000000,
    fechaInicio: '2026-02-01', fechaTerminacion: '2026-06-30', fechaCorte: '2026-06-24', fechaEntregaInforme: '2026-06-30',
  });

  // Obligaciones
  [
    { id: 'o1', orden: 1, nombre: 'Coordinar el funcionamiento de la Casa de Juventud', descripcion: 'Garantizar la apertura, agenda y atención.', color: '#6C3BFF', icon: 'home_work' },
    { id: 'o2', orden: 2, nombre: 'Promover actividades de participación juvenil', descripcion: 'Encuentros con jóvenes del municipio.', color: '#2BFFAC', icon: 'groups' },
    { id: 'o3', orden: 3, nombre: 'Articular con instituciones educativas', descripcion: 'Coordinar con colegios y aliados.', color: '#FFC700', icon: 'school' },
    { id: 'o4', orden: 4, nombre: 'Reportar evidencias y documentación', descripcion: 'Registrar soportes de cada actividad.', color: '#3B9BFF', icon: 'fact_check' },
  ].forEach(function (o) {
    o.contractistaId = 'c1'; o.estado = 'activa';
    saveObligacion(o);
  });

  return 'Datos demo cargados.';
}

/* ---------------------------------------------------------------------
 *  Helpers de configuración
 * ------------------------------------------------------------------- */
function _config(clave) {
  var rows = readSheetObjects(SHEETS.CONFIG);
  var hit = rows.filter(function (r) { return r.clave === clave; })[0];
  return hit ? hit.valor : null;
}

function _setConfig(clave, valor) {
  upsertRow(SHEETS.CONFIG, { clave: clave, valor: valor }, 'clave');
}

function _safeAlert(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); }
}
