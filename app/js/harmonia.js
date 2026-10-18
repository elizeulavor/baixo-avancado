// Ouvido harmônico. Gera perguntas num tom (maior ou menor) e toca com piano, Rhodes ou banda
// gravados. A dificuldade de cada pergunta vem da faixa de vocabulário (1 a 5), do número de acordes
// escondidos e do andamento; o rating do aluno (tipo Elo) escolhe a faixa.
import {parseAcorde, CICLO_QUARTAS, pcDe, rng as rngSemente, ACORDES, ESCALAS} from './musica.js';
import * as A from './audio.js';
import * as S from './sons.js';

let R = Math.random;
// semente: o desafio do dia é igual para todo mundo naquele dia
export function usarSemente(s) {
	R = s ? rngSemente(s) : Math.random;
}
const sorteia = (l) => l[Math.floor(R() * l.length)];
const embaralha = (l) => [...l].sort(() => R() - 0.5);

// ---------- vocabulário ----------
// grau: intervalo da raiz, tríade, tétrade, função, faixa em que aparece
const MAIOR = {
	I: {iv: 0, t: '', t7: 'maj7', f: 'T', faixa: 1},
	IV: {iv: 5, t: '', t7: 'maj7', f: 'SD', faixa: 1},
	V: {iv: 7, t: '', t7: '7', f: 'D', faixa: 1},
	vi: {iv: 9, t: 'm', t7: 'm7', f: 'T', faixa: 1},
	ii: {iv: 2, t: 'm', t7: 'm7', f: 'SD', faixa: 2},
	iii: {iv: 4, t: 'm', t7: 'm7', f: 'T', faixa: 2},
	'vii°': {iv: 11, t: 'dim', t7: 'm7b5', f: 'D', faixa: 3},
	'V/V': {iv: 2, t: '7', t7: '7', f: 'D', faixa: 3, sec: 'dominante do V'},
	'V/vi': {iv: 4, t: '7', t7: '7', f: 'D', faixa: 3, sec: 'dominante do vi'},
	'V/ii': {iv: 9, t: '7', t7: '7', f: 'D', faixa: 4, sec: 'dominante do ii'},
	'V/IV': {iv: 0, t: '7', t7: '7', f: 'D', faixa: 4, sec: 'dominante do IV'},
	iv: {iv: 5, t: 'm', t7: 'm7', f: 'SD', faixa: 4, emp: 'subdominante menor, emprestada do tom menor'},
	'♭VII': {iv: 10, t: '', t7: '7', f: 'SD', faixa: 4, emp: 'emprestado do mixolídio'},
	'♭VI': {iv: 8, t: '', t7: 'maj7', f: 'SD', faixa: 4, emp: 'emprestado do tom menor'},
	'♭II7': {iv: 1, t: '7', t7: '7', f: 'D', faixa: 5, sec: 'substituto do trítono (SubV)'},
	'♭III': {iv: 3, t: '', t7: 'maj7', f: 'T', faixa: 5, emp: 'emprestado do tom menor'},
};
const MENOR = {
	i: {iv: 0, t: 'm', t7: 'm7', f: 'T', faixa: 4},
	'ii°': {iv: 2, t: 'dim', t7: 'm7b5', f: 'SD', faixa: 4},
	'♭III': {iv: 3, t: '', t7: 'maj7', f: 'T', faixa: 4},
	iv: {iv: 5, t: 'm', t7: 'm7', f: 'SD', faixa: 4},
	V: {iv: 7, t: '', t7: '7', f: 'D', faixa: 4},
	'♭VI': {iv: 8, t: '', t7: 'maj7', f: 'SD', faixa: 4},
	'♭VII': {iv: 10, t: '', t7: '7', f: 'D', faixa: 4},
	IV: {iv: 5, t: '', t7: '7', f: 'SD', faixa: 5, emp: 'IV maior do dórico'},
};
export const FUNCOES = {T: 'Tônica', SD: 'Subdominante', D: 'Dominante'};

