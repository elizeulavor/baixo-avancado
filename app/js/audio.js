// Motor de áudio: metrônomo, bateria sintetizada, acordes, baixo modelo (Karplus-Strong),
// gravação do microfone com o quadro exato de cada amostra, e calibração de latência.
import {freqMidi, parseProgressao, acordeEm, temposPorCompasso} from './musica.js';

let ctx = null;
let mestre = null;
let ruido = null;

export function audio() {
	if (!ctx) {
		ctx = new (window.AudioContext || window.webkitAudioContext)({latencyHint: 'interactive'});
		const comp = ctx.createDynamicsCompressor();
		comp.threshold.value = -10;
		comp.ratio.value = 4;
		mestre = ctx.createGain();
		mestre.gain.value = 0.9;
		mestre.connect(comp).connect(ctx.destination);
		ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const d = ruido.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
	}
	if (ctx.state === 'suspended') ctx.resume();
	return ctx;
}
export const agora = () => audio().currentTime;

function env(g, t, pico, ataque, decai) {
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t + ataque);
	g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + decai);
}
function osc(tipo, f, t, dur, pico, destino = mestre, ataque = 0.001) {
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = tipo;
	o.frequency.setValueAtTime(f, t);
	env(g, t, pico, ataque, dur);
	o.connect(g).connect(destino);
	o.start(t);
	o.stop(t + ataque + dur + 0.05);
	return o;
}
function barulho(t, dur, pico, filtro, f, q = 1, ataque = 0.001) {
	const s = ctx.createBufferSource();
	s.buffer = ruido;
	s.playbackRate.value = 0.8 + Math.random() * 0.4;
	const fl = ctx.createBiquadFilter();
	fl.type = filtro;
	fl.frequency.value = f;
	fl.Q.value = q;
	const g = ctx.createGain();
	env(g, t, pico, ataque, dur);
	s.connect(fl).connect(g).connect(mestre);
	s.start(t, Math.random() * 0.5);
	s.stop(t + ataque + dur + 0.05);
}

// O clique é agudo e curto (2,4 a 3,2 kHz) para o filtro da análise separar o clique do baixo.
export const volumes = {click: 0.8, bateria: 0.7, acordes: 0.35, baixo: 0.8};
export function click(t, nivel = 1) {
	const f = nivel >= 1 ? 3200 : nivel >= 0.6 ? 2400 : 2000;
	osc('sine', f, t, 0.02, volumes.click * (nivel >= 1 ? 1 : nivel >= 0.6 ? 0.75 : 0.35));
}

export const INSTR = {
	kick(t, v) {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.frequency.setValueAtTime(130, t);
		o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
		env(g, t, v * volumes.bateria, 0.002, 0.35);
		o.connect(g).connect(mestre);
		o.start(t);
		o.stop(t + 0.45);
	},
	snare(t, v) {
		barulho(t, 0.16, v * volumes.bateria * 0.7, 'highpass', 1500);
		osc('triangle', 190, t, 0.07, v * volumes.bateria * 0.5);
	},
	hat(t, v) { barulho(t, 0.035, v * volumes.bateria * 0.35, 'highpass', 7500); },
	hatAberto(t, v) { barulho(t, 0.28, v * volumes.bateria * 0.3, 'highpass', 7000); },
	ride(t, v) {
		barulho(t, 0.5, v * volumes.bateria * 0.22, 'bandpass', 6500, 0.8);
		osc('sine', 3900, t, 0.4, v * volumes.bateria * 0.04);
	},
	rim(t, v) {
		osc('triangle', 1750, t, 0.025, v * volumes.bateria * 0.5);
		osc('square', 520, t, 0.012, v * volumes.bateria * 0.15);
	},
	shaker(t, v) { barulho(t, 0.05, v * volumes.bateria * 0.25, 'bandpass', 8000, 1.5, 0.008); },
	clap(t, v) {
		for (let i = 0; i < 3; i++) barulho(t + i * 0.011, i === 2 ? 0.12 : 0.01, v * volumes.bateria * 0.5, 'bandpass', 1400, 1.2);
	},
	surdo(t, v) {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.frequency.setValueAtTime(95, t);
		o.frequency.exponentialRampToValueAtTime(58, t + 0.15);
		env(g, t, v * volumes.bateria, 0.003, 0.7);
		o.connect(g).connect(mestre);
		o.start(t);
		o.stop(t + 0.8);
	},
	tamborim(t, v) {
		osc('triangle', 980, t, 0.05, v * volumes.bateria * 0.4);
		barulho(t, 0.02, v * volumes.bateria * 0.2, 'highpass', 4000);
	},
	zabumba(t, v) {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.frequency.setValueAtTime(110, t);
		o.frequency.exponentialRampToValueAtTime(62, t + 0.1);
		env(g, t, v * volumes.bateria, 0.002, 0.3);
		o.connect(g).connect(mestre);
		o.start(t);
		o.stop(t + 0.4);
	},
	triangulo(t, v) { for (const f of [1250, 3150, 4700]) osc('sine', f, t, 0.06, v * volumes.bateria * 0.08); },
	trianguloAberto(t, v) { for (const f of [1250, 3150, 4700]) osc('sine', f, t, 0.45, v * volumes.bateria * 0.08); },
};

