// Validación de los modelos físicos contra valores conocidos.
//
// Los modelos de esta app afirman cosas comprobables: que el sol pleno da unos
// 100 000 lux, que Madrid tiene 15 h de sol en el solsticio, que una maceta de
// 15 cm son ~1.8 L. Si el código deja de reproducir esos valores, está roto,
// y más vale enterarse aquí que después de matar un ficus.
//
// El luxómetro se comprueba además por partida doble: la ecuación de luz
// reflejada (K = 12.5) debe coincidir con la de luz incidente (C = 250), que
// es una vía independiente. Si las dos concuerdan, las constantes están bien.
//
//   node --run test      (o: node test/modelos.test.mjs)

import { medirLuz, dli, veredictoLuz, factorDistancia } from '../src/lightmeter.js'
import { consumoDiario, balance, volumenMaceta, vpd, gravimetria, riesgoAsfixia } from '../src/waterbalance.js'
import { fotoperiodo, factorReposo, estacionTexto } from '../src/solar.js'
import { porId } from '../src/species.js'
import { dosisLiquida, conductividad } from '../src/nutrients.js'
import { evaluarPlagas } from '../src/pests.js'
import { diagnosticar } from '../src/diagnose.js'

let fallos = 0
const ok = (c,m)=>{ if(!c) fallos++; console.log(`${c?'  OK  ':' FALLO'} │ ${m}`) }

console.log('\n── LUXÓMETRO ────────────────────────────────────────')
// Ventana clara: f/1.8, 1/500 s, ISO 50, foto expuesta al gris medio
let m = medirLuz({exposureTime:1/500, fNumber:1.8, iso:50}, 0.18, {referencia:'escena', fuente:'sol'})
console.log(`  Ventana clara .... ${Math.round(m.lux)} lx · PPFD ${Math.round(m.ppfd)} · EV100 ${m.ev100.toFixed(1)} · ±${Math.round(m.incertidumbrePpfd*100)}%`)
ok(m.lux>3000 && m.lux<20000, 'lux junto a ventana en rango realista (3k–20k)')

// Interior en penumbra: f/1.8, 1/30 s, ISO 800
m = medirLuz({exposureTime:1/30, fNumber:1.8, iso:800}, 0.18, {referencia:'escena', fuente:'sol'})
console.log(`  Rincón interior .. ${Math.round(m.lux)} lx · PPFD ${Math.round(m.ppfd)}`)
ok(Math.abs(m.lux - 2.5*2**m.ev100)/m.lux < 0.05, 'penumbra: coincide con la relacion independiente E = 2.5*2^EV100')

// Exterior sol pleno: f/11, 1/250, ISO 100  (regla "sunny 16")
m = medirLuz({exposureTime:1/250, fNumber:11, iso:100}, 0.18, {referencia:'escena', fuente:'sol'})
console.log(`  Sol pleno ........ ${Math.round(m.lux)} lx · PPFD ${Math.round(m.ppfd)}`)
ok(m.lux>60000 && m.lux<130000, 'sol pleno en rango de sunny-16')
ok(Math.abs(m.lux - 2.5*2**m.ev100)/m.lux < 0.05, 'sol pleno: coincide con E = 2.5*2^EV100 (constantes ISO 2720 consistentes)')
ok(Math.round(m.ppfd)>1200 && Math.round(m.ppfd)<2400, 'PPFD sol pleno ≈ 1500–2000 µmol (valor de libro)')

console.log('\n── DLI Y VEREDICTO ──────────────────────────────────')
const d = dli(131, 6.6)
console.log(`  DLI ventana ...... ${d.toFixed(1)} mol/m²d`)
ok(d>1 && d<8, 'DLI de ventana interior en rango típico (1–8)')
const potos = porId('potos')
console.log(`  Veredicto potos .. ${veredictoLuz(d, potos).estado}`)
console.log(`  Mover 100→40 cm .. ×${factorDistancia(100,40).toFixed(2)} de luz`)

