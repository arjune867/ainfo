const CACHE='ainfo-v13-preprod-1';
const CORE=['./','./index.html','./manifest.webmanifest','./AINFO.png','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./offline.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/admin/'))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy))}return res}).catch(()=>caches.match(req).then(hit=>hit||caches.match('./offline.html'))));return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(url.origin===self.location.origin&&res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy))}return res})))
});
