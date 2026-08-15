# Workpulse Plantas 🌱

**Qué darle a cada planta, medido.** Subes una foto y la app identifica la
especie, **mide la luz real que recibe**, calcula **en mililitros** cuánta agua
le toca y cuándo, lee el estado del follaje por colorimetría y te da una lista
de acciones concretas para hoy.

Todo se procesa en el navegador — las fotos nunca salen del dispositivo.

---

## Por qué no es otra app de plantas

Las apps de plantas dicen «riega cada 7 días». Eso es un calendario, no una
respuesta: el mismo potos en un piso a 24 °C con calefacción bebe **el triple**
que en un sótano a 17 °C. Y una hoja amarilla significa cinco cosas distintas.

Esta app **mide** en vez de suponer, con la misma filosofía que
[Workpulse 360](../Workpulse-360): magnitudes físicas, incertidumbre declarada
y método auditable.

### 🔦 Tu móvil es un luxómetro (y no lo sabías)

Un cuantómetro PAR cuesta 300 €. Pero **tu cámara ya es un fotómetro calibrado
de fábrica**: al disparar anota apertura, tiempo e ISO, y esos tres números
determinan la luminancia de la escena. Deshaciendo la ecuación de exposición se
recupera, y de ahí salen los lux, el PPFD y el **DLI** — la magnitud que de
verdad decide si una planta crece, se estira o se quema.

```
ISO 2720:  L = K · N² / (t · S)        K = 12.5
           E = π · L / ρ               ρ = reflectancia de la superficie
           DLI = PPFD · horas · 3600 / 10⁶
```

Corregido por el brillo real de los píxeles y por el espectro de la fuente
(usar el factor del sol con un LED es el error típico, y son >30 %).
Validado contra la regla del *sunny 16* y contra la ecuación de luz incidente
(C = 250), que es una vía independiente: **concuerdan dentro del 5 %**.

### 💧 La maceta es un depósito, no un calendario

Se calcula su capacidad por el volumen troncocónico real y la porosidad del
sustrato, y el caudal de salida como transpiración física:

```
E = gs(PPFD) · VPD / P          gs = conductancia estomática (curva de saturación)
                                VPD = déficit de presión de vapor
```

integrada sobre el **fotoperiodo real de tu latitud** (calculado por declinación
solar, no por el mes del calendario), más la evaporación del sustrato. De ahí
salen mililitros y una fecha.

### ⚖️ Riego por peso — el método de laboratorio, con una báscula de cocina

El agua pesa 1 g/ml **exactos**. Una báscula de 12 € mide el estado hídrico
mejor que cualquier sensor de los que se clavan en la tierra (esos miden
conductividad, y el abono los descalibra).

```
agua que falta (ml) = peso a capacidad de campo − peso de ahora (g)
```

No es una estimación: es una resta. Con dos pesadas de calibración, esa planta
pasa a tener una medida con ±1 % de error.

### 🍃 Dónde está el amarillo importa más que cuánto

Detectar que una hoja está amarilla lo hace cualquiera. Lo que separa las causas
es el **patrón espacial**, igual que en patología vegetal de campo:

| Patrón detectado | Causa |
|---|---|
| Amarillo uniforme en hojas viejas | falta de nitrógeno |
| Amarillo entre nervios, nervios verdes | hierro o magnesio bloqueados |
| Borde seco y crujiente | sales, humedad baja o sed |
| Manchas blandas en el interior del limbo | exceso de agua, pudrición |
| Punteado fino y decolorado | araña roja (antes de la telaraña) |

Con índices publicados en agronomía — **DGCI** para el verdor y **ExG** para la
densidad de clorofila — más análisis de margen contra interior y detección de
textura internervial.

### 🩺 Diagnóstico bayesiano auditable

Cinco fuentes independientes (píxeles, luz medida, balance hídrico, clima e
historial) se combinan en **log-odds sobre 14 hipótesis**:

```
logit(p) = logit(prior) + Σ log(LR_i)
```

Y lo importante: **te enseña el razonamiento**. Cada hipótesis muestra qué
evidencias la sostienen y cuáles la contradicen. Cuando dos empatan, lo dice —
y propone **qué medir para desempatar**, en vez de fingir una certeza que no
tiene. Cuando no hay ningún problema, también lo dice.

### 🐛 Plagas predichas, no diagnosticadas tarde

Cuando ves telarañas de araña roja llevas tres generaciones de retraso. Pero las
plagas de interior son deterministas: modelo de **grados-día** por especie
(araña roja: base 12 °C, 120 GD/generación) que avisa *antes*, y programa la
revisión **dentro** del ciclo — inspeccionar cada 15 días con una plaga que
completa generación en 9 llega tarde por definición.

### 📈 Gemelo digital: detecta lo que ningún síntoma avisa

