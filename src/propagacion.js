// PROPAGACIÓN — multiplicar tus plantas, con la probabilidad real de que salga.
//
// Los manuales dicen "haz esquejes en primavera". Pero un esqueje no enraíza
// por el mes del calendario: enraíza por la temperatura de la base, la humedad
// que rodea a una hoja que ya no tiene raíces para reponer agua, y las reservas
// que la planta madre acumuló. Todo eso la app ya lo sabe, así que puede dar un
// número — "hoy 78 %, dentro de tres semanas 45 %" — en vez de una estación.
//
// Y hay un detalle que invierte todo el modelo y que casi nadie sabe:
//
//   · Un esqueje de hoja NORMAL necesita humedad ALTA. Sin raíces, la hoja
//     sigue transpirando y se deshidrata antes de emitir raíz.
//   · Un esqueje de SUCULENTA necesita justo lo contrario: dejar que la herida
//     cicatrice en seco unos días. Metido en ambiente húmedo se pudre antes de
//     enraizar.
//
// Un modelo que no distinga eso da consejos que matan la mitad de los esquejes.

import { faseEstacional } from './solar.js'
import { porId } from './species.js'

/** Métodos de propagación, con lo que de verdad los diferencia. */
export const METODOS = {
  agua: {
    id: 'agua',
    label: 'Esqueje en agua',
    dificultad: 'muy fácil',
    dias: [10, 25],
    base: 0.85,
    humedadAlta: true,
    comoSe: 'Corta un trozo de tallo justo por debajo de un nudo, con 2–3 hojas. Quita las hojas que quedarían sumergidas y ponlo en un vaso con agua a media sombra. Cambia el agua cada 3–4 días.',
    pega: 'Las raíces de agua son más frágiles que las de tierra y sufren al trasplantar. Pasa el esqueje a sustrato cuando midan 3–5 cm, no más: cuanto más largas, peor lo lleva.',
  },
  sustrato: {
    id: 'sustrato',
    label: 'Esqueje directo a sustrato',
    dificultad: 'fácil',
    dias: [21, 45],
    base: 0.72,
    humedadAlta: true,
    comoSe: 'Mismo corte que en agua, pero directo a una mezcla ligera y húmeda. Cúbrelo con una bolsa transparente para mantener la humedad y ábrela un rato cada día.',
    pega: 'No ves lo que pasa abajo, así que hay que resistir la tentación de tirar para comprobar. Si la hoja sigue firme a las tres semanas, va bien.',
  },
  esfagno: {
    id: 'esfagno',
    label: 'Esqueje en musgo esfagno',
    dificultad: 'fácil',
    dias: [14, 30],
    base: 0.88,
    humedadAlta: true,
    comoSe: 'Envuelve el nudo en musgo esfagno húmedo (escurrido, no chorreando) dentro de un táper translúcido.',
    pega: 'Es lo mejor para aráceas: raíz de calidad de tierra pero con la humedad y la visibilidad del agua.',
  },
  hoja: {
    id: 'hoja',
    label: 'Esqueje de hoja',
    dificultad: 'media',
    dias: [30, 90],
    base: 0.6,
    humedadAlta: true,
    comoSe: 'Una hoja entera con su peciolo, enterrada un centímetro en sustrato húmedo.',
    pega: 'Lento: primero saca raíces y solo después brota la planta nueva. Una hoja con raíces pero sin brote todavía no es una planta.',
  },
  hoja_suculenta: {
    id: 'hoja_suculenta',
    label: 'Hoja de suculenta',
    dificultad: 'muy fácil',
    dias: [21, 60],
    base: 0.7,
    humedadAlta: false, // ← al revés que todo lo demás
    comoSe: 'Arranca la hoja entera girándola con cuidado (si dejas un trozo pegado al tallo, no brota). Déjala secar sobre un plato, SIN tierra y SIN agua, 3–5 días hasta que la herida se cierre. Solo entonces apóyala sobre sustrato seco y pulveriza cada pocos días.',
    pega: 'El error universal es plantarla y regarla el primer día: se pudre. La herida tiene que cicatrizar en seco primero.',
  },
  division: {
    id: 'division',
    label: 'División de mata',
    dificultad: 'fácil',
    dias: [1, 14],
    base: 0.92,
    // Ni alta ni baja: una división ya tiene raíces propias, así que no depende
    // de la humedad del aire como un esqueje que aún no puede reponer agua.
    humedadNeutra: true,
    comoSe: 'Saca el cepellón y sepáralo en dos o tres partes, cada una con raíces propias y varios brotes. Con las manos si se deja; con cuchillo limpio si no.',
    pega: 'Es lo que menos falla, porque cada trozo ya tiene raíces: no hay que "crear" nada. Solo funciona en plantas que forman mata o rizoma.',
  },
  acodo: {
    id: 'acodo',
    label: 'Acodo aéreo',
    dificultad: 'media',
    dias: [30, 75],
    base: 0.8,
    humedadAlta: true,
    comoSe: 'Haz un corte superficial en el tallo, envuélvelo en esfagno húmedo y fíjalo con film. Cuando se vean raíces a través del plástico, corta por debajo y planta.',
    pega: 'La solución para troncos gruesos y leñosos, donde el esqueje normal no arraiga. Además rejuvenece una planta que se ha quedado desnuda por abajo.',
  },
}

