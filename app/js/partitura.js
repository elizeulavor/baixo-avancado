// Partitura em clave de fá, em SVG. Notação padrão de baixo: escrita uma oitava acima do som
// (a corda E solta soa E1 e se escreve E2, na 1ª linha suplementar de baixo). Mesmo layout de tempo
// da tablatura (pos(t) → x, y0, linhaH), então o cursor e o "olho à frente" servem para as duas.
// Armadura pelo tom/escala do drill; acidentes por compasso; linhas suplementares; hastes, barras de
// colcheia e semicolcheia por tempo; pontos de aumento; pausas; tercinas; acento, staccato,
// ghost (cabeça em x) e técnicas (S, P, H, Pu).

// Letras: C0 D1 E2 F3 G4 A5 B6. Passo diatônico = oitava * 7 + letra. Clave de fá: linhas G2 B2 D3 F3 A3.
const LETRAS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const PC_LETRA = [0, 2, 4, 5, 7, 9, 11];
const LINHA_BAIXO = 18, LINHA_CIMA = 26, MEIO = 22;
const ORDEM_SUST = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B
const ORDEM_BEM = [6, 2, 5, 1, 4, 0, 3]; // B E A D G C F
const POS_SUST = [24, 21, 25, 22, 19, 23, 20]; // passos na clave de fá
const POS_BEM = [20, 23, 19, 22, 18, 21, 17];

// Armadura (+n sustenidos, −n bemóis) a partir do tom e da escala (pela relativa maior).
const DESLOC_ESCALA = {maior: 0, menor: 3, menorHarmonica: 3, menorMelodica: 3, dorico: 10, frigio: 8, lidio: 7, mixolidio: 5, locrio: 1, pentaMaior: 0, pentaMenor: 3, blues: 3, bebopDominante: 5, lidioDominante: 5};
const SIG_DO_PC = {0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 5: -1, 10: -2, 3: -3, 8: -4, 1: -5};
const PCS = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
export function armaduraDe(tom, escala = 'maior') {
	if (!tom) return 0;
	let pc = PCS[tom[0].toUpperCase()];
	if (pc == null) return 0;
	for (const c of tom.slice(1)) pc += c === '#' ? 1 : c === 'b' ? -1 : 0;
	const rel = (((pc + (DESLOC_ESCALA[escala] ?? 0)) % 12) + 12) % 12;
	let s = SIG_DO_PC[rel];
	if (rel === 6 && (tom.includes('b') || (escala !== 'maior' && !tom.includes('#')))) s = -6;
	return s;
}

function acidenteDaArmadura(letra, arm) {
	if (arm > 0) return ORDEM_SUST.slice(0, arm).includes(letra) ? 1 : 0;
	if (arm < 0) return ORDEM_BEM.slice(0, -arm).includes(letra) ? -1 : 0;
	return 0;
}

// Soletra uma nota escrita (MIDI) na armadura: {passo, acid (−1, 0, +1)}.
export function soletrar(midi, arm = 0, preferir = null) {
	const pc = ((midi % 12) + 12) % 12;
	const oit = Math.floor(midi / 12) - 1;
	const nat = PC_LETRA.indexOf(pc);
	const op = (letra, acid) => {
		let o = oit;
		if (letra === 6 && acid === 1 && pc === 0) o--; // B# (não usado) — por segurança
		if (letra === 0 && acid === -1 && pc === 11) o++;
		return {passo: o * 7 + letra, letra, acid};
	};
	if (nat >= 0) {
		// natural, salvo quando a armadura já altera essa letra e a nota alterada vizinha casa
		return op(nat, 0);
	}
	const sust = {letra: PC_LETRA.indexOf(pc - 1), acid: 1};
	const bem = {letra: PC_LETRA.indexOf((pc + 1) % 12), acid: -1};
	const modo = preferir ?? (arm > 0 ? 1 : arm < 0 ? -1 : [1, 6].includes(pc) ? 1 : -1); // C#, F#; Eb, Ab, Bb
	// a armadura manda: se uma das grafias já está nela, use essa
	if (acidenteDaArmadura(sust.letra, arm) === 1) return op(sust.letra, 1);
	if (acidenteDaArmadura(bem.letra, arm) === -1) return op(bem.letra, -1);
	return modo > 0 ? op(sust.letra, 1) : op(bem.letra, -1);
}
export const nomeEscrito = (s) => `${LETRAS[s.letra]}${s.acid > 0 ? '♯' : s.acid < 0 ? '♭' : ''}`;

