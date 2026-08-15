// TOXICIDAD PARA GATOS Y PERROS.
//
// Un booleano "tóxica: sí/no" es inútil y además peligroso, porque mete en el
// mismo saco una planta que pica en la boca y otra que mata en 48 horas. Aquí
// cada especie lleva su principio tóxico, su gravedad POR ESPECIE ANIMAL y qué
// hacer, porque las tres cosas cambian el desenlace.
//
// El caso que justifica el módulo entero: los LIRIOS. Cualquier parte de un
// Lilium o un Hemerocallis —una hoja mordida, el polen lamido de una pata, el
// agua del jarrón— provoca fallo renal agudo en el GATO y lo mata en 24–72 h.
// Al perro no le hace prácticamente nada. Y si se trata dentro de las primeras
// 48 horas la supervivencia sube casi al 100 %. Es decir: el pronóstico depende
// de que alguien lo sepa deprisa. Para eso sirve esto.
//
// Fuentes: base de plantas tóxicas de la ASPCA, UC Davis School of Veterinary
// Medicine y MSPCA-Angell. Aun así, esto es orientación, no diagnóstico: ante
// una ingestión real se llama al veterinario, no a una app.

/** Gravedad, ordenada. `sin_datos` NO significa seguro: significa que no se sabe. */
export const NIVELES = {
  letal: { orden: 5, label: 'Potencialmente mortal', tono: 'danger', icono: '☠️' },
  grave: { orden: 4, label: 'Grave', tono: 'danger', icono: '🚨' },
  moderada: { orden: 3, label: 'Moderada', tono: 'warn', icono: '⚠️' },
  leve: { orden: 2, label: 'Leve', tono: 'warn', icono: '⚡' },
  no_toxica: { orden: 1, label: 'No figura como tóxica', tono: 'ok', icono: '✅' },
  sin_datos: { orden: 0, label: 'Sin datos', tono: 'muted', icono: '❔' },
}

/**
 * Principios tóxicos: el mecanismo importa porque determina si el cuadro se
 * queda en la boca o llega al riñón.
 */
export const PRINCIPIOS = {
  oxalato: {
    nombre: 'Rafidios de oxalato cálcico insoluble',
    mecanismo:
      'No es un veneno químico sino una lesión mecánica: la hoja guarda haces de cristales en aguja que se disparan al morderla y se clavan en la mucosa. Duele de inmediato, y ese dolor es lo que suele impedir que el animal siga comiendo — por eso rara vez pasa a mayores.',
    signos: 'Babeo abundante, zarpazos al hocico, sacudir la cabeza, labios y lengua hinchados, dificultad al tragar, vómitos.',
    inicio: 'Inmediato, en segundos o minutos.',
  },
  nefro_lirio: {
    nombre: 'Nefrotoxina de los lirios (aún sin identificar)',
    mecanismo:
      'Destruye el epitelio de los túbulos renales del gato. La dosis tóxica es minúscula: dos o tres pétalos, el polen que se lame de una pata o un sorbo del agua del jarrón bastan. El perro no desarrolla el cuadro renal.',
    signos: 'Vómitos y decaimiento a las 2–12 h; después parece mejorar (fase engañosa) y a las 12–96 h llega el fallo renal: no orina o bebe muchísimo.',
    inicio: 'Digestivo 2–12 h · renal 12–96 h.',
  },
  saponinas: {
    nombre: 'Saponinas',
    mecanismo: 'Detergentes naturales que irritan la mucosa digestiva y rompen membranas celulares.',
    signos: 'Vómitos, diarrea, babeo, apatía. En el gato, a veces pupilas dilatadas.',
    inicio: '2–12 h.',
  },
  glucosidos: {
    nombre: 'Glucósidos cardiacos',
    mecanismo: 'Bloquean la bomba sodio-potasio del músculo cardiaco y alteran el ritmo. Es el mismo mecanismo que la digoxina, sin control de dosis.',
    signos: 'Vómitos, apatía, ritmo cardiaco lento o irregular, colapso.',
    inicio: '1–12 h.',
  },
  cicasina: {
    nombre: 'Cicasina',
    mecanismo: 'Hepatotoxina potente. La semilla es la parte más venenosa. Incluso con tratamiento veterinario agresivo la supervivencia ronda el 50 %.',
    signos: 'Vómitos con sangre, ictericia (encías o piel amarillentas), hemorragias, convulsiones.',
    inicio: '15 min – 3 h; el daño hepático, 2–3 días.',
  },
  grayanotoxina: {
    nombre: 'Grayanotoxinas',
    mecanismo: 'Mantienen abiertos los canales de sodio de las células nerviosas y del corazón.',
    signos: 'Babeo, vómitos, debilidad, ritmo cardiaco anormal, temblores.',
    inicio: 'Pocas horas.',
  },
  terpenoides: {
    nombre: 'Saponinas triterpenoides',
    mecanismo: 'Se concentran en el tubérculo, mucho más que en la hoja o la flor.',
    signos: 'Babeo, vómitos, diarrea. Con cantidades grandes de tubérculo, arritmias.',
    inicio: '1–6 h.',
  },
  latex: {
    nombre: 'Látex irritante',
    mecanismo: 'La savia lechosa irrita piel y mucosas por contacto.',
    signos: 'Babeo, vómitos leves, irritación de boca y ojos si se frota.',
    inicio: 'Inmediato.',
  },
  cianogenicos: {
    nombre: 'Glucósidos cianogénicos',
    mecanismo: 'Liberan cianuro al digerirse. Hace falta cantidad para que sea grave.',
    signos: 'Vómitos, diarrea, apatía; en cantidades grandes, dificultad respiratoria.',
    inicio: '1–6 h.',
  },
  solanina: {
    nombre: 'Solanina y tomatina',
    mecanismo: 'Alcaloides de la parte verde (hoja y tallo), no del fruto maduro.',
    signos: 'Babeo, vómitos, diarrea, apatía, pupilas dilatadas.',
    inicio: '2–12 h.',
  },
}

