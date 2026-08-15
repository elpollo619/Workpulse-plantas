// Nutrición: convertir "échale un chorrito de abono" en mililitros exactos.
//
// El abono de interior se vende en botellas con un NPK impreso y una dosis
// vaga ("un tapón por regadera"). Como la maceta de cada uno tiene un volumen
// distinto y el agua del grifo ya trae sales, esa dosis puede ser la mitad de
// lo necesario o el triple. Aquí se calcula desde la concentración real del
// producto, el volumen de riego y la conductividad que tolera la especie.
//
// El daño más común no es la falta de abono: es el exceso acumulado. Por eso
// se estima la CE resultante y se avisa antes de pasarse.

/** Fases del cultivo: cambian la proporción NPK que conviene. */
export const FASES = [
  { id: 'crecimiento', label: 'Crecimiento (hoja)', factor: 1.0, sesgo: 'Prioriza el nitrógeno: NPK con la primera cifra más alta.' },
  { id: 'floracion', label: 'Floración / fructificación', factor: 0.9, sesgo: 'Prioriza fósforo y potasio: NPK con las dos últimas cifras más altas.' },
  { id: 'mantenimiento', label: 'Mantenimiento', factor: 0.55, sesgo: 'Media dosis: la planta está estable y no quieres que crezca más.' },
  { id: 'reposo', label: 'Reposo invernal', factor: 0.0, sesgo: 'No abonar: sin luz no puede usar el nitrógeno y se acumula como sal.' },
  { id: 'recuperacion', label: 'Planta recién trasplantada o enferma', factor: 0.0, sesgo: 'No abonar hasta ver crecimiento nuevo: la raíz dañada no absorbe y se quema.' },
]

/** Dureza del agua por región, para el aviso de clorosis férrica. */
export const AGUAS = [
  { id: 'blanda', label: 'Blanda (<10 °dH)', ce: 0.2, ph: 6.8, calcarea: false },
  { id: 'media', label: 'Media (10–20 °dH)', ce: 0.45, ph: 7.4, calcarea: false },
  { id: 'dura', label: 'Dura (>20 °dH)', ce: 0.8, ph: 7.9, calcarea: true },
  { id: 'osmosis', label: 'Ósmosis / destilada', ce: 0.02, ph: 6.5, calcarea: false },
  { id: 'lluvia', label: 'Agua de lluvia', ce: 0.05, ph: 6.2, calcarea: false },
]

/**
 * Dosis de abono líquido en mililitros por riego.
 *
 * @param npk        {n, p, k} en % p/v del producto (lo que pone la etiqueta)
 * @param volumenRiegoMl  el que sale de waterbalance
 * @param ppmObjetivoN    nitrógeno diana en ppm (mg/L)
 */
export function dosisLiquida({ npk, volumenRiegoMl, ppmObjetivoN = 100, fase = 'crecimiento', factorReposo = 1 }) {
  const f = FASES.find((x) => x.id === fase) ?? FASES[0]
  const objetivo = ppmObjetivoN * f.factor * factorReposo
  if (objetivo <= 0 || !(npk?.n > 0)) {
    return { ml: 0, ppmN: 0, fase: f, nota: f.sesgo }
  }
  const litros = volumenRiegoMl / 1000
  // Un producto al X % lleva X g de N por 100 ml → 10·X mg de N por ml.
  const mgNporMl = npk.n * 10
  const mgNecesarios = objetivo * litros
  const ml = mgNecesarios / mgNporMl
  return {
    ml: Math.round(ml * 100) / 100,
    gotas: Math.round(ml * 20),
    ppmN: objetivo,
    ppmP: objetivo * (npk.p / npk.n),
    ppmK: objetivo * (npk.k / npk.n),
    fase: f,
    nota: f.sesgo,
  }
}

/**
 * CE estimada de la disolución de riego. Regla práctica de hidroponía:
 * 1 dS/m ≈ 640 ppm de sales totales. Sumando el agua de partida y el abono se
 * ve si la especie lo va a tolerar antes de echarlo, no después.
 */
export function conductividad({ ppmN, ppmP = 0, ppmK = 0, agua = 'media' }) {
  const a = AGUAS.find((x) => x.id === agua) ?? AGUAS[1]
  // El fertilizante aporta más sales que solo N-P-K (contraiones y micros).
  const ppmTotal = (ppmN + ppmP + ppmK) * 2.2
  const ceAbono = ppmTotal / 640
  return { ce: a.ce + ceAbono, ceAgua: a.ce, ceAbono, agua: a }
}