// Acidente desenhado (sem depender da fonte do celular). x = centro, y = altura da nota, k = escala
// (1 = espaço de 8 px entre linhas). tipo: 1 sustenido, −1 bemol, 0 bequadro.
export function acidente(x, y, tipo, k = 1) {
	const f = (v) => Math.round(v * k * 100) / 100;
	if (tipo < 0) return `<path class="pt-acid-f" d="M${x - f(2.2)},${y - f(11)} L${x - f(2.2)},${y + f(3.2)} C${x + f(2.6)},${y + f(0.6)} ${x + f(4)},${y - f(3.4)} ${x + f(0.8)},${y - f(3.6)} C${x - f(0.6)},${y - f(3.7)} ${x - f(1.6)},${y - f(2.6)} ${x - f(2.2)},${y - f(1.4)}"/>`;
	if (tipo > 0) return `<g class="pt-acid-f"><line x1="${x - f(1.4)}" x2="${x - f(1.4)}" y1="${y - f(7)}" y2="${y + f(7.5)}"/><line x1="${x + f(1.4)}" x2="${x + f(1.4)}" y1="${y - f(7.5)}" y2="${y + f(7)}"/><line class="g" x1="${x - f(3.4)}" x2="${x + f(3.4)}" y1="${y - f(1.6)}" y2="${y - f(3.2)}"/><line class="g" x1="${x - f(3.4)}" x2="${x + f(3.4)}" y1="${y + f(3.2)}" y2="${y + f(1.6)}"/></g>`;
	return `<g class="pt-acid-f"><line x1="${x - f(2)}" x2="${x - f(2)}" y1="${y - f(7.5)}" y2="${y + f(3.4)}"/><line x1="${x + f(2)}" x2="${x + f(2)}" y1="${y - f(3.4)}" y2="${y + f(7.5)}"/><line class="g" x1="${x - f(2)}" x2="${x + f(2)}" y1="${y - f(1.6)}" y2="${y - f(3)}"/><line class="g" x1="${x - f(2)}" x2="${x + f(2)}" y1="${y + f(3)}" y2="${y + f(1.6)}"/></g>`;
}

// figura de uma duração (em tempos): base, pontuada, tercina
function figura(d) {
	const t = [4, 2, 1, 0.5, 0.25, 0.125];
	for (const b of t) {
		if (Math.abs(d - b) < 1e-3) return {base: b, ponto: false, tercina: false};
		if (Math.abs(d - b * 1.5) < 1e-3) return {base: b, ponto: true, tercina: false};
		if (Math.abs(d - (b * 2) / 3) < 1e-3) return {base: b, ponto: false, tercina: true};
	}
	return {base: t.find((b) => b <= d + 1e-6) ?? 0.125, ponto: false, tercina: false};
}

export function layoutPartitura(eventos, {tempos = 4, largura = 360, arm = 0} = {}) {
	const gap = 9;
	const total = eventos.length ? eventos[eventos.length - 1].t + eventos[eventos.length - 1].d : tempos;
	const compassos = Math.max(1, Math.ceil(total / tempos - 1e-6));
	const cab = 40 + Math.abs(arm) * 7 + 22; // clave + armadura + fórmula
	const minBar = Math.max(150, tempos * 46);
	const porLinha = Math.max(1, Math.min(4, Math.floor((largura - cab - 8) / minBar)));
	const barW = (largura - cab - 8) / porLinha;
	const topo = 46;
	const linhaH = topo + 4 * gap + 50;
	const linhas = Math.ceil(compassos / porLinha);
	const pos = (t) => {
		const c = Math.min(compassos - 1, Math.floor(t / tempos + 1e-9));
		const dentro = t - c * tempos;
		const row = Math.floor(c / porLinha);
		const x = cab + (c % porLinha) * barW + 14 + (dentro / tempos) * (barW - 22);
		return {row, x, y0: row * linhaH, c};
	};
	return {compassos, porLinha, barW, gap, linhaH, linhas, largura, altura: linhas * linhaH + 4, pos, tempos, cab, topo, arm};
}

