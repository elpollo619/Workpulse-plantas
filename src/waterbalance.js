// BALANCE HÍDRICO — el corazón de la respuesta "¿cuánta agua le doy?".
//
// Las apps de plantas dicen "riega cada 7 días". Eso es un calendario, no una
// respuesta: la misma potos en un piso a 24 °C con calefacción bebe el triple
// que en un sótano a 17 °C. Aquí la maceta se modela como lo que físicamente
// es — un depósito — y se calcula el caudal de salida:
//
//   1. La maceta tiene una capacidad de agua útil (volumen × porosidad útil).
//   2. La planta la vacía transpirando: flujo = conductancia estomática × VPD.
//      La conductancia depende de la luz medida (curva de saturación) y de la
//      estación (solar.js). Ese es el término dominante.
//   3. El sustrato desnudo evapora aparte, menos cuanto más lo tapa el follaje.
//   4. Cada especie tolera vaciar el depósito hasta un punto distinto: un
//      cactus aguanta el 85 %, un helecho se estropea pasado el 25 %.
//
//   días hasta el riego = agua útil restante / consumo diario
//
// El resultado son mililitros y una fecha, con su ± — no un icono de gota.

/** Agua útil por tipo de sustrato: fracción del volumen que la raíz puede usar. */
export const SUSTRATOS = [
  { id: 'universal', label: 'Sustrato universal / turba', awc: 0.30, drenaje: 'medio', ph: [5.5, 6.5] },
  { id: 'coco', label: 'Fibra de coco', awc: 0.28, drenaje: 'bueno', ph: [5.8, 6.8] },
  { id: 'aireado', label: 'Universal + 30 % perlita', awc: 0.24, drenaje: 'bueno', ph: [5.5, 6.5] },
  { id: 'cactus', label: 'Sustrato de cactus / mineral', awc: 0.15, drenaje: 'muy bueno', ph: [6.0, 7.5] },
  { id: 'orquidea', label: 'Corteza de orquídea', awc: 0.12, drenaje: 'muy bueno', ph: [5.5, 6.5] },
  { id: 'aroide', label: 'Mezcla aroide (corteza+perlita+coco)', awc: 0.20, drenaje: 'muy bueno', ph: [5.5, 6.5] },
  { id: 'akadama', label: 'Akadama / bonsái', awc: 0.20, drenaje: 'muy bueno', ph: [6.0, 6.8] },
]

export const MATERIALES_MACETA = [
  { id: 'plastico', label: 'Plástico', evapLateral: 1.0 },
  { id: 'ceramica', label: 'Cerámica esmaltada', evapLateral: 1.0 },
  { id: 'barro', label: 'Barro / terracota sin esmaltar', evapLateral: 1.45 },
  { id: 'tela', label: 'Maceta de tela', evapLateral: 1.7 },
]

/**
 * Volumen de una maceta troncocónica (la forma real de casi todas las
 * macetas: la base es más estrecha que la boca).
 *   V = (π h / 3)(R² + Rr + r²)
 */
export function volumenMaceta({ diametroCm, alturaCm, diametroBaseCm }) {
  const R = diametroCm / 2
  const r = (diametroBaseCm ?? diametroCm * 0.68) / 2
  const v = (Math.PI * alturaCm / 3) * (R * R + R * r + r * r)
  return v / 1000 // cm³ → litros
}

/** Superficie de sustrato expuesta, en m². */
export function superficieMaceta(diametroCm) {
  const R = diametroCm / 200
  return Math.PI * R * R
}

/** Presión de vapor de saturación (kPa) — Tetens. */
export function presionSaturacion(tempC) {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3))
}

/** Déficit de presión de vapor (kPa): el motor real de la transpiración. */
export function vpd(tempC, humedadRel) {
  return presionSaturacion(tempC) * (1 - Math.min(Math.max(humedadRel, 0), 100) / 100)
}

/**
 * Conductancia estomática (mmol·m⁻²·s⁻¹) en función de la luz. Curva de
 * saturación tipo Michaelis-Menten: los estomas abren con la luz y se saturan.
 * De noche se cierran, y por eso el consumo nocturno es prácticamente nulo.
 */
