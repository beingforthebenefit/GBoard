export type ThumborFit = 'cover' | 'contain'

const SHARPEN = 'filters:sharpen(0.6,0.5,true)'

export function buildThumborUrl(
  filename: string,
  width: number,
  height: number,
  fit: ThumborFit = 'cover'
): string {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  if (fit === 'contain') {
    return `/thumbor/unsafe/fit-in/${w}x${h}/${SHARPEN}/${filename}`
  }
  return `/thumbor/unsafe/${w}x${h}/${SHARPEN}/${filename}`
}
