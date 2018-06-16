var cacheName = "hopperCache";
var filesToCache = [
  '/',
  '/hopper.html',
  '/scripts/hopper.js',
  '/stylesheets/hopper.css',
  '/img/backArrow.svg',
  '/img/home.png',
  '/img/plus.png',
  '/img/rssFeed.png'
];

self.addEventListener('install', function(e){
  console.log("[ServiceWorker] installed");
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      console.log("[ServiceWorker] Caching app shell");
      return cache.addAll(filesToCache);
    })
  )
})

self.addEventListener('activate', function(e){
  console.log("[ServiceWorker] Activated")
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if(key !== cacheName) {
          console.log("[ServiceWorker] Removing old cache");
          return caches.delete(key);
        }
      }))
    })
  )
  return self.clients.claim();
})
})
