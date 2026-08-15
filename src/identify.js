// Identificación de la especie.
//
// Dos vías, y la segunda importa tanto como la primera:
//
//  1. Pl@ntNet — el proyecto científico del CIRAD/INRIA/IRD con más de 20 000
//     especies y un corpus colaborativo. Su API es gratuita hasta 500
//     peticiones al día. Solo hace falta una clave, que se guarda en el propio
//     dispositivo y nunca viaja a ningún servidor nuestro (no hay servidor).
//
//  2. Clave dicotómica local — sin conexión y sin clave, respondiendo cuatro
//     preguntas sobre la forma de la planta se llega igualmente a un perfil
//     de cuidados válido. Porque la pregunta real no es "¿cómo se llama?" sino
//     "¿qué le doy?", y para eso basta con acertar el TIPO fisiológico.
//     Una app que sin conexión no sirve para nada es una app rota.

import { ESPECIES, buscarEspecie } from './species.js'

const CLAVE_KEY = 'workpulse.plantas.plantnet.key'

export function getApiKey() {
  return localStorage.getItem(CLAVE_KEY) ?? ''
}

export function setApiKey(k) {
  if (k) localStorage.setItem(CLAVE_KEY, k.trim())
  else localStorage.removeItem(CLAVE_KEY)
}

/** Órganos que Pl@ntNet sabe interpretar. 'auto' deja que lo decida el modelo. */
export const ORGANOS = [
  { id: 'auto', label: 'Que lo decida la IA' },
  { id: 'leaf', label: 'Hoja' },
  { id: 'flower', label: 'Flor' },
  { id: 'fruit', label: 'Fruto' },
  { id: 'bark', label: 'Corteza o tallo' },
  { id: 'habit', label: 'La planta entera' },
]

/**
 * Identifica con Pl@ntNet. Hasta 5 fotos del MISMO ejemplar mejoran mucho el
 * acierto (una de hoja y otra del porte general es la mejor combinación).
 *
 * @param {Blob[]} imagenes
 * @param {string[]} organos  mismo orden que las imágenes
 */
export async function identificarPlantNet(imagenes, organos = [], opciones = {}) {
  const clave = opciones.apiKey ?? getApiKey()
  if (!clave) throw new Error('SIN_CLAVE')
  if (!imagenes?.length) throw new Error('Sin imágenes')

  const form = new FormData()
  imagenes.slice(0, 5).forEach((img, i) => {
    form.append('images', img, `planta-${i}.jpg`)
    form.append('organs', organos[i] ?? 'auto')
  })

  const url = new URL('https://my-api.plantnet.org/v2/identify/all')
  url.searchParams.set('api-key', clave)
  url.searchParams.set('lang', 'es')
  url.searchParams.set('include-related-images', 'false')
  url.searchParams.set('nb-results', '6')

  let res
  try {
    res = await fetch(url, { method: 'POST', body: form })
  } catch {
    // Falla de red o bloqueo CORS del navegador. No es motivo para dejar a la
    // persona sin respuesta: se le ofrece la clave local.
    throw new Error('SIN_RED')
  }

  if (res.status === 401 || res.status === 403) throw new Error('CLAVE_INVALIDA')
  if (res.status === 404) throw new Error('SIN_COINCIDENCIA')
  if (res.status === 429) throw new Error('LIMITE_DIARIO')
  if (!res.ok) throw new Error(`Pl@ntNet respondió ${res.status}`)

  const json = await res.json()
  const resultados = (json.results ?? []).map((r) => {
    const cientifico = r.species?.scientificNameWithoutAuthor ?? ''
    const local = buscarEspecie(cientifico) ?? buscarEspecie(r.species?.genus?.scientificNameWithoutAuthor ?? '')
    return {
      cientifico,
      autor: r.species?.scientificNameAuthorship ?? '',
      comunes: r.species?.commonNames ?? [],
      genero: r.species?.genus?.scientificNameWithoutAuthor ?? '',
      familia: r.species?.family?.scientificNameWithoutAuthor ?? '',
      score: r.score ?? 0,
      gbif: r.gbif?.id ?? null,
      perfilLocal: local?.especie ?? null,
      ajusteLocal: local?.ajuste ?? null,
    }
  })

  return {
    resultados,
    mejor: resultados[0] ?? null,
    peticionesRestantes: json.remainingIdentificationRequests ?? null,
  }
}

/**
 * CLAVE DICOTÓMICA LOCAL — funciona sin conexión y sin clave de API.
 *
 * No pretende dar el nombre científico exacto: pretende acertar el perfil
 * fisiológico, que es lo que alimenta los cálculos. Con cuatro respuestas se
 * distingue una suculenta de un helecho, y esa diferencia vale más para el
 * riego que saber si es Echeveria elegans o Echeveria agavoides.
 */
