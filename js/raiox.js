// Raio-X do take. O compasso vira um relógio: cada raio é uma semicolcheia, cada anel é um
// compasso (de dentro para fora) e cada nota tocada é um ponto, deslocado do raio pelo erro de
// tempo com lente de aumento (±LENTE ms chegam ao meio do caminho entre dois raios). Groove
// bom = pontos colados nos raios; deriva = a espiral entorta; semicolcheia torta = um raio inteiro
// com os pontos do mesmo lado. Serve ao vivo (pontos aparecem enquanto o aluno toca), depois do
// take (com replay sincronizado ao áudio) e no antes e depois de cada drill.
// Também mede a mão direita por paridade (1ª, 3ª, 5ª nota contra 2ª, 4ª, 6ª) e separa dedo de
// posição no tempo com dois takes, um começando com cada dedo.

export const LENTE = 40; // ms

const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const dp = (v) => {
	if (v.length < 2) return 0;
	const m = media(v);
	return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
};
const fmt = (v, c = 1) => (v == null || Number.isNaN(v) ? '–' : Number(v).toFixed(c).replace('.', ','));
const sinal = (v, c = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), c);

// geometria: bpm, tempos (semínimas por compasso), nb (compassos), tamanho
export function geometria({bpm, tempos = 4, nb = 1, tam = 320}) {
	const barDur = (tempos * 60) / bpm;
	const raios = Math.max(4, Math.round(tempos * 4));
	const c = tam / 2;
	const rMin = tam * 0.12, rMax = tam * 0.4;
	const dr = (rMax - rMin) / Math.max(1, nb);
	const meio = Math.PI / raios;
	const ang = (frac, erro = 0) => frac * 2 * Math.PI - Math.PI / 2 + (Math.max(-LENTE * 1.6, Math.min(LENTE * 1.6, erro)) / LENTE) * meio * 0.95;
	const raioDe = (bar) => rMin + (Math.min(nb - 1, bar) + 0.5) * dr;
	const pos = (t, erro = 0) => {
		const k = t / barDur + 1e-6;
		const bar = Math.floor(k);
		const a = ang(k - bar, erro);
		const r = raioDe(bar);
		return {x: c + r * Math.cos(a), y: c + r * Math.sin(a), bar};
	};
	return {barDur, raios, c, rMin, rMax, dr, nb, tam, ang, pos, raioDe};
}

export function corErro(erro, lim) {
	const a = Math.abs(erro);
	return a <= 10 ? 'rx-ok' : a <= lim ? 'rx-quase' : 'rx-fora';
}

function ponto(g, n, lim, {niveis, aceso = true}) {
	const ra = Math.max(2, Math.min(5.5, g.dr * 0.42));
	if (n.erro == null) {
		const p = g.pos(n.t, 0);
		return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(ra * 0.7).toFixed(1)}" class="rx-falta${aceso ? '' : ' rx-espera'}" data-t="${n.t}"/>`;
	}
	const p = g.pos(n.t, n.erro);
	let r = ra;
	if (niveis && n.nivel != null) r = ra * (0.55 + 0.45 * Math.max(0, Math.min(1, (n.nivel - niveis.min) / Math.max(1, niveis.max - niveis.min))));
	const cls = `${corErro(n.erro, lim)}${n.certa === false ? ' rx-errada' : ''}${n.fantasma ? ' rx-fant' : ''}${aceso ? '' : ' rx-espera'}`;
	return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" class="${cls}" data-t="${(n.t + n.erro / 1000).toFixed(4)}"/>`;
}

