// Ouvido harmônico: função (T, SD, D), cadências, graus e raiz no baixo. Gera as perguntas num tom
// sorteado e toca com piano e baixo gravados. Três níveis por jogo.
import {parseAcorde, CICLO_QUARTAS, pcDe} from './musica.js';
import * as A from './audio.js';

// campo harmônico maior: grau, intervalo da raiz, tríade, tétrade, função
export const CAMPO = [
	{g: 'I', iv: 0, t: '', t7: 'maj7', f: 'T'},
	{g: 'ii', iv: 2, t: 'm', t7: 'm7', f: 'SD'},
	{g: 'iii', iv: 4, t: 'm', t7: 'm7', f: 'T'},
	{g: 'IV', iv: 5, t: '', t7: 'maj7', f: 'SD'},
	{g: 'V', iv: 7, t: '', t7: '7', f: 'D'},
	{g: 'vi', iv: 9, t: 'm', t7: 'm7', f: 'T'},
	{g: 'vii°', iv: 11, t: 'dim', t7: 'm7b5', f: 'D'},
];
// acordes de empréstimo usados nas cadências avançadas
const FORA = {
	iv7: {g: 'iv', iv: 5, t: 'm', t7: 'm7'},
	bVII7: {g: '♭VII7', iv: 10, t: '7', t7: '7'},
	bII7: {g: '♭II7', iv: 1, t: '7', t7: '7'},
};
export const FUNCOES = {T: 'Tônica', SD: 'Subdominante', D: 'Dominante'};
const EXPLICA_FUNCAO = {
	I: 'I é a própria tônica: repouso.',
	iii: 'iii é tônica (relativa): divide duas notas com o I. Às vezes soa ambíguo, entre T e D.',
	vi: 'vi é a tônica relativa: divide duas notas com o I e soa como repouso "triste".',
	ii: 'ii é subdominante: prepara a dominante (o ii do ii-V-I).',
	IV: 'IV é a subdominante: afasta da tônica sem tensão forte.',
	V: 'V é a dominante: a tensão que pede resolução na tônica (o trítono, no V7).',
	'vii°': 'vii° é dominante sem raiz: tem o trítono do V7.',
};

export const CADENCIAS = {
	autentica: {nome: 'Autêntica (V → I)', nivel: 1, explica: 'A dominante resolve na tônica: o fim mais conclusivo que existe.'},
	plagal: {nome: 'Plagal (IV → I)', nivel: 1, explica: 'Subdominante direto para a tônica, sem dominante: o "amém" dos hinos.'},
	engano: {nome: 'De engano (V → vi)', nivel: 1, explica: 'A dominante promete a tônica e entrega a relativa menor: a surpresa.'},
	suspensiva: {nome: 'Suspensiva (termina no V)', nivel: 1, explica: 'Para na dominante: soa como pergunta, pedindo continuação.'},
	backdoor: {nome: 'Backdoor (♭VII7 → I)', nivel: 2, explica: 'Chega na tônica pela "porta dos fundos": iv m7, ♭VII7, I. Comum em soul e jazz.'},
	subv: {nome: 'SubV (♭II7 → I)', nivel: 2, explica: 'Substituição de trítono: o ♭II7 divide o trítono com o V7 e o baixo desce cromático até a tônica.'},
};

const sorteia = (l) => l[Math.floor(Math.random() * l.length)];
const tonsDoNivel = (n) => (n === 1 ? ['C', 'G', 'F', 'D', 'Bb'] : CICLO_QUARTAS);

// grafia de acordo com o tom: G#m7 em Mi maior, Abm7 em Mi bemol maior
const SUST = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BEM = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const TONS_SUST = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const nomeNoTom = (pc, tom) => (TONS_SUST.includes(tom) ? SUST : BEM)[pc];

function acordeDe(tom, grau, tetrade) {
	const pc = (pcDe(tom) + grau.iv) % 12;
	const qual = tetrade ? grau.t7 : grau.t;
	return {...parseAcorde(nomeNoTom(pc, tom) + qual), grau: grau.g, funcao: grau.f};
}
const doCampo = (tom, g, tet) => acordeDe(tom, CAMPO.find((c) => c.g === g), tet);
const fora = (tom, k, tet) => acordeDe(tom, FORA[k], tet);