console.log('\n── BALANCE HÍDRICO ──────────────────────────────────')
const vol = volumenMaceta({diametroCm:15, alturaCm:14})
console.log(`  Maceta Ø15×14 .... ${vol.toFixed(2)} L   (una maceta de 15 cm ≈ 1.5–2 L)`)
ok(vol>1.2 && vol<2.4, 'volumen de maceta realista')
console.log(`  VPD 21°C/50% ..... ${vpd(21,50).toFixed(2)} kPa`)
ok(vpd(21,50)>1.1 && vpd(21,50)<1.4, 'VPD de salón en rango de libro (~1.24 kPa)')

const cons = consumoDiario({areaFoliarCm2:1000, ppfd:60, horasLuz:12, tempC:21, humedadRel:50,
  diametroCm:15, coberturaFollaje:0.5, factorEspecie:potos.gsFactor, factorReposo:1})
console.log(`  Consumo potos .... ${cons.totalMl.toFixed(1)} ml/día (${cons.transpiracionMl.toFixed(1)} transpira + ${cons.evaporacionMl.toFixed(1)} evapora)`)
ok(cons.totalMl>8 && cons.totalMl<60, 'consumo diario realista para potos en maceta de 15 cm')

const b = balance({diametroCm:15, alturaCm:14, sustrato:'aireado', mad:potos.mad,
  consumoMlDia:cons.totalMl, fraccionRestante:1})
console.log(`  Agua útil ........ ${Math.round(b.aguaUtilMl)} ml · intervalo ${b.intervaloTipico.toFixed(1)} días · dosis ${b.dosisRiegoMl} ml`)
ok(b.intervaloTipico>4 && b.intervaloTipico<20, 'intervalo de riego de potos entre 4 y 20 días (real: 7–12)')

// Contraste: helecho (transpira mucho, no tolera secarse) vs cactus
const hel = porId('helecho'), cac = porId('cactus')
const cHel = consumoDiario({areaFoliarCm2:1000, ppfd:60, horasLuz:12, tempC:21, humedadRel:50, diametroCm:15, coberturaFollaje:.5, factorEspecie:hel.gsFactor, factorReposo:1})
const cCac = consumoDiario({areaFoliarCm2:1000, ppfd:60, horasLuz:12, tempC:21, humedadRel:50, diametroCm:15, coberturaFollaje:.5, factorEspecie:cac.gsFactor, factorReposo:1})
const bHel = balance({diametroCm:15, alturaCm:14, sustrato:'universal', mad:hel.mad, consumoMlDia:cHel.totalMl, fraccionRestante:1})
const bCac = balance({diametroCm:15, alturaCm:14, sustrato:'cactus', mad:cac.mad, consumoMlDia:cCac.totalMl, fraccionRestante:1})
console.log(`  Helecho .......... cada ${bHel.intervaloTipico.toFixed(1)} d   ·   Cactus: cada ${bCac.intervaloTipico.toFixed(1)} d`)
ok(bCac.intervaloTipico > bHel.intervaloTipico*3, 'el cactus aguanta muchísimo más que el helecho')

// Calor y sequedad → debe beber bastante más
const cCalor = consumoDiario({areaFoliarCm2:1000, ppfd:60, horasLuz:12, tempC:28, humedadRel:30, diametroCm:15, coberturaFollaje:.5, factorEspecie:potos.gsFactor, factorReposo:1})
console.log(`  Potos a 28°C/30% . ${cCalor.totalMl.toFixed(1)} ml/día  (vs ${cons.totalMl.toFixed(1)} a 21°C/50%)`)
ok(cCalor.totalMl > cons.totalMl*1.8, 'el calor seco multiplica el consumo (VPD manda)')

console.log('\n── GRAVIMETRÍA ──────────────────────────────────────')
const g = gravimetria({pesoCapacidadG:1850, pesoSecoG:1420, pesoActualG:1600})
console.log(`  Reponer .......... ${g.reponerMl} ml · reserva ${Math.round(g.fraccionRestante*100)} %`)
ok(g.reponerMl===250 && Math.round(g.fraccionRestante*100)===42, 'la resta de pesos es exacta')

