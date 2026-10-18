// Leitura de partitura: preferência de vista (tab/partitura/ambas), "olho à frente" e o jogo
// Leitura relâmpago (nota na pauta → o aluno toca → o microfone confere e mede o tempo de leitura).
// O jogo é adaptativo: cada nota escrita guarda o tempo médio de reação e os erros, e as notas
// lentas ou erradas voltam mais vezes. O mapa da leitura pinta a pauta com esses tempos.
import * as E from './estado.js';
import {soletrar, somDe, acidenteDaArmadura, LETRAS, armaduraDe, acidente} from './partitura.js';

const guardado = (k, v) => {
	try {
		if (v !== undefined) localStorage.setItem(k, String(v));
		return localStorage.getItem(k);
	} catch {
		return null;
	}
};
// vista da notação: leitura abre na partitura; o resto, no que o aluno escolheu por último
export function vista(ehLeitura, nova) {
	if (nova) guardado(ehLeitura ? 'radix-vista-leitura' : 'radix-vista', nova);
	return guardado(ehLeitura ? 'radix-vista-leitura' : 'radix-vista') ?? (ehLeitura ? 'partitura' : 'tab');
}
export function olhoFrente(v) {
	if (v !== undefined) guardado('radix-olho', v ? '1' : '0');
	return guardado('radix-olho') === '1';
}
// some com os compassos até o índice `ate` (inclusive); −1 mostra todos
export function esconderCompassos(ate) {
	document.querySelectorAll('.partitura .pt-c').forEach((g) => g.classList.toggle('pt-sumiu', ate >= 0 && Number(g.dataset.c) <= ate));
}

