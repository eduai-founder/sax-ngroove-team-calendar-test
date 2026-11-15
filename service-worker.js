// Samo javni staticki fajlovi. Ne kesirati rezervacije, odgovore servera ni kljuceve.
const CACHE='sax-team-static-v07';
const ASSETS=['./','./index.html','./styles.css','./app.js','./logo.png','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const r=event.request;
  if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
  event.respondWith(fetch(r).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(r,copy));}
    return response;
  }).catch(()=>caches.match(r)));
});