// progressões-modelo (fórmulas de estilo, não músicas): modo, sequência, faixa, estilo
const MODELOS = [
	['maior', ['I', 'IV', 'V', 'I'], 1, 'básica'], ['maior', ['I', 'V', 'vi', 'IV'], 1, 'pop'], ['maior', ['I', 'vi', 'IV', 'V'], 1, 'doo-wop'],
	['maior', ['vi', 'IV', 'I', 'V'], 1, 'pop'], ['maior', ['I', 'V', 'IV', 'I'], 1, 'rock'], ['maior', ['I', 'IV', 'I', 'V'], 1, 'blues/gospel'],
	['maior', ['I', 'vi', 'ii', 'V'], 2, 'jazz (turnaround)'], ['maior', ['ii', 'V', 'I', 'I'], 2, 'ii-V-I'], ['maior', ['I', 'iii', 'IV', 'V'], 2, 'pop'],
	['maior', ['I', 'IV', 'ii', 'V'], 2, 'gospel'], ['maior', ['iii', 'vi', 'ii', 'V'], 2, 'jazz'], ['maior', ['IV', 'V', 'iii', 'vi'], 2, 'J-pop'],
	['maior', ['I', 'V/V', 'V', 'I'], 3, 'dominante secundária'], ['maior', ['I', 'V/vi', 'vi', 'IV'], 3, 'pop/soul'], ['maior', ['ii', 'V', 'I', 'vi'], 3, 'jazz'],
	['maior', ['I', 'vii°', 'I', 'IV'], 3, 'coral'], ['maior', ['IV', 'V/vi', 'vi', 'V'], 3, 'balada'],
	['maior', ['I', 'V/ii', 'ii', 'V'], 4, 'choro/MPB'], ['maior', ['ii', 'V', 'I', 'V/ii'], 4, 'samba'], ['maior', ['I', 'V/IV', 'IV', 'iv'], 4, 'soul'],
	['maior', ['I', '♭VII', 'IV', 'I'], 4, 'rock mixolídio'], ['maior', ['I', '♭VI', '♭VII', 'I'], 4, 'rock/games'], ['maior', ['I', 'IV', 'iv', 'I'], 4, 'balada'],
	['menor', ['i', '♭VI', '♭III', '♭VII'], 4, 'pop menor'], ['menor', ['i', 'iv', 'V', 'i'], 4, 'menor harmônico'], ['menor', ['i', '♭VII', '♭VI', 'V'], 4, 'andaluz'],
	['maior', ['ii', '♭II7', 'I', 'I'], 5, 'jazz (SubV)'], ['maior', ['iv', '♭VII', 'I', 'I'], 5, 'backdoor'], ['maior', ['I', '♭III', 'IV', 'I'], 5, 'rock'],
	['menor', ['ii°', 'V', 'i', 'i'], 5, 'ii-V-i menor'], ['menor', ['i', 'IV', 'i', 'IV'], 5, 'dórico'],
];

export const CADENCIAS = {
	autentica: {nome: 'Autêntica (V → I)', faixa: 1, explica: 'A dominante resolve na tônica: o fim mais conclusivo que existe.'},
	plagal: {nome: 'Plagal (IV → I)', faixa: 1, explica: 'Subdominante direto para a tônica, sem dominante: o "amém" dos hinos.'},
	engano: {nome: 'De engano (V → vi)', faixa: 1, explica: 'A dominante promete a tônica e entrega a relativa menor: a surpresa.'},
	suspensiva: {nome: 'Suspensiva (termina no V)', faixa: 1, explica: 'Para na dominante: soa como pergunta, pedindo continuação.'},
	plagalMenor: {nome: 'Plagal menor (iv → I)', faixa: 3, explica: 'O IV vira menor antes da tônica: a cor nostálgica de muita balada e soul.'},
	backdoor: {nome: 'Backdoor (♭VII7 → I)', faixa: 4, explica: 'Chega na tônica pela "porta dos fundos": iv m7, ♭VII7, I. Comum em soul e jazz.'},
	subv: {nome: 'SubV (♭II7 → I)', faixa: 4, explica: 'Substituição de trítono: o ♭II7 divide o trítono com o V7 e o baixo desce cromático até a tônica.'},
};

// grafia de acordo com o tom: G#m7 em Mi maior, Abm7 em Mi bemol maior
const SUST = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BEM = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const TONS_SUST = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const nomeNoTom = (pc, tom) => (TONS_SUST.includes(tom) ? SUST : BEM)[((pc % 12) + 12) % 12];

function acorde(tom, modo, g, tet) {
	const v = (modo === 'menor' ? MENOR : MAIOR)[g];
	const pc = (pcDe(tom) + v.iv) % 12;
	return {...parseAcorde(nomeNoTom(pc, tom) + (tet ? v.t7 : v.t)), grau: g, funcao: v.f};
}