console.log('\n── ESTACIÓN (astronomía) ────────────────────────────')
for (const [lat,nom] of [[40.4,'Madrid'],[59.3,'Estocolmo'],[4.6,'Bogotá']]) {
  const jun = new Date(2026,5,21), dic = new Date(2026,11,21)
  console.log(`  ${nom.padEnd(11)} 21-jun ${fotoperiodo(lat,jun).toFixed(1)} h · 21-dic ${fotoperiodo(lat,dic).toFixed(1)} h · reposo dic ×${factorReposo(lat,dic,'media').toFixed(2)}`)
}
ok(Math.abs(fotoperiodo(40.4,new Date(2026,5,21))-15.0)<0.5, 'Madrid en solsticio ≈ 15 h de sol (real: 15h03)')
ok(Math.abs(fotoperiodo(4.6,new Date(2026,5,21))-12.1)<0.4, 'Bogotá ≈ 12 h todo el año (trópico)')

console.log('\n── NUTRICIÓN ────────────────────────────────────────')
const dos = dosisLiquida({npk:{n:7,p:3,k:6}, volumenRiegoMl:500, ppmObjetivoN:100, fase:'crecimiento', factorReposo:1})
console.log(`  Abono 7-3-6 ...... ${dos.ml} ml en 500 ml → ${dos.ppmN} ppm N`)
ok(dos.ml>0.5 && dos.ml<1.5, 'dosis ≈ 0.7 ml en medio litro (coherente con "1 tapón por regadera")')
const ce = conductividad({ppmN:100, ppmP:43, ppmK:86, agua:'media'})
console.log(`  CE resultante .... ${ce.ce.toFixed(2)} dS/m`)
ok(ce.ce>0.7 && ce.ce<2.5, 'CE de riego en rango de cultivo real')
console.log(`  Reposo invernal .. ${dosisLiquida({npk:{n:7,p:3,k:6}, volumenRiegoMl:500, fase:'reposo'}).ml} ml (debe ser 0)`)

console.log('\n── PLAGAS ───────────────────────────────────────────')
const pCalido = evaluarPlagas({tempC:26, humedadRel:35, corrienteAire:1, humedadSustrato:.3, diasSaturado:1, riesgoAsfixia:.1})
console.log(`  Cálido y seco .... ${pCalido[0].nombre} (${pCalido[0].nivel}), generación cada ${Math.round(pCalido[0].diasGeneracion)} d`)
ok(pCalido[0].id==='arana_roja', 'ambiente cálido y seco → araña roja en cabeza')
const pHumedo = evaluarPlagas({tempC:19, humedadRel:75, corrienteAire:0.85, humedadSustrato:.9, diasSaturado:6, riesgoAsfixia:.9})
console.log(`  Húmedo y parado .. ${pHumedo[0].nombre} (${pHumedo[0].nivel})`)
ok(['pudricion','mosca_sustrato','oidio'].includes(pHumedo[0].id), 'ambiente húmedo → pudrición/mosca/oídio en cabeza')

console.log('\n── DIAGNÓSTICO BAYESIANO ────────────────────────────')
// Caso 1: clásico exceso de riego — poca luz, sustrato saturado, manchas internas
let dg = diagnosticar({
  hoja:{valido:true, fraccionClorosis:.28, fraccionNecrosis:.09, sesgoMarginal:-.15, internervial:.1, moteado:.05, dgci:.38, fraccionSana:.63},
  luz:{dliMedido:0.9}, agua:{fraccionRestante:.92, riesgoAsfixia:.8, diasSaturado:6},
  clima:{tempC:19, humedadRel:65}, especie:potos,
  historia:{diasDesdeRiego:7}, sustrato:{ph:6.2, ceEstimada:.9}})
