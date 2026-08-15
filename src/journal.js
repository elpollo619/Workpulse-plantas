// Cuaderno de cultivo encadenado con SHA-256, heredado de la libreta de campo
// de Workpulse 360. Cada anotación incluye el hash de la anterior, así que el
// historial es solo-añadir y verificable.
//
// Aquí no es una manía criptográfica: el historial ES el instrumento. Todo el
// diagnóstico se apoya en "cuándo regaste por última vez" y "cuánto pesaba la
// maceta el mes pasado". Un historial que se puede retocar a posteriori —
// aunque sea sin querer, al reordenar o al reimportar un respaldo — envenena
// el modelo. Encadenado, cualquier alteración se detecta al verificar.

const KEY = 'workpulse.plantas.diario.v1'

function cargar() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? []
  } catch {
    return []
  }
}

async function sha256Hex(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Tipos de anotación que entienden los modelos. */
export const EVENTOS = {
  riego: { label: 'Riego', icono: '💧' },
  abono: { label: 'Abono', icono: '🧪' },
  peso: { label: 'Pesada', icono: '⚖️' },
  luz: { label: 'Medida de luz', icono: '☀️' },
  foto: { label: 'Foto y diagnóstico', icono: '📷' },
  trasplante: { label: 'Trasplante', icono: '🪴' },
  poda: { label: 'Poda', icono: '✂️' },
  plaga: { label: 'Tratamiento de plaga', icono: '🐛' },
  nota: { label: 'Nota', icono: '📝' },
  mudanza: { label: 'Cambio de sitio', icono: '📦' },
}

/**
 * Añade una entrada al diario de una planta. Nunca lanza: el registro no debe
 * poder romper la app.
 */
export async function anotar(plantaId, tipo, datos = {}) {
  try {
    const log = cargar()
    const prev = log.length ? log[log.length - 1].hash : 'GENESIS'
    const entrada = { ts: new Date().toISOString(), plantaId, tipo, datos, prev }
    entrada.hash = await sha256Hex(prev + JSON.stringify([entrada.ts, plantaId, tipo, datos]))
    log.push(entrada)
    localStorage.setItem(KEY, JSON.stringify(log))
    return entrada
  } catch {
    return null
  }
}

/** Historial completo de una planta, del más reciente al más antiguo. */
export function historial(plantaId) {
  return cargar().filter((e) => e.plantaId === plantaId).reverse()
}

/** Diario entero (para exportar el proyecto). */
export function diarioCompleto() {
  return cargar()
}

/** Última entrada de un tipo dado. */
export function ultimo(plantaId, tipo) {
  const h = historial(plantaId)
  return h.find((e) => e.tipo === tipo) ?? null
}

/** Días transcurridos desde el último evento de ese tipo, o null. */
export function diasDesde(plantaId, tipo) {
  const e = ultimo(plantaId, tipo)
  if (!e) return null
  return (Date.now() - new Date(e.ts).getTime()) / 86400000
}

/**
 * Serie temporal de un campo numérico: la base de las curvas de crecimiento y
 * del histórico de peso.
 */
export function serie(plantaId, tipo, campo) {
  return cargar()
    .filter((e) => e.plantaId === plantaId && e.tipo === tipo)
    .map((e) => ({ ts: new Date(e.ts).getTime(), valor: e.datos?.[campo] }))
    .filter((p) => typeof p.valor === 'number' && isFinite(p.valor))
    .sort((a, b) => a.ts - b.ts)
}

/** Verifica la cadena completa. false si alguien la ha alterado. */
export async function verificar() {
  const log = cargar()
  let prev = 'GENESIS'
  for (const e of log) {
    const esperado = await sha256Hex(prev + JSON.stringify([e.ts, e.plantaId, e.tipo, e.datos]))
    if (esperado !== e.hash || e.prev !== prev) return false
    prev = e.hash
  }
  return true
}

/** Resumen para el informe. */
export function resumen() {
  const log = cargar()
  if (!log.length) return null
  return {
    entradas: log.length,
    desde: log[0].ts,
    hasta: log[log.length - 1].ts,
    cabeza: log[log.length - 1].hash,
  }
}

/** Restaura un diario completo desde un respaldo. */
export function restaurar(log) {
  if (!Array.isArray(log)) return false
  localStorage.setItem(KEY, JSON.stringify(log))
  return true
}