/** Comprueba la CE contra el límite de la especie y avisa. */
export function veredictoCE(ce, ceMaxEspecie) {
  if (ce > ceMaxEspecie * 1.25) {
    return { estado: 'exceso', texto: `CE ${ce.toFixed(2)} dS/m, muy por encima del máximo de la especie (${ceMaxEspecie}). Reduce la dosis a la mitad o riega con agua de ósmosis.` }
  }
  if (ce > ceMaxEspecie) {
    return { estado: 'alto', texto: `CE ${ce.toFixed(2)} dS/m, en el límite (${ceMaxEspecie}). Riega con abundancia para que drene y arrastre sales.` }
  }
  if (ce < ceMaxEspecie * 0.3) {
    return { estado: 'bajo', texto: `CE ${ce.toFixed(2)} dS/m, holgada. Hay margen para subir la dosis si le falta vigor.` }
  }
  return { estado: 'ok', texto: `CE ${ce.toFixed(2)} dS/m, dentro del rango que tolera.` }
}

/**
 * Disponibilidad de hierro según el pH del sustrato. El hierro se bloquea
 * químicamente por encima de pH 7 aunque el sustrato esté lleno: por eso las
 * hojas nuevas amarillean con nervios verdes en zonas de agua dura, y por eso
 * echar más abono no lo arregla — hay que bajar el pH o usar quelato.
 */
export function disponibilidadHierro(phSustrato) {
  if (phSustrato <= 6.0) return { disponible: 1, texto: 'Hierro plenamente disponible.' }
  if (phSustrato >= 7.8) return { disponible: 0.1, texto: 'Hierro prácticamente bloqueado por el pH. Ni el mejor abono lo va a corregir: hace falta quelato de hierro EDDHA y bajar el pH del riego.' }
  const d = 1 - (phSustrato - 6.0) / 1.8
  return {
    disponible: Math.max(0.1, d),
    texto: `Hierro parcialmente bloqueado (${Math.round(d * 100)} % disponible) por el pH ${phSustrato.toFixed(1)}.`,
  }
}

/**
 * Deriva del pH del sustrato por riego continuado con agua dura. La cal se
 * acumula riego a riego; con agua de >20 °dH un sustrato de turba a pH 6 puede
 * subir a 7.5 en un año. Es la explicación de "se me puso mala de repente" un
 * año después de comprarla.
 */
export function derivaPh({ phInicial = 6.2, agua = 'media', mesesDesdeTrasplante = 0 }) {
  const a = AGUAS.find((x) => x.id === agua) ?? AGUAS[1]
  const tasa = a.calcarea ? 0.11 : a.ce > 0.3 ? 0.05 : 0.005
  const ph = Math.min(8.2, phInicial + tasa * mesesDesdeTrasplante)
  return {
    ph,
    tasaMensual: tasa,
    trasplanteRecomendado: ph > 7.2,
    texto: a.calcarea
      ? `Con agua dura el sustrato sube ~${tasa.toFixed(2)} de pH al mes. Estimado hoy: ${ph.toFixed(1)}.`
      : `Deriva de pH baja con esta agua. Estimado hoy: ${ph.toFixed(1)}.`,
  }
}

/** Abonos comunes de tienda, para no obligar a leer la etiqueta con lupa. */
export const ABONOS_TIPO = [
  { id: 'universal', label: 'Universal líquido (7-3-6)', npk: { n: 7, p: 3, k: 6 } },
  { id: 'verdes', label: 'Plantas verdes (8-5-6)', npk: { n: 8, p: 5, k: 6 } },
  { id: 'floracion', label: 'Floración (4-6-8)', npk: { n: 4, p: 6, k: 8 } },
  { id: 'cactus', label: 'Cactus y suculentas (2-4-6)', npk: { n: 2, p: 4, k: 6 } },
  { id: 'orquideas', label: 'Orquídeas (5-5-5)', npk: { n: 5, p: 5, k: 5 } },
  { id: 'citricos', label: 'Cítricos (6-3-6 + Fe)', npk: { n: 6, p: 3, k: 6 } },
]
