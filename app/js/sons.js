// Tocador de amostras reais (app/sons/). Carrega por grupo, sob demanda, e toca com o relógio do
// áudio. Escolhe a amostra mais próxima da nota (e da camada de dinâmica) e ajusta a afinação pela
// velocidade de reprodução.

let manifesto = null;
const buffers = new Map();
const carregados = new Map(); // grupo -> Promise
let ctx = null;
let saida = null;

export function ligar(contexto, destino) {
	ctx = contexto;
	saida = destino;
}
async function lerManifesto() {
	if (!manifesto) manifesto = await fetch('sons/sons.json').then((r) => r.json());
	return manifesto;
}

// Corta o silêncio do começo depois de decodificar (o MP3 traz atraso do codificador, e o ataque
// precisa cair exatamente no instante agendado).
function aparar(buf) {
	const d = buf.getChannelData(0);
	const lim = Math.min(d.length, Math.floor(buf.sampleRate * 0.3));
	let pico = 0;
	for (let i = 0; i < lim; i++) pico = Math.max(pico, Math.abs(d[i]));
	let i0 = 0;
	while (i0 < lim && Math.abs(d[i0]) < pico * 0.03) i0++;
	i0 = Math.max(0, i0 - Math.floor(buf.sampleRate * 0.0008));
	if (i0 < 16) return buf;
	const novo = ctx.createBuffer(1, d.length - i0, buf.sampleRate);
	novo.getChannelData(0).set(d.subarray(i0));
	return novo;
}

export function carregar(grupos, aoProgresso) {
	return Promise.all(grupos.map((g) => {
		if (!carregados.has(g)) {
			carregados.set(g, (async () => {
				const m = await lerManifesto();
				const lista = m[g] ?? [];
				let n = 0;
				await Promise.all(lista.map(async (it) => {
					try {
						const dados = await fetch(`sons/${it.arq}`).then((r) => r.arrayBuffer());
						const buf = await new Promise((ok, erro) => ctx.decodeAudioData(dados, ok, erro));
						buffers.set(it.arq, aparar(buf));
					} catch (e) {
						console.warn(`som não carregou: ${it.arq}`, e); // um arquivo ruim não derruba o resto
					}
					aoProgresso?.(g, ++n, lista.length);
				}));
			})());
		}
		return carregados.get(g);
	}));
}
export const pronto = (g) => !!manifesto?.[g]?.every((it) => buffers.has(it.arq));

function disparar(buf, t, {ganho = 1, taxa = 1, dur, destino = saida, soltar = 0.06}) {
	const s = ctx.createBufferSource();
	s.buffer = buf;
	s.playbackRate.value = taxa;
	const g = ctx.createGain();
	g.gain.setValueAtTime(ganho, t);
	s.connect(g).connect(destino);
	s.start(Math.max(t, ctx.currentTime));
	if (dur != null) {
		const fim = t + Math.max(0.03, dur);
		g.gain.setValueAtTime(ganho, fim);
		g.gain.linearRampToValueAtTime(0.0001, fim + soltar);
		s.stop(fim + soltar + 0.02);
	}
	return s;
}

// Uma amostra pelo id (bateria, percussão, clique, interface). "kick" acha kick-1/2/3 pela força.
export function tocar(grupo, id, t, {vel = 1, ganho = 1, taxa = 1, dur} = {}) {
	const lista = manifesto?.[grupo];
	if (!lista) return null;
	let cands = lista.filter((x) => x.id === id);
	if (!cands.length) cands = lista.filter((x) => x.id.startsWith(`${id}-`));
	if (!cands.length) return null;
	const it = cands.reduce((a, b) => (Math.abs(b.vel - vel) < Math.abs(a.vel - vel) ? b : a));
	const buf = buffers.get(it.arq);
	if (!buf) return null;
	// a camada escolhida já traz a força; o resto do caminho até vel vira ganho
	return disparar(buf, t, {ganho: ganho * Math.min(1.4, Math.max(0.15, vel / it.vel)), taxa, dur});
}

// Uma nota afinada: amostra mais próxima em altura (e em camada), corrigida pela velocidade.
export function nota(grupo, midi, t, {vel = 1, ganho = 1, dur, soltar} = {}) {
	const lista = manifesto?.[grupo]?.filter((x) => x.midi != null && buffers.has(x.arq));
	if (!lista?.length) return null;
	const dist = Math.min(...lista.map((x) => Math.abs(x.midi - midi)));
	const perto = lista.filter((x) => Math.abs(x.midi - midi) === dist);
	const it = perto.reduce((a, b) => (Math.abs(b.vel - vel) < Math.abs(a.vel - vel) ? b : a));
	return disparar(buffers.get(it.arq), t, {ganho: ganho * Math.min(1.3, Math.max(0.2, vel / it.vel)), taxa: Math.pow(2, (midi - it.midi) / 12), dur, soltar});
}
