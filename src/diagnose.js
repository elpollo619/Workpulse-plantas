// MOTOR DE DIAGNÓSTICO — la pieza que responde "¿qué le pasa y qué le doy?".
//
// El problema real del cuidado de plantas es que los síntomas son ambiguos: la
// hoja amarilla es exceso de agua, falta de agua, poca luz, falta de nitrógeno
// o simplemente una hoja vieja. Ninguna foto por sí sola lo resuelve, y por eso
// las apps que solo miran la foto aciertan poco.
//
// Aquí se combinan CINCO fuentes independientes —píxeles, luz medida, balance
// hídrico, clima y el historial encadenado— con inferencia bayesiana en
// log-odds: cada evidencia mueve la probabilidad de cada hipótesis por su razón
// de verosimilitud, y al final se muestra qué evidencia movió qué. Es un
// diagnóstico auditable, no un oráculo: la persona puede ver el razonamiento y
// discrepar.
//
//      logit(p) = logit(prior) + Σ log(LR_i)

/** Hipótesis del sistema, con su probabilidad a priori en interior. */
export const HIPOTESIS = [
  { id: 'exceso_agua', nombre: 'Exceso de riego', prior: 0.22, urgencia: 'alta' },
  { id: 'falta_agua', nombre: 'Falta de riego', prior: 0.16, urgencia: 'alta' },
  { id: 'poca_luz', nombre: 'Luz insuficiente', prior: 0.20, urgencia: 'media' },
  { id: 'exceso_luz', nombre: 'Exceso de luz o quemadura solar', prior: 0.05, urgencia: 'media' },
  { id: 'falta_n', nombre: 'Falta de nitrógeno', prior: 0.08, urgencia: 'baja' },
  { id: 'clorosis_fe', nombre: 'Clorosis férrica (pH alto)', prior: 0.06, urgencia: 'media' },
  { id: 'sales', nombre: 'Exceso de sales o abono', prior: 0.08, urgencia: 'media' },
  { id: 'hr_baja', nombre: 'Humedad ambiental baja', prior: 0.10, urgencia: 'baja' },
  { id: 'arana', nombre: 'Araña roja u otro ácaro', prior: 0.05, urgencia: 'alta' },
  { id: 'pudricion', nombre: 'Pudrición radicular', prior: 0.04, urgencia: 'crítica' },
  { id: 'maceta_pequena', nombre: 'Maceta agotada / raíz apretada', prior: 0.05, urgencia: 'baja' },
  { id: 'aclimatacion', nombre: 'Aclimatación normal tras un cambio', prior: 0.10, urgencia: 'ninguna' },
  { id: 'senescencia', nombre: 'Hoja vieja: envejecimiento normal', prior: 0.12, urgencia: 'ninguna' },
  { id: 'frio', nombre: 'Daño por frío o corriente', prior: 0.04, urgencia: 'media' },
]

const logit = (p) => Math.log(p / (1 - p))
const sigmoide = (x) => 1 / (1 + Math.exp(-x))

/**
 * Recoge las evidencias disponibles y las traduce a razones de verosimilitud.
 * Cada regla lleva el porqué fisiológico en el texto, porque el objetivo no es
 * solo acertar: es que quien lo lea aprenda a mirar su planta.
 */
