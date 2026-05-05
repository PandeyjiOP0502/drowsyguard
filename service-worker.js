/**
 * service-worker.js
 * 
 * Service Worker for offline support of DrowsyGuard.
 * Caches MediaPipe and app assets for offline use.
 */

const CACHE_NAME = 'drowsyguard-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/fahhhhh.mp3',
  '/js/app.js',
  '/js/audio.js',
  '/js/config.js',
  '/js/detector.js',
  '/js/draw.js',
  '/js/math.js',
  '/js/ui.js',
  // MediaPipe from vendor directory (vendored local assets)
  '/vendor/mediapipe/face_mesh/face_mesh.js',
  '/vendor/mediapipe/camera_utils/camera_utils.js',
  '/vendor/mediapipe/face_mesh/face_mesh.binarypb',
  '/vendor/mediapipe/face_mesh/face_mesh_solution_packed_assets_loader.js',
  '/vendor/mediapipe/face_mesh/face_mesh_solution_packed_assets.data',
  '/vendor/mediapipe/face_mesh/face_mesh_solution_simd_wasm_bin.js',
  '/vendor/mediapipe/face_mesh/face_mesh_solution_simd_wasm_bin.data',
  '/vendor/mediapipe/face_mesh/face_mesh_solution_simd_wasm_bin.wasm',
  '/vendor/mediapipe/face_mesh/face_mesh_solution_wasm_bin.js',
  '/vendor/mediapipe/face_mesh/face_mesh_solution_wasm_bin.wasm',
];

// Install: Cache all assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[ServiceWorker] Some assets failed to cache (may be expected for optional files):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[ServiceWorker] Serving from cache:', request.url);
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // Cache successful network responses for future use
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            request.method === 'GET'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          console.warn('[ServiceWorker] Fetch failed for:', request.url);
          // Return a fallback if needed
          // For now, let the browser handle offline errors
        });
    })
  );
});