console.log(`  Caso "regada de más" → ${dg.ranking.slice(0,3).map(h=>`${h.nombre} ${Math.round(h.probabilidad*100)}%`).join(' · ')} ${dg.concluyente?'[concluyente]':'[no concluyente]'}`)
ok(['exceso_agua','pudricion'].includes(dg.principal.id), 'detecta exceso de riego / pudrición')

// Caso 2: clorosis férrica — amarillo internervial, agua dura, pH alto
dg = diagnosticar({
  hoja:{valido:true, fraccionClorosis:.4, fraccionNecrosis:.02, sesgoMarginal:0, internervial:.65, moteado:.03, dgci:.4, fraccionSana:.58},
  luz:{dliMedido:24}, agua:{fraccionRestante:.5, riesgoAsfixia:.2, diasSaturado:2},
  clima:{tempC:22, humedadRel:50}, especie:porId('limonero'),
  historia:{}, sustrato:{ph:7.6, ceEstimada:1.0}})
console.log(`  Caso "clorosis Fe"   → ${dg.principal.nombre} (${Math.round(dg.principal.probabilidad*100)} %)`)
ok(dg.principal.id==='clorosis_fe', 'distingue clorosis férrica por el patrón internervial + pH')

// Caso 3: sed — depósito vacío, borde quemado
dg = diagnosticar({
  hoja:{valido:true, fraccionClorosis:.1, fraccionNecrosis:.2, sesgoMarginal:.3, internervial:.05, moteado:.04, dgci:.5, fraccionSana:.7},
  luz:{dliMedido:7}, agua:{fraccionRestante:.02, riesgoAsfixia:.1, diasSaturado:1},
  clima:{tempC:25, humedadRel:38}, especie:potos, historia:{diasDesdeRiego:18}, sustrato:{ph:6.3, ceEstimada:1.0}})
console.log(`  Caso "sed"           → ${dg.principal.nombre} (${Math.round(dg.principal.probabilidad*100)} %)`)
ok(['falta_agua','sales','hr_baja'].includes(dg.principal.id), 'detecta falta de agua / sales')

// Caso 4: planta sana — no debe inventarse un problema
dg = diagnosticar({
  hoja:{valido:true, fraccionClorosis:.02, fraccionNecrosis:.01, sesgoMarginal:.01, internervial:.05, moteado:.05, dgci:.6, fraccionSana:.97},
  luz:{dliMedido:6}, agua:{fraccionRestante:.55, riesgoAsfixia:.2, diasSaturado:2},
  clima:{tempC:21, humedadRel:55}, especie:potos, historia:{diasDesdeRiego:4}, sustrato:{ph:6.2, ceEstimada:.9}})
console.log(`  Caso "sana"          → ${dg.principal.nombre} (${Math.round(dg.principal.probabilidad*100)} %) ${dg.concluyente?'· concluyente':'· NO concluyente (correcto)'}`)
ok(!dg.concluyente || dg.principal.urgencia==='ninguna', 'con una planta sana no se inventa un diagnóstico urgente')
console.log('')

console.log('\n── TOXICIDAD PARA MASCOTAS ──────────────────────────')
import { consultar, revisarCasa, emergencia, TOXICIDAD, ALTERNATIVAS } from '../src/toxicity.js'
import { ESPECIES } from '../src/species.js'

// El lirio es el caso que justifica el modulo entero: mortal para el gato,
// casi inocuo para el perro. Si esto se rompe, la app deja de avisar de lo
// unico que puede matar al animal en 48 horas.
const lirioGato = consultar('lirio', 'gato')
const lirioPerro = consultar('lirio', 'perro')
console.log(`  Lirio ............ gato: ${lirioGato.label} · perro: ${lirioPerro.label}`)
ok(lirioGato.nivel === 'letal', 'lirio: MORTAL para gatos')
ok(lirioPerro.nivel !== 'letal', 'lirio: no mortal para perros — la distincion por especie animal funciona')

const urg = emergencia('letal', 'nefro_lirio')
ok(urg.urgencia === 'inmediata', 'lirio: la urgencia es inmediata')
ok(urg.pasos.some((x) => x.includes('48')), 'lirio: se indica la ventana de 48 h, que es lo que cambia el pronostico')
ok(urg.pasos.some((x) => /NO provoques el vómito/i.test(x)), 'nunca se recomienda provocar el vomito')

