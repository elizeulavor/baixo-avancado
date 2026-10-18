// Groove: os dez jogos de ritmo. Tudo puro (sem áudio nem tela), para testar no Node.
// Um "roteiro" é a sessão compasso a compasso: onde soa o clique, onde você deve tocar (alvos),
// que compassos são avaliados. A avaliação casa os ataques detectados com os alvos de cada
// compasso e devolve o que a tela pinta ao vivo; no fim, o resumo vira estrelas.
import {rng, temposPorCompasso} from './musica.js';
import {detectarAtaques} from './analise.js';

const media = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const dp = (a) => {
	if (a.length < 2) return 0;
	const m = media(a);
	return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};

// ---------- frases rítmicas (12 ticks por tempo: semicolcheia = 3, tercina = 4) ----------
export const TPB = 12;
const CEL = {
	q: [0], c: [0, 6], cp: [6], p: [],
	s4: [0, 3, 6, 9], s3a: [0, 6, 9], s3b: [0, 3, 6], se3: [3, 6, 9], gal: [0, 9], gali: [0, 3], s1a: [0, 3, 9],
	ea: [3, 9], sa: [9], se: [3], ae: [6, 9],
	t3: [0, 4, 8], t2a: [0, 8], t2b: [4, 8], t2c: [0, 4],
};
// padrões de um compasso inteiro, em semicolcheias (x = ataque)
const BRASIL = ['x..x..x.x..x..x.', 'x..x...xx..x...x', 'x.....x.x.....x.', 'x..x....x..x....', '..x...x...x..x..', 'x..x..x...x.x...', 'x..x...x..x.x...', 'x..x..x.x.......', '.x..x.x..x..x.x.'];
export const NIVEIS_FRASE = [
	null,
	{nome: 'Semínimas e colcheias', cel: {q: 3, c: 3, p: 1}, bpm: 80},
	{nome: 'Colcheias e antecipação', cel: {c: 3, cp: 2, q: 2, p: 1}, antecipa: 0.35, bpm: 84},
	{nome: 'Semicolcheias', cel: {s4: 2, s3a: 2, s3b: 2, c: 2, q: 1}, bpm: 76},
	{nome: 'Semicolcheias sincopadas', cel: {s4: 1, s3a: 2, s3b: 2, gal: 2, se3: 2, se: 1, c: 1}, antecipa: 0.25, bpm: 80},
	{nome: 'Células de funk', cel: {gal: 2, s1a: 2, se3: 2, sa: 1, ea: 2, p: 1, s4: 1, gali: 1}, antecipa: 0.35, bpm: 88},
	{nome: 'Tercinas', cel: {t3: 3, t2a: 2, t2b: 1, c: 2, q: 1}, bpm: 76},
	{nome: 'Síncope rápida', cel: {s4: 1, s3a: 1, s3b: 1, gal: 2, se3: 2, ea: 2, sa: 1, s1a: 2, gali: 1}, antecipa: 0.35, bpm: 96},
	{nome: 'Frases de 2 compassos', cel: {s4: 1, s3a: 2, s3b: 2, gal: 2, se3: 2, se: 1, c: 2, q: 1, p: 1}, antecipa: 0.3, compassos: 2, bpm: 84},
	{nome: 'Brasil: tresillo, partido alto, baião', padroes: BRASIL, bpm: 90},
	{nome: 'Tudo misturado', cel: {s4: 1, s3a: 1, gal: 2, se3: 1, ea: 2, sa: 1, s1a: 1, t3: 1, t2a: 1, c: 1, p: 1}, antecipa: 0.35, bpm: 100},
];
const pesado = (obj, R) => {
	const lista = Object.entries(obj);
	let x = R() * lista.reduce((s, [, p]) => s + p, 0);
	for (const [k, p] of lista) if ((x -= p) <= 0) return k;
	return lista[0][0];
};
// frase: {ticks: [ataques em ticks desde o início], compassos}
export function gerarFrase(nivel, R = Math.random) {
	const nf = NIVEIS_FRASE[Math.max(1, Math.min(10, nivel))];
	const comp = nf.compassos ?? 1;
	for (let tent = 0; tent < 40; tent++) {
		let ticks = [];
		if (nf.padroes) {
			const pd = nf.padroes[Math.floor(R() * nf.padroes.length)];
			ticks = [...pd].flatMap((ch, i) => (ch === 'x' ? [i * 3] : []));
		} else {
			const cels = Array.from({length: 4 * comp}, () => pesado(nf.cel, R));
			// antecipação: o tempo termina no "a" e o seguinte não ataca no 1 (a nota liga por cima)
			if (nf.antecipa && R() < nf.antecipa) {
				const k = Math.floor(R() * (cels.length - 1));
				cels[k] = R() < 0.5 ? 'sa' : CEL[cels[k]].includes(9) ? cels[k] : 'gal';
				if (CEL[cels[k + 1]].includes(0)) cels[k + 1] = ['cp', 'p', 'se3', 'ea', 'ae'].filter((c) => nf.cel[c] || c === 'p')[Math.floor(R() * 2)] ?? 'p';
			}
			ticks = cels.flatMap((c, k) => CEL[c].map((t) => k * TPB + t));
		}
		const porComp = Array.from({length: comp}, (_, c) => ticks.filter((t) => t >= c * 4 * TPB && t < (c + 1) * 4 * TPB).length);
		if (porComp.every((n) => n >= 3 && n <= 14)) return {ticks, compassos: comp};
	}
	return {ticks: [0, 12, 24, 36], compassos: 1};
}
// troca a célula de um tempo (para as opções erradas do ditado)
export function mutarFrase(f, nivel, R = Math.random) {
	const nf = NIVEIS_FRASE[Math.max(1, Math.min(10, nivel))];
	const tempos = 4 * f.compassos;
	for (let tent = 0; tent < 30; tent++) {
		const k = Math.floor(R() * tempos);
		const resto = f.ticks.filter((t) => Math.floor(t / TPB) !== k);
		let nova;
		if (nf.padroes) {
			// desloca um ataque uma semicolcheia
			const dentro = f.ticks.filter((t) => Math.floor(t / TPB) === k);
			if (!dentro.length) continue;
			const alvo = dentro[Math.floor(R() * dentro.length)];
			const novoT = alvo + (R() < 0.5 ? -3 : 3);
			if (novoT < 0 || novoT >= tempos * TPB || f.ticks.includes(novoT)) continue;
			nova = [...f.ticks.filter((t) => t !== alvo), novoT];
		} else {
			const c = CEL[pesado(nf.cel, R)].map((t) => k * TPB + t);
			nova = [...resto, ...c];
		}
		nova.sort((a, b) => a - b);
		if (JSON.stringify(nova) !== JSON.stringify(f.ticks) && nova.length >= 2) return {ticks: nova, compassos: f.compassos};
	}
	return null;
}
// grade para desenhar: por tempo, 4 casas (semicolcheia) ou 3 (tercina)
export function gradeDaFrase(f) {
	const tempos = 4 * f.compassos;
	return Array.from({length: tempos}, (_, k) => {
		const dentro = f.ticks.filter((t) => Math.floor(t / TPB) === k).map((t) => t % TPB);
		const terc = dentro.some((t) => t % 3 !== 0);
		const casas = terc ? [0, 4, 8] : [0, 3, 6, 9];
		return {terc, casas: casas.map((c) => dentro.includes(c))};
	});
}

