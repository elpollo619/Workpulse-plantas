import { useEffect, useMemo, useRef, useState } from 'react'
import FichaPlanta from './FichaPlanta.jsx'
import Mascotas from './Mascotas.jsx'
import Vacaciones from './Vacaciones.jsx'
import { revisarCasa } from './toxicity.js'
import { evaluar, estadoResumen } from './engine.js'
import { porId, ESPECIES } from './species.js'
import { AGUAS } from './nutrients.js'
import { FUENTES } from './lightmeter.js'
import { fotoperiodo, estacionTexto } from './solar.js'
import {
  cargarPlantas, guardarPlantas, cargarEntorno, guardarEntorno,
  nuevaPlanta, exportarProyecto,
} from './store.js'
import { diarioCompleto, verificar, restaurar, resumen } from './journal.js'
import { borrarFotosDe } from './photostore.js'
import { abrirInforme, descargarInforme } from './report.js'

/**
 * Workpulse Plantas — instrumento de cuidado vegetal.
 *
 * La pregunta de partida era simple: "subo una foto y que me diga si es agua".
 * La respuesta honesta es que una foto sola no basta, porque una hoja amarilla
 * significa cinco cosas distintas. Así que la app mide: saca la luz real de los
 * datos EXIF, calcula el agua con un modelo de depósito, lee el follaje por
 * colorimetría y cruza todo con inferencia bayesiana. Y cuando no sabe, lo dice
 * y propone qué medir para saberlo.
 */