// Constelação. notas: [{t (s), erro (ms|null), nivel, certa, fantasma}]. vivo: só o esqueleto.
export function svgConstelacao(notas, {bpm, tempos = 4, lim = 14, nb, tam = 320, id = '', vivo = false, aceso = true, centro} = {}) {
	if (!nb) nb = Math.max(1, Math.ceil((Math.max(0, ...notas.map((n) => n.t)) + 1e-3) / ((tempos * 60) / bpm)));
	const g = geometria({bpm, tempos, nb, tam});
	const partes = [];
	// anéis dos compassos
	for (let b = 0; b < nb; b++) partes.push(`<circle cx="${g.c}" cy="${g.c}" r="${g.raioDe(b).toFixed(1)}" class="rx-anel"/>`);
	// raios: tempo forte mais claro
	for (let k = 0; k < g.raios; k++) {
		const a = g.ang(k / g.raios);
		const forte = k % 4 === 0;
		const r0 = g.rMin - g.dr * 0.5, r1 = g.rMax + 4;
		partes.push(`<line x1="${(g.c + r0 * Math.cos(a)).toFixed(1)}" y1="${(g.c + r0 * Math.sin(a)).toFixed(1)}" x2="${(g.c + r1 * Math.cos(a)).toFixed(1)}" y2="${(g.c + r1 * Math.sin(a)).toFixed(1)}" class="${forte ? 'rx-raio-forte' : 'rx-raio'}"/>`);
		if (forte) {
			const rr = g.rMax + tam * 0.05;
			partes.push(`<text x="${(g.c + rr * Math.cos(a)).toFixed(1)}" y="${(g.c + rr * Math.sin(a) + 3.5).toFixed(1)}" class="rx-num" text-anchor="middle">${k / 4 + 1}</text>`);
		}
	}
	// assinatura: média do erro em cada raio, como um traço por fora do último anel
	if (!vivo) {
		const porRaio = {};
		for (const n of notas) {
			if (n.erro == null) continue;
			const k = Math.round(((n.t / g.barDur) % 1) * g.raios) % g.raios;
			(porRaio[k] ??= []).push(n.erro);
		}
		for (const [k, v] of Object.entries(porRaio)) {
			if (v.length < 2) continue;
			const m = media(v);
			const r = g.rMax + 6;
			const a0 = g.ang(k / g.raios), a1 = g.ang(k / g.raios, m);
			const grande = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
			const sw = a1 > a0 ? 1 : 0;
			if (Math.abs(m) < 1.5) partes.push(`<circle cx="${(g.c + r * Math.cos(a0)).toFixed(1)}" cy="${(g.c + r * Math.sin(a0)).toFixed(1)}" r="1.8" class="rx-assin-ok"/>`);
			else partes.push(`<path d="M${(g.c + r * Math.cos(a0)).toFixed(1)},${(g.c + r * Math.sin(a0)).toFixed(1)} A${r},${r} 0 ${grande} ${sw} ${(g.c + r * Math.cos(a1)).toFixed(1)},${(g.c + r * Math.sin(a1)).toFixed(1)}" class="rx-assin ${corErro(m, lim)}"/>`);
		}
	}
	const vals = notas.filter((n) => n.nivel != null && !n.fantasma).map((n) => n.nivel);
	const niveis = vals.length ? {min: Math.min(...vals), max: Math.max(...vals)} : null;
	const pontos = vivo ? '' : notas.map((n) => ponto(g, n, lim, {niveis, aceso})).join('');
	const erros = notas.filter((n) => n.erro != null).map((n) => n.erro);
	const txt = centro ?? (erros.length > 2 ? `±${fmt(dp(erros), 0)}` : '');
	return `<svg viewBox="0 0 ${tam} ${tam}" class="raiox" ${id ? `id="${id}"` : ''} data-bpm="${bpm}" data-tempos="${tempos}" data-nb="${nb}" data-lim="${lim}" data-tam="${tam}">
		<defs><radialGradient id="rxFundo"><stop offset="0" stop-color="#1b1e25"/><stop offset="1" stop-color="#0f1115"/></radialGradient></defs>
		<circle cx="${g.c}" cy="${g.c}" r="${(g.rMax + tam * 0.085).toFixed(1)}" fill="url(#rxFundo)"/>
		${partes.join('')}
		<line class="rx-ponteiro" x1="${g.c}" y1="${g.c}" x2="${g.c}" y2="${g.c - g.rMax - 4}" style="opacity:0"/>
		<g class="rx-pontos">${pontos}</g>
		<text x="${g.c}" y="${g.c + 4}" class="rx-centro" text-anchor="middle">${txt}</text>
		<text x="${g.c}" y="${g.c + 17}" class="rx-centro-sub" text-anchor="middle">${txt ? 'ms' : ''}</text>
	</svg>`;
}

