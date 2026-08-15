// Pruebas en navegador real (Chromium vía Playwright).
//
// Hay dos cosas que no se pueden comprobar en Node y que son justo el corazón
// de la app: la fotometría foliar (necesita canvas de verdad) y que la
// interfaz haga lo que dicen los modelos. Este archivo cubre las dos, y ya ha
// pagado su coste: encontró que los píxeles oscuros del FONDO se contaban como
// tejido muerto —cualquier foto sobre fondo oscuro informaba de media planta
// necrosada— y que la clave dicotómica confundía "roseta erecta" con "roseta
// compacta" por comparar con `includes`.
//
//   npm run test:navegador     (arranca y para el servidor él solo)

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUERTO = 5199
const BASE = `http://localhost:${PUERTO}`

let fallos = 0
const ok = (c, m) => { if (!c) fallos++; console.log(`${c ? '  OK  ' : ' FALLO'} │ ${m}`) }
const pct = (x) => `${Math.round(x * 100)}%`

/** Busca el Chromium de Playwright esté donde esté (local o CI). */
function rutaChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!base || !existsSync(base)) return undefined
  const dir = readdirSync(base).find((d) => /^chromium-\d+$/.test(d))
  if (!dir) return undefined
  const exe = join(base, dir, 'chrome-linux', 'chrome')
  return existsSync(exe) ? exe : undefined
}

async function esperarServidor(intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(BASE)
      if (r.ok) return true
    } catch { /* aún arrancando */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

// Se arranca vite directamente, sin pasar por `npx`: con el envoltorio de npx
// de por medio, matar el proceso hijo deja al servidor vivo y huérfano — el
// runner de CI lo delataba con "Terminate orphan process (esbuild)", y en local
// dejaba el puerto ocupado, así que la segunda ejecución fallaba por --strictPort.
const servidor = spawn(
  process.execPath,
  [join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PUERTO), '--strictPort'],
  { cwd: RAIZ, stdio: 'ignore' }
)
let parado = false
const parar = () => {
  if (parado) return
  parado = true
  try { servidor.kill('SIGTERM') } catch { /* ya muerto */ }
}
process.on('exit', parar)
process.on('SIGINT', () => { parar(); process.exit(130) })

if (!(await esperarServidor())) {
  console.error('No se pudo arrancar el servidor de desarrollo.')
  parar()
  process.exit(1)
}

const browser = await chromium.launch({ executablePath: rutaChromium() })
const page = await browser.newPage({ viewport: { width: 430, height: 900 } })
const errores = []
page.on('pageerror', (e) => errores.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })

// ═══════════════════════════════════════════════════════════════════════
// 1. FOTOMETRÍA FOLIAR sobre hojas sintéticas de patología conocida
// ═══════════════════════════════════════════════════════════════════════
await page.goto(BASE, { waitUntil: 'networkidle' })