// ---------- faixas e rating ----------
export const FAIXAS = [
	{n: 1, ate: 1150, nome: 'Fundamentos', tempo: 1.4},
	{n: 2, ate: 1400, nome: 'Campo completo', tempo: 1.25},
	{n: 3, ate: 1650, nome: 'Secundárias', tempo: 1.1},
	{n: 4, ate: 1900, nome: 'Empréstimo e menor', tempo: 0.95},
	{n: 5, ate: Infinity, nome: 'Jazz e modos', tempo: 0.85},
];
export const faixaDe = (rating) => FAIXAS.find((f) => rating < f.ate).n;
export const nomeFaixa = (rating) => FAIXAS[faixaDe(rating) - 1].nome;
const BASE = [0, 950, 1250, 1500, 1750, 2000];
// a faixa da pergunta oscila em torno da do aluno: às vezes uma abaixo (revisão), às vezes acima
function faixaDaPergunta(rating) {
	const f = faixaDe(rating);
	const r = R();
	return Math.max(1, Math.min(5, r < 0.2 ? f - 1 : r > 0.85 ? f + 1 : f));
}
// Elo: esperado = 1 / (1 + 10^((d - r)/400)); K maior no começo
export function novoRating(r, d, acertou, jogadas) {
	const K = jogadas < 20 ? 48 : 24;
	const esp = 1 / (1 + Math.pow(10, (d - r) / 400));
	return Math.round(r + K * ((acertou ? 1 : 0) - esp));
}
const vocab = (modo, faixa) => Object.entries(modo === 'menor' ? MENOR : MAIOR).filter(([, v]) => v.faixa <= faixa).map(([g]) => g);
const tonsDaFaixa = (f) => (f === 1 ? ['C', 'G', 'F', 'D', 'Bb'] : CICLO_QUARTAS);

