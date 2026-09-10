// ================================================================
// api/og/vote.js — 웹 투표 링크의 카톡·페북·슬랙 미리보기 (OG 태그)
//
// 한국에서 공유의 대부분은 카톡 1:1·단톡이고, 거기서 보이는 건 링크 미리보기다.
// SPA 는 주소마다 다른 og:image 를 못 넣으므로, vercel.json 이 크롤러 UA 의
// /v/:code 요청만 이 함수로 보낸다. 사람은 그대로 SPA 를 받는다.
// 이미지는 앱이 투표를 만들 때 그려서 Storage(vote-cards)에 올린 것(og_url)이다.
// 환경변수: VITE_SUPABASE_URL · VITE_SUPABASE_ANON_KEY (Vercel 프로젝트에 이미 있음)
// ================================================================

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

async function loadVote(code) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  const q = `${url}/rest/v1/coord_votes?select=code,question,situ,temp,og_url,a,b,sides,created_at&code=eq.${encodeURIComponent(code)}&limit=1`
  const r = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!r.ok) return null
  const rows = await r.json()
  return rows && rows[0] ? rows[0] : null
}

async function countAnswers(code, voteCodeToId) {
  return null // 답 수는 미리보기에 꼭 필요하지 않다 — 왕복 하나를 아낀다
}

export default async function handler(req, res) {
  const code = String((req.query && req.query.code) || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12)
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host || 'barupick.vercel.app'}`
  const pageUrl = `${origin}/v/${code}`
  let vote = null
  try { vote = code ? await loadVote(code) : null } catch { vote = null }

  const SITU = { work: '출근', daily: '일상', date: '데이트·모임', formal: '격식', active: '활동·여행', home: '집 앞' }
  const title = vote ? (vote.question || '이 코디 어때?') : '이 코디 어때?'
  const bits = vote ? [vote.temp != null ? `${vote.temp}°` : null, vote.situ ? SITU[vote.situ] || vote.situ : null].filter(Boolean) : []
  const n = vote ? (Array.isArray(vote.sides) && vote.sides.length >= 2 ? vote.sides.length : vote.b ? 2 : 1) : 2
  const desc = (n >= 3 ? `${n}벌 중 하나만 골라 줘` : n === 2 ? '둘 중 하나만 골라 줘' : '좋아요 / 별로 한 번만 눌러 줘') + (bits.length ? ' · ' + bits.join(' ') : '') + ' · 앱 없이 바로'
  const image = (vote && vote.og_url) || `${origin}/icon-512.png`
  const [w, h] = vote && vote.og_url ? [1200, 630] : [512, 512]

  const html = `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8">
<title>${esc(title)} · 바루픽</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="바루픽">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="${w}">
<meta property="og:image:height" content="${h}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(pageUrl)}">
</head><body>
<p><a href="${esc(pageUrl)}">${esc(title)}</a></p>
<script>location.replace(${JSON.stringify(pageUrl)})</script>
</body></html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')
  res.status(200).send(html)
}
