// Lector de EXIF sin dependencias: recorre los segmentos JPEG hasta APP1 y
// extrae los parámetros de exposición. Son la clave de todo: con la apertura,
// el tiempo y el ISO con que la cámara tomó la foto se puede reconstruir la
// luminancia real de la escena (ver lightmeter.js). El móvil ya es un
// fotómetro calibrado de fábrica; solo hay que leer lo que anota.

const TAGS = {
  0x829a: 'exposureTime',
  0x829d: 'fNumber',
  0x8827: 'iso',
  0x8833: 'isoSpeed',
  0x9201: 'shutterSpeedValue',
  0x9202: 'apertureValue',
  0x9203: 'brightnessValue',
  0x9204: 'exposureBias',
  0x9003: 'dateTimeOriginal',
  0x9004: 'dateTimeDigitized',
  0x920a: 'focalLength',
  0xa002: 'pixelXDimension',
  0xa003: 'pixelYDimension',
  0x9209: 'flash',
  0x010f: 'make',
  0x0110: 'model',
}

const GPS_TAGS = {
  0x0001: 'latRef',
  0x0002: 'lat',
  0x0003: 'lonRef',
  0x0004: 'lon',
}

function readRational(view, offset, le, signed) {
  const num = signed ? view.getInt32(offset, le) : view.getUint32(offset, le)
  const den = signed ? view.getInt32(offset + 4, le) : view.getUint32(offset + 4, le)
  return den === 0 ? 0 : num / den
}

function readValue(view, entry, le, tiffStart) {
  const type = view.getUint16(entry + 2, le)
  const count = view.getUint32(entry + 4, le)
  const SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }
  const size = (SIZES[type] ?? 1) * count
  const at = size > 4 ? tiffStart + view.getUint32(entry + 8, le) : entry + 8
  if (at + size > view.byteLength) return null

  switch (type) {
    case 1:
    case 7: return view.getUint8(at)
    case 2: {
      let s = ''
      for (let i = 0; i < count - 1; i++) s += String.fromCharCode(view.getUint8(at + i))
      return s
    }
    case 3: return view.getUint16(at, le)
    case 4: return view.getUint32(at, le)
    case 5:
      if (count > 1) {
        const arr = []
        for (let i = 0; i < count; i++) arr.push(readRational(view, at + i * 8, le, false))
        return arr
      }
      return readRational(view, at, le, false)
    case 9: return view.getInt32(at, le)
    case 10: return readRational(view, at, le, true)
    default: return null
  }
}

function readIFD(view, start, le, tiffStart, tagMap, out) {
  if (start + 2 > view.byteLength) return null
  const n = view.getUint16(start, le)
  let exifIFD = null
  let gpsIFD = null
  for (let i = 0; i < n; i++) {
    const entry = start + 2 + i * 12
    if (entry + 12 > view.byteLength) break
    const tag = view.getUint16(entry, le)
    if (tag === 0x8769) exifIFD = view.getUint32(entry + 8, le)
    else if (tag === 0x8825) gpsIFD = view.getUint32(entry + 8, le)
    else if (tagMap[tag]) {
      const v = readValue(view, entry, le, tiffStart)
      if (v !== null) out[tagMap[tag]] = v
    }
  }
  return { exifIFD, gpsIFD }
}

function dms(arr, ref) {
  if (!Array.isArray(arr) || arr.length < 3) return null
  const deg = arr[0] + arr[1] / 60 + arr[2] / 3600
  return ref === 'S' || ref === 'W' ? -deg : deg
}

/**
 * Extrae los datos EXIF útiles de un JPEG.
 * Devuelve {} si la imagen no los lleva (capturas de pantalla, PNG, fotos
 * reenviadas por mensajería, que suelen venir sin metadatos).
 */
export async function readExif(blob) {
  try {
    const buf = await blob.slice(0, 256 * 1024).arrayBuffer()
    const view = new DataView(buf)
    if (view.getUint16(0, false) !== 0xffd8) return {}

    let off = 2
    while (off + 4 < view.byteLength) {
      const marker = view.getUint16(off, false)
      const len = view.getUint16(off + 2, false)
      if (marker === 0xffe1) {
        // "Exif\0\0" y a continuación la cabecera TIFF.
        const tiff = off + 10
        if (tiff + 8 > view.byteLength) return {}
        const le = view.getUint16(tiff, false) === 0x4949
        const ifd0 = view.getUint32(tiff + 4, le)
        const out = {}
        const { exifIFD, gpsIFD } = readIFD(view, tiff + ifd0, le, tiff, TAGS, out) ?? {}
        if (exifIFD) readIFD(view, tiff + exifIFD, le, tiff, TAGS, out)
        if (gpsIFD) {
          const g = {}
          readIFD(view, tiff + gpsIFD, le, tiff, GPS_TAGS, g)
          const lat = dms(g.lat, g.latRef)
          const lon = dms(g.lon, g.lonRef)
          if (lat !== null) out.lat = lat
          if (lon !== null) out.lon = lon
        }
        if (out.isoSpeed && !out.iso) out.iso = out.isoSpeed
        return out
      }
      if ((marker & 0xff00) !== 0xff00) break
      off += 2 + len
    }
    return {}
  } catch {
    return {}
  }
}

/** Fecha de captura EXIF ("2026:08:15 10:32:11") como Date, o null. */
export function exifDate(exif) {
  const s = exif?.dateTimeOriginal || exif?.dateTimeDigitized
  if (!s || typeof s !== 'string') return null
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
}

/** ¿Trae la foto los tres parámetros necesarios para medir luz? */
export function hasExposure(exif) {
  return Boolean(exif?.exposureTime > 0 && exif?.fNumber > 0 && exif?.iso > 0)
}
