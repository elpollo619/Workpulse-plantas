// Plagas y hongos: predicción, no diagnóstico tardío.
//
// Cuando ves telarañas de araña roja ya llevas tres generaciones de retraso.
// Pero las plagas de interior son deterministas: su velocidad depende de la
// temperatura y su aparición, de la humedad. Con un modelo de grados-día se
// puede avisar ANTES, que es cuando aún se resuelve con un paño húmedo en vez
// de con un acaricida.
//
// Modelo clásico de entomología aplicada:
//     GD acumulados = Σ (T_media − T_base)
//     generación completa al alcanzar el umbral de la especie

/**
 * Grados-día acumulados desde una fecha.
 * @param tempMedia  temperatura media del sitio (°C)
 * @param dias       días transcurridos
 * @param base       temperatura umbral de desarrollo de la especie
 */
export function gradosDia(tempMedia, dias, base) {
  return Math.max(0, tempMedia - base) * Math.max(0, dias)
}

export const PLAGAS = [
  {
    id: 'arana_roja',
    nombre: 'Araña roja (Tetranychus urticae)',
    base: 12,
    gdGeneracion: 120,
    // Ácaro de ambiente cálido y seco: la calefacción en invierno es su
    // temporada alta, justo cuando nadie la espera.
    riesgo: ({ tempC, humedadRel }) => {
      const calor = Math.min(1, Math.max(0, (tempC - 20) / 8))
      const seco = Math.min(1, Math.max(0, (55 - humedadRel) / 22))
      return Math.min(1, calor * seco * 1.15)
    },
    senal: 'Punteado fino y decolorado en el haz; al trasluz, puntitos claros. Telaraña sutil en las axilas ya es fase avanzada.',
    accion: 'Ducha de agua templada en el envés, subir la humedad ambiental y repetir a los 5 días para romper el ciclo de los huevos.',
  },
  {
    id: 'mosca_sustrato',
    nombre: 'Mosca del sustrato (Bradysia, sciáridos)',
    base: 10,
    gdGeneracion: 200,
    // Sus larvas necesitan los 2 cm superiores del sustrato húmedos de forma
    // continua. Es un síntoma de riego, no una plaga que llega de fuera.
    riesgo: ({ humedadSustrato, diasSaturado }) => {
      const h = humedadSustrato ?? 0.5
      const sat = Math.min(1, (diasSaturado ?? 2) / 5)
      return Math.min(1, Math.max(0, (h - 0.45) / 0.4) * 0.6 + sat * 0.4)
    },
    senal: 'Mosquitas negras pequeñas que salen al mover la maceta.',
    accion: 'Dejar secar los 2–3 cm superiores entre riegos y cubrir con 1 cm de arena gruesa: sin superficie húmeda no pueden poner.',
  },
  {
    id: 'cochinilla',
    nombre: 'Cochinilla algodonosa',
    base: 12,
    gdGeneracion: 400,
    riesgo: ({ tempC, corrienteAire }) => {
      const calor = Math.min(1, Math.max(0, (tempC - 19) / 10))
      const quieto = corrienteAire < 1.05 ? 0.6 : 0.3
      return calor * quieto * 0.7
    },
    senal: 'Motas algodonosas blancas en axilas y envés, melaza pegajosa.',
    accion: 'Retirar una a una con bastoncillo y alcohol; revisar a los 10 días porque las ninfas siguen escondidas.',
  },
  {
    id: 'oidio',
    nombre: 'Oídio',
    base: 10,
    gdGeneracion: 250,
    // A diferencia de casi todos los hongos, el oídio NO necesita agua libre:
    // le basta humedad alta con aire parado. Por eso aparece en sitios donde
    // "no se moja la hoja".
    riesgo: ({ humedadRel, corrienteAire, tempC }) => {
      const hr = Math.min(1, Math.max(0, (humedadRel - 55) / 30))
      const quieto = corrienteAire < 1.05 ? 1 : 0.4
      const temp = tempC >= 17 && tempC <= 28 ? 1 : 0.4
      return hr * quieto * temp
    },
    senal: 'Polvo blanco harinoso en el haz, se quita con el dedo.',
    accion: 'Ventilar y separar las plantas. Retirar hojas afectadas; no mojar el follaje por la tarde.',
  },
  {
    id: 'pudricion',
    nombre: 'Pudrición radicular (Phytophthora / Pythium)',
    base: 8,
    gdGeneracion: 150,
    riesgo: ({ riesgoAsfixia, tempC }) => {
      const frio = tempC < 18 ? 1.25 : 1 // en frío la raíz se recupera peor
      return Math.min(1, (riesgoAsfixia ?? 0) * frio)
    },
    senal: 'Base del tallo blanda y oscura, olor agrio del sustrato, hojas caídas aunque la tierra esté húmeda.',
    accion: 'Sacar el cepellón, cortar raíz negra o blanda, trasplantar a sustrato nuevo más aireado y no regar hasta ver brote nuevo.',
  },
  {
    id: 'trips',
    nombre: 'Trips',
    base: 11,
    gdGeneracion: 260,
    riesgo: ({ tempC, humedadRel }) => {
      const calor = Math.min(1, Math.max(0, (tempC - 20) / 10))
      const seco = Math.min(1, Math.max(0, (60 - humedadRel) / 30))
      return calor * seco * 0.75
    },
    senal: 'Cicatrices plateadas y puntitos negros de excremento; hojas nuevas deformes.',
    accion: 'Trampas azules adhesivas y lavado del envés; revisar las hojas nuevas, que es donde se refugian.',
  },
]

/**
 * Evalúa todos los modelos con las condiciones actuales y devuelve los
 * riesgos ordenados, incluyendo cuándo tocaría la siguiente generación.
 */
export function evaluarPlagas(condiciones) {
  return PLAGAS
    .map((p) => {
      const riesgo = Math.min(1, Math.max(0, p.riesgo(condiciones) || 0))
      const gdDia = Math.max(0, (condiciones.tempC ?? 20) - p.base)
      const diasGeneracion = gdDia > 0 ? p.gdGeneracion / gdDia : Infinity
      return {
        id: p.id,
        nombre: p.nombre,
        riesgo,
        nivel: riesgo > 0.62 ? 'alto' : riesgo > 0.33 ? 'medio' : 'bajo',
        diasGeneracion,
        senal: p.senal,
        accion: p.accion,
      }
    })
    .sort((a, b) => b.riesgo - a.riesgo)
}

/**
 * Cuándo revisar la planta. Si el riesgo es alto y la generación es corta, la
 * revisión debe caer DENTRO del ciclo — inspeccionar cada 15 días con una
 * plaga que completa generación en 8 llega tarde por definición.
 */
export function proximaRevision(plagas) {
  const critica = plagas.find((p) => p.riesgo > 0.33)
  if (!critica || !isFinite(critica.diasGeneracion)) return { dias: 14, motivo: 'Revisión rutinaria quincenal.' }
  const dias = Math.max(3, Math.round(critica.diasGeneracion * 0.6))
  return {
    dias,
    motivo: `${critica.nombre} completaría una generación en ~${Math.round(critica.diasGeneracion)} días en estas condiciones; conviene mirar el envés antes de que cierre el ciclo.`,
  }
}
