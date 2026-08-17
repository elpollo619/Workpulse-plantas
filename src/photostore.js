// Almacén de fotos en IndexedDB. Las fotos de las plantas nunca salen del
// dispositivo: el análisis es local y la única llamada de red opcional es la
// identificación por Pl@ntNet, que la persona decide en cada caso.

const DB = 'workpulse-plantas'
const STORE = 'fotos'

function abrir() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        const s = req.result.createObjectStore(STORE, { keyPath: 'id' })
        s.createIndex('plantaId', 'plantaId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, modo) {
  return db.transaction(STORE, modo).objectStore(STORE)
}

/** Guarda una foto asociada a una planta, con sus métricas ya calculadas. */
export async function guardarFoto({ id, plantaId, blob, metricas, exif, ts }) {
  const db = await abrir()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').put({
      id: id ?? `${plantaId}-${Date.now()}`,
      plantaId,
      blob,
      metricas: metricas ?? null,
      exif: exif ?? null,
      ts: ts ?? Date.now(),
    })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Todas las fotos de una planta, de la más antigua a la más reciente. */
export async function fotosDe(plantaId) {
  const db = await abrir()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').index('plantaId').getAll(plantaId)
    req.onsuccess = () => resolve((req.result ?? []).sort((a, b) => a.ts - b.ts))
    req.onerror = () => reject(req.error)
  })
}

/** Todas las fotos guardadas (para el respaldo completo). */
export async function todasLasFotos() {
  const db = await abrir()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll()
    req.onsuccess = () => resolve(req.result ?? [])
    req.onerror = () => reject(req.error)
  })
}

export async function borrarFoto(id) {
  const db = await abrir()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(id)
    req.onsuccess = resolve
    req.onerror = () => reject(req.error)
  })
}

export async function borrarFotosDe(plantaId) {
  const fotos = await fotosDe(plantaId)
  await Promise.all(fotos.map((f) => borrarFoto(f.id)))
}