const hojas = await page.evaluate(async () => {
  const { analizarHoja } = await import('/src/photometry.js')
  const VERDE = '#3c8c32'
  const AMARILLO = '#d2c83c'
  const PARDO = '#6e4623'

  function hoja(pintar) {
    const c = document.createElement('canvas')
    c.width = 300; c.height = 300
    const x = c.getContext('2d', { willReadFrequently: true })
    // Fondo OSCURO a propósito: es el caso que rompía el analizador.
    x.fillStyle = '#101010'; x.fillRect(0, 0, 300, 300)
    x.save()
    x.beginPath(); x.ellipse(150, 150, 110, 135, 0, 0, 7); x.clip()
    pintar(x)
    x.restore()
    return x.getImageData(0, 0, 300, 300)
  }

  const casos = {}
  casos.sana = hoja((x) => { x.fillStyle = VERDE; x.fillRect(0, 0, 300, 300) })

  // Nitrógeno: amarilleo uniforme por todo el limbo.
  casos.nitrogeno = hoja((x) => { x.fillStyle = AMARILLO; x.fillRect(0, 0, 300, 300) })

  // Hierro: limbo amarillo con los nervios todavía verdes.
  casos.hierro = hoja((x) => {
    x.fillStyle = AMARILLO; x.fillRect(0, 0, 300, 300)
    x.strokeStyle = VERDE; x.lineWidth = 7
    x.beginPath(); x.moveTo(150, 10); x.lineTo(150, 290); x.stroke()
    for (let i = -5; i <= 5; i++) {
      x.beginPath(); x.moveTo(150, 150 + i * 24); x.lineTo(20, 150 + i * 24 - 40); x.stroke()
      x.beginPath(); x.moveTo(150, 150 + i * 24); x.lineTo(280, 150 + i * 24 - 40); x.stroke()
    }
  })

  // Sales o sed: borde quemado, centro sano.
  casos.borde = hoja((x) => {
    x.fillStyle = PARDO; x.fillRect(0, 0, 300, 300)
    x.fillStyle = VERDE
    x.beginPath(); x.ellipse(150, 150, 88, 112, 0, 0, 7); x.fill()
  })

  // Asfixia: manchas blandas en el interior del limbo.
  casos.interior = hoja((x) => {
    x.fillStyle = VERDE; x.fillRect(0, 0, 300, 300)
    x.fillStyle = PARDO
    for (const [cx, cy, rr] of [[130, 120, 34], [180, 190, 28], [120, 200, 22]]) {
      x.beginPath(); x.ellipse(cx, cy, rr, rr, 0, 0, 7); x.fill()
    }
  })

  const out = {}
  for (const [k, img] of Object.entries(casos)) out[k] = analizarHoja(img)
  return out
})

console.log('\n── FOTOMETRÍA FOLIAR sobre hojas sintéticas ─────────')
for (const [k, m] of Object.entries(hojas)) {
  console.log(`  ${k.padEnd(10)} sana=${pct(m.fraccionSana).padStart(4)} amarillo=${pct(m.fraccionClorosis).padStart(4)} ` +
    `muerto=${pct(m.fraccionNecrosis).padStart(4)} internervial=${m.internervial.toFixed(2)} ` +
    `sesgoMargen=${m.sesgoMarginal >= 0 ? '+' : ''}${m.sesgoMarginal.toFixed(2)} DGCI=${m.dgci.toFixed(2)}`)
}
console.log('')
ok(hojas.sana.fraccionSana > 0.95, 'hoja sana sobre FONDO OSCURO: 100 % sana, sin necrosis fantasma')
ok(hojas.sana.fraccionNecrosis < 0.03, 'el fondo oscuro no se cuenta como tejido muerto (regresión conocida)')
ok(hojas.nitrogeno.fraccionClorosis > 0.9, 'nitrógeno: detecta el amarilleo generalizado')
ok(hojas.nitrogeno.dgci < hojas.sana.dgci, 'nitrógeno: el DGCI (clorofila) cae respecto a la sana')
ok(hojas.hierro.internervial > 0.25, 'hierro: nervios verdes sobre limbo amarillo')
ok(hojas.hierro.internervial > hojas.nitrogeno.internervial * 2,
  `hierro vs nitrógeno separados (${hojas.hierro.internervial.toFixed(2)} vs ${hojas.nitrogeno.internervial.toFixed(2)}) — es LA distinción clínica`)
ok(hojas.borde.sesgoMarginal > hojas.interior.sesgoMarginal + 0.2,
  `borde vs interior separados (${hojas.borde.sesgoMarginal.toFixed(2)} vs ${hojas.interior.sesgoMarginal.toFixed(2)}) — sales/sed frente a asfixia`)

