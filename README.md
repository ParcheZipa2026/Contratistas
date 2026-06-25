# 🟣 Sistema Inteligente de Gestión Contractual — Parche Zipa

PWA profesional para el **Programa de Juventudes** de la **Secretaría de Familia y Desarrollo Social de Zipaquirá**.

Registra actividades, agrupa evidencias por obligación contractual y **genera automáticamente informes Word (.docx) con apoyo de IA** — el contratista no redacta informes, solo registra lo que hace.

- **Frontend:** PWA (HTML + CSS + JavaScript modular, sin frameworks) lista para **GitHub Pages**.
- **Backend:** **Google Apps Script** (API JSON).
- **Datos:** **Google Sheets**. · **Fotos:** **Google Drive**. · **IA:** Claude / OpenAI / Gemini.

> ⚡ **Arranca sin backend.** Con `API_URL` vacío, la app corre en **modo demo** con datos de ejemplo: ideal para publicar en GitHub Pages y ver el diseño al instante.

---

## ✨ Características

| Módulo | Qué hace |
|---|---|
| **Login por perfil** | Supervisor o Contratista. |
| **CRUD de contratistas** | Ficha editable + información contractual completa. |
| **Obligaciones** | Crear, editar, eliminar y **reordenar con Drag & Drop** (color, icono, estado). |
| **Actividades** | Fecha, obligación (obligatoria), lugar, descripción, **máx. 2 fotos** → Drive. |
| **Extras de captura** | Dictado por voz 🎙️ y geolocalización 📍 (nativos del navegador). |
| **Historial** | Línea de tiempo: editar / eliminar / duplicar / ver fotos. |
| **Calendario** | Días con actividad en verde; clic = ver todo el día. |
| **Buscador** | Filtra por palabra, fecha, lugar, obligación y contratista. |
| **Dashboard** | KPIs, actividades por semana, mapa de calor, lugares, semáforos, cumplimiento %. |
| **IA** | Resumen ejecutivo, hallazgos, fortalezas, recomendaciones, indicadores. |
| **Generador de informes** | Word `.docx` agrupado por obligación con fotos + observaciones IA. |
| **Recordatorios** | Correo diario a las 6:00 PM si no hubo registro. |
| **PWA** | Instalable, offline-aware (service worker), modo oscuro. |

---

## 📁 Estructura del proyecto

```
parche-zipa/
├── index.html                 # Shell de la PWA
├── manifest.webmanifest       # Manifiesto PWA
├── service-worker.js          # Caché offline (shell + API network-first)
├── assets/
│   ├── logo.svg               # ⚠️ Placeholder — reemplázalo por el logo oficial
│   └── icons/                 # Iconos PWA (192 / 512 / maskable)
├── css/
│   └── styles.css             # Sistema de diseño completo (tokens, dark mode)
├── js/
│   ├── config.js              # 👉 Aquí pegas API_URL y configuras la IA
│   ├── store.js               # Estado + datos demo
│   ├── api.js                 # Capa de API (real + espejo demo)
│   ├── ui.js                  # Componentes reutilizables
│   ├── router.js              # Router por hash (compatible GitHub Pages)
│   ├── app.js                 # Arranque, auth, shell (sidebar/topbar)
│   └── views/
│       ├── dashboard.js
│       ├── contractistas.js
│       ├── obligaciones.js
│       ├── actividades.js
│       ├── calendario.js
│       ├── buscador.js
│       └── informes.js
└── apps-script/               # Backend (se copia a un proyecto Apps Script)
    ├── appsscript.json        # Manifiesto (timezone, scopes, web app)
    ├── Code.gs                # doGet/doPost + enrutador de acciones
    ├── Setup.gs               # Crea hojas + carpeta Drive (ejecutar 1 vez)
    ├── Utils.gs               # Acceso genérico a Sheets
    ├── Contratistas.gs        # CRUD contratistas + contratos
    ├── Obligaciones.gs        # CRUD + reordenar
    ├── Actividades.gs         # CRUD + fotos
    ├── Drive.gs               # Carpetas Contratista/Año/Mes/Actividad + subida
    ├── IA.gs                  # Análisis (Claude/OpenAI/Gemini + heurístico)
    ├── WordGenerator.gs       # Informe .docx por obligación
    └── Reminders.gs           # Recordatorio diario 6 PM
```

---

## 🚀 Despliegue

### Parte A — Frontend en GitHub Pages

1. Crea un repositorio (p. ej. `parche-zipa`) y sube **todo el contenido** de esta carpeta a la raíz.
2. En GitHub: **Settings → Pages → Build and deployment**.
   - **Source:** *Deploy from a branch*.
   - **Branch:** `main` · **Folder:** `/ (root)` → **Save**.
3. Espera 1–2 min. Tu app queda en:
   `https://<tu-usuario>.github.io/parche-zipa/`
4. Ábrela: ya funciona en **modo demo**. 🎉

> El router usa rutas por hash (`#/dashboard`), así que **no necesitas configuración extra** de GitHub Pages para el enrutado.

### Parte B — Backend en Google Apps Script

1. Crea una hoja nueva en **Google Sheets** (será la base de datos).
2. **Extensiones → Apps Script**.
3. Copia **cada archivo** de `apps-script/` como un archivo del proyecto (mismos nombres, `.gs`). Pega también `appsscript.json` (activa *Project Settings → Show "appsscript.json"*).
4. Asegúrate de que el token coincida:
   - `Code.gs` → `var API_TOKEN = 'parche-zipa-2026';`
   - `js/config.js` → `API_TOKEN: 'parche-zipa-2026'`.
