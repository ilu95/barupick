const CACHE_NAME = 'barupick-v11';
const SHELL = ['/', '/index.html', '/manifest.json'];

// Install: 앱 셸 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

// Activate: 이전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// 전략
// - 다른 출처(Supabase, open-meteo 등)와 GET 이 아닌 요청: 건드리지 않는다 (앱이 직접 실패를 처리)
// - /assets/ 의 해시 파일(js/css/폰트/이미지): cache-first — 내용이 바뀌면 파일명이 바뀌므로 안전하고, 온라인에서도 네트워크를 기다리지 않는다
// - /char/ 캐릭터 그림·카탈로그(?v= 버전): cache-first — 캐릭터 한 장에 6~17장이 필요해 네트워크를 기다리면 목록 화면이 느려진다
// - 페이지 이동(navigate): network-first, 실패하면 캐시된 index.html — 오프라인에서도 첫 화면이 뜬다
// - 그 외 같은 출처 GET: network-first, 실패 시 캐시
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/char/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, clone)); }
        return res;
      }))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((res) => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then((c) => c.put('/index.html', clone)); }
        return res;
      }).catch(() => caches.match('/index.html').then((c) => c || new Response('Offline', { status: 503 })))
    );
    return;
  }

  event.respondWith(
    fetch(request).then((res) => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, clone)); }
      return res;
    }).catch(() => caches.match(request).then((c) => c || new Response('Offline', { status: 503 })))
  );
});
