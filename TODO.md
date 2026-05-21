# TODO - CHIA SEGURA (Hostinger producción)

## Paso 1: Unificación de rutas (assets)
- [ ] Editar TODOS los HTML en `public_html/` para que carguen assets usando únicamente `./css/`, `./js/`, `./config/`
- [ ] Asegurar que no se apunten assets inexistentes (ej: `./js/animations.js`).

## Paso 2: Unificación de panel heatmap
- [ ] Revisar `public_html/heatmap.html` vs `public_html/js/heatmap.js` (IDs y contenedor `incidentsPanel`).
- [ ] Corregir flujo para que el panel renderice y se actualice al enviar incidentes.

## Paso 3: Panel/Tabla reportes + export
- [ ] Revisar `public_html/reportes.html` vs `public_html/js/reportes.js` (botones + IDs + libs).
- [ ] Corregir orden de carga de librerías (xlsx, FileSaver, jsPDF, autotable) antes de `reportes.js`.

## Paso 4: Botón pánico
- [ ] Integrar botón pánico en `public_html/boton-panico.html` con la lógica (audio/vibración/geo/localStorage/toast/modal).

## Paso 5: Validación automática
- [ ] Agregar verificación básica en JS para detectar IDs inexistentes y reportarlo con `console.error`.
- [ ] Ejecutar checklist final: 404/MIME inexistentes, funciones rotas, listeners.

## Paso 6: Documentar resultados
- [ ] Lista final: archivos fallando, funciones rotas, rutas corregidas, listeners faltantes, librerías faltantes.