/**
 * Qué métodos admite cada especie, en orden de preferencia, y lo que hay que
 * saber en cada caso.
 */
export const POR_ESPECIE = {
  potos: { metodos: ['agua', 'esfagno', 'sustrato'], nota: 'El esqueje más agradecido que existe: casi cualquier trozo con un nudo enraíza. Corta por debajo del nudo, que es de donde salen las raíces — un trozo de tallo sin nudo no arraiga nunca.' },
  filodendro: { metodos: ['agua', 'esfagno', 'sustrato'], nota: 'Igual que el potos. Las raíces aéreas que ya asoman aceleran mucho el enraizado.' },
  monstera: { metodos: ['esfagno', 'agua', 'acodo'], nota: 'Cada esqueje necesita al menos un nudo con su raíz aérea. Una hoja suelta sin nudo puede vivir meses en agua y no hacer nunca una planta.' },
  tradescantia: { metodos: ['agua', 'sustrato'], nota: 'Enraíza en días. Mete cinco esquejes en la misma maceta para que salga tupida desde el principio.' },
  hiedra: { metodos: ['agua', 'sustrato'], nota: 'Mejor de tallos jóvenes; los viejos y leñosos cuestan mucho más.' },
  cinta: { metodos: ['division', 'agua'], nota: 'Los hijuelos que cuelgan ya traen raíces empezadas: se cortan y se plantan directamente.' },
  menta: { metodos: ['agua', 'sustrato', 'division'], nota: 'De las más rápidas: raíces visibles en menos de una semana.' },
  albahaca: { metodos: ['agua', 'sustrato'], nota: 'Corta justo antes de que florezca. Una vez en flor, el esqueje pierde vigor.' },
  romero: { metodos: ['sustrato', 'agua'], nota: 'Leñosa: tarda bastante y agradece hormona de enraizado. Usa brotes del año, no madera vieja.' },
  lavanda: { metodos: ['sustrato'], nota: 'Solo de brotes tiernos y sin flor, en sustrato muy drenante. En agua se pudre.' },
  espatifilo: { metodos: ['division'], nota: 'No se hace por esqueje: no tiene tallo que cortar. Se divide la mata al trasplantar.' },
  calathea: { metodos: ['division'], nota: 'Solo por división, y con cuidado: cada trozo necesita raíces propias y unas semanas de mimo tras la operación.' },
  helecho: { metodos: ['division'], nota: 'Por división de rizoma. Las esporas del envés también sirven, pero eso es un proyecto de meses.' },
  aspidistra: { metodos: ['division'], nota: 'División de rizoma. Crece tan despacio que conviene hacer trozos grandes.' },
  clivia: { metodos: ['division'], nota: 'Separa los hijuelos cuando tengan al menos tres hojas propias.' },
  zamioculca: { metodos: ['division', 'hoja'], nota: 'La división es rápida; por hoja funciona pero tarda MESES en formar el tubérculo antes de brotar. Paciencia.' },
  sansevieria: {
    metodos: ['division', 'hoja'],
    nota: 'Aviso importante: las variedades con borde amarillo son quimeras, y propagadas POR HOJA pierden la variegación — salen todas verdes. Si quieres conservar el borde amarillo, solo vale la división.',
  },
  aloe: { metodos: ['division'], nota: 'Por los hijuelos de la base, nunca por hoja: una hoja de aloe se pudre sin brotar.' },
  suculenta_echeveria: { metodos: ['hoja_suculenta', 'division'], nota: 'La hoja tiene que salir entera, con su base: si se rompe y queda un trozo pegado al tallo, no brota jamás.' },
  crasa_jade: { metodos: ['hoja_suculenta', 'sustrato'], nota: 'Funcionan igual de bien la hoja y el esqueje de tallo. Ambos, secar primero.' },
  kalanchoe: { metodos: ['hoja_suculenta', 'sustrato'], nota: 'Muy fácil por hoja; deja cicatrizar como cualquier suculenta.' },
  peperomia: { metodos: ['hoja', 'agua', 'sustrato'], nota: 'Semisuculenta: sirve la hoja con peciolo, pero no la ahogues en agua.' },
  begonia: { metodos: ['hoja', 'sustrato'], nota: 'La técnica clásica: corta los nervios principales del envés y apoya la hoja sobre el sustrato — brota una plantita en cada corte.' },
  ficus_elastica: { metodos: ['acodo', 'sustrato'], nota: 'El esqueje suelta un látex blanco que tapona el corte: enjuágalo con agua templada antes de plantar. El acodo aéreo va mucho mejor.' },
  ficus_lyrata: { metodos: ['acodo', 'agua'], nota: 'Difícil por esqueje. El acodo aéreo es lo que de verdad funciona.' },
  ficus_benjamina: { metodos: ['acodo', 'sustrato'], nota: 'Igual que sus primos: acodo antes que esqueje.' },
  bonsai_ficus: { metodos: ['acodo', 'sustrato'], nota: 'El acodo permite además elegir dónde quieres el nuevo nebari (la base de raíces).' },
  croton: { metodos: ['acodo', 'sustrato'], nota: 'Exige calor de verdad en la base: por debajo de 24 °C no arraiga.' },
  dracaena: { metodos: ['sustrato', 'agua', 'acodo'], nota: 'El truco de la dracaena: el trozo de tronco pelado que sobra también enraíza. Márcalo para no plantarlo del revés.' },
  areca: { metodos: ['division'], nota: 'Solo por división de la mata; no hay esqueje posible en una palmera.' },
  kentia: { metodos: [], nota: 'No se propaga en casa: solo por semilla, que tarda meses en germinar y necesita calor constante. Las macetas que se venden son varias plántulas juntas, no una planta que se pueda dividir.' },
  anturio: { metodos: ['division'], nota: 'Separa los hijuelos con raíz propia al trasplantar.' },
  alocasia: { metodos: ['division'], nota: 'Por los bulbillos que aparecen alrededor del tubérculo. Salen solos al trasplantar.' },
  cheflera: { metodos: ['acodo', 'agua', 'sustrato'], nota: 'El esqueje de punta enraíza razonablemente bien en agua.' },
  gardenia: { metodos: ['sustrato'], nota: 'Difícil: brotes semileñosos, hormona de enraizado y humedad muy alta.' },
  hortensia: { metodos: ['sustrato', 'agua'], nota: 'De brotes sin flor a principios de verano. Muy agradecida.' },
  limonero: { metodos: ['acodo', 'sustrato'], nota: 'Por esqueje sale un árbol sin patrón, más débil y tardío en dar fruto. Los cítricos de vivero van injertados por algo.' },
  olivo: { metodos: ['sustrato', 'acodo'], nota: 'Esqueje semileñoso con calor de fondo. Lento pero seguro.' },
  tomate: { metodos: ['agua', 'sustrato'], nota: 'Los brotes que salen en la axila (los "chupones" que se suelen tirar al podar) enraízan en una semana y dan planta completa.' },
  poinsettia: { metodos: ['sustrato'], nota: 'Enjuaga el látex del corte antes de plantar, como en los ficus.' },
  cactus: { metodos: ['division', 'sustrato'], nota: 'Por hijuelos de la base. Secar el corte una semana larga antes de plantar.' },
  ciclamen: { metodos: ['division'], nota: 'Por división del tubérculo, y con poco éxito. Suele salir más a cuenta comprar otro.' },
  azalea: { metodos: ['sustrato', 'acodo'], nota: 'Brotes semileñosos en sustrato ácido, con humedad alta.' },
  lirio: { metodos: ['division'], nota: 'Separando los bulbos hijos al final del otoño. Recuerda que si tienes gato, esta planta no debería estar en casa.' },
  dieffenbachia: { metodos: ['sustrato', 'agua', 'acodo'], nota: 'La savia es muy irritante: guantes al cortar y no te toques los ojos.' },
  cica: { metodos: ['division'], nota: 'Por los hijuelos de la base, muy lentos. Toda la planta es muy tóxica: guantes.' },
  adelfa: { metodos: ['agua', 'sustrato'], nota: 'Enraíza con facilidad en agua, pero toda la planta es un veneno cardiaco: guantes, y no dejes el vaso al alcance de nadie.' },
  orquidea: { metodos: ['division'], nota: 'Por los keikis (hijuelos que brotan en la vara floral) cuando tengan raíces de 3 cm. La planta en sí no se divide como una mata normal.' },
  generica_verde: { metodos: ['agua', 'sustrato', 'division'], nota: 'Perfil genérico: prueba con esqueje de tallo bajo un nudo.' },
}

