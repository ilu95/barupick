// ================================================================
// coordCard.ts — 오늘의 코디 카드 (루프 L1)
//
// 완성하면 자동으로 만들어지는 결과물. 캐릭터 + 점수 + 이유 태그 + 색 이름 +
// 날짜·기온 도장 + 워터마크·링크. 스토리 9:16(1080×1920), 피드 4:5(1080×1350).
// 옷은 스포일러가 아니라 자랑거리라 다 보여 주되, 점수와 이름이 "이유 있는
// 자랑"이 되게 한다 (마케팅이 필요 없는 구조 연구 6장).
// ================================================================
import * as R from './char/render3'
import { bootCharacter } from '@/components/mannequin/CharacterCanvas'
import type { CharScene } from './char/map'

export interface CardInput {
  scene: CharScene
  score: number
  grade: string
  tags: string[]
  colors: { hex: string; name: string }[]
  dateText: string
  stamp?: string
  handle?: string
  link: string
  watermark: string
}
export type CardRatio = 'story' | 'feed'

const FONT = 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif'

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
function pill(g: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, fill: string, color: string, font: string) {
  g.font = font; const w = g.measureText(text).width + h * .9
  rr(g, x, y, w, h, h / 2); g.fillStyle = fill; g.fill()
  g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, x + h * .45, y + h / 2 + 1)
  g.textBaseline = 'top'
  return w
}

