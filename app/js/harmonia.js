// Ouvido harmônico. Gera perguntas num tom (maior ou menor) e toca com piano, Rhodes ou banda
// gravados. A dificuldade de cada pergunta vem da faixa de vocabulário (1 a 5), do número de acordes
// escondidos e do andamento; o rating do aluno (tipo Elo) escolhe a faixa.
import {parseAcorde, CICLO_QUARTAS, pcDe, rng as rngSemente} from './musica.js';
import * as A from './audio.js';

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
	throw new Error(`tipo desconhecido: ${tipo}`);
}

// ---------- som ----------
export const GRUPOS = ['piano', 'rhodes', 'baixo', 'click', 'bateria'];
const raizGrave = (pc) => 28 + ((pc - 4 + 12) % 12); // E1 a D#2

// Toca orientador (se pedido) + pausa + alvo. timbre: piano | rhodes | banda. Devolve o fim.
export function tocar(p, {so = 'tudo', timbre = 'piano', orientar = true} = {}) {
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
};
export const MODOS = {
	desafio: {nome: 'Desafio do dia', desc: '8 perguntas misturadas, as mesmas para hoje. Mantém sua sequência de desafios.', icone: '☀', perguntas: 8},
	rush: {nome: 'Rush', desc: 'Quantas você acerta em 3 minutos? Treina reconhecimento instantâneo.', icone: '⚡', tempo: 180},
	survive: {nome: 'Survive', desc: 'Sem relógio e cada vez mais difícil. Três erros e acabou.', icone: '♥♥♥', vidas: 3},
	erros: {nome: 'Seus erros', desc: 'Rodada montada com os graus, cadências e inversões que você mais erra.', icone: '✗→✓', perguntas: 10},
};
// sorteio de jogo para os modos mistos (rápidos)
export const jogoMisto = (rapido) => sorteia(rapido ? ['funcao', 'cadencia', 'inversao', 'funcao', 'cadencia'] : ['completar', 'funcao', 'cadencia', 'graus', 'inversao']);