/** Factor por temperatura: manda sobre todo lo demás. */
function factorTemperatura(tempC, metodo) {
  // El óptimo de enraizado está en 22–25 °C en la BASE del esqueje, algo por
  // encima del confort de la planta adulta. Por debajo de 16 el proceso se
  // para; por encima de 32 se pudre antes de arraigar.
  const opt = 23.5
  const sigma = metodo === 'division' ? 8 : 5.5 // la división depende mucho menos
  const f = Math.exp(-((tempC - opt) ** 2) / (2 * sigma * sigma))
  return Math.max(0.05, f)
}

/**
 * Factor por humedad. Aquí está la inversión que decide la mitad de los
 * fracasos: al esqueje con hoja le hace falta humedad alta, y a la suculenta
 * justo lo contrario.
 */
function factorHumedad(humedadRel, metodo) {
  const m = METODOS[metodo]
  if (!m) return 0.5
  if (m.humedadNeutra) return 0.92
  if (m.humedadAlta) {
    // Sin raíces, la hoja sigue perdiendo agua: por debajo del 45 % se
    // deshidrata antes de emitir raíz.
    return Math.min(1, Math.max(0.15, (humedadRel - 25) / 50))
  }
  // Suculentas: la humedad alta pudre la herida antes de que cicatrice.
  return Math.min(1, Math.max(0.2, (78 - humedadRel) / 40))
}

