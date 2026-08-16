import { useMemo, useState } from 'react'
import { planPropagacion, hormonaUtil, METODOS } from './propagacion.js'

/**
 * Panel de propagación de una planta.
 *
 * La pregunta que responde no es "¿cómo se hace un esqueje?" —eso está en
 * cualquier vídeo— sino "¿me va a salir HOY, con la casa que tengo?". Y si la
 * respuesta es que no, cuándo sí y qué es exactamente lo que está frenando.
 */
export default function Propagacion({ planta, entorno, onCerrar }) {
  const [abierta, setAbierta] = useState(0)
  const plan = useMemo(() => planPropagacion({ planta, entorno }), [planta, entorno])

  if (plan.imposible) {
    return (
      <div className="tarjeta">
        <h2>🌱 Multiplicar «{planta.nombre}»</h2>
        <div className="aviso warn">
          <b>Esta especie no se propaga en casa.</b> {plan.ficha.nota}
        </div>
        <div className="acciones-fila">
          <button onClick={onCerrar}>← Volver</button>
        </div>
      </div>
    )
  }

  const color = (p) => (p > 0.65 ? 'var(--ok)' : p > 0.4 ? 'var(--warn)' : 'var(--danger)')

  return (
    <>
      <div className="tarjeta">
        <h2>🌱 Multiplicar «{planta.nombre}»</h2>

        <div className={`aviso ${plan.mejor.probabilidad > 0.6 ? 'ok' : 'warn'}`}>
          <b>
            {plan.mejor.probabilidad > 0.6
              ? `Buen momento: ${Math.round(plan.mejor.probabilidad * 100)} % de éxito con ${plan.mejor.metodo.label.toLowerCase()}.`
              : `Momento regular: ${Math.round(plan.mejor.probabilidad * 100)} % de éxito en el mejor de los casos.`}
          </b>
          <br />
          Lo que más está frenando ahora mismo es <b>{plan.mejor.cuelloBotella.nombre.toLowerCase()}</b>:{' '}
          {plan.mejor.cuelloBotella.texto}.
        </div>

        <div className="aviso">{plan.ficha.nota}</div>
      </div>

      {plan.opciones.map((o, i) => {
        const esta = abierta === i
        const horm = hormonaUtil(o.metodoId, planta.especieId)
        const cal = o.calendario
        return (
          <div key={o.metodoId} className="tarjeta">
            <button
              className="planta-fila"
              style={{ marginBottom: esta ? 12 : 0 }}
              onClick={() => setAbierta(esta ? -1 : i)}
            >
              <div className="avatar">{i === 0 ? '⭐' : '🌿'}</div>
              <div>
                <div className="nombre">{o.metodo.label}</div>
                <div className="especie">
                  {o.metodo.dificultad} · raíces en {o.dias[0]}–{o.dias[1]} días
                </div>
              </div>
              <div className="estado">
                <b style={{ fontSize: 17, color: color(o.probabilidad) }}>
                  {Math.round(o.probabilidad * 100)} %
                </b>
                <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 2 }}>
                  {esta ? 'ocultar' : 'ver cómo'}
                </div>
              </div>
            </button>

            {esta && (
              <>
                <h3>Cómo se hace</h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: '0 0 10px' }}>{o.metodo.comoSe}</p>
                <div className="aviso">{o.metodo.pega}</div>

                <h3>Qué está frenando</h3>
                {o.factores.map((f) => (
                  <div key={f.nombre} className="hip">
                    <div className="cab">
                      <span>{f.nombre}</span>
                      <b style={{ color: color(f.valor) }}>{Math.round(f.valor * 100)} %</b>
                    </div>
                    <div className="barra-p"><i style={{ width: `${Math.max(2, f.valor * 100)}%`, background: color(f.valor) }} /></div>
                    <div className="ev">{f.texto}</div>
                  </div>
                ))}

                <h3>Mejor momento del año</h3>
                {/* Doce barras: de un vistazo se ve si conviene esperar. */}
                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 70, marginBottom: 6 }}>
                  {cal.meses.map((m, j) => (
                    <div key={j} style={{ flex: 1, textAlign: 'center' }}>
                      <div
                        title={`${m.etiqueta}: ${Math.round(m.probabilidad * 100)} %`}
                        style={{
                          height: `${Math.max(3, m.probabilidad * 56)}px`,
                          background: m.esAhora ? 'var(--brand)' : color(m.probabilidad),
                          opacity: m.esAhora ? 1 : 0.55,
                          borderRadius: 3,
                        }}
                      />
                      <div style={{ fontSize: 9.5, color: m.esAhora ? 'var(--brand)' : 'var(--muted)', marginTop: 3 }}>
                        {m.etiqueta.replace('.', '')}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`aviso ${cal.mereceEsperar ? 'warn' : 'ok'}`}>
                  {cal.mereceEsperar ? (
                    <>
                      <b>Merece la pena esperar.</b> En{' '}
                      {cal.mejor.fecha.toLocaleDateString('es-ES', { month: 'long' })} la probabilidad sube al{' '}
                      {Math.round(cal.mejor.probabilidad * 100)} % frente al {Math.round(cal.ahora.probabilidad * 100)} % de ahora.
                    </>
                  ) : (
                    <>
                      <b>Adelante, no ganas nada esperando.</b> El mejor mes del año da un{' '}
                      {Math.round(cal.mejor.probabilidad * 100)} % y ahora estás en{' '}
                      {Math.round(cal.ahora.probabilidad * 100)} %.
                    </>
                  )}
                </div>

                <div className={`aviso ${horm.util ? 'ok' : ''}`}>
                  <b>{horm.util ? '✅' : '🚫'} Hormona de enraizado:</b> {horm.texto}
                </div>
              </>
            )}
          </div>
        )
      })}

      <div className="tarjeta">
        <div className="metodo" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
          Las probabilidades salen de un modelo con base fisiológica —temperatura de enraizado,
          humedad frente a la pérdida de agua de una hoja sin raíces, y reservas de la planta
          madre según la estación de tu latitud—, no de estadísticas de esquejes reales. Sirven
          para comparar métodos y momentos entre sí, que es para lo que se necesitan; no son una
          garantía. Y haz siempre más esquejes de los que quieres: sobran gratis.
        </div>
      </div>

      <div className="acciones-fila">
        <button onClick={onCerrar}>← Volver</button>
      </div>
    </>
  )
}