// ---------- perguntas ----------
// {tipo, tom, modo, orientador: [acordes], alvo: [acordes], slots: [índices de alvo a responder],
//  opcoes: [{id, nome, f}], certa: [ids por slot], rotulos: [para o treino dos erros], dificuldade,
//  explica, previa(id) -> [acordes] para ouvir a opção antes, tempo (s por acorde)}
// ctx: {rating, tom (manter o tom anterior), foco: [rótulos a priorizar]}
export function pergunta(tipo, ctx = {}) {
	const rating = ctx.rating ?? 1000;
	const faixa = faixaDaPergunta(rating);
	const F = FAIXAS[faixa - 1];
	const tet = faixa >= 3 || (faixa === 2 && R() < 0.5);
	const opcaoGrau = (g, modo) => ({id: g, nome: g, f: (modo === 'menor' ? MENOR : MAIOR)[g].f});
	const sobreTom = (modo) => {
		const tom = ctx.tom ?? sorteia(tonsDaFaixa(faixa));
		const ori = (modo === 'menor' ? ['i', 'iv', 'V', 'i'] : ['I', 'IV', 'V', 'I']).map((g, k) => acorde(tom, modo, g, k === 2 || tet));
		return {tom, ori};
	};
	let dif = BASE[faixa] + Math.round((R() - 0.5) * 80);

	if (tipo === 'funcao') {
		const {tom, ori} = sobreTom('maior');
		let pool = vocab('maior', Math.min(faixa, 4));
		if (ctx.foco?.length) pool = pool.filter((g) => ctx.foco.includes(`funcao:${g}`)).concat(pool);
		const g = sorteia(pool);
		const ac = acorde(tom, 'maior', g, tet);
		const v = MAIOR[g];
		return {tipo, tom, modo: 'maior', orientador: ori, alvo: [ac], slots: [0], tempo: F.tempo * 1.3,
			opcoes: Object.entries(FUNCOES).map(([id, nome]) => ({id, nome, f: id})), certa: [v.f], rotulos: [`funcao:${g}`], dificuldade: dif,
			explica: `${ac.nome} é o ${g} de ${tom}: ${FUNCOES[v.f].toLowerCase()}.${v.sec ? ` Dominante secundária: ${v.sec}.` : v.emp ? ` ${v.emp[0].toUpperCase()}${v.emp.slice(1)}.` : ''}`};
	}
	if (tipo === 'cadencia') {
		const {tom, ori} = sobreTom('maior');
		const disp = Object.entries(CADENCIAS).filter(([, c]) => c.faixa <= faixa);
		let escolha = disp;
		if (ctx.foco?.length) escolha = disp.filter(([k]) => ctx.foco.includes(`cad:${k}`)).concat(disp);
		const [id, c] = sorteia(escolha);
		const pre = sorteia(['ii', 'IV']);
		const seq = {autentica: [pre, 'V', 'I'], plagal: ['vi', 'IV', 'I'], engano: [pre, 'V', 'vi'], suspensiva: ['vi', pre, 'V'], plagalMenor: ['IV', 'iv', 'I'],
			backdoor: ['iv', '♭VII', 'I'], subv: ['ii', '♭II7', 'I']}[id];
		const alvo = seq.map((g) => acorde(tom, 'maior', g, tet || g === 'V' || g === '♭VII' || g === '♭II7'));
		const exemplo = (k) => ({autentica: [pre, 'V', 'I'], plagal: ['vi', 'IV', 'I'], engano: [pre, 'V', 'vi'], suspensiva: ['vi', pre, 'V'], plagalMenor: ['IV', 'iv', 'I'],
			backdoor: ['iv', '♭VII', 'I'], subv: ['ii', '♭II7', 'I']}[k].map((g) => acorde(tom, 'maior', g, true)));
		return {tipo, tom, modo: 'maior', orientador: ori, alvo, slots: [alvo.length - 1], tempo: F.tempo,
			opcoes: disp.map(([k, v]) => ({id: k, nome: v.nome})), certa: [id], rotulos: [`cad:${id}`], dificuldade: dif + (disp.length > 4 ? 40 : 0),
			explica: `${alvo.map((a) => a.nome).join(' → ')} em ${tom}. ${c.explica}`, previa: exemplo};
	}
	if (tipo === 'graus' || tipo === 'baixo' || tipo === 'completar') {
		const menor = faixa >= 4 && R() < 0.35;
		const modo = menor ? 'menor' : 'maior';
		const {tom, ori} = sobreTom(modo);
		let seq, estilo = null;
		if (tipo === 'completar') {
			let modelos = MODELOS.filter(([m, , f]) => m === modo && f <= faixa && f >= Math.max(1, faixa - 2));
			if (ctx.foco?.length) {
				const comFoco = modelos.filter(([, s]) => s.some((g) => ctx.foco.includes(g)));
				if (comFoco.length) modelos = comFoco.concat(modelos);
			}
			const mod = sorteia(modelos.length ? modelos : MODELOS.filter(([m]) => m === 'maior'));
			seq = mod[1];
			estilo = mod[3];
		} else {
			const pool = vocab(modo, faixa).filter((g) => g !== (menor ? 'i' : 'I'));
			const foco = ctx.foco?.length ? pool.filter((g) => ctx.foco.includes(g)) : [];
			seq = [];
			while (seq.length < 3) {
				const g = sorteia(foco.length && R() < 0.5 ? foco : pool);
				if (g !== seq.at(-1)) seq.push(g);
			}
		}
		const alvo = seq.map((g) => acorde(tom, modo, g, tet || /7/.test((modo === 'menor' ? MENOR : MAIOR)[g].t)));
		let slots;
		if (tipo === 'completar') {
			const quantos = Math.min(3, faixa >= 4 ? 3 : faixa >= 2 ? 2 : 1);
			// esconde os acordes mais difíceis primeiro; o primeiro (geralmente a tônica) fica à mostra
			const ordem = embaralha([...seq.keys()].filter((k) => k > 0 || seq[0] !== (menor ? 'i' : 'I')));
			slots = ordem.slice(0, quantos).sort((a, b) => a - b);
		} else slots = [0, 1, 2];
		const pool = vocab(modo, faixa);
		const opcoes = [...new Set([...pool, ...seq])].map((g) => opcaoGrau(g, modo));
		dif += (slots.length - 1) * 60 + (menor ? 60 : 0);
		return {tipo, tom, modo, estilo, orientador: ori, alvo, slots, tempo: F.tempo, opcoes, certa: slots.map((k) => seq[k]), rotulos: slots.map((k) => seq[k]),
			dificuldade: dif, seqCompleta: seq,
			explica: `Em ${tom}${menor ? ' menor' : ''}: ${alvo.map((a, k) => `${seq[k]} (${a.nome})`).join(' → ')}${estilo ? ` · progressão ${estilo}` : ''}.${seq.map((g) => (modo === 'menor' ? MENOR : MAIOR)[g]).filter((v) => v.sec || v.emp).map((v) => ` ${(v.sec ?? v.emp)}`).slice(0, 1).join('')}`,
			previa: (g) => [acorde(tom, modo, g, tet)]};
	}
	if (tipo === 'inversao') {
		const {tom, ori} = sobreTom('maior');
		const usaPedal = faixa >= 4;
		const tetr = faixa >= 2;
		const ops = [['f', 'Fundamental'], ['3', 'Terça'], ['5', 'Quinta'], ...(tetr ? [['7', 'Sétima']] : []), ...(usaPedal ? [['p', 'Pedal (tônica)']] : [])];
		let disp = ops;
		if (ctx.foco?.length) disp = ops.filter(([k]) => ctx.foco.includes(`inv:${k}`)).concat(ops);
		const [id, nome] = sorteia(disp);
		const g = id === 'p' ? sorteia(['IV', 'V', 'ii']) : sorteia(vocab('maior', Math.min(faixa, 3)).filter((x) => x !== 'vii°'));
		const base = acorde(tom, 'maior', g, tetr);
		const idx = {f: 0, 3: 1, 5: 2, 7: 3}[id];
		const baixo = id === 'p' ? pcDe(tom) : base.tons[Math.min(idx, base.tons.length - 1)];
		const inv = {...base, baixo, nome: `${base.nome}/${nomeNoTom(baixo, tom)}`};
		const alvo = faixa <= 2 ? [base, inv] : [acorde(tom, 'maior', 'I', tetr), inv, acorde(tom, 'maior', 'I', tetr)];
		const comBaixo = (k) => {
			const i2 = {f: 0, 3: 1, 5: 2, 7: 3}[k];
			const b = k === 'p' ? pcDe(tom) : base.tons[Math.min(i2 ?? 0, base.tons.length - 1)];
			return [{...base, baixo: b}];
		};
		return {tipo, tom, modo: 'maior', orientador: ori, alvo, slots: [faixa <= 2 ? 1 : 1], tempo: F.tempo * 1.2,
			opcoes: ops.map(([k, n]) => ({id: k, nome: n})), certa: [id], rotulos: [`inv:${id}`], dificuldade: dif + (faixa <= 2 ? -60 : 0),
			baixoEsperado: [baixo], explica: `${inv.nome}: ${nome.toLowerCase()} no baixo. ${id === 'p' ? 'Pedal: o baixo fica na tônica e o acorde muda em cima.' : id === 'f' ? 'Posição fundamental: o baixo toca a raiz.' : `Inversão: o baixo toca a ${nome.toLowerCase()} do acorde, a harmonia é a mesma mas soa menos estável.`}`,
			previa: comBaixo};
	}
	if (tipo === 'qualidade') return perguntaQualidade(faixa, dif, ctx);
	if (tipo === 'intervalo') return perguntaIntervalo(faixa, dif, ctx);
	if (tipo === 'modo') return perguntaModo(faixa, dif, ctx);
	throw new Error(`tipo desconhecido: ${tipo}`);
}