function geoDoSvg(svg) {
	const d = svg.dataset;
	return geometria({bpm: Number(d.bpm), tempos: Number(d.tempos), nb: Number(d.nb), tam: Number(d.tam)});
}

// Sem latência confiável a média absoluta não vale: centra os erros na média do próprio take
// (a avaliação faz o mesmo), e a constelação mostra só a regularidade.
export function centrar(notas) {
	const m = media(notas.filter((n) => n.erro != null).map((n) => n.erro));
	return notas.map((n) => (n.erro == null ? n : {...n, erro: n.erro - m}));
}

// Ao vivo: acrescenta um ponto (com animação de entrada) e atualiza o número do centro.
// centrada: redesenha todos os pontos contra a média corrente.
export function acrescentar(svg, n, erros, {centrada = false} = {}) {
	if (!svg) return;
	const g = geoDoSvg(svg);
	const el = svg.querySelector('.rx-pontos');
	const lim = Number(svg.dataset.lim);
	if (centrada) {
		(svg.__notas ??= []).push(n);
		const ns = svg.__notas.length >= 4 ? centrar(svg.__notas) : svg.__notas;
		el.innerHTML = ns.map((x) => ponto(g, x, lim, {niveis: null})).join('');
	} else el.insertAdjacentHTML('beforeend', ponto(g, n, lim, {niveis: null}));
	el.lastElementChild.classList.add('rx-entra');
	if (erros.length > 2) {
		svg.querySelector('.rx-centro').textContent = `±${fmt(dp(erros), 0)}`;
		svg.querySelector('.rx-centro-sub').textContent = 'ms';
	}
}

// Replay: ponteiro gira com o áudio e cada nota acende quando soa. inicioAudio: tempo do contexto
// em que a amostra 0 da gravação toca; inicioTake: onde cai o 0 do drill na gravação (s).
export function replay(svg, {agora, inicioAudio, inicioTake, duracao}) {
	if (!svg) return () => {};
	const g = geoDoSvg(svg);
	const pts = [...svg.querySelectorAll('.rx-pontos circle')];
	pts.forEach((p) => p.classList.add('rx-espera'));
	const ptr = svg.querySelector('.rx-ponteiro');
	ptr.style.opacity = 1;
	let raf;
	const passo = () => {
		const t = agora() - inicioAudio - inicioTake;
		const k = t / g.barDur;
		const bar = Math.max(0, Math.floor(k));
		const a = g.ang(k - Math.floor(k));
		const r = g.raioDe(bar) + g.dr / 2 + 2;
		ptr.setAttribute('x2', (g.c + r * Math.cos(a)).toFixed(1));
		ptr.setAttribute('y2', (g.c + r * Math.sin(a)).toFixed(1));
		for (const p of pts) {
			if (p.classList.contains('rx-espera') && Number(p.dataset.t) <= t) {
				p.classList.remove('rx-espera');
				p.classList.add('rx-entra');
			}
		}
		if (t > duracao + 0.3) return fim();
		raf = requestAnimationFrame(passo);
	};
	const fim = () => {
		cancelAnimationFrame(raf);
		ptr.style.opacity = 0;
		pts.forEach((p) => p.classList.remove('rx-espera'));
	};
	raf = requestAnimationFrame(passo);
	return fim;
}

// ---------- mão direita ----------
// Notas tocadas em ordem; ímpares (1ª, 3ª…) = o dedo que começou, pares = o outro (supõe
// alternância estrita). Acentos e ghosts ficam fora da conta, mas contam na paridade.
export function maoDireita(notas) {
	const tocadas = notas.filter((n) => n.erro != null);
	if (tocadas.length < 12) return null;
	const a = [], b = [];
	tocadas.forEach((n, i) => {
		if (n.fantasma || n.acento) return;
		(i % 2 ? b : a).push(n);
	});
	if (a.length < 5 || b.length < 5) return null;
	const lado = (v) => ({erro: media(v.map((n) => n.erro)), nivel: media(v.filter((n) => n.nivel != null).map((n) => n.nivel)), dp: dp(v.map((n) => n.erro)), n: v.length});
	const A = lado(a), B = lado(b);
	return {a: A, b: B, dt: B.erro - A.erro, ddb: B.nivel - A.nivel};
}