// Una casa con un lirio tiene que salir en rojo y con el lirio el primero.
const casa = revisarCasa([
  { id: 'a', nombre: 'Potos del salon', especieId: 'potos' },
  { id: 'b', nombre: 'Helecho', especieId: 'helecho' },
  { id: 'c', nombre: 'Ramo de lirios', especieId: 'lirio' },
], 'gato')
console.log(`  Casa con lirio ... "${casa.veredicto.titulo}" · primera: ${casa.fichas[0].planta.nombre}`)
ok(casa.veredicto.tono === 'danger', 'casa con lirio: veredicto en rojo')
ok(casa.fichas[0].planta.especieId === 'lirio', 'el lirio se ordena el primero, por delante del potos')
ok(casa.criticas.length === 1, 'se cuenta exactamente una planta critica')

// Una casa solo con plantas seguras no debe alarmar.
const casaOk = revisarCasa([
  { id: 'a', nombre: 'Helecho', especieId: 'helecho' },
  { id: 'b', nombre: 'Cinta', especieId: 'cinta' },
], 'gato')
console.log(`  Casa segura ...... "${casaOk.veredicto.titulo}"`)
ok(casaOk.veredicto.tono === 'ok', 'casa con plantas seguras: sin alarma')
ok(casaOk.criticas.length === 0, 'ninguna critica')

// "Sin datos" NO puede tratarse como seguro: es el fallo clasico y peligroso.
const desconocida = consultar('especie_que_no_existe', 'gato')
ok(desconocida.nivel === 'sin_datos', 'especie desconocida → "sin datos", nunca "no toxica"')
ok(desconocida.nivel !== 'no_toxica', 'sin datos jamas se convierte en seguro por defecto')

// Integridad de los datos: toda entrada debe apuntar a una especie real y a un
// principio existente, o el panel mostraria huecos.
const idsEspecie = new Set(ESPECIES.map((e) => e.id))
const huerfanas = Object.keys(TOXICIDAD).filter((id) => !idsEspecie.has(id))
ok(huerfanas.length === 0, huerfanas.length ? `entradas sin especie: ${huerfanas.join(', ')}` : 'toda entrada de toxicidad tiene su especie en la base')

const altMalas = Object.entries(ALTERNATIVAS).filter(([, a]) => !idsEspecie.has(a.id))
ok(altMalas.length === 0, altMalas.length ? `alternativas rotas: ${altMalas.map(([k]) => k).join(', ')}` : 'toda alternativa segura apunta a una especie real')

// Y ninguna "alternativa segura" puede ser a su vez peligrosa: seria el peor
// fallo posible del modulo.
const altPeligrosas = Object.entries(ALTERNATIVAS)
  .filter(([, a]) => ['letal', 'grave', 'moderada'].includes(consultar(a.id, 'gato').nivel))
ok(altPeligrosas.length === 0,
  altPeligrosas.length
    ? `ALTERNATIVAS PELIGROSAS: ${altPeligrosas.map(([k, a]) => `${k}→${a.id}`).join(', ')}`
    : 'ninguna alternativa "segura" es en realidad toxica para el gato')

// Las especies marcadas toxica:true en la base deben tener ficha de toxicidad.
const sinFicha = ESPECIES.filter((e) => e.toxica === true && !TOXICIDAD[e.id])
ok(sinFicha.length === 0, sinFicha.length ? `toxicas sin ficha: ${sinFicha.map((e) => e.id).join(', ')}` : 'toda especie marcada toxica tiene su ficha detallada')

console.log('\n── MODO VACACIONES ──────────────────────────────────')
import { planVacaciones, instruccionesCuidador, hojaCuidadorHTML } from '../src/vacaciones.js'

