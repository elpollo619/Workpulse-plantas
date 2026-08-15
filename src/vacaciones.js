// MODO VACACIONES — cuántos días aguanta cada planta y qué hacer antes de irte.
//
// Sale casi entero del balance hídrico que ya existe: si sabes cuánto bebe al
// día y cuánta agua cabe en la maceta, sabes cuánto aguanta. Lo interesante es
// lo que se deduce al darle la vuelta al modelo.
//
// La transpiración es gs(PPFD) × VPD. Los dos términos se pueden manipular
// antes de salir por la puerta, y el primero es el que casi nadie toca:
//
//   · BAJAR LAS PERSIANAS. Con poca luz los estomas se cierran y la planta deja
//     de beber. Es la medida más eficaz de todas y no cuesta nada. Una planta de
//     interior en penumbra puede duplicar o triplicar lo que aguanta. Suena a
//     castigo y es justo lo contrario: dos semanas a oscuras no la matan, y
//     quedarse sin agua sí.
//   · AGRUPARLAS. Juntas transpiran hacia el mismo aire y suben la humedad local,
//     lo que baja el VPD y frena a todas.
//   · ALEJARLAS DE LA VENTANA. Menos luz y menos calor a la vez.
//
// Y lo último: un plan impreso para quien venga a regar. Porque "riégame las
// plantas" es una de las formas más habituales de matarlas — la gente riega por
// afecto, todas por igual y en exceso.

import { consumoDiario, balance, volumenMaceta } from './waterbalance.js'
import { porId, reservaTejidoDias } from './species.js'
import { fotoperiodo, factorReposo } from './solar.js'

/** Medidas que se pueden tomar antes de salir, con su efecto físico. */
export const MEDIDAS = {
  persianas: {
    id: 'persianas',
    label: 'Bajar persianas o correr cortinas',
    coste: 'gratis',
    // Una persiana bajada deja pasar del orden del 10–20 % de la luz.
    aplicar: (c) => ({ ...c, ppfd: c.ppfd * 0.15 }),
    explicacion: 'Con poca luz los estomas se cierran y la planta casi deja de beber. Es la medida más eficaz que existe y no cuesta nada.',
  },
  agrupar: {
    id: 'agrupar',
    label: 'Agrupar todas las plantas juntas',
    coste: 'gratis',
    // Transpiran hacia el mismo aire: sube la humedad local y baja el VPD.
    aplicar: (c) => ({ ...c, humedadRel: Math.min(85, c.humedadRel + 12) }),
    explicacion: 'Juntas crean su propio microclima húmedo. Mejor en el suelo del cuarto de baño, que suele ser lo más fresco y húmedo de la casa.',
  },
  alejar: {
    id: 'alejar',
    label: 'Retirarlas de la ventana',
    coste: 'gratis',
    aplicar: (c) => ({ ...c, ppfd: c.ppfd * 0.35, tempC: c.tempC - 1 }),
    explicacion: 'Menos luz y menos calor de golpe. Combínalo con agruparlas.',
  },
  fresco: {
    id: 'fresco',
    label: 'Dejar la casa lo más fresca posible',
    coste: 'gratis',
    aplicar: (c) => ({ ...c, tempC: c.tempC - 3 }),
    explicacion: 'Tres grados menos bajan bastante el déficit de vapor. Persianas bajadas también ayudan a esto.',
  },
}

/**
 * Días que aguanta una planta partiendo de riego a capacidad de campo.
 *
 * Se distinguen dos cifras, porque no son lo mismo y confundirlas es lo que
 * hace que la gente vuelva a una planta muerta:
 *
 *   cómodo ......... hasta agotar el margen que la especie tolera sin sufrir
 *   supervivencia .. hasta vaciar el depósito del todo; se pasa mal y pierde
 *                    hojas, pero no se muere
 */
