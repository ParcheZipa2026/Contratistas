/**
 * =====================================================================
 *  Actividades.gs — CRUD de actividades + manejo de evidencias
 * ---------------------------------------------------------------------
 *  Acciones: saveActividad, deleteActividad, duplicateActividad
 *
 *  El frontend envía en saveActividad:
 *    { id?, contractistaId, obligacionId, fecha, lugar, descripcion,
 *      lat?, lng?,
 *      fotos: ['urlExistente', ...],            // URLs que se conservan
 *      nuevasFotos: [{ name, type, base64 }]    // se suben a Drive }
 *  Devuelve la actividad con  fotos: ['url', ...]  (todas, finales).
 * =====================================================================
 */

/** Crea o actualiza una actividad, subiendo las fotos nuevas a Drive. */
function saveActividad(p) {
  var isNew = !p.id;
  if (isNew) p.id = uid('a');

  // 1) Persistir campos base de la actividad.
  var record = {
    id: p.id,
    contractistaId: p.contractistaId || '',
    obligacionId: p.obligacionId || '',
    fecha: p.fecha || Utilities.formatDate(new Date(), _tz(), 'yyyy-MM-dd'),
    lugar: p.lugar || '',
    descripcion: p.descripcion || '',
    lat: p.lat || '',
    lng: p.lng || '',
    createdAt: isNew ? new Date().toISOString() : (p.createdAt || new Date().toISOString()),
  };
  upsertRow(SHEETS.ACTIVIDADES, record, 'id');

  // 2) Conciliar fotos: conservar las URLs que vienen en p.fotos,
  //    eliminar las que el usuario quitó, subir las nuevas.
  var keep = p.fotos || [];
  var current = whereRows(SHEETS.FOTOGRAFIAS, 'actividadId', p.id);

  current.forEach(function (f) {
    if (keep.indexOf(f.url) === -1) {
      _deleteDriveFileSafe(f.driveId);
      deleteRow(SHEETS.FOTOGRAFIAS, 'id', f.id);
    }
  });

  // 3) Subir fotos nuevas (base64) a la carpeta del contratista/año/mes/actividad.
  var uploaded = [];
  (p.nuevasFotos || []).forEach(function (file) {
    var saved = uploadEvidencia(record, file);
    uploaded.push(saved.url);
    upsertRow(SHEETS.FOTOGRAFIAS, {
      id: uid('f'), actividadId: p.id, url: saved.url, driveId: saved.driveId,
      nombre: file.name || 'evidencia', createdAt: new Date().toISOString(),
    }, 'id');
  });

  // 4) Devolver la actividad final con todas las urls.
  var finalFotos = keep.concat(uploaded);
  record.fotos = finalFotos;
  _log('ACTIVIDAD', (isNew ? 'create ' : 'update ') + p.id);
  return record;
}

/** Elimina una actividad y sus fotos (Sheets + Drive). */
function deleteActividad(id) {
  _deleteActividadCascade(id);
  _log('ACTIVIDAD', 'delete ' + id);
  return { id: id };
}

/** Cascada interna: borra fotos de Drive + filas + la actividad. */
function _deleteActividadCascade(id) {
  whereRows(SHEETS.FOTOGRAFIAS, 'actividadId', id).forEach(function (f) {
    _deleteDriveFileSafe(f.driveId);
    deleteRow(SHEETS.FOTOGRAFIAS, 'id', f.id);
  });
  deleteRow(SHEETS.ACTIVIDADES, 'id', id);
}

/**
 * Duplica una actividad (incluye copias de sus evidencias en Drive),
 * con la fecha de hoy. Refleja duplicateActividad del frontend.
 */
function duplicateActividad(id) {
  var src = whereRows(SHEETS.ACTIVIDADES, 'id', id)[0];
  if (!src) throw new Error('Actividad no encontrada: ' + id);

  var copyId = uid('a');
  var copy = {
    id: copyId,
    contractistaId: src.contractistaId,
    obligacionId: src.obligacionId,
    fecha: Utilities.formatDate(new Date(), _tz(), 'yyyy-MM-dd'),
    lugar: src.lugar,
    descripcion: src.descripcion,
    lat: src.lat, lng: src.lng,
    createdAt: new Date().toISOString(),
  };
  upsertRow(SHEETS.ACTIVIDADES, copy, 'id');

  // Copia las evidencias en Drive y sus filas.
  var fotos = [];
  whereRows(SHEETS.FOTOGRAFIAS, 'actividadId', id).forEach(function (f) {
    try {
      var orig = DriveApp.getFileById(f.driveId);
      var folder = _activityFolder(copy);
      var newFile = orig.makeCopy(f.nombre || orig.getName(), folder);
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var url = _publicUrl(newFile.getId());
      fotos.push(url);
      upsertRow(SHEETS.FOTOGRAFIAS, {
        id: uid('f'), actividadId: copyId, url: url, driveId: newFile.getId(),
        nombre: f.nombre, createdAt: new Date().toISOString(),
      }, 'id');
    } catch (e) {
      // Si no se puede copiar, conserva la URL original como referencia.
      fotos.push(f.url);
      upsertRow(SHEETS.FOTOGRAFIAS, {
        id: uid('f'), actividadId: copyId, url: f.url, driveId: f.driveId,
        nombre: f.nombre, createdAt: new Date().toISOString(),
      }, 'id');
    }
  });

  copy.fotos = fotos;
  _log('ACTIVIDAD', 'duplicate ' + id + ' -> ' + copyId);
  return copy;
}

/** Zona horaria del proyecto (por defecto Bogotá). */
function _tz() { return Session.getScriptTimeZone() || 'America/Bogota'; }
