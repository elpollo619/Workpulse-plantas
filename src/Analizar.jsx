import { useRef, useState } from 'react'
import { readExif, hasExposure, exifDate } from './exif.js'
import { cargarImagen, aImageData, analizarHoja, reflectanciaSustrato, humedadPorColor } from './photometry.js'
import { luminanciaMedia, recorte, medirLuz, REFERENCIAS, FUENTES } from './lightmeter.js'
import { guardarFoto } from './photostore.js'
import { anotar } from './journal.js'

/**
 * Panel de análisis de foto: de una imagen salen a la vez la medida de luz
 * (por EXIF) y las métricas foliares (por colorimetría). Las dos cosas en una
 * sola foto, que es lo que hace que la app sea usable de verdad — nadie va a
 * hacer tres rituales distintos para regar un potos.
 */
export default function Analizar({ planta, entorno, onResultado, onCerrar }) {
  const [imagen, setImagen] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [res, setRes] = useState(null)
  const [error, setError] = useState(null)
  const [referencia, setReferencia] = useState('escena')
  const [horasArtificial, setHorasArtificial] = useState(0)
  const [arrastrando, setArrastrando] = useState(false)
  const inputRef = useRef(null)

  async function procesar(blob, refId = referencia) {
    setAnalizando(true)
    setError(null)
    try {
      const exif = await readExif(blob)
      const img = await cargarImagen(blob)
      const datos = aImageData(img, 320)

      const metricas = analizarHoja(datos)
      const yMedia = luminanciaMedia(datos)
      const rec = recorte(datos)
      const medida = medirLuz(exif, yMedia, {
        referencia: refId,
        fuente: entorno.fuenteLuz,
        recorte: rec,
      })
      const sustrato = reflectanciaSustrato(datos, exif)
      const humedad = humedadPorColor(sustrato, planta.calibracionSustrato)

      setImagen({ blob, url: URL.createObjectURL(blob) })
      setRes({ exif, metricas, medida, sustrato, humedad, rec, fecha: exifDate(exif) })
    } catch (e) {
      setError(e.message ?? 'No se pudo analizar la imagen')
    } finally {
      setAnalizando(false)
    }
  }

  function elegir(files) {
    const f = files?.[0]
    if (f) procesar(f)
  }

  async function guardar() {
    if (!res || !imagen) return
    await guardarFoto({
      plantaId: planta.id,
      blob: imagen.blob,
      metricas: res.metricas,
      exif: res.exif,
      ts: res.fecha?.getTime() ?? Date.now(),
    })
    await anotar(planta.id, 'foto', {
      clorosis: res.metricas.valido ? +res.metricas.fraccionClorosis.toFixed(3) : null,
      necrosis: res.metricas.valido ? +res.metricas.fraccionNecrosis.toFixed(3) : null,
      dgci: res.metricas.valido ? +res.metricas.dgci.toFixed(3) : null,
      cobertura: res.metricas.valido ? +res.metricas.coberturaHoja.toFixed(4) : null,
    })
    if (res.medida) {
      await anotar(planta.id, 'luz', {
        ppfd: Math.round(res.medida.ppfd),
        lux: Math.round(res.medida.lux),
        referencia: res.medida.referencia.id,
        fiabilidad: res.medida.fiabilidad,
      })
    }
    onResultado?.({
      metricasFoto: res.metricas.valido ? res.metricas : null,
      medidaLuz: res.medida ? { ...res.medida, horasArtificial: Number(horasArtificial) || 0 } : null,
      humedadPorColor: res.humedad,
      sustratoRef: res.sustrato,
    })
  }

  const m = res?.metricas
  const luz = res?.medida

  return (
    <div className="tarjeta">
      <h2>📷 Analizar una foto</h2>

      {!res && (
        <>
          <div
            className={`soltar${arrastrando ? ' activa' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files) }}
          >
            <span className="grande">🌿</span>
            <b>Haz una foto o suéltala aquí</b>
            <div style={{ marginTop: 6 }}>
              La misma foto sirve para medir la luz y leer el estado de la hoja.
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => elegir(e.target.files)}
          />

          <div className="aviso" style={{ marginTop: 12 }}>
            <b>Para que la medida de luz valga:</b> usa la cámara del móvil (no una captura
            ni una foto reenviada por mensajería, que pierden los datos EXIF de exposición),
            no uses flash y no dispares contra el sol. Lo más preciso es fotografiar un
            folio blanco puesto donde vive la planta.
          </div>
        </>
      )}

      {analizando && <p className="vacio">Analizando…</p>}
      {error && <div className="aviso danger">{error}</div>}

      {res && (
        <>
          <div className="miniaturas">
            <img src={imagen.url} alt="Foto analizada" style={{ width: 110, height: 110 }} />
          </div>

          {/* ---------- Luz ---------- */}
          <h3>☀️ Luz medida</h3>
          {!hasExposure(res.exif) ? (
            <div className="aviso warn">
              Esta foto no lleva los datos de exposición (ISO, apertura, tiempo), así que no
              se puede medir la luz con ella. Suele pasar con capturas de pantalla, fotos de
              WhatsApp o imágenes descargadas. Haz una foto directamente con la cámara.
              <br /><br />
              El análisis de la hoja sí funciona igualmente.
            </div>
          ) : (
            <>
              <label className="campo">
                <span>¿Qué había en el encuadre? Determina la precisión</span>
                <select value={referencia} onChange={(e) => { setReferencia(e.target.value); procesar(imagen.blob, e.target.value) }}>
                  {REFERENCIAS.map((r) => <option key={r.id} value={r.id}>{r.label} (±{Math.round((r.sigma / r.rho) * 100)} %)</option>)}
                </select>
              </label>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4 }}>
                {REFERENCIAS.find((r) => r.id === referencia)?.ayuda}
              </p>

              <div className="medidas" style={{ marginTop: 10 }}>
                <div className="medida">
                  <div className="etq">Iluminancia</div>
                  <div className="val">{Math.round(luz.lux).toLocaleString('es-ES')} <small>lx</small></div>
                  <div className="pie">± {Math.round(luz.incertidumbreLux * 100)} %</div>
                </div>
                <div className="medida">
                  <div className="etq">PPFD</div>
                  {/* En penumbra el PPFD baja de 1 µmol; redondear a entero
                      mostraría "0" y parecería un fallo en vez de un dato. */}
                  <div className="val">{luz.ppfd < 10 ? luz.ppfd.toFixed(1) : Math.round(luz.ppfd)} <small>µmol/m²s</small></div>
                  <div className="pie">fuente: {FUENTES.find((f) => f.id === entorno.fuenteLuz)?.label}</div>
                </div>
                <div className="medida">
                  <div className="etq">EV₁₀₀</div>
                  <div className="val">{luz.ev100.toFixed(1)}</div>
                  <div className="pie">f/{luz.exposicion.N} · 1/{Math.round(1 / luz.exposicion.t)}s · ISO {luz.exposicion.S}</div>
                </div>
                <div className="medida">
                  <div className="etq">Fiabilidad</div>
                  <div className="val"><span className={`fiab ${luz.fiabilidad}`}>{luz.fiabilidad}</span></div>
                  <div className="pie">± {Math.round(luz.incertidumbrePpfd * 100)} % en PPFD</div>
                </div>
              </div>

              {luz.avisos.map((a, i) => <div key={i} className="aviso warn" style={{ marginTop: 8 }}>{a}</div>)}

              <label className="campo" style={{ marginTop: 10 }}>
                <span>Horas extra de lámpara de cultivo al día (si tiene)</span>
                <input type="number" min="0" max="18" step="0.5" value={horasArtificial}
                  onChange={(e) => setHorasArtificial(e.target.value)} />
              </label>
            </>
          )}

          {/* ---------- Hoja ---------- */}
          <h3>🍃 Estado del follaje</h3>
          {!m?.valido ? (
            <div className="aviso warn">{m?.motivo ?? 'No se pudo leer el follaje.'}</div>
          ) : (
            <>
              <div className="medidas">
                <div className={`medida ${m.fraccionSana > 0.85 ? 'ok' : m.fraccionSana > 0.65 ? 'warn' : 'danger'}`}>
                  <div className="etq">Tejido sano</div>
                  <div className="val">{Math.round(m.fraccionSana * 100)} <small>%</small></div>
                </div>
                <div className={`medida ${m.fraccionClorosis > 0.2 ? 'warn' : ''}`}>
                  <div className="etq">Amarilleo</div>
                  <div className="val">{Math.round(m.fraccionClorosis * 100)} <small>%</small></div>
                  <div className="pie">{m.internervial > 0.3 ? 'entre nervios' : 'uniforme'}</div>
                </div>
                <div className={`medida ${m.fraccionNecrosis > 0.1 ? 'danger' : ''}`}>
                  <div className="etq">Tejido muerto</div>
                  <div className="val">{Math.round(m.fraccionNecrosis * 100)} <small>%</small></div>
                  <div className="pie">{m.sesgoMarginal > 0.1 ? 'en el borde' : 'repartido'}</div>
                </div>
                <div className="medida">
                  <div className="etq">Verdor (DGCI)</div>
                  <div className="val">{m.dgci.toFixed(2)}</div>
                  <div className="pie">clorofila relativa</div>
                </div>
              </div>

              {m.moteado > 0.18 && (
                <div className="aviso warn" style={{ marginTop: 8 }}>
                  Punteado fino detectado en el {Math.round(m.moteado * 100)} % del follaje. Mira el
                  envés de las hojas con luz rasante: así se ve el daño de ácaro antes de que
                  aparezca la telaraña.
                </div>
              )}
            </>
          )}

          {/* ---------- Sustrato ---------- */}
          {res.sustrato && (
            <>
              <h3>🪴 Sustrato</h3>
              {res.humedad != null ? (
                <div className="medida agua">
                  <div className="etq">Humedad por color</div>
                  <div className="val">{Math.round(res.humedad * 100)} <small>%</small></div>
                  <div className="pie">interpolado entre tus dos fotos de calibración</div>
                </div>
              ) : (
                <div className="aviso">
                  Se ve el sustrato en la foto, pero aún no está calibrado. Guarda una foto justo
                  después de regar y otra cuando esté seco del todo (en Ajustes de la planta) y a
                  partir de ahí la app leerá la humedad por el color de la tierra, sin sonda.
                </div>
              )}
            </>
          )}

          <div className="acciones-fila">
            <button className="primario" onClick={guardar}>Usar estas medidas</button>
            <button onClick={() => { setRes(null); setImagen(null) }}>Otra foto</button>
            <button onClick={onCerrar}>Cerrar</button>
          </div>
        </>
      )}
    </div>
  )
}
