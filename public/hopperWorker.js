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

