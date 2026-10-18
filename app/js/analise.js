// Avaliação da gravação: onde cada nota começou (tempo), qual nota foi (altura), com que força
// (dinâmica) e como soou (articulação, sustentação, silêncio nas pausas).
// Tudo em JS puro; roda no celular. Os cliques do metrônomo ficam acima de 2 kHz e são
// filtrados antes de procurar as notas.
import {nomeMidi, midiFreq, acordeEm} from './musica.js';

// ---------- filtros ----------
function biquad(x, tipo, f, sr, q = Math.SQRT1_2) {
	const w = (2 * Math.PI * f) / sr;
	const a = Math.sin(w) / (2 * q);
	const c = Math.cos(w);
	let b0, b1, b2;
	if (tipo === 'lp') [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
	else [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
	const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
	const y = new Float32Array(x.length);
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	for (let i = 0; i < x.length; i++) {
		const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
		x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
		y[i] = v;
	}
	return y;
}
const lp = (x, f, sr) => biquad(biquad(x, 'lp', f, sr), 'lp', f, sr);
const hp = (x, f, sr) => biquad(biquad(x, 'hp', f, sr), 'hp', f, sr);

function fft(re, im) {
	const n = re.length;
	for (let i = 1, j = 0; i < n; i++) {
		let bit = n >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			[re[i], re[j]] = [re[j], re[i]];
			[im[i], im[j]] = [im[j], im[i]];
		}
	}
	for (let len = 2; len <= n; len <<= 1) {
		const ang = (-2 * Math.PI) / len;
		const wr = Math.cos(ang), wi = Math.sin(ang);
		for (let i = 0; i < n; i += len) {
			let cr = 1, ci = 0;
			for (let k = 0; k < len / 2; k++) {
				const a = i + k, b = a + len / 2;
				const tr = re[b] * cr - im[b] * ci;
				const ti = re[b] * ci + im[b] * cr;
				re[b] = re[a] - tr; im[b] = im[a] - ti;
				re[a] += tr; im[a] += ti;
				const nr = cr * wr - ci * wi;
				ci = cr * wi + ci * wr;
				cr = nr;
			}
		}
	}
}

const db = (v) => 20 * Math.log10(Math.max(v, 1e-9));
const media = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const dp = (a) => {
	if (a.length < 2) return 0;
	const m = media(a);
	return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const mediana = (a) => {
	if (!a.length) return 0;
	const s = [...a].sort((x, y) => x - y);
	return s[Math.floor(s.length / 2)];
};

// Envelope RMS em janelas de 'jan' amostras, passo 'hop'.
function envelope(x, jan, hop) {
	const n = Math.floor((x.length - jan) / hop) + 1;
	const e = new Float32Array(Math.max(0, n));
	for (let k = 0; k < n; k++) {
		let s = 0;
		const o = k * hop;
		for (let j = 0; j < jan; j++) s += x[o + j] * x[o + j];
		e[k] = Math.sqrt(s / jan);
	}
	return e;
}

// ---------- ataques (onsets) por fluxo espectral ----------
// desde (s): ataques antes disso não são refinados nem devolvidos (análise ao vivo em janelas: o
// trecho anterior só serve de referência para o limiar).
// estrito: só aceita ataque com a energia subindo (no groove não há legato sem ataque, e a
// sustentação longa das notas graves gerava trocas de altura falsas).
export function detectarAtaques(sinal, sr, {sensibilidade = 1, desde = -Infinity, estrito = false} = {}) {
	const corte = (estrito && estrito.corte) || 1600;
	const x = lp(sinal, corte, sr); // tira o clique do metrônomo (claves, 2-3 kHz)
	const N = 2048;
	const hop = 256;
	const nq = Math.floor((x.length - N) / hop);
	if (nq < 4) return {ataques: [], filtrado: x};
	const hann = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
	const kmax = Math.floor((Math.min(1500, corte - 100) / sr) * N);
	let ant = new Float32Array(kmax);
	const fluxo = new Float32Array(nq);
	const energia = new Float32Array(nq);
	// largura do ataque: fração das faixas de 200 Hz a 1,5 kHz que subiram mais de 3 dB. Toque de
	// dedo é largo (ruído do dedo e do traste); a sustentação que oscila mexe em poucos harmônicos.
	const largo = new Float32Array(nq);
	const kLo = Math.max(1, Math.round((200 / sr) * N));
	const re = new Float64Array(N), im = new Float64Array(N);
	for (let q = 0; q < nq; q++) {
		const o = q * hop;
		let en = 0;
		for (let i = 0; i < N; i++) {
			re[i] = x[o + i] * hann[i];
			im[i] = 0;
			en += x[o + i] * x[o + i];
		}
		energia[q] = Math.sqrt(en / N);
		fft(re, im);
		const cur = new Float32Array(kmax);
		let f = 0, sobem = 0;
		for (let k = 1; k < kmax; k++) {
			cur[k] = Math.log1p(1000 * Math.hypot(re[k], im[k]));
			const d = cur[k] - ant[k];
			if (d > 0) f += d;
			if (k >= kLo && d > 0.35) sobem++;
		}
		fluxo[q] = f;
		largo[q] = sobem / Math.max(1, kmax - kLo);
		ant = cur;
	}
	const maxF = Math.max(...fluxo);
	const maxE = Math.max(...energia);
	const envT = envelope(hp(x, 250, sr), Math.round(sr * 0.002), Math.round(sr * 0.0005)); // 0,5 ms por ponto
	const passoEnv = Math.round(sr * 0.0005);
	const ataques = [];
	const minDist = Math.round((0.05 * sr) / hop);
	const minDist2 = Math.round((0.075 * sr) / hop);
	// energia em janelas de 30 ms (mais longas que o período do E grave, 24 ms), no passo dos quadros
	const envC = envelope(x, Math.round(sr * 0.03), hop);
	const j30 = Math.round((0.03 * sr) / hop);
	const prepA = preparaAltura(sinal, sr);
	// picos locais; a escala de referência é o percentil 90 dos picos (o primeiro ataque depois do
	// silêncio é enorme e não pode ditar o limiar das demais notas)
	const picos = [];
	for (let q = 3; q < nq - 3; q++) {
		const v = fluxo[q];
		if (v >= fluxo[q - 1] && v >= fluxo[q + 1] && v >= fluxo[q - 2] && v >= fluxo[q + 2] && v > 0) picos.push(q);
	}
	const valores = picos.map((q) => fluxo[q]).sort((a, b) => a - b);
	const ref = valores[Math.floor(valores.length * 0.9)] ?? maxF;
	let semSubida = null; // último pico forte recusado só por não subir a energia
	const ate35 = Math.round((0.035 * sr) / hop);
	for (const q of picos) {
		const v = fluxo[q];
		const viz = [];
		for (let j = Math.max(0, q - 16); j < Math.min(nq, q + 16); j++) viz.push(fluxo[j]);
		const limiar = Math.max(mediana(viz) * 1.5, (ref * 0.22) / sensibilidade);
		if (v < limiar) continue;
		const qe = Math.min(nq - 1, q + 4);
		if (Math.max(energia[q], energia[qe]) < maxE * 0.012) continue; // abaixo de -38 dB: ruído
		// Ataque de verdade sobe a energia em relação ao vale logo antes (ou é um pico espectral
		// forte, como hammer-on). A sustentação de um baixo real oscila e gera fluxo sem subir; o fim
		// de nota (abafar) gera fluxo com a energia caindo. Os dois não contam.
		const c = q + Math.round(N / 2 / hop);
		let antes = Infinity, depois = 0;
		for (let j = Math.max(0, c - j30 - 6); j <= Math.max(0, c - j30); j++) antes = Math.min(antes, envC[j] ?? Infinity);
		for (let j = c - 1; j < Math.min(envC.length, c + 4); j++) depois = Math.max(depois, envC[j] ?? 0);
		const larg = Math.max(largo[q], largo[q - 1] ?? 0, largo[q + 1] ?? 0);
		// groove: a energia sobe e o ataque é largo (a sustentação oscila ~2 dB em poucos harmônicos)
		if (estrito && !((depois > antes * (estrito.sobe ?? 1.6) && larg >= (estrito.largo ?? 0)) || v >= ref * (estrito.fluxo ?? 99))) {
			semSubida = {q, v, larg};
			continue;
		}
		if (!(depois > antes * 1.3) && v < ref * 0.6) {
			// sem subida de energia: só é nota nova se a altura mudou (legato, hammer, troca de corda)
			const tq = (q * hop + N / 2) / sr;
			const a = alturaEm(prepA, tq - 0.1, tq + 0.005), b = alturaEm(prepA, tq - 0.012, tq + 0.11);
			if (!a || !b || Math.abs(a.midi - b.midi) < 0.6) {
				semSubida = {q, v, larg};
				continue;
			}
		}
		const ultimo = ataques[ataques.length - 1];
		// Só no groove (estrito), validado em testar-groove.mjs; os drills seguem a regra de sempre.
		// E grave: o toque gera um pico de fluxo sem a energia de 30 ms subir ainda (a fundamental de
		// 41 Hz demora a crescer), e a energia sobe ~25 ms depois, no pico da corda abrindo. O ataque
		// é o primeiro pico.
		const recuo = estrito && semSubida && q - semSubida.q <= ate35 && semSubida.v >= v * 0.4 && semSubida.larg >= (estrito.largo ?? 0) && (!ultimo || semSubida.q - ultimo.q >= minDist) ? semSubida : null;
		semSubida = null;
		if (recuo) {
			ataques.push({q: recuo.q, fluxo: Math.max(v, recuo.v), sobe: depois / Math.max(antes, 1e-9), recuo: true, largo: recuo.larg});
			continue;
		}
		if (ultimo && q - ultimo.q < minDist) {
			// pico mais forte até 35 ms depois de um ataque razoável é a corda abrindo (E grave com a
			// nota anterior ainda soando): fica o primeiro, que é o toque
			const colado = !!estrito && ((q - ultimo.q) * hop) / sr < 0.035 && ultimo.fluxo >= v * 0.4;
			if (v > ultimo.fluxo && !colado) ataques.pop();
			else {
				if (colado) {
					ultimo.fluxo = Math.max(ultimo.fluxo, v);
					ultimo.recuo = true; // o refinamento não pode andar até o segundo pico
				}
				continue;
			}
		}
		// baixo gravado tem dois picos: o toque do dedo e, ~40-80 ms depois, a corda abrindo. Pico
		// mais fraco logo depois de um ataque, sem a energia subir de novo, é o mesmo ataque.
		if (ultimo && q - ultimo.q < minDist2 && v < ultimo.fluxo * 1.2 && depois < antes * 1.4) continue;
		ataques.push({q, fluxo: v, sobe: depois / Math.max(antes, 1e-9), largo: larg});
	}
	// Refina no tempo: envelope liso (8 ms, banda 250-1600 Hz) em dB. O ataque é onde o sinal
	// cruza 40% da subida entre o nível de antes e o pico. Em dB, um ataque sobre uma nota ainda
	// soando aparece tanto quanto no silêncio; com 8 ms, os harmônicos reais não fazem o envelope
	// ondular (com 2 ms ele oscilava ±15 dB e o ataque saía até 30 ms fora).
	const out = [];
	for (const a of ataques) {
		const tq = (a.q * hop + N / 2) / sr;
		if (tq < desde) continue;
		const t = refinarFino(x, sr, tq, -Infinity, a.recuo ? 0 : 0.05) ?? tq - 0.008;
		if (out.length && t - out[out.length - 1].t < 0.03) continue;
		out.push({t, forca: a.fluxo / maxF, tq, sobe: a.sobe, largo: a.largo});
	}
	return {ataques: out, filtrado: x, fluxo, hop, N};
}

// Fluxo espectral fino (janela 1024, passo 64 = 1,5 ms) só em volta do ataque: mede a mudança do
// espectro, que não ondula com os harmônicos como a amplitude. O ataque é o primeiro quadro, antes
// do pico, em que o fluxo passa de metade do pico. Calibrado para dar 0 ms numa nota isolada.
const FINO = {N: 2048, hop: 64, atraso: -0.021};const hannFino = new Float32Array(FINO.N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FINO.N));
function refinarFino(x, sr, tq, tMin = -Infinity, ate = 0.05) {
	const {N, hop} = FINO;
	const i0 = Math.round((Math.max(tq - 0.08, tMin) - FINO.atraso) * sr - N / 2), i1 = Math.round((tq + ate) * sr - N / 2);
	if (i0 < 0 || i1 + N >= x.length) return null;
	const kmax = Math.floor((1500 / sr) * N);
	const re = new Float64Array(N), im = new Float64Array(N);
	let ant = null;
	const fl = [];
	for (let o = i0; o <= i1; o += hop) {
		for (let i = 0; i < N; i++) {
			re[i] = x[o + i] * hannFino[i];
			im[i] = 0;
		}
		fft(re, im);
		const cur = new Float32Array(kmax);
		let f = 0;
		for (let k = 1; k < kmax; k++) {
			cur[k] = Math.log1p(1000 * Math.hypot(re[k], im[k]));
			if (ant) f += Math.max(0, cur[k] - ant[k]);
		}
		if (ant) fl.push({o, f});
		ant = cur;
	}
	let ip = 0;
	for (let k = 1; k < fl.length; k++) if (fl[k].f > fl[ip].f) ip = k;
	if (!fl.length || fl[ip].f <= 0) return null;
	let k = ip;
	while (k > 0 && fl[k - 1].f > fl[ip].f * 0.5) k--;
	return (fl[k].o + N / 2) / sr - FINO.atraso;
}

// ---------- altura (YIN) ----------
function yin(x, inicio, W, minLag, maxLag, limiar = 0.15) {
	if (inicio + W + maxLag >= x.length) return null;
	const d = new Float32Array(maxLag + 1);
	for (let tau = 1; tau <= maxLag; tau++) {
		let s = 0;
		for (let j = 0; j < W; j++) {
			const v = x[inicio + j] - x[inicio + j + tau];
			s += v * v;
		}
		d[tau] = s;
	}
	const c = new Float32Array(maxLag + 1);
	c[0] = 1;
	let soma = 0;
	for (let tau = 1; tau <= maxLag; tau++) {
		soma += d[tau];
		c[tau] = soma ? (d[tau] * tau) / soma : 1;
	}
	let tau = -1;
	for (let t = minLag; t <= maxLag; t++) {
		if (c[t] < limiar) {
			while (t + 1 <= maxLag && c[t + 1] < c[t]) t++;
			tau = t;
			break;
		}
	}
	if (tau < 0) {
		let best = minLag;
		for (let t = minLag; t <= maxLag; t++) if (c[t] < c[best]) best = t;
		if (c[best] > 0.35) return null;
		tau = best;
	}
	const a = c[tau - 1] ?? c[tau], b = c[tau], cc = c[tau + 1] ?? c[tau];
	const den = a - 2 * b + cc;
	const off = den ? (0.5 * (a - cc)) / den : 0;
	return {periodo: tau + off, clareza: 1 - c[tau]};
}

// Altura de um trecho: downsample para ~12 kHz e YIN. fmin define a nota mais grave aceita.
function preparaAltura(sinal, sr) {
	const D = Math.max(1, Math.floor(sr / 11025));
	const x = lp(sinal, 1000, sr);
	const y = new Float32Array(Math.floor(x.length / D));
	for (let i = 0; i < y.length; i++) y[i] = x[i * D];
	return {y, srd: sr / D};
}
function alturaEm(prep, t0, t1, fmin = 38, fmax = 450) {
	const {y, srd} = prep;
	const maxLag = Math.ceil(srd / fmin);
	const minLag = Math.floor(srd / fmax);
	const i0 = Math.round((t0 + 0.022) * srd);
	const disponivel = Math.round((t1 - t0 - 0.03) * srd);
	let W = Math.min(Math.round(srd * 0.045), disponivel - maxLag);
	if (W < Math.round(srd * 0.012)) {
		// nota curta: aceita lag menor (notas mais agudas que o mínimo pedido não importam aqui)
		W = Math.round(srd * 0.012);
		if (disponivel < W + minLag * 2) return null;
		const r = yin(y, i0, W, minLag, Math.min(maxLag, disponivel - W), 0.2);
		return r ? {midi: midiFreq(srd / r.periodo), clareza: r.clareza} : null;
	}
	const r = yin(y, i0, W, minLag, maxLag);
	return r ? {midi: midiFreq(srd / r.periodo), clareza: r.clareza} : null;
}

// ---------- análise completa de um take ----------
// esperado: [{t (s, relativo ao 1 do compasso 1), midi|null, fantasma, acento, staccato, legato, pausa, d (s)}]
// opcoes: {inicio (s na gravação onde cai o 1 do compasso 1), modo, grade (s entre pontos), conjunto,
//          prog, bpm, tempos, criterios, fmin, duracao (s do trecho avaliado)}
export function avaliar(sinal, sr, esperado, op) {
	const {ataques, filtrado} = detectarAtaques(sinal, sr);
	const prep = preparaAltura(sinal, sr);
	const env = envelope(filtrado, Math.round(sr * 0.01), Math.round(sr * 0.005)); // 5 ms por ponto
	const passo = 0.005;
	const nivelEm = (t) => env[Math.max(0, Math.min(env.length - 1, Math.round(t / passo)))] ?? 0;
	const fimTake = op.inicio + op.duracao;
	const dentro = ataques.filter((a) => a.t > op.inicio - 0.15 && a.t < fimTake + 0.1);

	// medidas de cada nota tocada
	const notas = dentro.map((a, k) => {
		const prox = dentro[k + 1]?.t ?? Math.min(a.t + 1.2, sinal.length / sr);
		let pico = 0, ipico = 0;
		for (let t = a.t; t < Math.min(prox, a.t + 0.08); t += passo) {
			const v = nivelEm(t);
			if (v > pico) { pico = v; ipico = t; }
		}
		let fim = prox;
		for (let t = ipico; t < prox; t += passo) {
			if (nivelEm(t) < pico * 0.1) { fim = t; break; } // -20 dB
		}
		const h = alturaEm(prep, a.t, prox, op.fmin ?? 38);
		return {t: a.t, nivel: db(pico), midi: h?.midi ?? null, clareza: h?.clareza ?? 0, soa: fim - a.t, ioi: prox - a.t};
	});

	// pontos esperados (sequência escrita ou grade livre)
	let alvos;
	if (op.modo === 'grade' || op.modo === 'conjunto') {
		alvos = [];
		for (let t = 0; t < op.duracao - 1e-6; t += op.grade) alvos.push({t, livre: true});
	} else alvos = esperado.filter((e) => !e.pausa).map((e) => ({...e}));

	// casamento: cada nota esperada pega o ataque mais próximo dentro da janela
	const usados = new Set();
	const casados = [];
	for (let i = 0; i < alvos.length; i++) {
		const e = alvos[i];
		const te = op.inicio + e.t;
		const viz = Math.min(0.12, ((alvos[i + 1]?.t ?? e.t + 0.5) - e.t) / 2, i ? (e.t - alvos[i - 1].t) / 2 : 0.12);
		let best = -1;
		for (let k = 0; k < notas.length; k++) {
			if (usados.has(k)) continue;
			const d = Math.abs(notas[k].t - te);
			if (d <= viz && (best < 0 || d < Math.abs(notas[best].t - te))) best = k;
		}
		if (best >= 0) {
			usados.add(best);
			casados.push({esperado: e, tocado: notas[best], erro: (notas[best].t - te) * 1000});
		} else if (!e.livre) casados.push({esperado: e, tocado: null});
	}
	const extras = notas.filter((_, k) => !usados.has(k)).length;
	const ok = casados.filter((c) => c.tocado);

	// ---- tempo ----
	const erros = ok.map((c) => c.erro);
	const tempo = {
		media: media(erros),
		desvio: dp(erros),
		dentro10: erros.length ? (100 * erros.filter((e) => Math.abs(e) <= 10).length) / erros.length : 0,
		dentro20: erros.length ? (100 * erros.filter((e) => Math.abs(e) <= 20).length) / erros.length : 0,
		pontos: ok.map((c) => ({t: c.esperado.t, erro: c.erro})),
	};
	if (erros.length > 4) {
		const ts = ok.map((c) => c.esperado.t);
		const mt = media(ts), me = tempo.media;
		const num = ts.reduce((s, t, i) => s + (t - mt) * (erros[i] - me), 0);
		const den = ts.reduce((s, t) => s + (t - mt) ** 2, 0);
		tempo.deriva = den ? (num / den) * 10 : 0; // ms a cada 10 s (positivo = vai atrasando)
	}
	// média por posição dentro do tempo (revela semicolcheia torta)
	const bt = 60 / op.bpm;
	const porPos = {};
	for (const c of ok) {
		const frac = (c.esperado.t / bt) % 1;
		const chave = Math.round(frac * 12) % 12; // 12 avos de tempo cobrem 16 e tercina
		(porPos[chave] ??= []).push(c.erro);
	}
	const nomesPos = {0: 'tempo', 3: '"e" (2ª semi)', 4: '2ª tercina', 6: '"&"', 8: '3ª tercina', 9: '"a" (4ª semi)'};
	tempo.porPosicao = Object.entries(porPos)
		.filter(([, v]) => v.length >= 3)
		.map(([k, v]) => ({pos: nomesPos[k] ?? `${k}/12`, media: media(v), n: v.length}));
	let pior = null;
	for (const c of ok) if (!pior || Math.abs(c.erro) > Math.abs(pior.erro)) pior = c;
	if (pior) tempo.pior = {erro: pior.erro, onde: ondeNoCompasso(pior.esperado.t, op)};

	// ---- notas ----
	let notasRes = null;
	const comAltura = ok.filter((c) => !c.esperado.fantasma && !c.tocado.fantasma);
	if (op.modo === 'sequencia' || op.modo === 'alvos' || op.modo === 'conjunto' || op.modo === 'aproximacao') {
		const erradas = [];
		let certas = 0, total = 0, oitava = 0, semAltura = 0;
		for (const c of comAltura) {
			const tocada = c.tocado.midi;
			let aceitos = null;
			if (op.modo === 'sequencia' && c.esperado.midi != null) aceitos = [c.esperado.midi % 12];
			else if (op.modo === 'conjunto') aceitos = op.conjunto;
			else if (op.modo === 'alvos' || op.modo === 'aproximacao') {
				const pa = acordeEm(op.prog, c.esperado.t / bt);
				if (pa && Math.abs(((c.esperado.t / bt) % (op.totalProg || 1e9)) - pa.inicio) < 1e-3) aceitos = pa.acorde.tons;
				else if (op.modo === 'aproximacao' && pa) {
					const fimAc = pa.inicio + pa.dur;
					const ehUltimo = Math.abs((c.esperado.t / bt) % (op.totalProg || 1e9) + op.passoAlvo - fimAc) < 1e-3;
					if (ehUltimo) {
						const prox = acordeEm(op.prog, fimAc);
						aceitos = [(prox.acorde.raiz + 1) % 12, (prox.acorde.raiz + 11) % 12];
					}
				}
			}
			if (!aceitos) continue;
			total++;
			if (tocada == null) {
				semAltura++;
				continue;
			}
			const pc = ((Math.round(tocada) % 12) + 12) % 12;
			c.certa = aceitos.includes(pc);
			if (c.certa) {
				certas++;
				if (op.modo === 'sequencia' && Math.abs(Math.round(tocada) - c.esperado.midi) >= 12) oitava++;
			} else {
				erradas.push({onde: ondeNoCompasso(c.esperado.t, op), tocou: nomeMidi(Math.round(tocada)), esperado: c.esperado.midi != null && op.modo === 'sequencia' ? nomeMidi(c.esperado.midi) : 'nota do acorde/escala'});
			}
		}
		const avaliadas = total - semAltura;
		notasRes = {acerto: avaliadas ? (100 * certas) / avaliadas : null, avaliadas, semAltura, oitava, erradas: erradas.slice(0, 12)};
		// afinação média das notas certas (cents)
		const cents = comAltura.filter((c) => c.tocado.midi != null).map((c) => (c.tocado.midi - Math.round(c.tocado.midi)) * 100);
		notasRes.afinacao = cents.length ? media(cents) : null;
	}

	// ---- dinâmica ----
	const normais = ok.filter((c) => !c.esperado.fantasma && !c.esperado.acento);
	const niveis = normais.map((c) => c.tocado.nivel);
	const din = {desvio: dp(niveis), faixa: niveis.length ? Math.max(...niveis) - Math.min(...niveis) : 0, niveis: ok.map((c) => ({t: c.esperado.t, nivel: c.tocado.nivel, tipo: c.esperado.fantasma ? 'fantasma' : c.esperado.acento ? 'acento' : 'normal'}))};
	const acentuadas = ok.filter((c) => c.esperado.acento).map((c) => c.tocado.nivel);
	const fantasmas = ok.filter((c) => c.esperado.fantasma).map((c) => c.tocado.nivel);
	if (acentuadas.length && niveis.length) din.acento = media(acentuadas) - media(niveis);
	if (fantasmas.length && (niveis.length || acentuadas.length)) din.fantasma = media([...niveis, ...acentuadas]) - media(fantasmas);
	if (op.dinamica?.tipo === 'acentos-cada' && ok.length) {
		const cada = op.dinamica.cada;
		const ac = ok.filter((c, i) => alvos.indexOf(c.esperado) % cada === 0).map((c) => c.tocado.nivel);
		const re = ok.filter((c, i) => alvos.indexOf(c.esperado) % cada !== 0).map((c) => c.tocado.nivel);
		din.acento = media(ac) - media(re);
		din.desvio = dp(re);
	}
	if (op.dinamica?.tipo === 'crescendo' && ok.length > 4) {
		const xs = ok.map((c) => c.esperado.t), ys = ok.map((c) => c.tocado.nivel);
		const mx = media(xs), my = media(ys);
		const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
		const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
		const syy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
		din.correlacao = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
		const q = Math.max(1, Math.floor(ys.length / 4));
		din.subida = media(ys.slice(-q)) - media(ys.slice(0, q));
	}

	// ---- som ----
	const som = {};
	const art = ok.filter((c) => c.tocado.ioi > 0.06).map((c) => ({e: c.esperado, r: Math.min(1, c.tocado.soa / Math.max(0.05, Math.min(c.tocado.ioi, (c.esperado.d ?? c.tocado.ioi))))}));
	if (art.length) som.articulacao = 100 * media(art.map((a) => a.r));
	const stac = art.filter((a) => a.e.staccato).map((a) => a.r);
	const leg = art.filter((a) => a.e.legato).map((a) => a.r);
	if (stac.length) som.staccato = 100 * media(stac);
	if (leg.length) som.legato = 100 * media(leg);
	// silêncio nas pausas escritas: quanto abaixo das notas fica o que soa na pausa
	const pausas = esperado.filter((e) => e.pausa && e.d >= 0.1);
	if (pausas.length && ok.length) {
		const ref = media(ok.map((c) => c.tocado.nivel));
		const resto = [];
		for (const p of pausas) {
			const a = op.inicio + p.t + 0.06, b = op.inicio + p.t + p.d - 0.015;
			if (b - a < 0.03) continue;
			const vs = [];
			for (let t = a; t < b; t += passo) vs.push(nivelEm(t));
			resto.push(db(media(vs)));
		}
		if (resto.length) som.silencio = Math.min(60, ref - media(resto));
	}
	// sustentação: tempo até cair 20 dB nas notas longas (≥ semínima)
	const longas = ok.filter((c) => (c.esperado.d ?? 0) >= bt * 0.95);
	if (longas.length) som.sustentacao = media(longas.map((c) => c.tocado.soa));
	som.clareza = comAltura.length ? 100 * media(comAltura.map((c) => c.tocado.clareza)) : null;

	// fantasma não detectado não conta como falta (pode ter sido baixo demais para o microfone)
	const faltando = casados.filter((c) => !c.tocado && !c.esperado.fantasma).length;
	const fantasmasSumidos = casados.filter((c) => !c.tocado && c.esperado.fantasma).length;
	// nota a nota, para o Raio-X (constelação, replay, mão direita): t esperado (s), erro (ms), nível (dB)
	const notasTake = casados.map((c) => ({t: c.esperado.t, erro: c.tocado ? c.erro : null, nivel: c.tocado?.nivel ?? null, certa: c.certa ?? null, fantasma: !!c.esperado.fantasma, acento: !!c.esperado.acento}));
	const res = {inicio: op.inicio, notasTake, tempo, notas: notasRes, dinamica: din, som, contagem: {esperadas: alvos.filter((a) => !a.livre && !a.fantasma).length, tocadas: notas.length, casadas: ok.length, faltando, extras, fantasmasSumidos}};
	return julgar(res, op.criterios ?? {}, op);
}

function ondeNoCompasso(t, op) {
	const bt = 60 / op.bpm;
	const tempos = op.tempos ?? 4;
	const b = t / bt;
	const c = Math.floor(b / tempos + 1e-6);
	const dentro = b - c * tempos;
	const tempo = Math.floor(dentro + 1e-6) + 1;
	const sub = Math.round((dentro % 1) * 4);
	return `c${c + 1} t${tempo}${sub ? ['', 'e', '&', 'a'][sub] : ''}`;
}

// Nota de 0 a 100 por quesito: no limite vale 70; zero vale 100; o dobro do limite vale 0.
function sub(valor, limite) {
	if (valor == null || limite == null) return null;
	if (valor <= limite) return 70 + 30 * (1 - valor / limite);
	return Math.max(0, 70 - (70 * (valor - limite)) / limite);
}

// tempo: a medição com baixo gravado tem ~9 ms de ruído próprio (testar-real.mjs); os limites já descontam isso
export const CRITERIOS_PADRAO = {tempoDesvio: 14, tempoMedio: 12, notas: 95, faltas: 5};

function julgar(r, crit, op) {
	const c = {...CRITERIOS_PADRAO, ...crit};
	const itens = [];
	if (r.contagem.casadas < Math.max(3, r.contagem.esperadas * 0.3)) {
		return {...r, itens: [{nome: 'Notas detectadas', valor: r.contagem.casadas, limite: Math.max(3, Math.ceil(r.contagem.esperadas * 0.3)), ok: false, nota: 0, texto: 'quase nada no tempo esperado', unidade: ''}],
			nota: 0, aprovado: false,
			dicas: [r.contagem.tocadas ? 'As notas não caíram no tempo esperado: comece no 1 depois da contagem.' : 'Quase nada foi detectado. Aproxime o celular do baixo ou do amplificador, aumente o volume e confira a permissão do microfone.']};
	}
	const add = (nome, valor, limite, texto, unidade) => {
		if (valor == null || Number.isNaN(valor)) return;
		itens.push({nome, valor, limite, ok: valor <= limite, nota: sub(valor, limite), texto, unidade});
	};
	add('Regularidade do tempo', r.tempo.desvio, c.tempoDesvio, 'desvio-padrão dos ataques', 'ms');
	if (op.latenciaConfiavel) add('Pressa/atraso', Math.abs(r.tempo.media), c.tempoMedio, r.tempo.media > 0 ? 'atrasado em média' : 'adiantado em média', 'ms');
	if (r.notas && r.notas.acerto != null && c.notas) {
		const v = 100 - r.notas.acerto;
		itens.push({nome: 'Notas certas', valor: r.notas.acerto, limite: c.notas, ok: r.notas.acerto >= c.notas, nota: sub(v, 100 - c.notas), texto: `${r.notas.avaliadas} notas avaliadas`, unidade: '%'});
	}
	const esp = r.contagem.esperadas || 1;
	if (r.contagem.esperadas) {
		const pf = (100 * r.contagem.faltando) / esp;
		itens.push({nome: 'Notas faltando', valor: pf, limite: c.faltas, ok: pf <= c.faltas, nota: sub(pf, c.faltas), texto: `${r.contagem.faltando} de ${esp}`, unidade: '%'});
		const px = (100 * r.contagem.extras) / esp;
		// informativo até validar com baixo de verdade: cordas soltas soando geram ataques duvidosos
		itens.push({nome: 'Notas a mais', info: true, valor: px, limite: c.faltas * 2, ok: px <= c.faltas * 2, nota: null, texto: `informativo · ${r.contagem.extras} ataques sem nota escrita`, unidade: '%'});
	}
	const d = op.dinamica;
	if (d?.tipo === 'uniforme' || (!d && r.dinamica.niveis.length > 6)) add('Dinâmica uniforme', r.dinamica.desvio, d?.max ?? 4, 'variação de volume entre notas iguais', 'dB');
	if (d?.tipo === 'acentos' || d?.tipo === 'acentos-cada') {
		const v = r.dinamica.acento ?? 0;
		itens.push({nome: 'Acentos', valor: v, limite: d.min, ok: v >= d.min, nota: sub(Math.max(0, d.min - v), d.min), texto: 'acentuadas acima das demais', unidade: 'dB'});
	}
	if (d?.fantasma) {
		const v = r.dinamica.fantasma ?? 0;
		itens.push({nome: 'Notas fantasma', valor: v, limite: d.fantasma, ok: v >= d.fantasma, nota: sub(Math.max(0, d.fantasma - v), d.fantasma), texto: 'fantasmas abaixo das notas cheias', unidade: 'dB'});
	}
	if (d?.tipo === 'crescendo') {
		const v = r.dinamica.subida ?? 0;
		itens.push({nome: 'Crescendo', valor: v, limite: d.min, ok: v >= d.min && (r.dinamica.correlacao ?? 0) >= 0.7, nota: sub(Math.max(0, d.min - v), d.min), texto: `subida do início ao fim (constância ${((r.dinamica.correlacao ?? 0) * 100).toFixed(0)}%)`, unidade: 'dB'});
	}
	if (c.silencio != null && r.som.silencio != null) {
		itens.push({nome: 'Pausas limpas', valor: r.som.silencio, limite: c.silencio, ok: r.som.silencio >= c.silencio, nota: sub(Math.max(0, c.silencio - r.som.silencio), c.silencio / 2), texto: 'o que soa na pausa, abaixo das notas', unidade: 'dB'});
	}
	if (c.staccato != null && r.som.staccato != null) add('Staccato', r.som.staccato, c.staccato, 'duração soando / espaço da nota', '%');
	if (c.legato != null && r.som.legato != null) {
		itens.push({nome: 'Legato', valor: r.som.legato, limite: c.legato, ok: r.som.legato >= c.legato, nota: sub(Math.max(0, c.legato - r.som.legato), 100 - c.legato), texto: 'duração soando / espaço da nota', unidade: '%'});
	}
	const notas = itens.filter((i) => !i.info).map((i) => i.nota).filter((v) => v != null);
	const nota = notas.length ? Math.round(media(notas)) : 0;
	const aprovado = itens.length > 0 && itens.filter((i) => !i.info).every((i) => i.ok);
	return {...r, itens, nota, aprovado, dicas: dicas(r, itens, op)};
}

// Leitura objetiva do resultado: só o que os números mostram.
function dicas(r, itens, op) {
	const out = [];
	const t = r.tempo;
	if (op.latenciaConfiavel && Math.abs(t.media) > 6) out.push(t.media > 0 ? `Atrasado ${t.media.toFixed(0)} ms em média: toque na frente do clique.` : `Adiantado ${(-t.media).toFixed(0)} ms em média: segure, deixe o clique chegar.`);
	if (t.deriva != null && Math.abs(t.deriva) > 8) out.push(t.deriva > 0 ? `Vai atrasando: +${t.deriva.toFixed(0)} ms a cada 10 s.` : `Vai acelerando: ${t.deriva.toFixed(0)} ms a cada 10 s.`);
	const torta = (t.porPosicao ?? []).filter((p) => p.pos !== 'tempo');
	const base = (t.porPosicao ?? []).find((p) => p.pos === 'tempo');
	for (const p of torta) {
		const rel = p.media - (base?.media ?? t.media);
		if (Math.abs(rel) > 7) out.push(`${p.pos} ${rel > 0 ? 'atrasado' : 'adiantado'} ${Math.abs(rel).toFixed(0)} ms em relação ao tempo.`);
	}
	if (t.pior && Math.abs(t.pior.erro) > 30) out.push(`Pior ataque: ${t.pior.onde}, ${t.pior.erro > 0 ? '+' : ''}${t.pior.erro.toFixed(0)} ms.`);
	if (r.notas?.erradas?.length) out.push(`Notas erradas: ${r.notas.erradas.slice(0, 4).map((e) => `${e.onde} tocou ${e.tocou}`).join('; ')}.`);
	if (r.notas?.afinacao != null && Math.abs(r.notas.afinacao) > 15) out.push(`Afinação ${r.notas.afinacao > 0 ? 'alta' : 'baixa'} ${Math.abs(r.notas.afinacao).toFixed(0)} cents em média: afine ou corrija a pressão do dedo.`);
	if (r.dinamica.desvio > 4) out.push(`Volume oscila ±${r.dinamica.desvio.toFixed(1)} dB entre notas que deveriam ser iguais.`);
	if (r.som.silencio != null && r.som.silencio < 24) out.push(`Pausas sujas: o baixo continua soando ${r.som.silencio.toFixed(0)} dB abaixo das notas. Abafe com a mão esquerda e o polegar.`);
	if (r.contagem.fantasmasSumidos > 2) out.push(`${r.contagem.fantasmasSumidos} ghost notes não detectadas: baixas demais para o microfone ou não tocadas.`);
	if (r.contagem.extras > 2) out.push(`${r.contagem.extras} ataques fora do escrito (cordas soltas soando, ruído ou nota a mais).`);
	if (!out.length && itens.every((i) => i.ok)) out.push('Limpo. Próximo take no BPM novo.');
	return out;
}

// ---------- calibração de latência ----------
// Grava cliques tocados pelo alto-falante e mede quanto tempo eles levam para chegar ao microfone.
export function medirLatencia(sinal, sr, inicioCtx, cliques) {
	const x = hp(sinal, 1500, sr);
	const env = envelope(x, Math.round(sr * 0.001), Math.round(sr * 0.0005));
	const p = 0.0005;
	const difs = [];
	for (const c of cliques) {
		const rel = c - inicioCtx;
		const i0 = Math.round(rel / p), i1 = Math.round((rel + 0.45) / p);
		let max = 0, im = -1;
		for (let i = i0; i < Math.min(i1, env.length); i++) if (env[i] > max) { max = env[i]; im = i; }
		if (im < 0) continue;
		let io = im;
		while (io > i0 && env[io] > max * 0.3) io--;
		difs.push(io * p - rel);
	}
	if (difs.length < 5) return null;
	const m = mediana(difs);
	const bons = difs.filter((d) => Math.abs(d - m) < 0.006);
	return {latencia: m, espalhamento: dp(bons) * 1000, n: bons.length};
}

// Por take: tenta achar os cliques na própria gravação (quando o clique sai pelo alto-falante).
// Devolve a latência refinada ou null (fone de ouvido: o microfone não ouve o clique).
export function refinarLatencia(sinal, sr, inicioCtx, cliques, palpite) {
	const x = hp(sinal, 2000, sr);
	const env = envelope(x, Math.round(sr * 0.001), Math.round(sr * 0.0005));
	const p = 0.0005;
	const pontos = [];
	let melhor = null;
	for (let lat = Math.max(0, palpite - 0.06); lat <= palpite + 0.06; lat += 0.0005) {
		let s = 0;
		for (const c of cliques) s += env[Math.round((c - inicioCtx + lat) / p)] ?? 0;
		pontos.push(s);
		if (!melhor || s > melhor.s) melhor = {s, lat};
	}
	const md = mediana(pontos);
	if (!melhor || melhor.s <= 0 || melhor.s < md * 4) return null; // silêncio digital não é clique
	return melhor.lat;
}

// ---------- afinador ----------
export function alturaAoVivo(buf, sr) {
	let rms = 0;
	for (const v of buf) rms += v * v;
	rms = Math.sqrt(rms / buf.length);
	if (rms < 0.008) return null;
	const prep = preparaAltura(buf, sr);
	const r = yin(prep.y, 0, Math.floor(prep.y.length / 2), Math.floor(prep.srd / 450), Math.min(Math.floor(prep.y.length / 2) - 1, Math.ceil(prep.srd / 28)));
	return r ? midiFreq(prep.srd / r.periodo) : null;
}

// para os testes
export const _interno = {lp, hp, envelope};
