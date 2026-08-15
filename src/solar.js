// Astronomía de andar por casa: el fotoperiodo real del sitio donde vive la
// planta. Casi todas las apps dicen "en invierno riega menos"; aquí el
// invierno no es una fecha del calendario sino las horas de luz que de verdad
// entran por la ventana en esa latitud, que es lo que la planta percibe.
//
// Algoritmo NOAA simplificado: declinación solar por el día del año y ángulo
// horario del amanecer. Error < 2 min, más que suficiente.

const RAD = Math.PI / 180

/** Día del año (1–366). */
export function diaDelAno(fecha) {
  const inicio = new Date(fecha.getFullYear(), 0, 0)
  return Math.floor((fecha - inicio) / 86400000)
}

/** Declinación solar en grados. */
export function declinacion(fecha) {
  const n = diaDelAno(fecha)
  return 23.45 * Math.sin(RAD * (360 / 365) * (n - 81))
}

/**
 * Horas de sol sobre el horizonte para una latitud y fecha.
 * En latitudes polares devuelve 0 o 24 sin romperse.
 */
export function fotoperiodo(latitud, fecha = new Date()) {
  const d = declinacion(fecha)
  const cosH = -Math.tan(latitud * RAD) * Math.tan(d * RAD)
  if (cosH >= 1) return 0
  if (cosH <= -1) return 24
  return (2 * Math.acos(cosH) * (180 / Math.PI)) / 15
}

/**
 * Fase estacional 0–1 comparando el fotoperiodo de hoy con el rango anual del
 * lugar: 0 = pleno invierno, 1 = pleno verano. En el trópico sale ≈ 0.5 todo
 * el año, que es justamente lo correcto (allí no hay parada invernal).
 */
export function faseEstacional(latitud, fecha = new Date()) {
  const y = fecha.getFullYear()
  const solsticioV = new Date(y, 5, 21)
  const solsticioI = new Date(y, 11, 21)
  const hoy = fotoperiodo(latitud, fecha)
  const largo = fotoperiodo(latitud, latitud >= 0 ? solsticioV : solsticioI)
  const corto = fotoperiodo(latitud, latitud >= 0 ? solsticioI : solsticioV)
  if (Math.abs(largo - corto) < 0.3) return 0.5
  return Math.min(1, Math.max(0, (hoy - corto) / (largo - corto)))
}

/**
 * Factor de reposo vegetativo (0.35–1). Regula a la vez el riego y el abono:
 * con días cortos la planta cierra estomas antes, transpira menos y no puede
 * usar el nitrógeno — regar y abonar igual que en junio es la causa número uno
 * de pudrición radicular en invierno.
 *
 * Las especies sin parada real (tropicales de interior con luz artificial
 * estable) llevan `dormancia: 'leve'` y apenas bajan.
 */
export function factorReposo(latitud, fecha = new Date(), tipoDormancia = 'media') {
  const fase = faseEstacional(latitud, fecha)
  const amplitud = { nula: 0, leve: 0.25, media: 0.45, fuerte: 0.65 }[tipoDormancia] ?? 0.45
  return 1 - amplitud * (1 - fase)
}

/** Etiqueta legible de la estación fisiológica. */
export function estacionTexto(latitud, fecha = new Date()) {
  const f = faseEstacional(latitud, fecha)
  if (f > 0.82) return 'plena actividad'
  if (f > 0.6) return 'crecimiento'
  if (f > 0.4) return 'transición'
  if (f > 0.2) return 'ralentización'
  return 'reposo invernal'
}