export function aguante(planta, condiciones) {
  const especie = porId(planta.especieId)
  const c = condiciones

  const consumo = consumoDiario({
    areaFoliarCm2: c.areaFoliarCm2,
    ppfd: c.ppfd,
    horasLuz: c.horasLuz,
    tempC: c.tempC,
    humedadRel: c.humedadRel,
    diametroCm: planta.diametroCm,
    coberturaFollaje: c.coberturaFollaje ?? 0.5,
    factorEspecie: especie.gsFactor,
    factorReposo: c.factorReposo ?? 1,
    materialMaceta: planta.materialMaceta,
    corrienteAire: c.corrienteAire ?? 1,
  })

  const bal = balance({
    diametroCm: planta.diametroCm,
    alturaCm: planta.alturaCm,
    sustrato: planta.sustrato,
    mad: especie.mad,
    consumoMlDia: consumo.totalMl,
    fraccionRestante: 1,
  })

  const comodo = bal.aguaUtilMl / consumo.totalMl
  // Más allá del margen cómodo queda el resto del agua retenida: sufre, pero
  // aguanta. Ese colchón es lo que separa "vuelvo y está mustia" de "vuelvo y
  // está muerta", y merece decirse.
  const enSustrato = bal.aguaTotalMl / consumo.totalMl

  // Y cuando el sustrato se agota, las plantas con tejidos suculentos siguen
  // tirando de su propia reserva. Sin este término el modelo llegaba a decir
  // que un helecho aguanta más de vacaciones que un cactus, que es justo al
  // revés de lo que pasa en la realidad.
  const reserva = reservaTejidoDias(especie)
  const supervivencia = enSustrato + reserva

  return {
    consumoMlDia: consumo.totalMl,
    aguaUtilMl: bal.aguaUtilMl,
    aguaTotalMl: bal.aguaTotalMl,
    dosisRiegoMl: bal.dosisRiegoMl,
    diasComodo: comodo,
    diasEnSustrato: enSustrato,
    reservaTejidoDias: reserva,
    diasSupervivencia: supervivencia,
    litros: bal.litrosMaceta,
  }
}

/**
 * Plan completo del viaje.
 *
 * @param plantas   fichas
 * @param entorno   condiciones de la casa
 * @param dias      duración del viaje
 * @param medidas   ids de MEDIDAS que se van a aplicar
 * @param ppfdPorPlanta  { [plantaId]: ppfd } de las medidas de luz reales
 */
export function planVacaciones({ plantas, entorno, dias, medidas = [], ppfdPorPlanta = {}, areasPorPlanta = {}, fecha = new Date() }) {
  const horasLuz = Math.min(fotoperiodo(entorno.latitud, fecha), 14)

  const condicionesDe = (planta, conMedidas) => {
    const especie = porId(planta.especieId)
    let c = {
      // Sin medida real de luz se estima por la distancia declarada a la
      // ventana; es el mismo apaño que usa el motor, y se avisa de ello.
      ppfd: ppfdPorPlanta[planta.id] ?? estimarPpfd(planta.distanciaVentanaCm),
      horasLuz,
      tempC: entorno.tempC,
      humedadRel: entorno.humedadRel,
      corrienteAire: entorno.corrienteAire,
      areaFoliarCm2: areasPorPlanta[planta.id] ?? areaPorMaceta(planta.diametroCm),
      factorReposo: factorReposo(entorno.latitud, fecha, especie.dormancia),
      coberturaFollaje: 0.5,
    }
    if (conMedidas) {
      for (const id of medidas) {
        const m = MEDIDAS[id]
        if (m) c = m.aplicar(c)
      }
    }
    return c
  }

  const fichas = plantas.map((planta) => {
    const especie = porId(planta.especieId)
    const sinMedidas = aguante(planta, condicionesDe(planta, false))
    const conMedidas = aguante(planta, condicionesDe(planta, true))

    // Efecto de cada medida por separado, para poder decir "+6 días" en vez de
    // "ayuda". Se evalúa cada una sola, sobre la situación de partida.
    const efectos = Object.values(MEDIDAS).map((m) => {
      const c = m.aplicar(condicionesDe(planta, false))
      const a = aguante(planta, c)
      return {
        id: m.id,
        label: m.label,
        explicacion: m.explicacion,
        diasExtra: a.diasSupervivencia - sinMedidas.diasSupervivencia,
        factor: a.diasSupervivencia / Math.max(sinMedidas.diasSupervivencia, 0.1),
      }
    }).sort((a, b) => b.diasExtra - a.diasExtra)

    const llega = conMedidas.diasSupervivencia >= dias
    const comodo = conMedidas.diasComodo >= dias

    // Si no llega, ¿qué día haría falta que viniera alguien?
    const diaVisita = llega ? null : Math.max(1, Math.floor(conMedidas.diasComodo))

    // Riego por mecha: depósito necesario con un 25 % de margen.
    const depositoMl = Math.ceil((conMedidas.consumoMlDia * dias * 1.25) / 50) * 50

    return {
      planta,
      especie,
      sinMedidas,
      conMedidas,
      efectos,
      llega,
      comodo,
      diaVisita,
      depositoMl,
      // Los que no toleran secarse son los que hay que mirar primero.
      critica: !llega,
      margen: conMedidas.diasSupervivencia - dias,
    }
  }).sort((a, b) => a.margen - b.margen)

  const criticas = fichas.filter((f) => !f.llega)
  const incomodas = fichas.filter((f) => f.llega && !f.comodo)

  let veredicto
  if (!fichas.length) {
    veredicto = { tono: '', titulo: 'Sin plantas', texto: 'Añade plantas para calcular el plan.' }
  } else if (criticas.length) {
    veredicto = {
      tono: 'warn',
      titulo: `${criticas.length} de ${fichas.length} no llegan a ${dias} días`,
      texto: medidas.length
        ? 'Ni con las medidas aplicadas. Necesitan riego por mecha o que alguien pase el día indicado.'
        : 'Prueba a marcar las medidas de abajo: suelen dar bastantes días de margen sin gastar nada.',
    }
  } else if (incomodas.length) {
    veredicto = {
      tono: 'ok',
      titulo: `Todas sobreviven a los ${dias} días`,
      texto: `${incomodas.length} lo pasarán algo justo y puede que pierdan alguna hoja baja, pero ninguna corre peligro real.`,
    }
  } else {
    veredicto = {
      tono: 'ok',
      titulo: `Todas aguantan ${dias} días con holgura`,
      texto: 'Riega a fondo el día de salida y vete tranquilo.',
    }
  }

  return { fichas, criticas, incomodas, veredicto, dias, horasLuz }
}