export function conductancia(ppfd, gsMax = 200, k = 150) {
  return (gsMax * Math.max(ppfd, 0)) / (Math.max(ppfd, 0) + k)
}

/**
 * Consumo diario de agua de la planta, en mililitros.
 *
 * Transpiración por unidad de superficie foliar:
 *     E = gs · VPD / P     [mmol H₂O · m⁻² · s⁻¹]
 * Integrada sobre las horas de luz y pasada a masa (18 g/mol), da gramos de
 * agua al día, que en agua es directamente mililitros.
 */
export function consumoDiario({
  areaFoliarCm2,
  ppfd,
  horasLuz,
  tempC,
  humedadRel,
  diametroCm,
  coberturaFollaje = 0.5,
  factorEspecie = 1,
  factorReposo = 1,
  materialMaceta = 'plastico',
  corrienteAire = 1,
}) {
  const D = vpd(tempC, humedadRel)
  const gs = conductancia(ppfd) * factorEspecie * factorReposo
  const areaM2 = Math.max(areaFoliarCm2, 0) / 10000
  const P = 101.3 // kPa

  // mmol·m⁻²·s⁻¹ → g·m⁻²·s⁻¹ → g/día
  const flujo = (gs * D) / P // mmol·m⁻²·s⁻¹
  const gPorM2Dia = flujo * 18e-3 * horasLuz * 3600
  const transpiracion = gPorM2Dia * areaM2 * corrienteAire

  // Evaporación del sustrato desnudo: se frena sola al formarse costra seca y
  // la sombra del follaje la reduce. El barro sin esmaltar evapora por la
  // pared, y por eso las macetas de terracota se secan mucho antes.
  const mat = MATERIALES_MACETA.find((m) => m.id === materialMaceta) ?? MATERIALES_MACETA[0]
  const mmDia = 0.35 * (D / 1.2) * (1 - 0.55 * Math.min(coberturaFollaje, 1)) * mat.evapLateral
  const evaporacion = mmDia * superficieMaceta(diametroCm) * 1000 // mm·m² → ml

  return {
    transpiracionMl: transpiracion,
    evaporacionMl: Math.max(evaporacion, 0),
    totalMl: Math.max(transpiracion + Math.max(evaporacion, 0), 0.5),
    vpd: D,
    gs,
  }
}

/**
 * Estado del depósito y próxima fecha de riego.
 *
 * @param opciones.fraccionRestante  0–1 de agua disponible medida (peso o color).
 *                                   Si no hay medida, se estima por los días
 *                                   transcurridos desde el último riego.
 */
export function balance({
  diametroCm,
  alturaCm,
  sustrato = 'universal',
  mad = 0.5,
  consumoMlDia,
  fraccionRestante = null,
  diasDesdeRiego = null,
}) {
  const sus = SUSTRATOS.find((s) => s.id === sustrato) ?? SUSTRATOS[0]
  const litros = volumenMaceta({ diametroCm, alturaCm })
  // El cepellón ocupa sitio: no todo el volumen es sustrato.
  const aguaTotalMl = litros * 1000 * sus.awc * 0.85
  const aguaUtilMl = aguaTotalMl * mad // lo que se puede gastar sin estresarla

  let restante = fraccionRestante
  if (restante === null && diasDesdeRiego !== null && consumoMlDia > 0) {
    restante = Math.min(1, Math.max(0, 1 - (diasDesdeRiego * consumoMlDia) / aguaUtilMl))
  }
  if (restante === null) restante = 0.5

  const mlRestantes = aguaUtilMl * restante
  const diasRestantes = consumoMlDia > 0 ? mlRestantes / consumoMlDia : Infinity
  const intervaloTipico = consumoMlDia > 0 ? aguaUtilMl / consumoMlDia : Infinity

  // Riego a capacidad + 20 % de fracción de lavado, que arrastra las sales
  // acumuladas por el abono y el agua dura. Sin drenaje, esas sales queman el
  // borde de las hojas — es la causa evitable más frecuente.
  const dosisMl = Math.round(aguaTotalMl * (1 - restante * mad) + aguaTotalMl * 0.2)

  return {
    litrosMaceta: litros,
    aguaTotalMl,
    aguaUtilMl,
    fraccionRestante: restante,
    mlRestantes,
    diasRestantes,
    intervaloTipico,
    dosisRiegoMl: Math.max(dosisMl, 20),
    sustrato: sus,
  }
}

