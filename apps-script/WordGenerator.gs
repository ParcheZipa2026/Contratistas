/**
 * =====================================================================
 *  WordGenerator.gs — Generador automático de informes Word (.docx)
 * ---------------------------------------------------------------------
 *  generateReport(range) construye un Documento de Google con la
 *  estructura solicitada, lo exporta a .docx, lo guarda en Drive y
 *  devuelve { url } (enlace de descarga). El contratista NO redacta:
 *  la IA + el sistema arman todo agrupando por obligación.
 *
 *  Estructura:
 *    Portada
 *    1. Información contractual
 *    2. Resumen ejecutivo (IA)
 *    3. Tabla de obligaciones
 *    4. Desarrollo por obligación  (Actividad → Descripción → Foto …)
 *       + Observaciones automáticas de IA por obligación
 *    5. Conclusiones y recomendaciones (IA)
 *    6. Análisis de cumplimiento (IA)
 * =====================================================================
 */

var BRAND = { purple: '#6C3BFF', neon: '#12E592', ink: '#1D1330', soft: '#F4F0FF' };

function generateReport(p) {
  var d = _gatherForAnalysis(p);
  var analysis = analyzeIA(p);

  var contratista = _reportContratista(d, p);
  var contrato = whereRows(SHEETS.CONTRATOS, 'contractistaId', contratista.id)[0] || {};

  // 1) Crear el documento base.
  var titulo = 'Informe de Actividades — ' + (contratista.nombre || 'Contratista') +
               ' (' + (p.from || '') + ' a ' + (p.to || '') + ')';
  var doc = DocumentApp.create(titulo);
  var body = doc.getBody();
  body.setMarginTop(48).setMarginBottom(48).setMarginLeft(56).setMarginRight(56);

  _buildCover(body, contratista, p);
  _buildContractInfo(body, contratista, contrato);
  _buildResumen(body, analysis);
  _buildTablaObligaciones(body, d, analysis);
  _buildDesarrollo(body, d, analysis);
  _buildConclusiones(body, analysis);
  _buildCumplimiento(body, analysis);

  doc.saveAndClose();

  // 2) Exportar a .docx y guardar en la carpeta del contratista.
  var url = _exportDocxToDrive(doc.getId(), titulo, contratista);

  // 3) Limpieza: enviar el Google Doc temporal a la papelera.
  try { DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {}

  _log('INFORME', 'generado ' + titulo);
  return { url: url };
}

/* ---------------------------------------------------------------------
 *  Secciones del documento
 * ------------------------------------------------------------------- */
function _buildCover(body, c, p) {
  var brand = body.appendParagraph('PARCHE ZIPA');
  brand.setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  brand.editAsText().setForegroundColor(BRAND.purple).setBold(true);
  brand.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  var t = body.appendParagraph('INFORME DE ACTIVIDADES');
  t.setHeading(DocumentApp.ParagraphHeading.TITLE);
  t.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  _centered(body, c.nombre || '');
  _centered(body, 'Periodo: ' + (p.from || '—') + ' a ' + (p.to || '—'));
  _centered(body, 'Programa de Juventudes · Secretaría de Familia y Desarrollo Social de Zipaquirá');
  _centered(body, 'Generado el ' + Utilities.formatDate(new Date(), _tz(), 'dd/MM/yyyy'));
  body.appendPageBreak();
}

function _buildContractInfo(body, c, k) {
  _h2(body, '1. Información contractual');
  var rows = [
    ['Número del contrato', k.numero], ['Objeto', k.objeto],
    ['Contratista', c.nombre], ['Dependencia', k.dependencia],
    ['Supervisor', k.supervisor], ['Plazo inicial', k.plazoInicial],
    ['Prórroga', k.prorroga], ['Plazo total', k.plazoTotal],
    ['Valor inicial', _money(k.valorInicial)], ['Valor adición', _money(k.valorAdicion)],
    ['Valor total', _money(k.valorTotal)], ['Fecha inicio', k.fechaInicio],
    ['Fecha terminación', k.fechaTerminacion], ['Fecha de corte', k.fechaCorte],
    ['Fecha entrega informe', k.fechaEntregaInforme],
  ].map(function (r) { return [r[0], String(r[1] == null || r[1] === '' ? '—' : r[1])]; });

  var table = body.appendTable(rows);
  _styleInfoTable(table);
}

function _buildResumen(body, A) {
  _h2(body, '2. Resumen ejecutivo');
  body.appendParagraph(A.resumen || '');
}

function _buildTablaObligaciones(body, d, A) {
  _h2(body, '3. Obligaciones del contrato');
  var header = ['#', 'Obligación', 'Actividades'];
  var rows = [header];
  d.obls.forEach(function (o, i) {
    var count = (A.porObligacion[o.id] && A.porObligacion[o.id].count) || 0;
    rows.push([String(i + 1), o.nombre, String(count)]);
  });
  var table = body.appendTable(rows);
  _styleHeaderTable(table);
}

function _buildDesarrollo(body, d, A) {
  _h2(body, '4. Desarrollo por obligación');

  d.obls.forEach(function (o, idx) {
    var acts = d.acts
      .filter(function (a) { return a.obligacionId === o.id; })
      .sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)); });
    if (!acts.length) return;

    var h = body.appendParagraph('Obligación ' + (idx + 1) + '. ' + o.nombre);
    h.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    h.editAsText().setForegroundColor(BRAND.purple);
    if (o.descripcion) { var desc = body.appendParagraph(o.descripcion); desc.editAsText().setItalic(true); }

    acts.forEach(function (a, i) {
      var ah = body.appendParagraph('Actividad ' + (i + 1) + ' — ' + a.fecha + ' · ' + (a.lugar || ''));
      ah.setHeading(DocumentApp.ParagraphHeading.HEADING3);
      body.appendParagraph(a.descripcion || '');
      _appendFotos(body, a);
    });

    // Observación automática de IA por obligación.
    var obs = (A.porObligacion[o.id] && A.porObligacion[o.id].observacion) ||
              ('Se evidencia cumplimiento con ' + acts.length + ' actividad(es).');
    var obsP = body.appendParagraph('Observación IA: ' + obs);
    obsP.setIndentStart(8);
    obsP.editAsText().setForegroundColor(BRAND.ink).setBold(false);
    obsP.setBackgroundColor && obsP.setBackgroundColor(BRAND.soft);
  });
}

