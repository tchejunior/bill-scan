export interface ViewTransform {
  scale: number
  tx: number
  ty: number
}

export function zoomAt(
  t: ViewTransform,
  cx: number,
  cy: number,
  factor: number,
  minScale: number,
  maxScale: number,
): ViewTransform {
  const scale = Math.min(Math.max(t.scale * factor, minScale), maxScale)
  const ratio = scale / t.scale
  return {
    scale,
    tx: cx - (cx - t.tx) * ratio,
    ty: cy - (cy - t.ty) * ratio,
  }
}

export function fitTransform(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
): ViewTransform {
  const scale = Math.min(containerW / imageW, containerH / imageH)
  return {
    scale,
    tx: (containerW - imageW * scale) / 2,
    ty: (containerH - imageH * scale) / 2,
  }
}