/**
 * Ficha por especie. `gato` y `perro` van separados a propósito: el lirio es la
 * demostración de que meterlos juntos sería un error grave.
 *
 * Las claves son los mismos id que en species.js.
 */
export const TOXICIDAD = {
  // ---- Emergencia absoluta para gatos -----------------------------------
  lirio: {
    gato: 'letal', perro: 'leve', principio: 'nefro_lirio',
    nota: 'La planta más peligrosa que puede haber en una casa con gato. No hay dosis segura: el polen o el agua del jarrón bastan. Si hay gato, esta planta no entra en casa — ni siquiera en un ramo.',
  },
  cica: {
    gato: 'letal', perro: 'letal', principio: 'cicasina',
    nota: 'Se vende como bonsái o palmerita decorativa y muy poca gente sabe lo que es. Las semillas son la parte más letal.',
  },
  adelfa: {
    gato: 'letal', perro: 'letal', principio: 'glucosidos',
    nota: 'Toda la planta es venenosa, también seca. El agua de un jarrón con adelfa es tóxica.',
  },

  // ---- Graves ------------------------------------------------------------
  dieffenbachia: {
    gato: 'grave', perro: 'grave', principio: 'oxalato',
    nota: 'La de mayor carga de cristales de todas las aráceas: se la llama "caña muda" porque la hinchazón puede llegar a comprometer la vía aérea.',
  },
  azalea: {
    gato: 'grave', perro: 'grave', principio: 'grayanotoxina',
    nota: 'Con unas pocas hojas basta para un cuadro serio.',
  },
  ciclamen: {
    gato: 'grave', perro: 'grave', principio: 'terpenoides',
    nota: 'La hoja da un cuadro leve; el tubérculo desenterrado, uno grave.',
  },
  kalanchoe: {
    gato: 'grave', perro: 'grave', principio: 'glucosidos',
    nota: 'Suculenta de flor muy común en supermercados, y la gente no la asocia con el corazón.',
  },

  // ---- Moderadas: las aráceas de toda la vida ---------------------------
  potos: { gato: 'moderada', perro: 'moderada', principio: 'oxalato', nota: 'La intoxicación más frecuente en gatos de interior, sencillamente porque es la planta más común.' },
  monstera: { gato: 'moderada', perro: 'moderada', principio: 'oxalato' },
  filodendro: { gato: 'moderada', perro: 'moderada', principio: 'oxalato' },
  espatifilo: { gato: 'moderada', perro: 'moderada', principio: 'oxalato', nota: 'Ojo con el nombre: en inglés se llama "peace lily", pero NO es un lirio y no provoca fallo renal. Confundirlos genera pánicos innecesarios y, peor, despistes con los lirios de verdad.' },
  anturio: { gato: 'moderada', perro: 'moderada', principio: 'oxalato' },
  alocasia: { gato: 'moderada', perro: 'moderada', principio: 'oxalato' },
  zamioculca: { gato: 'moderada', perro: 'moderada', principio: 'oxalato' },
  aloe: { gato: 'moderada', perro: 'moderada', principio: 'saponinas', nota: 'El gel interior es inocuo; lo que sienta mal es el látex amarillo de justo bajo la piel de la hoja.' },
  sansevieria: { gato: 'moderada', perro: 'moderada', principio: 'saponinas' },
  dracaena: { gato: 'moderada', perro: 'moderada', principio: 'saponinas', nota: 'En gatos es típico ver pupilas dilatadas además del vómito.' },
  hiedra: { gato: 'moderada', perro: 'moderada', principio: 'saponinas', nota: 'La hoja es más tóxica que la baya.' },
  hortensia: { gato: 'moderada', perro: 'moderada', principio: 'cianogenicos' },
  tomate: { gato: 'moderada', perro: 'moderada', principio: 'solanina', nota: 'Peligro en la mata, no en el fruto maduro.' },
  croton: { gato: 'moderada', perro: 'moderada', principio: 'latex' },

  // ---- Leves -------------------------------------------------------------
  ficus_lyrata: { gato: 'leve', perro: 'leve', principio: 'latex' },
  ficus_elastica: { gato: 'leve', perro: 'leve', principio: 'latex' },
  ficus_benjamina: { gato: 'leve', perro: 'leve', principio: 'latex' },
  bonsai_ficus: { gato: 'leve', perro: 'leve', principio: 'latex' },
  poinsettia: {
    gato: 'leve', perro: 'leve', principio: 'latex',
    nota: 'Tiene fama de mortal y es falso: es de las MENOS peligrosas de esta lista. El mito viene de un caso de 1919 nunca confirmado. Suele quedarse en babeo y algún vómito.',
  },
  tradescantia: { gato: 'leve', perro: 'leve', principio: 'latex', nota: 'Más que intoxicación, dermatitis por contacto con la savia.' },
  crasa_jade: { gato: 'moderada', perro: 'moderada', principio: 'saponinas', nota: 'Mecanismo no del todo aclarado; en gatos puede dar además descoordinación.' },
  clivia: { gato: 'moderada', perro: 'moderada', principio: 'saponinas', nota: 'El bulbo concentra los alcaloides.' },
  begonia: { gato: 'moderada', perro: 'moderada', principio: 'oxalato', nota: 'El tubérculo es la parte problemática.' },

  // ---- Sin toxicidad descrita -------------------------------------------
  calathea: { gato: 'no_toxica', perro: 'no_toxica' },
  helecho: { gato: 'no_toxica', perro: 'no_toxica', nota: 'El helecho de Boston es seguro. Ojo: el "helecho espárrago" (Asparagus) NO lo es, y se confunden.' },
  cinta: { gato: 'no_toxica', perro: 'no_toxica', nota: 'No es tóxica, pero atrae mucho a los gatos y comerla en cantidad les provoca vómitos igualmente.' },
  peperomia: { gato: 'no_toxica', perro: 'no_toxica' },
  kentia: { gato: 'no_toxica', perro: 'no_toxica' },
  areca: { gato: 'no_toxica', perro: 'no_toxica' },
  suculenta_echeveria: { gato: 'no_toxica', perro: 'no_toxica' },
  orquidea: { gato: 'no_toxica', perro: 'no_toxica' },
  albahaca: { gato: 'no_toxica', perro: 'no_toxica' },
  romero: { gato: 'no_toxica', perro: 'no_toxica' },
  menta: { gato: 'no_toxica', perro: 'no_toxica', nota: 'No tóxica, pero en cantidad puede dar molestias digestivas.' },
  lavanda: { gato: 'leve', perro: 'leve', principio: 'latex', nota: 'La planta apenas da problemas; el ACEITE ESENCIAL de lavanda sí es tóxico para el gato, que no metaboliza bien los fenoles.' },
  limonero: { gato: 'leve', perro: 'leve', principio: 'latex', nota: 'Hoja y piel contienen aceites que irritan; el gato es especialmente sensible a los cítricos.' },
  olivo: { gato: 'no_toxica', perro: 'no_toxica' },
  aspidistra: { gato: 'no_toxica', perro: 'no_toxica' },
  cheflera: { gato: 'moderada', perro: 'moderada', principio: 'oxalato' },
  gardenia: { gato: 'leve', perro: 'leve', principio: 'saponinas' },
  cactus: { gato: 'no_toxica', perro: 'no_toxica', nota: 'No es tóxico, pero las espinas causan heridas en boca y ojos: el riesgo es mecánico.' },
}

