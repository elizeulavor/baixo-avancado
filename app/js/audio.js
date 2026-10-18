// Motor de áudio: tudo com amostras de instrumentos reais (sons.js). Metrônomo de claves, bateria
// e percussão gravadas, Rhodes e piano, baixo elétrico (dedo, ghost, staccato, slap, pop) e baixo
// acústico. Mais a gravação do microfone com o quadro exato de cada amostra.
import {parseProgressao, acordeEm, temposPorCompasso} from './musica.js';
import * as S from './sons.js';

let ctx = null;
let mestre = null;

export function audio() {
	if (!ctx) {
		ctx = new (window.AudioContext || window.webkitAudioContext)({latencyHint: 'interactive'});
		const comp = ctx.createDynamicsCompressor();
		comp.threshold.value = -8;
		comp.ratio.value = 3;
		mestre = ctx.createGain();
		mestre.gain.value = 0.9;
		mestre.connect(comp).connect(ctx.destination);
		S.ligar(ctx, mestre);
	}
	if (ctx.state === 'suspended') ctx.resume();
	return ctx;
}
export const agora = () => audio().currentTime;

// Carrega os grupos de som que uma tela vai usar. aoProgresso(feitos, total) para a barra.
export async function preparar(grupos, aoProgresso) {
	audio();
	const total = {};
	await S.carregar(grupos, (g, n, t) => {
		total[g] = [n, t];
		const f = Object.values(total).reduce((a, [x]) => a + x, 0);
		const tt = Object.values(total).reduce((a, [, y]) => a + y, 0);
		aoProgresso?.(f, tt);
	});
}
export const GRUPOS = {
	click: ['click'],
	modelo: ['click', 'baixo', 'baixoFantasma', 'baixoStaccato', 'slap', 'pop'],
	groove: ['click', 'bateria', 'rhodes', 'piano', 'baixo', 'acustico'],
	jogosGroove: ['bateria', 'baixo', 'rhodes', 'piano', 'acustico', 'ui'],
	ui: ['ui'],
};

export const volumes = {click: 0.9, bateria: 0.8, acordes: 0.55, baixo: 0.9};
export const preferencias = {click: 'claves'}; // claves | madeira

// Clique do metrônomo: claves (ou woodblock). Acento = batida forte; subdivisão = fraca e baixa.
export function click(t, nivel = 1) {
	const madeira = preferencias.click === 'madeira';
	if (nivel >= 1) S.tocar('click', madeira ? 'madeira' : 'forte', t, {ganho: volumes.click});
	else if (nivel >= 0.6) S.tocar('click', madeira ? 'madeira' : 'fraco', t, {ganho: volumes.click * 0.8, taxa: madeira ? 0.85 : 1});
	else S.tocar('click', 'fraco', t, {ganho: volumes.click * 0.35});
}

