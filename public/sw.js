const offlineMessage = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>안심이</title><body style="margin:2rem;font-family:sans-serif;background:#eef2e9;color:#183b36"><h1>인터넷에 연결해주세요</h1><p>지도와 귀가 안내를 불러오려면 연결이 필요합니다.</p><a href="/">다시 시도</a></body></html>`

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.mode !== 'navigate' || new URL(request.url).origin !== self.location.origin) return
  event.respondWith(fetch(request).catch(() => new Response(offlineMessage, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })))
})