export async function drawCoordCard(input: CardInput, ratio: CardRatio): Promise<string> {
  await bootCharacter()
  const fig = document.createElement('canvas')
  await R.render(fig, input.scene.items, input.scene.body)

  const W = 1080, H = ratio === 'story' ? 1920 : 1350
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#F3EEE6'); grad.addColorStop(.55, '#FAF8F5'); grad.addColorStop(1, '#FAF8F5')
  g.fillStyle = grad; g.fillRect(0, 0, W, H)
  g.textBaseline = 'top'

  // 상단: 핸들 · 날짜
  g.fillStyle = '#6E6862'; g.font = `600 30px ${FONT}`
  if (input.handle) g.fillText(input.handle, 72, 72)
  g.textAlign = 'right'; g.fillText(input.dateText, W - 72, 72); g.textAlign = 'left'

  // 도장
  if (input.stamp) {
    g.save(); g.translate(W - 72, 150); g.rotate(6 * Math.PI / 180)
    g.font = `800 30px ${FONT}`; const w = g.measureText(input.stamp).width + 40
    rr(g, -w, 0, w, 56, 12); g.lineWidth = 4; g.strokeStyle = '#C2785C'; g.stroke()
    g.fillStyle = '#C2785C'; g.textBaseline = 'middle'; g.fillText(input.stamp, -w + 20, 29); g.textBaseline = 'top'
    g.restore()
  }

  if (ratio === 'story') {
    // 캐릭터 크게, 아래에 점수 블록
    const fw = 700, fh = Math.round(fw * 1200 / 896)
    const fx = (W - fw) / 2, fy = 200
    g.save(); g.beginPath(); g.ellipse(W / 2, fy + fh - 10, 230, 28, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(28,25,23,.10)'; g.filter = 'blur(8px)'; g.fill(); g.restore()
    g.drawImage(fig, fx, fy, fw, fh)
    let y = fy + fh + 40
    g.fillStyle = '#1C1917'; g.font = `800 150px ${FONT}`; g.fillText(String(input.score), 72, y - 20)
    const sw = g.measureText(String(input.score)).width
    g.fillStyle = '#6E6862'; g.font = `600 34px ${FONT}`; g.fillText('/ 100', 72 + sw + 16, y + 92)
    g.fillStyle = '#1C1917'; g.font = `800 44px ${FONT}`; g.fillText(input.grade, 72, y + 150)
    let px = 72; const py = y + 218
    for (const tag of input.tags.slice(0, 3)) { px += pill(g, tag, px, py, 52, '#EFE9E0', '#57534E', `700 26px ${FONT}`) + 12 }
    // 색 칩
    const cy = py + 96
    input.colors.slice(0, 5).forEach((c, i) => {
      const x = 72 + i * 150
      g.beginPath(); g.arc(x + 40, cy + 40, 40, 0, Math.PI * 2); g.fillStyle = c.hex; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(28,25,23,.12)'; g.stroke()
      g.fillStyle = '#6E6862'; g.font = `600 24px ${FONT}`; g.textAlign = 'center'; g.fillText(c.name, x + 40, cy + 94); g.textAlign = 'left'
    })
  } else {
    // 피드: 왼쪽 캐릭터, 오른쪽 점수·태그, 아래 색 칩
    const fw = 470, fh = Math.round(fw * 1200 / 896)
    const fx = 60, fy = 170
    g.save(); g.beginPath(); g.ellipse(fx + fw / 2, fy + fh - 8, 160, 20, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(28,25,23,.10)'; g.filter = 'blur(8px)'; g.fill(); g.restore()
    g.drawImage(fig, fx, fy, fw, fh)
    const tx = fx + fw + 30; let y = fy + 120
    g.fillStyle = '#1C1917'; g.font = `800 132px ${FONT}`; g.fillText(String(input.score), tx, y)
    const sw = g.measureText(String(input.score)).width
    g.fillStyle = '#6E6862'; g.font = `600 30px ${FONT}`; g.fillText('/ 100', tx + sw + 14, y + 92)
    g.fillStyle = '#1C1917'; g.font = `800 40px ${FONT}`; g.fillText(input.grade, tx, y + 150)
    let py = y + 214
    for (const tag of input.tags.slice(0, 3)) { pill(g, tag, tx, py, 48, '#EFE9E0', '#57534E', `700 24px ${FONT}`); py += 60 }
    const cy = fy + fh + 40
    input.colors.slice(0, 5).forEach((c, i) => {
      const x = 72 + i * 190
      g.beginPath(); g.arc(x + 36, cy + 36, 36, 0, Math.PI * 2); g.fillStyle = c.hex; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(28,25,23,.12)'; g.stroke()
      g.fillStyle = '#6E6862'; g.font = `600 24px ${FONT}`; g.fillText(c.name, x + 84, cy + 24)
    })
  }

  // 워터마크 · 링크
  g.fillStyle = '#6E6862'; g.font = `800 26px ${FONT}`; g.fillText('BARUPICK', 72, H - 96)
  g.font = `500 26px ${FONT}`; g.fillText('· ' + input.watermark, 72 + 150, H - 96)
  g.textAlign = 'right'; g.fillText(input.link, W - 72, H - 96); g.textAlign = 'left'
  return cv.toDataURL('image/png')
}

/** dataURL → 공유 시트(파일) → 안 되면 다운로드 */
export async function shareDataUrl(url: string, filename: string, title: string): Promise<'shared' | 'downloaded'> {
  try {
    const blob = await (await fetch(url)).blob()
    const file = new File([blob], filename, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title }); return 'shared' }
  } catch {}
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  return 'downloaded'
}

