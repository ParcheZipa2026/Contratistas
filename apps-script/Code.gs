/**
 * =====================================================================
 *  Code.gs — Punto de entrada del backend (Google Apps Script)
 * ---------------------------------------------------------------------
 *  Web App que expone una API JSON para la PWA "Parche Zipa".
 *
 *  Contrato de la API (igual que js/api.js del frontend):
 *    POST  { action, token, payload }  ->  { ok:true, result } | { ok:false, error }
 *
 *  La respuesta se envía como text/plain (JSON serializado) para evitar
 *  el preflight CORS de Apps Script. El frontend hace JSON.parse().
 *
 *  Despliegue:
 *    1) Implementar > Nueva implementación > Aplicación web.
 *    2) Ejecutar como: Yo.  Acceso: Cualquier usuario.
 *    3) Copiar la URL /exec y pegarla en js/config.js (API_URL).
 *
 *  Antes de usar:  ejecuta una vez  setupParcheZipa()  (en Setup.gs)
 *  para crear automáticamente las hojas y la carpeta raíz en Drive.
 * =====================================================================
 */

/** Token compartido con el frontend (cámbialo en ambos lados). */
var API_TOKEN = 'parche-zipa-2026';

/* ---------------------------------------------------------------------
 *  Enrutadores HTTP
 * ------------------------------------------------------------------- */

/** GET: prueba rápida de salud / verificación de despliegue. */
function doGet(e) {
  var info = {
    app: 'Sistema Inteligente de Gestión Contractual - Parche Zipa',
    status: 'online',
    time: new Date().toISOString(),
    hint: 'Usa POST con { action, token, payload }.',
  };
  return _json({ ok: true, result: info });
}

/** POST: punto único de entrada para todas las acciones de la API. */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (body.token !== API_TOKEN) {
      return _json({ ok: false, error: 'Token inválido' });
    }

    var result = dispatch(body.action, body.payload || {});
    return _json({ ok: true, result: result });
  } catch (err) {
    _log('ERROR', String(err && err.stack || err));
    return _json({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------------------------------------------------------------------
 *  Despachador de acciones — refleja exactamente js/api.js
 * ------------------------------------------------------------------- */
function dispatch(action, p) {
  switch (action) {
    // Sesión
    case 'login':                return svcLogin(p);

    // Datos base
    case 'bootstrap':            return svcBootstrap();

    // Contratistas
    case 'listContractistas':    return listContractistas();
    case 'saveContractista':     return saveContractista(p);
    case 'deleteContractista':   return deleteContractista(p.id);
    case 'saveContract':         return saveContract(p);

    // Obligaciones
    case 'saveObligacion':       return saveObligacion(p);
    case 'deleteObligacion':     return deleteObligacion(p.id);
    case 'reorderObligaciones':  return reorderObligaciones(p.ids);

    // Actividades
    case 'saveActividad':        return saveActividad(p);
    case 'deleteActividad':      return deleteActividad(p.id);
    case 'duplicateActividad':   return duplicateActividad(p.id);

    // IA + Informes
    case 'analyzeIA':            return analyzeIA(p);
    case 'generateReport':       return generateReport(p);

    default:
      throw new Error('Acción no soportada: ' + action);
  }
}

/* ---------------------------------------------------------------------
 *  Servicios de sesión / arranque
 * ------------------------------------------------------------------- */

/**
 * Login simple por perfil. No usa contraseñas (control de acceso a nivel
 * de despliegue). Si más adelante quieres credenciales, valida contra la
 * hoja "Usuarios" aquí.
 */
function svcLogin(p) {
  var user = null;
  var users = readSheetObjects(SHEETS.USUARIOS);
  if (p.role === 'contratista' && p.contractistaId) {
    user = users.filter(function (u) { return u.contractistaId === p.contractistaId; })[0] || null;
  }
  _log('LOGIN', p.role + ' / ' + (p.name || '') + ' / ' + (p.contractistaId || ''));
  return {
    role: p.role,
    name: p.name || (user && user.nombre) || '',
    contractistaId: p.contractistaId || (user && user.contractistaId) || '',
  };
}

/** Devuelve todos los datos necesarios para arrancar la app. */
function svcBootstrap() {
  return {
    contracts:      readSheetObjects(SHEETS.CONTRATOS),
    contractistas:  readSheetObjects(SHEETS.CONTRATISTAS),
    obligaciones:   readSheetObjects(SHEETS.OBLIGACIONES).sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); }),
    actividades:    hydrateActividades(readSheetObjects(SHEETS.ACTIVIDADES)),
  };
}

/* ---------------------------------------------------------------------
 *  Utilidades de respuesta y log
 * ------------------------------------------------------------------- */

/** Empaqueta cualquier objeto como JSON text/plain (sin preflight CORS). */
function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.TEXT);
}

/** Registra un evento en la hoja Logs (no interrumpe si falla). */
function _log(tipo, detalle) {
  try {
    var sh = _sheet(SHEETS.LOGS);
    sh.appendRow([new Date(), tipo, detalle]);
  } catch (e) { /* silencioso */ }
}
