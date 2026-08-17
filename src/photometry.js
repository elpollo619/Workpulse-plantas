// Fotometría foliar: leer el estado de la planta en los píxeles.
//
// La idea inédita no es "detectar que la hoja está amarilla" — eso lo ve
// cualquiera. Es leer DÓNDE está el amarillo, porque el patrón espacial es lo
// que separa las causas, exactamente igual que en patología vegetal de campo:
//
//   · amarillo uniforme en hojas viejas ......... falta de nitrógeno
//   · amarillo entre nervios, nervios verdes .... falta de hierro o magnesio
//   · borde seco y crujiente ..................... sales, poca humedad, sed
//   · manchas blandas oscuras .................... exceso de agua, pudrición
//   · punteado fino y decolorado ................. araña roja
//
// Todo se calcula en canvas, en el dispositivo. La foto no sale del móvil.

/** RGB (0–255) → HSV con H en grados, S y V en 0–1. */
export function rgbAhsv(r, g, b) {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === R) h = 60 * (((G - B) / d) % 6)
    else if (max === G) h = 60 * ((B - R) / d + 2)
    else h = 60 * ((R - G) / d + 4)
  }
  if (h < 0) h += 360
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

/**
 * Índice DGCI (Dark Green Color Index), publicado para estimar el nitrógeno
 * foliar a partir de una foto normal. Va de 0 (amarillo pálido) a 1 (verde
 * oscuro intenso). Es la métrica de referencia en agronomía de bajo coste.
 */
export function dgci(h, s, v) {
  const hh = Math.min(Math.max((h - 60) / 60, 0), 1)
  return (hh + (1 - s) + (1 - v)) / 3
}

// Clases de píxel.
const FONDO = 0
const SANA = 1
const CLOROSIS = 2
const NECROSIS = 3
const SUSTRATO = 4
const OSCURO = 5 // provisional: se resuelve por conectividad, ver resolverOscuros

function clasificar(r, g, b) {
  const { h, s, v } = rgbAhsv(r, g, b)

  // Tierra: pardo oscuro y poco saturado, en la mitad inferior de la gama.
  if (h >= 5 && h <= 45 && s < 0.5 && v < 0.42) return SUSTRATO

  // Necrosis parda: marrón definido dentro del rango de tejido.
  if (h >= 8 && h <= 45 && v < 0.55 && s > 0.12) return NECROSIS

  // Un píxel casi negro puede ser dos cosas opuestas: una mancha de tejido
  // muerto DENTRO de la hoja, o simplemente el fondo de la foto. Decidirlo por
  // el color es imposible, así que aquí solo se marca y se resuelve después
  // por conectividad (resolverOscuros). Darlo por muerto sin más hacía que
  // cualquier foto con fondo oscuro —de noche, sobre un mueble, a contraluz—
  // informara de media planta necrosada.
  if (v < 0.14) return OSCURO

  // Clorosis: amarillos y amarillo-verdosos con saturación apreciable.
  if (h > 42 && h < 78 && s > 0.25 && v > 0.32) return CLOROSIS

  // Tejido sano: verdes.
  if (h >= 78 && h <= 175 && s > 0.14 && v > 0.1) return SANA

  return FONDO
}

/** Erosión binaria: sirve para separar el margen de la hoja del interior. */
function erosionar(mask, w, h) {
  const out = new Uint8Array(mask.length)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (!mask[i]) continue
      if (mask[i - 1] && mask[i + 1] && mask[i - w] && mask[i + w]) out[i] = 1
    }
  }
  return out
}

/**
 * Decide qué son los píxeles oscuros: fondo de la foto o tejido muerto.
 *
 * El criterio es topológico, no cromático: el fondo está conectado con el
 * borde del encuadre, y una mancha necrosada dentro de una hoja no lo está.
 * Es el clásico "rellenado de huecos" de morfología de imagen, y resuelve de
 * un plumazo el falso positivo de fotografiar la planta sobre fondo oscuro.
 */
