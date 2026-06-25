/**
 * =====================================================================
 *  IA.gs — Motor de Inteligencia Artificial
 * ---------------------------------------------------------------------
 *  analyzeIA(range) devuelve EXACTAMENTE la misma forma que el modo demo
 *  del frontend, para que la UI funcione sin cambios:
 *    {
 *      resumen, hallazgos[], fortalezas[], recomendaciones[],
 *      indicadores: { totalActividades, totalFotos, cumplimiento },
 *      porObligacion: { oblId: { nombre, count, observacion } }
 *    }
 *
 *  Si hay AI_API_KEY configurada en la hoja Configuracion, se llama al
 *  proveedor (claude | openai | gemini) para enriquecer el texto. Si no,
 *  se usa un análisis heurístico local (sin red), siempre funcional.
 * =====================================================================
 */

/** Punto de entrada de la acción analyzeIA. */
function analyzeIA(p) {
  var datos = _gatherForAnalysis(p);
  var base = _heuristicAnalysis(datos);

  // Intento de enriquecimiento con IA real (no bloquea si falla).
  try {
    var apiKey = _config('AI_API_KEY');
    if (apiKey) {
      var ai = _callAIProvider(datos, base);
      if (ai) {
        base.resumen        = ai.resumen        || base.resumen;
        base.hallazgos      = ai.hallazgos      || base.hallazgos;
        base.fortalezas     = ai.fortalezas     || base.fortalezas;
        base.recomendaciones= ai.recomendaciones|| base.recomendaciones;
        if (ai.porObligacion) {
          Object.keys(ai.porObligacion).forEach(function (id) {
            if (base.porObligacion[id]) base.porObligacion[id].observacion = ai.porObligacion[id];
          });
        }
      }
    }
  } catch (e) {
    _log('IA', 'fallback heurístico: ' + e);
  }

  return base;
}

/* ---------------------------------------------------------------------
 *  Recolección de datos del periodo
 * ------------------------------------------------------------------- */
function _gatherForAnalysis(p) {
  var obls = readSheetObjects(SHEETS.OBLIGACIONES);
  var acts = hydrateActividades(readSheetObjects(SHEETS.ACTIVIDADES));

  // Filtro por rango y, si viene, por contratista.
  acts = acts.filter(function (a) {
    if (p && p.from && a.fecha < p.from) return false;
    if (p && p.to && a.fecha > p.to) return false;
    if (p && p.contractistaId && a.contractistaId !== p.contractistaId) return false;
    return true;
  });

  return { obls: obls, acts: acts, range: p || {} };
}

/* ---------------------------------------------------------------------
 *  Análisis heurístico local (sin depender de IA externa)
 * ------------------------------------------------------------------- */
function _heuristicAnalysis(d) {
  var byObl = {};
  d.obls.forEach(function (o) { byObl[o.id] = { nombre: o.nombre, count: 0, fotos: 0 }; });
  d.acts.forEach(function (a) {
    if (byObl[a.obligacionId]) {
      byObl[a.obligacionId].count++;
      byObl[a.obligacionId].fotos += (a.fotos ? a.fotos.length : 0);
    }
  });

  var sin = Object.keys(byObl).filter(function (k) { return byObl[k].count === 0; }).map(function (k) { return byObl[k].nombre; });
  var pocas = Object.keys(byObl).filter(function (k) { return byObl[k].count > 0 && byObl[k].count < 2; }).map(function (k) { return byObl[k].nombre; });
  var conAct = Object.keys(byObl).filter(function (k) { return byObl[k].count > 0; }).length;

  // Detección simple de textos repetidos.
  var textos = {};
  var repetidos = 0;
  d.acts.forEach(function (a) {
    var key = String(a.descripcion || '').toLowerCase().trim().slice(0, 40);
    if (!key) return;
    textos[key] = (textos[key] || 0) + 1;
    if (textos[key] === 2) repetidos++;
  });

  // Lugares.
  var lugares = {};
  d.acts.forEach(function (a) { if (a.lugar) lugares[a.lugar] = (lugares[a.lugar] || 0) + 1; });
  var topLugar = Object.keys(lugares).sort(function (a, b) { return lugares[b] - lugares[a]; })[0];

  var totalFotos = d.acts.reduce(function (s, a) { return s + (a.fotos ? a.fotos.length : 0); }, 0);
  var cumplimiento = d.obls.length ? Math.round((conAct / d.obls.length) * 100) : 0;

  // Observación por obligación (alimenta el informe Word).
  Object.keys(byObl).forEach(function (id) {
    var o = byObl[id];
    o.observacion = o.count === 0
      ? 'No se registraron actividades para esta obligación en el periodo; se recomienda programarlas.'
      : 'Se evidencia cumplimiento con ' + o.count + ' actividad(es) y ' + o.fotos + ' soporte(s) fotográfico(s).';
  });

  return {
    resumen: 'Durante el periodo se registraron ' + d.acts.length + ' actividades distribuidas en ' +
             conAct + ' de ' + d.obls.length + ' obligaciones. ' +
             (topLugar ? 'El lugar con mayor actividad fue ' + topLugar + '. ' : '') +
             'El nivel de evidencia es ' + (cumplimiento >= 75 ? 'adecuado' : 'mejorable') + ', con oportunidades de fortalecimiento en la cobertura.',
    hallazgos: []
      .concat(sin.length ? ['Obligaciones sin actividades: ' + sin.join('; ') + '.'] : [])
      .concat(pocas.length ? ['Obligaciones con baja actividad: ' + pocas.join('; ') + '.'] : [])
      .concat(repetidos ? ['Se detectaron ' + repetidos + ' posible(s) descripción(es) repetida(s).'] : [])
      .concat(topLugar ? ['Concentración de actividades en: ' + topLugar + '.'] : []),
    fortalezas: []
      .concat(totalFotos ? ['Registro constante de evidencias fotográficas (' + totalFotos + ').'] : [])
      .concat(Object.keys(lugares).length > 1 ? ['Diversidad de lugares y públicos atendidos.'] : [])
      .concat(conAct === d.obls.length && d.obls.length ? ['Cobertura completa de todas las obligaciones.'] : []),
    recomendaciones: []
      .concat(sin.length ? ['Programar actividades para las obligaciones sin evidencia.'] : [])
      .concat(repetidos ? ['Ampliar y variar las descripciones para evitar textos repetidos.'] : [])
      .concat(['Mantener mínimo dos evidencias fotográficas por actividad.']),
    indicadores: {
      totalActividades: d.acts.length,
      totalFotos: totalFotos,
      cumplimiento: cumplimiento,
    },
    porObligacion: byObl,
  };
}