5. En el editor, ejecuta **una vez** la función **`setupParcheZipa`** y autoriza los permisos. Esto crea todas las hojas y la carpeta raíz en Drive.
   *(Opcional: ejecuta `seedDemoData` para cargar un contratista de ejemplo.)*
6. **Implementar → Nueva implementación → Aplicación web**:
   - **Ejecutar como:** *Yo*.
   - **Quién tiene acceso:** *Cualquier usuario*.
   - **Implementar** y copia la **URL `/exec`**.
7. Pega esa URL en `js/config.js`:
   ```js
   API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```
8. Vuelve a subir `js/config.js` a GitHub. La app pasa de **demo** a **producción** automáticamente. ✅

### Parte C — Inteligencia Artificial (opcional pero recomendado)

1. Abre la hoja **`Configuracion`** creada por el setup.
2. Ajusta:
   - `AI_PROVIDER` → `claude` · `openai` · `gemini`.
   - `AI_API_KEY` → tu clave del proveedor elegido.
   - (Opcional) `AI_MODEL_CLAUDE` / `AI_MODEL_OPENAI` / `AI_MODEL_GEMINI`.
3. Si no configuras clave, el sistema usa un **análisis heurístico local** que siempre funciona.

### Parte D — Recordatorios 6:00 PM

En el editor de Apps Script ejecuta **una vez** `installReminderTrigger`. Crea un disparador diario a la hora de `Configuracion → REMINDER_HOUR` (18 por defecto) que envía correo a los contratistas sin registro ese día.

---

## 🗂️ Esquema de Google Sheets (automático)

`setupParcheZipa` crea estas hojas con encabezados:

- **Contratos** — `id, contractistaId, numero, objeto, dependencia, supervisor, plazoInicial, prorroga, plazoTotal, valorInicial, valorAdicion, valorTotal, fechaInicio, fechaTerminacion, fechaCorte, fechaEntregaInforme`
- **Contratistas** — `id, nombre, documento, email, telefono, cargo`
- **Obligaciones** — `id, contractistaId, orden, nombre, descripcion, color, icon, estado`
- **Actividades** — `id, contractistaId, obligacionId, fecha, lugar, descripcion, lat, lng, createdAt`
- **Fotografias** — `id, actividadId, url, driveId, nombre, createdAt`
- **Usuarios** — `id, role, nombre, contractistaId, email, activo`
- **Configuracion** — `clave, valor`
- **Logs** — `fecha, tipo, detalle`

## 🖼️ Estructura de Google Drive (automática)

```
Parche Zipa — Evidencias/
└── {Contratista}/
    ├── {Año}/{Mes}/{Actividad}/  → fotos
    └── Informes/                  → .docx generados
```

---

## 🎨 Identidad visual

Morado `#6C3BFF` → lila, con amarillo `#FFC700`, verde neón `#2BFFAC`, blanco y negro. Tipografías **Space Grotesk** + **Plus Jakarta Sans**, iconos **Material Symbols Rounded**. Estética startup juvenil (Notion + Linear + Monday + Stripe), no institucional.

> 🔁 **Logo:** `assets/logo.svg` es un **placeholder**. Reemplázalo por el logo oficial de Parche Zipa (mismo nombre de archivo) para que aparezca en el menú lateral y en el informe.

---

## 🔌 Contrato de la API

```
POST {API_URL}
Body (text/plain): { "action": "...", "token": "...", "payload": { ... } }
Respuesta:         { "ok": true, "result": ... }  |  { "ok": false, "error": "..." }
```

Acciones: `login`, `bootstrap`, `listContractistas`, `saveContractista`, `deleteContractista`, `saveContract`, `saveObligacion`, `deleteObligacion`, `reorderObligaciones`, `saveActividad`, `deleteActividad`, `duplicateActividad`, `analyzeIA`, `generateReport`.

> Se usa `Content-Type: text/plain` a propósito para **evitar el preflight CORS** de Apps Script.

---

## 🛠️ Solución de problemas

- **La app sigue en demo:** revisa que `API_URL` termine en `/exec` y que volviste a publicar `config.js`.
- **"Token inválido":** el token debe ser idéntico en `Code.gs` y `config.js`.
- **No suben fotos / no genera Word:** vuelve a ejecutar `setupParcheZipa` y autoriza **todos** los permisos (Drive y Documentos).
- **Cambié el backend y no se refleja:** crea una **nueva versión** de la implementación (Apps Script no actualiza `/exec` automáticamente salvo que elijas "Nueva versión").
- **Imágenes del informe no cargan:** las fotos deben estar compartidas "cualquiera con el enlace" (el backend lo hace automáticamente al subirlas).

---

## 📌 Notas de alcance honestas

- **Dictado por voz** y **geolocalización** usan APIs nativas del navegador (funcionan en Chrome/Edge; el dictado depende de soporte de `SpeechRecognition`).
- **OCR** sobre fotografías queda preparado a nivel de flujo (las imágenes ya viven en Drive); para activarlo conecta Google **Vision API** o Drive OCR desde `Drive.gs`.
- **Exportar Excel/PDF**: el Word `.docx` es nativo; Excel/PDF pueden añadirse exportando desde las mismas hojas/documento.
- El **modo demo** replica el backend en memoria, por lo que los cambios no persisten al recargar (eso es esperado sin `API_URL`).

---

Hecho con 💜 para el **Parche Zipa** · Zipaquirá.