// ---------- os jogos ----------
const GROOVES_BUMBO = ['rock', 'pop', 'disco', 'funk', 'reggae', 'shuffle', 'gospel', 'neosoul', 'samba', 'partidoalto', 'baiao', 'xote', 'bossa', 'frevo', 'seisoito', 'cinco', 'sete'];
const GROOVES_UM = [
	{gs: ['rock', 'pop'], tol: 0.12, teclado: true}, {gs: ['disco', 'funk'], tol: 0.11, teclado: true},
	{gs: ['reggae', 'shuffle'], tol: 0.11, teclado: true}, {gs: ['gospel', 'neosoul'], tol: 0.1, teclado: true},
	{gs: ['samba', 'partidoalto'], tol: 0.1, teclado: true}, {gs: ['baiao', 'xote', 'frevo'], tol: 0.1, teclado: true},
	{gs: ['bossa', 'jazz'], tol: 0.1, teclado: true}, {gs: ['funk', 'neosoul', 'partidoalto'], tol: 0.09, teclado: false},
	{gs: ['seisoito', 'cinco'], tol: 0.09, teclado: true}, {gs: ['sete', 'reggae', 'samba'], tol: 0.08, teclado: false},
];
export const JOGOS = {
	relogio: {nome: 'Relógio', icone: '⌛', mic: true, grupo: 'pulso',
		desc: 'O clique some e volta. Você segura o tempo sozinho; o app mede onde você estava quando ele voltou.',
		niveis: [[80, 1, 2, 2, 4], [92, 2, 2, 2, 4], [72, 1, 1, 3, 4], [100, 2, 1, 3, 4], [84, 4, 2, 2, 3], [64, 1, 1, 4, 3], [110, 2, 1, 4, 3], [76, 4, 1, 3, 3], [56, 1, 1, 6, 2], [96, 4, 1, 6, 2], [54, 1, 1, 8, 2], [70, 2, 1, 12, 1]]
			.map(([bpm, sub, com, sem, ciclos]) => ({bpm, sub, com, sem, ciclos, rotulo: `${bpm} BPM · ${['', 'semínimas', 'colcheias', '', 'semicolcheias'][sub]} · ${com} com, ${sem} sem clique`}))},
	contratempo: {nome: 'Contratempo', icone: '↯', mic: true, grupo: 'pulso',
		desc: 'O clique sai do lugar (2 e 4, "&", "e", "a", tercina, ciclos de 3 e 5). Você toca no tempo de verdade.',
		niveis: [
			{bpm: 90, pos: [1, 3], rotulo: 'clique no 2 e 4'}, {bpm: 90, pos: [3], rotulo: 'clique só no 4'},
			{bpm: 80, off: 0.5, rotulo: 'clique no "&" de cada tempo'}, {bpm: 108, off: 0.5, rotulo: 'clique no "&", mais rápido'},
			{bpm: 70, off: 0.25, rotulo: 'clique no "e" (2ª semicolcheia)'}, {bpm: 70, off: 0.75, rotulo: 'clique no "a" (4ª semicolcheia)'},
			{bpm: 72, off: 1 / 3, rotulo: 'clique na 2ª tercina'}, {bpm: 72, off: 2 / 3, rotulo: 'clique na 3ª tercina'},
			{bpm: 96, off: 0.75, rotulo: 'clique no "a", a 96'}, {bpm: 84, cada: 0.75, rotulo: 'clique a cada 3 semicolcheias'},
			{bpm: 80, cada: 1.25, rotulo: 'clique a cada 5 semicolcheias'}, {bpm: 100, cada: 1.5, rotulo: 'clique a cada 3 colcheias (3 contra 2)'},
		].map((n) => ({...n, rotulo: `${n.bpm} BPM · ${n.rotulo}`}))},
	bolso: {nome: 'Bolso', icone: '◐', mic: true, grupo: 'pocket', latencia: true,
		desc: 'Em cima, atrás ou na frente do tempo, de propósito. O app mede a média de cada compasso em milissegundos.',
		niveis: [
			{bpm: 90, segs: [[0, 10]]}, {bpm: 90, segs: [[20, 10]]}, {bpm: 100, segs: [[-15, 9]]}, {bpm: 76, segs: [[0, 7]]},
			{bpm: 88, segs: [[0, 8], [20, 8]], cada: 4}, {bpm: 70, segs: [[30, 10]]}, {bpm: 96, segs: [[20, 8], [-15, 8]], cada: 4},
			{bpm: 110, segs: [[0, 5]]}, {bpm: 64, segs: [[25, 7]]}, {bpm: 92, segs: [[0, 7], [20, 7], [-15, 7], [0, 7]], cada: 2},
		].map((n) => ({...n, rotulo: `${n.bpm} BPM · ${n.segs.map(([a]) => nomeBolso(a)).join(' / ')}${n.cada ? ` a cada ${n.cada} compassos` : ''} · ±${n.segs[0][1]} ms`}))},
	escada: {nome: 'Escada', icone: '𝄖', mic: true, grupo: 'subdivisao',
		desc: '1, 2, 3, 4, 5, 6 notas por tempo, sem parar. Trocar de subdivisão sem mexer no pulso.',
		niveis: [
			{bpm: 70, seq: [1, 2, 4, 2, 1], rep: 2}, {bpm: 64, seq: [1, 2, 3, 4, 3, 2, 1], rep: 2}, {bpm: 80, seq: [1, 2, 3, 4, 3, 2, 1], rep: 2},
			{bpm: 60, seq: [2, 3, 4, 5, 4, 3, 2], rep: 2}, {bpm: 56, seq: [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1], rep: 1}, {bpm: 66, seq: [4, 3, 4, 6, 4, 5, 4, 3], rep: 1},
			{bpm: 60, surpresa: [2, 3, 4, 5, 6], n: 10}, {bpm: 72, surpresa: [2, 3, 4, 5, 6], n: 10}, {bpm: 76, seq: [4, 5, 6, 5, 4, 3, 4, 6], rep: 1},
			{bpm: 84, surpresa: [3, 4, 5, 6], n: 12},
		].map((n) => ({...n, rotulo: `${n.bpm} BPM · ${n.surpresa ? `surpresa (${n.surpresa.join(', ')})` : n.seq.join('-')}`}))},
	eco: {nome: 'Eco', icone: '⇄', mic: true, grupo: 'ouvido',
		desc: 'O baixo toca uma frase; no compasso seguinte você devolve igual. Sem ver: de ouvido.',
		niveis: NIVEIS_FRASE.slice(1).map((nf, k) => ({frase: k + 1, bpm: nf.bpm, rotulo: `${nf.bpm} BPM · ${nf.nome}`}))},
	bumbo: {nome: 'Bumbo', icone: '◉', mic: true, grupo: 'pocket',
		desc: 'Trave com o bumbo: toque o padrão de baixo de 17 estilos, do rock ao 7/8.',
		niveis: GROOVES_BUMBO.map((g) => ({groove: g, rotulo: g}))},
	swing: {nome: 'Swing', icone: '≈', mic: true, grupo: 'subdivisao',
		desc: 'Colcheias retas, leves, em tercina ou duras. O app mede a razão do swing tempo a tempo.',
		niveis: [
			{bpm: 100, alvos: [50]}, {bpm: 100, alvos: [67]}, {bpm: 110, alvos: [58]}, {bpm: 96, alvos: [50, 67], cada: 2},
			{bpm: 120, alvos: [71]}, {bpm: 72, alvos: [67]}, {bpm: 150, alvos: [62]}, {bpm: 104, alvos: [58, 71], cada: 2},
		].map((n) => ({...n, rotulo: `${n.bpm} BPM · ${n.alvos.map((a) => `${nomeSwing(a)} ${a}%`).join(' / ')}${n.cada ? ` a cada ${n.cada}` : ''}`}))},
	ondeum: {nome: 'Onde está o 1', icone: '①', toque: true, grupo: 'ouvido',
		desc: 'O groove começa no meio do compasso. Ache o 1 e bata na tela em cada 1.',
		niveis: GROOVES_UM.map((n) => ({...n, rotulo: `${n.gs.join(', ')}${n.teclado ? '' : ' · só bateria'} · ±${Math.round(n.tol * 1000)} ms`}))},
	ditado: {nome: 'Ditado rítmico', icone: '▦', toque: true, grupo: 'ouvido',
		desc: 'Ouça a frase e escolha a grade certa entre quatro.',
		niveis: NIVEIS_FRASE.slice(1).map((nf, k) => ({frase: k + 1, bpm: nf.bpm, rotulo: nf.nome}))},
	andamento: {nome: 'Andamento', icone: '♩=', toque: true, grupo: 'pulso',
		desc: 'Memória de BPM: diga o andamento de um groove, ou bata um andamento sem referência.',
		niveis: [10, 8, 6, 5, 4, 3, 2].map((tol, k) => ({tol, toque: k >= 2, rotulo: `±${tol} BPM${k >= 2 ? ' · com "bata o andamento"' : ''}`}))},
};
export const ORDEM = ['relogio', 'contratempo', 'bolso', 'escada', 'eco', 'bumbo', 'swing', 'ondeum', 'ditado', 'andamento'];
export function nomeBolso(ms) {
	return ms > 4 ? `atrás +${ms}` : ms < -4 ? `na frente ${ms}` : 'em cima';
}
export function nomeSwing(r) {
	return r <= 52 ? 'reto' : r < 63 ? 'leve' : r < 69 ? 'tercina' : 'duro';
}