Cada foto guardada registra la superficie de dosel. La serie temporal da la
curva de crecimiento, y su derivada es un detector precoz: **una planta que ha
dejado de crecer lleva semanas con un problema antes de que se le note en el
color**.

---

## Y además

- 🔍 **Identificación por tres vías**: [Pl@ntNet](https://my.plantnet.org)
  (500 identificaciones/día gratis), **clave dicotómica local sin conexión**
  (no busca el nombre exacto sino el perfil fisiológico, que es lo que decide
  el riego) y búsqueda por nombre
- 🌡️ **Humedad del sustrato por color**: la tierra mojada es más oscura que la
  seca; con dos fotos de calibración, un higrómetro sin sonda
- 🧪 **Dosis de abono en mililitros exactos** para tu NPK y tu maceta, con la
  **CE** resultante comprobada contra el máximo de la especie
- 💦 **Química del agua**: deriva del pH por riego con agua dura, bloqueo del
  hierro por encima de pH 7 (por qué echar más abono *no* arregla una clorosis)
- 🫁 **Riesgo de asfixia radicular**: no es regar mucho, es que el sustrato pase
  más de 3–4 días saturado
- 🐕 **Toxicidad para perros y gatos** en cada especie
- 📔 **Cuaderno de cultivo encadenado con SHA-256** — el historial es
  solo-añadir y verificable; todo el diagnóstico se apoya en él
- 🖨️ **Informe imprimible/PDF** con medidas, diagnóstico razonado y método
- 💾 Proyecto exportable e importable (JSON) · fotos en IndexedDB
- 📲 **PWA instalable que funciona sin conexión** — solo la identificación por
  Pl@ntNet necesita red
- 🔒 **Sin servidor y sin cuenta**: no hay backend. Nada sale del dispositivo
  salvo las fotos que tú mandes a identificar

## Desarrollo

```bash
npm install
npm run dev             # http://localhost:5173
npm test                # modelos físicos, en Node
npm run test:navegador  # fotometría foliar + interfaz, en Chromium real
npm run test:todo       # todo
npm run build
```

### Cómo se verifica

Los modelos afirman cosas comprobables, así que se comprueban contra valores
externos y no contra sí mismos: sol pleno ≈ 100 000 lx, Madrid 15 h de sol en
el solsticio, maceta de 15 cm ≈ 1.8 L, VPD 1.24 kPa a 21 °C/50 %. El luxómetro
se contrasta además con la ecuación de luz incidente (C = 250), que es una vía
independiente de la que usa (K = 12.5): **concuerdan dentro del 5 %**.

La fotometría foliar se valida dibujando hojas sintéticas con la firma de cada
patología —amarilleo uniforme, internervial con nervios verdes, borde quemado,
manchas internas— y comprobando que el analizador las separa. Después se
encadena entero: **píxeles → métricas → diagnóstico**, verificando que la
cadena completa llega al cuadro clínico correcto.

Estas pruebas no son decorativas. Encontraron cuatro fallos reales:

| Fallo | Consecuencia si no se detecta |
|---|---|
| Los píxeles oscuros del **fondo** se contaban como tejido muerto | Cualquier foto sobre fondo oscuro informaba de ~50 % de la planta necrosada |
| K = 12.5 y C = 250 solo son consistentes con ρ = π·K/C = 0.157 | Todas las medidas de luz salían un 12 % bajas |
| La clave comparaba formas con `includes` | «Roseta erecta» encajaba en «roseta compacta»: una sansevieria se colaba por delante de las echeverias |
| El diagnóstico mostraba siempre la primera del ranking | Se inventaba una enfermedad en plantas perfectamente sanas |

## Cómo sacar buenas medidas

1. **Foto con la cámara del móvil**, no capturas de pantalla ni imágenes
   reenviadas por mensajería: pierden los datos EXIF de exposición y sin ellos
   no hay medida de luz.
2. **Sin flash** y sin apuntar al sol directo (la app avisa si detecta zonas
   quemadas).
3. Para la máxima precisión, **fotografía un folio blanco** puesto donde vive la
   planta: baja la incertidumbre a la mitad.
4. **Pesa la maceta** recién regada y escurrida una vez. A partir de ahí el
   riego deja de ser una estimación.

## Limitaciones, dichas claramente

- Sin EXIF no hay medida de luz; el resto sigue funcionando.
- Sin báscula, el estado hídrico es una estimación con ±25–35 % declarado.
- La superficie foliar se estima de la foto salvo que la declares a mano.
- Los perfiles cubren ~40 especies comunes; el resto usa el perfil genérico o
  el de su género, y los cálculos siguen siendo válidos aunque los umbrales
  sean promedios.
- Es una **ayuda a la decisión, no un dictamen fitosanitario**. Ante sospecha
  de plaga o enfermedad grave, consulta a un profesional.

---

Parte de la familia **Workpulse** — instrumentos de medición que caben en el
bolsillo, con la incertidumbre siempre declarada.