function reglas(ev) {
  const R = []
  const { hoja, luz, agua, clima, especie, historia, sustrato } = ev

  // ---------- Evidencia de los píxeles -----------------------------------
  if (hoja?.valido) {
    if (hoja.fraccionClorosis > 0.15) {
      const generalizada = hoja.internervial < 0.25
      if (generalizada) {
        R.push({ texto: `Amarilleo extendido y uniforme (${Math.round(hoja.fraccionClorosis * 100)} % de la superficie foliar)`, lr: { exceso_agua: 2.2, falta_n: 3.0, poca_luz: 1.8, senescencia: 1.4, clorosis_fe: 0.4 } })
      } else {
        R.push({ texto: `Amarilleo entre nervios con los nervios aún verdes (índice internervial ${hoja.internervial.toFixed(2)}) — firma clásica de bloqueo de hierro o magnesio`, lr: { clorosis_fe: 6.5, falta_n: 0.4, exceso_agua: 0.8 } })
      }
    }
    if (hoja.fraccionClorosis < 0.04 && hoja.fraccionNecrosis < 0.03) {
      R.push({ texto: 'Follaje sin decoloración apreciable', lr: { falta_n: 0.3, clorosis_fe: 0.25, exceso_agua: 0.5, falta_agua: 0.5, arana: 0.4 } })
    }
    if (hoja.sesgoMarginal > 0.12) {
      R.push({ texto: `El daño se concentra en el borde de la hoja (${(hoja.sesgoMarginal * 100).toFixed(0)} puntos más que en el interior): el margen es lo último que recibe agua y lo primero donde se depositan las sales`, lr: { sales: 4.0, hr_baja: 2.8, falta_agua: 2.2, exceso_agua: 0.5, poca_luz: 0.5 } })
    }
    if (hoja.sesgoMarginal < -0.08 && hoja.fraccionNecrosis > 0.05) {
      R.push({ texto: 'Manchas en el interior del limbo, no en el borde: patrón de tejido colapsado por asfixia radicular más que por sed', lr: { exceso_agua: 3.2, pudricion: 2.6, falta_agua: 0.4, sales: 0.5 } })
    }
    if (hoja.fraccionNecrosis > 0.12) {
      R.push({ texto: `Tejido muerto en el ${Math.round(hoja.fraccionNecrosis * 100)} % del follaje`, lr: { sales: 1.8, falta_agua: 1.8, pudricion: 2.0, hr_baja: 1.5, senescencia: 1.3, poca_luz: 0.7 } })
    }
    if (hoja.moteado > 0.18) {
      R.push({ texto: `Punteado fino y decolorado repartido por el limbo (${Math.round(hoja.moteado * 100)} % de la superficie): así se ve el daño por picadura de ácaro antes de que aparezca la telaraña`, lr: { arana: 7.0, poca_luz: 0.6, falta_n: 0.6 } })
    }
    if (hoja.dgci < 0.42 && hoja.fraccionClorosis > 0.08) {
      R.push({ texto: `Índice de verdor DGCI bajo (${hoja.dgci.toFixed(2)}): poca clorofila por unidad de hoja`, lr: { falta_n: 2.4, poca_luz: 1.6, exceso_agua: 1.3 } })
    }
    if (hoja.dgci > 0.58) {
      R.push({ texto: `Verde intenso y saturado (DGCI ${hoja.dgci.toFixed(2)}): la hoja no está falta de nutrientes`, lr: { falta_n: 0.25, clorosis_fe: 0.4 } })
    }
  }

  // ---------- Evidencia del luxómetro ------------------------------------
  if (luz?.dliMedido != null && especie) {
    const d = luz.dliMedido
    if (d < especie.dli.min * 0.7) {
      R.push({ texto: `DLI medido ${d.toFixed(1)} mol·m⁻²·d⁻¹ frente a los ${especie.dli.min} que pide como mínimo la especie`, lr: { poca_luz: 6.0, exceso_agua: 2.0, exceso_luz: 0.08, falta_n: 0.7 } })
    } else if (d > especie.dli.max) {
      R.push({ texto: `DLI medido ${d.toFixed(1)}, por encima del máximo tolerado (${especie.dli.max})`, lr: { exceso_luz: 7.0, poca_luz: 0.06, falta_agua: 1.6 } })
    } else if (d >= especie.dli.min && d <= especie.dli.max) {
      R.push({ texto: `DLI medido ${d.toFixed(1)}, dentro del rango de la especie (${especie.dli.min}–${especie.dli.max})`, lr: { poca_luz: 0.18, exceso_luz: 0.2 } })
    }
    // Con poca luz la planta bebe poquísimo: regar igual la ahoga. Esta es la
    // interacción luz-agua que explica la mayoría de las muertes de interior.
    if (d < especie.dli.min && agua?.fraccionRestante > 0.6) {
      R.push({ texto: 'Poca luz Y sustrato todavía húmedo: con los estomas casi cerrados la planta no consume el agua, y el cepellón se queda saturado', lr: { exceso_agua: 4.5, pudricion: 2.5, falta_agua: 0.1 } })
    }
  }

  // ---------- Evidencia del balance hídrico ------------------------------
  if (agua) {
    if (agua.fraccionRestante <= 0.06) {
      R.push({ texto: `Depósito prácticamente vacío (${Math.round(agua.fraccionRestante * 100)} % del agua útil)`, lr: { falta_agua: 6.0, hr_baja: 1.4, exceso_agua: 0.06, pudricion: 0.15 } })
    } else if (agua.fraccionRestante > 0.85 && (historia?.diasDesdeRiego ?? 0) > 5) {
      R.push({ texto: `El sustrato sigue casi saturado ${Math.round(historia.diasDesdeRiego)} días después del riego: no se está secando`, lr: { exceso_agua: 5.5, pudricion: 3.5, falta_agua: 0.05 } })
    }
    if (agua.riesgoAsfixia > 0.65) {
      R.push({ texto: `El sustrato tarda ~${agua.diasSaturado?.toFixed(1)} días en airearse tras cada riego; por encima de 3–4 la raíz empieza a asfixiarse`, lr: { exceso_agua: 3.0, pudricion: 4.0 } })
    }
    if (agua.medidoConBascula) {
      R.push({ texto: 'Medida gravimétrica con báscula: el estado hídrico no es una estimación, es una pesada', lr: {} })
    }
  }

  // ---------- Evidencia del clima ----------------------------------------
  if (clima) {
    if (especie && clima.humedadRel < especie.hrMin - 8) {
      R.push({ texto: `Humedad ambiental ${clima.humedadRel} % frente al mínimo de ${especie.hrMin} % de la especie`, lr: { hr_baja: 4.0, arana: 2.2, falta_agua: 1.3 } })
    }
    if (clima.humedadRel > 65) {
      R.push({ texto: `Humedad ambiental alta (${clima.humedadRel} %)`, lr: { hr_baja: 0.12, arana: 0.4, exceso_agua: 1.3 } })
    }
    if (especie && clima.tempC < especie.tempC[0] + 3) {
      R.push({ texto: `Temperatura ${clima.tempC} °C, cerca o por debajo del mínimo de la especie (${especie.tempC[0]} °C)`, lr: { frio: 6.0, exceso_agua: 1.8, pudricion: 1.6 } })
    }
    if (clima.tempC > 26 && clima.humedadRel < 45) {
      R.push({ texto: 'Ambiente cálido y seco: condiciones ideales para el ácaro', lr: { arana: 3.0, hr_baja: 2.0 } })
    }
  }

  // ---------- Evidencia del historial encadenado -------------------------
  if (historia) {
    if (historia.diasDesdeMudanza != null && historia.diasDesdeMudanza < 21) {
      R.push({ texto: `Cambió de sitio hace ${Math.round(historia.diasDesdeMudanza)} días: la caída de hoja tras una mudanza es una respuesta normal de aclimatación`, lr: { aclimatacion: 8.0, falta_n: 0.5, poca_luz: 1.2 } })
    }
    if (historia.diasDesdeTrasplante != null && historia.diasDesdeTrasplante < 30) {
      R.push({ texto: `Trasplante hace ${Math.round(historia.diasDesdeTrasplante)} días: la raíz nueva aún no absorbe a pleno rendimiento`, lr: { aclimatacion: 5.0, exceso_agua: 1.8, falta_n: 0.3, maceta_pequena: 0.1 } })
    }
    if (historia.mesesDesdeTrasplante != null && historia.mesesDesdeTrasplante > 24) {
      R.push({ texto: `${Math.round(historia.mesesDesdeTrasplante)} meses sin trasplantar: sustrato agotado, compactado y con sales acumuladas`, lr: { maceta_pequena: 4.0, falta_n: 2.0, sales: 2.2, clorosis_fe: 1.8 } })
    }
    if (historia.abonoReciente && historia.diasDesdeAbono < 14) {
      R.push({ texto: `Abonada hace ${Math.round(historia.diasDesdeAbono)} días`, lr: { falta_n: 0.2, sales: 2.5 } })
    }
    if (historia.diasDesdeAbono != null && historia.diasDesdeAbono > 180) {
      R.push({ texto: `Sin abonar desde hace ${Math.round(historia.diasDesdeAbono / 30)} meses`, lr: { falta_n: 3.0, sales: 0.3 } })
    }
    if (historia.crecimientoDetenido) {
      R.push({ texto: 'La superficie de dosel no ha crecido en las últimas fotos: la planta está parada', lr: { poca_luz: 2.2, maceta_pequena: 2.0, falta_n: 1.8, senescencia: 0.6 } })
    }
    if (historia.pocasHojasAfectadas) {
      R.push({ texto: 'Solo afecta a unas pocas hojas bajas y viejas, no al conjunto', lr: { senescencia: 5.0, exceso_agua: 0.5, poca_luz: 0.7, arana: 0.5 } })
    }
  }

  // ---------- Evidencia química ------------------------------------------
  if (sustrato) {
    if (sustrato.ph > 7.2) {
      R.push({ texto: `pH del sustrato estimado en ${sustrato.ph.toFixed(1)} por riego continuado con agua dura: por encima de 7 el hierro se bloquea químicamente aunque esté presente`, lr: { clorosis_fe: 5.0, falta_n: 0.7 } })
    }
    if (sustrato.ceEstimada > (especie?.ceMax ?? 1.5)) {
      R.push({ texto: `CE de riego ${sustrato.ceEstimada.toFixed(2)} dS/m, por encima de lo que tolera la especie (${especie?.ceMax})`, lr: { sales: 4.5, hr_baja: 0.7 } })
    }
  }

  return R
}

