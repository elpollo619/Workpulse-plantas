// Base de datos fisiológica de especies.
//
// No es una lista de "riego: moderado". Cada especie lleva los parámetros que
// los modelos necesitan para calcular:
//
//   dli ......... integral diaria de luz que necesita (mol·m⁻²·d⁻¹)
//   gsFactor .... agresividad estomática relativa: un helecho transpira sin
//                 frenos y una suculenta CAM cierra los estomas de día
//   mad ......... agotamiento permitido del depósito antes de sufrir
//                 (0.25 = un helecho no soporta secarse; 0.85 = un cactus sí)
//   tempC ....... [mínima tolerada, óptima, máxima]
//   hrMin ....... humedad relativa por debajo de la cual aparecen bordes secos
//   ceMax ....... conductividad de riego tolerada (dS/m)
//   dormancia ... cuánto frena en invierno (regula riego y abono)
//   toxica ...... para perros y gatos; el dato que más se echa de menos
//   rasgos ...... para la clave dicotómica sin conexión

export const ESPECIES = [
  {
    id: 'potos', nombre: 'Potos', cientifico: 'Epipremnum aureum', familia: 'Araceae',
    sinonimos: ['pothos', 'poto', 'potus', 'scindapsus aureus'],
    tipo: 'trepadora de hoja', dli: { min: 2, opt: 6, max: 15 }, gsFactor: 0.9, mad: 0.6,
    tempC: [12, 22, 30], hrMin: 40, ceMax: 1.6, sustrato: 'aireado', ph: [5.5, 6.5],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'trepadora', hoja: 'acorazonada', variegada: true, suculenta: false },
    notas: 'Casi indestructible. Muere más por exceso de agua que por olvido: deja secar la mitad superior del sustrato.',
  },
  {
    id: 'monstera', nombre: 'Costilla de Adán', cientifico: 'Monstera deliciosa', familia: 'Araceae',
    sinonimos: ['monstera', 'costilla de adan', 'cerimán'],
    tipo: 'trepadora de hoja', dli: { min: 4, opt: 9, max: 18 }, gsFactor: 1.0, mad: 0.55,
    tempC: [13, 23, 30], hrMin: 45, ceMax: 1.8, sustrato: 'aroide', ph: [5.5, 6.5],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'trepadora', hoja: 'fenestrada', variegada: false, suculenta: false },
    notas: 'Las hojas nuevas sin agujeros indican luz insuficiente, no falta de abono. Necesita tutor de musgo para fenestrar bien.',
  },
  {
    id: 'ficus_lyrata', nombre: 'Ficus lira', cientifico: 'Ficus lyrata', familia: 'Moraceae',
    sinonimos: ['ficus lyrata', 'higuera lira', 'pandurata'],
    tipo: 'arbusto de interior', dli: { min: 6, opt: 12, max: 22 }, gsFactor: 1.0, mad: 0.5,
    tempC: [15, 23, 30], hrMin: 45, ceMax: 1.5, sustrato: 'aireado', ph: [6.0, 6.8],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'arbolito', hoja: 'grande coriácea', variegada: false, suculenta: false },
    notas: 'Odia los cambios de sitio y las corrientes. Manchas marrones en el centro de la hoja = exceso de riego; en el borde = sed o sales.',
  },
  {
    id: 'ficus_elastica', nombre: 'Ficus elástica', cientifico: 'Ficus elastica', familia: 'Moraceae',
    sinonimos: ['gomero', 'árbol del caucho', 'ficus robusta'],
    tipo: 'arbusto de interior', dli: { min: 4, opt: 10, max: 20 }, gsFactor: 0.85, mad: 0.6,
    tempC: [13, 22, 30], hrMin: 40, ceMax: 1.7, sustrato: 'aireado', ph: [5.8, 6.8],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'arbolito', hoja: 'grande coriácea', variegada: false, suculenta: false },
    notas: 'Hoja gruesa y cerosa: aguanta bastante sequía. Limpia el polvo, que le reduce la fotosíntesis de verdad.',
  },
  {
    id: 'sansevieria', nombre: 'Lengua de suegra', cientifico: 'Dracaena trifasciata', familia: 'Asparagaceae',
    sinonimos: ['sansevieria', 'sanseviera', 'lengua de tigre', 'espada de san jorge'],
    tipo: 'suculenta', dli: { min: 1.5, opt: 8, max: 25 }, gsFactor: 0.2, mad: 0.85,
    tempC: [10, 22, 32], hrMin: 20, ceMax: 2.0, sustrato: 'cactus', ph: [6.0, 7.5],
    dormancia: 'fuerte', toxica: true,
    rasgos: { forma: 'roseta erecta', hoja: 'lanceolada rígida', variegada: true, suculenta: true },
    notas: 'Metabolismo CAM: abre los estomas de noche. Es la planta que más gente mata por regarla bien. En invierno, una vez al mes basta.',
  },
  {
    id: 'zamioculca', nombre: 'Zamioculca', cientifico: 'Zamioculcas zamiifolia', familia: 'Araceae',
    sinonimos: ['zz', 'zamioculcas', 'planta zz'],
    tipo: 'suculenta', dli: { min: 1.5, opt: 6, max: 18 }, gsFactor: 0.3, mad: 0.8,
    tempC: [12, 22, 30], hrMin: 25, ceMax: 1.8, sustrato: 'cactus', ph: [6.0, 7.0],
    dormancia: 'media', toxica: true,
    rasgos: { forma: 'mata', hoja: 'foliolos brillantes', variegada: false, suculenta: true },
    notas: 'Tiene rizomas que almacenan agua: sobrevive meses. Amarilleo generalizado casi siempre significa exceso de riego.',
  },
  {
    id: 'espatifilo', nombre: 'Espatifilo', cientifico: 'Spathiphyllum wallisii', familia: 'Araceae',
    sinonimos: ['spathiphyllum', 'flor de la paz', 'cuna de moisés'],
    tipo: 'herbácea de interior', dli: { min: 2, opt: 6, max: 12 }, gsFactor: 1.15, mad: 0.4,
    tempC: [15, 22, 29], hrMin: 50, ceMax: 1.2, sustrato: 'universal', ph: [5.5, 6.5],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'mata', hoja: 'lanceolada brillante', variegada: false, suculenta: false },
    notas: 'Avisa cayéndose antes de sufrir daño real, pero acostumbrarla a llegar al desmayo le cuesta raíces. Muy sensible al cloro y a las sales.',
  },
  {
    id: 'calathea', nombre: 'Calathea', cientifico: 'Goeppertia makoyana', familia: 'Marantaceae',
    sinonimos: ['calathea', 'maranta', 'planta que reza'],
    tipo: 'herbácea de interior', dli: { min: 2, opt: 5, max: 10 }, gsFactor: 1.25, mad: 0.3,
    tempC: [16, 23, 28], hrMin: 60, ceMax: 0.9, sustrato: 'universal', ph: [5.5, 6.5],
    dormancia: 'leve', toxica: false,
    rasgos: { forma: 'mata', hoja: 'ovalada con dibujo', variegada: true, suculenta: false },
    notas: 'La más exigente en humedad y calidad de agua: los bordes marrones son casi siempre cloro, flúor o sales, no falta de riego. Usa agua de lluvia o de ósmosis.',
  },
  {
    id: 'dracaena', nombre: 'Tronco del Brasil', cientifico: 'Dracaena fragrans', familia: 'Asparagaceae',
    sinonimos: ['dracena', 'palo de agua', 'tronco de brasil'],
    tipo: 'arbusto de interior', dli: { min: 2, opt: 7, max: 15 }, gsFactor: 0.8, mad: 0.6,
    tempC: [13, 22, 30], hrMin: 40, ceMax: 1.0, sustrato: 'aireado', ph: [6.0, 6.8],
    dormancia: 'media', toxica: true,
    rasgos: { forma: 'arbolito', hoja: 'cinta larga', variegada: true, suculenta: false },
    notas: 'Muy sensible al flúor del agua del grifo: puntas marrones típicas. Deja reposar el agua o usa filtrada.',
  },
  {
    id: 'aloe', nombre: 'Aloe vera', cientifico: 'Aloe vera', familia: 'Asphodelaceae',
    sinonimos: ['aloe', 'sabila', 'sábila'],
    tipo: 'suculenta', dli: { min: 6, opt: 16, max: 35 }, gsFactor: 0.2, mad: 0.85,
    tempC: [5, 24, 38], hrMin: 20, ceMax: 2.2, sustrato: 'cactus', ph: [6.5, 7.5],
    dormancia: 'media', toxica: true,
    rasgos: { forma: 'roseta', hoja: 'carnosa dentada', variegada: false, suculenta: true },
    notas: 'Quiere mucha más luz de la que suele recibir en interior. Si las hojas se estiran y se abren hacia fuera, le falta sol.',
  },
  {
    id: 'suculenta_echeveria', nombre: 'Echeveria', cientifico: 'Echeveria elegans', familia: 'Crassulaceae',
    sinonimos: ['echeveria', 'rosa de alabastro', 'suculenta roseta'],
    tipo: 'suculenta', dli: { min: 8, opt: 20, max: 40 }, gsFactor: 0.18, mad: 0.9,
    tempC: [2, 22, 35], hrMin: 15, ceMax: 2.0, sustrato: 'cactus', ph: [6.0, 7.0],
    dormancia: 'media', toxica: false,
    rasgos: { forma: 'roseta', hoja: 'carnosa', variegada: false, suculenta: true },
    notas: 'El estiramiento (etiolación) es irreversible: si se ha alargado buscando luz, esa parte ya no se compacta. Necesita sol directo.',
  },
  {
    id: 'cactus', nombre: 'Cactus de columna', cientifico: 'Cereus / Echinopsis spp.', familia: 'Cactaceae',
    sinonimos: ['cactus', 'cacto'],
    tipo: 'cactus', dli: { min: 10, opt: 25, max: 45 }, gsFactor: 0.12, mad: 0.95,
    tempC: [2, 25, 40], hrMin: 10, ceMax: 2.2, sustrato: 'cactus', ph: [6.0, 7.5],
    dormancia: 'fuerte', toxica: false,
    rasgos: { forma: 'columnar', hoja: 'sin hojas / espinas', variegada: false, suculenta: true },
    notas: 'Reposo invernal seco y fresco: es lo que induce la floración. Regarlo en invierno lo pudre.',
  },
  {
    id: 'orquidea', nombre: 'Orquídea mariposa', cientifico: 'Phalaenopsis spp.', familia: 'Orchidaceae',
    sinonimos: ['orquidea', 'phalaenopsis', 'falenopsis'],
    tipo: 'epífita', dli: { min: 3, opt: 8, max: 14 }, gsFactor: 0.4, mad: 0.7,
    tempC: [16, 24, 30], hrMin: 50, ceMax: 0.8, sustrato: 'orquidea', ph: [5.5, 6.5],
    dormancia: 'leve', toxica: false,
    rasgos: { forma: 'epífita', hoja: 'carnosa ancha', variegada: false, suculenta: false },
    notas: 'Las raíces verdes están hidratadas; las plateadas, secas — es un indicador visual directo. Un bajón de 8–10 °C por la noche durante 3 semanas dispara la vara floral.',
  },
  {
    id: 'helecho', nombre: 'Helecho de Boston', cientifico: 'Nephrolepis exaltata', familia: 'Lomariopsidaceae',
    sinonimos: ['helecho', 'nephrolepis', 'helecho espada'],
    tipo: 'helecho', dli: { min: 2, opt: 5, max: 10 }, gsFactor: 1.35, mad: 0.25,
    tempC: [13, 21, 27], hrMin: 60, ceMax: 0.9, sustrato: 'universal', ph: [5.5, 6.5],
    dormancia: 'leve', toxica: false,
    rasgos: { forma: 'mata colgante', hoja: 'fronde dividida', variegada: false, suculenta: false },
    notas: 'No tolera secarse ni una vez: cada episodio le cuesta frondes. Es la especie que más humedad ambiental necesita de esta lista.',
  },
  {
    id: 'cinta', nombre: 'Cinta', cientifico: 'Chlorophytum comosum', familia: 'Asparagaceae',
    sinonimos: ['cinta', 'malamadre', 'lazo de amor', 'chlorophytum'],
    tipo: 'herbácea de interior', dli: { min: 2, opt: 8, max: 18 }, gsFactor: 0.95, mad: 0.6,
    tempC: [10, 21, 30], hrMin: 40, ceMax: 1.0, sustrato: 'universal', ph: [6.0, 6.8],
    dormancia: 'leve', toxica: false,
    rasgos: { forma: 'mata colgante', hoja: 'cinta arqueada', variegada: true, suculenta: false },
    notas: 'Puntas marrones = flúor y sales del agua del grifo, muy típico. Riega con agua reposada y lava el sustrato cada pocos meses.',
  },
  {
    id: 'filodendro', nombre: 'Filodendro', cientifico: 'Philodendron hederaceum', familia: 'Araceae',
    sinonimos: ['philodendron', 'filodendro', 'filodendron'],
    tipo: 'trepadora de hoja', dli: { min: 2, opt: 7, max: 15 }, gsFactor: 0.95, mad: 0.55,
    tempC: [14, 23, 30], hrMin: 45, ceMax: 1.6, sustrato: 'aroide', ph: [5.5, 6.5],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'trepadora', hoja: 'acorazonada', variegada: false, suculenta: false },
    notas: 'Muy parecido al potos pero de hoja más fina y mate. Aguanta menos sequía que aquel.',
  },
  {
    id: 'anturio', nombre: 'Anturio', cientifico: 'Anthurium andraeanum', familia: 'Araceae',
    sinonimos: ['anthurium', 'anturio', 'flor flamenco'],
    tipo: 'epífita', dli: { min: 3, opt: 7, max: 13 }, gsFactor: 1.0, mad: 0.45,
    tempC: [16, 23, 30], hrMin: 55, ceMax: 1.0, sustrato: 'aroide', ph: [5.5, 6.5],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'mata', hoja: 'acorazonada brillante', variegada: false, suculenta: false },
    notas: 'Es epífito: en tierra compacta se ahoga. Quiere sustrato grueso, humedad constante y nunca encharcado.',
  },
  {
    id: 'begonia', nombre: 'Begonia de hoja', cientifico: 'Begonia rex', familia: 'Begoniaceae',
    sinonimos: ['begonia', 'begonia rex'],
    tipo: 'herbácea de interior', dli: { min: 2, opt: 6, max: 11 }, gsFactor: 1.2, mad: 0.4,
    tempC: [15, 21, 27], hrMin: 55, ceMax: 1.0, sustrato: 'universal', ph: [5.8, 6.5],
    dormancia: 'media', toxica: true,
    rasgos: { forma: 'mata', hoja: 'asimétrica con dibujo', variegada: true, suculenta: false },
    notas: 'No mojes la hoja: el agua parada sobre el limbo pilosos provoca oídio y botritis con facilidad.',
  },
  {
    id: 'albahaca', nombre: 'Albahaca', cientifico: 'Ocimum basilicum', familia: 'Lamiaceae',
    sinonimos: ['albahaca', 'basilico'],
    tipo: 'aromática', dli: { min: 10, opt: 20, max: 35 }, gsFactor: 1.4, mad: 0.35,
    tempC: [15, 24, 32], hrMin: 40, ceMax: 1.6, sustrato: 'universal', ph: [6.0, 7.0],
    dormancia: 'nula', toxica: false,
    rasgos: { forma: 'mata', hoja: 'ovalada aromática', variegada: false, suculenta: false },
    notas: 'Las macetas de supermercado traen 20 plantas apretadas y se agotan en semanas: sepáralas. Pinza las flores para que siga dando hoja.',
  },
  {
    id: 'menta', nombre: 'Menta', cientifico: 'Mentha spp.', familia: 'Lamiaceae',
    sinonimos: ['menta', 'hierbabuena', 'yerbabuena'],
    tipo: 'aromática', dli: { min: 8, opt: 16, max: 30 }, gsFactor: 1.4, mad: 0.35,
    tempC: [8, 21, 30], hrMin: 40, ceMax: 1.8, sustrato: 'universal', ph: [6.0, 7.0],
    dormancia: 'media', toxica: false,
    rasgos: { forma: 'mata', hoja: 'dentada aromática', variegada: false, suculenta: false },
    notas: 'Invasora por estolones: siempre en maceta propia. Quiere el sustrato fresco de continuo.',
  },
  {
    id: 'romero', nombre: 'Romero', cientifico: 'Salvia rosmarinus', familia: 'Lamiaceae',
    sinonimos: ['romero', 'rosmarinus'],
    tipo: 'aromática', dli: { min: 14, opt: 25, max: 45 }, gsFactor: 0.6, mad: 0.7,
    tempC: [-5, 22, 35], hrMin: 25, ceMax: 2.0, sustrato: 'cactus', ph: [6.5, 7.5],
    dormancia: 'media', toxica: false,
    rasgos: { forma: 'arbusto', hoja: 'acicular aromática', variegada: false, suculenta: false },
    notas: 'Mediterráneo: muere de exceso de agua, no de sol. En interior casi nunca tiene luz suficiente.',
  },
  {
    id: 'limonero', nombre: 'Limonero', cientifico: 'Citrus limon', familia: 'Rutaceae',
    sinonimos: ['limonero', 'citrico', 'naranjo', 'citrus'],
    tipo: 'frutal en maceta', dli: { min: 15, opt: 30, max: 50 }, gsFactor: 1.1, mad: 0.45,
    tempC: [2, 24, 35], hrMin: 40, ceMax: 1.5, sustrato: 'aireado', ph: [6.0, 6.8],
    dormancia: 'media', toxica: false,
    rasgos: { forma: 'arbolito', hoja: 'coriácea aromática', variegada: false, suculenta: false },
    notas: 'Clorosis férrica clásica con agua caliza: hojas nuevas amarillas con nervios verdes. Se corrige con quelato de hierro EDDHA, no con más abono.',
  },
  {
    id: 'olivo', nombre: 'Olivo', cientifico: 'Olea europaea', familia: 'Oleaceae',
    sinonimos: ['olivo', 'aceituno'],
    tipo: 'frutal en maceta', dli: { min: 18, opt: 32, max: 50 }, gsFactor: 0.5, mad: 0.75,
    tempC: [-8, 24, 40], hrMin: 20, ceMax: 2.5, sustrato: 'cactus', ph: [6.5, 8.0],
    dormancia: 'media', toxica: false,
    rasgos: { forma: 'arbolito', hoja: 'lanceolada plateada', variegada: false, suculenta: false },
    notas: 'Necesita sol pleno de verdad; en interior no prospera. Muy tolerante a la sequía y a la cal.',
  },
  {
    id: 'tomate', nombre: 'Tomatera', cientifico: 'Solanum lycopersicum', familia: 'Solanaceae',
    sinonimos: ['tomate', 'tomatera', 'jitomate'],
    tipo: 'hortícola', dli: { min: 18, opt: 28, max: 45 }, gsFactor: 1.6, mad: 0.4,
    tempC: [10, 24, 33], hrMin: 45, ceMax: 2.5, sustrato: 'universal', ph: [6.0, 6.8],
    dormancia: 'nula', toxica: true,
    rasgos: { forma: 'mata', hoja: 'compuesta dentada', variegada: false, suculenta: false },
    notas: 'La podredumbre apical (culo negro) no es un hongo: es falta de calcio por riego irregular. Riega constante antes de echar nada.',
  },
  {
    id: 'lavanda', nombre: 'Lavanda', cientifico: 'Lavandula angustifolia', familia: 'Lamiaceae',
    sinonimos: ['lavanda', 'espliego'],
    tipo: 'aromática', dli: { min: 15, opt: 28, max: 45 }, gsFactor: 0.55, mad: 0.75,
    tempC: [-10, 22, 35], hrMin: 20, ceMax: 2.0, sustrato: 'cactus', ph: [6.5, 7.8],
    dormancia: 'media', toxica: false,
    rasgos: { forma: 'arbusto', hoja: 'acicular gris', variegada: false, suculenta: false },
    notas: 'Quiere suelo pobre, seco y calcáreo. Abonarla y regarla como a una planta de interior la mata.',
  },
  {
    id: 'crasa_jade', nombre: 'Árbol de jade', cientifico: 'Crassula ovata', familia: 'Crassulaceae',
    sinonimos: ['jade', 'crassula', 'arbol del dinero'],
    tipo: 'suculenta', dli: { min: 8, opt: 18, max: 35 }, gsFactor: 0.2, mad: 0.85,
    tempC: [5, 23, 35], hrMin: 20, ceMax: 2.0, sustrato: 'cactus', ph: [6.0, 7.0],
    dormancia: 'media', toxica: true,
    rasgos: { forma: 'arbolito', hoja: 'carnosa redondeada', variegada: false, suculenta: true },
    notas: 'Hojas arrugadas = sed (raro); hojas blandas y caídas = exceso de agua (habitual). Distinguirlo bien salva la planta.',
  },
  {
    id: 'kentia', nombre: 'Kentia', cientifico: 'Howea forsteriana', familia: 'Arecaceae',
    sinonimos: ['kentia', 'palmera kentia', 'howea'],
    tipo: 'palmera', dli: { min: 2.5, opt: 8, max: 16 }, gsFactor: 0.85, mad: 0.5,
    tempC: [12, 22, 30], hrMin: 45, ceMax: 1.2, sustrato: 'aireado', ph: [6.0, 7.0],
    dormancia: 'leve', toxica: false,
    rasgos: { forma: 'palmera', hoja: 'pinnada arqueada', variegada: false, suculenta: false },
    notas: 'La palmera de interior más tolerante a la penumbra. Puntas secas: casi siempre humedad ambiental baja o sales acumuladas.',
  },
  {
    id: 'areca', nombre: 'Areca', cientifico: 'Dypsis lutescens', familia: 'Arecaceae',
    sinonimos: ['areca', 'palmera areca', 'chrysalidocarpus'],
    tipo: 'palmera', dli: { min: 4, opt: 12, max: 22 }, gsFactor: 1.1, mad: 0.45,
    tempC: [15, 23, 30], hrMin: 50, ceMax: 1.0, sustrato: 'aireado', ph: [6.0, 6.8],
    dormancia: 'leve', toxica: false,
    rasgos: { forma: 'palmera', hoja: 'pinnada erecta', variegada: false, suculenta: false },
    notas: 'Muy sensible al flúor y a las sales: puntas marrones constantes con agua del grifo dura.',
  },
  {
    id: 'poinsettia', nombre: 'Flor de Pascua', cientifico: 'Euphorbia pulcherrima', familia: 'Euphorbiaceae',
    sinonimos: ['flor de pascua', 'poinsettia', 'nochebuena'],
    tipo: 'arbusto de interior', dli: { min: 6, opt: 13, max: 24 }, gsFactor: 1.0, mad: 0.5,
    tempC: [14, 21, 28], hrMin: 45, ceMax: 1.4, sustrato: 'aireado', ph: [5.8, 6.5],
    dormancia: 'media', toxica: true,
    rasgos: { forma: 'arbusto', hoja: 'lobulada', variegada: false, suculenta: false },
    notas: 'Planta de día corto: para que vuelva a colorear necesita 14 h de oscuridad TOTAL al día durante 8 semanas en otoño.',
  },
  {
    id: 'hiedra', nombre: 'Hiedra', cientifico: 'Hedera helix', familia: 'Araliaceae',
    sinonimos: ['hiedra', 'hedera', 'yedra'],
    tipo: 'trepadora de hoja', dli: { min: 3, opt: 9, max: 20 }, gsFactor: 1.0, mad: 0.5,
    tempC: [2, 19, 28], hrMin: 45, ceMax: 1.4, sustrato: 'universal', ph: [6.0, 7.5],
    dormancia: 'media', toxica: true,
    rasgos: { forma: 'trepadora', hoja: 'lobulada', variegada: true, suculenta: false },
    notas: 'Prefiere fresco: por encima de 24 °C sufre y la araña roja la ataca casi sin falta.',
  },
  {
    id: 'aspidistra', nombre: 'Aspidistra', cientifico: 'Aspidistra elatior', familia: 'Asparagaceae',
    sinonimos: ['aspidistra', 'pilistra', 'planta de hierro'],
    tipo: 'herbácea de interior', dli: { min: 1, opt: 4, max: 10 }, gsFactor: 0.6, mad: 0.65,
    tempC: [5, 20, 30], hrMin: 30, ceMax: 1.5, sustrato: 'universal', ph: [5.5, 7.0],
    dormancia: 'media', toxica: false,
    rasgos: { forma: 'mata', hoja: 'lanceolada erecta', variegada: false, suculenta: false },
    notas: 'La planta que tolera los rincones más oscuros que existen. Crece lentísimo: no la sobreabonces esperando prisa.',
  },
  {
    id: 'tradescantia', nombre: 'Tradescantia', cientifico: 'Tradescantia zebrina', familia: 'Commelinaceae',
    sinonimos: ['tradescantia', 'zebrina', 'amor de hombre'],
    tipo: 'herbácea de interior', dli: { min: 4, opt: 10, max: 20 }, gsFactor: 1.1, mad: 0.5,
    tempC: [10, 22, 30], hrMin: 40, ceMax: 1.5, sustrato: 'universal', ph: [5.5, 6.8],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'mata colgante', hoja: 'ovalada morada', variegada: true, suculenta: false },
    notas: 'Si pierde el morado y se ve verde, le falta luz. Se pela por la base: pinza a menudo para que ramifique.',
  },
  {
    id: 'peperomia', nombre: 'Peperomia', cientifico: 'Peperomia obtusifolia', familia: 'Piperaceae',
    sinonimos: ['peperomia'],
    tipo: 'suculenta', dli: { min: 2.5, opt: 7, max: 14 }, gsFactor: 0.45, mad: 0.7,
    tempC: [14, 22, 29], hrMin: 40, ceMax: 1.2, sustrato: 'aireado', ph: [5.8, 6.5],
    dormancia: 'leve', toxica: false,
    rasgos: { forma: 'mata', hoja: 'carnosa redondeada', variegada: true, suculenta: true },
    notas: 'Hoja semisuculenta y raíz muy fina: se pudre con facilidad. Maceta pequeña y sustrato muy aireado.',
  },
  {
    id: 'ficus_benjamina', nombre: 'Ficus benjamina', cientifico: 'Ficus benjamina', familia: 'Moraceae',
    sinonimos: ['benjamina', 'ficus benjamina'],
    tipo: 'arbusto de interior', dli: { min: 5, opt: 11, max: 20 }, gsFactor: 1.0, mad: 0.5,
    tempC: [13, 22, 30], hrMin: 45, ceMax: 1.5, sustrato: 'aireado', ph: [6.0, 6.8],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'arbolito', hoja: 'pequeña ovalada', variegada: true, suculenta: false },
    notas: 'Suelta hojas en masa a cualquier cambio (sitio, riego, corriente). Si el cambio es reciente, espera antes de tocar nada más.',
  },
  {
    id: 'alocasia', nombre: 'Alocasia', cientifico: 'Alocasia amazonica', familia: 'Araceae',
    sinonimos: ['alocasia', 'oreja de elefante', 'polly'],
    tipo: 'herbácea de interior', dli: { min: 4, opt: 9, max: 16 }, gsFactor: 1.2, mad: 0.4,
    tempC: [17, 24, 30], hrMin: 60, ceMax: 1.1, sustrato: 'aroide', ph: [5.5, 6.5],
    dormancia: 'fuerte', toxica: true,
    rasgos: { forma: 'mata', hoja: 'sagitada nervios marcados', variegada: true, suculenta: false },
    notas: 'En invierno puede perder toda la hoja y quedar en tubérculo: no está muerta, está durmiendo. Reduce el riego al mínimo y no la tires.',
  },
  {
    id: 'cheflera', nombre: 'Cheflera', cientifico: 'Schefflera arboricola', familia: 'Araliaceae',
    sinonimos: ['cheflera', 'schefflera', 'árbol paraguas'],
    tipo: 'arbusto de interior', dli: { min: 3.5, opt: 10, max: 20 }, gsFactor: 0.9, mad: 0.55,
    tempC: [13, 22, 30], hrMin: 40, ceMax: 1.6, sustrato: 'aireado', ph: [6.0, 6.8],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'arbusto', hoja: 'palmeada foliolos', variegada: true, suculenta: false },
    notas: 'Con poca luz se estira y se despuebla por abajo. Tolera bien la poda de formación.',
  },
  {
    id: 'crotón', nombre: 'Crotón', cientifico: 'Codiaeum variegatum', familia: 'Euphorbiaceae',
    sinonimos: ['croton', 'codiaeum'],
    tipo: 'arbusto de interior', dli: { min: 8, opt: 16, max: 28 }, gsFactor: 1.0, mad: 0.45,
    tempC: [16, 23, 30], hrMin: 55, ceMax: 1.4, sustrato: 'aireado', ph: [5.8, 6.5],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'arbusto', hoja: 'coriácea multicolor', variegada: true, suculenta: false },
    notas: 'El color depende directamente de la luz: en penumbra revierte a verde. Muy sensible a corrientes frías.',
  },
  {
    id: 'gardenia', nombre: 'Gardenia', cientifico: 'Gardenia jasminoides', familia: 'Rubiaceae',
    sinonimos: ['gardenia', 'jazmin del cabo'],
    tipo: 'arbusto de interior', dli: { min: 8, opt: 16, max: 28 }, gsFactor: 1.1, mad: 0.4,
    tempC: [13, 21, 29], hrMin: 55, ceMax: 1.0, sustrato: 'universal', ph: [5.0, 6.0],
    dormancia: 'media', toxica: false,
    rasgos: { forma: 'arbusto', hoja: 'brillante oscura', variegada: false, suculenta: false },
    notas: 'Acidófila estricta: con agua dura amarillea sin remedio. Necesita agua de lluvia y sustrato para acidófilas.',
  },
  {
    id: 'hortensia', nombre: 'Hortensia', cientifico: 'Hydrangea macrophylla', familia: 'Hydrangeaceae',
    sinonimos: ['hortensia', 'hydrangea'],
    tipo: 'arbusto de exterior', dli: { min: 8, opt: 18, max: 30 }, gsFactor: 1.5, mad: 0.3,
    tempC: [-10, 20, 30], hrMin: 50, ceMax: 1.4, sustrato: 'universal', ph: [4.5, 6.5],
    dormancia: 'fuerte', toxica: true,
    rasgos: { forma: 'arbusto', hoja: 'grande dentada', variegada: false, suculenta: false },
    notas: 'El color de la flor lo decide el pH: azul en suelo ácido con aluminio disponible, rosa en alcalino. Bebe muchísimo en verano.',
  },
  {
    id: 'bonsai_ficus', nombre: 'Bonsái de ficus', cientifico: 'Ficus retusa', familia: 'Moraceae',
    sinonimos: ['bonsai', 'ficus retusa', 'bonsái'],
    tipo: 'bonsái', dli: { min: 6, opt: 14, max: 25 }, gsFactor: 1.0, mad: 0.35,
    tempC: [14, 23, 32], hrMin: 45, ceMax: 1.4, sustrato: 'akadama', ph: [6.0, 6.8],
    dormancia: 'leve', toxica: true,
    rasgos: { forma: 'arbolito', hoja: 'pequeña coriácea', variegada: false, suculenta: false },
    notas: 'Sustrato mineral de muy poco volumen: se seca rapidísimo y no perdona un olvido. Riego frecuente y corto.',
  },
  {
    id: 'clivia', nombre: 'Clivia', cientifico: 'Clivia miniata', familia: 'Amaryllidaceae',
    sinonimos: ['clivia'],
    tipo: 'herbácea de interior', dli: { min: 3, opt: 8, max: 15 }, gsFactor: 0.7, mad: 0.6,
    tempC: [5, 21, 30], hrMin: 35, ceMax: 1.4, sustrato: 'aireado', ph: [6.0, 6.8],
    dormancia: 'fuerte', toxica: true,
    rasgos: { forma: 'mata', hoja: 'cinta gruesa', variegada: false, suculenta: false },
    notas: 'Para que florezca necesita 6–8 semanas de frío (10–13 °C) y casi sin agua en invierno. Sin ese reposo no saca vara.',
  },
  {
    id: 'generica_verde', nombre: 'Planta verde de interior (genérica)', cientifico: '—', familia: '—',
    sinonimos: ['desconocida', 'generica'],
    tipo: 'herbácea de interior', dli: { min: 3, opt: 8, max: 16 }, gsFactor: 1.0, mad: 0.5,
    tempC: [13, 22, 30], hrMin: 45, ceMax: 1.4, sustrato: 'aireado', ph: [5.8, 6.8],
    dormancia: 'leve', toxica: null,
    rasgos: { forma: 'mata', hoja: 'variable', variegada: false, suculenta: false },
    notas: 'Perfil promedio de planta verde de interior. Sirve mientras identificas la especie: los cálculos ya son válidos, solo los umbrales son genéricos.',
  },
]