/**
 * Factor estacional: reservas de la madre y temporada por delante.
 *
 * Ojo con un error fácil aquí: el fotoperiodo es SIMÉTRICO respecto al
 * solsticio, así que poner el óptimo en un valor intermedio de la fase crea dos
 * picos —uno subiendo y otro bajando— y el modelo acaba recomendando agosto
 * tanto como mayo. Lo que de verdad los separa no es la duración del día, que
 * es la misma, sino la dirección: con los días alargando, el esqueje tiene toda
 * la temporada por delante para establecerse antes del invierno; en días
 * menguantes, no.
 */
function factorEstacion(latitud, fecha) {
  const fase = faseEstacional(latitud, fecha)
  const quince = faseEstacional(latitud, new Date(fecha.getTime() - 15 * 86400000))
  const subiendo = fase >= quince

  const f = (0.28 + 0.72 * fase) * (subiendo ? 1 : 0.85)
  return Math.min(1, Math.max(0.2, f))
}

/**
 * Probabilidad de que el esqueje agarre, en las condiciones dadas.
 * Es una estimación con base fisiológica, no una garantía — y así se dice.
 */
export function exito({ metodoId, especieId, tempC, humedadRel, latitud, fecha = new Date() }) {
  const m = METODOS[metodoId]
  if (!m) return null
  const fT = factorTemperatura(tempC, metodoId)
  const fH = factorHumedad(humedadRel, metodoId)
  const fE = factorEstacion(latitud, fecha)

  const p = m.base * fT * fH * fE
  const factores = [
    { nombre: 'Temperatura', valor: fT, texto: `${tempC} °C (el óptimo de enraizado está en 22–25 °C)` },
    { nombre: 'Humedad', valor: fH, texto: m.humedadNeutra
      ? `${humedadRel} % — apenas influye: cada división ya tiene sus propias raíces`
      : m.humedadAlta
        ? `${humedadRel} % — sin raíces la hoja sigue perdiendo agua, así que cuanta más humedad, mejor`
        : `${humedadRel} % — en suculentas la humedad alta pudre la herida antes de que cicatrice` },
    { nombre: 'Estación', valor: fE, texto: 'las reservas y las hormonas de crecimiento marcan el momento del año' },
  ].sort((a, b) => a.valor - b.valor)

  return {
    probabilidad: Math.min(0.97, Math.max(0.02, p)),
    factores,
    // El factor más bajo es el que está frenando, y es donde merece la pena actuar.
    cuelloBotella: factores[0],
    dias: m.dias,
    metodo: m,
  }
}

