import { useMemo, useState } from 'react'
import { porId } from './species.js'
import {
  revisarCasa, consultar, emergencia, NIVELES, ALTERNATIVAS, RECURSOS, TOXICIDAD,
} from './toxicity.js'

/**
 * Revisión de toxicidad de la casa entera.
 *
 * La pregunta útil no es "¿es tóxica esta planta?" sino "¿qué tengo yo en casa
 * que pueda matar a mi gato?". Por eso el panel arranca por el veredicto del
 * conjunto y ordena de peor a mejor, en vez de obligar a mirar planta a planta.
 */
export default function Mascotas({ plantas, onVerPlanta, onCerrar }) {
  const [animal, setAnimal] = useState('gato')
  const [abierta, setAbierta] = useState(null)

  const revision = useMemo(() => revisarCasa(plantas, animal), [plantas, animal])

  return (
    <>
      <div className="tarjeta">
        <h2>🐈 Plantas y mascotas</h2>

        <div className="acciones-fila" style={{ marginTop: 0, marginBottom: 12 }}>
          <button className={animal === 'gato' ? 'activo' : ''} onClick={() => setAnimal('gato')}>🐈 Gato</button>
          <button className={animal === 'perro' ? 'activo' : ''} onClick={() => setAnimal('perro')}>🐕 Perro</button>
        </div>

        {plantas.length === 0 ? (
          <p className="vacio">Añade plantas y aquí verás el riesgo de cada una.</p>
        ) : (
          <>
            <div className={`aviso ${revision.veredicto.tono === 'muted' ? '' : revision.veredicto.tono}`}>
              <b>{revision.veredicto.titulo}</b>
              <br />{revision.veredicto.texto}
            </div>

            {revision.fichas.map((f) => {
              const especie = porId(f.planta.especieId)
              const alt = ALTERNATIVAS[f.planta.especieId]
              const esta = abierta === f.planta.id
              return (
                <div key={f.planta.id} style={{ marginBottom: 9 }}>
                  <button
                    className="planta-fila"
                    onClick={() => setAbierta(esta ? null : f.planta.id)}
                    style={{ marginBottom: 0 }}
                  >
                    <div className="avatar">{f.icono}</div>
                    <div>
                      <div className="nombre">{f.planta.nombre}</div>
                      <div className="especie">{especie.nombre}</div>
                    </div>
                    <div className="estado">
                      <div style={{ color: f.tono === 'danger' ? 'var(--danger)' : f.tono === 'warn' ? 'var(--warn)' : f.tono === 'ok' ? 'var(--ok)' : 'var(--muted)' }}>
                        {f.label}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 2 }}>
                        {esta ? 'ocultar' : 'ver detalle'}
                      </div>
                    </div>
                  </button>

                  {esta && (
                    <div className="tarjeta" style={{ marginTop: 6, marginBottom: 0, background: 'var(--bg2)' }}>
                      {f.principio && (
                        <>
                          <h3 style={{ marginTop: 0 }}>{f.principio.nombre}</h3>
                          <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: '0 0 8px' }}>{f.principio.mecanismo}</p>
                          <div className="medidas">
                            <div className="medida">
                              <div className="etq">Qué se ve</div>
                              <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>{f.principio.signos}</div>
                            </div>
                            <div className="medida">
                              <div className="etq">Cuándo aparece</div>
                              <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>{f.principio.inicio}</div>
                            </div>
                          </div>
                        </>
                      )}

                      {f.nota && <div className="aviso" style={{ marginTop: 10 }}>{f.nota}</div>}

                      {f.nivel !== 'no_toxica' && (
                        <Emergencia nivel={f.nivel} principio={f.principio?.id} />
                      )}

                      {alt && (
                        <div className="aviso ok" style={{ marginTop: 10 }}>
                          <b>🔄 Alternativa segura: {porId(alt.id).nombre}.</b> {alt.porque}
                        </div>
                      )}

                      {onVerPlanta && (
                        <div className="acciones-fila">
                          <button className="pequeno" onClick={() => onVerPlanta(f.planta.id)}>Ver ficha de la planta</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Buscador: sirve para consultar ANTES de comprar, que es cuando de
          verdad se evita el problema. */}
      <Consultor animal={animal} />

      <div className="tarjeta">
        <h2>📞 Si ya se la ha comido</h2>
        {RECURSOS.map((r, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{r.detalle}</div>
          </div>
        ))}
        <div className="metodo">
          Datos basados en la base de plantas tóxicas de la ASPCA, la UC Davis School of
          Veterinary Medicine y MSPCA-Angell. Esto es orientación para reaccionar deprisa,
          no un diagnóstico: ante una ingestión real, la primera llamada es al veterinario.
          Que una especie no aparezca aquí no significa que sea inofensiva.
        </div>
      </div>

      <div className="acciones-fila">
        <button onClick={onCerrar}>← Volver</button>
      </div>
    </>
  )
}

function Emergencia({ nivel, principio }) {
  const e = emergencia(nivel, principio)
  const tono = e.urgencia === 'inmediata' ? 'danger' : e.urgencia === 'alta' ? 'warn' : ''
  return (
    <div className={`aviso ${tono}`} style={{ marginTop: 10 }}>
      <b>{e.urgencia === 'inmediata' ? '🚨 ' : ''}{e.titulo}</b>
      <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.55 }}>
        {e.pasos.map((p, i) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}
      </ul>
    </div>
  )
}

/** Consulta rápida de cualquier especie de la base, se tenga o no en casa. */
function Consultor({ animal }) {
  const [q, setQ] = useState('')
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase()
    return Object.keys(TOXICIDAD)
      .map((id) => ({ id, especie: porId(id), ...consultar(id, animal) }))
      .filter((x) => x.especie.id === x.id) // descarta ids sin ficha de especie
      .filter((x) =>
        !t ||
        x.especie.nombre.toLowerCase().includes(t) ||
        x.especie.cientifico.toLowerCase().includes(t) ||
        x.especie.sinonimos.some((s) => s.toLowerCase().includes(t)))
      .sort((a, b) => NIVELES[b.nivel].orden - NIVELES[a.nivel].orden)
  }, [q, animal])

  return (
    <div className="tarjeta">
      <h2>🔎 Consultar antes de comprar</h2>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 0 }}>
        El momento de evitar el susto es en el vivero, no en casa.
      </p>
      <label className="campo">
        <span>Buscar especie</span>
        <input placeholder="lirio, potos, monstera…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        {lista.map((x) => (
          <div key={x.id} className="hip" style={{ marginBottom: 8 }}>
            <div className="cab">
              <span>{x.icono} {x.especie.nombre} <i style={{ color: 'var(--muted)', fontSize: 11.5 }}>{x.especie.cientifico}</i></span>
              <b style={{
                color: x.tono === 'danger' ? 'var(--danger)' : x.tono === 'warn' ? 'var(--warn)' : x.tono === 'ok' ? 'var(--ok)' : 'var(--muted)',
                fontSize: 12,
              }}>{x.label}</b>
            </div>
          </div>
        ))}
        {!lista.length && <p className="vacio">Sin coincidencias en la base.</p>}
      </div>
    </div>
  )
}