/** Consulta la ficha de una especie para un animal concreto. */
export function consultar(especieId, animal = 'gato') {
  const t = TOXICIDAD[especieId]
  if (!t) return { nivel: 'sin_datos', ...NIVELES.sin_datos, principio: null, animal }
  const nivel = t[animal] ?? 'sin_datos'
  return {
    nivel,
    ...NIVELES[nivel],
    principio: t.principio ? { id: t.principio, ...PRINCIPIOS[t.principio] } : null,
    nota: t.nota ?? null,
    animal,
  }
}

/**
 * Revisa toda la casa y devuelve el riesgo ordenado de peor a mejor.
 * Es la vista que de verdad sirve: no "¿es tóxica esta?", sino "¿qué tengo yo
 * en casa que pueda matar a mi gato?".
 */
export function revisarCasa(plantas, animal = 'gato') {
  const fichas = plantas.map((p) => {
    const t = consultar(p.especieId, animal)
    return { planta: p, ...t }
  })
  fichas.sort((a, b) => NIVELES[b.nivel].orden - NIVELES[a.nivel].orden)

  const criticas = fichas.filter((f) => f.nivel === 'letal')
  const graves = fichas.filter((f) => f.nivel === 'grave')
  const sinDatos = fichas.filter((f) => f.nivel === 'sin_datos')

  let veredicto
  if (criticas.length) {
    veredicto = {
      tono: 'danger',
      titulo: `${criticas.length} planta${criticas.length > 1 ? 's' : ''} potencialmente mortal${criticas.length > 1 ? 'es' : ''} en casa`,
      texto: 'Sácala de casa o ponla donde el animal no pueda llegar de ninguna manera — y "ninguna manera" con un gato significa otra habitación con la puerta cerrada, no un estante alto.',
    }
  } else if (graves.length) {
    veredicto = {
      tono: 'warn',
      titulo: `${graves.length} planta${graves.length > 1 ? 's' : ''} de riesgo grave`,
      texto: 'Fuera de su alcance. Si le ves interés por ellas, mejor cambiarlas por una alternativa segura.',
    }
  } else if (fichas.some((f) => f.nivel === 'moderada')) {
    veredicto = {
      tono: 'warn',
      titulo: 'Nada mortal, pero sí plantas que le harían pasarlo mal',
      texto: 'Las aráceas (potos, monstera, filodendro) duelen mucho al morderlas aunque rara vez van a más. Un sitio alto y algo de hierba gatera para desviar la atención suele bastar.',
    }
  } else if (sinDatos.length === fichas.length && fichas.length) {
    veredicto = { tono: 'muted', titulo: 'Sin datos de toxicidad', texto: 'No hay ficha para estas especies. Sin datos no quiere decir seguro: compruébalo en la base de la ASPCA.' }
  } else {
    veredicto = { tono: 'ok', titulo: 'Ninguna de tus plantas figura como tóxica', texto: 'Aun así, comer hoja en cantidad puede provocar vómitos en cualquier caso.' }
  }

  return { fichas, criticas, graves, sinDatos, veredicto }
}