// ---------- faixas (pelas estrelas somadas) ----------
export const FAIXAS = [[0, 'Pulso'], [15, 'Subdivisão'], [40, 'Contratempo'], [75, 'Síncope'], [120, 'Bolso'], [170, 'Groove'], [230, 'Relógio suíço'], [290, 'Mestre do bolso']];
export const totalNiveis = () => ORDEM.reduce((s, j) => s + JOGOS[j].niveis.length, 0);
export function faixa(estrelas) {
	let i = 0;
	while (i + 1 < FAIXAS.length && estrelas >= FAIXAS[i + 1][0]) i++;
	return {n: i + 1, nome: FAIXAS[i][1], prox: FAIXAS[i + 1] ?? null, base: FAIXAS[i][0], frac: FAIXAS[i + 1] ? (estrelas - FAIXAS[i][0]) / (FAIXAS[i + 1][0] - FAIXAS[i][0]) : 1};
}

// ---------- roteiros dos jogos de microfone ----------
// compasso: {tipo, avaliar, cliques: [{b, f}], alvos: [{b, ...}], ...}; b em semínimas desde o início do compasso.
// grooves: lista de grooves.json (para o Bumbo). Devolve {bpm, bpmQ, tempos, barDur, compasso(k), total, ...}.
export function roteiro(jogo, nivel, {grooves = [], R = Math.random, fone = false} = {}) {
	const J = JOGOS[jogo];
	const nv = J.niveis[nivel - 1];
	const r = {jogo, nivel, nv, tempos: 4, contagem: 1, comps: [], resultados: [], precisaLatencia: !!J.latencia, acompanhamento: null};
	const batida = (tempos = 4) => Array.from({length: Math.ceil(tempos)}, (_, k) => ({b: k, f: k === 0 ? 1 : 0.6}));
	const contagem = () => ({tipo: 'contagem', avaliar: false, cliques: batida(r.tempos), alvos: []});
	const subdiv = (sub, tempos = 4) => Array.from({length: tempos * sub}, (_, k) => ({b: k / sub, sub}));
	let lista = [];
	if (jogo === 'relogio') {
		r.bpm = nv.bpm;
		lista.push(contagem());
		for (let c = 0; c < nv.ciclos; c++) {
			for (let k = 0; k < nv.com; k++) lista.push({tipo: c > 0 && k === 0 ? 'volta' : 'com', avaliar: true, cliques: batida(), alvos: subdiv(nv.sub)});
			for (let k = 0; k < nv.sem; k++) lista.push({tipo: 'gap', avaliar: true, cliques: [], alvos: subdiv(nv.sub), gapN: k + 1, gapDe: nv.sem});
		}
		lista.push({tipo: 'volta', avaliar: true, cliques: batida(), alvos: subdiv(nv.sub), ultimo: true});
	} else if (jogo === 'contratempo') {
		r.bpm = nv.bpm;
		lista.push(contagem());
		const n = nv.cada ? 12 : 8;
		for (let c = 0; c < n; c++) {
			let cliques;
			if (nv.pos) cliques = nv.pos.map((b) => ({b, f: 0.8}));
			else if (nv.off != null) cliques = [0, 1, 2, 3].map((k) => ({b: k + nv.off, f: 0.8}));
			else {
				// ciclo que atravessa a barra: posições absolutas a cada "cada" tempos
				cliques = [];
				for (let t = Math.ceil((c * 4) / nv.cada - 1e-9) * nv.cada; t < (c + 1) * 4 - 1e-9; t += nv.cada) cliques.push({b: t - c * 4, f: 0.8});
			}
			lista.push({tipo: 'tocar', avaliar: true, cliques, alvos: subdiv(1)});
		}
	} else if (jogo === 'bolso') {
		r.bpm = nv.bpm;
		lista.push(contagem());
		const n = nv.cada ? 16 : 8;
		for (let c = 0; c < n; c++) {
			const [alvoMs, tol] = nv.segs[nv.cada ? Math.floor(c / nv.cada) % nv.segs.length : 0];
			lista.push({tipo: 'tocar', avaliar: true, cliques: batida(), alvos: subdiv(2), alvoMs, tol});
		}
	} else if (jogo === 'escada') {
		r.bpm = nv.bpm;
		lista.push(contagem());
		let seq;
		if (nv.surpresa) {
			seq = [];
			while (seq.length < nv.n) {
				const s = nv.surpresa[Math.floor(R() * nv.surpresa.length)];
				if (s !== seq.at(-1)) seq.push(s);
			}
		} else seq = nv.seq.flatMap((s) => Array(nv.rep).fill(s));
		seq.forEach((s, k) => lista.push({tipo: 'tocar', avaliar: true, cliques: batida(), alvos: subdiv(s), sub: s, prox: seq[k + 1] ?? null}));
	} else if (jogo === 'eco') {
		const nf = NIVEIS_FRASE[nv.frase];
		r.bpm = nf.bpm;
		lista.push(contagem());
		const pares = nf.compassos === 2 ? 6 : 8;
		for (let k = 0; k < pares; k++) {
			const f = gerarFrase(nv.frase, R);
			for (let c = 0; c < f.compassos; c++) lista.push(chamada(f, c, k));
			for (let c = 0; c < f.compassos; c++) lista.push(resposta(f, c, k));
		}
	} else if (jogo === 'bumbo') {
		const g = grooves.find((x) => x.id === nv.groove);
		if (!g) throw new Error(`groove ${nv.groove} não existe`);
		r.groove = g;
		r.bpm = g.bpm;
		r.tempos = g.ciclo; // um "compasso" do jogo = um ciclo do groove
		r.pulso = g.pulso ?? 1;
		r.acompanhamento = {groove: g, completo: fone};
		const passoB = g.ciclo / g.passos;
		const alvos = [...g.baixo].flatMap((ch, k) => (ch === '.' ? [] : [{b: k * passoB + (g.swing && g.passos / g.ciclo === 4 && k % 2 === 1 ? g.swing * passoB : 0), forte: ch === 'X'}]));
		const tc = temposPorCompasso(g.compasso);
		const pulsoClique = g.compasso === '7/8' ? [0, 1, 2] : g.compasso === '6/8' ? [0, 1.5] : [...Array(Math.round(tc)).keys()];
		const cliquesCiclo = [];
		for (let c0 = 0; c0 < g.ciclo - 1e-9; c0 += tc) for (const p of pulsoClique) cliquesCiclo.push({b: c0 + p, f: p === 0 ? 1 : 0.6});
		lista.push({tipo: 'contagem', avaliar: false, cliques: cliquesCiclo, alvos: []});
		const ciclos = Math.max(4, Math.round(32 / g.ciclo));
		for (let c = 0; c < ciclos; c++) lista.push({tipo: 'tocar', avaliar: true, cliques: fone ? [] : cliquesCiclo, alvos: alvos.map((a) => ({...a}))});
	} else if (jogo === 'swing') {
		r.bpm = nv.bpm;
		lista.push(contagem());
		const n = nv.cada ? 12 : 8;
		for (let c = 0; c < n; c++) {
			const razao = nv.alvos[nv.cada ? Math.floor(c / nv.cada) % nv.alvos.length : 0];
			const alvos = [0, 1, 2, 3].flatMap((k) => [{b: k, lado: 'on'}, {b: k + razao / 100, lado: 'off'}]);
			lista.push({tipo: 'tocar', avaliar: true, cliques: batida(), alvos, razao});
		}
	} else throw new Error(`${jogo} não é jogo de microfone`);
	r.bpmQ = r.bpm * (r.pulso ?? 1);
	r.barDur = (60 / r.bpmQ) * r.tempos;
	r.comps = lista;
	r.total = lista.length;
	r.compasso = (k) => r.comps[k] ?? null;
	marcarJanelas(r);
	return r;
}
function chamada(f, c, par) {
	const ticks = f.ticks.filter((t) => t >= c * 4 * TPB && t < (c + 1) * 4 * TPB).map((t) => t - c * 4 * TPB);
	return {tipo: 'chamada', avaliar: false, cliques: [0, 1, 2, 3].map((b) => ({b, f: b === 0 ? 0.8 : 0.45})), frase: f, parte: c, par, notas: ticks.map((t, i) => ({b: t / TPB, d: ((ticks[i + 1] ?? 4 * TPB) - t) / TPB})), alvos: []};
}
function resposta(f, c, par) {
	const ticks = f.ticks.filter((t) => t >= c * 4 * TPB && t < (c + 1) * 4 * TPB).map((t) => t - c * 4 * TPB);
	return {tipo: 'resposta', avaliar: true, cliques: [0, 1, 2, 3].map((b) => ({b, f: b === 0 ? 0.8 : 0.45})), frase: f, parte: c, par, alvos: ticks.map((t) => ({b: t / TPB}))};
}