// ═══════════════════════════════════════════════════════════════════════
// 2. CADENA COMPLETA: píxeles → fotometría → diagnóstico
// ═══════════════════════════════════════════════════════════════════════
console.log('── CADENA COMPLETA: píxeles → diagnóstico ───────────')
const veredictos = await page.evaluate(async (m) => {
  const { diagnosticar } = await import('/src/diagnose.js')
  const { porId } = await import('/src/species.js')
  const ctx = (hoja, especie, extra = {}) => diagnosticar({
    hoja,
    luz: { dliMedido: extra.dli ?? especie.dli.opt },
    agua: { fraccionRestante: extra.agua ?? 0.5, riesgoAsfixia: extra.asfixia ?? 0.2, diasSaturado: 2 },
    clima: { tempC: 21, humedadRel: 55 },
    especie,
    historia: { diasDesdeRiego: 4, diasDesdeAbono: extra.diasAbono ?? 60 },
    sustrato: { ph: extra.ph ?? 6.2, ceEstimada: 1.0 },
  })
  const potos = porId('potos')
  const limonero = porId('limonero')
  const r = (d) => ({ id: d.principal.id, nombre: d.principal.nombre, p: d.principal.probabilidad })
  return {
    sana: r(ctx(m.sana, potos)),
    hierro: r(ctx(m.hierro, limonero, { dli: 24, ph: 7.6 })),
    nitrogeno: r(ctx(m.nitrogeno, potos, { diasAbono: 400 })),
    borde: r(ctx(m.borde, potos)),
    interior: r(ctx(m.interior, potos, { agua: 0.9, asfixia: 0.8, dli: 1 })),
  }
}, hojas)

for (const [k, v] of Object.entries(veredictos)) {
  console.log(`  ${k.padEnd(10)} → ${v.nombre} ${Math.round(v.p * 100)}%`)
}
ok(veredictos.sana.p < 0.2, 'hoja sana: ninguna hipótesis pasa el umbral → "sin problema"')
ok(veredictos.hierro.id === 'clorosis_fe', 'internervial + pH alto → clorosis férrica, desde los píxeles reales')
ok(veredictos.nitrogeno.id === 'falta_n', 'amarilleo uniforme + mucho sin abonar → falta de nitrógeno')
ok(['sales', 'hr_baja', 'falta_agua'].includes(veredictos.borde.id), 'daño marginal → sales, humedad baja o sed')
ok(['exceso_agua', 'pudricion'].includes(veredictos.interior.id), 'manchas internas + saturado → exceso de agua o pudrición')

// ═══════════════════════════════════════════════════════════════════════
// 3. INTERFAZ: que la app haga lo que dicen los modelos
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── INTERFAZ ─────────────────────────────────────────')
ok(await page.locator('text=Añadir mi primera planta').isVisible(), 'estado vacío con llamada a la acción')
await page.click('text=Añadir mi primera planta')
await page.waitForTimeout(400)
ok(await page.locator('.tarjeta', { hasText: 'Qué darle hoy' }).isVisible(), 'se abre la ficha con la receta')
ok(await page.locator('.accion').count() > 0, 'la receta produce acciones concretas')
ok((await page.locator('.accion .porque').first().textContent()).length > 20, 'cada acción explica su porqué')

const val = async (etq) => (await page.locator('.medida', { hasText: etq }).locator('.val').textContent()).trim()
const consumo = await val('Consumo')
ok(/\d/.test(consumo) && !consumo.includes('NaN'), `consumo calculado sin NaN (${consumo})`)

// Gravimetría: la resta debe verse en pantalla, no solo en el motor.
await page.fill('input[placeholder="ej. 1850"]', '1850')
await page.fill('input[placeholder="ej. 1420"]', '1420')
await page.fill('input[placeholder="pésala y escríbelo"]', '1600')
await page.waitForTimeout(500)
const exacta = await page.locator('text=Medida exacta').locator('..').textContent()
ok(exacta.includes('250 ml'), 'gravimetría: 1850 − 1600 = 250 ml, en la interfaz')

// Cuaderno encadenado.
await page.click('text=He regado')
await page.waitForTimeout(400)
const hash1 = await page.locator('.hist .hash').first().textContent()
await page.click('text=He abonado')
await page.waitForTimeout(400)
const hash2 = await page.locator('.hist .hash').first().textContent()
ok(await page.locator('.hist li').count() === 2, 'las dos anotaciones entran en el cuaderno')
ok(hash1 !== hash2, `los hashes encadenados avanzan (${hash1} → ${hash2})`)

await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(500)
ok(await page.locator('.planta-fila').count() === 1, 'la planta sobrevive a la recarga')