/** Estimación de PPFD por distancia a la ventana, como en engine.js. */
function estimarPpfd(distanciaCm = 100) {
  return Math.max(6, 320 / (1 + ((distanciaCm + 30) / 100) ** 1.7))
}

/** Superficie foliar aproximada a partir del tamaño de maceta. */
function areaPorMaceta(diametroCm) {
  return Math.PI * (diametroCm / 2) ** 2 * 2.4
}

/**
 * Instrucciones para quien venga a regar.
 *
 * "Riégame las plantas" mata más plantas que las vacaciones: la gente riega
 * todas por igual, con cariño y de más. Con cantidades exactas y fechas
 * concretas, el favor deja de ser un riesgo.
 */
export function instruccionesCuidador(plan, fechaSalida = new Date()) {
  const visitas = new Map()
  const inviables = []

  // Por encima de esto, pedir el favor deja de ser razonable: nadie va a venir
  // a tu casa quince veces.
  const MAX_VISITAS = 4

  for (const f of plan.fichas) {
    if (f.llega) continue

    const intervalo = Math.max(1, Math.floor(f.conMedidas.diasComodo))
    const nVisitas = Math.ceil((plan.dias - f.diaVisita) / intervalo)

    // Un helecho en verano necesita agua casi a diario. El modelo puede
    // generar un calendario de 29 visitas y ser exacto, pero como respuesta no
    // sirve: lo honesto es decir que así no se puede dejar y dar la salida real.
    if (nVisitas > MAX_VISITAS) {
      inviables.push({
        nombre: f.planta.nombre,
        especie: f.especie.nombre,
        cadaDias: intervalo,
        visitasNecesarias: nVisitas,
        depositoMl: f.depositoMl,
        salida:
          `Necesitaría riego cada ${intervalo} día${intervalo > 1 ? 's' : ''} — ${nVisitas} visitas en el viaje. ` +
          `No se lo pidas a nadie: monta un riego por mecha con un depósito de ${f.depositoMl} ml ` +
          '(una botella y un cordón de algodón del cordel a la maceta), o déjala en casa de alguien.',
      })
      continue
    }

    let dia = f.diaVisita
    while (dia < plan.dias) {
      if (!visitas.has(dia)) visitas.set(dia, [])
      visitas.get(dia).push({
        nombre: f.planta.nombre,
        especie: f.especie.nombre,
        ml: f.conMedidas.dosisRiegoMl,
        nota: f.especie.mad < 0.4
          ? 'No tolera secarse: si la tierra está seca al tacto, riégala aunque no toque.'
          : 'Mete el dedo 3 cm: si sale húmedo, NO la riegues ese día.',
      })
      dia += intervalo
    }
  }

  const listaVisitas = [...visitas.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dia, plantas]) => ({
      dia,
      fecha: new Date(fechaSalida.getTime() + dia * 86400000),
      plantas,
    }))

  const noTocar = plan.fichas.filter((f) => f.llega).map((f) => ({
    nombre: f.planta.nombre,
    especie: f.especie.nombre,
    dias: Math.round(f.conMedidas.diasSupervivencia),
  }))

  return { visitas: listaVisitas, noTocar, inviables, dias: plan.dias }
}

