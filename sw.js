// InShape service worker: saves the app and its pose-detection files so it works without internet.
const V = "inshape-v1";
const SHELL = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    try {
      const list = await (await fetch("lib/files.json", { cache: "no-store" })).json();
      await Promise.all(list.map(f => c.add("lib/" + f).catch(() => {})));
    } catch (err) { /* offline files not added yet */ }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || (e.request.method !== "GET" && e.request.method !== "HEAD")) return;
  const isLib = u.pathname.includes("/lib/");
  e.respondWith((async () => {
    const c = await caches.open(V);
    if (isLib) {                                   // big files: cache first
      const hit = await c.match(e.request, { ignoreMethod: true });
      if (hit) return hit;
    }
    try {                                          // everything else: network first, so updates show up
      const res = await fetch(e.request);
      if (res.ok && e.request.method === "GET" && res.status === 200) c.put(e.request, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      const hit = await c.match(e.request, { ignoreMethod: true, ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