// Cada faixa do groove aponta para amostras reais. O caractere do padrão dá a força.
const VEL = {X: 1, x: 0.72, g: 0.4, o: 0.85};
let alterna = 0;
// destino da percussão: normalmente a saída; nos jogos de groove sem fone, o passa-altas
let destInstr;
const bt = (id, t, op) => S.tocar('bateria', id, t, {...op, destino: destInstr});
export const INSTR = {
	kick: (t, v) => bt('kick', t, {vel: v, ganho: volumes.bateria}),
	snare: (t, v) => bt('snare', t, {vel: v, ganho: volumes.bateria}),
	hat: (t, v) => bt('hat', t, {vel: v, ganho: volumes.bateria * 0.7}),
	hatAberto: (t, v) => bt('hatAberto', t, {vel: v, ganho: volumes.bateria * 0.6, dur: 0.6}),
	hatPedal: (t, v) => bt('hatPedal', t, {vel: v, ganho: volumes.bateria * 0.7}),
	ride: (t, v) => bt('ride', t, {vel: v, ganho: volumes.bateria * 0.6}),
	rideBell: (t, v) => bt('rideBell', t, {vel: v, ganho: volumes.bateria * 0.5}),
	crash: (t, v) => bt('crash', t, {vel: v, ganho: volumes.bateria * 0.6}),
	rim: (t, v) => bt('rim', t, {vel: v, ganho: volumes.bateria}),
	clap: (t, v) => bt('clap', t, {vel: v, ganho: volumes.bateria * 0.8}),
	shaker: (t, v) => bt((alterna++ % 2) ? 'shaker-2' : 'shaker-1', t, {vel: v, ganho: volumes.bateria * 0.6}),
	ganza: (t, v) => bt('ganza', t, {vel: v, ganho: volumes.bateria * 0.6}),
	pandeiro: (t, v) => bt('pandeiro', t, {vel: v, ganho: volumes.bateria * 0.6}),
	surdo: (t, v) => bt(v < 0.5 ? 'surdoAbafado' : 'surdo', t, {vel: v, ganho: volumes.bateria, taxa: 0.82}),
	tamborim: (t, v) => bt('tamborim', t, {vel: v, ganho: volumes.bateria * 0.7, taxa: 1.15}),
	zabumba: (t, v) => {
		bt('kick', t, {vel: v, ganho: volumes.bateria});
		bt('tumba', t, {vel: v, ganho: volumes.bateria * 0.4, taxa: 0.7});
	},
	triangulo: (t, v) => bt('triangulo', t, {vel: v, ganho: volumes.bateria * 0.45}),
	trianguloAberto: (t, v) => bt('trianguloAberto', t, {vel: v, ganho: volumes.bateria * 0.45, dur: 0.5}),
	agogo: (t, v) => bt(v >= 0.8 ? 'agogoAlto' : 'agogoBaixo', t, {vel: 0.8, ganho: volumes.bateria * 0.45}),
	cowbell: (t, v) => bt('cowbell', t, {vel: v, ganho: volumes.bateria * 0.5}),
	conga: (t, v) => bt(v >= 0.9 ? 'congaTapa' : 'conga', t, {vel: v, ganho: volumes.bateria * 0.7}),
	tumba: (t, v) => bt('tumba', t, {vel: v, ganho: volumes.bateria * 0.7}),
	tom: (t, v) => bt('tom', t, {vel: v, ganho: volumes.bateria * 0.8}),
};
// percussão que o microfone não confunde com baixo (tudo acima de 4 kHz depois do passa-altas)
export const AGUDOS = ['hat', 'hatAberto', 'hatPedal', 'ride', 'shaker', 'ganza', 'triangulo', 'pandeiro', 'tamborim'];
let agudo = null;
function saidaAguda() {
	if (!agudo) {
		const a = ctx.createBiquadFilter(), b = ctx.createBiquadFilter();
		for (const f of [a, b]) {
			f.type = 'highpass';
			f.frequency.value = 4000;
			f.Q.value = Math.SQRT1_2;
		}
		a.connect(b).connect(mestre);
		agudo = a;
	}
	return agudo;
}
// Clique dos jogos de groove: chimbal fechado gravado, por um passa-altas de 4 kHz. Sem nada
// abaixo de 4 kHz, a análise (que filtra acima de 1,6 kHz) não confunde o clique com a nota
// (testar-groove: com claves ou chimbal sem filtro, a nota 20 ms depois do clique saía puxada).
export function cliqueGroove(t, f = 1) {
	audio();
	S.tocar('bateria', f >= 1 ? 'hat-1' : 'hat-2', t, {vel: 0.5, ganho: volumes.click * (f >= 1 ? 1.5 : 0.6 + 0.8 * f), destino: saidaAguda()});
}
// Um ciclo do groove a partir de t (bpmQ em semínimas). soAgudos: sem fone, só a percussão aguda,
// filtrada; com fone, a banda inteira (bateria e teclado).
// desde/ate (tempo de contexto): só os passos dentro da janela (começar no meio do ciclo).
export function cicloGroove(g, t, {bpmQ, soAgudos = false, progressao = null, ciclo = 0, desde = -Infinity, ate = Infinity}) {
	audio();
	const passoDur = (60 / bpmQ) * (g.ciclo / g.passos);
	const prog = !soAgudos && progressao ? parseProgressao(progressao, temposPorCompasso(g.compasso)) : null;
	const totalProg = prog ? prog.at(-1).inicio + prog.at(-1).dur : 0;
	destInstr = soAgudos ? saidaAguda() : undefined;
	for (let k = 0; k < g.passos; k++) {
		let ts = t + k * passoDur;
		if (g.swing && g.passos / g.ciclo === 4 && k % 2 === 1) ts += g.swing * passoDur;
		if (ts < desde - 1e-4 || ts >= ate) continue;
		for (const [faixa, padrao] of Object.entries(g.faixas)) {
			if (soAgudos && !AGUDOS.includes(faixa)) continue;
			const ch = padrao[k];
			if (!ch || ch === '.') continue;
			const nome = ch === 'o' && INSTR[`${faixa}Aberto`] ? `${faixa}Aberto` : faixa;
			INSTR[nome]?.(ts, VEL[ch] ?? 0.7);
		}
		if (prog) {
			const tempoAbs = ciclo * g.ciclo + (k * g.ciclo) / g.passos;
			const p = acordeEm(prog, tempoAbs);
			const ch = g.comp?.[k];
			if (ch && ch !== '.') acorde(p.acorde, ts, passoDur * 3, VEL[ch] ?? 0.7, g.teclado);
			else if (!g.comp && Math.abs((tempoAbs % totalProg) - p.inicio) < 1e-6) acorde(p.acorde, ts, 1.2, 0.8, g.teclado);
		}
	}
	destInstr = undefined;
}

