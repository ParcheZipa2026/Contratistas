/**
 * =====================================================================
 *  Drive.gs — Almacenamiento de evidencias en Google Drive
 * ---------------------------------------------------------------------
 *  Estructura de carpetas creada automáticamente:
 *    Parche Zipa — Evidencias /
 *      └── {Contratista} /
 *            └── {Año} /
 *                  └── {Mes} /
 *                        └── {Actividad} /
 *                              └── foto1.jpg, foto2.jpg
 *
 *  Las fotos llegan como base64 desde el frontend. Se guardan, se hacen
 *  visibles "con enlace" y se devuelve la URL pública para la hoja.
 * =====================================================================
 */

var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
             'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Carpeta raíz (creada en Setup). */
function _rootFolder() {
  var id = _config('DRIVE_ROOT_ID');
  if (!id) id = _ensureRootFolder();
  return DriveApp.getFolderById(id);
}

/** Obtiene (o crea) una subcarpeta por nombre dentro de un folder. */
function _childFolder(parent, name) {
  name = String(name || 'General').replace(/[\\/:*?"<>|]/g, '-').trim() || 'General';
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/**
 * Devuelve la carpeta de una actividad concreta, creando toda la ruta
 * Contratista/Año/Mes/Actividad si no existe.
 */
function _activityFolder(act) {
  var ctName = _contractistaNombre(act.contractistaId) || act.contractistaId || 'Sin contratista';
  var fecha = _parseDate(act.fecha);
  var anio = String(fecha.getFullYear());
  var mes = MESES[fecha.getMonth()];
  var actName = (Utilities.formatDate(fecha, _tz(), 'yyyy-MM-dd')) + ' · ' +
                _truncate(act.descripcion || act.lugar || act.id, 40);

  var f1 = _childFolder(_rootFolder(), ctName);
  var f2 = _childFolder(f1, anio);
  var f3 = _childFolder(f2, mes);
  return _childFolder(f3, actName);
}

/**
 * Sube una evidencia (base64) a la carpeta de la actividad.
 * @return { url, driveId }
 */
function uploadEvidencia(act, file) {
  var folder = _activityFolder(act);
  var bytes = Utilities.base64Decode(file.base64, Utilities.Charset.UTF_8);
  var blob = Utilities.newBlob(bytes, file.type || 'image/jpeg', file.name || ('evidencia_' + Date.now() + '.jpg'));
  var saved = folder.createFile(blob);
  saved.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { url: _publicUrl(saved.getId()), driveId: saved.getId() };
}

/** URL de visualización pública (sirve para <img src>). */
function _publicUrl(fileId) {
  // Formato que funciona como imagen embebida.
  return 'https://drive.google.com/uc?export=view&id=' + fileId;
}

/** Borra un archivo de Drive sin lanzar error si ya no existe. */
function _deleteDriveFileSafe(driveId) {
  if (!driveId) return;
  try { DriveApp.getFileById(driveId).setTrashed(true); } catch (e) { /* ignorar */ }
}

/* ---------------------------------------------------------------------
 *  Helpers
 * ------------------------------------------------------------------- */
function _contractistaNombre(id) {
  var c = whereRows(SHEETS.CONTRATISTAS, 'id', id)[0];
  return c ? c.nombre : null;
}

function _parseDate(iso) {
  if (iso instanceof Date) return iso;
  var d = new Date(String(iso) + 'T12:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

function _truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n).trim() + '…' : s;
}