function resolverOscuros(clase, w, h) {
  const n = w * h
  const alcanzado = new Uint8Array(n)
  const pila = []

  const sembrar = (i) => {
    if (!alcanzado[i] && (clase[i] === FONDO || clase[i] === OSCURO)) {
      alcanzado[i] = 1
      pila.push(i)
    }
  }
  for (let x = 0; x < w; x++) { sembrar(x); sembrar((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { sembrar(y * w); sembrar(y * w + w - 1) }

  while (pila.length) {
    const i = pila.pop()
    const x = i % w
    if (x > 0) sembrar(i - 1)
    if (x < w - 1) sembrar(i + 1)
    if (i >= w) sembrar(i - w)
    if (i < n - w) sembrar(i + w)
  }

  for (let i = 0; i < n; i++) {
    if (clase[i] !== OSCURO) continue
    // Conectado al borde → es el fondo. Encerrado por hoja → tejido muerto.
    clase[i] = alcanzado[i] ? FONDO : NECROSIS
  }
}

/**
 * Analiza una foto de la planta y devuelve métricas de salud foliar.
 *
 * @param {ImageData} imageData
 * @returns métricas normalizadas + patrón espacial del daño
 */
export function analizarHoja(imageData) {
  const { data, width: w, height: h } = imageData
  const n = w * h
  const clase = new Uint8Array(n)
  const hojaMask = new Uint8Array(n)

  // Pasada 1: color.
  for (let i = 0; i < n; i++) {
    const p = i * 4
    if (data[p + 3] < 128) continue
    clase[i] = clasificar(data[p], data[p + 1], data[p + 2])
  }

  // Pasada 2: los oscuros se deciden por conectividad con el borde.
  resolverOscuros(clase, w, h)

  // Pasada 3: recuentos e índices, ya sobre clases definitivas.
  let nSana = 0
  let nClorosis = 0
  let nNecrosis = 0
  let nSustrato = 0
  let sumaDgci = 0
  let sumaExg = 0

  for (let i = 0; i < n; i++) {
    const c = clase[i]
    if (c === SANA || c === CLOROSIS || c === NECROSIS) {
      hojaMask[i] = 1
      const p = i * 4
      const r = data[p]
      const g = data[p + 1]
      const b = data[p + 2]
      const { h: hh, s, v } = rgbAhsv(r, g, b)
      sumaDgci += dgci(hh, s, v)
      // Excess Green normalizado: proxy directo de densidad de clorofila.
      const sum = r + g + b || 1
      sumaExg += (2 * g - r - b) / sum
    }
    if (c === SANA) nSana++
    else if (c === CLOROSIS) nClorosis++
    else if (c === NECROSIS) nNecrosis++
    else if (c === SUSTRATO) nSustrato++
  }

  const nHoja = nSana + nClorosis + nNecrosis
  if (nHoja < n * 0.01) {
    return { valido: false, motivo: 'No se reconoce suficiente superficie de hoja en la foto. Acércate más y encuadra el follaje.' }
  }

  // --- Patrón espacial: margen contra interior -----------------------------
  // Tres erosiones dejan fuera una banda de ~3 px por lado; con la imagen
  // reescalada a ~320 px eso es aproximadamente el 5–8 % exterior de la hoja,
  // que es la franja donde aparece la quemadura por sales o por sed.
  let interior = hojaMask
  for (let k = 0; k < 3; k++) interior = erosionar(interior, w, h)

  let margenDanado = 0
  let margenTotal = 0
  let interiorDanado = 0
  let interiorTotal = 0
  for (let i = 0; i < n; i++) {
    if (!hojaMask[i]) continue
    const danado = clase[i] === CLOROSIS || clase[i] === NECROSIS
    if (interior[i]) {
      interiorTotal++
      if (danado) interiorDanado++
    } else {
      margenTotal++
      if (danado) margenDanado++
    }
  }

  // --- Textura: clorosis internervial --------------------------------------
  // Si los nervios siguen verdes mientras el limbo amarillea, dentro de la
  // hoja conviven clases distintas a poca distancia. Se mide contando, en el
  // vecindario de cada píxel clorótico, cuántos vecinos siguen sanos.
  let contactoVerdeAmarillo = 0
  let totalClorosis = 0
  for (let y = 4; y < h - 4; y += 1) {
    for (let x = 4; x < w - 4; x += 1) {
      const i = y * w + x
      if (clase[i] !== CLOROSIS) continue
      totalClorosis++
      // Basta UN vecino verde: un píxel amarillo pegado a un nervio solo tiene
      // verde por el lado del nervio, así que exigir dos lados dejaba fuera
      // justo el caso que se quiere detectar. Se mira a dos distancias para
      // no depender del grosor del nervio ni de la resolución.
      const verde =
        clase[i - 2] === SANA || clase[i + 2] === SANA ||
        clase[i - 2 * w] === SANA || clase[i + 2 * w] === SANA ||
        clase[i - 4] === SANA || clase[i + 4] === SANA ||
        clase[i - 4 * w] === SANA || clase[i + 4 * w] === SANA
      if (verde) contactoVerdeAmarillo++
    }
  }

  // --- Punteado fino (araña roja / trips) ----------------------------------
  // Decoloración moteada: alta frecuencia espacial dentro de tejido sano.
  let moteado = 0
  let muestrasMoteado = 0
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x
      if (!hojaMask[i]) continue
      muestrasMoteado++
      const p = i * 4
      const centro = data[p + 1]
      const vecinos = [data[p - 4 + 1], data[p + 4 + 1], data[p - w * 4 + 1], data[p + w * 4 + 1]]
      const varianza = vecinos.reduce((a, v) => a + (v - centro) ** 2, 0) / 4
      if (varianza > 340) moteado++
    }
  }

  const fClorosis = nClorosis / nHoja
  const fNecrosis = nNecrosis / nHoja
  const dgciMedio = sumaDgci / nHoja
  const exgMedio = sumaExg / nHoja

  return {
    valido: true,
    pixelesHoja: nHoja,
    coberturaHoja: nHoja / n,
    coberturaSustrato: nSustrato / n,
    fraccionSana: nSana / nHoja,
    fraccionClorosis: fClorosis,
    fraccionNecrosis: fNecrosis,
    dgci: dgciMedio,
    exg: exgMedio,
    // Patrón (0–1): a cuánto se concentra el daño en el borde.
    danoMargen: margenTotal ? margenDanado / margenTotal : 0,
    danoInterior: interiorTotal ? interiorDanado / interiorTotal : 0,
    sesgoMarginal: margenTotal && interiorTotal
      ? (margenDanado / margenTotal) - (interiorDanado / interiorTotal)
      : 0,
    // El índice solo tiene sentido si hay amarilleo de verdad: con cuatro
    // píxeles amarillos de borde antialiasado —todos pegados a verde— salía
    // 0.99 y gritaba "clorosis férrica" en una hoja perfectamente sana.
    internervial: totalClorosis > Math.max(50, nHoja * 0.02)
      ? contactoVerdeAmarillo / totalClorosis
      : 0,
    moteado: muestrasMoteado ? moteado / muestrasMoteado : 0,
  }
}

/**
 * Humedad del sustrato por reflectancia. La tierra mojada es notablemente más
 * oscura que la seca (el agua rellena los poros y elimina la dispersión
 * múltiple). Normalizando por la exposición EXIF, el brillo del sustrato se
 * convierte en un higrómetro sin sonda: basta calibrar una vez con la foto
 * recién regada y otra con la maceta seca.
 *
 * @param {ImageData} imageData
 * @param {object} exif   para normalizar por exposición
 */
export function reflectanciaSustrato(imageData, exif) {
  const { data, width: w, height: h } = imageData
  let suma = 0
  let n = 0
  // La tierra está en la parte baja del encuadre en la inmensa mayoría de
  // fotos de macetas; el tercio inferior evita contar follaje.
  for (let y = Math.floor(h * 0.62); y < h; y++) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (clasificar(r, g, b) !== SUSTRATO) continue
      suma += 0.2126 * r + 0.7152 * g + 0.0722 * b
      n++
    }
  }
  if (n < 200) return null

  const brillo = suma / n / 255
  // Normalización por exposición: el mismo sustrato fotografiado con el doble
  // de tiempo de exposición sale el doble de claro sin haberse secado.
  const t = exif?.exposureTime
  const N = exif?.fNumber
  const S = exif?.iso
  const ev = t > 0 && N > 0 && S > 0 ? Math.log2((N * N) / t) - Math.log2(S / 100) : null
  return { brillo, ev, pixeles: n }
}

