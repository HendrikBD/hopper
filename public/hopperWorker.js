var cacheName = "hopperCache_0.09";
var dataCacheName = "feedData";
var filesToCache = [
  '/',
  '/hopper.html',
  '/scripts/hopper.js',
  '/stylesheets/hopper.css',
  '/img/backArrow.svg',
  '/img/home.png',
  '/img/plus.png',
  '/img/rssFeed.png',
  '/img/refresh.png',
  '/img/delete.png',
  '/img/edit.png'
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
        if((key !== cacheName) && (key !== dataCacheName)){
          console.log("[ServiceWorker] Removing old cache");
          return caches.delete(key);
        }
      }))
    })
  )
  return self.clients.claim();
})


self.addEventListener('fetch', function(e){
  var dataUrl = "http://localhost:3000/rss"
  var reqUrl = e.request.url.split("?")[0];
  console.log("[ServiceWorker] Fetching: ", reqUrl);
  if(reqUrl.indexOf(dataUrl) > -1) {

    fetch(e.request).then(function(response){
      if(response.ok){
        caches.open(dataCacheName).then(function(cache){
          cache.put("/rss", response.clone());
        })
        return response;
      }
    }).catch(function(error){
        console.log("Error: ", error)
    })

  } else {
    e.respondWith(
      caches.open(cacheName).then(function(cache){
        return cache.match(e.request).then(function(response){
          var fetchPromise = fetch(e.request).then(function(networkResponse){
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          })
          return response || fetchPromise
        })
      })
    )
  }
})