// ---------- qualidade, intervalos e modos (a base que o Próximo Play e o ChordProg treinam) ----------
// Sem orientador de tom: o ouvido julga a cor do acorde, a distância ou a escala inteira.
const QUALIDADES = [
	['', 'Maior', 1, 'terça maior e quinta justa'], ['m', 'Menor', 1, 'terça menor e quinta justa'],
	['dim', 'Diminuto', 2, 'duas terças menores'], ['aug', 'Aumentado', 2, 'duas terças maiores'], ['sus4', 'Sus4', 2, 'quarta no lugar da terça'],
	['7', 'Dominante (7)', 2, 'maior com sétima menor'], ['maj7', 'Maior com 7M', 3, 'maior com sétima maior'], ['m7', 'Menor com 7', 3, 'menor com sétima menor'],
	['m7b5', 'Meio-diminuto (m7♭5)', 3, 'diminuto com sétima menor'], ['dim7', 'Diminuto com 7 (°7)', 4, 'três terças menores'], ['mmaj7', 'Menor com 7M', 4, 'menor com sétima maior'],
	['6', 'Maior com 6', 4, 'maior com sexta maior'], ['m6', 'Menor com 6', 5, 'menor com sexta maior'], ['7sus4', '7sus4', 5, 'sus4 com sétima menor'], ['7#5', '7(♯5)', 5, 'aumentado com sétima menor'],
];
const NOMES_PC = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
function perguntaQualidade(faixa, dif, ctx) {
	let pool = QUALIDADES.filter((q) => q[2] <= faixa);
	if (pool.length > 7) pool = pool.filter((q) => q[2] >= faixa - 2 || R() < 0.4);
	const foco = ctx.foco?.length ? pool.filter((q) => ctx.foco.includes(`qual:${q[0]}`)) : [];
	const [id, nome, , explica] = sorteia(foco.length && R() < 0.5 ? foco : pool);
	const raiz = 48 + Math.floor(R() * 8); // C3 a G3
	const forma = faixa === 1 ? 'bloco' : sorteia(['bloco', 'arpejo', faixa >= 3 ? 'arpejo-desce' : 'bloco']);
	const notas = ACORDES[id].map((i) => raiz + i);
	const tocarProprio = ({timbre = 'piano'} = {}) => {
		const ctx0 = A.audio();
		const tecl = timbre === 'rhodes' || timbre === 'banda' ? 'rhodes' : 'piano';
		let t = ctx0.currentTime + 0.1;
		const ordem = forma === 'arpejo-desce' ? [...notas].reverse() : notas;
		if (forma !== 'bloco') {
			ordem.forEach((m, k) => S.nota(tecl, m, t + k * 0.32, {vel: 0.8, ganho: 0.5, dur: 1.6, soltar: 0.3}));
			t += ordem.length * 0.32;
		}
		ordem.forEach((m) => S.nota(tecl, m, t, {vel: 0.8, ganho: 0.4, dur: 1.6, soltar: 0.3}));
		return t + 1.9;
	};
	return {tipo: 'qualidade', tom: NOMES_PC[raiz % 12], modo: 'maior', orientador: [], alvo: [{nome: `${NOMES_PC[raiz % 12]}${id}`}], slots: [0], tempo: 1.6,
		opcoes: pool.map(([k, n]) => ({id: k || 'M', nome: n})), certa: [id || 'M'], rotulos: [`qual:${id || 'M'}`], dificuldade: dif + pool.length * 8 + (forma === 'bloco' ? 0 : 30),
		explica: `${NOMES_PC[raiz % 12]}${id}: ${explica}. Tocado ${forma === 'bloco' ? 'em bloco' : 'em arpejo e depois em bloco'}.`, tocarProprio, semTom: true,
		previa: (op) => [parseAcorde(`${NOMES_PC[raiz % 12]}${op === 'M' ? '' : op}`)]};
}
const INTERVALOS = [
	[3, 'Terça menor', 1], [4, 'Terça maior', 1], [5, 'Quarta justa', 1], [7, 'Quinta justa', 1], [12, 'Oitava', 1],
	[2, 'Segunda maior', 2], [9, 'Sexta maior', 2], [10, 'Sétima menor', 2],
	[1, 'Segunda menor', 3], [6, 'Trítono', 3], [8, 'Sexta menor', 3], [11, 'Sétima maior', 3],
];
function perguntaIntervalo(faixa, dif, ctx) {
	const pool = INTERVALOS.filter((x) => x[2] <= Math.min(3, faixa));
	const foco = ctx.foco?.length ? pool.filter((x) => ctx.foco.includes(`int:${x[0]}`)) : [];
	const [st, nome] = sorteia(foco.length && R() < 0.5 ? foco : pool);
	const desce = faixa >= 3 && R() < 0.4;
	const harmonico = faixa >= 4 && R() < 0.35;
	const raiz = desce ? 40 + Math.floor(R() * 8) : 28 + Math.floor(R() * 10); // E1 a C#2 (ou mais agudo, descendo)
	const segunda = desce ? raiz - st : raiz + st;
	const tocarProprio = () => {
		const t = A.audio().currentTime + 0.1;
		A.notaBaixo(raiz, t, harmonico ? 1.6 : 0.85, {acento: true});
		A.notaBaixo(segunda, harmonico ? t : t + 0.95, 1.2, {acento: true});
		return t + (harmonico ? 1.8 : 2.3);
	};
	return {tipo: 'intervalo', tom: NOMES_PC[raiz % 12], modo: 'maior', orientador: [], alvo: [{nome}], slots: [0], tempo: 1,
		opcoes: pool.map(([k, n]) => ({id: String(k), nome: n})), certa: [String(st)], rotulos: [`int:${st}`], dificuldade: dif + (desce ? 60 : 0) + (harmonico ? 90 : 0) + pool.length * 5,
		baixoEsperado: [((segunda % 12) + 12) % 12], tocarProprio, semTom: true,
		explica: `${nome} ${harmonico ? 'harmônica' : desce ? 'descendente' : 'ascendente'}: ${NOMES_PC[raiz % 12]} → ${NOMES_PC[((segunda % 12) + 12) % 12]} (${st} semitons).`};
}
const MODOS_ESC = [
	['maior', 'Jônio (maior)', 1, '7M e 3M: o maior de sempre'], ['menor', 'Eólio (menor natural)', 1, '3m, 6m e 7m'],
	['dorico', 'Dórico', 2, 'menor com 6 maior'], ['mixolidio', 'Mixolídio', 2, 'maior com 7 menor'],
	['lidio', 'Lídio', 3, 'maior com 4 aumentada'], ['frigio', 'Frígio', 3, 'menor com 2 menor'],
	['locrio', 'Lócrio', 4, '2m e 5 diminuta'], ['menorHarmonica', 'Menor harmônica', 4, 'menor com 7 maior (salto de 1½ tom)'],
	['menorMelodica', 'Menor melódica', 5, 'menor com 6 e 7 maiores'], ['lidioDominante', 'Lídio dominante', 5, '4 aumentada e 7 menor'], ['alterada', 'Alterada', 5, 'tudo alterado: 2m, 3m, 3M, 5 dim, 6m, 7m'],
];
function perguntaModo(faixa, dif, ctx) {
	const pool = MODOS_ESC.filter((m) => m[2] <= faixa);
	const foco = ctx.foco?.length ? pool.filter((m) => ctx.foco.includes(`modo:${m[0]}`)) : [];
	const [id, nome, , cor] = sorteia(foco.length && R() < 0.5 ? foco : pool);
	const raiz = 28 + Math.floor(R() * 10);
	const desce = faixa >= 3 && R() < 0.3;
	const esc = [...ESCALAS[id], 12];
	const tocarProprio = ({timbre = 'piano'} = {}) => {
		const ctx0 = A.audio();
		const t = ctx0.currentTime + 0.1;
		const tecl = timbre === 'rhodes' || timbre === 'banda' ? 'rhodes' : 'piano';
		// pedal da tônica no teclado, a escala no baixo
		S.nota(tecl, 48 + (raiz % 12), t, {vel: 0.6, ganho: 0.28, dur: esc.length * 0.36 + 0.6, soltar: 0.4});
		const seq = desce ? [...esc].reverse() : esc;
		seq.forEach((iv, k) => A.notaBaixo(raiz + iv, t + k * 0.36, 0.34, {}));
		return t + seq.length * 0.36 + 0.8;
	};
	return {tipo: 'modo', tom: NOMES_PC[raiz % 12], modo: 'maior', orientador: [], alvo: [{nome}], slots: [0], tempo: 1,
		opcoes: pool.map(([k, n]) => ({id: k, nome: n})), certa: [id], rotulos: [`modo:${id}`], dificuldade: dif + pool.length * 10 + (desce ? 40 : 0),
		tocarProprio, semTom: true, explica: `${nome} a partir de ${NOMES_PC[raiz % 12]}: ${cor}.`};
}