// ---------- perguntas ----------
// Cada pergunta: {tipo, tom, contexto: [acordes que firmam o tom], alvo: [acordes da pergunta],
// opcoes: [{id, nome}], certa (id ou lista de ids, um por acorde), explica}
export function pergunta(tipo, nivel = 1) {
	const tom = sorteia(tonsDoNivel(nivel));
	const tet = nivel >= 2;
	const I = doCampo(tom, 'I', tet);
	if (tipo === 'funcao') {
		const contexto = nivel === 3 ? [I] : [I, doCampo(tom, 'IV', tet), doCampo(tom, 'V', true), I];
		const graus = nivel === 1 ? ['I', 'ii', 'IV', 'V', 'vi'] : CAMPO.map((c) => c.g);
		const g = sorteia(graus);
		const alvo = [doCampo(tom, g, tet)];
		return {tipo, tom, contexto, alvo, opcoes: Object.entries(FUNCOES).map(([id, nome]) => ({id, nome})), certa: alvo[0].funcao,
			explica: `${alvo[0].nome} é o ${g} de ${tom}. ${EXPLICA_FUNCAO[g]}`};
	}
	if (tipo === 'cadencia') {
		const disp = Object.entries(CADENCIAS).filter(([, c]) => c.nivel <= nivel);
		const [id, c] = sorteia(disp);
		const pre = sorteia([doCampo(tom, 'ii', tet), doCampo(tom, 'IV', tet)]);
		const V7 = doCampo(tom, 'V', true);
		const alvo = {
			autentica: [pre, V7, I],
			plagal: [doCampo(tom, 'vi', tet), doCampo(tom, 'IV', tet), I],
			engano: [pre, V7, doCampo(tom, 'vi', tet)],
			suspensiva: [doCampo(tom, 'vi', tet), pre, doCampo(tom, 'V', tet)],
			backdoor: [fora(tom, 'iv7', true), fora(tom, 'bVII7', true), I],
			subv: [doCampo(tom, 'ii', true), fora(tom, 'bII7', true), I],
		}[id];
		return {tipo, tom, contexto: [I], alvo, opcoes: disp.map(([k, v]) => ({id: k, nome: v.nome})), certa: id,
			explica: `${alvo.map((a) => a.nome).join(' → ')} em ${tom}. ${c.explica}`};
	}
	if (tipo === 'graus' || tipo === 'baixo') {
		const pool = nivel === 1 ? ['IV', 'V', 'vi'] : nivel === 2 ? ['ii', 'iii', 'IV', 'V', 'vi'] : ['ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
		const seq = [];
		while (seq.length < 3) {
			const g = sorteia(pool);
			if (g !== seq.at(-1)) seq.push(g);
		}
		const alvo = seq.map((g) => doCampo(tom, g, tet || nivel === 3));
		const opcoesG = ['I', ...pool].filter((g, i, a) => a.indexOf(g) === i);
		return {tipo, tom, contexto: [I], alvo, opcoes: opcoesG.map((g) => ({id: g, nome: g})), certa: seq,
			explica: `Em ${tom}: I → ${alvo.map((a, i) => `${seq[i]} (${a.nome})`).join(' → ')}.`};
	}
	throw new Error(`tipo desconhecido: ${tipo}`);
}

// ---------- som ----------
export const GRUPOS = ['piano', 'baixo', 'click'];
const raizGrave = (pc) => 28 + ((pc - 4 + 12) % 12); // E1 a D#2

// Toca contexto + pausa + alvo. Devolve o instante do fim.
export function tocar(p, {nivel = 1, so = 'tudo'} = {}) {
	const ctx = A.audio();
	const durC = nivel === 3 ? 0.55 : 0.75;
	const durA = nivel === 3 ? 1.0 : 1.3;
	let t = ctx.currentTime + 0.1;
	const um = (ac, d) => {
		A.acorde(ac, t, d * 0.95, 0.85, 'piano');
		A.notaBaixo(raizGrave(ac.baixo), t, d * 0.92, {acento: true});
		t += d;
	};
	if (so !== 'alvo') {
		for (const ac of p.contexto) um(ac, durC);
		t += 0.5;
	}
	for (const ac of p.alvo) um(ac, durA);
	return t;
}

// Explicação curta de cada tipo, para a tela
export const JOGOS = {
	funcao: {nome: 'Função', desc: 'Ouça o tom e diga se o acorde é tônica, subdominante ou dominante.', icone: 'T·S·D', perguntas: 10},
	cadencia: {nome: 'Cadências', desc: 'Autêntica, plagal, de engano, suspensiva; no nível 2, backdoor e SubV.', icone: 'V→I', perguntas: 10},
	graus: {nome: 'Graus', desc: 'Três acordes depois do I: diga o grau de cada um.', icone: 'ii V', perguntas: 8},
	baixo: {nome: 'Raiz no baixo', desc: 'Ouça três acordes e toque a raiz de cada um no baixo. O microfone confere.', icone: '♪↓', perguntas: 5},
};
