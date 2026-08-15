// LUXÓMETRO POR EXIF — la función inédita del proyecto.
//
// Nadie mide la luz de sus plantas porque un cuantómetro PAR cuesta 300 €.
// Pero cualquier móvil ya lleva un fotómetro calibrado: al disparar anota
// apertura, tiempo e ISO, y esos tres números determinan la luminancia de la
// escena. Deshaciendo la ecuación de exposición se recupera esa luminancia y,
// de ahí, los lux, el PPFD y el DLI — que es la magnitud que de verdad decide
// si una planta crece, se estira o se quema.
//
//   Ecuación del fotómetro (ISO 2720, luz reflejada):
//       N² / t = L · S / K          →   L = K · N² / (t · S)
//   con K = 12.5 (constante de Canon/Nikon; Sekonic usa 12.5, Minolta 14).
//
//   La cámara expone para un gris medio del 18 %. Si la foto sale más clara o
//   más oscura que ese gris, hay que corregir con la luminancia media medida
//   en los píxeles (linealizada quitando la gamma sRGB):
//       L_escena = L_fotómetro · (Ȳ_lineal / 0.18)
//
//   Iluminancia sobre una superficie lambertiana de reflectancia ρ:
//       E = π · L / ρ
//
//   Y de lux a fotones útiles para la fotosíntesis (PAR), dividiendo por la
//   eficacia luminosa del espectro de la fuente, que NO es la misma en el sol
//   que en un LED — de ahí el selector de fuente.
//
// Todo el cálculo declara su incertidumbre: es un instrumento, no un adorno.

/** Constante del fotómetro de luz reflejada (ISO 2720). */
const K = 12.5

/** Reflectancias de las superficies que se pueden usar como referencia. */
export const REFERENCIAS = [
  { id: 'papel', label: 'Folio blanco', rho: 0.85, sigma: 0.05, ayuda: 'Lo más preciso: pon un folio donde está la planta y fotografíalo de frente, llenando el encuadre.' },
  { id: 'gris', label: 'Tarjeta gris 18 %', rho: 0.18, sigma: 0.01, ayuda: 'Referencia fotográfica de laboratorio. La mejor si la tienes.' },
  // Ojo con este valor: el gris al que se calibran los fotómetros NO es el 18 %
  // de la tarjeta fotográfica. Las dos constantes ISO 2720 (K = 12.5 para luz
  // reflejada, C = 250 para incidente) solo son consistentes entre sí si la
  // reflectancia efectiva es ρ = π·K/C = 0.157. Usar 0.18 aquí daría lecturas
  // un 12 % bajas: con este valor, la medida coincide con la regla del "sunny
  // 16" y con un luxómetro incidente.
  { id: 'escena', label: 'La escena tal cual', rho: 0.157, sigma: 0.055, ayuda: 'Sin referencia: se asume el "mundo gris" al que calibran los fotómetros. Cómodo, pero ±35 %.' },
  { id: 'hoja', label: 'La propia hoja', rho: 0.11, sigma: 0.03, ayuda: 'Las hojas verdes reflejan ~11 % en el visible. Útil si no tienes folio a mano.' },
]

/**
 * Eficacia luminosa de la radiación PAR por tipo de fuente: cuántos lux
 * equivale 1 µmol·m⁻²·s⁻¹. El error de usar el factor del sol con un LED es
 * de más del 30 %, y es el fallo típico de las apps de "medir luz".
 */
export const FUENTES = [
  { id: 'sol', label: 'Luz de ventana (sol)', lxPorUmol: 54, sigma: 3 },
  { id: 'nublado', label: 'Ventana en día nublado', lxPorUmol: 52, sigma: 3 },
  { id: 'led_frio', label: 'LED blanco frío', lxPorUmol: 74, sigma: 6 },
  { id: 'led_calido', label: 'LED blanco cálido', lxPorUmol: 82, sigma: 7 },
  { id: 'led_cultivo', label: 'LED de cultivo (rosa)', lxPorUmol: 28, sigma: 8 },
  { id: 'fluorescente', label: 'Fluorescente', lxPorUmol: 74, sigma: 6 },
  { id: 'incandescente', label: 'Bombilla incandescente', lxPorUmol: 50, sigma: 5 },
]