/**
 * Ejecuta el diagnóstico.
 * @returns hipótesis ordenadas por probabilidad, con las evidencias que las sostienen
 */
export function diagnosticar(evidencias) {
  const R = reglas(evidencias)

  const resultado = HIPOTESIS.map((h) => {
    let l = logit(h.prior)
    const aFavor = []
    const enContra = []
    for (const regla of R) {
      const lr = regla.lr?.[h.id]
      if (!lr || lr === 1) continue
      l += Math.log(lr)
      if (lr > 1) aFavor.push({ texto: regla.texto, peso: lr })
      else enContra.push({ texto: regla.texto, peso: lr })
    }
    return {
      ...h,
      probabilidad: sigmoide(l),
      aFavor: aFavor.sort((a, b) => b.peso - a.peso),
      enContra: enContra.sort((a, b) => a.peso - b.peso),
    }
  })

  // Normalización: las hipótesis compiten entre sí por explicar lo mismo.
  const suma = resultado.reduce((a, h) => a + h.probabilidad, 0) || 1
  const ranking = resultado
    .map((h) => ({ ...h, probabilidad: h.probabilidad / suma }))
    .sort((a, b) => b.probabilidad - a.probabilidad)

  const top = ranking[0]
  const segundo = ranking[1]
  // Si las dos primeras están empatadas, el diagnóstico no está cerrado y hay
  // que decirlo en vez de fingir seguridad.
  const concluyente = top.probabilidad > 0.28 && top.probabilidad > segundo.probabilidad * 1.5

  return {
    ranking,
    principal: top,
    concluyente,
    evidencias: R,
    nEvidencias: R.length,
    // Qué medida adicional separaría mejor las dos hipótesis en cabeza.
    siguientePrueba: siguientePrueba(top, segundo, evidencias),
  }
}

