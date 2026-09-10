// ================================================================
// tasteCard.ts — 취향 링크 미리보기(OG 1200×630)와 취향 비교 카드(4:5 1080×1350)
// coordCard.ts 와 같은 결(배경·글꼴·워터마크). 캐릭터는 실제 렌더러로 그린다.
// ================================================================
import * as R from './char/render3'
import { bootCharacter } from '@/components/mannequin/CharacterCanvas'
import { COLORS_60, getColorName } from './colors'
import { sceneFromLook, type TasteProfile, type Compare } from './tasteShare'

const FONT = 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif'
function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
function pill(g: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, fill: string, color: string, font: string) {
  g.font = font; const w = g.measureText(text).width + h * .9
  rr(g, x, y, w, h, h / 2); g.fillStyle = fill; g.fill()
  g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, x + h * .45, y + h / 2 + 1); g.textBaseline = 'top'
  return w
}
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 3) {
  let line = ''; let yy = y; let n = 0
  for (const ch of text.split('')) { const test = line + ch; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = ch; yy += lh; if (++n >= maxLines - 1) break } else line = test }
  if (line) g.fillText(line.length && n >= maxLines - 1 && g.measureText(line).width > maxW ? line.slice(0, -1) + '…' : line, x, yy)
  return yy + lh
}
async function fig(profile: TasteProfile): Promise<HTMLCanvasElement> {
  const cv = document.createElement('canvas'); const s = sceneFromLook(profile.look, profile.sex); await R.render(cv, s.items, s.body); return cv
}
function dots(g: CanvasRenderingContext2D, keys: string[], x: number, y: number, r: number, gap: number) {
  keys.forEach((k, i) => { g.beginPath(); g.arc(x + r + i * (r * 2 + gap), y + r, r, 0, Math.PI * 2); g.fillStyle = COLORS_60[k]?.hex || '#ccc'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(28,25,23,.12)'; g.stroke() })
}

/** 카톡 미리보기: "지원의 컬러 취향 · 또렷한 뮤트 클래식 / 너는? 30초" + 캐릭터 */
export async function drawTasteOg(profile: TasteProfile, ownerName: string, eyebrow: string, cta: string): Promise<string> {
  await bootCharacter()
  const f = await fig(profile)
  const W = 1200, H = 630
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, W, H); grad.addColorStop(0, '#F3EEE6'); grad.addColorStop(1, '#FAF8F5')
  g.fillStyle = grad; g.fillRect(0, 0, W, H); g.textBaseline = 'top'
  g.fillStyle = '#6E6862'; g.font = `800 24px ${FONT}`; g.fillText('BARUPICK', 64, 56)
  g.fillStyle = '#57534E'; g.font = `600 30px ${FONT}`; g.fillText(eyebrow, 64, 110)
  g.fillStyle = '#1C1917'; g.font = `800 64px ${FONT}`
  const y = wrap(g, profile.name, 64, 156, 640, 76, 2)
  g.fillStyle = '#57534E'; g.font = `500 26px ${FONT}`; wrap(g, profile.tag, 64, y + 8, 620, 36, 2)
  dots(g, profile.pal.slice(0, 6), 64, H - 230, 26, 14)
  pill(g, cta, 64, H - 130, 56, '#1C1917', '#FFFFFF', `700 24px ${FONT}`)
  const fh = 560, fw = Math.round(fh * 896 / 1200), x = W - 48 - fw, fy = 40
  g.save(); g.beginPath(); g.ellipse(x + fw / 2, fy + fh - 6, fw * .38, 14, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(28,25,23,.10)'; g.filter = 'blur(6px)'; g.fill(); g.restore()
  g.drawImage(f, x, fy, fw, fh)
  g.font = `700 22px ${FONT}`; const lw = g.measureText(ownerName).width + 36
  pill(g, ownerName, x + fw / 2 - lw / 2, fy + fh - 40, 40, 'rgba(255,255,255,.92)', '#1C1917', `700 22px ${FONT}`)
  return cv.toDataURL('image/png')
}

/** 비교 카드 4:5: 두 캐릭터 · 이름 · 취향 이름 · 팔레트 · 겹치는 옷장 N벌 · 일치 % · 한 줄 · 둘 다 좋아할 코디 3벌 */
export async function drawCompareCard(a: TasteProfile, aName: string, b: TasteProfile, bName: string, cmp: Compare, labels: { title: string; overlap: string; sim: string; both: string; link: string }, sex: 'm' | 'w'): Promise<string> {
  await bootCharacter()
  const [fa, fb] = await Promise.all([fig(a), fig(b)])
  const shared = await Promise.all(cmp.shared.map(async x => { const cv = document.createElement('canvas'); const s = sceneFromLook({ p: x.card.p as Record<string, string>, key: x.card.key }, sex); await R.render(cv, s.items, s.body); return cv }))
  const W = 1080, H = 1350
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#F3EEE6'); grad.addColorStop(1, '#FAF8F5')
  g.fillStyle = grad; g.fillRect(0, 0, W, H); g.textBaseline = 'top'
  g.fillStyle = '#6E6862'; g.font = `600 28px ${FONT}`; g.fillText(labels.title, 72, 64)
  g.fillStyle = '#1C1917'; g.font = `800 64px ${FONT}`; g.fillText(`${aName} × ${bName}`, 72, 104)
  // 두 사람
  const fw = 330, fh = Math.round(fw * 1200 / 896), fy = 200
  ;[[fa, a, aName, 72], [fb, b, bName, W - 72 - fw]].forEach(([f, p, name, x]: any) => {
    g.save(); g.beginPath(); g.ellipse(x + fw / 2, fy + fh - 6, fw * .36, 12, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(28,25,23,.10)'; g.filter = 'blur(6px)'; g.fill(); g.restore()
    g.drawImage(f, x, fy, fw, fh)
    g.fillStyle = '#1C1917'; g.font = `800 34px ${FONT}`; g.fillText(name, x, fy + fh + 14)
    g.fillStyle = '#57534E'; g.font = `600 24px ${FONT}`; g.fillText(p.name, x, fy + fh + 58)
    dots(g, p.pal.slice(0, 5), x, fy + fh + 98, 18, 10)
  })
  // 가운데 관계
  const mx = W / 2, my = fy + 120
  rr(g, mx - 130, my, 260, 150, 28); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(28,25,23,.10)'; g.stroke()
  g.textAlign = 'center'; g.fillStyle = '#1C1917'; g.font = `800 60px ${FONT}`; g.fillText(String(cmp.overlap), mx, my + 18)
  g.fillStyle = '#57534E'; g.font = `600 24px ${FONT}`; g.fillText(labels.overlap, mx, my + 86)
  g.fillStyle = '#6E6862'; g.font = `600 22px ${FONT}`; g.fillText(`${labels.sim} ${cmp.sim}%`, mx, my + 116); g.textAlign = 'left'
  // 한 줄
  g.fillStyle = '#1C1917'; g.font = `500 30px ${FONT}`; let y = wrap(g, cmp.sentence, 72, fy + fh + 150, W - 144, 42, 3)
  // 둘 다 좋아할 코디
  y += 16
  g.fillStyle = '#6E6862'; g.font = `700 24px ${FONT}`; g.fillText(labels.both, 72, y); y += 40
  const sw = 200, sh = Math.round(sw * 1200 / 896)
  shared.forEach((f, i) => {
    const x = 72 + i * (sw + 24)
    g.drawImage(f, x, y, sw, sh)
    g.fillStyle = '#1C1917'; g.font = `800 26px ${FONT}`; g.fillText(String(cmp.shared[i].card.total), x + 8, y + sh + 8)
    g.fillStyle = '#6E6862'; g.font = `500 20px ${FONT}`; g.fillText(['outer', 'top', 'bottom'].filter(s => cmp.shared[i].card.key[s]).slice(0, 2).map(s => getColorName(cmp.shared[i].card.key[s])).join(' · '), x + 8, y + sh + 42)
  })
  g.fillStyle = '#6E6862'; g.font = `800 26px ${FONT}`; g.fillText('BARUPICK', 72, H - 96)
  g.textAlign = 'right'; g.font = `500 26px ${FONT}`; g.fillText(labels.link, W - 72, H - 96); g.textAlign = 'left'
  return cv.toDataURL('image/png')
}
