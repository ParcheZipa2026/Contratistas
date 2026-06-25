/**
 * =====================================================================
 *  Obligaciones.gs — CRUD + reordenamiento (Drag & Drop)
 * ---------------------------------------------------------------------
 *  Acciones: saveObligacion, deleteObligacion, reorderObligaciones
 * =====================================================================
 */

/** Crea o actualiza una obligación. El orden se autocalcula si es nueva. */
function saveObligacion(p) {
  if (!p.id) {
    p.id = uid('o');
    if (p.orden === undefined || p.orden === null || p.orden === '') {
      var existing = readSheetObjects(SHEETS.OBLIGACIONES);
      p.orden = existing.length + 1;
    }
  }
  if (!p.estado) p.estado = 'activa';
  upsertRow(SHEETS.OBLIGACIONES, p, 'id');
  _log('OBLIGACION', 'save ' + p.id + ' ' + p.nombre);
  return p;
}

/** Elimina una obligación. (Las actividades quedan, pero sin obligación válida.) */
function deleteObligacion(id) {
  deleteRow(SHEETS.OBLIGACIONES, 'id', id);
  _log('OBLIGACION', 'delete ' + id);
  return { id: id };
}

/**
 * Reordena obligaciones según el array de ids recibido del Drag & Drop.
 * Asigna orden = índice + 1 a cada una.
 */
function reorderObligaciones(ids) {
  (ids || []).forEach(function (id, i) {
    var sh = _sheet(SHEETS.OBLIGACIONES);
    var rowNum = _findRow(sh, 'id', id);
    if (rowNum > 0) {
      var headers = _headers(sh);
      var col = headers.indexOf('orden');
      if (col >= 0) sh.getRange(rowNum, col + 1).setValue(i + 1);
    }
  });
  _log('OBLIGACION', 'reorder ' + (ids || []).join(','));
  return { ok: true };
}