/**
 * Diseño de experimentos casero: dice qué medir a continuación para deshacer
 * el empate. Es lo que hace un buen técnico — no adivinar más fuerte, sino
 * buscar el dato que discrimina.
 */
function siguientePrueba(a, b, ev) {
  const par = [a.id, b.id].sort().join('|')
  if (!ev.agua?.medidoConBascula && (par.includes('exceso_agua') || par.includes('falta_agua') || par.includes('pudricion'))) {
    return 'Pesa la maceta ahora y justo después del próximo riego con drenaje completo. La diferencia en gramos es el agua que le falta, exacta — y separa de golpe "exceso" de "falta" de riego.'
  }
  if (!ev.luz?.dliMedido && (par.includes('poca_luz') || par.includes('exceso_luz'))) {
    return 'Mide la luz: foto de un folio blanco puesto donde vive la planta, a la hora de más claridad. Sin ese dato, "poca luz" es una suposición.'
  }
  if (par.includes('clorosis_fe') && par.includes('falta_n')) {
    return 'Mira si el amarilleo está en las hojas NUEVAS (hierro: no se mueve por la planta) o en las VIEJAS (nitrógeno: la planta lo recicla hacia los brotes). Ese detalle solo lo distingue el patrón.'
  }
  if (par.includes('arana')) {
    return 'Pasa un papel blanco por debajo de una hoja y golpéala: si caen puntitos que se mueven, es ácaro. Confirmarlo cambia por completo el tratamiento.'
  }
  if (par.includes('sales') || par.includes('clorosis_fe')) {
    return 'Riega con abundancia hasta que salga un tercio del agua por el agujero, y repítelo. Si en dos semanas mejora el borde de las hojas, era acumulación de sales.'
  }
  if (par.includes('pudricion')) {
    return 'Saca el cepellón de la maceta y mira la raíz: blanca y firme es sana; parda, blanda y con olor agrio es pudrición. Es la única prueba concluyente.'
  }
  return 'Repite la foto y la pesada dentro de una semana: la evolución en el tiempo desempata mejor que cualquier medida aislada.'
}