export const PREGUNTAS_CLAVE = [
  {
    id: 'suculenta',
    pregunta: '¿Las hojas o el tallo son gruesos y carnosos, como si guardaran agua dentro?',
    opciones: [
      { id: 'si', label: 'Sí, gruesos y carnosos' },
      { id: 'no', label: 'No, hojas finas o normales' },
      { id: 'espinas', label: 'No tiene hojas, tiene espinas' },
    ],
  },
  {
    id: 'forma',
    pregunta: '¿Qué forma tiene la planta en conjunto?',
    opciones: [
      { id: 'trepadora', label: 'Trepa o cuelga con tallos largos' },
      { id: 'mata', label: 'Mata de hojas que salen del sustrato' },
      { id: 'arbolito', label: 'Tronco leñoso con copa' },
      { id: 'roseta', label: 'Roseta compacta, hojas en círculo' },
      { id: 'palmera', label: 'Palmera: hojas divididas en penacho' },
    ],
  },
  {
    id: 'hoja',
    pregunta: '¿Cómo es la hoja?',
    opciones: [
      { id: 'acorazonada', label: 'Acorazonada o en punta de flecha' },
      { id: 'dividida', label: 'Muy dividida, tipo helecho o pluma' },
      { id: 'cinta', label: 'Larga y estrecha, tipo cinta' },
      { id: 'grande', label: 'Grande, ancha y coriácea' },
      { id: 'pequena', label: 'Pequeña y numerosa' },
      { id: 'aromatica', label: 'Huele al frotarla' },
    ],
  },
  {
    id: 'dibujo',
    pregunta: '¿Tiene dibujo, franjas o colores además del verde?',
    opciones: [
      { id: 'si', label: 'Sí, jaspeada o de varios colores' },
      { id: 'no', label: 'No, verde uniforme' },
    ],
  },
]

/**
 * Puntúa cada especie contra las respuestas. Devuelve las mejores candidatas
 * con su grado de encaje.
 */
export function identificarLocal(respuestas) {
  const puntuar = (e) => {
    let p = 0
    const r = e.rasgos ?? {}

    if (respuestas.suculenta === 'espinas') {
      p += e.tipo === 'cactus' ? 10 : -6
    } else if (respuestas.suculenta === 'si') {
      p += r.suculenta ? 6 : -4
    } else if (respuestas.suculenta === 'no') {
      p += r.suculenta ? -4 : 3
    }

    if (respuestas.forma) {
      const f = r.forma ?? ''
      // Comparación EXACTA, no por subcadena. Con `includes` una sansevieria
      // ("roseta erecta") encajaba en "roseta compacta" y se colaba por delante
      // de las echeverias, que es la respuesta correcta: una lengua de suegra
      // es un penacho de hojas erguidas, no una roseta a ras de suelo.
      const mapa = {
        trepadora: ['trepadora', 'mata colgante'],
        mata: ['mata', 'mata colgante', 'roseta erecta', 'epífita'],
        arbolito: ['arbolito', 'arbusto', 'columnar'],
        roseta: ['roseta'],
        palmera: ['palmera'],
      }
      p += (mapa[respuestas.forma] ?? []).includes(f) ? 5 : -2
    }

    if (respuestas.hoja) {
      const h = r.hoja ?? ''
      const mapa = {
        acorazonada: ['acorazonada', 'sagitada'],
        dividida: ['fronde dividida', 'pinnada', 'compuesta', 'palmeada', 'foliolos'],
        cinta: ['cinta', 'lanceolada'],
        grande: ['grande', 'coriácea', 'fenestrada', 'ancha'],
        pequena: ['pequeña'],
        aromatica: ['aromática'],
      }
      p += (mapa[respuestas.hoja] ?? []).some((x) => h.includes(x)) ? 5 : -1
    }

    if (respuestas.dibujo === 'si') p += r.variegada ? 3 : -2
    if (respuestas.dibujo === 'no') p += r.variegada ? -1 : 2

    return p
  }

  // El encaje se normaliza por lo máximo ALCANZABLE con las preguntas que se
  // han respondido, no por el máximo absoluto. Si no, contestar solo dos de
  // cuatro daría un 55 % a la candidata perfecta y parecería una duda que no
  // existe: lo que falta es información, no acierto.
  const max =
    (respuestas.suculenta ? (respuestas.suculenta === 'espinas' ? 10 : 6) : 0) +
    (respuestas.forma ? 5 : 0) +
    (respuestas.hoja ? 5 : 0) +
    (respuestas.dibujo ? 3 : 0)

  return ESPECIES
    .filter((e) => e.id !== 'generica_verde')
    .map((e) => ({ especie: e, puntos: puntuar(e) }))
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 5)
    .map((x) => ({ ...x, encaje: max > 0 ? Math.max(0, Math.min(1, x.puntos / max)) : 0 }))
}

/** Mensajes de error legibles, con la salida siempre a mano. */
export function explicarError(err) {
  const M = {
    SIN_CLAVE: 'Necesitas una clave gratuita de Pl@ntNet (500 identificaciones al día). Se pide en my.plantnet.org y se guarda solo en este dispositivo. Mientras tanto puedes usar la clave local sin conexión.',
    SIN_RED: 'No se ha podido contactar con Pl@ntNet (sin conexión o bloqueado por el navegador). Usa la identificación local: funciona sin internet.',
    CLAVE_INVALIDA: 'La clave de Pl@ntNet no es válida o ha caducado. Revísala en my.plantnet.org.',
    SIN_COINCIDENCIA: 'Pl@ntNet no ha reconocido la planta. Prueba con una foto de una sola hoja sobre fondo liso, bien iluminada y enfocada.',
    LIMITE_DIARIO: 'Se ha agotado el cupo diario de la clave (500/día). Vuelve mañana o usa la identificación local.',
  }
  return M[err?.message] ?? `No se pudo identificar: ${err?.message ?? 'error desconocido'}`
}