/* ---------------------------------------------------------------------
 *  Llamada a proveedores de IA (opcional)
 * ------------------------------------------------------------------- */
function _callAIProvider(d, base) {
  var provider = (_config('AI_PROVIDER') || 'claude').toLowerCase();
  var apiKey = _config('AI_API_KEY');
  if (!apiKey) return null;

  var prompt = _buildPrompt(d);

  if (provider === 'claude') return _callClaude(apiKey, prompt);
  if (provider === 'openai') return _callOpenAI(apiKey, prompt);
  if (provider === 'gemini') return _callGemini(apiKey, prompt);
  return null;
}

/** Construye el prompt con los datos del periodo. */
function _buildPrompt(d) {
  var resumenObls = d.obls.map(function (o) {
    var acts = d.acts.filter(function (a) { return a.obligacionId === o.id; });
    return '- [' + o.id + '] ' + o.nombre + ' (' + acts.length + ' actividades): ' +
      acts.map(function (a) { return a.fecha + ' ' + a.lugar + ' — ' + (a.descripcion || ''); }).join(' | ');
  }).join('\n');

  return 'Eres un analista de supervisión contractual del sector público colombiano. ' +
    'Analiza las siguientes actividades de un contratista del Programa de Juventudes de Zipaquirá ' +
    'y responde ÚNICAMENTE con un JSON válido (sin markdown) con esta forma exacta:\n' +
    '{"resumen": string, "hallazgos": string[], "fortalezas": string[], "recomendaciones": string[], ' +
    '"porObligacion": { "<id>": "observación breve" }}.\n' +
    'Detecta obligaciones con pocas o ninguna actividad, textos repetidos, posibles errores ortográficos e inconsistencias. ' +
    'Sé concreto, profesional y en español.\n\nDATOS:\n' + resumenObls;
}

/** Claude (Anthropic Messages API). */
function _callClaude(apiKey, prompt) {
  var model = _config('AI_MODEL_CLAUDE') || 'claude-sonnet-4-6';
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: model, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
  });
  var data = JSON.parse(res.getContentText());
  var text = data && data.content && data.content[0] && data.content[0].text;
  return _parseJsonLoose(text);
}

/** OpenAI (Chat Completions). */
function _callOpenAI(apiKey, prompt) {
  var model = _config('AI_MODEL_OPENAI') || 'gpt-4o-mini';
  var res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'Authorization': 'Bearer ' + apiKey },
    payload: JSON.stringify({
      model: model, temperature: 0.4,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  var data = JSON.parse(res.getContentText());
  var text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return _parseJsonLoose(text);
}

/** Gemini (generateContent). */
function _callGemini(apiKey, prompt) {
  var model = _config('AI_MODEL_GEMINI') || 'gemini-1.5-flash';
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  var data = JSON.parse(res.getContentText());
  var text = data && data.candidates && data.candidates[0] &&
             data.candidates[0].content && data.candidates[0].content.parts[0].text;
  return _parseJsonLoose(text);
}

/** Extrae JSON aunque venga envuelto en ```json ... ``` o con texto extra. */
function _parseJsonLoose(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) { /* sigue */ }
  var m = String(text).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e2) { return null; } }
  return null;
}