const VEL = {X: 1, x: 0.72, g: 0.32, o: 0.8};

// Acorde curto tipo piano elétrico, vozes fechadas perto do dó central.
export function acorde(ac, t, dur, v = 1) {
	const notas = ac.tons.map((pc) => 52 + ((pc - 52 % 12 + 12) % 12)).sort((a, b) => a - b);
	for (const m of notas) {
		osc('sine', freqMidi(m), t, Math.min(dur, 1.4), volumes.acordes * 0.22 * v, mestre, 0.004);
		osc('triangle', freqMidi(m) * 2, t, Math.min(dur, 0.5), volumes.acordes * 0.04 * v, mestre, 0.004);
	}
}

// Baixo modelo por Karplus-Strong. Cache por nota e técnica.
const cacheKS = new Map();
function ks(midi, tipo) {
	const k = `${midi}-${tipo}`;
	if (cacheKS.has(k)) return cacheKS.get(k);
	const sr = ctx.sampleRate;
	const f = freqMidi(midi);
	const secs = 2;
	const N = Math.max(2, Math.round(sr / f));
	const out = new Float32Array(Math.floor(sr * secs));
	const buf = new Float32Array(N);
	for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
	const brilho = tipo === 'slap' || tipo === 'pop';
	const passes = brilho ? 0 : 3;
	for (let p = 0; p < passes; p++) for (let i = 1; i < N; i++) buf[i] = (buf[i] + buf[i - 1]) / 2;
	const damp = brilho ? 0.997 : 0.996;
	let idx = 0;
	for (let n = 0; n < out.length; n++) {
		const a = buf[idx];
		const b = buf[(idx + 1) % N];
		out[n] = a;
		buf[idx] = damp * 0.5 * (a + b);
		idx = (idx + 1) % N;
	}
	let lp = 0;
	const alfa = brilho ? 0.6 : 0.18;
	let max = 0;
	for (let n = 0; n < out.length; n++) {
		lp += alfa * (out[n] - lp);
		out[n] = lp * Math.exp(-n / sr / (brilho ? 0.5 : 1.1));
		max = Math.max(max, Math.abs(out[n]));
	}
	const ab = ctx.createBuffer(1, out.length, sr);
	const d = ab.getChannelData(0);
	for (let n = 0; n < out.length; n++) d[n] = out[n] / (max || 1);
	cacheKS.set(k, ab);
	return ab;
}
export function notaBaixo(midi, t, dur, {fantasma, slap, pop, acento} = {}, v = 1) {
	if (fantasma) {
		barulho(t, 0.04, volumes.baixo * 0.25 * v, 'lowpass', 500);
		return;
	}
	const s = ctx.createBufferSource();
	s.buffer = ks(midi, slap ? 'slap' : pop ? 'pop' : 'dedo');
	const g = ctx.createGain();
	const pico = volumes.baixo * v * (acento ? 1 : 0.7);
	g.gain.setValueAtTime(pico, t);
	g.gain.setValueAtTime(pico, t + Math.max(0.03, dur - 0.03));
	g.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.05, dur));
	s.connect(g).connect(mestre);
	s.start(t);
	s.stop(t + dur + 0.05);
}

// Agenda em blocos à frente do relógio (um setInterval de 25 ms), para nada atrasar.
export class Agendador {
	constructor(proximo) {
		this.proximo = proximo; // (agora) => devolve false quando acabou
		this.id = null;
	}
	iniciar() {
		audio();
		const tick = () => {
			if (this.proximo(ctx.currentTime + 0.15) === false) this.parar();
		};
		tick();
		this.id = setInterval(tick, 25);
	}
	parar() {
		clearInterval(this.id);
		this.id = null;
	}
}

