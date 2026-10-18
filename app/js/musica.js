// Núcleo musical: notas, escalas, acordes, a notação das linhas e os geradores de exercício.
// Roda no navegador e no Node (scripts/validar.mjs usa o mesmo arquivo).

export const NOMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const PC = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};

export function pcDe(nome) {
	const m = /^([A-G])([#b]?)/.exec(nome);
	if (!m) throw new Error(`nota inválida: ${nome}`);
	let p = PC[m[1]];
	if (m[2] === '#') p++;
	if (m[2] === 'b') p--;
	return (p + 12) % 12;
}
export const nomePc = (pc) => NOMES[((pc % 12) + 12) % 12];
export const nomeMidi = (m) => nomePc(m) + (Math.floor(m / 12) - 1);
export const freqMidi = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const midiFreq = (f) => 69 + 12 * Math.log2(f / 440);

// MIDI das cordas soltas. E1 = 28 (41,2 Hz).
export const CORDAS = {B: 23, E: 28, A: 33, D: 38, G: 43, C: 48};
export const AFINACOES = {EADG: ['E', 'A', 'D', 'G'], BEADG: ['B', 'E', 'A', 'D', 'G']};

export const ESCALAS = {
	maior: [0, 2, 4, 5, 7, 9, 11],
	menor: [0, 2, 3, 5, 7, 8, 10],
	dorico: [0, 2, 3, 5, 7, 9, 10],
	frigio: [0, 1, 3, 5, 7, 8, 10],
	lidio: [0, 2, 4, 6, 7, 9, 11],
	mixolidio: [0, 2, 4, 5, 7, 9, 10],
	locrio: [0, 1, 3, 5, 6, 8, 10],
	menorHarmonica: [0, 2, 3, 5, 7, 8, 11],
	menorMelodica: [0, 2, 3, 5, 7, 9, 11],
	pentaMaior: [0, 2, 4, 7, 9],
	pentaMenor: [0, 3, 5, 7, 10],
	blues: [0, 3, 5, 6, 7, 10],
	alterada: [0, 1, 3, 4, 6, 8, 10],
	dominanteDiminuta: [0, 1, 3, 4, 6, 7, 9, 10],
	diminuta: [0, 2, 3, 5, 6, 8, 9, 11],
	bebopDominante: [0, 2, 4, 5, 7, 9, 10, 11],
	lidioDominante: [0, 2, 4, 6, 7, 9, 10],
	frigioDominante: [0, 1, 4, 5, 7, 8, 10],
	tonsInteiros: [0, 2, 4, 6, 8, 10],
	cromatica: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const ACORDES = {
	'': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], '7M': [0, 4, 7, 11],
	m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], 'ø': [0, 3, 6, 10], dim: [0, 3, 6], 'º': [0, 3, 6],
	dim7: [0, 3, 6, 9], 'º7': [0, 3, 6, 9], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 9: [0, 4, 7, 10, 14],
	m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10],
	'7b9': [0, 4, 7, 10, 13], '7#9': [0, 4, 7, 10, 15], '7alt': [0, 4, 10, 13, 15], 13: [0, 4, 7, 10, 14, 21],
	mmaj7: [0, 3, 7, 11], 'm7M': [0, 3, 7, 11], '7#11': [0, 4, 7, 10, 18], aug: [0, 4, 8], '7#5': [0, 4, 8, 10],
};