/** Busca especie por id. */
export function porId(id) {
  return ESPECIES.find((e) => e.id === id) ?? ESPECIES[ESPECIES.length - 1]
}

function normalizar(s) {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Empareja un nombre (científico o común, venga de Pl@ntNet o escrito a mano)
 * con la base local. Prueba especie exacta, luego género, luego familia, para
 * que una identificación de "Ficus benghalensis" caiga en el perfil de ficus
 * en vez de en el genérico.
 */
export function buscarEspecie(texto) {
  const q = normalizar(texto)
  if (!q) return null

  const exacta = ESPECIES.find(
    (e) => normalizar(e.cientifico) === q || normalizar(e.nombre) === q || e.sinonimos.some((s) => normalizar(s) === q)
  )
  if (exacta) return { especie: exacta, ajuste: 'exacto' }

  const parcial = ESPECIES.find(
    (e) => q.includes(normalizar(e.cientifico)) || normalizar(e.cientifico).includes(q) ||
      e.sinonimos.some((s) => q.includes(normalizar(s)))
  )
  if (parcial) return { especie: parcial, ajuste: 'aproximado' }

  const genero = q.split(/\s+/)[0]
  const porGenero = ESPECIES.find((e) => normalizar(e.cientifico).split(/\s+/)[0] === genero)
  if (porGenero) return { especie: porGenero, ajuste: 'género' }

  const porFamilia = ESPECIES.find((e) => normalizar(e.familia) === q)
  if (porFamilia) return { especie: porFamilia, ajuste: 'familia' }

  return null
}

/** Todas las especies que encajan con un texto libre (para el buscador). */
export function filtrar(texto) {
  const q = normalizar(texto)
  if (!q) return ESPECIES
  return ESPECIES.filter(
    (e) =>
      normalizar(e.nombre).includes(q) ||
      normalizar(e.cientifico).includes(q) ||
      normalizar(e.familia).includes(q) ||
      e.sinonimos.some((s) => normalizar(s).includes(q))
  )
}
