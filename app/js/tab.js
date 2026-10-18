// Tablatura em SVG, com ritmo (hastes e barras) embaixo e acentos e técnicas marcados.
import {AFINACOES} from './musica.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'})[c]);

export function layoutTab(eventos, {afin = 'EADG', tempos = 4, largura = 360} = {}) {
	const cordas = [...(AFINACOES[afin] ?? AFINACOES.EADG)].reverse(); // aguda em cima
	const total = eventos.length ? eventos[eventos.length - 1].t + eventos[eventos.length - 1].d : tempos;
	const compassos = Math.max(1, Math.ceil(total / tempos - 1e-6));
	const minBar = Math.max(150, tempos * 46);
	const porLinha = Math.max(1, Math.min(4, Math.floor((largura - 16) / minBar)));
	const barW = (largura - 16) / porLinha;
	const gap = 13;
	const alturaCordas = gap * (cordas.length - 1);
	const linhaH = 30 + alturaCordas + 46;
	const linhas = Math.ceil(compassos / porLinha);
	const pos = (t) => {
		const c = Math.min(compassos - 1, Math.floor(t / tempos + 1e-9));
		const dentro = t - c * tempos;
		const row = Math.floor(c / porLinha);
		const x = 8 + (c % porLinha) * barW + 12 + (dentro / tempos) * (barW - 20);
		return {row, x, y0: row * linhaH};
	};
	return {cordas, compassos, porLinha, barW, gap, linhaH, linhas, largura, altura: linhas * linhaH + 4, pos, tempos};
}

export function renderTab(eventos, opts = {}) {
	const L = layoutTab(eventos, opts);
	const {cordas, gap, linhaH, barW, porLinha, tempos} = L;
	const o = [];
	o.push(`<svg class="tab" viewBox="0 0 ${L.largura} ${L.altura}" width="100%" xmlns="http://www.w3.org/2000/svg">`);
	for (let r = 0; r < L.linhas; r++) {
		const y0 = r * linhaH + 30;
		const nBar = Math.min(porLinha, L.compassos - r * porLinha);
		const x1 = 8 + nBar * barW;
		cordas.forEach((c, i) => {
			o.push(`<line x1="8" x2="${x1}" y1="${y0 + i * gap}" y2="${y0 + i * gap}" class="corda"/>`);
			if (r === 0 || true) o.push(`<text x="2" y="${y0 + i * gap + 3}" class="nome-corda">${c}</text>`);
		});
		for (let b = 0; b <= nBar; b++) {
			const x = 8 + b * barW;
			o.push(`<line x1="${x}" x2="${x}" y1="${y0}" y2="${y0 + gap * (cordas.length - 1)}" class="barra"/>`);
		}
		for (let b = 0; b < nBar; b++) {
			const c = r * porLinha + b;
			o.push(`<text x="${8 + b * barW + 3}" y="${y0 - 19}" class="num-compasso">${c + 1}</text>`);
			for (let k = 0; k < Math.ceil(tempos); k++) {
				const {x} = L.pos(c * tempos + k);
				o.push(`<text x="${x}" y="${y0 - 8}" class="tempo">${k + 1}</text>`);
			}
		}
	}
	if (!opts.ocultar) {
		for (const e of eventos) {
			const {x, y0} = L.pos(e.t);
			const base = y0 + 30;
			if (e.pausa) continue;
			const i = cordas.indexOf(e.corda);
			const y = base + i * gap;
			const txt = e.fantasma ? 'x' : e.harmonico ? `◇${e.casa}` : String(e.casa);
			const w = txt.length * 6.4 + 3;
			o.push(`<rect x="${x - w / 2}" y="${y - 6}" width="${w}" height="12" class="fundo-nota"/>`);
			o.push(`<text x="${x}" y="${y + 4}" class="nota${e.fantasma ? ' fantasma' : ''}">${esc(txt)}</text>`);
			if (e.acento) o.push(`<text x="${x}" y="${base - 1}" class="acento">&gt;</text>`);
			const tec = e.slap ? 'S' : e.pop ? 'P' : e.hammer ? 'H' : e.pull ? 'Pu' : e.slide ? '/' : e.staccato ? '·' : e.legato ? '‿' : '';
			if (tec) o.push(`<text x="${x}" y="${base + gap * (cordas.length - 1) + 12}" class="tecnica">${tec}</text>`);
		}
		o.push(ritmo(eventos, L));
	}
	o.push(`<line id="cursor" x1="-10" x2="-10" y1="0" y2="0" class="cursor"/>`);
	o.push('</svg>');
	return {svg: o.join(''), layout: L};
}

// Hastes e barras de colcheia/semicolcheia por tempo; tercina e quintina marcadas.
function ritmo(eventos, L) {
	const o = [];
	const hY = (y0) => y0 + 30 + L.gap * (L.cordas.length - 1) + 18;
	const grupos = new Map();
	for (const e of eventos) {
		const {x, y0} = L.pos(e.t);
		const top = hY(y0);
		if (e.pausa) {
			o.push(`<text x="${x}" y="${top + 14}" class="pausa">${e.d >= 1 ? '𝄽' : e.d >= 0.5 ? '𝄾' : '𝄿'}</text>`);
			continue;
		}
		o.push(`<line x1="${x}" x2="${x}" y1="${top}" y2="${top + 16}" class="haste"/>`);
		if (e.d >= 2) o.push(`<circle cx="${x}" cy="${top + 18}" r="2.5" class="minima"/>`);
		if (e.d < 1 - 1e-6) {
			const k = Math.floor(e.t + 1e-6);
			if (!grupos.has(k)) grupos.set(k, []);
			grupos.get(k).push({x, top, d: e.d});
		}
	}
	for (const g of grupos.values()) {
		const y = g[0].top + 16;
		if (g.length === 1) {
			const n = g[0].d <= 0.26 ? 2 : 1;
			for (let i = 0; i < n; i++) o.push(`<line x1="${g[0].x}" x2="${g[0].x + 6}" y1="${y - i * 4}" y2="${y - 4 - i * 4}" class="viga"/>`);
			continue;
		}
		o.push(`<line x1="${g[0].x}" x2="${g[g.length - 1].x}" y1="${y}" y2="${y}" class="viga"/>`);
		for (let i = 0; i < g.length; i++) {
			if (g[i].d <= 0.26) {
				const viz = g[i + 1] && g[i + 1].d <= 0.26 ? g[i + 1].x : g[i].x + (i === g.length - 1 ? -5 : 5);
				o.push(`<line x1="${g[i].x}" x2="${viz}" y1="${y - 4}" y2="${y - 4}" class="viga"/>`);
			}
		}
		const tuplet = g.some((n) => Math.abs(n.d - 1 / 3) < 0.01) ? '3' : g.some((n) => Math.abs(n.d - 0.2) < 0.01) ? '5' : '';
		if (tuplet) o.push(`<text x="${(g[0].x + g[g.length - 1].x) / 2}" y="${y + 11}" class="tercina">${tuplet}</text>`);
	}
	return o.join('');
}