export function parseAcorde(s) {
	const [cifra, baixo] = s.trim().split('/');
	const m = /^([A-G][#b]?)(.*)$/.exec(cifra);
	if (!m) throw new Error(`acorde inválido: ${s}`);
	const q = m[2].replace(/[()]/g, '');
	const iv = ACORDES[q];
	if (!iv) throw new Error(`qualidade de acorde desconhecida: ${s}`);
	const raiz = pcDe(m[1]);
	return {nome: s.trim(), raiz, baixo: baixo ? pcDe(baixo) : raiz, intervalos: iv, tons: iv.map((i) => (raiz + i) % 12)};
}

// "| Dm7 G7 | Cmaj7 |" -> [{acorde, inicio, dur}] em tempos (semínimas). Um acorde por compasso,
// ou vários repartidos igualmente. "%" repete o compasso anterior.
export function parseProgressao(txt, tempos = 4) {
	const compassos = txt.split('|').map((c) => c.trim()).filter(Boolean);
	const out = [];
	let t = 0;
	let anterior = null;
	for (const c of compassos) {
		const nomes = c === '%' ? anterior : c.split(/\s+/);
		anterior = nomes;
		const d = tempos / nomes.length;
		for (const n of nomes) {
			out.push({acorde: parseAcorde(n), inicio: t, dur: d});
			t += d;
		}
	}
	return out;
}

export const CICLO_QUARTAS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];

// Duração em tempos (semínima = 1). "4" semínima, "8." colcheia pontuada, "8t" colcheia de tercina,
// "16q" semicolcheia de quintina (5 por tempo), "2", "1".
export function parseDur(s) {
	const m = /^(1|2|4|8|16|32)(\.?)([tq]?)$/.exec(s);
	if (!m) throw new Error(`duração inválida: ${s}`);
	let d = 4 / Number(m[1]);
	if (m[2]) d *= 1.5;
	if (m[3] === 't') d *= 2 / 3;
	if (m[3] === 'q') d *= 4 / 5;
	return d;
}

// Harmônico natural: casa -> semitons acima da corda solta.
const HARMONICOS = {12: 12, 7: 19, 19: 19, 5: 24, 24: 24, 4: 28, 9: 28};

// Notação das linhas. Fichas separadas por espaço:
//   E5:16   corda E, casa 5, semicolcheia     r:8   pausa de colcheia
//   sem ":dur" repete a duração anterior      "|" separa compassos (conferido pelo validador)
//   (E5:16 A7 D7)*4  repete o grupo           A5*8  repete a ficha
// Modificadores logo após a casa: x fantasma, s slap (polegar), p pop, h hammer-on, u pull-off,
// l slide, n harmônico natural, > acento, ^ staccato, ~ legato.
export function expandir(txt) {
	let s = txt;
	for (let i = 0; i < 10 && /\(([^()]*)\)\*(\d+)/.test(s); i++) {
		s = s.replace(/\(([^()]*)\)\*(\d+)/g, (_, g, n) => Array(Number(n)).fill(g.trim()).join(' '));
	}
	return s
		.split(/\s+/)
		.filter(Boolean)
		.flatMap((tk) => {
			const m = /^(.+)\*(\d+)$/.exec(tk);
			return m ? Array(Number(m[2])).fill(m[1]) : [tk];
		});
}

export function parseLinha(txt) {
	const ev = [];
	let t = 0;
	let dur = 1;
	const barras = [];
	for (const tk of expandir(txt)) {
		if (tk === '|') {
			barras.push(t);
			continue;
		}
		let m = /^r(?::(.+))?$/.exec(tk);
		if (m) {
			if (m[1]) dur = parseDur(m[1]);
			ev.push({t, d: dur, pausa: true});
			t += dur;
			continue;
		}
		m = /^([BEADGC])(\d{1,2})([xsphuln>^~]*)(?::(.+))?$/.exec(tk);
		if (!m) throw new Error(`ficha inválida: "${tk}"`);
		if (m[4]) dur = parseDur(m[4]);
		const mods = m[3];
		const casa = Number(m[2]);
		let midi = CORDAS[m[1]] + casa;
		if (mods.includes('n')) {
			if (!HARMONICOS[casa]) throw new Error(`harmônico natural não existe na casa ${casa}`);
			midi = CORDAS[m[1]] + HARMONICOS[casa];
		}
		ev.push({
			t, d: dur, midi, corda: m[1], casa,
			fantasma: mods.includes('x'), slap: mods.includes('s'), pop: mods.includes('p'),
			hammer: mods.includes('h'), pull: mods.includes('u'), slide: mods.includes('l'),
			harmonico: mods.includes('n'), acento: mods.includes('>'), staccato: mods.includes('^'), legato: mods.includes('~'),
		});
		t += dur;
	}
	return {eventos: ev, total: t, barras};
}

// Escolhe corda e casa para uma nota dentro de uma janela de posição (casa inicial).
export function posicionar(midi, afin, pos, corda) {
	let best = null;
	for (const c of afin) {
		if (corda && c !== corda) continue;
		const casa = midi - CORDAS[c];
		if (casa < 0 || casa > 24) continue;
		const fora = casa < pos ? pos - casa : casa > pos + 4 ? casa - pos - 4 : 0;
		const custo = fora * 2 + Math.abs(casa - (pos + 1.5)) * 0.1;
		if (!best || custo < best.custo) best = {corda: c, casa, custo};
	}
	if (!best) throw new Error(`nota ${nomeMidi(midi)} fora do braço`);
	return best;
}

// Gerador pseudoaleatório com semente (o mesmo dia gera o mesmo exercício).
export function rng(seed) {
	let a = typeof seed === 'string' ? [...seed].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 7) : seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const raizGrave = (pc, min = 28) => min + ((pc - (min % 12) + 12) % 12);
// janela de posição razoável para uma nota: casas até ~14, sem subir à toa
const posPadrao = (m) => Math.min(10, Math.max(0, m - 35));

function notasParaEventos(midis, dur, afin, pos, corda) {
	let t = 0;
	return midis.map((m) => {
		const p = posicionar(m, afin, pos, corda);
		const e = {t, d: dur, midi: m, corda: p.corda, casa: p.casa};
		t += dur;
		return e;
	});
}

function padraoGraus(n, padrao) {
	const idx = [...Array(n).keys()];
	const desce = (a) => a.slice(0, -1).reverse();
	switch (padrao) {
		case 'sobe': return idx;
		case 'desce': return idx.slice().reverse();
		case 'tercas': {
			const s = [];
			for (let i = 0; i + 2 < n; i++) s.push(i, i + 2);
			const d = [];
			for (let i = n - 1; i - 2 >= 0; i--) d.push(i, i - 2);
			return [...s, ...d];
		}
		case 'quartas': {
			const s = [];
			for (let i = 0; i + 3 < n; i++) s.push(i, i + 3);
			const d = [];
			for (let i = n - 1; i - 3 >= 0; i--) d.push(i, i - 3);
			return [...s, ...d];
		}
		case 'grupos4': {
			const s = [];
			for (let i = 0; i + 3 < n; i++) s.push(i, i + 1, i + 2, i + 3);
			const d = [];
			for (let i = n - 1; i - 3 >= 0; i--) d.push(i, i - 1, i - 2, i - 3);
			return [...s, ...d];
		}
		case 'grupos3': {
			const s = [];
			for (let i = 0; i + 2 < n; i++) s.push(i, i + 1, i + 2);
			const d = [];
			for (let i = n - 1; i - 2 >= 0; i--) d.push(i, i - 1, i - 2);
			return [...s, ...d];
		}
		default: return [...idx, ...desce(idx)];
	}
}

// Ajusta uma lista de eventos para fechar compassos inteiros, preenchendo com pausa.
function fecharCompasso(ev, tempos) {
	const fim = ev.length ? ev[ev.length - 1].t + ev[ev.length - 1].d : 0;
	const resto = (tempos - (fim % tempos)) % tempos;
	if (resto > 1e-6) ev.push({t: fim, d: resto, pausa: true});
	return ev;
}

const deslocar = (ev, dt) => ev.map((e) => ({...e, t: e.t + dt}));
const fimDe = (ev) => (ev.length ? ev[ev.length - 1].t + ev[ev.length - 1].d : 0);

function gerarEscala(g, afin) {
	const pc = pcDe(g.tom);
	const iv = ESCALAS[g.escala];
	if (!iv) throw new Error(`escala desconhecida: ${g.escala}`);
	const min = g.corda ? CORDAS[g.corda] : CORDAS[afin[0]] + (g.casaMin ?? 1);
	const base = raizGrave(pc, min) + (g.oitavaAcima ? 12 : 0);
	const oit = g.oitavas ?? 2;
	const notas = [];
	for (let o = 0; o < oit; o++) for (const i of iv) notas.push(base + 12 * o + i);
	notas.push(base + 12 * oit);
	const ordem = padraoGraus(notas.length, g.padrao);
	const pos = g.posicao ?? Math.max(0, posicionar(base, afin).casa - 1);
	return notasParaEventos(ordem.map((i) => notas[i]), parseDur(g.figura ?? '8'), afin, pos, g.corda);
}

function tonsDoAcorde(ac, padrao) {
	const iv = ac.intervalos.slice(0, 4);
	switch (padrao) {
		case '7531': return [...iv].reverse();
		case '13578753': return [...iv, 12, ...iv.slice(1).reverse()];
		case '3571': return [iv[1], iv[2], iv[3] ?? 12, 12];
		case 'aprox': return iv.flatMap((i) => [i - 1, i]);
		default: return iv;
	}
}

function gerarArpejo(g, afin) {
	const acordes = (g.acordes ?? []).map(parseAcorde);
	const dur = parseDur(g.figura ?? '8');
	let ultima = null;
	const midis = [];
	for (const ac of acordes) {
		if (g.padrao === 'proxima') {
			// começa na nota do acorde mais próxima da última tocada, e sobe pelas notas do acorde
			const cand = [];
			for (let m = 28; m <= 60; m++) if (ac.tons.includes(m % 12)) cand.push(m);
			const ref = ultima ?? raizGrave(ac.raiz, 31);
			const inicio = cand.reduce((a, b) => (Math.abs(b - ref) < Math.abs(a - ref) ? b : a));
			const i0 = cand.indexOf(inicio);
			// sobe pelas notas do acorde; se passar da região média do braço, desce
			const seq = cand[i0 + 3] <= 55 ? cand.slice(i0, i0 + 4) : cand.slice(Math.max(0, i0 - 3), i0 + 1).reverse();
			midis.push(...seq);
			ultima = seq[seq.length - 1];
		} else {
			const r = raizGrave(ac.raiz, g.raizMin ?? 31);
			const seq = tonsDoAcorde(ac, g.padrao).map((i) => r + i);
			midis.push(...seq);
			ultima = seq[seq.length - 1];
		}
	}
	const pos = g.posicao;
	let t = 0;
	return midis.map((m) => {
		const p = posicionar(m, afin, pos ?? posPadrao(m));
		const e = {t, d: dur, midi: m, corda: p.corda, casa: p.casa};
		t += dur;
		return e;
	});
}

// Permutação cromática de dedos: sobe as cordas na posição, desloca uma casa e desce.
function gerarPermutacao(g, afin) {
	const dedos = [...(g.dedos ?? '1234')].map(Number);
	const dur = parseDur(g.figura ?? '16');
	let casa = g.casa ?? 5;
	const ev = [];
	let t = 0;
	for (let r = 0; r < (g.voltas ?? 2); r++) {
		const cordas = r % 2 === 0 ? afin : [...afin].reverse();
		const ds = r % 2 === 0 ? dedos : [...dedos].reverse();
		for (const c of cordas) {
			for (const d of ds) {
				const k = casa + d - 1;
				ev.push({t, d: dur, midi: CORDAS[c] + k, corda: c, casa: k});
				t += dur;
			}
		}
		casa += 1;
	}
	return ev;
}

// Walking bass: tempo 1 na raiz, passagem por notas do acorde e aproximação cromática no último
// tempo antes da troca. feel 2 = mínimas.
export function gerarWalking(g, afin = AFINACOES.EADG, tempos = 4) {
	const prog = parseProgressao(g.progressao, tempos);
	const r = rng(g.semente ?? 'walk');
	const passo = g.feel === 2 ? 2 : 1;
	const ev = [];
	let atual = raizGrave(prog[0].acorde.raiz, 31);
	const perto = (pc, ref, lim = [28, 55]) => {
		let best = null;
		for (let m = lim[0]; m <= lim[1]; m++) if (m % 12 === pc && (best === null || Math.abs(m - ref) < Math.abs(best - ref))) best = m;
		return best;
	};
	for (let i = 0; i < prog.length; i++) {
		const {acorde, inicio, dur} = prog[i];
		const prox = prog[(i + 1) % prog.length].acorde;
		const n = Math.round(dur / passo);
		const raiz = perto(acorde.raiz, atual);
		const notas = [raiz];
		const sobe = (r() < 0.5 || raiz < 34) && raiz < 48;
		// notas do acorde (sem a raiz) na direção escolhida
		const cand = [];
		for (let m = raiz - 12; m <= raiz + 12; m++) if (m >= 28 && m <= 55 && m !== raiz && acorde.tons.includes(m % 12)) cand.push(m);
		const meio = (sobe ? cand.filter((m) => m > raiz).sort((a, b) => a - b) : cand.filter((m) => m < raiz).sort((a, b) => b - a));
		for (let k = 1; k < n - 1; k++) notas.push(meio[k - 1] ?? meio[meio.length - 1] ?? raiz + 7);
		if (n > 1) {
			const alvo = perto(prox.raiz, notas[notas.length - 1]);
			notas.push(alvo + (r() < 0.6 ? -1 : 1));
		}
		notas.forEach((m, k) => {
			const p = posicionar(m, afin, posPadrao(raiz));
			ev.push({t: inicio + k * passo, d: passo, midi: m, corda: p.corda, casa: p.casa});
		});
		atual = notas[notas.length - 1];
	}
	return ev;
}

// Leitura à primeira vista: células rítmicas de um tempo, melodia em passos dentro da escala.
const CELULAS = {
	1: [['4'], ['8', '8'], ['4'], ['8', '8'], ['r4'], ['8.', '16'], ['2']],
	2: [['8', '8'], ['8.', '16'], ['16', '16', '8'], ['8', '16', '16'], ['16', '8', '16'], ['r8', '8'], ['16', '16', '16', '16'], ['r16', '16', '8']],
	3: [['16', '16', '16', '16'], ['8t', '8t', '8t'], ['r16', '16', 'r16', '16'], ['16', '8.'], ['r8t', '8t', '8t'], ['16', '8', '16'], ['r16', '8', '16'], ['8.', '16']],
};
export function gerarLeitura(g, afin = AFINACOES.EADG, tempos = 4) {
	const r = rng(g.semente ?? 'leitura');
	const nivel = g.nivel ?? 1;
	const tons = nivel === 1 ? ['C', 'G', 'F', 'D'] : nivel === 2 ? ['Bb', 'A', 'Eb', 'E', 'D', 'F'] : ['Ab', 'Db', 'B', 'F#', 'E', 'Eb'];
	const tom = g.tom ?? tons[Math.floor(r() * tons.length)];
	const escala = g.escala ?? (nivel === 3 ? ['dorico', 'mixolidio', 'menorMelodica'][Math.floor(r() * 3)] : r() < 0.5 ? 'maior' : 'menor');
	const iv = ESCALAS[escala];
	const base = raizGrave(pcDe(tom), 30);
	const notas = [];
	for (let o = 0; o < 3; o++) for (const i of iv) notas.push(base + 12 * o + i);
	const teto = nivel === 3 ? 60 : 52;
	const pool = notas.filter((m) => m <= teto);
	let idx = Math.floor(pool.length / 3);
	const ev = [];
	let t = 0;
	const compassos = g.compassos ?? 4;
	while (t < compassos * tempos - 1e-6) {
		const cel = CELULAS[nivel][Math.floor(r() * CELULAS[nivel].length)];
		const restante = compassos * tempos - t;
		const durCel = cel.reduce((s, c) => s + parseDur(c.replace('r', '')), 0);
		if (durCel > restante + 1e-6) continue;
		if (durCel > 1 && t % tempos > tempos - durCel) continue;
		for (const c of cel) {
			const d = parseDur(c.replace('r', ''));
			if (c.startsWith('r')) ev.push({t, d, pausa: true});
			else {
				const salto = nivel === 1 ? [-1, 1, -2, 2] : [-1, 1, -2, 2, -3, 3, -4, 4];
				idx += salto[Math.floor(r() * salto.length)];
				if (idx < 0) idx = -idx; // rebate nas bordas em vez de grudar nelas
				if (idx > pool.length - 1) idx = 2 * (pool.length - 1) - idx;
				const m = pool[idx];
				const p = posicionar(m, afin, posPadrao(base + 7));
				ev.push({t, d, midi: m, corda: p.corda, casa: p.casa});
			}
			t += d;
		}
	}
	return {eventos: ev, tom, escala};
}

// Cercaduras (enclosures): nota de cima na escala, semitom abaixo, alvo. Alvo = 3ª de cada acorde.
function gerarCercadura(g, afin) {
	const prog = parseProgressao(g.progressao);
	const ev = [];
	for (const {acorde, inicio} of prog) {
		const alvo = raizGrave(acorde.tons[1], 36);
		const seq = [alvo + 2, alvo - 1, alvo, raizGrave(acorde.raiz, 31)];
		seq.forEach((m, k) => {
			const p = posicionar(m, afin, posPadrao(alvo));
			ev.push({t: inicio + k, d: 1, midi: m, corda: p.corda, casa: p.casa});
		});
	}
	return ev;
}

// Aplica um gerador em vários tons. "{t}" no nome dos acordes vira o tom da vez.
function emTons(g, afin, fn, tempos) {
	let tons = g.tons === 'quartas' ? CICLO_QUARTAS : g.tons;
	if (g.tons === 'diario') {
		// sorteio do dia, sem repetir tom
		const r = rng(g.semente);
		tons = [...CICLO_QUARTAS].sort(() => r() - 0.5).slice(0, g.quantos ?? 3);
	}
	let ev = [];
	for (const tom of tons) {
		const sub = {...g, tom, acordes: g.acordes?.map((a) => a.replaceAll('{t}', tom)), progressao: g.progressao?.replaceAll('{t}', tom)};
		const parte = fecharCompasso(fn(sub, afin), tempos);
		ev = ev.concat(deslocar(parte, fimDe(ev)));
	}
	ev.tons = tons;
	return ev;
}

// Monta os eventos de um drill (linha escrita ou gerador). semente muda os exercícios diários.
export function eventosDoDrill(drill, afinNome = 'EADG', semente) {
	const afin = AFINACOES[afinNome] ?? AFINACOES.EADG;
	const tempos = temposPorCompasso(drill.compasso);
	if (drill.linha) {
		const {eventos} = parseLinha(drill.linha);
		return {eventos: fecharCompasso(eventos, tempos)};
	}
	const diario = drill.gerar.diario || drill.gerar.tons === 'diario' || drill.gerar.tom === 'diario';
	const g = {...drill.gerar, semente: diario ? `${drill.id}-${semente}` : drill.gerar.semente ?? drill.id};
	if (g.tom === 'diario') g.tom = CICLO_QUARTAS[Math.floor(rng(g.semente)() * 12)];
	if (g.escalas) {
		// vários modos/escalas sobre o mesmo centro, um após o outro
		let ev = [];
		for (const escala of g.escalas) {
			const parte = fecharCompasso(gerarEscala({...g, escala}, afin), tempos);
			ev = ev.concat(deslocar(parte, fimDe(ev)));
		}
		return {eventos: ev, info: `${g.tom}: ${g.escalas.join(', ')}`};
	}
	const fns = {escala: gerarEscala, arpejo: gerarArpejo, permutacao: gerarPermutacao, cercadura: gerarCercadura,
		walking: (x, a) => gerarWalking(x, a, tempos)};
	if (g.tipo === 'leitura' || g.tipo === 'ditado') {
		const r = gerarLeitura(g, afin, tempos);
		return {eventos: fecharCompasso(r.eventos, tempos), info: `${r.tom} ${r.escala}`};
	}
	const fn = fns[g.tipo];
	if (!fn) throw new Error(`gerador desconhecido: ${g.tipo}`);
	const ev = g.tons ? emTons(g, afin, fn, tempos) : fn(g, afin);
	return {eventos: fecharCompasso(ev, tempos), info: ev.tons ? `Tons: ${ev.tons.join(' · ')}` : g.tom ? `Tom: ${g.tom}` : undefined};
}

// compasso: 4 | "5/4" | "7/8" -> número de semínimas
export function temposPorCompasso(c) {
	if (c == null) return 4;
	if (typeof c === 'number') return c;
	const [n, d] = c.split('/').map(Number);
	return (n * 4) / d;
}

// Progressão atrelada a um drill, alinhada ao tempo (para o modo "alvos" e o acompanhamento).
export function acordeEm(prog, t) {
	if (!prog?.length) return null;
	const total = prog[prog.length - 1].inicio + prog[prog.length - 1].dur;
	const x = ((t % total) + total) % total;
	return prog.find((p) => x >= p.inicio - 1e-6 && x < p.inicio + p.dur - 1e-6) ?? prog[0];
}

export function conjuntoEscala(tom, escala) {
	const pc = pcDe(tom);
	return ESCALAS[escala].map((i) => (pc + i) % 12);
}