// ---------- Leitura relâmpago ----------
export const NIVEIS = [
	{id: 1, nome: 'Dentro da pauta', desc: 'Notas naturais nas 5 linhas e 4 espaços', de: 18, ate: 26, acid: false},
	{id: 2, nome: 'Pauta inteira', desc: 'Da corda E solta ao Dó central escrito, com linhas suplementares', de: 16, ate: 28, acid: false},
	{id: 3, nome: 'Acidentes', desc: 'Sustenidos, bemóis e bequadros', de: 16, ate: 28, acid: true},
	{id: 4, nome: 'Armadura', desc: 'A nota vem sem acidente: aplique a armadura do tom', de: 16, ate: 28, armadura: true},
	{id: 5, nome: 'Região aguda', desc: 'Acima da pauta, até o Sol da 12ª casa da corda G', de: 26, ate: 32, acid: true},
];
const ARMADURAS = [1, 2, 3, 4, 5, 6, -1, -2, -3, -4, -5, -6];
const NOME_TOM = {0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F♯', '-1': 'F', '-2': 'B♭', '-3': 'E♭', '-4': 'A♭', '-5': 'D♭', '-6': 'G♭'};
export const nomeTom = (arm) => `${NOME_TOM[arm]} maior / ${arm >= 0 ? ['A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'D♯'][arm] : ['A', 'D', 'G', 'C', 'F', 'B♭', 'E♭'][-arm]} menor`;

export function estadoLeitura() {
	E.estado.leitura ??= {notas: {}, recordes: {}, rodadas: []};
	return E.estado.leitura;
}
// chave da nota escrita: passo diatônico + acidente efetivo (o que soa)
const chave = (a) => `${a.passo}:${a.acid}`;

// todas as notas possíveis de um nível (com a armadura da rodada, no nível 4)
export function notasDoNivel(nivel, arm = 0) {
	const n = NIVEIS.find((x) => x.id === nivel);
	const out = [];
	for (let passo = n.de; passo <= n.ate; passo++) {
		const letra = passo % 7;
		if (n.armadura) {
			out.push({passo, acid: acidenteDaArmadura(letra, arm), escrito: 0});
			continue;
		}
		out.push({passo, acid: 0, escrito: 0});
		if (n.acid) {
			if (letra !== 2 && letra !== 6) out.push({passo, acid: 1, escrito: 1}); // sem E♯, B♯
			if (letra !== 0 && letra !== 3) out.push({passo, acid: -1, escrito: -1}); // sem C♭, F♭
		}
	}
	// a corda E solta (E2 escrito) é o limite de baixo
	return out.filter((a) => somDe(a.passo, a.acid) >= 40);
}

// sorteio ponderado: nota nunca vista ou lenta pesa mais; erro recente pesa muito
export function sortear(nivel, arm, ultima) {
	const L = estadoLeitura();
	const pool = notasDoNivel(nivel, arm).filter((a) => !ultima || chave(a) !== chave(ultima));
	const peso = (a) => {
		const h = L.notas[chave(a)];
		if (!h) return 3;
		return Math.min(6, (h.ms / 1200) ** 2 + h.erros * 0.8 + 0.3);
	};
	const pesos = pool.map(peso);
	let r = Math.random() * pesos.reduce((s, p) => s + p, 0);
	for (let i = 0; i < pool.length; i++) if ((r -= pesos[i]) <= 0) return pool[i];
	return pool.at(-1);
}

// som (MIDI) da nota escrita: o baixo soa uma oitava abaixo do escrito
export const somAlvo = (a) => somDe(a.passo, a.acid) - 12;
export const midiEscrito = (a) => somDe(a.passo, a.acid);

export function registrar(a, ms, acertou) {
	const L = estadoLeitura();
	const h = (L.notas[chave(a)] ??= {ms: 0, n: 0, erros: 0});
	if (acertou) {
		h.ms = h.n ? h.ms * 0.7 + ms * 0.3 : ms; // média móvel: o recente pesa mais
		h.n++;
		if (h.erros > 0) h.erros = Math.max(0, h.erros - 0.5);
	} else h.erros++;
}
export function fimRodada(nivel, {certas, erros, msMedio}) {
	const L = estadoLeitura();
	L.rodadas.push({data: E.hoje(), nivel, certas, erros, ms: Math.round(msMedio)});
	if (L.rodadas.length > 300) L.rodadas.splice(0, L.rodadas.length - 300);
	const antes = L.recordes[nivel] ?? 0;
	if (certas > antes) L.recordes[nivel] = certas;
	E.salvar();
	return {recorde: certas > antes && antes > 0, antes};
}

export const nomeNota = (a) => {
	return `${LETRAS[a.passo % 7]}${a.acid > 0 ? '♯' : a.acid < 0 ? '♭' : ''}${Math.floor(a.passo / 7)}`; // nome escrito, com a oitava escrita
};

// Mapa da leitura: as notas do nível na pauta, cada uma com a cor do seu tempo de reação.
export function mapaSvg(nivel, arm = 0) {
	const L = estadoLeitura();
	const notas = notasDoNivel(nivel, arm);
	const gap = 9, topo = 54, larg = Math.max(300, 40 + notas.length * 15);
	const yP = (p) => topo + (26 - p) * (gap / 2);
	const o = [`<svg class="partitura mapa-leitura" viewBox="0 0 ${larg} 150" width="${Math.round(larg * 1.25)}" height="188">`];
	for (let p = 18; p <= 26; p += 2) o.push(`<line x1="6" x2="${larg - 6}" y1="${yP(p)}" y2="${yP(p)}" class="pt-linha"/>`);
	notas.forEach((a, i) => {
		const x = 24 + i * 15;
		const y = yP(a.passo);
		for (let q = 16; q >= a.passo; q -= 2) o.push(`<line x1="${x - 7}" x2="${x + 7}" y1="${yP(q)}" y2="${yP(q)}" class="pt-sup"/>`);
		for (let q = 28; q <= a.passo; q += 2) o.push(`<line x1="${x - 7}" x2="${x + 7}" y1="${yP(q)}" y2="${yP(q)}" class="pt-sup"/>`);
		const h = L.notas[chave(a)];
		const cls = !h || !h.n ? 'mapa-nada' : h.erros >= 1 ? 'mapa-erro' : h.ms <= 1200 ? 'mapa-rapida' : h.ms <= 2000 ? 'mapa-media' : 'mapa-lenta';
		if (a.escrito) o.push(acidente(x - 9.5, y, a.escrito, 0.75));
		o.push(`<ellipse cx="${x}" cy="${y}" rx="5.4" ry="4" transform="rotate(-20 ${x} ${y})" class="${cls}"><title>${nomeNota(a)}: ${h?.n ? `${(h.ms / 1000).toFixed(1)} s` : 'não visto'}${h?.erros >= 1 ? ', errou' : ''}</title></ellipse>`);
	});
	o.push('</svg>');
	return o.join('');
}

// as notas mais lentas do aluno (para o texto do resultado e o professor)
export function maisLentas(nivel, arm = 0, n = 3) {
	const L = estadoLeitura();
	return notasDoNivel(nivel, arm)
		.map((a) => ({a, h: L.notas[chave(a)]}))
		.filter((x) => x.h?.n)
		.sort((x, y) => y.h.ms + y.h.erros * 800 - (x.h.ms + x.h.erros * 800))
		.slice(0, n);
}
export const armaduraSorteada = () => ARMADURAS[Math.floor(Math.random() * ARMADURAS.length)];
export {armaduraDe};
