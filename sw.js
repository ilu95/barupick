// 바루픽 Service Worker v2 (Push Notifications)
const CACHE_NAME = 'barupick-v2';
const SHELL_CACHE = 'barupick-shell-v2';
const IMG_CACHE = 'barupick-img-v1';

// 앱 셸 (필수 파일)
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// CDN 리소스 (자주 안 바뀜)
const CDN_FILES = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/lucide/0.263.1/umd/lucide.min.js'
];

// 설치: 앱 셸 캐시
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      return cache.addAll(SHELL_FILES).catch(err => {
        console.warn('Shell cache partial fail:', err);
      });
    })
  );
  self.skipWaiting();
});

// 활성화: 오래된 캐시 정리
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== SHELL_CACHE && k !== IMG_CACHE && k !== CACHE_NAME)
            .map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// ── 푸시 알림 수신 ──
self.addEventListener('push', e => {
  if (!e.data) return;

  let payload;
  try {
    payload = e.data.json();
  } catch (err) {
    payload = { title: '바루픽', body: e.data.text() || '새 알림이 있어요' };
  }

  const typeIcons = {
    like: '❤️', comment: '💬', follow: '👤',
    friend: '👫', save: '💾', system: '📢'
  };
  const emoji = typeIcons[payload.type] || '🔔';
  const title = payload.title || '바루픽';
  const body = (emoji + ' ' + (payload.body || '새 알림이 있어요')).trim();

  const options = {
    body: body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.noti_id || 'barupick-' + Date.now(),
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      type: payload.type || 'system',
      related_id: payload.related_id || null,
      url: '/'
    },
    actions: payload.type === 'follow' || payload.type === 'friend'
      ? [{ action: 'view', title: '프로필 보기' }]
      : payload.type === 'like' || payload.type === 'comment' || payload.type === 'save'
        ? [{ action: 'view', title: '게시물 보기' }]
        : []
  };

  e.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── 알림 클릭 처리 ──
self.addEventListener('notificationclick', e => {
  e.notification.close();

  const data = e.notification.data || {};
  let targetUrl = '/';

  // 타입별 딥링크 (앱 내 라우팅은 클라이언트에서 처리)
  if (data.type === 'follow' || data.type === 'friend') {
    targetUrl = '/?screen=notifications';
  } else if (data.related_id && (data.type === 'like' || data.type === 'comment' || data.type === 'save')) {
    targetUrl = '/?screen=notifications';
  } else {
    targetUrl = '/?screen=notifications';
  }

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // 이미 열려있는 창 포커스
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'PUSH_CLICK', data: data });
          return;
        }
      }
      // 없으면 새 창 열기
      return clients.openWindow(targetUrl);
    })
  );
});

// ── 푸시 구독 변경 (브라우저가 구독 갱신 시) ──
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil(
    self.registration.pushManager.subscribe(e.oldSubscription.options).then(sub => {
      // 새 구독 정보를 서버에 전달
      return fetch('/api/push-resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON())
      }).catch(() => {});
    })
  );
});

// ── 요청 처리 (캐싱) ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // POST, PUT 등 → 네트워크만
  if (e.request.method !== 'GET') return;

  // Supabase API → 네트워크만 (실시간 데이터)
  if (url.hostname.includes('supabase.co')) return;

  // 날씨 API → 네트워크만
  if (url.hostname.includes('open-meteo.com')) return;

  // 이미지 → 캐시 우선 (Supabase Storage 이미지 포함)
  if (isImage(url)) {
    e.respondWith(cacheFirst(e.request, IMG_CACHE, 60 * 60 * 24 * 7)); // 7일
    return;
  }

  // CDN → 캐시 우선
  if (isCDN(url)) {
    e.respondWith(cacheFirst(e.request, CACHE_NAME, 60 * 60 * 24 * 30)); // 30일
    return;
  }

  // 앱 셸 (HTML) → 네트워크 우선 + 캐시 폴백
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(networkFirst(e.request, SHELL_CACHE));
    return;
  }

  // 기타 → stale-while-revalidate
  e.respondWith(staleWhileRevalidate(e.request, CACHE_NAME));
});

// ── 클라이언트 메시지 수신 ──
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── 전략 함수들 ──

// 캐시 우선
async function cacheFirst(request, cacheName, maxAge) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// 네트워크 우선 + 캐시 폴백
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // 오프라인 폴백
    return new Response(offlineHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// stale-while-revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      caches.open(cacheName).then(cache => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || new Response('', { status: 408 });
}

// ── 유틸 ──

function isImage(url) {
  const ext = url.pathname.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext) ||
         url.hostname.includes('supabase.co') && url.pathname.includes('/storage/');
}

function isCDN(url) {
  return ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 
          'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
}

function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>바루픽 - 오프라인</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#F7F5F2;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
  .wrap{text-align:center;max-width:320px}
  .icon{font-size:48px;margin-bottom:16px}
  h1{font-size:20px;color:#44403C;margin-bottom:8px}
  p{font-size:14px;color:#78716C;line-height:1.6;margin-bottom:24px}
  button{padding:12px 32px;background:#A8613F;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer}
  button:active{transform:scale(0.97)}
</style>
</head>
<body>
<div class="wrap">
  <div class="icon">📡</div>
  <h1>오프라인 상태예요</h1>
  <p>인터넷 연결을 확인하고 다시 시도해주세요.<br>저장된 코디는 연결 후 복구됩니다.</p>
  <button onclick="location.reload()">다시 시도</button>
</div>
</body>
</html>`;
}