// El modelo reacciona en vivo al cambiar de especie.
await page.click('.planta-fila')
await page.waitForTimeout(300)
await page.click('text=⚙️ Ficha')
await page.waitForTimeout(300)
const selEspecie = page.locator('label.campo:has(span:text-is("Especie")) select')
const dias = async () => parseFloat(await val('Próximo riego'))
await selEspecie.selectOption('helecho')
await page.waitForTimeout(500)
const dHelecho = await dias()
await selEspecie.selectOption('cactus')
await page.waitForTimeout(500)
const dCactus = await dias()
ok(dCactus > dHelecho * 2, `de helecho (${dHelecho} d) a cactus (${dCactus} d), el intervalo se alarga en vivo`)

// Clave dicotómica local, sin red.
await page.click('text=🔍 Identificar')
await page.waitForTimeout(300)
await page.click('text=Sin conexión')
await page.waitForTimeout(300)
await page.click('text=Sí, gruesos y carnosos')
await page.click('text=Roseta compacta, hojas en círculo')
await page.waitForTimeout(500)
const mejor = await page.locator('.planta-fila .nombre').first().textContent()
ok(/Echeveria|Aloe/i.test(mejor),
  `suculenta en roseta → ${mejor} (no una sansevieria, que es roseta ERECTA — regresión conocida)`)

// ═══════════════════════════════════════════════════════════════════════
// 4. MASCOTAS: la alerta del lirio tiene que ser imposible de pasar por alto
// ═══════════════════════════════════════════════════════════════════════
console.log('\n── MASCOTAS ─────────────────────────────────────────')
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.click('text=Añadir mi primera planta')
await page.waitForTimeout(400)
await page.click('text=⚙️ Ficha')
await page.waitForTimeout(300)
const selEsp = page.locator('label.campo:has(span:text-is("Especie")) select')
await selEsp.selectOption('lirio')
await page.waitForTimeout(500)

const avisoFicha = await page.locator('.aviso', { hasText: 'Gatos:' }).first().textContent()
ok(/mortal/i.test(avisoFicha), 'la ficha del lirio avisa de que es mortal para gatos')
ok(/Perros/.test(avisoFicha), 'y distingue el riesgo del perro, que es distinto')

await page.click('text=← Mis plantas')
await page.waitForTimeout(400)
const alerta = page.locator('.aviso.danger', { hasText: 'Peligro para gatos' })
ok(await alerta.isVisible(), 'con un lirio en casa, la lista muestra alerta roja sin tener que buscarla')
const textoAlerta = await alerta.textContent()
ok(/polen|jarrón/.test(textoAlerta), 'la alerta explica las vías no obvias: polen y agua del jarrón')

await page.click('text=Ver qué hacer')
await page.waitForTimeout(500)
ok(await page.locator('text=potencialmente mortal').first().isVisible(), 'el panel de mascotas encabeza con el veredicto')
await page.locator('.planta-fila').first().click()
await page.waitForTimeout(400)
const detalle = await page.locator('.tarjeta', { hasText: 'Nefrotoxina' }).last().textContent()
ok(/48 h/.test(detalle), 'el detalle indica la ventana de 48 h que decide el pronóstico')
ok(/NO provoques el vómito/i.test(detalle), 'nunca recomienda provocar el vómito')
ok(/Alternativa segura/.test(detalle), 'ofrece una alternativa segura para sustituirla')

// Cambiar a perro debe cambiar el veredicto: el lirio no le hace lo mismo.
await page.click('text=🐕 Perro')
await page.waitForTimeout(500)
const hayCriticaPerro = await page.locator('.aviso.danger', { hasText: 'mortal' }).count()
ok(hayCriticaPerro === 0, 'al cambiar a perro el lirio deja de ser mortal: el modelo distingue por animal')

const reales = errores.filter((e) => !/favicon|manifest|sourcemap/i.test(e))
ok(reales.length === 0, reales.length ? `errores de consola: ${reales.slice(0, 3).join(' | ')}` : 'ningún error de JavaScript en toda la sesión')

await browser.close()
parar()
console.log(fallos ? `\n${fallos} comprobación(es) fallida(s).\n` : '\nTodas las comprobaciones de navegador pasan.\n')
process.exit(fallos ? 1 : 0)