/**
 * LA RECETA — traduce todo lo anterior en acciones concretas de hoy, que es lo
 * que la persona vino a buscar. Cantidades, no adjetivos. Y "no hacer nada"
 * como respuesta legítima y frecuente, porque el impulso de intervenir es lo
 * que mata a la mayoría de las plantas de interior.
 */
export function receta({ diagnostico, agua, luz, nutricion, especie, plagas, clima, reposo }) {
  const acciones = []

  // --- Agua ---
  if (agua) {
    const dias = agua.diasRestantes
    if (dias <= 0.5) {
      acciones.push({
        icono: '💧', titulo: 'Riega hoy', prioridad: 1,
        detalle: `${agua.dosisRiegoMl} ml de agua a temperatura ambiente, en varias pasadas hasta que salga un poco por el agujero. Ese sobrante arrastra las sales acumuladas.`,
        porque: agua.medidoConBascula
          ? `Pesada: le faltan ${agua.dosisRiegoMl} g respecto a la capacidad de campo.`
          : `El depósito está al ${Math.round(agua.fraccionRestante * 100)} % y consume ~${agua.consumoMlDia.toFixed(0)} ml/día en las condiciones actuales.`,
      })
    } else if (dias < 2.5) {
      acciones.push({
        icono: '💧', titulo: `Riega en ${Math.round(dias)} día${Math.round(dias) === 1 ? '' : 's'}`, prioridad: 2,
        detalle: `Cuando toque: ${agua.dosisRiegoMl} ml. Comprueba antes metiendo el dedo 3 cm: si sale húmedo, espera un día más.`,
        // Si hay pesada no se dice "estimado": sería vender como suposición un
        // dato que es exacto, y esta app se sostiene justamente en esa distinción.
        porque: agua.medidoConBascula
          ? `Pesada: le quedan ${Math.round(agua.mlRestantes)} ml de agua útil y consume ~${agua.consumoMlDia.toFixed(0)} ml/día.`
          : `Consumo estimado ${agua.consumoMlDia.toFixed(0)} ml/día; quedan ~${Math.round(agua.mlRestantes)} ml disponibles.`,
      })
    } else {
      acciones.push({
        icono: '🚫', titulo: 'Hoy no la riegues', prioridad: 3,
        detalle: `Le quedan unos ${Math.round(dias)} días de agua (~${Math.round(agua.mlRestantes)} ml). Próximo riego aproximado: ${new Date(Date.now() + dias * 86400000).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}.`,
        porque: 'Regar antes de tiempo es la causa más frecuente de muerte en interior: el sustrato saturado asfixia la raíz.',
      })
    }
  }

  // --- Luz ---
  if (luz?.veredicto) {
    const v = luz.veredicto
    if (v.estado === 'muy_baja' || v.estado === 'baja') {
      acciones.push({
        icono: '☀️', titulo: 'Necesita más luz', prioridad: v.estado === 'muy_baja' ? 1 : 2,
        detalle: luz.sugerenciaDistancia ?? `Acércala a la ventana o compleméntala: le hace falta multiplicar la luz actual por ${v.factor.toFixed(1)}.`,
        porque: `${luz.dliMedido.toFixed(1)} mol·m⁻²·d⁻¹ medidos frente a los ${especie.dli.opt} óptimos. Con menos luz también bebe menos, así que hay que bajar el riego a la vez.`,
      })
    } else if (v.estado === 'excesiva') {
      acciones.push({
        icono: '🌤️', titulo: 'Protégela del sol directo', prioridad: 2,
        detalle: 'Retírala un metro de la ventana o pon un visillo. Las quemaduras no se curan: la hoja dañada no vuelve a verdear.',
        porque: `${luz.dliMedido.toFixed(1)} mol·m⁻²·d⁻¹ frente al máximo de ${especie.dli.max} que tolera.`,
      })
    }
  }

  // --- Nutrición ---
  // Regla horticultural que ninguna app respeta: no se abona una planta
  // sedienta. Con el cepellón seco la sal del fertilizante queda concentrada
  // contra unas raíces que además no están absorbiendo, y las quema. Primero
  // se rehidrata; el abono, en el riego siguiente.
  const sedienta = agua && agua.fraccionRestante < 0.15
  if (nutricion) {
    if (sedienta && nutricion.ml > 0) {
      acciones.push({
        icono: '⏳', titulo: 'Abona, pero en el próximo riego, no en este', prioridad: 4,
        detalle: `Toca abono (${nutricion.ml} ml), pero el sustrato está casi seco. Riega primero solo con agua y deja el abono para el riego siguiente, con el cepellón ya húmedo.`,
        porque: 'Sobre sustrato seco el fertilizante se concentra junto a unas raíces que no están absorbiendo, y las quema.',
      })
    } else if (nutricion.ml > 0) {
      acciones.push({
        icono: '🧪', titulo: `Abona: ${nutricion.ml} ml de producto`, prioridad: 3,
        detalle: `${nutricion.ml} ml (≈ ${nutricion.gotas} gotas) diluidos en el agua del próximo riego (${agua?.dosisRiegoMl ?? 500} ml). Siempre sobre sustrato ya húmedo, nunca en seco.`,
        porque: `Aporta ${Math.round(nutricion.ppmN)} ppm de nitrógeno. ${nutricion.nota}`,
      })
    } else {
      acciones.push({
        icono: '🚫', titulo: 'No abones ahora', prioridad: 4,
        detalle: nutricion.nota,
        porque: reposo < 0.7
          ? 'En reposo la planta no puede consumir el nitrógeno y este se queda como sal en el sustrato, quemando la raíz.'
          : 'El abono en este momento haría más daño que bien.',
      })
    }
  }

  // --- Lo que diga el diagnóstico ---
  const p = diagnostico?.principal
  if (p && p.probabilidad > 0.2 && p.urgencia !== 'ninguna') {
    const RESPUESTAS = {
      exceso_agua: 'Deja de regar hasta que los 3 cm superiores estén secos. Saca el plato, comprueba que el agujero drena y, si el sustrato huele agrio, cámbialo por uno más aireado.',
      falta_agua: 'Riega a fondo por inmersión: mete la maceta en un barreño 20 minutos y deja escurrir. Si el cepellón se ha separado de las paredes, el agua por arriba se escapa por los lados sin mojarlo.',
      poca_luz: 'Acércala a la ventana o añade una lámpara de cultivo. Y baja el riego en la misma proporción: con poca luz bebe mucho menos.',
      exceso_luz: 'Aléjala del sol directo del mediodía o filtra con visillo.',
      falta_n: 'Abono con nitrógeno alto en el próximo riego y, si lleva más de dos años en la misma tierra, trasplante.',
      clorosis_fe: 'Quelato de hierro EDDHA (el único que funciona por encima de pH 7) y riego con agua de lluvia o de ósmosis. Más abono normal no lo arregla.',
      sales: 'Lavado del cepellón: riega con tres veces el volumen de la maceta, despacio, dejando drenar. Suspende el abono un mes.',
      hr_baja: 'Agrupa las plantas, pon una bandeja con arcilla húmeda debajo (sin que la maceta toque el agua) o un humidificador. Pulverizar la hoja no sirve: dura minutos.',
      arana: 'Ducha de agua templada insistiendo en el envés, sube la humedad y repite a los 5 días para romper el ciclo de los huevos.',
      pudricion: 'Urgente: saca el cepellón, corta con tijera limpia toda raíz parda o blanda, trasplanta a sustrato nuevo aireado y no riegues hasta ver brote nuevo.',
      maceta_pequena: 'Trasplante a una maceta 3–4 cm más ancha con sustrato nuevo. No mucho más grande: el exceso de tierra sin raíz se mantiene húmedo y pudre.',
      frio: 'Aléjala de la ventana fría y de la corriente de la puerta. El daño por frío aparece 2–3 días después del episodio.',
    }
    if (RESPUESTAS[p.id]) {
      // Si el diagnóstico principal es de riego, ya hay arriba una tarjeta de
      // agua diciendo lo mismo. En vez de repetirlo como segunda tarjeta —que
      // se lee como dos problemas distintos— se le añade la técnica concreta a
      // la que ya existe.
      const tarjetaAgua = acciones.find((a) => a.icono === '💧' || a.icono === '🚫')
      const esDeRiego = p.id === 'falta_agua' || p.id === 'exceso_agua'
      if (esDeRiego && tarjetaAgua) {
        tarjetaAgua.detalle += ` ${RESPUESTAS[p.id]}`
        tarjetaAgua.porque += ` Diagnóstico coincidente: ${p.nombre.toLowerCase()} al ${Math.round(p.probabilidad * 100)} % sobre ${diagnostico.nEvidencias} evidencias.`
      } else {
        acciones.push({
          icono: p.urgencia === 'crítica' ? '🚨' : '🩺',
          titulo: p.nombre,
          prioridad: p.urgencia === 'crítica' ? 0 : p.urgencia === 'alta' ? 1 : 3,
          detalle: RESPUESTAS[p.id],
          porque: `${Math.round(p.probabilidad * 100)} % de probabilidad según ${diagnostico.nEvidencias} evidencias independientes.`,
        })
      }
    }
  }

  // --- Plagas ---
  const plagaAlta = plagas?.find((x) => x.riesgo > 0.62)
  if (plagaAlta) {
    acciones.push({
      icono: '🐛', titulo: `Vigila: ${plagaAlta.nombre}`, prioridad: 3,
      detalle: plagaAlta.accion,
      porque: `Las condiciones actuales (${clima?.tempC} °C, ${clima?.humedadRel} % HR) le son favorables y completaría una generación en ~${Math.round(plagaAlta.diasGeneracion)} días. ${plagaAlta.senal}`,
    })
  }

  if (!acciones.length) {
    acciones.push({
      icono: '✅', titulo: 'No toca hacer nada', prioridad: 5,
      detalle: 'Todo está dentro de rango. Vuelve a medir en una semana.',
      porque: 'La mayoría de las plantas de interior mueren por intervención excesiva, no por abandono.',
    })
  }

  return acciones.sort((a, b) => a.prioridad - b.prioridad)
}