const casaEjemplo = [
  { id: 'v1', nombre: 'Potos', especieId: 'potos', diametroCm: 15, alturaCm: 14, sustrato: 'aireado', materialMaceta: 'plastico', distanciaVentanaCm: 100 },
  { id: 'v2', nombre: 'Helecho', especieId: 'helecho', diametroCm: 15, alturaCm: 14, sustrato: 'universal', materialMaceta: 'plastico', distanciaVentanaCm: 150 },
  { id: 'v3', nombre: 'Cactus', especieId: 'cactus', diametroCm: 12, alturaCm: 11, sustrato: 'cactus', materialMaceta: 'barro', distanciaVentanaCm: 30 },
]
const entornoV = { tempC: 24, humedadRel: 45, latitud: 40.4, corrienteAire: 1, agua: 'media', fuenteLuz: 'sol' }

const sinMedidas = planVacaciones({ plantas: casaEjemplo, entorno: entornoV, dias: 14, medidas: [] })
const conPersianas = planVacaciones({ plantas: casaEjemplo, entorno: entornoV, dias: 14, medidas: ['persianas'] })
const conTodo = planVacaciones({ plantas: casaEjemplo, entorno: entornoV, dias: 14, medidas: ['persianas', 'agrupar', 'fresco'] })

for (const f of sinMedidas.fichas) {
  const conT = conTodo.fichas.find((x) => x.planta.id === f.planta.id)
  console.log(`  ${f.planta.nombre.padEnd(9)} sin medidas ${f.conMedidas.diasSupervivencia.toFixed(1).padStart(5)} d → con medidas ${conT.conMedidas.diasSupervivencia.toFixed(1).padStart(5)} d`)
}

// Lo contraintuitivo que el modelo debe reproducir: bajar persianas alarga
// mucho la autonomia, porque los estomas se cierran sin luz.
const potosSin = sinMedidas.fichas.find((f) => f.planta.id === 'v1')
const potosCon = conPersianas.fichas.find((f) => f.planta.id === 'v1')
const factor = potosCon.conMedidas.diasSupervivencia / potosSin.conMedidas.diasSupervivencia
console.log(`  Persianas ........ el potos pasa de ${potosSin.conMedidas.diasSupervivencia.toFixed(1)} a ${potosCon.conMedidas.diasSupervivencia.toFixed(1)} dias (x${factor.toFixed(2)})`)
ok(factor > 1.3, 'bajar las persianas alarga la autonomia de forma apreciable (efecto de gs con la luz)')
ok(potosCon.conMedidas.consumoMlDia < potosSin.conMedidas.consumoMlDia, 'con menos luz consume menos agua: es el mecanismo, no un bonus arbitrario')

// El orden importa: la mas apurada primero, para que se vea la primera.
ok(sinMedidas.fichas[0].margen <= sinMedidas.fichas[sinMedidas.fichas.length - 1].margen,
   'las plantas se ordenan de la mas apurada a la mas holgada')

// El cactus tiene que aguantar el viaje entero; el helecho no.
const cactusV = conTodo.fichas.find((f) => f.planta.id === 'v3')
const helechoV = conTodo.fichas.find((f) => f.planta.id === 'v2')
console.log(`  Contraste ........ cactus ${cactusV.conMedidas.diasSupervivencia.toFixed(0)} d · helecho ${helechoV.conMedidas.diasSupervivencia.toFixed(0)} d`)
ok(cactusV.llega, 'el cactus aguanta 14 dias sin problema')
ok(cactusV.conMedidas.diasSupervivencia > helechoV.conMedidas.diasSupervivencia * 2, 'el cactus aguanta mucho mas que el helecho')

// Las medidas nunca pueden empeorar la situacion.
for (const f of sinMedidas.fichas) {
  const conT = conTodo.fichas.find((x) => x.planta.id === f.planta.id)
  if (conT.conMedidas.diasSupervivencia < f.conMedidas.diasSupervivencia - 0.01) {
    ok(false, `las medidas empeoran ${f.planta.nombre}`)
  }
}
ok(true, 'ninguna medida empeora la autonomia de ninguna planta')