// Eco infinito: a frase da chamada é decidida na hora, pela quantidade de acertos até ali
export function roteiroInfinito({R = Math.random, bpm = 84} = {}) {
	const r = {jogo: 'eco', infinito: true, nivel: 1, tempos: 4, bpm, bpmQ: bpm, contagem: 1, comps: [{tipo: 'contagem', avaliar: false, cliques: [0, 1, 2, 3].map((b) => ({b, f: b ? 0.6 : 1})), alvos: []}], resultados: [], vidas: 3, acertos: 0, total: Infinity};
	r.barDur = (60 / bpm) * 4;
	r.nivelAtual = () => Math.min(10, 1 + Math.floor(r.acertos / 3));
	r.compasso = (k) => {
		while (r.comps.length <= k) {
			if (r.vidas <= 0) return null;
			const nf = r.nivelAtual();
			// sem frases de 2 compassos aqui: o ritmo da troca fica constante
			const f = gerarFrase(nf === 8 ? 4 : nf, R);
			const par = (r.comps.length - 1) / 2;
			r.comps.push({...chamada(f, 0, par), nivelFrase: nf}, {...resposta(f, 0, par), nivelFrase: nf});
			marcarJanelas(r);
		}
		return r.comps[k];
	};
	return r;
}

// janela de casamento de cada alvo: no máximo 120 ms e metade da distância aos vizinhos
function marcarJanelas(r) {
	const todos = [];
	r.comps.forEach((c, k) => c.avaliar && c.alvos.forEach((a) => todos.push({a, t: k * r.barDur + (a.b * r.barDur) / r.tempos})));
	todos.sort((x, y) => x.t - y.t);
	todos.forEach((x, i) => {
		const ant = i ? x.t - todos[i - 1].t : Infinity, prox = i + 1 < todos.length ? todos[i + 1].t - x.t : Infinity;
		x.a.jan = Math.min(0.12, ant / 2, prox / 2);
		x.a.t = x.t;
	});
}