export function renderPartitura(eventos, {tempos = 4, largura = 360, tom, escala, arm, compasso} = {}) {
	if (arm == null) arm = armaduraDe(tom, escala);
	const L = layoutPartitura(eventos, {tempos, largura, arm});
	const {gap, linhaH, barW, porLinha, cab, topo} = L;
	const yPasso = (row, passo) => row * linhaH + topo + (LINHA_CIMA - passo) * (gap / 2);
	const o = [];
	o.push(`<svg class="partitura" viewBox="0 0 ${L.largura} ${L.altura}" width="100%" xmlns="http://www.w3.org/2000/svg">`);
	// pautas, claves, armaduras, barras
	for (let r = 0; r < L.linhas; r++) {
		const nBar = Math.min(porLinha, L.compassos - r * porLinha);
		const x1 = cab + nBar * barW;
		for (let p = LINHA_BAIXO; p <= LINHA_CIMA; p += 2) o.push(`<line x1="6" x2="${x1}" y1="${yPasso(r, p)}" y2="${yPasso(r, p)}" class="pt-linha"/>`);
		const yF = yPasso(r, 24);
		o.push(`<g class="pt-clave"><circle cx="13" cy="${yF}" r="3"/><path d="M13,${yF} C12,${yF - 9} 27,${yF - 11} 28,${yF - 1} C29,${yF + 10} 19,${yF + 19} 9,${yF + 23}" fill="none"/><circle cx="32" cy="${yF - gap / 2}" r="1.6"/><circle cx="32" cy="${yF + gap / 2}" r="1.6"/></g>`);
		const ps = arm > 0 ? POS_SUST : POS_BEM;
		for (let k = 0; k < Math.abs(arm); k++) o.push(acidente(43 + k * 7, yPasso(r, ps[k]), arm > 0 ? 1 : -1, gap / 8));
		if (r === 0) {
			const [num, den] = typeof compasso === 'string' ? compasso.split('/') : [String(tempos), '4'];
			const xf = 52 + Math.abs(arm) * 7;
			o.push(`<text x="${xf}" y="${yPasso(r, 24) + 5}" class="pt-formula">${num}</text><text x="${xf}" y="${yPasso(r, 20) + 5}" class="pt-formula">${den}</text>`);
		}
		for (let b = 0; b <= nBar; b++) {
			const x = cab + b * barW;
			const fim = r === L.linhas - 1 && b === nBar;
			o.push(`<line x1="${x}" x2="${x}" y1="${yPasso(r, LINHA_CIMA)}" y2="${yPasso(r, LINHA_BAIXO)}" class="${fim ? 'pt-barra-fim' : 'pt-barra'}"/>`);
			if (fim) o.push(`<line x1="${x - 4}" x2="${x - 4}" y1="${yPasso(r, LINHA_CIMA)}" y2="${yPasso(r, LINHA_BAIXO)}" class="pt-barra"/>`);
		}
		for (let b = 0; b < nBar; b++) o.push(`<text x="${cab + b * barW + 3}" y="${yPasso(r, LINHA_CIMA) - 26}" class="pt-num">${r * porLinha + b + 1}</text>`);
	}
	// notas, por compasso (cada compasso num <g>, para o "olho à frente")
	const porBar = Array.from({length: L.compassos}, () => []);
	const notas = [];
	let barAtual = -1, efetivos = {};
	for (const e of eventos) {
		const p = L.pos(e.t);
		if (p.c !== barAtual) {
			barAtual = p.c;
			efetivos = {};
		}
		const fig = figura(e.d);
		if (e.pausa) {
			porBar[p.c].push(pausa(p.x, yPasso(p.row, MEIO), fig, gap));
			continue;
		}
		if (e.midi == null) continue;
		const s = soletrar(e.midi + 12, arm);
		const y = yPasso(p.row, s.passo);
		const chave = s.passo;
		const vigente = efetivos[chave] ?? acidenteDaArmadura(s.letra, arm);
		const mostrar = vigente !== s.acid;
		efetivos[chave] = s.acid;
		notas.push({e, p, s, y, fig, mostrar});
	}
	// grupos de barra: notas menores que semínima dentro do mesmo tempo
	const grupos = new Map();
	for (const n of notas) {
		if (n.fig.base < 1 && !n.e.pausa) {
			const k = `${n.p.c}:${Math.floor(n.e.t + 1e-6)}`;
			if (!grupos.has(k)) grupos.set(k, []);
			grupos.get(k).push(n);
		}
	}
	const rx = gap * 0.64, ry = gap * 0.46, haste = gap * 3.4;
	for (const g of grupos.values()) {
		if (g.length < 2) continue;
		const media = g.reduce((s, n) => s + n.s.passo, 0) / g.length;
		const cima = media < MEIO; // haste para cima quando as notas estão embaixo
		const yb = cima ? Math.min(...g.map((n) => n.y)) - haste : Math.max(...g.map((n) => n.y)) + haste;
		g.forEach((n) => Object.assign(n, {cima, yb, grupo: g}));
	}
	for (const n of notas) {
		const {e, p, s, y, fig} = n;
		const row = p.row;
		const out = porBar[p.c];
		// linhas suplementares
		const x = p.x;
		if (s.passo < LINHA_BAIXO) for (let q = LINHA_BAIXO - 2; q >= s.passo; q -= 2) out.push(`<line x1="${x - rx - 4}" x2="${x + rx + 4}" y1="${yPasso(row, q)}" y2="${yPasso(row, q)}" class="pt-sup"/>`);
		if (s.passo > LINHA_CIMA) for (let q = LINHA_CIMA + 2; q <= s.passo; q += 2) out.push(`<line x1="${x - rx - 4}" x2="${x + rx + 4}" y1="${yPasso(row, q)}" y2="${yPasso(row, q)}" class="pt-sup"/>`);
		if (n.mostrar) out.push(acidente(x - rx - 7, y, s.acid, gap / 8));
		const aberta = fig.base >= 2;
		if (e.fantasma) out.push(`<path d="M${x - rx * 0.8},${y - ry} L${x + rx * 0.8},${y + ry} M${x - rx * 0.8},${y + ry} L${x + rx * 0.8},${y - ry}" class="pt-x"/>`);
		else out.push(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(-20 ${x} ${y})" class="${aberta ? 'pt-cabeca-aberta' : 'pt-cabeca'}"/>`);
		if (fig.ponto) out.push(`<circle cx="${x + rx + 4}" cy="${s.passo % 2 ? y : y - gap / 2}" r="1.5" class="pt-ponto"/>`);
		if (fig.base < 4) {
			const cima = n.cima ?? s.passo < MEIO;
			const xs = cima ? x + rx - 0.6 : x - rx + 0.6;
			const y2 = n.yb ?? (cima ? y - haste : y + haste);
			out.push(`<line x1="${xs}" x2="${xs}" y1="${y}" y2="${y2}" class="pt-haste"/>`);
			if (!n.grupo && fig.base < 1) {
				const nf = fig.base <= 0.125 ? 3 : fig.base <= 0.25 ? 2 : 1;
				for (let k = 0; k < nf; k++) {
					const yy = y2 + (cima ? k * 5 : -k * 5);
					out.push(cima ? `<path d="M${xs},${yy} c0.5,4 7.5,6 6,14 c1,-6 -3,-8.5 -6,-10z" class="pt-bandeira"/>` : `<path d="M${xs},${yy} c0.5,-4 7.5,-6 6,-14 c1,6 -3,8.5 -6,10z" class="pt-bandeira"/>`);
				}
			}
			n.xs = xs;
			n.y2 = y2;
		}
		// articulações e técnica
		const yTopo = yPasso(row, Math.max(LINHA_CIMA + 3, s.passo + 3));
		if (e.acento) out.push(`<text x="${x}" y="${Math.min(yTopo, (n.cima ?? s.passo < MEIO) ? (n.y2 ?? y) - 4 : y - 9)}" class="pt-acento" text-anchor="middle">&gt;</text>`);
		if (e.staccato) out.push(`<circle cx="${x}" cy="${(n.cima ?? s.passo < MEIO) ? y + gap : y - gap}" r="1.4" class="pt-ponto"/>`);
		const tec = e.slap ? 'S' : e.pop ? 'P' : e.hammer ? 'H' : e.pull ? 'Pu' : e.slide ? 'sl' : e.harmonico ? '◇' : '';
		if (tec) out.push(`<text x="${x}" y="${yPasso(row, Math.min(LINHA_BAIXO - 5, s.passo - 4))}" class="pt-tec" text-anchor="middle">${tec}</text>`);
	}
	// barras dos grupos
	const feitos = new Set();
	for (const n of notas) {
		const g = n.grupo;
		if (!g || feitos.has(g)) continue;
		feitos.add(g);
		const out = porBar[n.p.c];
		const a = g[0], b = g[g.length - 1];
		const dir = a.cima ? 1 : -1;
		out.push(`<line x1="${a.xs}" x2="${b.xs}" y1="${a.yb}" y2="${a.yb}" class="pt-viga"/>`);
		for (let i = 0; i < g.length; i++) {
			if (g[i].fig.base > 0.25) continue;
			const yy = a.yb + dir * 5;
			const viz = g[i + 1]?.fig.base <= 0.25 ? g[i + 1].xs : g[i - 1]?.fig.base <= 0.25 ? null : g[i].xs + (i === g.length - 1 ? -6 : 6);
			if (viz != null) out.push(`<line x1="${g[i].xs}" x2="${viz}" y1="${yy}" y2="${yy}" class="pt-viga"/>`);
		}
		if (g.some((n) => n.fig.tercina)) out.push(`<text x="${(a.xs + b.xs) / 2}" y="${a.yb - dir * 6 + (dir > 0 ? 0 : 6)}" class="pt-tercina" text-anchor="middle">3</text>`);
	}
	porBar.forEach((els, c) => o.push(`<g class="pt-c" data-c="${c}">${els.join('')}</g>`));
	o.push(`<line id="cursor" x1="-10" x2="-10" y1="0" y2="0" class="cursor"/>`);
	o.push('</svg>');
	return {svg: o.join(''), layout: L};
}

function pausa(x, y, fig, gap) {
	const b = fig.base;
	const ponto = fig.ponto ? `<circle cx="${x + 8}" cy="${y - gap / 2}" r="1.5" class="pt-ponto"/>` : '';
	if (b >= 4) return `<rect x="${x - 5}" y="${y - gap}" width="10" height="${gap / 2}" class="pt-pausa"/>${ponto}`;
	if (b >= 2) return `<rect x="${x - 5}" y="${y - gap / 2}" width="10" height="${gap / 2}" class="pt-pausa"/>${ponto}`;
	if (b >= 1) return `<path d="M${x - 2},${y - 12} l5,6 l-4,5 l5,6 q-6,-2 -4,5" class="pt-pausa-traco"/>${ponto}`;
	const n = b >= 0.5 ? 1 : b >= 0.25 ? 2 : 3;
	let s = `<line x1="${x + 3}" y1="${y - 6}" x2="${x - 2}" y2="${y + 8}" class="pt-pausa-traco"/>`;
	for (let k = 0; k < n; k++) s += `<circle cx="${x - 1 + k * 1.6}" cy="${y - 5 + k * 5}" r="2" class="pt-pausa"/><path d="M${x - 1 + k * 1.6},${y - 4 + k * 5} q3,1 ${4 - k * 1.6},-2" class="pt-pausa-traco"/>`;
	return s + ponto;
}

// Uma nota sozinha (jogo Leitura relâmpago): pauta curta com clave e armadura. midiEscrito.
// forcar: {passo, acid} já soletrado (no nível de armadura, E♯ e C♭ existem).
export function notaSolta(midiEscrito, {arm = 0, largura = 220, preferir = null, forcar = null} = {}) {
	const gap = 11;
	const topo = 62;
	const yP = (p) => topo + (LINHA_CIMA - p) * (gap / 2);
	const s = forcar ? {passo: forcar.passo, letra: forcar.passo % 7, acid: forcar.acid} : soletrar(midiEscrito, arm, preferir);
	const o = [`<svg class="partitura nota-solta" viewBox="0 0 ${largura} 190" width="100%">`];
	for (let p = LINHA_BAIXO; p <= LINHA_CIMA; p += 2) o.push(`<line x1="8" x2="${largura - 8}" y1="${yP(p)}" y2="${yP(p)}" class="pt-linha"/>`);
	const yF = yP(24);
	const k = gap / 8;
	o.push(`<g class="pt-clave" transform="translate(0 ${yF}) scale(${k}) translate(0 ${-yF})"><circle cx="13" cy="${yF}" r="3"/><path d="M13,${yF} C12,${yF - 9} 27,${yF - 11} 28,${yF - 1} C29,${yF + 10} 19,${yF + 19} 9,${yF + 23}" fill="none"/><circle cx="32" cy="${yF - 4}" r="1.6"/><circle cx="32" cy="${yF + 4}" r="1.6"/></g>`);
	const ps = arm > 0 ? POS_SUST : POS_BEM;
	for (let i = 0; i < Math.abs(arm); i++) o.push(acidente(54 + i * 9, yP(ps[i]), arm > 0 ? 1 : -1, gap / 8));
	const x = Math.max(120, 60 + Math.abs(arm) * 9 + 50);
	const y = yP(s.passo);
	const rx = gap * 0.64, ry = gap * 0.46;
	if (s.passo < LINHA_BAIXO) for (let q = LINHA_BAIXO - 2; q >= s.passo; q -= 2) o.push(`<line x1="${x - rx - 6}" x2="${x + rx + 6}" y1="${yP(q)}" y2="${yP(q)}" class="pt-sup"/>`);
	if (s.passo > LINHA_CIMA) for (let q = LINHA_CIMA + 2; q <= s.passo; q += 2) o.push(`<line x1="${x - rx - 6}" x2="${x + rx + 6}" y1="${yP(q)}" y2="${yP(q)}" class="pt-sup"/>`);
	if (s.acid !== acidenteDaArmadura(s.letra, arm)) o.push(acidente(x - rx - 10, y, s.acid, gap / 8));
	o.push(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(-20 ${x} ${y})" class="pt-cabeca pt-alvo"/>`);
	const cima = s.passo < MEIO;
	o.push(`<line x1="${cima ? x + rx - 0.7 : x - rx + 0.7}" x2="${cima ? x + rx - 0.7 : x - rx + 0.7}" y1="${y}" y2="${cima ? y - gap * 3.4 : y + gap * 3.4}" class="pt-haste"/>`);
	o.push('</svg>');
	return {svg: o.join(''), soletrada: s};
}

// O efeito real de uma nota escrita na armadura (para o jogo: o aluno tem de aplicar a armadura)
export function somDe(passo, acid) {
	const oit = Math.floor(passo / 7), letra = passo - oit * 7;
	return (oit + 1) * 12 + PC_LETRA[letra] + acid;
}
export {acidenteDaArmadura, LETRAS, LINHA_BAIXO, LINHA_CIMA};