/** Deshace la gamma sRGB para volver a luminancia lineal. */
function sRGBaLineal(c) {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/**
 * Luminancia relativa media de la imagen (0–1, lineal), ponderada al centro:
 * el fotómetro de la cámara también mide preferentemente el centro del cuadro.
 */
export function luminanciaMedia(imageData) {
  const { data, width, height } = imageData
  let suma = 0
  let peso = 0
  const cx = width / 2
  const cy = height / 2
  const r2max = cx * cx + cy * cy
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4
      if (data[i + 3] < 128) continue
      const Y =
        0.2126 * sRGBaLineal(data[i]) +
        0.7152 * sRGBaLineal(data[i + 1]) +
        0.0722 * sRGBaLineal(data[i + 2])
      // Ponderación central suave (mide más el centro, como la cámara).
      const dx = x - cx
      const dy = y - cy
      const w = 1 - 0.6 * ((dx * dx + dy * dy) / r2max)
      suma += Y * w
      peso += w
    }
  }
  return peso > 0 ? suma / peso : 0.18
}

/**
 * Fracción de píxeles quemados (canal ≥ 250) o empastados (≤ 5). Si es alta,
 * la exposición está recortada y la medida deja de ser fiable: hay que
 * avisarlo en vez de dar un número bonito y falso.
 */
export function recorte(imageData) {
  const { data } = imageData
  let alto = 0
  let bajo = 0
  let n = 0
  for (let i = 0; i < data.length; i += 16) {
    const m = Math.max(data[i], data[i + 1], data[i + 2])
    if (m >= 250) alto++
    else if (m <= 5) bajo++
    n++
  }
  return n ? { quemado: alto / n, empastado: bajo / n } : { quemado: 0, empastado: 0 }
}

/**
 * Mide la luz a partir del EXIF y de los píxeles.
 *
 * @param {object} exif      salida de readExif (necesita exposureTime, fNumber, iso)
 * @param {number} yMedia    luminancia lineal media de la imagen (0–1)
 * @param {object} opciones  { referencia, fuente, recorte }
 * @returns {object|null} medida completa con incertidumbre, o null sin EXIF
 */
export function medirLuz(exif, yMedia, opciones = {}) {
  const t = exif?.exposureTime
  const N = exif?.fNumber
  const S = exif?.iso
  if (!(t > 0 && N > 0 && S > 0)) return null

  const ref = REFERENCIAS.find((r) => r.id === opciones.referencia) ?? REFERENCIAS[2]
  const fuente = FUENTES.find((f) => f.id === opciones.fuente) ?? FUENTES[0]

  // 1) Valor de exposición referido a ISO 100.
  const ev100 = Math.log2((N * N) / t) - Math.log2(S / 100)

  // 2) Luminancia que la cámara creyó medir (gris medio).
  const Lmetro = (K * N * N) / (t * S)

  // 3) Corrección por lo clara u oscura que salió realmente la foto.
  const y = Math.min(Math.max(yMedia, 0.002), 0.98)
  const Lescena = Lmetro * (y / 0.18)

  // 4) Iluminancia sobre la superficie (lambertiana, reflectancia ρ).
  const lux = (Math.PI * Lescena) / ref.rho

  // 5) Fotones fotosintéticos.
  const ppfd = lux / fuente.lxPorUmol

  // --- Incertidumbre combinada (propagación en cuadratura, como en 360) ---
  // Cuantización EXIF de t/N/S (~4 %), reflectancia, espectro de la fuente y
  // la propia linealización de la respuesta del sensor (~8 %).
  const uRho = ref.sigma / ref.rho
  const uFuente = fuente.sigma / fuente.lxPorUmol
  const rec = opciones.recorte ?? { quemado: 0, empastado: 0 }
  const uRecorte = Math.min(0.6, (rec.quemado + rec.empastado) * 2.5)
  const uLux = Math.sqrt(0.04 ** 2 + 0.08 ** 2 + uRho ** 2 + uRecorte ** 2)
  const uPpfd = Math.sqrt(uLux ** 2 + uFuente ** 2)

  let fiabilidad = 'A'
  if (uPpfd > 0.2) fiabilidad = 'B'
  if (uPpfd > 0.35 || rec.quemado > 0.12) fiabilidad = 'C'

  const avisos = []
  if (rec.quemado > 0.08) avisos.push('Hay zonas quemadas en la foto: la medida se queda corta. Repite con menos exposición o sin apuntar al sol directo.')
  if (rec.empastado > 0.2) avisos.push('Gran parte de la foto está subexpuesta; la medida puede exagerar la luz.')
  if (exif.flash && exif.flash % 2 === 1) avisos.push('La foto se tomó con flash: la medida no representa la luz ambiente.')
  if (ref.id === 'escena') avisos.push('Sin superficie de referencia la incertidumbre es alta. Con un folio blanco baja a la mitad.')

  return {
    ev100,
    luminancia: Lescena,
    lux,
    ppfd,
    incertidumbreLux: uLux,
    incertidumbrePpfd: uPpfd,
    fiabilidad,
    avisos,
    referencia: ref,
    fuente,
    ajusteImagen: y / 0.18,
    exposicion: { t, N, S },
  }
}

