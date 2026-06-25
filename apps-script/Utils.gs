/**
 * =====================================================================
 *  Utils.gs — Utilidades de acceso a Google Sheets
 * ---------------------------------------------------------------------
 *  Capa genérica para leer/escribir filas como objetos {columna: valor}
 *  usando la primera fila como encabezados. Todos los servicios la usan.
 * =====================================================================
 */

/** Devuelve (creando si hace falta) la hoja por nombre. */
function _sheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (SCHEMA[name]) {
      sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]);
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

/** Encabezados (primera fila) de una hoja. */
function _headers(sh) {
  return sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
}

/**
 * Lee toda la hoja como array de objetos. Convierte fechas a 'YYYY-MM-DD'
 * y deja números/strings tal cual.
 */
function readSheetObjects(name) {
  var sh = _sheet(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var headers = _headers(sh);
  var values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  return values
    .filter(function (row) { return String(row[0]).length > 0; }) // descarta filas sin id/clave
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = _normalize(row[i]); });
      return obj;
    });
}

/** Normaliza valores de celda (fechas -> ISO corta). */
function _normalize(v) {
  if (v instanceof Date) {
    // Fecha "pura" (sin hora significativa) -> YYYY-MM-DD
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'America/Bogota', 'yyyy-MM-dd');
  }
  return v;
}

/** Encuentra el número de fila (1-based) de un registro por clave. */
function _findRow(sh, keyName, keyValue) {
  var headers = _headers(sh);
  var col = headers.indexOf(keyName);
  if (col < 0) return -1;
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var colValues = sh.getRange(2, col + 1, last - 1, 1).getValues();
  for (var i = 0; i < colValues.length; i++) {
    if (String(colValues[i][0]) === String(keyValue)) return i + 2;
  }
  return -1;
}

/**
 * Inserta o actualiza una fila por clave. Devuelve el objeto guardado.
 * Solo escribe las columnas presentes en el esquema/encabezados.
 */
function upsertRow(name, obj, keyName) {
  keyName = keyName || 'id';
  var sh = _sheet(name);
  var headers = _headers(sh);
  var rowNum = _findRow(sh, keyName, obj[keyName]);

  if (rowNum > 0) {
    // Actualiza solo las celdas de las claves presentes en obj.
    headers.forEach(function (h, i) {
      if (obj.hasOwnProperty(h)) sh.getRange(rowNum, i + 1).setValue(_serialize(obj[h]));
    });
  } else {
    var row = headers.map(function (h) { return obj.hasOwnProperty(h) ? _serialize(obj[h]) : ''; });
    sh.appendRow(row);
  }
  return obj;
}

/** Serializa valores antes de escribir (arrays/objetos -> JSON). */
function _serialize(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

/** Elimina una fila por clave. Devuelve true si borró algo. */
function deleteRow(name, keyName, keyValue) {
  var sh = _sheet(name);
  var rowNum = _findRow(sh, keyName, keyValue);
  if (rowNum > 0) { sh.deleteRow(rowNum); return true; }
  return false;
}

/** Devuelve todas las filas que cumplen un predicado {campo:valor}. */
function whereRows(name, field, value) {
  return readSheetObjects(name).filter(function (r) { return String(r[field]) === String(value); });
}

/** Generador de ids cortos consistente con el frontend (p.ej. 'a_x8f2'). */
function uid(prefix) {
  prefix = prefix || 'id';
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 7);
}

/**
 * Adjunta a cada actividad su array de URLs de fotos (desde Fotografias).
 * El frontend espera actividad.fotos = ['url', ...].
 */
function hydrateActividades(acts) {
  var fotos = readSheetObjects(SHEETS.FOTOGRAFIAS);
  var byAct = {};
  fotos.forEach(function (f) {
    (byAct[f.actividadId] = byAct[f.actividadId] || []).push(f.url);
  });
  acts.forEach(function (a) { a.fotos = byAct[a.id] || []; });
  // Orden cronológico descendente como en la UI.
  acts.sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
  return acts;
}