/**
 * Qué hacer si ya se la ha comido. Esto no sustituye al veterinario: sirve
 * para no perder los minutos que importan.
 */
export function emergencia(nivel, principio) {
  const comun = [
    'Retira los restos de planta de la boca y guarda un trozo o una foto: identificar la especie cambia el tratamiento.',
    'NO provoques el vómito por tu cuenta. Con cristales de oxalato o savia irritante, vomitar vuelve a quemar el esófago.',
    'No le des leche, aceite ni remedios caseros.',
  ]
  if (nivel === 'letal') {
    return {
      urgencia: 'inmediata',
      titulo: 'Al veterinario AHORA, aunque parezca estar bien',
      pasos: [
        principio === 'nefro_lirio'
          ? 'Con lirios el reloj manda: tratado dentro de las primeras 48 h la supervivencia llega casi al 100 %; pasadas 72 h el pronóstico es malo. Que parezca encontrarse bien es lo esperable en las primeras horas y no significa nada.'
          : 'No esperes a que aparezcan síntomas: cuando se ven, el daño ya está hecho.',
        ...comun,
      ],
    }
  }
  if (nivel === 'grave') {
    return {
      urgencia: 'alta',
      titulo: 'Llama al veterinario hoy mismo',
      pasos: ['Descríbele la planta y cuánto crees que ha comido.', ...comun],
    }
  }
  if (nivel === 'moderada' || nivel === 'leve') {
    return {
      urgencia: 'vigilar',
      titulo: 'Vigílalo y llama si va a más',
      pasos: [
        'Enjuágale la boca con agua o dale algo fresco de comer para arrastrar los cristales.',
        'Al veterinario si babea mucho rato, no puede tragar, se le hincha la cara o vomita repetidamente.',
        ...comun,
      ],
    }
  }
  return {
    urgencia: 'consultar',
    titulo: 'Sin datos: consulta igualmente',
    pasos: ['Que no haya ficha no significa que sea inofensiva.', ...comun],
  }
}