// ---------- avaliação de um compasso ----------
// ataques: tempos (s) no relógio do roteiro (0 = início do compasso 0), já descontada a latência.
// usados: lista de ataques já casados, compartilhada entre compassos. As janelas de análise se
// sobrepõem, e o mesmo ataque achado em duas delas pode sair com 1-2 ms de diferença.
const jaUsado = (usados, t) => usados.some((u) => Math.abs(u - t) < 0.008);
// ataques: números (s) ou {t, claro}. Só ataque claro (energia sobe mais de 4 dB) conta como nota a
// mais: a sustentação das notas graves oscila e gera ataques fracos que não são nota nenhuma.
export function avaliarCompasso(r, k, ataques, usados = [], {centrar = false} = {}) {
	const c = r.compasso(k);
	const ini = k * r.barDur, fim = ini + r.barDur;
	const sBeat = r.barDur / r.tempos;
	const at = ataques.map((a) => (typeof a === 'number' ? {t: a, claro: true} : a));
	const pontos = [];
	for (const a of c.alvos) {
		let best = null;
		for (const {t} of at) {
			if (jaUsado(usados, t)) continue;
			const d = Math.abs(t - a.t);
			if (d <= a.jan && (best == null || d < Math.abs(best - a.t))) best = t;
		}
		if (best != null) usados.push(best);
		pontos.push({b: a.b, lado: a.lado, erro: best == null ? null : (best - a.t) * 1000, t: best});
	}
	// ataque a mais: neste compasso, não casado e fora da janela de um alvo do compasso seguinte
	const prox = r.compasso(k + 1);
	const extras = at.filter(({t, claro}) => claro && !jaUsado(usados, t) && t >= ini - 0.06 && t < fim - 0.06 && !(prox?.avaliar && prox.alvos.some((a) => Math.abs(t - a.t) <= a.jan))).map((a) => a.t);
	const erros = pontos.filter((p) => p.erro != null).map((p) => p.erro);
	const m = media(erros);
	const res = {k, tipo: c.tipo, n: c.alvos.length, casados: erros.length, faltas: c.alvos.length - erros.length, extras: extras.length,
		extrasB: extras.map((t) => (t - ini) / sBeat), pontos, media: erros.length ? m : null, desvio: dp(erros), alvoMs: c.alvoMs ?? 0};
	const ref = centrar ? m : res.alvoMs;
	res.erroAbs = erros.length ? media(erros.map((e) => Math.abs(e - ref))) : null;
	res.cobertura = c.alvos.length ? erros.length / c.alvos.length : 1;
	if (r.jogo === 'swing') {
		const razoes = [];
		for (let b = 0; b < 4; b++) {
			const on = pontos.find((p) => p.lado === 'on' && Math.abs(p.b - b) < 1e-6), off = pontos.find((p) => p.lado === 'off' && Math.floor(p.b + 1e-6) === b);
			if (on?.t != null && off?.t != null) razoes.push(((off.t - on.t) / sBeat) * 100);
		}
		res.razoes = razoes;
		res.razao = razoes.length ? media(razoes) : null;
		res.razaoAlvo = c.razao;
	}
	res.nota = notaCompasso(r, c, res, centrar);
	return res;
}
// regra de ataque do groove (scripts/testar-groove.mjs): subida de energia ×1,4 ou fluxo forte.
// VIES: com a nota anterior soando, o ataque sai ~6 ms depois do real (média em takes montados com
// as amostras de baixo; nota isolada dá 0). A validar com os primeiros takes de verdade.
const ESTRITO = {sobe: 1.25, largo: 0.25};
const VIES = 0.006;
// Ao vivo: analisa o trecho da gravação que cobre o compasso k (mais ~2,8 s antes, para o limiar
// dos ataques ter referência) e avalia. gravacao: amostras desde o início da gravação; desloc: onde
// cai o 0 do roteiro na gravação (s), já com a latência.
export function analisarCompassoAoVivo(r, k, gravacao, {sr, desloc, usados, centrar = false}) {
	const iniSeg = desloc + k * r.barDur - 2.8;
	const i0 = Math.max(0, Math.floor(iniSeg * sr));
	const i1 = Math.min(gravacao.length, Math.ceil((desloc + (k + 1) * r.barDur + 0.3) * sr));
	if (i1 - i0 < sr * 0.5) return avaliarCompasso(r, k, [], usados, {centrar});
	const desde = desloc + k * r.barDur - 0.25 - i0 / sr;
	const {ataques} = detectarAtaques(gravacao.subarray(i0, i1), sr, {desde, estrito: ESTRITO});
	const ts = ataques.map((a) => ({t: a.t + i0 / sr - desloc - VIES, claro: a.sobe >= 1.6 && a.largo >= 0.3})).filter(({t}) => t > k * r.barDur - 0.2 && t < (k + 1) * r.barDur + 0.15);
	return avaliarCompasso(r, k, ts, usados, {centrar});
}