export default function AppPlantas() {
  const [plantas, setPlantas] = useState(cargarPlantas)
  const [entorno, setEntorno] = useState(cargarEntorno)
  const [activa, setActiva] = useState(null)
  const [vista, setVista] = useState('plantas')
  const [integridad, setIntegridad] = useState(null)
  const importRef = useRef(null)

  useEffect(() => { guardarPlantas(plantas) }, [plantas])
  useEffect(() => { guardarEntorno(entorno) }, [entorno])
  useEffect(() => { verificar().then(setIntegridad) }, [plantas, vista])

  const planta = plantas.find((p) => p.id === activa) ?? null

  function anadir() {
    const p = nuevaPlanta({ nombre: `Planta ${plantas.length + 1}` })
    setPlantas((prev) => [...prev, p])
    setActiva(p.id)
  }

  function actualizar(p) {
    setPlantas((prev) => prev.map((x) => (x.id === p.id ? p : x)))
  }

  async function borrar(id) {
    await borrarFotosDe(id)
    setPlantas((prev) => prev.filter((p) => p.id !== id))
    setActiva(null)
  }

  function exportar() {
    const datos = exportarProyecto({ plantas, entorno, diario: diarioCompleto() })
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `plantas-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function importar(file) {
    try {
      const datos = JSON.parse(await file.text())
      if (datos.app !== 'workpulse-plantas') throw new Error('No es un proyecto de esta app')
      if (Array.isArray(datos.plantas)) setPlantas(datos.plantas)
      if (datos.entorno) setEntorno(datos.entorno)
      if (Array.isArray(datos.diario)) restaurar(datos.diario)
      setActiva(null)
      alert('Proyecto restaurado.')
    } catch (e) {
      alert(`No se pudo importar: ${e.message}`)
    }
  }

  const fichas = useMemo(
    () => plantas.map((p) => {
      const ev = evaluar(p, entorno)
      return { planta: p, especie: ev.especie, ...ev }
    }),
    [plantas, entorno]
  )

  async function informe(descargar) {
    const datos = {
      fichas,
      entorno,
      diario: diarioCompleto(),
      verificado: await verificar(),
    }
    if (descargar) descargarInforme(datos)
    else abrirInforme(datos)
  }

  const horas = fotoperiodo(entorno.latitud)
  const res = resumen()

  // Riesgo para mascotas: se calcula siempre, aunque el panel esté cerrado, para
  // poder marcar el botón. Una planta mortal en casa no debería depender de que
  // a alguien se le ocurra entrar a mirar.
  const revisionGato = useMemo(() => revisarCasa(plantas, 'gato'), [plantas])
  const alertaMascotas = revisionGato.criticas.length > 0

  return (
    <div className="app">
      <div className="barra">
        <h1>🌱 Workpulse Plantas</h1>
        <span className="crece" />
        <button className="pequeno" onClick={() => setVista(vista === 'entorno' ? 'plantas' : 'entorno')}>
          🏠<span className="etq-larga"> Mi casa</span>
        </button>
        <button className="pequeno" onClick={() => setVista(vista === 'mascotas' ? 'plantas' : 'mascotas')}>
          🐈{alertaMascotas ? ' ⚠️' : ''}
        </button>
        <button className="pequeno" onClick={() => setVista(vista === 'vacaciones' ? 'plantas' : 'vacaciones')}>
          🧳
        </button>
        <button className="pequeno" onClick={() => setVista(vista === 'ajustes' ? 'plantas' : 'ajustes')}>
          ⚙️
        </button>
      </div>

      <div className="contenido">
        {/* ---------- Detalle de una planta ---------- */}
        {planta && vista === 'plantas' && (
          <FichaPlanta
            planta={planta}
            entorno={entorno}
            onCambiar={actualizar}
            onBorrar={borrar}
            onVolver={() => setActiva(null)}
          />
        )}

        {/* ---------- Lista ---------- */}
        {!planta && vista === 'plantas' && (
          <>
            {plantas.length === 0 ? (
              <div className="tarjeta">
                <div className="vacio">
                  <span className="grande">🌿</span>
                  <b style={{ fontSize: 16, color: 'var(--text)' }}>Empieza por una planta</b>
                  <p style={{ maxWidth: 460, margin: '10px auto 0' }}>
                    Haz una foto y la app medirá la luz real que recibe (con los datos de
                    exposición de tu cámara), leerá el estado del follaje por color y calculará
                    en mililitros cuánta agua le toca y cuándo.
                  </p>
                </div>
                <div className="acciones-fila" style={{ justifyContent: 'center' }}>
                  <button className="primario" onClick={anadir}>Añadir mi primera planta</button>
                </div>
              </div>
            ) : (
              <>
                {alertaMascotas && (
                  <div className="aviso danger">
                    <b>☠️ Peligro para gatos: {revisionGato.criticas.map((c) => c.planta.nombre).join(', ')}.</b>
                    <br />
                    {revisionGato.criticas.some((c) => c.principio?.id === 'nefro_lirio')
                      ? 'Los lirios matan a un gato con una hoja mordida, el polen lamido de una pata o un sorbo del agua del jarrón. No hay dosis segura ni sitio alto que valga.'
                      : 'Fuera del alcance del animal, en otra habitación con la puerta cerrada.'}
                    <div style={{ marginTop: 8 }}>
                      <button className="pequeno" onClick={() => setVista('mascotas')}>Ver qué hacer</button>
                    </div>
                  </div>
                )}

                <div className="aviso" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span>🗓️</span>
                  <span>
                    Hoy hay <b>{horas.toFixed(1)} h</b> de sol en tu latitud —{' '}
                    <b>{estacionTexto(entorno.latitud)}</b>. El riego y el abono de todas tus
                    plantas ya están ajustados a eso.
                  </span>
                </div>

                {fichas.map((f) => {
                  const est = estadoResumen(f)
                  return (
                    <button key={f.planta.id} className="planta-fila" onClick={() => setActiva(f.planta.id)}>
                      <div className="avatar">{f.especie.rasgos?.suculenta ? '🌵' : '🌿'}</div>
                      <div>
                        <div className="nombre">{f.planta.nombre}</div>
                        <div className="especie">{f.especie.nombre}</div>
                      </div>
                      <div className="estado">
                        <div style={{ color: est.tono === 'warn' ? 'var(--warn)' : 'var(--ok)' }}>
                          {est.icono} {est.texto}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 2 }}>
                          {f.luz ? `DLI ${f.luz.dliMedido.toFixed(1)}` : 'luz sin medir'}
                        </div>
                      </div>
                    </button>
                  )
                })}

                <div className="acciones-fila">
                  <button className="primario" onClick={anadir}>+ Añadir planta</button>
                  <button onClick={() => informe(false)}>🖨️ Informe</button>
                  <button onClick={() => informe(true)}>📄 Descargar informe</button>
                </div>
              </>
            )}
          </>
        )}

        {/* ---------- Mascotas ---------- */}
        {vista === 'mascotas' && (
          <Mascotas
            plantas={plantas}
            onVerPlanta={(id) => { setActiva(id); setVista('plantas') }}
            onCerrar={() => setVista('plantas')}
          />
        )}

        {/* ---------- Vacaciones ---------- */}
        {vista === 'vacaciones' && (
          <Vacaciones plantas={plantas} entorno={entorno} onCerrar={() => setVista('plantas')} />
        )}

        {/* ---------- Entorno de la casa ---------- */}
        {vista === 'entorno' && (
          <div className="tarjeta">
            <h2>🏠 Condiciones de tu casa</h2>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 0 }}>
              Estos cuatro datos son los que gobiernan el consumo de agua de todas tus plantas.
              La temperatura y la humedad determinan el déficit de presión de vapor, que es el
              motor físico de la transpiración: a 24 °C y 35 % de humedad una planta bebe casi el
              triple que a 19 °C y 60 %.
            </p>

            <div className="rejilla">
              <label className="campo">
                <span>Temperatura habitual (°C)</span>
                <input type="number" min="0" max="45" value={entorno.tempC}
                  onChange={(e) => setEntorno({ ...entorno, tempC: Number(e.target.value) })} />
              </label>
              <label className="campo">
                <span>Humedad relativa (%)</span>
                <input type="number" min="5" max="100" value={entorno.humedadRel}
                  onChange={(e) => setEntorno({ ...entorno, humedadRel: Number(e.target.value) })} />
              </label>
              <label className="campo">
                <span>Latitud (para el fotoperiodo real)</span>
                <input type="number" min="-66" max="66" step="0.1" value={entorno.latitud}
                  onChange={(e) => setEntorno({ ...entorno, latitud: Number(e.target.value) })} />
              </label>
              <label className="campo">
                <span>Agua del grifo</span>
                <select value={entorno.agua} onChange={(e) => setEntorno({ ...entorno, agua: e.target.value })}>
                  {AGUAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </label>
              <label className="campo">
                <span>Tipo de luz predominante</span>
                <select value={entorno.fuenteLuz} onChange={(e) => setEntorno({ ...entorno, fuenteLuz: e.target.value })}>
                  {FUENTES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </label>
              <label className="campo">
                <span>Movimiento de aire</span>
                <select value={entorno.corrienteAire}
                  onChange={(e) => setEntorno({ ...entorno, corrienteAire: Number(e.target.value) })}>
                  <option value={0.85}>Aire muy quieto (habitación cerrada)</option>
                  <option value={1}>Normal</option>
                  <option value={1.25}>Ventilado o con ventilador</option>
                  <option value={1.5}>Calefacción de aire o corriente fuerte</option>
                </select>
              </label>
            </div>

            <div className="acciones-fila">
              <button
                onClick={() => navigator.geolocation?.getCurrentPosition(
                  (p) => setEntorno({ ...entorno, latitud: Math.round(p.coords.latitude * 10) / 10 }),
                  () => alert('No se pudo obtener la ubicación. Escribe la latitud a mano.')
                )}
              >
                📍 Usar mi latitud
              </button>
              <button onClick={() => setVista('plantas')}>Hecho</button>
            </div>

            <div className="aviso" style={{ marginTop: 12 }}>
              Con {entorno.tempC} °C y {entorno.humedadRel} % de humedad, el déficit de presión de
              vapor es de {(0.6108 * Math.exp((17.27 * entorno.tempC) / (entorno.tempC + 237.3)) * (1 - entorno.humedadRel / 100)).toFixed(2)} kPa.
              Por debajo de 0.5 kPa las plantas apenas transpiran (y el sustrato tarda mucho en
              secar); por encima de 1.6 kPa sufren y cierran estomas.
            </div>
          </div>
        )}

        {/* ---------- Ajustes ---------- */}
        {vista === 'ajustes' && (
          <>
            <div className="tarjeta">
              <h2>💾 Copia de seguridad</h2>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 0 }}>
                Todo vive en este dispositivo: las fichas, el cuaderno encadenado y las fotos.
                No hay servidor ni cuenta. Si cambias de móvil o borras los datos del navegador,
                se pierde — así que exporta de vez en cuando.
              </p>
              <div className="acciones-fila" style={{ marginTop: 0 }}>
                <button onClick={exportar}>⬇️ Exportar proyecto</button>
                <button onClick={() => importRef.current?.click()}>⬆️ Importar</button>
                <input ref={importRef} type="file" accept="application/json" style={{ display: 'none' }}
                  onChange={(e) => e.target.files[0] && importar(e.target.files[0])} />
              </div>
            </div>

            <div className="tarjeta">
              <h2>🔐 Integridad del cuaderno</h2>
              {res ? (
                <>
                  <div className={`aviso ${integridad === false ? 'danger' : 'ok'}`}>
                    {integridad === false
                      ? 'La cadena SHA-256 NO verifica: alguna anotación se ha alterado desde que se escribió.'
                      : 'Cadena SHA-256 íntegra: ninguna anotación se ha modificado a posteriori.'}
                  </div>
                  <div className="medidas">
                    <div className="medida">
                      <div className="etq">Anotaciones</div>
                      <div className="val">{res.entradas}</div>
                    </div>
                    <div className="medida">
                      <div className="etq">Desde</div>
                      <div className="val" style={{ fontSize: 14 }}>
                        {new Date(res.desde).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <div className="medida">
                      <div className="etq">Hash de cabeza</div>
                      <div className="val" style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>
                        {res.cabeza.slice(0, 16)}…
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="vacio">El cuaderno está vacío.</p>
              )}
            </div>

            <div className="tarjeta">
              <h2>📖 Cómo funciona</h2>
              <div style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--muted)' }}>
                <p><b style={{ color: 'var(--text)' }}>Luz.</b> Tu móvil ya es un fotómetro
                calibrado: al disparar anota apertura, tiempo e ISO. Deshaciendo la ecuación de
                exposición (ISO 2720, L = K·N²/(t·S) con K = 12.5) se recupera la luminancia de la
                escena; corregida por el brillo real de los píxeles y por la reflectancia de la
                superficie da los lux, y de ahí el PPFD y el DLI. Un cuantómetro PAR cuesta 300 €;
                esto usa el que ya llevas en el bolsillo.</p>

                <p><b style={{ color: 'var(--text)' }}>Agua.</b> La maceta es un depósito. Se
                calcula su capacidad por el volumen troncocónico real y la porosidad del sustrato,
                y el caudal de salida como transpiración (conductancia estomática en función de la
                luz medida × déficit de presión de vapor, integrada sobre el fotoperiodo de tu
                latitud) más la evaporación del sustrato. De ahí salen mililitros y una fecha, no
                un "riega cada 7 días".</p>

                <p><b style={{ color: 'var(--text)' }}>Hoja.</b> Los píxeles se clasifican en
                tejido sano, clorótico y necrótico, y lo que decide el diagnóstico no es cuánto
                amarillo hay sino <i>dónde</i>: en el borde apunta a sales o sed; entre nervios con
                los nervios verdes, a bloqueo de hierro; uniforme, a nitrógeno o exceso de agua.</p>

                <p><b style={{ color: 'var(--text)' }}>Diagnóstico.</b> Cinco fuentes
                independientes se combinan en log-odds bayesianos sobre 14 hipótesis. Cuando dos
                hipótesis empatan, la app lo dice y propone qué medir para desempatar, en vez de
                fingir una certeza que no tiene.</p>

                <p><b style={{ color: 'var(--text)' }}>Privacidad.</b> Nada sale del dispositivo.
                La única llamada de red es la identificación por Pl@ntNet, y solo cuando la pides
                tú.</p>
              </div>
            </div>

            <div className="acciones-fila">
              <button onClick={() => setVista('plantas')}>← Volver</button>
            </div>
          </>
        )}
      </div>

      <div className="pie-app">
        Workpulse Plantas · las fotos y los datos no salen de este dispositivo ·
        ayuda a la decisión, no dictamen fitosanitario
      </div>
    </div>
  )
}