/** Alternativa segura con aspecto y cuidados parecidos, para sustituir. */
export const ALTERNATIVAS = {
  potos: { id: 'cinta', porque: 'También cuelga, también aguanta el olvido y no figura como tóxica.' },
  filodendro: { id: 'peperomia', porque: 'Hoja carnosa parecida, cuidados fáciles y sin toxicidad descrita.' },
  monstera: { id: 'kentia', porque: 'Si buscabas la planta grande de salón, la kentia da el mismo porte sin riesgo.' },
  espatifilo: { id: 'calathea', porque: 'Misma penumbra y mismo aire tropical, sin oxalatos.' },
  anturio: { id: 'calathea', porque: 'Hoja brillante y ambiente húmedo, sin oxalatos.' },
  dieffenbachia: { id: 'peperomia', porque: 'Aspecto jaspeado similar y ningún riesgo para la vía aérea.' },
  sansevieria: { id: 'suculenta_echeveria', porque: 'Suculenta igual de dura y sin toxicidad descrita.' },
  zamioculca: { id: 'peperomia', porque: 'Hoja brillante y resistencia parecida.' },
  aloe: { id: 'suculenta_echeveria', porque: 'Roseta suculenta sin el látex irritante.' },
  hiedra: { id: 'cinta', porque: 'Cuelga igual y es de las pocas trepadoras sin toxicidad descrita.' },
  lirio: { id: 'orquidea', porque: 'Si querías flor duradera en casa con gato, la Phalaenopsis no figura como tóxica.' },
  cica: { id: 'kentia', porque: 'Aspecto de palmera de verdad y sin cicasina.' },
  ciclamen: { id: 'orquidea', porque: 'Flor de interior de temporada sin tubérculo tóxico.' },
  kalanchoe: { id: 'suculenta_echeveria', porque: 'Suculenta compacta sin glucósidos cardiacos.' },
  azalea: { id: 'gardenia', porque: 'Arbusto de flor acidófilo con muchísimo menos riesgo.' },
  adelfa: { id: 'olivo', porque: 'Mediterránea de exterior, igual de resistente y sin veneno cardiaco.' },
}

/** Teléfonos y recursos, por si hay que llamar corriendo. */
export const RECURSOS = [
  { label: 'Tu veterinario habitual o el hospital veterinario de urgencias 24 h más cercano', detalle: 'Es siempre la primera llamada.' },
  { label: 'ASPCA Animal Poison Control (EE. UU.)', detalle: '+1 (888) 426-4435 · 24 h, en inglés y de pago, pero es la referencia mundial en toxicología veterinaria.' },
  { label: 'Base de datos de plantas tóxicas de la ASPCA', detalle: 'aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants — para cualquier especie que no esté en esta app.' },
]
