import { useRef, useState } from 'react'
import {
  identificarPlantNet, identificarLocal, explicarError,
  PREGUNTAS_CLAVE, ORGANOS, getApiKey, setApiKey,
} from './identify.js'
import { filtrar } from './species.js'
import { anotar } from './journal.js'

/**
 * Identificación por tres caminos, y ninguno bloquea a los otros:
 *   · Pl@ntNet (mejor precisión, necesita clave gratuita y conexión)
 *   · Clave dicotómica local (sin conexión, acierta el perfil de cuidados)
 *   · Búsqueda manual por nombre (la más rápida si ya sabes qué tienes)
 */
export default function Identificar({ onElegir, onCerrar }) {
  const [modo, setModo] = useState('foto')
  const [clave, setClave] = useState(getApiKey())
  const [imagenes, setImagenes] = useState([])
  const [organos, setOrganos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [resultados, setResultados] = useState(null)
  const [error, setError] = useState(null)
  const [respuestas, setRespuestas] = useState({})
  const [busqueda, setBusqueda] = useState('')
  const inputRef = useRef(null)

  function anadirFotos(files) {
    const nuevas = [...files].slice(0, 5 - imagenes.length)
    setImagenes((prev) => [...prev, ...nuevas.map((f) => ({ blob: f, url: URL.createObjectURL(f) }))])
    setOrganos((prev) => [...prev, ...nuevas.map(() => 'auto')])
  }

  async function lanzar() {
    setCargando(true)
    setError(null)
    setResultados(null)
    try {
      const r = await identificarPlantNet(imagenes.map((i) => i.blob), organos, { apiKey: clave })
      setResultados(r)
    } catch (e) {
      setError(explicarError(e))
    } finally {
      setCargando(false)
    }
  }

  function elegir(especie, procedencia, extra = {}) {
    onElegir?.(especie, { procedencia, ...extra })
  }

  const localCandidatos = Object.keys(respuestas).length >= 2 ? identificarLocal(respuestas) : null

  return (
    <div className="tarjeta">
      <h2>🔍 ¿Qué planta es?</h2>

      <div className="acciones-fila" style={{ marginTop: 0, marginBottom: 12 }}>
        <button className={modo === 'foto' ? 'activo' : ''} onClick={() => setModo('foto')}>Por foto</button>
        <button className={modo === 'clave' ? 'activo' : ''} onClick={() => setModo('clave')}>Sin conexión</button>
        <button className={modo === 'nombre' ? 'activo' : ''} onClick={() => setModo('nombre')}>Por nombre</button>
      </div>

      {/* ---------------- Por foto (Pl@ntNet) ---------------- */}
      {modo === 'foto' && (
        <>
          <label className="campo">
            <span>Clave de Pl@ntNet — gratuita, 500 identificaciones al día, se guarda solo aquí</span>
            <input
              type="password"
              placeholder="Pégala aquí (my.plantnet.org)"
              value={clave}
              onChange={(e) => { setClave(e.target.value); setApiKey(e.target.value) }}
            />
          </label>

          <div className="soltar" onClick={() => inputRef.current?.click()}>
            <span className="grande">📸</span>
            <b>Añade hasta 5 fotos del mismo ejemplar</b>
            <div style={{ marginTop: 6 }}>
              Una de hoja aislada sobre fondo liso + otra de la planta entera es la combinación
              que más acierta.
            </div>
          </div>
          <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={(e) => anadirFotos(e.target.files)} />

          {imagenes.length > 0 && (
            <>
              <div className="miniaturas">
                {imagenes.map((im, i) => (
                  <div key={i}>
                    <img src={im.url} alt={`Foto ${i + 1}`} />
                    <select
                      className="pequeno"
                      style={{ width: 74, fontSize: 10, minHeight: 26, marginTop: 3 }}
                      value={organos[i]}
                      onChange={(e) => setOrganos((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
                    >
                      {ORGANOS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="acciones-fila">
                <button className="primario" onClick={lanzar} disabled={cargando}>
                  {cargando ? 'Consultando…' : 'Identificar'}
                </button>
                <button onClick={() => { setImagenes([]); setOrganos([]); setResultados(null) }}>Limpiar</button>
              </div>
            </>
          )}

          {error && (
            <div className="aviso warn" style={{ marginTop: 10 }}>
              {error}
              <div style={{ marginTop: 8 }}>
                <button className="pequeno" onClick={() => setModo('clave')}>Usar la clave local sin conexión</button>
              </div>
            </div>
          )}

          {resultados && (
            <>
              <h3>Resultados</h3>
              {resultados.peticionesRestantes != null && (
                <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  Te quedan {resultados.peticionesRestantes} identificaciones hoy.
                </p>
              )}
              {resultados.resultados.map((r, i) => (
                <div key={i} className="planta-fila" onClick={() => elegir(r.perfilLocal, 'plantnet', { cientifico: r.cientifico, score: r.score })}>
                  <div className="avatar">{i === 0 ? '🥇' : '🌿'}</div>
                  <div>
                    <div className="nombre">{r.comunes[0] ?? r.cientifico}</div>
                    <div className="especie">{r.cientifico} · {r.familia}</div>
                    {r.perfilLocal ? (
                      <div style={{ fontSize: 11.5, color: 'var(--brand)', marginTop: 2 }}>
                        Perfil de cuidados disponible ({r.ajusteLocal})
                      </div>
                    ) : (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                        Sin perfil propio: se usará el genérico, ajustable a mano
                      </div>
                    )}
                  </div>
                  <div className="estado"><b>{Math.round(r.score * 100)} %</b></div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* ---------------- Clave dicotómica local ---------------- */}
      {modo === 'clave' && (
        <>
          <div className="aviso ok">
            Funciona sin conexión y sin clave. No busca el nombre exacto, busca el
            <b> perfil fisiológico</b>, que es lo que determina el riego y la luz: acertar que
            es una suculenta vale más para cuidarla que saber si es <i>Echeveria elegans</i> o
            <i> Echeveria agavoides</i>.
          </div>

          {PREGUNTAS_CLAVE.map((p) => (
            <div key={p.id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, marginBottom: 6 }}>{p.pregunta}</div>
              <div className="acciones-fila" style={{ marginTop: 0 }}>
                {p.opciones.map((o) => (
                  <button
                    key={o.id}
                    className={respuestas[p.id] === o.id ? 'activo pequeno' : 'pequeno'}
                    onClick={() => setRespuestas((r) => ({ ...r, [p.id]: o.id }))}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {localCandidatos && (
            <>
              <h3>Lo que más encaja</h3>
              {localCandidatos.map((c) => (
                <div key={c.especie.id} className="planta-fila" onClick={() => elegir(c.especie, 'clave local')}>
                  <div className="avatar">🌱</div>
                  <div>
                    <div className="nombre">{c.especie.nombre}</div>
                    <div className="especie">{c.especie.cientifico}</div>
                  </div>
                  <div className="estado"><b>{Math.round(c.encaje * 100)} %</b></div>
                </div>
              ))}
              <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                Si ninguna encaja, elige la más parecida en tipo (suculenta, helecho, aroide…):
                los cálculos ya serán correctos aunque el nombre no lo sea.
              </p>
            </>
          )}
        </>
      )}

      {/* ---------------- Por nombre ---------------- */}
      {modo === 'nombre' && (
        <>
          <label className="campo">
            <span>Nombre común, científico o familia</span>
            <input autoFocus placeholder="potos, monstera, Ficus, helecho…" value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} />
          </label>
          {filtrar(busqueda).slice(0, 12).map((e) => (
            <div key={e.id} className="planta-fila" onClick={() => elegir(e, 'manual')}>
              <div className="avatar">🌿</div>
              <div>
                <div className="nombre">{e.nombre}</div>
                <div className="especie">{e.cientifico} · {e.tipo}</div>
              </div>
              <div className="estado" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                DLI {e.dli.min}–{e.dli.max}
              </div>
            </div>
          ))}
        </>
      )}

      <div className="acciones-fila">
        <button onClick={onCerrar}>Cerrar</button>
      </div>

      <div className="metodo">
        Pl@ntNet es el proyecto de identificación colaborativa del CIRAD, INRA, INRIA e IRD.
        Las fotos que envíes a identificar salen del dispositivo hacia su API; todo lo demás
        (luz, agua, diagnóstico) se calcula aquí sin enviar nada.
      </div>
    </div>
  )
}