// ---------- som ----------
export const GRUPOS = ['piano', 'rhodes', 'baixo', 'click', 'bateria', 'acustico'];
const raizGrave = (pc) => 28 + ((pc - 4 + 12) % 12); // E1 a D#2

// Toca orientador (se pedido) + pausa + alvo. timbre: piano | rhodes | banda. Devolve o fim.
// ---------- com groove: a progressão tocada por uma banda no estilo dela ----------
let grooves = [];
export const usarGrooves = (g) => (grooves = g ?? []);
const GROOVE_DO_ESTILO = {
	'básica': 'pop', pop: 'pop', 'doo-wop': 'seisoito', rock: 'rock', 'blues/gospel': 'gospel', 'jazz (turnaround)': 'jazz2', 'ii-V-I': 'jazz2',
	gospel: 'gospel', jazz: 'jazz2', 'J-pop': 'pop', 'dominante secundária': 'disco', 'pop/soul': 'neosoul', coral: 'gospel', balada: 'pop',
	'choro/MPB': 'partidoalto', samba: 'samba', soul: 'neosoul', 'rock mixolídio': 'rock', 'rock/games': 'rock', 'pop menor': 'pop',
	'menor harmônico': 'neosoul', andaluz: 'reggae', 'jazz (SubV)': 'jazz2', backdoor: 'neosoul', 'dórico': 'funk', 'ii-V-i menor': 'neosoul',
};
export function grooveDoEstilo(estilo) {
	const id = GROOVE_DO_ESTILO[estilo] ?? sorteia(['pop', 'rock', 'gospel', 'neosoul', 'samba', 'funk', 'disco']); // sorteia antes de procurar
	return grooves.find((g) => g.id === id);
}
function tocarComGroove(p, {so, orientar}) {
	const ctx = A.audio();
	let t = ctx.currentTime + 0.12;
	if (so !== 'alvo' && orientar) {
		const dC = 0.55;
		for (const ac of p.orientador) {
			A.acorde(ac, t, dC * 0.95, 0.8, 'piano');
			A.notaBaixo(raizGrave(ac.baixo), t, dC * 0.9, {acento: true});
			t += dC;
		}
		t += 0.4;
	}
	const g = p.grooveTocado ??= grooveDoEstilo(p.estilo);
	if (!g) return tocar(p, {so, timbre: 'banda', orientar: false});
	const bpmQ = g.bpm * (g.pulso ?? 1) * 0.92;
	const dur = (60 / bpmQ) * g.ciclo;
	p.alvo.forEach((ac, k) => {
		A.cicloGroove(g, t, {bpmQ, acorde: ac, baixoPc: ac.baixo, ciclo: k});
		t += dur;
	});
	// o último acorde soa até o fim, com o prato
	A.INSTR.crash(t, 0.7);
	A.acorde(p.alvo.at(-1), t, 1.4, 0.7, g.teclado);
	A.notaBaixo(raizGrave(p.alvo.at(-1).baixo), t, 1.4, {acento: true});
	return t + 1.5;
}