// Instrucciones para el cuidador: quien no necesita riego NO debe aparecer en
// las visitas, que es justamente como se mata una planta por exceso de cariño.
const inst = instruccionesCuidador(conTodo, new Date(2026, 6, 1))
const nombresVisita = new Set(inst.visitas.flatMap((v) => v.plantas.map((p) => p.nombre)))
console.log(`  Cuidador ......... ${inst.visitas.length} visita(s); regar: ${[...nombresVisita].join(', ') || 'nada'}; NO tocar: ${inst.noTocar.map((p) => p.nombre).join(', ') || 'nada'}`)
ok(!nombresVisita.has('Cactus'), 'el cactus NO aparece en la lista de riego: regarlo seria el error')
ok(inst.noTocar.some((p) => p.nombre === 'Cactus'), 'el cactus aparece explicitamente en "no regar"')
ok(inst.visitas.every((v) => v.dia >= 1 && v.dia < conTodo.dias), 'las visitas caen dentro del viaje')
ok(inst.visitas.every((v) => v.plantas.every((p) => p.ml > 0)), 'toda instruccion lleva una cantidad concreta en ml')

// Un viaje corto no deberia necesitar a nadie.
const finde = planVacaciones({ plantas: casaEjemplo, entorno: entornoV, dias: 3, medidas: ['persianas'] })
const instFinde = instruccionesCuidador(finde, new Date())
console.log(`  Fin de semana .... ${instFinde.visitas.length} visitas necesarias`)
ok(instFinde.visitas.length === 0, 'un viaje de 3 dias no necesita que venga nadie')

// La hoja imprimible debe salir bien formada y con las cantidades dentro. Se
// usa un viaje largo SIN medidas, que es el escenario que si necesita visitas:
// con el plan holgado no hay ningun ml que imprimir.
const planLargo = planVacaciones({ plantas: casaEjemplo, entorno: entornoV, dias: 30, medidas: [] })
const instLargo = instruccionesCuidador(planLargo, new Date(2026, 6, 1))
console.log(`  Viaje de 30 d .... ${instLargo.visitas.length} visitas, ${instLargo.noTocar.length} planta(s) que no se tocan`)
ok(instLargo.visitas.length > 0 || instLargo.inviables.length > 0, 'un viaje de 30 dias sin medidas necesita intervencion')
ok(instLargo.visitas.length <= 5, `nunca se propone un calendario absurdo de visitas (${instLargo.visitas.length})`)
if (instLargo.inviables.length) {
  console.log(`  Inviables ........ ${instLargo.inviables.map((p) => `${p.nombre} (cada ${p.cadaDias} d)`).join(', ')}`)
  ok(instLargo.inviables.every((p) => /mecha/.test(p.salida)), 'a las inviables se les da una salida real (mecha o dejarla en otra casa), no un calendario imposible')
}
// Para la hoja hace falta un escenario intermedio: alguna planta que si
// necesite visitas puntuales (ni holgada ni inviable). Es el caso mas comun.
const instMedio = instruccionesCuidador(sinMedidas, new Date(2026, 6, 1))
console.log(`  Hoja (14 d) ...... ${instMedio.visitas.length} visitas · ${instMedio.inviables.length} inviables · ${instMedio.noTocar.length} sin tocar`)
ok(instMedio.visitas.length > 0, 'un viaje de 14 dias sin medidas genera visitas concretas')
const html = hojaCuidadorHTML(sinMedidas, instMedio, new Date(2026, 6, 1))
ok(html.includes('<!doctype html>') && html.includes('</html>'), 'la hoja del cuidador es un HTML completo')
ok(/\d+ ml/.test(html), 'la hoja lleva cantidades en ml')
ok(html.includes('Ante la duda, no regar'), 'la hoja incluye la regla que evita el exceso de riego')

console.log(fallos ? `\n${fallos} comprobación(es) fallida(s).\n` : '\nTodas las comprobaciones pasan.\n')
process.exit(fallos ? 1 : 0)
