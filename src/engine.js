// Orquestador: reúne todos los modelos y produce el estado completo de una
// planta. Vive aparte de la interfaz a propósito — así el cálculo se puede
// leer, revisar y corregir sin tocar un solo componente de React, igual que
// en Workpulse 360 la trigonometría vive fuera del visor.

import { porId } from './species.js'
import { fotoperiodo, factorReposo, estacionTexto, faseEstacional } from './solar.js'
import { dli as calcDli, veredictoLuz, factorDistancia, distanciaObjetivo } from './lightmeter.js'
import {
  volumenMaceta, consumoDiario, balance, gravimetria, riesgoAsfixia,
  incertidumbreRiego, SUSTRATOS,
} from './waterbalance.js'
import { dosisLiquida, conductividad, derivaPh, disponibilidadHierro, veredictoCE } from './nutrients.js'
import { evaluarPlagas, proximaRevision } from './pests.js'
import { diagnosticar, receta } from './diagnose.js'
import { diasDesde, ultimo, historial } from './journal.js'

/**
 * Superficie foliar de trabajo. Si hay medida de la foto se usa; si no, se
 * estima por el tamaño de la maceta, que es un predictor razonable porque casi
 * todo el mundo tiene la planta en una maceta proporcionada a su porte.
 */
function areaFoliar(planta, metricasFoto) {
  if (planta.areaFoliarCm2 > 0) return { cm2: planta.areaFoliarCm2, origen: 'declarada' }
  if (metricasFoto?.valido && planta.diametroCm > 0) {
    // La cobertura de hoja en el encuadre, escalada por el área de la maceta,
    // da un orden de magnitud útil: una planta que llena el cuadro tiene un
    // dosel de varias veces la boca de su maceta.
    const areaMaceta = Math.PI * (planta.diametroCm / 2) ** 2
    const razon = metricasFoto.coberturaSustrato > 0.01
      ? metricasFoto.coberturaHoja / metricasFoto.coberturaSustrato
      : metricasFoto.coberturaHoja * 8
    const cm2 = Math.min(Math.max(areaMaceta * Math.min(razon, 12) * 1.6, 40), 12000)
    return { cm2, origen: 'estimada de la foto' }
  }
  const cm2 = Math.PI * (planta.diametroCm / 2) ** 2 * 2.4
  return { cm2, origen: 'estimada del tamaño de maceta' }
}

/**
 * Calcula el estado completo de una planta: luz, agua, nutrición, plagas,
 * diagnóstico y receta.
 *
 * @param planta   ficha guardada
 * @param entorno  condiciones de la casa
 * @param extras   { medidaLuz, metricasFoto, humedadPorColor, crecimiento }
 */
