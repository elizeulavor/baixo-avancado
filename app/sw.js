// Funciona sem internet: guarda o app (telas, sons, fontes) e serve do cache quando falta rede.
// scripts/empacotar.mjs troca VERSAO e a lista abaixo pela lista completa de arquivos.
const VERSAO = 'radix-dev';
const ARQUIVOS = ['./', 'index.html', 'app.css', 'manifest.webmanifest', 'js/main.js']; // @lista

self.addEventListener('install', (e) => {
	e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
	e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// sons e fontes: cache primeiro (não mudam); o resto: rede primeiro, cache sem internet
self.addEventListener('fetch', (e) => {
	const url = new URL(e.request.url);
	if (e.request.method !== 'GET' || url.origin !== location.origin) return;
	const fixo = /\/(sons|fontes|icones)\//.test(url.pathname);
	const daRede = () => fetch(e.request).then((r) => {
		if (r.ok) {
			const copia = r.clone();
			caches.open(VERSAO).then((c) => c.put(e.request, copia));
		}
		return r;
	});
	e.respondWith(
		fixo
			? caches.match(e.request).then((r) => r ?? daRede())
			: daRede().catch(() => caches.match(e.request, {ignoreSearch: true}).then((r) => r ?? caches.match('index.html'))),
	);
});
