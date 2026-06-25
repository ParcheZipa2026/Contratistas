/**
 * =====================================================================
 *  Contratistas.gs — CRUD de contratistas y contratos
 * ---------------------------------------------------------------------
 *  Refleja las acciones del frontend:
 *    listContractistas, saveContractista, deleteContractista, saveContract
 * =====================================================================
 */

/** Lista todos los contratistas. */
function listContractistas() {
  return readSheetObjects(SHEETS.CONTRATISTAS);
}

/**
 * Crea o actualiza un contratista. Si no trae id, se genera uno.
 * Mantiene sincronizada la hoja Usuarios (rol contratista).
 */
function saveContractista(p) {
  if (!p.id) p.id = uid('c');
  upsertRow(SHEETS.CONTRATISTAS, p, 'id');

  // Sincroniza un usuario "contratista" para el login.
  var users = whereRows(SHEETS.USUARIOS, 'contractistaId', p.id);
  if (!users.length) {
    upsertRow(SHEETS.USUARIOS, {
      id: uid('u'), role: 'contratista', nombre: p.nombre,
      contractistaId: p.id, email: p.email || '', activo: 'TRUE',
    }, 'id');
  } else {
    var u = users[0];
    u.nombre = p.nombre; u.email = p.email || '';
    upsertRow(SHEETS.USUARIOS, u, 'id');
  }

  _log('CONTRATISTA', 'save ' + p.id + ' ' + p.nombre);
  return p;
}

/**
 * Elimina un contratista y, en cascada, su contrato, obligaciones,
 * actividades y fotos asociadas (incluye archivos de Drive).
 */
function deleteContractista(id) {
  // Actividades + fotos del contratista
  var acts = whereRows(SHEETS.ACTIVIDADES, 'contractistaId', id);
  acts.forEach(function (a) { _deleteActividadCascade(a.id); });

  // Obligaciones
  whereRows(SHEETS.OBLIGACIONES, 'contractistaId', id)
    .forEach(function (o) { deleteRow(SHEETS.OBLIGACIONES, 'id', o.id); });

  // Contratos
  whereRows(SHEETS.CONTRATOS, 'contractistaId', id)
    .forEach(function (k) { deleteRow(SHEETS.CONTRATOS, 'id', k.id); });

  // Usuarios
  whereRows(SHEETS.USUARIOS, 'contractistaId', id)
    .forEach(function (u) { deleteRow(SHEETS.USUARIOS, 'id', u.id); });

  // Contratista
  deleteRow(SHEETS.CONTRATISTAS, 'id', id);

  _log('CONTRATISTA', 'delete ' + id);
  return { id: id };
}

/** Crea o actualiza la ficha contractual. */
function saveContract(p) {
  if (!p.id) p.id = uid('k');
  upsertRow(SHEETS.CONTRATOS, p, 'id');
  _log('CONTRATO', 'save ' + p.id + ' ' + (p.numero || ''));
  return p;
}