function _buildConclusiones(body, A) {
  _h2(body, '5. Conclusiones y recomendaciones');
  _bulletGroup(body, 'Fortalezas', A.fortalezas);
  _bulletGroup(body, 'Hallazgos', A.hallazgos);
  _bulletGroup(body, 'Recomendaciones', A.recomendaciones);
}

function _buildCumplimiento(body, A) {
  _h2(body, '6. Análisis de cumplimiento (IA)');
  var ind = A.indicadores || {};
  body.appendParagraph('Total de actividades: ' + (ind.totalActividades || 0) + '.');
  body.appendParagraph('Evidencias fotográficas: ' + (ind.totalFotos || 0) + '.');
  body.appendParagraph('Cumplimiento estimado: ' + (ind.cumplimiento || 0) + '%.');
}

/* ---------------------------------------------------------------------
 *  Inserción de fotos (desde Drive)
 * ------------------------------------------------------------------- */
function _appendFotos(body, act) {
  var fotos = whereRows(SHEETS.FOTOGRAFIAS, 'actividadId', act.id);
  fotos.forEach(function (f) {
    try {
      var blob = DriveApp.getFileById(f.driveId).getBlob();
      var img = body.appendImage(blob);
      // Escala a un ancho máximo de ~320 px conservando proporción.
      var w = img.getWidth(), h = img.getHeight();
      if (w > 320) { img.setWidth(320); img.setHeight(Math.round(h * (320 / w))); }
    } catch (e) {
      body.appendParagraph('[Evidencia: ' + (f.url || f.nombre || 'foto') + ']');
    }
  });
}

/* ---------------------------------------------------------------------
 *  Exportar a .docx vía Drive API export
 * ------------------------------------------------------------------- */
function _exportDocxToDrive(docId, titulo, contratista) {
  var exportUrl = 'https://www.googleapis.com/drive/v3/files/' + docId +
                  '/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var res = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  var blob = res.getBlob().setName(_safeName(titulo) + '.docx');

  // Guardar en la carpeta del contratista (Informes).
  var root = _rootFolder();
  var ctFolder = _childFolder(root, contratista.nombre || contratista.id || 'Contratista');
  var infFolder = _childFolder(ctFolder, 'Informes');
  var file = infFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/* ---------------------------------------------------------------------
 *  Helpers de formato
 * ------------------------------------------------------------------- */
function _h2(body, text) {
  var p = body.appendParagraph(text);
  p.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  p.editAsText().setForegroundColor(BRAND.purple);
}

function _centered(body, text) {
  var p = body.appendParagraph(text);
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  return p;
}

function _bulletGroup(body, title, items) {
  var t = body.appendParagraph(title);
  t.editAsText().setBold(true);
  (items || []).forEach(function (it) { body.appendListItem(it).setGlyphType(DocumentApp.GlyphType.BULLET); });
  if (!items || !items.length) body.appendParagraph('Sin elementos.');
}

function _styleInfoTable(table) {
  for (var r = 0; r < table.getNumRows(); r++) {
    var cell = table.getRow(r).getCell(0);
    cell.setBackgroundColor(BRAND.soft);
    cell.editAsText().setBold(true);
    table.getRow(r).getCell(0).setWidth(170);
  }
}

function _styleHeaderTable(table) {
  var head = table.getRow(0);
  for (var c = 0; c < head.getNumCells(); c++) {
    head.getCell(c).setBackgroundColor(BRAND.purple);
    head.getCell(c).editAsText().setForegroundColor('#FFFFFF').setBold(true);
  }
}

function _reportContratista(d, p) {
  var id = p && p.contractistaId;
  if (!id && d.acts.length) id = d.acts[0].contractistaId;
  var c = id ? whereRows(SHEETS.CONTRATISTAS, 'id', id)[0] : null;
  return c || readSheetObjects(SHEETS.CONTRATISTAS)[0] || { id: id || '', nombre: '' };
}

function _money(n) {
  if (n == null || n === '') return '—';
  var num = Number(n);
  if (isNaN(num)) return String(n);
  return '$ ' + num.toLocaleString('es-CO');
}

function _safeName(s) {
  return String(s || 'Informe').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80);
}