/** 투표 링크 미리보기용 OG 카드 1200×630 — 카톡 미리보기에서 그대로 보인다. 후보 1~4벌 */
export async function drawVoteOg(sides: { scene: CharScene; label?: string }[], question: string, sub: string): Promise<string> {
  await bootCharacter()
  const figs = await Promise.all(sides.map(async s => { const cv = document.createElement('canvas'); await R.render(cv, s.scene.items, s.scene.body); return cv }))
  const W = 1200, H = 630
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, W, H); grad.addColorStop(0, '#F3EEE6'); grad.addColorStop(1, '#FAF8F5')
  g.fillStyle = grad; g.fillRect(0, 0, W, H)
  g.textBaseline = 'top'
  const LET = 'ABCD'
  const badge = (letter: string, x: number, y: number, r = 26) => {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = '#1C1917'; g.fill()
    g.fillStyle = '#FFFFFF'; g.font = `800 ${Math.round(r * 1.05)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, x, y + 1); g.textAlign = 'left'; g.textBaseline = 'top'
  }
  const shadow = (x: number, y: number, fw: number, fh: number) => {
    g.save(); g.beginPath(); g.ellipse(x + fw / 2, y + fh - 6, fw * .38, 14, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(28,25,23,.10)'; g.filter = 'blur(6px)'; g.fill(); g.restore()
  }
  const PILL = '앱 없이 · 한 번만 누르면 돼요'
  const n = figs.length
  if (n <= 2) {
    // 왼쪽 글 · 오른쪽 캐릭터 1~2
    g.fillStyle = '#6E6862'; g.font = `800 24px ${FONT}`; g.fillText('BARUPICK', 64, 56)
    g.fillStyle = '#1C1917'; g.font = `800 60px ${FONT}`
    const words = question.split(' '); let line = ''; let y = 120
    for (const w of words) { const test = line ? line + ' ' + w : w; if (g.measureText(test).width > 470 && line) { g.fillText(line, 64, y); line = w; y += 72 } else line = test }
    if (line) { g.fillText(line, 64, y); y += 72 }
    g.fillStyle = '#57534E'; g.font = `500 28px ${FONT}`; g.fillText(sub, 64, y + 12)
    pill(g, PILL, 64, H - 130, 56, '#1C1917', '#FFFFFF', `700 24px ${FONT}`)
    const fh = 560, fw = Math.round(fh * 896 / 1200)
    const xs = n === 2 ? [W - 64 - fw * 2 - 24, W - 64 - fw] : [W - 64 - fw]
    figs.forEach((f, i) => {
      const x = xs[i], fy = 40
      shadow(x, fy, fw, fh)
      g.drawImage(f, x, fy, fw, fh)
      if (n === 2) badge(LET[i], x + 56, fy + 60)
      const lab = sides[i].label || LET[i]
      g.font = `700 22px ${FONT}`; const lw = g.measureText(lab).width + 36
      pill(g, lab, x + fw / 2 - lw / 2, fy + fh - 40, 40, 'rgba(255,255,255,.92)', '#1C1917', `700 22px ${FONT}`)
    })
  } else {
    // 위에 글 한 줄 · 아래에 캐릭터 3~4벌 나란히 (A·B·C·D 뱃지)
    g.fillStyle = '#6E6862'; g.font = `800 24px ${FONT}`; g.fillText('BARUPICK', 64, 48)
    g.font = `700 22px ${FONT}`; const pw = g.measureText(PILL).width + 44
    pill(g, PILL, W - 64 - pw, 44, 50, '#1C1917', '#FFFFFF', `700 22px ${FONT}`)
    g.fillStyle = '#1C1917'; g.font = `800 52px ${FONT}`
    let q = question; while (q.length > 2 && g.measureText(q).width > W - 128 - pw - 24) q = q.slice(0, -2) + '…'
    g.fillText(q, 64, 84)
    g.fillStyle = '#57534E'; g.font = `500 26px ${FONT}`; g.fillText(sub, 64, 150)
    const fh = 400, fw = Math.round(fh * 896 / 1200), gap = 20
    const total = n * fw + (n - 1) * gap, x0 = Math.round((W - total) / 2), fy = H - fh - 24
    figs.forEach((f, i) => {
      const x = x0 + i * (fw + gap)
      shadow(x, fy, fw, fh)
      g.drawImage(f, x, fy, fw, fh)
      badge(LET[i], x + 44, fy + 44, 24)
      const lab = sides[i].label || LET[i]
      g.font = `700 20px ${FONT}`; const lw = Math.min(fw - 8, g.measureText(lab).width + 34)
      pill(g, lab, x + fw / 2 - lw / 2, fy + fh - 34, 36, 'rgba(255,255,255,.92)', '#1C1917', `700 20px ${FONT}`)
    })
  }
  return cv.toDataURL('image/jpeg', .86)   // 미리보기 전용 — PNG 570KB 가 JPEG 100KB 안팎으로, 모바일 업로드가 빨라진다
}