export function tocar(p, {so = 'tudo', timbre = 'piano', orientar = true} = {}) {
	if (p.tocarProprio) return p.tocarProprio({timbre});
	if (timbre === 'groove' && p.alvo.length) return tocarComGroove(p, {so, orientar});
	const ctx = A.audio();
	const dA = p.tempo;
	const dC = Math.min(0.75, dA * 0.6);
	let t = ctx.currentTime + 0.1;
	const teclado = timbre === 'rhodes' || timbre === 'banda' ? 'rhodes' : 'piano';
	const um = (ac, d, comBateria) => {
		A.acorde(ac, t, d * 0.95, 0.85, teclado);
		A.notaBaixo(raizGrave(ac.baixo), t, d * 0.92, {acento: true});
		if (comBateria) {
			// dois tempos por acorde: bumbo, caixa e chimbal em colcheia
			const b = d / 2;
			A.INSTR.kick(t, 0.8);
			A.INSTR.snare(t + b, 0.6);
			for (let k = 0; k < 4; k++) A.INSTR.hat(t + (k * b) / 2, k % 2 ? 0.4 : 0.6);
		}
		t += d;
	};
	if (so !== 'alvo' && orientar) {
		for (const ac of p.orientador) um(ac, dC, false);
		t += 0.45;
	}
	for (const ac of p.alvo) um(ac, dA, timbre === 'banda');
	return t;
}
// toca uns acordes avulsos (prévia de uma opção)
export function tocarAcordes(acs, {timbre = 'piano', dur = 1.1} = {}) {
	return tocar({orientador: [], alvo: acs, tempo: dur}, {so: 'alvo', timbre, orientar: false});
}

