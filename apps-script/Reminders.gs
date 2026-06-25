/**
 * =====================================================================
 *  Reminders.gs — Recordatorios diarios (6:00 PM)
 * ---------------------------------------------------------------------
 *  Si un contratista NO registró actividades en el día, se le envía un
 *  recordatorio por correo. Instala el disparador una sola vez con
 *  installReminderTrigger().
 *
 *  La hora se toma de Configuracion > REMINDER_HOUR (por defecto 18).
 * =====================================================================
 */

/** Instala (o reinstala) el disparador diario a la hora configurada. */
function installReminderTrigger() {
  // Elimina disparadores previos de esta función para no duplicar.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyReminderJob') ScriptApp.deleteTrigger(t);
  });

  var hour = parseInt(_config('REMINDER_HOUR') || '18', 10);
  ScriptApp.newTrigger('dailyReminderJob')
    .timeBased()
    .atHour(hour)
    .everyDays(1)
    .inTimezone(_tz())
    .create();

  _log('REMINDER', 'trigger instalado a las ' + hour + ':00');
  return 'Disparador instalado a las ' + hour + ':00 (' + _tz() + ').';
}

/** Trabajo ejecutado por el disparador: revisa y notifica. */
function dailyReminderJob() {
  var hoy = Utilities.formatDate(new Date(), _tz(), 'yyyy-MM-dd');
  var contratistas = readSheetObjects(SHEETS.CONTRATISTAS);
  var acts = readSheetObjects(SHEETS.ACTIVIDADES);

  var conActividadHoy = {};
  acts.forEach(function (a) {
    if (String(a.fecha) === hoy) conActividadHoy[a.contractistaId] = true;
  });

  var enviados = 0;
  contratistas.forEach(function (c) {
    if (conActividadHoy[c.id]) return;       // ya registró hoy
    if (!c.email) return;                     // sin correo, no se notifica
    try {
      _sendReminderEmail(c, hoy);
      enviados++;
    } catch (e) {
      _log('REMINDER', 'error enviando a ' + c.email + ': ' + e);
    }
  });

  _log('REMINDER', 'ejecutado ' + hoy + ' — ' + enviados + ' recordatorio(s)');
  return enviados;
}

/** Envía el correo de recordatorio (HTML con la identidad de marca). */
function _sendReminderEmail(c, hoy) {
  var asunto = '⏰ Parche Zipa — Recuerda registrar tus actividades de hoy';
  var html =
    '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #Eee">' +
      '<div style="background:linear-gradient(135deg,#6C3BFF,#B79CFF);padding:28px;text-align:center;color:#fff">' +
        '<div style="font-weight:800;letter-spacing:2px">PARCHE ZIPA</div>' +
        '<h2 style="margin:10px 0 0">¡Hola, ' + (c.nombre || '') + '! 👋</h2>' +
      '</div>' +
      '<div style="padding:24px;color:#1D1330;line-height:1.6">' +
        '<p>Hoy <b>' + hoy + '</b> aún no registras actividades en la plataforma.</p>' +
        '<p>Recuerda que registrar tus evidencias a tiempo facilita la generación automática de tu informe — ' +
        'no necesitas redactar nada, solo registrar lo que hiciste. 🚀</p>' +
        '<p style="margin-top:18px">Programa de Juventudes · Secretaría de Familia y Desarrollo Social de Zipaquirá</p>' +
      '</div>' +
    '</div>';

  MailApp.sendEmail({
    to: c.email,
    subject: asunto,
    htmlBody: html,
  });
}
