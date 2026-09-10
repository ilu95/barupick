// ================================================================
// api/og/taste.js — 취향 링크(/t/:code)의 카톡 미리보기 (OG 태그). api/og/vote.js 와 같은 방식.
// 이미지는 앱이 링크를 만들 때 그려 Storage(vote-cards)에 올린 것(og_url)이다.
// ================================================================

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

async function loadShare(code) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  const q = `${url}/rest/v1/taste_shares?select=code,name,taste,og_url&code=eq.${encodeURIComponent(code)}&limit=1`
  const r = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!r.ok) return null
  const rows = await r.json()
  return rows && rows[0] ? rows[0] : null
}

export default async function handler(req, res) {
  const code = String((req.query && req.query.code) || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12)
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host || 'barupick.vercel.app'}`
  const pageUrl = `${origin}/t/${code}`
  let share = null
  try { share = code ? await loadShare(code) : null } catch { share = null }

  const who = share && share.name ? share.name : '친구'
  const tasteName = share && share.taste && share.taste.name ? share.taste.name : '컬러 취향'
  const title = share ? `${who}의 컬러 취향 · ${tasteName}` : '내 컬러 취향은?'
  const desc = (share && share.taste && share.taste.tag ? share.taste.tag + ' ' : '') + '너는 어떤 취향? 30초면 둘의 겹치는 옷장이 나와요 · 앱 없이 바로'
  const image = (share && share.og_url) || `${origin}/icon-512.png`
  const [w, h] = share && share.og_url ? [1200, 630] : [512, 512]

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
