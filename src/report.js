// Informe imprimible: una ficha por planta con todas las medidas, el
// diagnóstico razonado y el método, como el informe de obra de Workpulse 360.
// Sirve para llevarlo al vivero, para dejar instrucciones a quien cuida las
// plantas en vacaciones, o simplemente para tener el histórico en papel.

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function fecha(ts) {
  return new Date(ts).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Genera el HTML autónomo del informe. */
export function informeHTML({ fichas, entorno, diario, verificado }) {
  const filas = fichas.map((f) => {
    const acciones = f.receta
      .map((a) => `<li><strong>${esc(a.titulo)}</strong> — ${esc(a.detalle)}<br><em class="pq">${esc(a.porque)}</em></li>`)
      .join('')

    const evidencias = (f.diagnostico?.evidencias ?? [])
      .map((e) => `<li>${esc(e.texto)}</li>`)
      .join('')

    const ranking = (f.diagnostico?.ranking ?? [])
      .slice(0, 4)
      .map((h) => `<tr><td>${esc(h.nombre)}</td><td class="num">${(h.probabilidad * 100).toFixed(0)} %</td></tr>`)
      .join('')

    return `
      <section class="ficha">
        <h2>${esc(f.planta.nombre)} <small>${esc(f.especie.nombre)} · <i>${esc(f.especie.cientifico)}</i></small></h2>

        <div class="cols">
          <table class="med">
            <caption>Medidas</caption>
            <tr><th>Luz (DLI)</th><td>${f.luz?.dliMedido != null ? `${f.luz.dliMedido.toFixed(1)} ± ${(f.luz.dliMedido * f.luz.incertidumbre).toFixed(1)} mol·m⁻²·d⁻¹` : 'sin medir'}</td></tr>
            <tr><th>DLI que pide</th><td>${f.especie.dli.min}–${f.especie.dli.max} (óptimo ${f.especie.dli.opt})</td></tr>
            <tr><th>Volumen de maceta</th><td>${f.agua.litrosMaceta.toFixed(2)} L</td></tr>
            <tr><th>Agua útil</th><td>${Math.round(f.agua.aguaUtilMl)} ml</td></tr>
            <tr><th>Consumo diario</th><td>${f.agua.consumoMlDia.toFixed(0)} ml/día</td></tr>
            <tr><th>Reserva actual</th><td>${Math.round(f.agua.fraccionRestante * 100)} %${f.agua.medidoConBascula ? ' (pesada)' : ' (estimada)'}</td></tr>
            <tr><th>Próximo riego</th><td>${isFinite(f.agua.diasRestantes) ? `en ${f.agua.diasRestantes.toFixed(1)} días · ${f.agua.dosisRiegoMl} ml` : '—'}</td></tr>
            <tr><th>Fiabilidad</th><td>${esc(f.agua.fiabilidad ?? '—')}</td></tr>
          </table>

          <table class="med">
            <caption>Diagnóstico</caption>
            ${ranking}
            <tr><th colspan="2" class="nota">${f.diagnostico?.concluyente ? 'Diagnóstico concluyente.' : 'No concluyente: las dos primeras hipótesis compiten.'}</th></tr>
          </table>
        </div>

        <h3>Qué darle</h3>
        <ol class="acciones">${acciones}</ol>

        ${evidencias ? `<h3>Evidencias consideradas (${f.diagnostico.nEvidencias})</h3><ul class="ev">${evidencias}</ul>` : ''}
        ${f.diagnostico?.siguientePrueba ? `<p class="prueba"><strong>Siguiente medida útil:</strong> ${esc(f.diagnostico.siguientePrueba)}</p>` : ''}
      </section>`
  }).join('')

  const entradas = (diario ?? []).slice(-40).reverse()
    .map((e) => `<tr><td>${fecha(e.ts)}</td><td>${esc(e.tipo)}</td><td class="hash">${esc(e.hash.slice(0, 12))}…</td></tr>`)
    .join('')

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Workpulse Plantas — informe de cuidados</title>
<style>
  body { font-family: system-ui, sans-serif; color: #16202a; margin: 0; padding: 28px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 17px; margin: 0 0 10px; border-bottom: 2px solid #34d399; padding-bottom: 5px; }
  h2 small { font-weight: 400; color: #5a6b7a; font-size: 13px; }
  h3 { font-size: 14px; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: .04em; color: #46596b; }
  .sub { color: #5a6b7a; margin: 0 0 18px; font-size: 13px; }
  .ficha { page-break-inside: avoid; border: 1px solid #dde4ea; border-radius: 10px; padding: 16px 18px; margin-bottom: 18px; }
  .cols { display: flex; gap: 18px; flex-wrap: wrap; }
  table { border-collapse: collapse; font-size: 12.5px; flex: 1; min-width: 260px; }
  caption { text-align: left; font-weight: 600; padding-bottom: 5px; color: #46596b; }
  th, td { border-bottom: 1px solid #eef2f5; padding: 4px 8px 4px 0; text-align: left; vertical-align: top; }
  th { font-weight: 600; width: 42%; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .nota { font-weight: 400; font-style: italic; color: #5a6b7a; }
  .acciones li { margin-bottom: 8px; }
  .pq { color: #5a6b7a; font-size: 12px; }
  .ev { font-size: 12px; color: #46596b; }
  .prueba { background: #f0fbf6; border-left: 3px solid #34d399; padding: 8px 12px; font-size: 12.5px; }
  .pie { margin-top: 22px; font-size: 11px; color: #7b8b99; border-top: 1px solid #dde4ea; padding-top: 10px; }
  .hash { font-family: ui-monospace, monospace; font-size: 11px; }
  @media print { body { padding: 0; } .ficha { border: none; padding: 0 0 12px; } }
</style></head><body>
<h1>🌱 Workpulse Plantas — informe de cuidados</h1>
<p class="sub">
  ${fecha(Date.now())} · ${fichas.length} planta${fichas.length === 1 ? '' : 's'} ·
  Entorno declarado: ${entorno.tempC} °C, ${entorno.humedadRel} % HR, latitud ${entorno.latitud}°
</p>

${filas}

<h3>Cuaderno de cultivo (últimas 40 anotaciones)</h3>
<table><tr><th>Fecha</th><th>Tipo</th><th>Hash encadenado</th></tr>${entradas}</table>

<div class="pie">
  <strong>Método.</strong> La luz se mide reconstruyendo la luminancia de la escena a partir de los
  parámetros de exposición EXIF (ISO 2720, L = K·N²/(t·S), K = 12.5), corregida por la luminancia
  media de los píxeles y convertida a PPFD por la eficacia luminosa del tipo de fuente. El consumo
  de agua se calcula con un modelo de depósito: transpiración = conductancia estomática (curva de
  saturación con la luz medida) × déficit de presión de vapor, integrada sobre el fotoperiodo real
  de la latitud, más la evaporación del sustrato. El diagnóstico combina las evidencias en log-odds
  bayesianos sobre 14 hipótesis. Todas las medidas llevan su incertidumbre declarada.
  <br><br>
  <strong>Integridad.</strong> El cuaderno de cultivo está encadenado con SHA-256:
  cada anotación incluye el hash de la anterior. Verificación en el momento de imprimir:
  <strong>${verificado === true ? 'cadena íntegra ✓' : verificado === false ? 'CADENA ALTERADA ✗' : 'no verificada'}</strong>.
  <br><br>
  Las fotos y los datos no han salido de este dispositivo. Este informe es una ayuda a la decisión,
  no un dictamen fitosanitario: ante sospecha de plaga o enfermedad grave, consulta a un profesional.
</div>
</body></html>`
}

/** Abre el informe en una pestaña para imprimir o guardar como PDF. */
export function abrirInforme(datos) {
  const html = informeHTML(datos)
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  return true
}

/** Descarga el informe como archivo HTML autónomo. */
export function descargarInforme(datos) {
  const blob = new Blob([informeHTML(datos)], { type: 'text/html;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `plantas-${new Date().toISOString().slice(0, 10)}.html`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