// Metrônomo. cfg: bpm, compasso (4 | "7/8"), subdiv, modo: normal|2e4|1|gap|subdiv,
// gap: [com, sem], subir: {mais, cada, ate}. aoTempo(i, t) para piscar a tela.
export function metronomo(cfg, aoTempo) {
	audio();
	const den = typeof cfg.compasso === 'string' ? Number(cfg.compasso.split('/')[1]) : 4;
	const num = typeof cfg.compasso === 'string' ? Number(cfg.compasso.split('/')[0]) : cfg.compasso ?? 4;
	const unidade = 4 / den; // em semínimas
	// início de cada grupo (7/8 = 2+2+3 -> 0, 2, 4)
	const acentos = cfg.grupos ? cfg.grupos.reduce((a, g) => [...a, a[a.length - 1] + g], [0]).slice(0, -1) : [0];
	const sub = den === 8 ? 1 : cfg.subdiv ?? 1;
	let bpm = cfg.bpm;
	let t = ctx.currentTime + 0.1;
	let i = 0;
	const ag = new Agendador((ate) => {
		while (t < ate) {
			const pulso = Math.floor(i / sub);
			const dentro = i % sub;
			const compasso = Math.floor(pulso / num);
			const naBarra = pulso % num;
			let toca = true;
			if (cfg.modo === '2e4') toca = dentro === 0 && naBarra % 2 === 1;
			else if (cfg.modo === '1') toca = dentro === 0 && naBarra === 0;
			else if (cfg.modo === 'gap') toca = compasso % (cfg.gap[0] + cfg.gap[1]) < cfg.gap[0];
			if (cfg.modo !== 'subdiv' && cfg.modo !== 'gap' && dentro !== 0) toca = false;
			if (toca) {
				click(t, dentro !== 0 ? 0.3 : naBarra === 0 ? 1 : acentos.includes(naBarra) ? 0.75 : 0.6);
			}
			if (dentro === 0 && aoTempo) {
				const at = t;
				const info = {pulso: naBarra, compasso, bpm, toca};
				setTimeout(() => aoTempo(info), Math.max(0, (at - ctx.currentTime) * 1000));
			}
			const passo = (60 / bpm) * unidade / sub;
			t += passo;
			i++;
			if (cfg.subir && dentro === sub - 1 && naBarra === num - 1 && (compasso + 1) % cfg.subir.cada === 0) {
				bpm = Math.min(cfg.subir.ate, bpm + cfg.subir.mais);
			}
		}
	});
	ag.iniciar();
	return {parar: () => ag.parar(), bpm: () => bpm};
}

// Groove de prática: bateria + acordes + baixo opcional (raiz no padrão do groove, ou walking).
export function tocarGroove(groove, {bpm, progressao, baixo = 'nenhum', linhaWalking}) {
	audio();
	const ciclo = groove.ciclo; // em semínimas
	const passos = groove.passos;
	const bpmQ = bpm * (groove.pulso ?? 1);
	const passoDur = (60 / bpmQ) * (ciclo / passos);
	const prog = progressao ? parseProgressao(progressao, temposPorCompasso(groove.compasso)) : null;
	const totalProg = prog ? prog[prog.length - 1].inicio + prog[prog.length - 1].dur : 0;
	let t = ctx.currentTime + 0.12;
	let i = 0;
	let ultimoAc = null;
	const ag = new Agendador((ate) => {
		while (t < ate) {
			const k = i % passos;
			const tempoAbs = (i * ciclo) / passos; // em semínimas
			let ts = t;
			if (groove.swing && passos / ciclo === 4 && k % 2 === 1) ts += groove.swing * passoDur;
			for (const [faixa, padrao] of Object.entries(groove.faixas)) {
				const ch = padrao[k];
				if (!ch || ch === '.') continue;
				const nome = ch === 'o' && INSTR[`${faixa}Aberto`] ? `${faixa}Aberto` : faixa;
				INSTR[nome]?.(ts, VEL[ch] ?? 0.7);
			}
			if (prog) {
				const p = acordeEm(prog, tempoAbs);
				const novo = p !== ultimoAc && Math.abs(((tempoAbs % totalProg) - p.inicio)) < 1e-6;
				const ch = groove.comp?.[k];
				if (ch && ch !== '.') acorde(p.acorde, ts, passoDur * 3, VEL[ch] ?? 0.7);
				else if (novo && !groove.comp) acorde(p.acorde, ts, 1.2, 0.8);
				ultimoAc = p;
				if (baixo === 'raiz') {
					const cb = groove.baixo?.[k];
					if (cb && cb !== '.') {
						const m = 28 + ((p.acorde.baixo - 4 + 12) % 12) + (p.acorde.baixo < 4 ? 12 : 0);
						notaBaixo(m, ts, passoDur * 2.5, {acento: cb === 'X'});
					}
				} else if (baixo === 'walking' && linhaWalking) {
					const total = linhaWalking.length ? linhaWalking[linhaWalking.length - 1].t + linhaWalking[linhaWalking.length - 1].d : 0;
					const x = tempoAbs % total;
					for (const e of linhaWalking) if (Math.abs(e.t - x) < 1e-6) notaBaixo(e.midi, ts, (60 / bpmQ) * e.d * 0.95, {});
				}
			}
			t += passoDur;
			i++;
		}
	});
	ag.iniciar();
	return {parar: () => ag.parar()};
}