/** Hoja imprimible para dejar en la nevera. */
export function hojaCuidadorHTML(plan, instrucciones, fechaSalida = new Date()) {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const f = (d) => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const visitas = instrucciones.visitas.map((v) => `
    <section>
      <h2>${esc(f(v.fecha))}</h2>
      <table>
        <tr><th>Planta</th><th>Cuánta agua</th><th>Antes de regar</th></tr>
        ${v.plantas.map((p) => `<tr>
          <td><strong>${esc(p.nombre)}</strong><br><small>${esc(p.especie)}</small></td>
          <td class="ml">${p.ml} ml</td>
          <td><small>${esc(p.nota)}</small></td>
        </tr>`).join('')}
      </table>
    </section>`).join('')

  const inviables = instrucciones.inviables?.length ? `
    <section class="reglas">
      <h2>Estas no las dejo a tu cargo</h2>
      <p>Necesitan demasiada agua para pedírtelo. Ya están resueltas por otro medio; si las ves mustias, no pasa nada.</p>
      <ul>${instrucciones.inviables.map((p) => `<li><strong>${esc(p.nombre)}</strong> <small>(${esc(p.especie)}) — pediría riego cada ${p.cadaDias} d</small></li>`).join('')}</ul>
    </section>` : ''

  const noTocar = instrucciones.noTocar.length ? `
    <section class="notocar">
      <h2>Estas NO se riegan</h2>
      <p>Tienen agua de sobra para todo el viaje. Regarlas les haría daño.</p>
      <ul>${instrucciones.noTocar.map((p) => `<li><strong>${esc(p.nombre)}</strong> <small>(${esc(p.especie)}) — aguanta ${p.dias} días</small></li>`).join('')}</ul>
    </section>` : ''

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Plan de riego</title>
<style>
  body { font-family: system-ui, sans-serif; color: #16202a; padding: 30px; line-height: 1.55; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 23px; margin: 0 0 4px; }
  .sub { color: #5a6b7a; font-size: 13.5px; margin: 0 0 22px; }
  section { border: 1px solid #dde4ea; border-radius: 10px; padding: 14px 18px; margin-bottom: 14px; page-break-inside: avoid; }
  h2 { font-size: 15px; margin: 0 0 10px; text-transform: capitalize; border-bottom: 2px solid #34d399; padding-bottom: 5px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: left; padding: 7px 8px 7px 0; border-bottom: 1px solid #eef2f5; vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #5a6b7a; }
  .ml { font-size: 17px; font-weight: 700; white-space: nowrap; }
  small { color: #5a6b7a; }
  .notocar { background: #f0fbf6; border-color: #34d399; }
  .notocar ul { margin: 6px 0 0; padding-left: 20px; }
  .reglas { background: #fff8ec; border-color: #f5b04b; font-size: 13px; }
  .reglas li { margin-bottom: 5px; }
  .pie { font-size: 11.5px; color: #7b8b99; margin-top: 20px; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>🌱 Plan de riego</h1>
<p class="sub">Del ${esc(f(fechaSalida))} · ${plan.dias} días · ${plan.fichas.length} plantas</p>

<section class="reglas">
  <h2>Tres reglas</h2>
  <ol>
    <li><strong>Solo lo que pone la lista, el día que pone.</strong> Las cantidades están calculadas para cada maceta.</li>
    <li><strong>Ante la duda, no regar.</strong> Se recupera antes de un día de sed que de una raíz podrida.</li>
    <li><strong>Riega despacio</strong> hasta que salga un poco por el agujero, y <strong>vacía el plato</strong> a los diez minutos.</li>
  </ol>
</section>

${visitas || '<section><h2>No hace falta venir</h2><p>Todas las plantas aguantan el viaje entero. Gracias de todos modos.</p></section>'}
${noTocar}
${inviables}

<p class="pie">
  Cantidades calculadas con el volumen real de cada maceta, su sustrato y lo que
  transpira la especie a la temperatura y humedad de la casa. Generado con
  Workpulse Plantas.
</p>
</body></html>`
}