// Acorde no Rhodes (ou piano): vozes fechadas perto do dó central, com a raiz omitida (o baixo faz).
export function acorde(ac, t, dur, v = 1, timbre = 'rhodes') {
	const tons = ac.tons.length > 3 ? ac.tons.filter((pc) => pc !== ac.raiz) : ac.tons;
	const notas = tons.map((pc) => 53 + ((pc - (53 % 12) + 12) % 12)).sort((a, b) => a - b);
	for (const m of notas) S.nota(timbre, m, t, {vel: v, ganho: volumes.acordes * 0.5, dur: Math.min(dur, 1.6), soltar: 0.25});
}

// Baixo modelo: a articulação escolhe a gravação (dedo, ghost, staccato, slap, pop).
export function notaBaixo(midi, t, dur, e = {}, v = 1) {
	const grupo = e.fantasma ? 'baixoFantasma' : e.slap ? 'slap' : e.pop ? 'pop' : e.staccato ? 'baixoStaccato' : e.acustico ? 'acustico' : 'baixo';
	const vel = e.fantasma ? 1 : e.acento ? 1 : 0.75 * v;
	const tocou = S.nota(grupo, midi, t, {vel, ganho: volumes.baixo * (e.fantasma ? 0.22 : 1) * (e.harmonico ? 0.6 : 1), dur: e.fantasma ? Math.min(dur, 0.12) : dur, soltar: 0.05});
	if (!tocou && grupo !== 'baixo') S.nota('baixo', midi, t, {vel, ganho: volumes.baixo, dur});
}

// Sons da interface (vibrafone, glockenspiel, prato).
export function somUI(qual) {
	audio();
	const t = ctx.currentTime + 0.02;
	const g = 0.5;
	if (qual === 'aprovado') ['vibra-C', 'vibra-E', 'vibra-G', 'vibra-C5'].forEach((id, i) => S.tocar('ui', id, t + i * 0.07, {ganho: g}));
	else if (qual === 'nivel') {
		S.tocar('ui', 'prato', t, {ganho: 0.35});
		['vibra-C', 'vibra-E', 'vibra-G', 'vibra-C5'].forEach((id) => S.tocar('ui', id, t + 1.6, {ganho: g * 0.8}));
	} else if (qual === 'conquista') {
		S.tocar('ui', 'glock', t, {ganho: g});
		S.tocar('ui', 'sino', t + 0.12, {ganho: g});
	} else if (qual === 'xp') S.tocar('ui', 'glock', t, {ganho: g * 0.4});
	else if (qual === 'tique') S.tocar('click', 'fraco', t, {ganho: 0.3});
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
				if (ch && ch !== '.') acorde(p.acorde, ts, passoDur * 3, VEL[ch] ?? 0.7, groove.teclado);
				else if (novo && !groove.comp) acorde(p.acorde, ts, 1.2, 0.8, groove.teclado);
				ultimoAc = p;
				if (baixo === 'raiz') {
					const cb = groove.baixo?.[k];
					if (cb && cb !== '.') {
						const m = 28 + ((p.acorde.baixo - 4 + 12) % 12) + (p.acorde.baixo < 4 ? 12 : 0);
						notaBaixo(m, ts, passoDur * 2.5, {acento: cb === 'X', acustico: groove.baixoAcustico});
					}
				} else if (baixo === 'walking' && linhaWalking) {
					const total = linhaWalking.length ? linhaWalking[linhaWalking.length - 1].t + linhaWalking[linhaWalking.length - 1].d : 0;
					const x = tempoAbs % total;
					for (const e of linhaWalking) if (Math.abs(e.t - x) < 1e-6) notaBaixo(e.midi, ts, (60 / bpmQ) * e.d * 0.95, {acustico: groove.baixoAcustico});
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
	const sr = ctx.sampleRate;
	return {
		// pedaço da gravação até agora, do instante de contexto t0 (s) ao fim: análise ao vivo
		trecho: (t0 = 0) => {
			const q0 = Math.round(t0 * sr);
			const usar = partes.filter((p) => p.quadro + p.dados.length > q0);
			if (!usar.length) return null;
			const ini = usar[0].quadro, fim = usar.at(-1).quadro + usar.at(-1).dados.length;
			const dados = new Float32Array(fim - ini);
			for (const p of usar) dados.set(p.dados, p.quadro - ini);
			return {dados, sr, inicioCtx: ini / sr};
		},
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