// perfeito | bom | fraco | errou: pinta o compasso e alimenta o combo
function notaCompasso(r, c, res, centrar) {
	if (r.jogo === 'swing') {
		if (res.razao == null || res.cobertura < 0.6) return 'errou';
		const d = Math.abs(res.razao - c.razao);
		return d <= 3 && res.cobertura >= 0.9 ? 'perfeito' : d <= 6 ? 'bom' : d <= 10 ? 'fraco' : 'errou';
	}
	if (r.jogo === 'bolso' && !centrar) {
		if (res.media == null || res.cobertura < 0.6) return 'errou';
		const fora = Math.abs(res.media - c.alvoMs);
		return fora <= c.tol * 0.5 && res.desvio <= 12 ? 'perfeito' : fora <= c.tol ? 'bom' : fora <= c.tol * 2 ? 'fraco' : 'errou';
	}
	const lim = r.jogo === 'eco' ? [35, 50] : [15, 28];
	if (res.cobertura === 1 && res.extras === 0 && res.erroAbs <= lim[0]) return 'perfeito';
	if (res.cobertura >= 0.75 && res.extras <= 1 && res.erroAbs <= lim[1]) return 'bom';
	if (res.cobertura >= 0.5) return 'fraco';
	return 'errou';
}

// ---------- resumo e estrelas ----------
export function resumo(r, resultados, {confiavel = false} = {}) {
	const av = resultados.filter(Boolean);
	const pontos = av.flatMap((x) => x.pontos.filter((p) => p.erro != null).map((p) => ({...p, k: x.k, alvoMs: x.alvoMs})));
	const erros = pontos.map((p) => p.erro - (p.alvoMs ?? 0));
	const nAlvos = av.reduce((s, x) => s + x.n, 0);
	const out = {
		compassos: av.length,
		cobertura: nAlvos ? pontos.length / nAlvos : 0,
		desvio: dp(erros), media: confiavel && erros.length ? media(erros) : null,
		extras: av.reduce((s, x) => s + x.extras, 0),
		notas: {perfeito: 0, bom: 0, fraco: 0, errou: 0},
		comboMax: 0,
	};
	let combo = 0;
	for (const x of av) {
		out.notas[x.nota]++;
		combo = x.nota === 'perfeito' || x.nota === 'bom' ? combo + 1 : 0;
		out.comboMax = Math.max(out.comboMax, combo);
	}
	if (r.jogo === 'relogio') {
		// deriva na volta: erro médio em volta do 1 em que o clique volta, menos o erro médio dos
		// compassos com clique antes do silêncio (assim a latência não entra na conta)
		out.voltas = [];
		for (const x of av.filter((y) => y.tipo === 'volta')) {
			const k = x.k;
			const t1 = k * r.barDur;
			const sBeat = r.barDur / r.tempos;
			const janela = pontos.filter((p) => p.t != null && p.t >= t1 - sBeat - 0.03 && p.t <= t1 + 0.05);
			let j = k - 1;
			while (j > 0 && r.compasso(j)?.tipo === 'gap') j--;
			const ref = pontos.filter((p) => p.k <= j && p.k > j - 2 && r.compasso(p.k)?.tipo !== 'gap');
			if (janela.length && ref.length) out.voltas.push(media(janela.map((p) => p.erro)) - media(ref.map((p) => p.erro)));
		}
		out.deriva = out.voltas.length ? media(out.voltas.map(Math.abs)) : null;
		const gaps = av.filter((y) => y.tipo === 'gap');
		out.desvioGap = gaps.length ? media(gaps.map((y) => y.desvio)) : null;
	}
	if (r.jogo === 'bolso') {
		out.semLatencia = !confiavel;
		out.noBolso = av.length ? av.filter((x) => x.nota === 'perfeito' || x.nota === 'bom').length / av.length : 0;
		// média de cada trecho, para o professor dizer onde escorrega
		const por = {};
		for (const x of av) if (x.media != null) (por[x.alvoMs] ??= []).push(x.media);
		out.porAlvo = Object.entries(por).map(([alvo, v]) => ({alvo: Number(alvo), media: media(v)}));
	}
	if (r.jogo === 'escada') {
		out.bons = av.length ? av.filter((x) => x.nota === 'perfeito' || x.nota === 'bom').length / av.length : 0;
		const por = {};
		for (const x of av) (por[r.compasso(x.k).sub] ??= []).push(x);
		out.porSub = Object.entries(por).map(([s, l]) => ({sub: Number(s), bons: l.filter((x) => x.nota === 'perfeito' || x.nota === 'bom').length / l.length, desvio: media(l.map((x) => x.desvio))}));
	}
	if (r.jogo === 'eco') {
		out.respostas = av.length;
		out.perfeitas = out.notas.perfeito;
		out.boas = out.notas.perfeito + out.notas.bom;
	}
	if (r.jogo === 'swing') {
		const rs = av.flatMap((x) => x.razoes.map((v) => ({v, alvo: x.razaoAlvo})));
		out.erroRazao = rs.length ? media(rs.map((x) => Math.abs(x.v - x.alvo))) : null;
		out.desvioRazao = rs.length ? dp(rs.map((x) => x.v - x.alvo)) : null;
		const por = {};
		for (const x of rs) (por[x.alvo] ??= []).push(x.v);
		out.porAlvo = Object.entries(por).map(([alvo, v]) => ({alvo: Number(alvo), media: media(v)}));
	}
	out.estrelas = estrelas(r, out, confiavel);
	return out;
}
// medições compactas de uma rodada (treinador e /revisar)
export function metGroove(s) {
	const um = (v) => (v == null || Number.isNaN(v) ? null : Math.round(v * 10) / 10);
	const desv = (l) => (l?.length ? media(l.map((x) => x.media - x.alvo)) : null);
	return {
		dv: um(s.desvio), md: um(s.media), cob: um(s.cobertura * 100), ex: s.extras, combo: s.comboMax,
		volta: s.voltas?.length ? um(media(s.voltas)) : null, deriva: um(s.deriva),
		noBolso: s.noBolso != null ? um(s.noBolso * 100) : null, foraBolso: s.porAlvo && s.noBolso != null ? um(desv(s.porAlvo)) : null,
		razaoErro: s.erroRazao != null ? um(desv(s.porAlvo)) : null,
		bons: s.bons != null ? um(s.bons * 100) : null, perfeitas: s.perfeitas ?? null, respostas: s.respostas ?? null,
	};
}
const conta = (oks) => (oks[0] ? (oks[1] ? (oks[2] ? 3 : 2) : 1) : 0);
export function estrelas(r, s, confiavel) {
	const md = confiavel && s.media != null ? Math.abs(s.media) : null;
	const okMd = (lim) => md == null || md <= lim;
	switch (r.jogo) {
		case 'relogio':
			if (s.deriva == null) return 0;
			return conta([[45, 25], [28, 20], [16, 16]].map(([d, v]) => s.deriva <= d && s.desvio <= v && s.cobertura >= 0.85));
		case 'contratempo':
			return conta([[22, 25, 0.85], [17, 16, 0.9], [13, 10, 0.95]].map(([v, m, c]) => s.desvio <= v && okMd(m) && s.cobertura >= c));
		case 'bolso':
			if (!confiavel) return 0;
			return conta([[0.5, 18], [0.75, 15], [0.9, 12]].map(([z, v]) => s.noBolso >= z && s.desvio <= v));
		case 'escada':
			return conta([[0.6, 22], [0.8, 18], [0.95, 13]].map(([b, v]) => s.bons >= b && s.desvio <= v));
		case 'eco': {
			const n = s.respostas || 1;
			return conta([s.boas >= n * 0.62, s.boas >= n * 0.87 && s.perfeitas >= n * 0.37, s.boas >= n && s.perfeitas >= n * 0.75]);
		}
		case 'bumbo':
			return conta([[0.85, 20, 20], [0.92, 16, 14], [0.97, 12, 9]].map(([c, v, m]) => s.cobertura >= c && s.desvio <= v && okMd(m)));
		case 'swing':
			if (s.erroRazao == null) return 0;
			return conta([[7, 7], [4.5, 5], [3, 3.5]].map(([e, v]) => s.erroRazao <= e && s.desvioRazao <= v && s.cobertura >= 0.85));
		default:
			return 0;
	}
}

