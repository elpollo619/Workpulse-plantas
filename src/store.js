// Estado persistente: las plantas, el entorno de la casa y las preferencias.

import { fotosDe } from './photostore.js'

const PLANTAS_KEY = 'workpulse.plantas.fichas.v1'
const ENTORNO_KEY = 'workpulse.plantas.entorno.v1'

export const ENTORNO_POR_DEFECTO = {
  tempC: 21,
  humedadRel: 50,
  latitud: 40.4,
  agua: 'media',
  fuenteLuz: 'sol',
  corrienteAire: 1,
}

export const PLANTA_POR_DEFECTO = {
  nombre: 'Mi planta',
  especieId: 'generica_verde',
  diametroCm: 15,
  alturaCm: 14,
  sustrato: 'aireado',
  materialMaceta: 'plastico',
  sinAgujero: false,
  platoConAgua: false,
  areaFoliarCm2: null,
  distanciaVentanaCm: 100,
  abonoTipo: 'universal',
  npk: { n: 7, p: 3, k: 6 },
  fase: 'crecimiento',
  pesoCapacidadG: null,
  pesoSecoG: null,
  calibracionSustrato: null,
  mesesDesdeTrasplante: 6,
}

function cargar(key, porDefecto) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? porDefecto
  } catch {
    return porDefecto
  }
}

export function cargarPlantas() {
  const v = cargar(PLANTAS_KEY, [])
  return Array.isArray(v) ? v : []
}

export function guardarPlantas(plantas) {
  localStorage.setItem(PLANTAS_KEY, JSON.stringify(plantas))
}

export function cargarEntorno() {
  return { ...ENTORNO_POR_DEFECTO, ...cargar(ENTORNO_KEY, {}) }
}

export function guardarEntorno(e) {
  localStorage.setItem(ENTORNO_KEY, JSON.stringify(e))
}

export function nuevaPlanta(parcial = {}) {
  return {
    ...PLANTA_POR_DEFECTO,
    ...parcial,
    id: `p${Date.now()}${Math.floor(Math.random() * 1000)}`,
    creada: new Date().toISOString(),
  }
}

/**
 * GEMELO DIGITAL — curva de crecimiento a partir de las fotos guardadas.
 *
 * Cada foto deja registrada la superficie de dosel en píxeles. Normalizada por
 * el diámetro de la maceta (que es una escala conocida y constante en la
 * imagen), esa serie se convierte en cm² reales a lo largo del tiempo.
 *
 * Sirve para lo que ningún síntoma visible avisa a tiempo: una planta que ha
 * DEJADO de crecer lleva semanas con un problema antes de que se le note en el
 * color. La derivada de la curva es un detector precoz.
 */
export async function curvaCrecimiento(plantaId) {
  const fotos = await fotosDe(plantaId)
  const puntos = fotos
    .filter((f) => f.metricas?.valido && f.metricas.coberturaHoja > 0)
    .map((f) => ({ ts: f.ts, cobertura: f.metricas.coberturaHoja, dgci: f.metricas.dgci }))

  if (puntos.length < 2) {
    return { puntos, tendencia: null, suficiente: false }
  }

  // Regresión lineal sobre la cobertura foliar en función del tiempo (semanas).
  const t0 = puntos[0].ts
  const xs = puntos.map((p) => (p.ts - t0) / (7 * 86400000))
  const ys = puntos.map((p) => p.cobertura)
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  const pendiente = den > 0 ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / den : 0
  const relativa = my > 0 ? pendiente / my : 0

  const semanas = xs[xs.length - 1] - xs[0]
  let estado = 'estable'
  if (relativa > 0.035) estado = 'creciendo'
  else if (relativa < -0.035) estado = 'perdiendo follaje'
  else if (semanas > 4 && Math.abs(relativa) <= 0.035) estado = 'parada'

  // Deriva del verdor: si el DGCI baja de forma sostenida, la clorofila cae
  // aunque la persona todavía no perciba el cambio de color.
  const dgci0 = puntos[0].dgci
  const dgci1 = puntos[puntos.length - 1].dgci
  const derivaVerdor = dgci0 > 0 ? (dgci1 - dgci0) / dgci0 : 0

  return {
    puntos,
    suficiente: semanas >= 1.5,
    semanas,
    crecimientoSemanal: relativa,
    estado,
    derivaVerdor,
    detenido: estado === 'parada' || estado === 'perdiendo follaje',
    texto:
      estado === 'creciendo'
        ? `Creciendo un ${(relativa * 100).toFixed(1)} % de superficie foliar por semana. Va bien.`
        : estado === 'perdiendo follaje'
          ? `Perdiendo un ${(Math.abs(relativa) * 100).toFixed(1)} % de follaje por semana. Algo la está afectando de forma sostenida.`
          : estado === 'parada'
            ? `Sin crecimiento medible en ${semanas.toFixed(0)} semanas. Una planta sana en temporada debería ganar superficie: normalmente es luz, maceta agotada o nitrógeno.`
            : 'Serie todavía corta para hablar de tendencia.',
  }
}

/** Exporta todo el proyecto (sin las fotos, que van aparte por tamaño). */
export function exportarProyecto({ plantas, entorno, diario }) {
  return {
    app: 'workpulse-plantas',
    version: 1,
    exportado: new Date().toISOString(),
    plantas,
    entorno,
    diario,
  }
}
