import { useEffect, useMemo, useState } from 'react'
import { evaluar } from './engine.js'
import { ESPECIES, porId } from './species.js'
import { SUSTRATOS, MATERIALES_MACETA } from './waterbalance.js'
import { FASES, ABONOS_TIPO } from './nutrients.js'
import { EVENTOS, anotar, historial } from './journal.js'
import { curvaCrecimiento } from './store.js'
import { fotosDe } from './photostore.js'
import Analizar from './Analizar.jsx'
import Identificar from './Identificar.jsx'

function Sparkline({ puntos }) {
  if (!puntos || puntos.length < 2) return null
  const xs = puntos.map((p) => p.ts)
  const ys = puntos.map((p) => p.cobertura)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  const px = (x) => ((x - x0) / (x1 - x0 || 1)) * 96 + 2
  const py = (y) => 50 - ((y - y0) / (y1 - y0 || 1)) * 44
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${px(p.ts).toFixed(1)},${py(p.cobertura).toFixed(1)}`).join(' ')
  return (
    <svg className="spark" viewBox="0 0 100 56" preserveAspectRatio="none">
      <path d={d} />
      {puntos.map((p, i) => <circle key={i} cx={px(p.ts)} cy={py(p.cobertura)} r="1.6" />)}
    </svg>
  )
}

export default function FichaPlanta({ planta, entorno, onCambiar, onBorrar, onVolver }) {
  const [panel, setPanel] = useState(null)
  const [extras, setExtras] = useState({})
  const [pesoActual, setPesoActual] = useState('')
  const [crecimiento, setCrecimiento] = useState(null)
  const [fotos, setFotos] = useState([])
  const [hist, setHist] = useState([])
  const [nota, setNota] = useState('')

  const refrescar = () => setHist(historial(planta.id).slice(0, 25))

  useEffect(() => {
    refrescar()
    curvaCrecimiento(planta.id).then(setCrecimiento)
    fotosDe(planta.id).then((f) => setFotos(f.slice(-6).reverse()))
  }, [planta.id])

  const ev = useMemo(
    () => evaluar(planta, entorno, {
      ...extras,
      crecimiento,
      pesoActualG: Number(pesoActual) || undefined,
    }),
    [planta, entorno, extras, crecimiento, pesoActual]
  )

  const set = (campo, valor) => onCambiar({ ...planta, [campo]: valor })

  async function registrar(tipo, datos = {}) {
    await anotar(planta.id, tipo, datos)
    refrescar()
  }

  return (
    <>
      <div className="acciones-fila" style={{ marginTop: 0, marginBottom: 12 }}>
        <button onClick={onVolver}>← Mis plantas</button>
        <button className={panel === 'foto' ? 'activo' : 'primario'} onClick={() => setPanel(panel === 'foto' ? null : 'foto')}>
          📷 Analizar foto
        </button>
        <button className={panel === 'id' ? 'activo' : ''} onClick={() => setPanel(panel === 'id' ? null : 'id')}>
          🔍 Identificar
        </button>
        <button className={panel === 'ajustes' ? 'activo' : ''} onClick={() => setPanel(panel === 'ajustes' ? null : 'ajustes')}>
          ⚙️ Ficha
        </button>
      </div>

      {panel === 'foto' && (
        <Analizar
          planta={planta}
          entorno={entorno}
          onCerrar={() => setPanel(null)}
          onResultado={(r) => {
            setExtras((prev) => ({ ...prev, ...r }))
            setPanel(null)
            curvaCrecimiento(planta.id).then(setCrecimiento)
            fotosDe(planta.id).then((f) => setFotos(f.slice(-6).reverse()))
            refrescar()
          }}
        />
      )}

      {panel === 'id' && (
        <Identificar
          onCerrar={() => setPanel(null)}
          onElegir={(especie, meta) => {
            const e = especie ?? porId('generica_verde')
            onCambiar({ ...planta, especieId: e.id, sustrato: e.sustrato })
            registrar('nota', { texto: `Identificada como ${e.nombre} (${meta.procedencia})` })
            setPanel(null)
          }}
        />
      )}

      {/* ============ LA RECETA ============ */}
      <div className="tarjeta">
        <h2>Qué darle hoy</h2>
        {ev.receta.map((a, i) => (
          <div key={i} className={`accion p${a.prioridad}`}>
            <div className="ico">{a.icono}</div>
            <div style={{ flex: 1 }}>
              <div className="titulo">{a.titulo}</div>
              <div className="detalle">{a.detalle}</div>
              <div className="porque">{a.porque}</div>
            </div>
          </div>
        ))}

        <div className="acciones-fila">
          <button onClick={() => registrar('riego', { ml: ev.agua.dosisRiegoMl })}>
            💧 He regado ({ev.agua.dosisRiegoMl} ml)
          </button>
          <button onClick={() => registrar('abono', { ml: ev.nutricion.ml, ppmN: Math.round(ev.nutricion.ppmN) })}>
            🧪 He abonado
          </button>
          <button onClick={() => registrar('mudanza', {})}>📦 La he cambiado de sitio</button>
          <button onClick={() => registrar('trasplante', {})}>🪴 La he trasplantado</button>
        </div>
      </div>

      {/* ============ MEDIDAS ============ */}
      <div className="tarjeta">
        <h2>Medidas</h2>
        <div className="medidas">
          <div className={`medida ${ev.luz ? (ev.luz.veredicto.estado === 'optima' ? 'ok' : 'warn') : ''}`}>
            <div className="etq">Luz (DLI)</div>
            <div className="val">
              {ev.luz ? ev.luz.dliMedido.toFixed(1) : '—'} <small>mol/m²d</small>
              {ev.luz && <span className={`fiab ${ev.luz.fiabilidad}`}>{ev.luz.fiabilidad}</span>}
            </div>
            <div className="pie">
              {ev.luz
                ? `± ${(ev.luz.dliMedido * ev.luz.incertidumbre).toFixed(1)} · pide ${ev.especie.dli.min}–${ev.especie.dli.max}`
                : `sin medir · pide ${ev.especie.dli.min}–${ev.especie.dli.max}`}
            </div>
          </div>

          <div className="medida agua">
            <div className="etq">Reserva de agua</div>
            <div className="val">
              {Math.round(ev.agua.fraccionRestante * 100)} <small>%</small>
              <span className={`fiab ${ev.agua.fiabilidad}`}>{ev.agua.fiabilidad}</span>
            </div>
            <div className="pie">
              {Math.round(ev.agua.mlRestantes)} de {Math.round(ev.agua.aguaUtilMl)} ml
              {ev.agua.medidoConBascula ? ' · pesada' : ' · estimada'}
            </div>
          </div>

          <div className="medida">
            <div className="etq">Consumo</div>
            <div className="val">{ev.agua.consumoMlDia.toFixed(0)} <small>ml/día</small></div>
            <div className="pie">
              {ev.agua.transpiracionMl.toFixed(0)} transpira + {ev.agua.evaporacionMl.toFixed(0)} evapora
            </div>
          </div>

          <div className={`medida ${ev.agua.diasRestantes < 1 ? 'warn' : 'ok'}`}>
            <div className="etq">Próximo riego</div>
            <div className="val">
              {isFinite(ev.agua.diasRestantes) ? Math.max(0, ev.agua.diasRestantes).toFixed(1) : '—'} <small>días</small>
            </div>
            <div className="pie">ciclo típico {ev.agua.intervaloTipico.toFixed(0)} d · {ev.agua.dosisRiegoMl} ml</div>
          </div>

          <div className="medida">
            <div className="etq">VPD ambiente</div>
            <div className="val">{ev.agua.vpd.toFixed(2)} <small>kPa</small></div>
            <div className="pie">{entorno.tempC} °C · {entorno.humedadRel} % HR</div>
          </div>

          <div className={`medida ${ev.agua.riesgoAsfixia > 0.65 ? 'danger' : ev.agua.riesgoAsfixia > 0.4 ? 'warn' : 'ok'}`}>
            <div className="etq">Riesgo de asfixia</div>
            <div className="val">{Math.round(ev.agua.riesgoAsfixia * 100)} <small>%</small></div>
            <div className="pie">{ev.agua.diasSaturado.toFixed(1)} d saturado tras regar</div>
          </div>

          <div className="medida">
            <div className="etq">Estación fisiológica</div>
            <div className="val" style={{ fontSize: 14 }}>{ev.estacion.texto}</div>
            <div className="pie">{ev.estacion.horasLuz.toFixed(1)} h de sol · actividad {Math.round(ev.estacion.reposo * 100)} %</div>
          </div>

          <div className="medida">
            <div className="etq">Superficie foliar</div>
            <div className="val">{Math.round(ev.agua.areaFoliarCm2)} <small>cm²</small></div>
            <div className="pie">{ev.agua.origenArea}</div>
          </div>
        </div>

        {ev.luz?.sugerenciaDistancia && (
          <div className="aviso warn" style={{ marginTop: 10 }}>☀️ {ev.luz.sugerenciaDistancia}</div>
        )}
        {ev.agua.riesgoAsfixia > 0.6 && (
          <div className="aviso danger" style={{ marginTop: 10 }}>🫁 {ev.agua.motivoAsfixia}</div>
        )}
        {!ev.luz && (
          <div className="aviso" style={{ marginTop: 10 }}>
            Sin medida de luz, el consumo de agua se estima por la distancia declarada a la ventana
            ({planta.distanciaVentanaCm} cm) — es el dato menos fiable de todo el cálculo.
            Una foto con el luxómetro lo convierte en una medida real.
          </div>
        )}
      </div>

      {/* ============ GRAVIMETRÍA ============ */}
      <div className="tarjeta">
        <h2>⚖️ Riego por peso — el método exacto</h2>
        <div className="aviso ok">
          El agua pesa 1 g por ml exactos. Una báscula de cocina mide el estado hídrico de la
          maceta mejor que cualquier sensor barato de los que se clavan en la tierra (esos miden
          conductividad y el abono los descalibra). Dos pesadas de calibración y esta planta pasa
          a tener una medida de laboratorio.
        </div>

        <div className="rejilla">
          <label className="campo">
            <span>1. Peso recién regada y escurrida (g)</span>
            <input type="number" value={planta.pesoCapacidadG ?? ''} placeholder="ej. 1850"
              onChange={(e) => set('pesoCapacidadG', Number(e.target.value) || null)} />
          </label>
          <label className="campo">
            <span>2. Peso cuando toca regar (g) — opcional</span>
            <input type="number" value={planta.pesoSecoG ?? ''} placeholder="ej. 1420"
              onChange={(e) => set('pesoSecoG', Number(e.target.value) || null)} />
          </label>
          <label className="campo">
            <span>3. Cuánto pesa ahora (g)</span>
            <input type="number" value={pesoActual} placeholder="pésala y escríbelo"
              onChange={(e) => setPesoActual(e.target.value)} />
          </label>
        </div>

        {ev.agua.medidoConBascula && (
          <div className="aviso ok">
            <b>Medida exacta:</b> le faltan <b>{ev.agua.reponerMl} ml</b> para volver a capacidad de
            campo, y le queda el {Math.round(ev.agua.fraccionRestante * 100)} % del agua útil.
            Esto no es una estimación: es una resta.
          </div>
        )}
        {pesoActual && !ev.agua.medidoConBascula && (
          <div className="aviso warn">
            Falta el peso de referencia (paso 1). Riega a fondo, deja escurrir 30 minutos y pésala:
            ese es el peso a capacidad de campo.
          </div>
        )}
        {pesoActual && (
          <div className="acciones-fila">
            <button onClick={() => registrar('peso', { g: Number(pesoActual) })}>Anotar esta pesada</button>
          </div>
        )}
      </div>

      {/* ============ DIAGNÓSTICO ============ */}
      <div className="tarjeta">
        <h2>🩺 Diagnóstico razonado</h2>
        {ev.diagnostico.nEvidencias === 0 ? (
          <div className="vacio">
            Aún no hay evidencias. Analiza una foto y rellena el entorno para que el motor
            tenga con qué razonar.
          </div>
        ) : (
          <>
            {ev.diagnostico.principal.probabilidad < 0.2 ? (
              // Ninguna hipótesis destaca sobre el ruido de fondo: eso no es un
              // empate, es una planta sin problema. Presentar la primera de la
              // lista como "diagnóstico" sería inventarse una enfermedad.
              <div className="aviso ok">
                <b>No se detecta ningún problema.</b> Ninguna hipótesis supera el umbral sobre
                las {ev.diagnostico.nEvidencias} evidencias recogidas: las medidas están dentro
                de rango y el follaje no muestra daño significativo. Abajo queda el reparto
                residual, solo por transparencia.
              </div>
            ) : (
              <div className={`aviso ${ev.diagnostico.concluyente ? 'ok' : 'warn'}`}>
                {ev.diagnostico.concluyente
                  ? `Diagnóstico concluyente sobre ${ev.diagnostico.nEvidencias} evidencias independientes.`
                  : `No concluyente: las dos primeras hipótesis compiten. Con ${ev.diagnostico.nEvidencias} evidencias no basta para decidir.`}
              </div>
            )}

            {ev.diagnostico.ranking.slice(0, 5).map((h, i) => (
              <div key={h.id} className={`hip${i === 0 ? ' top' : ''}`}>
                <div className="cab">
                  <span>{h.nombre}</span>
                  <b>{Math.round(h.probabilidad * 100)} %</b>
                </div>
                <div className="barra-p"><i style={{ width: `${Math.max(2, h.probabilidad * 100)}%` }} /></div>
                {i === 0 && h.aFavor.length > 0 && (
                  <ul className="ev">
                    {h.aFavor.slice(0, 4).map((e, j) => <li key={j}>· {e.texto}</li>)}
                  </ul>
                )}
              </div>
            ))}

            {ev.diagnostico.siguientePrueba && (
              <div className="aviso" style={{ marginTop: 12 }}>
                <b>🔬 Siguiente medida útil:</b> {ev.diagnostico.siguientePrueba}
              </div>
            )}
          </>
        )}
      </div>

      {/* ============ PLAGAS ============ */}
      <div className="tarjeta">
        <h2>🐛 Riesgo de plagas (modelo de grados-día)</h2>
        {ev.plagas.slice(0, 4).map((p) => (
          <div key={p.id} className="hip">
            <div className="cab">
              <span>{p.nombre}</span>
              <b style={{ color: p.nivel === 'alto' ? 'var(--danger)' : p.nivel === 'medio' ? 'var(--warn)' : 'var(--muted)' }}>
                {p.nivel}
              </b>
            </div>
            <div className="barra-p"><i style={{ width: `${Math.max(2, p.riesgo * 100)}%` }} /></div>
            {p.riesgo > 0.33 && (
              <div className="ev">
                · {p.senal}<br />
                · Una generación cada ~{Math.round(p.diasGeneracion)} días a {entorno.tempC} °C.<br />
                · {p.accion}
              </div>
            )}
          </div>
        ))}
        <div className="aviso" style={{ marginTop: 8 }}>
          <b>Revisa el envés en {ev.revision.dias} días.</b> {ev.revision.motivo}
        </div>
      </div>

      {/* ============ NUTRICIÓN ============ */}
      <div className="tarjeta">
        <h2>🧪 Nutrición y química del agua</h2>
        <div className="medidas">
          <div className="medida">
            <div className="etq">Dosis de abono</div>
            <div className="val">{ev.nutricion.ml} <small>ml</small></div>
            <div className="pie">≈ {ev.nutricion.gotas} gotas en {ev.agua.dosisRiegoMl} ml</div>
          </div>
          <div className="medida">
            <div className="etq">Nitrógeno aportado</div>
            <div className="val">{Math.round(ev.nutricion.ppmN)} <small>ppm</small></div>
            <div className="pie">{ev.nutricion.fase.label}</div>
          </div>
          <div className={`medida ${ev.nutricion.ceVeredicto.estado === 'exceso' ? 'danger' : ev.nutricion.ceVeredicto.estado === 'alto' ? 'warn' : 'ok'}`}>
            <div className="etq">CE de riego</div>
            <div className="val">{ev.nutricion.ce.ce.toFixed(2)} <small>dS/m</small></div>
            <div className="pie">máx. especie {ev.especie.ceMax}</div>
          </div>
          <div className={`medida ${ev.nutricion.ph.ph > 7.2 ? 'warn' : 'ok'}`}>
            <div className="etq">pH del sustrato</div>
            <div className="val">{ev.nutricion.ph.ph.toFixed(1)}</div>
            <div className="pie">hierro al {Math.round(ev.nutricion.hierro.disponible * 100)} %</div>
          </div>
        </div>

        <div className="aviso" style={{ marginTop: 10 }}>{ev.nutricion.ceVeredicto.texto}</div>
        {ev.nutricion.ph.ph > 6.8 && <div className="aviso warn">{ev.nutricion.hierro.texto} {ev.nutricion.ph.texto}</div>}

        <div className="rejilla" style={{ marginTop: 10 }}>
          <label className="campo">
            <span>Fase de cultivo</span>
            <select value={planta.fase} onChange={(e) => set('fase', e.target.value)}>
              {FASES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <label className="campo">
            <span>Abono que usas</span>
            <select
              value={planta.abonoTipo}
              onChange={(e) => {
                const a = ABONOS_TIPO.find((x) => x.id === e.target.value)
                onCambiar({ ...planta, abonoTipo: e.target.value, npk: a?.npk ?? planta.npk })
              }}
            >
              {ABONOS_TIPO.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* ============ CRECIMIENTO ============ */}
      {crecimiento?.puntos?.length >= 2 && (
        <div className="tarjeta">
          <h2>📈 Curva de crecimiento</h2>
          <Sparkline puntos={crecimiento.puntos} />
          <div className={`aviso ${crecimiento.detenido ? 'warn' : 'ok'}`} style={{ marginTop: 8 }}>
            {crecimiento.texto}
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
            Se mide la superficie de follaje en cada foto guardada. Sirve para lo que ningún
            síntoma avisa a tiempo: una planta que ha dejado de crecer lleva semanas con un
            problema antes de que se le note en el color.
          </p>
        </div>
      )}

      {/* ============ AJUSTES DE LA FICHA ============ */}
      {panel === 'ajustes' && (
        <div className="tarjeta">
          <h2>⚙️ Ficha de la planta</h2>
          <div className="rejilla">
            <label className="campo">
              <span>Nombre</span>
              <input value={planta.nombre} onChange={(e) => set('nombre', e.target.value)} />
            </label>
            <label className="campo">
              <span>Especie</span>
              <select value={planta.especieId} onChange={(e) => set('especieId', e.target.value)}>
                {ESPECIES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Diámetro de la maceta (cm)</span>
              <input type="number" min="4" max="120" value={planta.diametroCm}
                onChange={(e) => set('diametroCm', Number(e.target.value))} />
            </label>
            <label className="campo">
              <span>Altura de la maceta (cm)</span>
              <input type="number" min="4" max="120" value={planta.alturaCm}
                onChange={(e) => set('alturaCm', Number(e.target.value))} />
            </label>
            <label className="campo">
              <span>Sustrato</span>
              <select value={planta.sustrato} onChange={(e) => set('sustrato', e.target.value)}>
                {SUSTRATOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Material de la maceta</span>
              <select value={planta.materialMaceta} onChange={(e) => set('materialMaceta', e.target.value)}>
                {MATERIALES_MACETA.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Distancia a la ventana (cm)</span>
              <input type="number" min="0" max="900" value={planta.distanciaVentanaCm}
                onChange={(e) => set('distanciaVentanaCm', Number(e.target.value))} />
            </label>
            <label className="campo">
              <span>Superficie de hoja declarada (cm², opcional)</span>
              <input type="number" min="0" value={planta.areaFoliarCm2 ?? ''} placeholder="se estima sola"
                onChange={(e) => set('areaFoliarCm2', Number(e.target.value) || null)} />
            </label>
          </div>

          <div className="acciones-fila">
            <button className={planta.sinAgujero ? 'activo' : ''} onClick={() => set('sinAgujero', !planta.sinAgujero)}>
              {planta.sinAgujero ? '✓ ' : ''}La maceta no tiene agujero
            </button>
            <button className={planta.platoConAgua ? 'activo' : ''} onClick={() => set('platoConAgua', !planta.platoConAgua)}>
              {planta.platoConAgua ? '✓ ' : ''}Suelo dejar agua en el plato
            </button>
          </div>

          <div className="aviso" style={{ marginTop: 12 }}>
            <b>{ev.especie.nombre}</b> — {ev.especie.notas}
            {ev.especie.toxica === true && <><br /><br />⚠️ <b>Tóxica para perros y gatos.</b> Colócala fuera de su alcance.</>}
            {ev.especie.toxica === false && <><br /><br />✅ No tóxica para perros ni gatos.</>}
          </div>

          <div className="acciones-fila">
            <button className="peligro" onClick={() => { if (confirm(`¿Borrar «${planta.nombre}» y todo su historial?`)) onBorrar(planta.id) }}>
              Borrar esta planta
            </button>
          </div>
        </div>
      )}

      {/* ============ CUADERNO ============ */}
      <div className="tarjeta">
        <h2>📔 Cuaderno de cultivo</h2>
        <div className="acciones-fila" style={{ marginTop: 0 }}>
          <input placeholder="Anotar algo…" value={nota} onChange={(e) => setNota(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && nota.trim()) { registrar('nota', { texto: nota.trim() }); setNota('') } }} />
          <button onClick={() => { if (nota.trim()) { registrar('nota', { texto: nota.trim() }); setNota('') } }}>Añadir</button>
        </div>

        {fotos.length > 0 && (
          <div className="miniaturas" style={{ marginTop: 12 }}>
            {fotos.map((f) => <img key={f.id} src={URL.createObjectURL(f.blob)} alt="Foto guardada" />)}
          </div>
        )}

        {hist.length === 0 ? (
          <p className="vacio">Sin anotaciones todavía.</p>
        ) : (
          <ul className="hist" style={{ marginTop: 10 }}>
            {hist.map((e) => (
              <li key={e.hash}>
                <span className="fecha">{new Date(e.ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span>
                  {EVENTOS[e.tipo]?.icono ?? '·'} {EVENTOS[e.tipo]?.label ?? e.tipo}
                  {e.datos?.ml ? ` — ${e.datos.ml} ml` : ''}
                  {e.datos?.g ? ` — ${e.datos.g} g` : ''}
                  {e.datos?.ppfd ? ` — ${e.datos.ppfd} µmol/m²s` : ''}
                  {e.datos?.texto ? ` — ${e.datos.texto}` : ''}
                </span>
                <span className="hash">{e.hash.slice(0, 8)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="metodo">
          Cada anotación lleva el hash SHA-256 de la anterior. El historial es solo-añadir y
          verificable: si algo se altera, la cadena deja de cuadrar. No es una manía — todo el
          diagnóstico se apoya en cuándo regaste y cuánto pesaba la maceta.
        </p>
      </div>
    </>
  )
}
