// Funciona sem internet: guarda o app na primeira visita e serve do cache.
// Ao mudar qualquer arquivo do app, aumente VERSAO (scripts/empacotar.mjs faz isso sozinho).
const VERSAO = 'baixo-v1';
const ARQUIVOS = [
	'./', 'index.html', 'app.css', 'manifest.webmanifest',
	'js/main.js', 'js/estado.js', 'js/audio.js', 'js/analise.js', 'js/musica.js', 'js/tab.js',
	'programa/programa.json', 'programa/grooves.json',
	'icones/icone.svg', 'icones/icone-180.png', 'icones/icone-192.png', 'icones/icone-512.png',
];

self.addEventListener('install', (e) => {
	e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
	e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// rede primeiro (para pegar atualizações), cache se estiver sem internet
self.addEventListener('fetch', (e) => {
	if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
	e.respondWith(
		fetch(e.request)
			.then((r) => {
				const copia = r.clone();
				caches.open(VERSAO).then((c) => c.put(e.request, copia));
				return r;
			})
			.catch(() => caches.match(e.request, {ignoreSearch: true}).then((r) => r ?? caches.match('index.html'))),
	);
});
