import { useMemo, useState } from 'react'
import { planVacaciones, instruccionesCuidador, hojaCuidadorHTML, MEDIDAS } from './vacaciones.js'

/**
 * Modo vacaciones: cuántos días aguanta cada planta y qué hacer antes de irse.
 *
 * El orden de la pantalla es deliberado: primero el veredicto, después las
 * medidas gratis (que casi siempre bastan) y solo al final el riego por mecha o
 * pedirle el favor a alguien. Mucha gente empieza por el favor sin saber que
 * bajando las persianas se ahorra la llamada.
 */
export default function Vacaciones({ plantas, entorno, onCerrar }) {
  const [dias, setDias] = useState(14)
  const [medidas, setMedidas] = useState(['persianas', 'agrupar'])
  const [salida, setSalida] = useState(() => new Date().toISOString().slice(0, 10))

  const plan = useMemo(
    () => planVacaciones({ plantas, entorno, dias: Number(dias) || 1, medidas }),
    [plantas, entorno, dias, medidas]
  )

  const fechaSalida = useMemo(() => {
    const d = new Date(salida)
    return isNaN(d) ? new Date() : d
  }, [salida])

  const instrucciones = useMemo(
    () => instruccionesCuidador(plan, fechaSalida),
    [plan, fechaSalida]
  )

  const alternar = (id) =>
    setMedidas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))

  function imprimir() {
    const html = hojaCuidadorHTML(plan, instrucciones, fechaSalida)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
  }

  return (
    <>
      <div className="tarjeta">
        <h2>🧳 Me voy de viaje</h2>

        <div className="rejilla">
          <label className="campo">
            <span>Días fuera</span>
            <input type="number" min="1" max="120" value={dias}
              onChange={(e) => setDias(e.target.value)} />
          </label>
          <label className="campo">
            <span>Fecha de salida</span>
            <input type="date" value={salida} onChange={(e) => setSalida(e.target.value)} />
          </label>
        </div>

        {plantas.length === 0 ? (
          <p className="vacio">Añade plantas para calcular el plan.</p>
        ) : (
          <div className={`aviso ${plan.veredicto.tono}`}>
            <b>{plan.veredicto.titulo}</b><br />{plan.veredicto.texto}
          </div>
        )}
      </div>

      {plantas.length > 0 && (
        <>
          {/* Las medidas gratis van antes que cualquier otra cosa, porque
              suelen resolver el problema entero. */}
          <div className="tarjeta">
            <h2>Antes de salir — medidas que no cuestan nada</h2>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 0 }}>
              La transpiración es luz × sequedad del aire. Las dos cosas se pueden bajar
              antes de cerrar la puerta, y con eso suele bastar.
            </p>

            {Object.values(MEDIDAS).map((m) => {
              const activa = medidas.includes(m.id)
              // Se enseña el efecto sobre la planta más apurada, que es la que
              // decide si hace falta llamar a alguien.
              const peor = plan.fichas[0]
              const efecto = peor?.efectos.find((e) => e.id === m.id)
              return (
                <div key={m.id} className={`accion ${activa ? 'p5' : ''}`} style={{ cursor: 'pointer' }}
                  onClick={() => alternar(m.id)}>
                  <div className="ico">{activa ? '✅' : '⬜'}</div>
                  <div style={{ flex: 1 }}>
                    <div className="titulo">
                      {m.label}
                      {efecto && efecto.diasExtra > 0.4 && (
                        <span style={{ color: 'var(--brand)', fontWeight: 700 }}>
                          {' '}+{efecto.diasExtra.toFixed(1)} días
                        </span>
                      )}
                    </div>
                    <div className="detalle">{m.explicacion}</div>
                    {efecto && efecto.factor > 1.1 && (
                      <div className="porque">
                        En «{peor.planta.nombre}», la más apurada: multiplica su
                        autonomía por {efecto.factor.toFixed(1)}.
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Planta por planta, la más apurada primero. */}
          <div className="tarjeta">
            <h2>Planta por planta</h2>
            {plan.fichas.map((f) => (
              <div key={f.planta.id} className={`accion ${f.llega ? (f.comodo ? 'p5' : 'p2') : 'p1'}`}>
                <div className="ico">{f.llega ? (f.comodo ? '✅' : '😐') : '⚠️'}</div>
                <div style={{ flex: 1 }}>
                  <div className="titulo">
                    {f.planta.nombre}
                    <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 13 }}>
                      {' '}· {f.especie.nombre}
                    </span>
                  </div>
                  <div className="detalle">
                    Aguanta <b>{f.conMedidas.diasSupervivencia.toFixed(0)} días</b> desde un riego
                    a fondo{' '}
                    {f.conMedidas.diasComodo < f.conMedidas.diasSupervivencia * 0.95 && (
                      <>(cómoda hasta el día {f.conMedidas.diasComodo.toFixed(0)})</>
                    )}
                    .{' '}
                    {f.llega
                      ? f.comodo
                        ? 'Riega a fondo el día de salida y ya está.'
                        : 'Llega, pero justa: puede perder alguna hoja baja.'
                      : `No llega a ${plan.dias} días. Necesita mecha o que alguien pase el día ${f.diaVisita}.`}
                  </div>
                  <div className="porque">
                    {f.conMedidas.consumoMlDia.toFixed(0)} ml/día en las condiciones del viaje ·
                    riego de salida {f.conMedidas.dosisRiegoMl} ml ·
                    depósito de mecha para todo el viaje: {f.depositoMl} ml
                    {medidas.length > 0 && f.sinMedidas.diasSupervivencia < f.conMedidas.diasSupervivencia && (
                      <> · sin las medidas aguantaría solo {f.sinMedidas.diasSupervivencia.toFixed(0)} días</>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* El favor, al final y con instrucciones exactas. */}
          <div className="tarjeta">
            <h2>📋 Hoja para quien venga a regar</h2>
            <div className="aviso">
              «Riégame las plantas» mata más plantas que las vacaciones: quien viene riega
              todas por igual, con cariño y de más. Con cantidades exactas y fechas concretas,
              el favor deja de ser un riesgo.
            </div>

            {instrucciones.visitas.length === 0 ? (
              <div className="aviso ok">
                <b>No hace falta que venga nadie.</b> Todas aguantan el viaje entero con un
                riego a fondo el día de salida.
              </div>
            ) : (
              instrucciones.visitas.map((v) => (
                <div key={v.dia} style={{ marginBottom: 12 }}>
                  <h3 style={{ textTransform: 'capitalize', marginBottom: 6 }}>
                    {v.fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}> · día {v.dia}</span>
                  </h3>
                  {v.plantas.map((p, i) => (
                    <div key={i} className="planta-fila" style={{ cursor: 'default' }}>
                      <div className="avatar">💧</div>
                      <div>
                        <div className="nombre">{p.nombre}</div>
                        <div className="especie">{p.especie}</div>
                      </div>
                      <div className="estado">
                        <b style={{ fontSize: 16, color: 'var(--agua)' }}>{p.ml} ml</b>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}

            {instrucciones.noTocar.length > 0 && (
              <div className="aviso ok">
                <b>Estas NO se riegan:</b>{' '}
                {instrucciones.noTocar.map((p) => p.nombre).join(', ')}. Tienen agua para todo
                el viaje y regarlas les haría daño.
              </div>
            )}

            <div className="acciones-fila">
              <button className="primario" onClick={imprimir}>🖨️ Imprimir hoja para la nevera</button>
            </div>
          </div>
        </>
      )}

      <div className="acciones-fila">
        <button onClick={onCerrar}>← Volver</button>
      </div>
    </>
  )
}