// Dois takes do mesmo drill, um começando com cada dedo: D(i) = (m − i) + P e D(m) = (i − m) + P,
// onde P é o efeito da posição no tempo. Dedo = (D(i) − D(m)) / 2; posição = (D(i) + D(m)) / 2.
export function decompor(i, m) {
	return {
		dedo: {dt: (i.dt - m.dt) / 2, ddb: (i.ddb - m.ddb) / 2},
		posicao: {dt: (i.dt + m.dt) / 2, ddb: (i.ddb + m.ddb) / 2},
	};
}

const CHAVE_DEDO = 'radix-teste-dedo';
function lerDedos() {
	try {
		return JSON.parse(localStorage.getItem(CHAVE_DEDO) || '{}');
	} catch {
		return {};
	}
}
export function guardarDedo(drill, dedo, md, data) {
	const t = lerDedos();
	t[drill] = {...(t[drill] ?? {}), [dedo]: {dt: md.dt, ddb: md.ddb, data}};
	try {
		localStorage.setItem(CHAVE_DEDO, JSON.stringify(t));
	} catch {}
	return t[drill];
}
export function dedosDoDrill(drill) {
	return lerDedos()[drill] ?? {};
}

// Texto da mão direita: o que os números dizem (com a ressalva da paridade).
export function textoMao(md) {
	const linhas = [];
	const dt = md.dt, ddb = md.ddb;
	if (Math.abs(dt) >= 3) linhas.push(`As notas pares chegam ${fmt(Math.abs(dt))} ms ${dt > 0 ? 'depois' : 'antes'} das ímpares: ${Math.abs(dt) >= 6 ? 'galope audível' : 'galope leve'}.`);
	else linhas.push(`Pares e ímpares a ${fmt(Math.abs(dt))} ms: sem galope.`);
	if (Math.abs(ddb) >= 1.5) linhas.push(`As pares soam ${fmt(Math.abs(ddb))} dB ${ddb > 0 ? 'mais fortes' : 'mais fracas'}.`);
	else linhas.push(`Volume igual entre os dedos (${sinal(ddb)} dB).`);
	return linhas;
}

export function textoDecomposicao(dec) {
	const f = (v) => `${fmt(Math.abs(v.dt))} ms ${v.dt > 0 ? 'atrás' : 'à frente'}, ${sinal(v.ddb)} dB`;
	const linhas = [`Dedo médio contra indicador: ${f(dec.dedo)}.`, `Posição no tempo (2ª nota de cada par): ${f(dec.posicao)}.`];
	const dedoPesa = Math.abs(dec.dedo.dt) > Math.abs(dec.posicao.dt);
	if (Math.max(Math.abs(dec.dedo.dt), Math.abs(dec.posicao.dt)) < 3) linhas.push('Nem dedo nem posição passam de 3 ms. Mão direita limpa neste drill.');
	else linhas.push(dedoPesa ? 'O desvio segue o dedo: é mecânica. Isole o dedo fraco: 1 minuto só com ele, no clique, antes do drill.' : 'O desvio fica na posição, não no dedo: é sensação de tempo. Cante a subdivisão em voz alta enquanto toca.');
	return linhas;
}

// formato compacto das notas para guardar com o take marcante: [t, erro, nível, certa]
export const compactar = (notas) => notas.map((n) => [Math.round(n.t * 1000) / 1000, n.erro == null ? null : Math.round(n.erro * 10) / 10, n.nivel == null ? null : Math.round(n.nivel * 10) / 10, n.certa, n.fantasma ? 1 : 0]);
export const expandir = (v) => (v ?? []).map(([t, erro, nivel, certa, f]) => ({t, erro, nivel, certa, fantasma: !!f}));
export {fmt, sinal, dp, media};