export function evaluar(planta, entorno, extras = {}) {
  const especie = porId(planta.especieId)
  const ahora = new Date()

  // ---------- Estación y fotoperiodo real del lugar -----------------------
  const horasLuz = fotoperiodo(entorno.latitud, ahora)
  const reposo = factorReposo(entorno.latitud, ahora, especie.dormancia)
  const estacion = estacionTexto(entorno.latitud, ahora)
  const fase = faseEstacional(entorno.latitud, ahora)

  // ---------- Luz ---------------------------------------------------------
  let luz = null
  const medida = extras.medidaLuz
  if (medida?.ppfd > 0) {
    // Horas efectivas de luz útil: la planta no recibe el fotoperiodo entero
    // a la intensidad del pico. Dentro de casa, con la ventana orientada a un
    // solo lado, el equivalente ronda el 55 % del día solar.
    const horasEfectivas = Math.min(horasLuz * 0.55 + (medida.horasArtificial ?? 0), 18)
    const d = calcDli(medida.ppfd, horasEfectivas)
    const veredicto = veredictoLuz(d, especie)
    let sugerenciaDistancia = null
    if (veredicto.factor > 1.15 && planta.distanciaVentanaCm > 12) {
      const objetivo = distanciaObjetivo(planta.distanciaVentanaCm, veredicto.factor)
      if (objetivo < planta.distanciaVentanaCm) {
        const gana = factorDistancia(planta.distanciaVentanaCm, objetivo)
        sugerenciaDistancia = `Acércala a ${objetivo} cm de la ventana (ahora está a ${planta.distanciaVentanaCm} cm): multiplicaría la luz por ${gana.toFixed(1)}.`
      } else {
        sugerenciaDistancia = `Ni pegada a la ventana llega al óptimo (le faltaría un factor ${veredicto.factor.toFixed(1)}). Aquí solo lo arregla una lámpara de cultivo o cambiarla de habitación.`
      }
    }
    luz = {
      ppfd: medida.ppfd,
      dliMedido: d,
      horasEfectivas,
      veredicto,
      sugerenciaDistancia,
      incertidumbre: medida.incertidumbrePpfd,
      fiabilidad: medida.fiabilidad,
      avisos: medida.avisos,
      lux: medida.lux,
    }
  }

  // ---------- Agua --------------------------------------------------------
  const { cm2: areaCm2, origen: origenArea } = areaFoliar(planta, extras.metricasFoto)
  const ppfdParaAgua = luz?.ppfd ?? estimarPpfdSinMedida(especie, planta)

  const consumo = consumoDiario({
    areaFoliarCm2: areaCm2,
    ppfd: ppfdParaAgua,
    horasLuz: Math.min(horasLuz, 14),
    tempC: entorno.tempC,
    humedadRel: entorno.humedadRel,
    diametroCm: planta.diametroCm,
    coberturaFollaje: extras.metricasFoto?.coberturaHoja ?? 0.5,
    factorEspecie: especie.gsFactor,
    factorReposo: reposo,
    materialMaceta: planta.materialMaceta,
    corrienteAire: entorno.corrienteAire,
  })

  // Estado hídrico: la báscula manda sobre todo lo demás.
  const grav = gravimetria({
    pesoCapacidadG: planta.pesoCapacidadG,
    pesoSecoG: planta.pesoSecoG,
    pesoActualG: extras.pesoActualG,
  })
  const diasRiego = diasDesde(planta.id, 'riego')
  let fraccion = null
  let medidoConBascula = false
  if (grav?.fraccionRestante != null) {
    fraccion = grav.fraccionRestante
    medidoConBascula = true
  } else if (extras.humedadPorColor != null) {
    fraccion = extras.humedadPorColor
  }

  const bal = balance({
    diametroCm: planta.diametroCm,
    alturaCm: planta.alturaCm,
    sustrato: planta.sustrato,
    mad: especie.mad,
    consumoMlDia: consumo.totalMl,
    fraccionRestante: fraccion,
    diasDesdeRiego: diasRiego,
  })

  const asfixia = riesgoAsfixia({
    consumoMlDia: consumo.totalMl,
    aguaTotalMl: bal.aguaTotalMl,
    sustrato: planta.sustrato,
    maceta: { sinAgujero: planta.sinAgujero, platoConAgua: planta.platoConAgua },
  })

  const u = incertidumbreRiego({
    conGravimetria: medidoConBascula,
    conMedidaLuz: Boolean(luz),
    areaEstimada: origenArea !== 'declarada',
  })

  const agua = {
    ...bal,
    consumoMlDia: consumo.totalMl,
    transpiracionMl: consumo.transpiracionMl,
    evaporacionMl: consumo.evaporacionMl,
    vpd: consumo.vpd,
    areaFoliarCm2: areaCm2,
    origenArea,
    medidoConBascula,
    reponerMl: grav?.reponerMl ?? null,
    riesgoAsfixia: asfixia.riesgo,
    diasSaturado: asfixia.diasSaturado,
    motivoAsfixia: asfixia.motivo,
    incertidumbre: u.relativa,
    fiabilidad: u.fiabilidad,
  }
  if (medidoConBascula && grav.reponerMl > 0) agua.dosisRiegoMl = grav.reponerMl

  // ---------- Nutrición ---------------------------------------------------
  const ph = derivaPh({
    phInicial: (especie.ph[0] + especie.ph[1]) / 2,
    agua: entorno.agua,
    mesesDesdeTrasplante: planta.mesesDesdeTrasplante ?? 6,
  })
  const hierro = disponibilidadHierro(ph.ph)
  const nutricion = dosisLiquida({
    npk: planta.npk,
    volumenRiegoMl: agua.dosisRiegoMl,
    ppmObjetivoN: especie.tipo === 'suculenta' || especie.tipo === 'cactus' ? 55 : 100,
    fase: planta.fase,
    factorReposo: reposo,
  })
  const ce = conductividad({ ppmN: nutricion.ppmN, ppmP: nutricion.ppmP ?? 0, ppmK: nutricion.ppmK ?? 0, agua: entorno.agua })
  const ceVeredicto = veredictoCE(ce.ce, especie.ceMax)

  // ---------- Plagas ------------------------------------------------------
  const plagas = evaluarPlagas({
    tempC: entorno.tempC,
    humedadRel: entorno.humedadRel,
    corrienteAire: entorno.corrienteAire,
    humedadSustrato: agua.fraccionRestante,
    diasSaturado: asfixia.diasSaturado,
    riesgoAsfixia: asfixia.riesgo,
  })
  const revision = proximaRevision(plagas)

  // ---------- Historial ---------------------------------------------------
  const diasAbono = diasDesde(planta.id, 'abono')
  const diasMudanza = diasDesde(planta.id, 'mudanza')
  const diasTrasplante = diasDesde(planta.id, 'trasplante')
  const historia = {
    diasDesdeRiego: diasRiego,
    diasDesdeAbono: diasAbono,
    abonoReciente: diasAbono != null && diasAbono < 14,
    diasDesdeMudanza: diasMudanza,
    diasDesdeTrasplante: diasTrasplante,
    mesesDesdeTrasplante: diasTrasplante != null ? diasTrasplante / 30 : planta.mesesDesdeTrasplante,
    crecimientoDetenido: extras.crecimiento?.detenido ?? false,
    pocasHojasAfectadas: extras.pocasHojasAfectadas ?? false,
  }

  // ---------- Diagnóstico y receta ---------------------------------------
  const diagnostico = diagnosticar({
    hoja: extras.metricasFoto,
    luz,
    agua,
    clima: entorno,
    especie,
    historia,
    sustrato: { ph: ph.ph, ceEstimada: ce.ce },
  })

  const acciones = receta({
    diagnostico,
    agua,
    luz,
    nutricion,
    especie,
    plagas,
    clima: entorno,
    reposo,
  })

  return {
    especie,
    estacion: { horasLuz, reposo, texto: estacion, fase },
    luz,
    agua,
    nutricion: { ...nutricion, ce, ceVeredicto, ph, hierro },
    plagas,
    revision,
    diagnostico,
    receta: acciones,
    historia,
  }
}

/**
 * PPFD de reserva cuando no hay medida. Se basa en la distancia declarada a la
 * ventana; es un apaño honesto, y por eso la app insiste tanto en medir de
 * verdad: sin foto de referencia, este número es el eslabón más débil de toda
 * la cadena.
 */
function estimarPpfdSinMedida(especie, planta) {
  const d = planta.distanciaVentanaCm ?? 100
  const base = 320 // junto a una ventana clara, sin sol directo
  return Math.max(6, base / (1 + ((d + 30) / 100) ** 1.7))
}

/** Etiqueta corta del estado general, para la lista de plantas. */
export function estadoResumen(ev) {
  const urgente = ev.receta.find((a) => a.prioridad <= 1)
  if (urgente) return { texto: urgente.titulo, icono: urgente.icono, tono: 'warn' }
  const riego = ev.agua.diasRestantes
  if (isFinite(riego)) {
    return {
      texto: riego < 1 ? 'Riega hoy' : `Riego en ${Math.round(riego)} d`,
      icono: '💧',
      tono: riego < 1 ? 'warn' : 'ok',
    }
  }
  return { texto: 'Sin datos', icono: '·', tono: 'muted' }
}

export { SUSTRATOS, historial, ultimo }