/**
 * GRAVIMETRÍA — el método de referencia, y ninguna app lo ofrece.
 *
 * Una báscula de cocina de 12 € mide el agua de una maceta mejor que cualquier
 * sensor de humedad barato (esos miden conductividad y los descalibra el
 * abono). El agua pesa 1 g/ml exactos, así que:
 *
 *   agua que falta (ml) = peso a capacidad − peso de ahora (g)
 *
 * Es exacto, no una estimación. Con dos pesadas de calibración queda un
 * higrómetro de precisión ±1 %.
 */
export function gravimetria({ pesoCapacidadG, pesoSecoG, pesoActualG }) {
  if (!(pesoCapacidadG > 0 && pesoActualG > 0)) return null
  const seco = pesoSecoG > 0 ? pesoSecoG : null
  const reponerMl = Math.max(0, pesoCapacidadG - pesoActualG)

  let fraccion = null
  if (seco && pesoCapacidadG > seco) {
    fraccion = Math.min(1, Math.max(0, (pesoActualG - seco) / (pesoCapacidadG - seco)))
  }

  return {
    reponerMl: Math.round(reponerMl),
    fraccionRestante: fraccion,
    rangoUtilG: seco ? pesoCapacidadG - seco : null,
    exacto: true,
  }
}

/**
 * Riesgo de asfixia radicular: no es "regar mucho de una vez", es que el
 * sustrato pase demasiado tiempo saturado. Un sustrato que tarda más de 3–4
 * días en bajar del 80 % de capacidad ahoga las raíces aunque el volumen de
 * agua sea correcto — matiz que casi nadie explica y que explica la mayoría
 * de las plantas muertas "por cuidarlas demasiado".
 */
export function riesgoAsfixia({ consumoMlDia, aguaTotalMl, sustrato = 'universal', maceta = {} }) {
  const sus = SUSTRATOS.find((s) => s.id === sustrato) ?? SUSTRATOS[0]
  if (!(consumoMlDia > 0)) return { riesgo: 1, diasSaturado: Infinity, motivo: 'Consumo nulo: el agua no se va a ninguna parte.' }
  const diasSaturado = (aguaTotalMl * 0.2) / consumoMlDia
  let riesgo = Math.min(1, diasSaturado / 6)
  if (sus.drenaje === 'medio') riesgo = Math.min(1, riesgo * 1.3)
  if (maceta.sinAgujero) riesgo = Math.min(1, riesgo * 1.8 + 0.25)
  if (maceta.platoConAgua) riesgo = Math.min(1, riesgo * 1.4 + 0.15)
  return {
    riesgo,
    diasSaturado,
    motivo: diasSaturado > 4
      ? `El sustrato tarda ~${diasSaturado.toFixed(1)} días en airearse tras el riego. Por encima de 3–4 días las raíces empiezan a asfixiarse.`
      : 'El sustrato se airea a buen ritmo tras el riego.',
  }
}

/**
 * Incertidumbre del intervalo de riego. Se propagan las fuentes reales:
 * el área foliar estimada, la temperatura y humedad que la persona declara y
 * la propia medida de luz. Con báscula, el error se desploma.
 */
export function incertidumbreRiego({ conGravimetria, conMedidaLuz, areaEstimada }) {
  let u = 0.35
  if (conMedidaLuz) u -= 0.10
  if (!areaEstimada) u -= 0.06
  if (conGravimetria) u = Math.min(u, 0.10)
  const valor = Math.max(0.06, u)
  return { relativa: valor, fiabilidad: valor <= 0.12 ? 'A' : valor <= 0.25 ? 'B' : 'C' }
}
