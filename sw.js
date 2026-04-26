// AquaMarina Service Worker v1.0
// Permite funcionamiento offline y caché de recursos

const CACHE_NAME = 'aquamarina-v1';
const URLS_TO_CACHE = [
  '/Aquamarina/',
  '/Aquamarina/index.html',
  '/Aquamarina/manifest.json',
  '/Aquamarina/icon-192.png',
  '/Aquamarina/icon-512.png'
];

// Instalar: guardar recursos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando recursos AquaMarina');
      return cache.addAll(URLS_TO_CACHE).catch(err => {
        console.warn('[SW] Algunos recursos no se cachearon:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activar: limpiar cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: servir desde caché cuando no hay internet
self.addEventListener('fetch', event => {
  // Solo interceptar peticiones al mismo origen
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Firebase y CDN — siempre ir a la red
  const url = event.request.url;
  if (url.includes('firebase') || url.includes('gstatic') || url.includes('googleapis')) {
    event.respondWith(fetch(event.request).catch(() => new Response('')));
    return;
  }

  // Estrategia: Network first, caché como respaldo
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar en caché si es exitosa
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Sin internet: servir desde caché
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback: servir index.html para navegación
          if (event.request.mode === 'navigate') {
            return caches.match('/Aquamarina/index.html');
          }
          return new Response('Sin conexión', { status: 503 });
        });
      })
  );
});

// Sincronización en background cuando vuelve el internet
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Sincronizando datos en background...');
  }
});
