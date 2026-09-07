// ═══════════════════════════════════════════════════════
// photos.ts — 사진은 파일(Storage)로, 로컬·DB에는 URL만
// 기록 사진이 base64 문자열로 localStorage·동기화 blob·posts.photo_urls 에 들어가던 것을 끊는다.
// ═══════════════════════════════════════════════════════
import { supabase } from '@/lib/supabase'

const BUCKET = 'community'
const MAX_SIDE = 1080
const QUALITY = 0.8

export function isDataUrl(s: string | null | undefined): boolean {
  return typeof s === 'string' && s.startsWith('data:')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image()
    im.onload = () => res(im)
    im.onerror = () => rej(new Error('image decode failed'))
    im.src = src
  })
}

/** data URL → 최대 1080px webp Blob */
export async function dataUrlToWebp(dataUrl: string, maxSide = MAX_SIDE, quality = QUALITY): Promise<Blob> {
  const im = await loadImage(dataUrl)
  const scale = Math.min(1, maxSide / Math.max(im.width, im.height))
  const w = Math.round(im.width * scale), h = Math.round(im.height * scale)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(im, 0, 0, w, h)
  const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/webp', quality))
  if (!blob) throw new Error('webp encode failed')
  return blob
}

/**
 * 사진 1장 업로드 → 공개 URL. 경로 첫 폴더가 uid 여야 Storage RLS(update/delete)가 통한다.
 * 이미 URL이면 그대로 돌려준다.
 */
export async function uploadPhoto(userId: string, src: string, folder = 'ootd'): Promise<string> {
  if (!isDataUrl(src)) return src
  const blob = await dataUrlToWebp(src)
  const path = `${userId}/${folder}/${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** 여러 장. 하나라도 실패하면 throw (호출자가 재시도) */
export async function uploadPhotos(userId: string, srcs: string[], folder = 'ootd'): Promise<string[]> {
  const out: string[] = []
  for (const s of srcs) out.push(await uploadPhoto(userId, s, folder))
  return out
}