/**
 * Probabilidad mes a mes durante un año, para ver de un vistazo si conviene
 * hacerlo ahora o esperar. Es la respuesta honesta a "¿puedo ya?".
 */
export function calendario({ metodoId, especieId, tempC, humedadRel, latitud, fecha = new Date() }) {
  const meses = []
  const año = fecha.getFullYear()
  for (let i = 0; i < 12; i++) {
    const d = new Date(año, fecha.getMonth() + i, 15)
    const r = exito({ metodoId, especieId, tempC, humedadRel, latitud, fecha: d })
    meses.push({
      fecha: d,
      etiqueta: d.toLocaleDateString('es-ES', { month: 'short' }),
      probabilidad: r?.probabilidad ?? 0,
      esAhora: i === 0,
    })
  }
  const mejor = meses.reduce((a, b) => (b.probabilidad > a.probabilidad ? b : a), meses[0])
  const ahora = meses[0]
  return {
    meses,
    mejor,
    ahora,
    // Solo se recomienda esperar si la mejora es apreciable: aplazar tres meses
    // para ganar dos puntos no compensa.
    mereceEsperar: mejor.probabilidad > ahora.probabilidad * 1.25 && !mejor.esAhora,
  }
}

/** Plan completo de propagación para una planta. */
export function planPropagacion({ planta, entorno, fecha = new Date() }) {
  const especie = porId(planta.especieId)
  const ficha = POR_ESPECIE[planta.especieId] ?? POR_ESPECIE.generica_verde

  if (!ficha.metodos.length) {
    return { especie, ficha, opciones: [], imposible: true }
  }

  const opciones = ficha.metodos.map((metodoId) => {
    const r = exito({
      metodoId,
      especieId: planta.especieId,
      tempC: entorno.tempC,
      humedadRel: entorno.humedadRel,
      latitud: entorno.latitud,
      fecha,
    })
    const cal = calendario({
      metodoId,
      especieId: planta.especieId,
      tempC: entorno.tempC,
      humedadRel: entorno.humedadRel,
      latitud: entorno.latitud,
      fecha,
    })
    return { metodoId, ...r, calendario: cal }
  }).sort((a, b) => b.probabilidad - a.probabilidad)

  return { especie, ficha, opciones, imposible: false, mejor: opciones[0] }
}

/**
 * ¿Sirve de algo la hormona de enraizado? La respuesta honesta es "depende", y
 * merece decirse porque se vende como milagro para todo.
 */
export function hormonaUtil(metodoId, especieId) {
  const lenosas = ['romero', 'lavanda', 'olivo', 'gardenia', 'azalea', 'limonero', 'hortensia', 'croton']
  if (metodoId === 'division') {
    return { util: false, texto: 'En una división no pinta nada: cada trozo ya tiene sus raíces.' }
  }
  if (metodoId === 'hoja_suculenta') {
    return { util: false, texto: 'En suculentas no hace falta y además interfiere con el cicatrizado.' }
  }
  if (lenosas.includes(especieId)) {
    return { util: true, texto: 'Aquí sí merece la pena: en tallos leñosos la auxina externa cambia bastante las cosas.' }
  }
  // Sin nombrar especies concretas: puesto en la ficha de una monstera, un
  // "en un potos o un filodendro…" se lee como un texto copiado de otro sitio.
  return { util: false, texto: 'Aquí no aporta nada: esta planta enraíza sola casi siempre. Guárdala para los esquejes leñosos, que es donde de verdad cambia algo.' }
}
