// Funciona sem internet: guarda o app (telas, sons, fontes) e serve do cache quando falta rede.
// scripts/empacotar.mjs troca VERSAO e a lista abaixo pela lista completa de arquivos.
const VERSAO = 'radix-202610182010';
const ARQUIVOS = ["./","app.css","fontes/Cormorant-600.woff2","fontes/fontes.css","fontes/Inter-400.woff2","fontes/Inter-500.woff2","fontes/Inter-600.woff2","fontes/SpaceGrotesk-500.woff2","fontes/SpaceGrotesk-600.woff2","fontes/SpaceGrotesk-700.woff2","icones/icone-180.png","icones/icone-192.png","icones/icone-512.png","icones/icone.svg","index.html","js/analise.js","js/audio.js","js/estado.js","js/frases.js","js/groove-ui.js","js/harmonia.js","js/jogo.js","js/leitura.js","js/main.js","js/musica.js","js/partitura.js","js/professor.js","js/progmus.js","js/raiox.js","js/ritmo.js","js/sons.js","js/tab.js","js/treinador.js","manifest.webmanifest","programa/grooves.json","programa/programa.json","programa/progressoes.json","programa/repertorio.json","sons/acustico/a1.mp3","sons/acustico/a2.mp3","sons/acustico/c1.mp3","sons/acustico/c2.mp3","sons/acustico/c3.mp3","sons/acustico/eb1.mp3","sons/acustico/eb2.mp3","sons/acustico/eb3.mp3","sons/acustico/gb1.mp3","sons/acustico/gb2.mp3","sons/baixo/ab2-f.mp3","sons/baixo/ab2-mf.mp3","sons/baixo/ab3-f.mp3","sons/baixo/ab3-mf.mp3","sons/baixo/ab4-f.mp3","sons/baixo/ab4-mf.mp3","sons/baixo/b1-f.mp3","sons/baixo/b1-mf.mp3","sons/baixo/b2-f.mp3","sons/baixo/b2-mf.mp3","sons/baixo/b3-f.mp3","sons/baixo/b3-mf.mp3","sons/baixo/d2-f.mp3","sons/baixo/d2-mf.mp3","sons/baixo/d3-f.mp3","sons/baixo/d3-mf.mp3","sons/baixo/d4-f.mp3","sons/baixo/d4-mf.mp3","sons/baixo/f2-f.mp3","sons/baixo/f2-mf.mp3","sons/baixo/f3-f.mp3","sons/baixo/f3-mf.mp3","sons/baixo/f4-f.mp3","sons/baixo/f4-mf.mp3","sons/baixoFantasma/ab2.mp3","sons/baixoFantasma/ab3.mp3","sons/baixoFantasma/ab4.mp3","sons/baixoFantasma/b1.mp3","sons/baixoFantasma/b2.mp3","sons/baixoFantasma/b3.mp3","sons/baixoFantasma/d2.mp3","sons/baixoFantasma/d3.mp3","sons/baixoFantasma/d4.mp3","sons/baixoFantasma/f2.mp3","sons/baixoFantasma/f3.mp3","sons/baixoFantasma/f4.mp3","sons/baixoStaccato/ab2.mp3","sons/baixoStaccato/ab3.mp3","sons/baixoStaccato/ab4.mp3","sons/baixoStaccato/b1.mp3","sons/baixoStaccato/b2.mp3","sons/baixoStaccato/b3.mp3","sons/baixoStaccato/d2.mp3","sons/baixoStaccato/d3.mp3","sons/baixoStaccato/d4.mp3","sons/baixoStaccato/f2.mp3","sons/baixoStaccato/f3.mp3","sons/baixoStaccato/f4.mp3","sons/bateria/agogoAlto.mp3","sons/bateria/agogoBaixo.mp3","sons/bateria/bongoBaixo.mp3","sons/bateria/clap.mp3","sons/bateria/clave.mp3","sons/bateria/conga.mp3","sons/bateria/congaTapa.mp3","sons/bateria/cowbell.mp3","sons/bateria/crash.mp3","sons/bateria/ganza.mp3","sons/bateria/guiro.mp3","sons/bateria/hat-1.mp3","sons/bateria/hat-2.mp3","sons/bateria/hat-3.mp3","sons/bateria/hatAberto.mp3","sons/bateria/hatPedal.mp3","sons/bateria/kick-1.mp3","sons/bateria/kick-2.mp3","sons/bateria/kick-3.mp3","sons/bateria/pandeiro.mp3","sons/bateria/ride-1.mp3","sons/bateria/ride-2.mp3","sons/bateria/rideBell.mp3","sons/bateria/rim-1.mp3","sons/bateria/rim-2.mp3","sons/bateria/rimshot.mp3","sons/bateria/shaker-1.mp3","sons/bateria/shaker-2.mp3","sons/bateria/snare-1.mp3","sons/bateria/snare-2.mp3","sons/bateria/snare-3.mp3","sons/bateria/surdo-1.mp3","sons/bateria/surdo-2.mp3","sons/bateria/surdoAbafado.mp3","sons/bateria/tamborim.mp3","sons/bateria/tom.mp3","sons/bateria/triangulo.mp3","sons/bateria/trianguloAberto.mp3","sons/bateria/tumba.mp3","sons/click/forte.mp3","sons/click/fraco.mp3","sons/click/madeira.mp3","sons/piano/C3.mp3","sons/piano/C4.mp3","sons/piano/C5.mp3","sons/piano/E3.mp3","sons/piano/E4.mp3","sons/piano/Gs3.mp3","sons/piano/Gs4.mp3","sons/pop/A2.mp3","sons/pop/B1.mp3","sons/pop/C3.mp3","sons/pop/D2.mp3","sons/pop/E1.mp3","sons/pop/E3.mp3","sons/pop/F2.mp3","sons/pop/G1.mp3","sons/pop/G3.mp3","sons/rhodes/m040.mp3","sons/rhodes/m045.mp3","sons/rhodes/m050.mp3","sons/rhodes/m055.mp3","sons/rhodes/m059.mp3","sons/rhodes/m062.mp3","sons/rhodes/m065.mp3","sons/rhodes/m071.mp3","sons/rhodes/m076.mp3","sons/slap/A2.mp3","sons/slap/B1.mp3","sons/slap/C3.mp3","sons/slap/D2.mp3","sons/slap/E1.mp3","sons/slap/E3.mp3","sons/slap/F2.mp3","sons/slap/G1.mp3","sons/slap/G3.mp3","sons/sons.json","sons/ui/glock.mp3","sons/ui/prato.mp3","sons/ui/sino.mp3","sons/ui/vibra-C.mp3","sons/ui/vibra-C5.mp3","sons/ui/vibra-E.mp3","sons/ui/vibra-G.mp3"];

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