/**
 * Interpola la humedad del sustrato entre las dos referencias calibradas.
 * Devuelve la fracción de agua disponible (0 = punto de riego, 1 = capacidad).
 */
export function humedadPorColor(medida, calibracion) {
  if (!medida || !calibracion?.humedo || !calibracion?.seco) return null
  // Se compara en escala logarítmica corregida por EV para que sea invariante
  // a la exposición con la que se tomó cada foto.
  const norm = (m) => Math.log2(Math.max(m.brillo, 0.004)) + (m.ev ?? 0)
  const aHumedo = norm(calibracion.humedo)
  const aSeco = norm(calibracion.seco)
  if (Math.abs(aSeco - aHumedo) < 0.15) return null
  const x = (norm(medida) - aSeco) / (aHumedo - aSeco)
  return Math.min(1, Math.max(0, x))
}

/**
 * Reescala una imagen a un ancho manejable y devuelve su ImageData.
 * 320 px basta para todas las métricas y hace el análisis instantáneo también
 * en un móvil modesto.
 */
export function aImageData(img, anchoMax = 320) {
  const escala = Math.min(1, anchoMax / img.width)
  const w = Math.max(1, Math.round(img.width * escala))
  const h = Math.max(1, Math.round(img.height * escala))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

/** Carga un Blob como HTMLImageElement. */
export function cargarImagen(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

/**
 * Área de dosel proyectada en cm² usando el diámetro de la maceta como escala
 * conocida. Con la superficie foliar real el modelo de transpiración deja de
 * ser una estimación genérica y pasa a ser de ESTA planta.
 */
export function areaDosel(metricas, anchoPx, altoPx, diametroMacetaCm, anchoMacetaPx) {
  if (!(diametroMacetaCm > 0 && anchoMacetaPx > 0)) return null
  const cmPorPx = diametroMacetaCm / anchoMacetaPx
  const areaProyectada = metricas.pixelesHoja * cmPorPx * cmPorPx
  // Índice de área foliar: las hojas se solapan, así que la superficie real
  // que transpira es mayor que la silueta vista desde la cámara.
  return { proyectadaCm2: areaProyectada, foliarCm2: areaProyectada * 1.6, cmPorPx }
}