// Toca uma lista de eventos (o modelo do drill). Devolve o instante do tempo 1 do compasso 1.
export function tocarEventos(eventos, {bpm, contagem = 1, tempos = 4, clickModo = 'normal', comBaixo = true, comClick = true, voltas = 1}) {
	audio();
	const s = 60 / bpm;
	const inicio = ctx.currentTime + 0.15 + contagem * tempos * s;
	for (let c = 0; c < contagem * Math.ceil(tempos); c++) click(inicio - (contagem * tempos - c) * s, c % Math.ceil(tempos) === 0 ? 1 : 0.6);
	const total = eventos.length ? eventos[eventos.length - 1].t + eventos[eventos.length - 1].d : 0;
	if (comClick) {
		for (let k = 0; k < Math.round(total * voltas); k++) {
			const naBarra = k % Math.ceil(tempos);
			if (clickModo === '2e4' && naBarra % 2 === 0) continue;
			if (clickModo === '1' && naBarra !== 0) continue;
			click(inicio + k * s, naBarra === 0 ? 1 : 0.6);
		}
	}
	if (comBaixo) {
		for (let v = 0; v < voltas; v++) {
			for (const e of eventos) {
				if (e.pausa) continue;
				notaBaixo(e.midi, inicio + (v * total + e.t) * s, e.d * s * (e.staccato ? 0.45 : 0.95), e);
			}
		}
	}
	return {inicio, fim: inicio + total * voltas * s};
}

// ---------- Gravação ----------
const WORKLET = `
class Gravador extends AudioWorkletProcessor {
	constructor() { super(); this.buf = new Float32Array(4096); this.n = 0; this.inicio = 0; }
	process(inputs) {
		const ch = inputs[0] && inputs[0][0];
		if (ch) {
			if (this.n === 0) this.inicio = currentFrame;
			this.buf.set(ch, this.n);
			this.n += ch.length;
			if (this.n + 128 > this.buf.length) {
				this.port.postMessage({quadro: this.inicio, dados: this.buf.slice(0, this.n)});
				this.n = 0;
			}
		}
		return true;
	}
}
registerProcessor('gravador', Gravador);`;
let workletPronto = null;

export async function abrirMicrofone() {
	audio();
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1},
	});
	if (!workletPronto) {
		const url = URL.createObjectURL(new Blob([WORKLET], {type: 'application/javascript'}));
		workletPronto = ctx.audioWorklet.addModule(url);
	}
	await workletPronto;
	return stream;
}

// Grava do microfone. Devolve {parar(): Promise<{dados, sr, inicioCtx}>}. inicioCtx é o tempo do
// contexto da primeira amostra: com ele, o tempo de cada clique agendado vira índice da gravação.
export function gravar(stream) {
	const src = ctx.createMediaStreamSource(stream);
	const node = new AudioWorkletNode(ctx, 'gravador');
	const mudo = ctx.createGain();
	mudo.gain.value = 0;
	src.connect(node).connect(mudo).connect(ctx.destination);
	const partes = [];
	node.port.onmessage = (e) => partes.push(e.data);
	return {
		parar: () => new Promise((ok) => {
			setTimeout(() => {
				src.disconnect();
				node.disconnect();
				node.port.onmessage = null;
				if (!partes.length) return ok(null);
				const q0 = partes[0].quadro;
				const fim = partes[partes.length - 1].quadro + partes[partes.length - 1].dados.length;
				const dados = new Float32Array(fim - q0);
				for (const p of partes) dados.set(p.dados, p.quadro - q0);
				ok({dados, sr: ctx.sampleRate, inicioCtx: q0 / ctx.sampleRate});
			}, 120);
		}),
	};
}
export const fecharMicrofone = (stream) => stream?.getTracks().forEach((t) => t.stop());

export function tocarBuffer(dados, sr) {
	audio();
	const b = ctx.createBuffer(1, dados.length, sr);
	b.getChannelData(0).set(dados);
	const s = ctx.createBufferSource();
	s.buffer = b;
	s.connect(mestre);
	s.start();
	return s;
}