/**
 * DLI (Daily Light Integral) en mol·m⁻²·día⁻¹ — la magnitud que de verdad
 * gobierna el crecimiento, porque integra intensidad Y duración:
 *     DLI = PPFD · horas · 3600 / 10⁶
 * Una ventana muy luminosa 2 h da lo mismo que un rincón discreto 10 h.
 */
export function dli(ppfd, horas) {
  return (ppfd * horas * 3600) / 1e6
}

/**
 * Compara el DLI medido con el que pide la especie y traduce a una acción
 * concreta ("acércala 60 cm a la ventana"), no a un adjetivo vago.
 */
export function veredictoLuz(dliMedido, especie) {
  const { min, opt, max } = especie.dli
  if (dliMedido < min * 0.6) {
    return { estado: 'muy_baja', texto: 'Muy por debajo de lo que necesita: sobrevive, pero no crecerá y se irá estirando.', factor: opt / Math.max(dliMedido, 0.05) }
  }
  if (dliMedido < min) {
    return { estado: 'baja', texto: 'Justo por debajo del mínimo. Crecimiento lento y hojas nuevas más pequeñas.', factor: opt / Math.max(dliMedido, 0.05) }
  }
  if (dliMedido > max) {
    return { estado: 'excesiva', texto: 'Por encima de lo que tolera: riesgo de quemadura y decoloración.', factor: opt / dliMedido }
  }
  if (dliMedido > opt * 1.25) {
    return { estado: 'alta', texto: 'Buena luz, en el límite alto. Vigila el borde de las hojas en verano.', factor: 1 }
  }
  return { estado: 'optima', texto: 'En el rango óptimo de la especie.', factor: 1 }
}

/**
 * Cuánto gana o pierde de luz si mueve la planta. La luz de una ventana cae
 * aproximadamente con el cuadrado de la distancia más un término difuso, así
 * que se puede decir a la persona exactamente cuántos centímetros mover.
 *
 * @returns factor multiplicador del PPFD al pasar de d0 a d1 (cm de la ventana)
 */
export function factorDistancia(d0Cm, d1Cm) {
  const f = (d) => 1 / (1 + ((d + 30) / 100) ** 1.7)
  return f(d1Cm) / f(d0Cm)
}

/** Distancia a la que habría que poner la planta para alcanzar el factor pedido. */
export function distanciaObjetivo(d0Cm, factorDeseado) {
  let mejor = d0Cm
  let err = Infinity
  for (let d = 5; d <= 500; d += 5) {
    const e = Math.abs(factorDistancia(d0Cm, d) - factorDeseado)
    if (e < err) {
      err = e
      mejor = d
    }
  }
  return mejor
}