// ---------- jogos de toque ----------
// Onde está o 1: o groove começa num passo sorteado; os 1 caem quando (passo + início) % passos = 0.
export function perguntaUm(nivel, grooves, R = Math.random) {
	const nv = JOGOS.ondeum.niveis[nivel - 1];
	const id = nv.gs[Math.floor(R() * nv.gs.length)];
	const g = grooves.find((x) => x.id === id);
	const tc = temposPorCompasso(g.compasso);
	const passosComp = Math.round((g.passos * tc) / g.ciclo); // passos por compasso
	const inicio = 1 + Math.floor(R() * (passosComp - 1)); // nunca começa no 1
	const bpmQ = g.bpm * (g.pulso ?? 1);
	const passoDur = (60 / bpmQ) * (g.ciclo / g.passos);
	const compDur = passosComp * passoDur;
	const ate = compDur * 4 + (passosComp - inicio) * passoDur; // até o 1 do 5º compasso
	// instantes dos 1 a partir do começo do som
	const uns = [];
	for (let t = (passosComp - inicio) * passoDur; t <= ate + 1e-6; t += compDur) uns.push(t);
	return {groove: g, inicio, passoDur, compDur, uns, dur: ate + passoDur, tol: nv.tol, teclado: nv.teclado};
}
// toques: instantes (s) desde o começo do som, já descontado o atraso do toque
export function avaliarUm(p, toques) {
	const certos = p.uns.map((u) => toques.some((t) => Math.abs(t - u) <= p.tol));
	const errados = toques.filter((t) => !p.uns.some((u) => Math.abs(t - u) <= p.tol)).length;
	// o primeiro 1 é aquecimento; contam os seguintes
	const valem = certos.slice(1);
	const acertou = valem.filter(Boolean).length >= Math.min(2, valem.length) && errados <= 1;
	const desvios = toques.map((t) => {
		const u = p.uns.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
		return (t - u) * 1000;
	}).filter((d) => Math.abs(d) <= p.tol * 1000);
	return {acertou, certos, errados, desvio: desvios.length ? media(desvios) : null, achouEm: certos.indexOf(true)};
}
export function perguntaDitado(nivel, R = Math.random) {
	const nf = JOGOS.ditado.niveis[nivel - 1].frase;
	const certa = gerarFrase(nf, R);
	const opcoes = [certa];
	for (let k = 0; k < 40 && opcoes.length < 4; k++) {
		const m = mutarFrase(opcoes[Math.floor(R() * opcoes.length)], nf, R);
		if (m && !opcoes.some((o) => JSON.stringify(o.ticks) === JSON.stringify(m.ticks))) opcoes.push(m);
	}
	const ordem = opcoes.map((o, i) => ({o, i, s: R()})).sort((a, b) => a.s - b.s);
	return {frase: certa, opcoes: ordem.map((x) => x.o), certa: ordem.findIndex((x) => x.i === 0), bpm: NIVEIS_FRASE[nf].bpm};
}
export function perguntaAndamento(nivel, grooves, R = Math.random, k = 0) {
	const nv = JOGOS.andamento.niveis[nivel - 1];
	const tipo = nv.toque && k % 2 === 1 ? 'toque' : 'qual';
	const bpm = Math.round(60 + R() * (tipo === 'toque' ? 80 : 95));
	const pool = grooves.filter((g) => !g.compasso && !g.pulso && g.ciclo === 4);
	return {tipo, bpm, tol: nv.tol, groove: pool[Math.floor(R() * pool.length)]};
}
// BPM de uma série de toques (regressão dos instantes): imune ao atraso do toque
export function bpmDosToques(ts) {
	if (ts.length < 4) return null;
	const xs = ts.map((_, i) => i), mx = media(xs), my = media(ts);
	const incl = xs.reduce((s, x, i) => s + (x - mx) * (ts[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
	const res = ts.map((t, i) => t - (my + incl * (i - mx)));
	return {bpm: 60 / incl, oscila: dp(res) * 1000};
}
export function estrelasToque(jogo, acertos, total) {
	const f = total ? acertos / total : 0;
	return f >= 1 ? 3 : f >= 0.83 ? 2 : f >= 0.66 ? 1 : 0;
}

// ---------- groove do dia ----------
// três jogos curtos no nível de fronteira: um de microfone (gira), o Eco e um de toque (gira)
export function grooveDoDia(data, nivelDe) {
	const n = Math.floor(new Date(`${data}T12:00`).getTime() / 864e5);
	const mic = ['relogio', 'contratempo', 'bolso', 'escada', 'swing', 'bumbo'][n % 6];
	const toque = ['ondeum', 'ditado', 'andamento'][n % 3];
	return [mic, 'eco', toque].map((jogo) => ({jogo, nivel: nivelDe(jogo)}));
}
export const semente = (s) => rng(s);