// ---------- jogos e modos ----------
export const JOGOS = {
	completar: {nome: 'Completar', desc: 'Progressões de estilos reais com acordes faltando. Responda pelo grau ou tocando a raiz no baixo.', icone: 'I ? IV', perguntas: 10, baixo: true},
	funcao: {nome: 'Função', desc: 'Depois do orientador de tom, o acorde é tônica, subdominante ou dominante?', icone: 'T·S·D', perguntas: 10},
	cadencia: {nome: 'Cadências', desc: 'Autêntica, plagal, de engano, suspensiva, plagal menor, backdoor e SubV.', icone: 'V→I', perguntas: 10},
	graus: {nome: 'Graus', desc: 'Três acordes depois da tônica: o grau de cada um, inclusive secundárias e empréstimos.', icone: 'ii V', perguntas: 8, baixo: true},
	inversao: {nome: 'Inversões', desc: 'Que nota do acorde está no baixo: fundamental, terça, quinta, sétima ou pedal?', icone: 'C/E', perguntas: 10, baixo: true},
	baixo: {nome: 'Raiz no baixo', desc: 'Três acordes; toque a raiz de cada um. Só no instrumento.', icone: '♪↓', perguntas: 5, soBaixo: true},
	qualidade: {nome: 'Qualidade', desc: 'Maior, menor, diminuto, aumentado, sus, tétrades: a cor do acorde, em bloco ou em arpejo.', icone: 'm7♭5', perguntas: 10},
	intervalo: {nome: 'Intervalos', desc: 'Duas notas no baixo: qual a distância? Responda no botão ou tocando a segunda nota.', icone: '3M', perguntas: 10, baixo: true},
	modo: {nome: 'Escalas e modos', desc: 'A escala no baixo sobre o pedal da tônica: jônio, dórico, mixolídio, lídio, frígio e além.', icone: 'dór', perguntas: 8},
};
export const MODOS = {
	desafio: {nome: 'Desafio do dia', desc: '8 perguntas misturadas, as mesmas para hoje. Mantém sua sequência de desafios.', icone: '☀', perguntas: 8},
	rush: {nome: 'Rush', desc: 'Quantas você acerta em 3 minutos? Treina reconhecimento instantâneo.', icone: '⚡', tempo: 180},
	survive: {nome: 'Survive', desc: 'Sem relógio e cada vez mais difícil. Três erros e acabou.', icone: '♥♥♥', vidas: 3},
	erros: {nome: 'Seus erros', desc: 'Rodada montada com os graus, cadências e inversões que você mais erra.', icone: '✗→✓', perguntas: 10},
};
// sorteio de jogo para os modos mistos (rápidos)
export const jogoMisto = (rapido) => sorteia(rapido ? ['funcao', 'cadencia', 'inversao', 'funcao', 'cadencia', 'qualidade', 'intervalo'] : ['completar', 'funcao', 'cadencia', 'graus', 'inversao', 'qualidade', 'intervalo', 'modo']);
