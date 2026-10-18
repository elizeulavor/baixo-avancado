// Simulador de takes de groove com amostras reais (usado por testar-groove.mjs).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as Rt from '../app/js/ritmo.js';
import {_interno} from '../app/js/analise.js';
import {rng} from '../app/js/musica.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sr = 44100;
const ff = (() => {
	const pk = path.join(os.homedir(), 'AppData/Local/Microsoft/WinGet/Packages');
	const c = ['ffmpeg'];
	if (fs.existsSync(pk)) for (const d of fs.readdirSync(pk).filter((d) => d.startsWith('Gyan.FFmpeg'))) for (const s of fs.readdirSync(path.join(pk, d))) c.push(path.join(pk, d, s, 'bin', 'ffmpeg.exe'));
	return c.find((x) => spawnSync(x, ['-version']).status === 0);
})();
if (!ff) {
	console.log('ffmpeg não encontrado (winget install Gyan.FFmpeg).');
	throw new Error('sem ffmpeg');
}
const man = JSON.parse(fs.readFileSync(path.join(raiz, 'app/sons/sons.json'), 'utf8'));
export const grooves = JSON.parse(fs.readFileSync(path.join(raiz, 'app/programa/grooves.json'), 'utf8')).grooves;
const cache = new Map();
function ler(arq) {
	if (cache.has(arq)) return cache.get(arq);
	const r = spawnSync(ff, ['-v', 'error', '-i', path.join(raiz, 'app/sons', arq), '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], {maxBuffer: 1 << 26});
	let x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
	let p = 0;
	for (let i = 0; i < Math.min(x.length, sr * 0.3); i++) p = Math.max(p, Math.abs(x[i]));
	let i0 = 0;
	while (i0 < x.length && Math.abs(x[i0]) < p * 0.03) i0++;
	x = x.slice(Math.max(0, i0 - Math.floor(sr * 0.0008)));
	cache.set(arq, x);
	return x;
}
export const amostra = (grupo, id) => ler(man[grupo].find((x) => x.id === id).arq);
export function nota(midi, vel = 0.75) {
	const l = man.baixo.filter((x) => x.midi != null);
	const dist = Math.min(...l.map((x) => Math.abs(x.midi - midi)));
	const it = l.filter((x) => Math.abs(x.midi - midi) === dist).reduce((a, b) => (Math.abs(b.vel - vel) < Math.abs(a.vel - vel) ? b : a));
	return {x: ler(it.arq), taxa: Math.pow(2, (midi - it.midi) / 12)};
}
export function mistura(sinal, x, taxa, t0, dur, ganho, soltar = 0.03) {
	const i0 = Math.round(t0 * sr);
	const n = Math.min(Math.floor(x.length / taxa), Math.round((dur + soltar) * sr));
	for (let k = 0; k < n && i0 + k < sinal.length; k++) {
		if (i0 + k < 0) continue;
		const pos = k * taxa, a = Math.floor(pos), f = pos - a;
		const v = (x[a] ?? 0) * (1 - f) + (x[a + 1] ?? 0) * f;
		const rel = k > dur * sr ? Math.max(0, 1 - (k - dur * sr) / (soltar * sr)) : 1;
		sinal[i0 + k] += v * ganho * rel;
	}
}

// toca o roteiro: o "aluno" ataca cada alvo com desloc(c, a) ms + ruído de jitter ms
export function simular(r, {desloc = () => 0, jitter = 3, semente = 5, agudos = null, pular = () => false, semClique = false, alturas = [33], clique = 'chimbal'} = {}) {
	const R = rng(semente);
	const gauss = () => (R() + R() + R() + R() - 2) * 1.7;
	const T0 = 0.8;
	const dur = T0 + r.total * r.barDur + 1.2;
	const sinal = new Float32Array(Math.ceil(dur * sr));
	// o chimbal do groove sai por um passa-altas de 4 kHz (audio.js), como aqui
	const agudo = (x) => _interno.hp(_interno.hp(x, 4000, sr), 4000, sr);
	const forte = clique === 'claves' ? amostra('click', 'forte') : agudo(amostra('bateria', 'hat-1')), fraco = clique === 'claves' ? amostra('click', 'fraco') : agudo(amostra('bateria', 'hat-2'));
	const sBeat = r.barDur / r.tempos;
	const notas = [];
	for (let k = 0; k < r.total; k++) {
		const c = r.compasso(k);
		if (!semClique) for (const q of c.cliques) mistura(sinal, q.f >= 1 ? forte : fraco, 1, T0 + k * r.barDur + q.b * sBeat, 0.08, (clique === 'claves' ? 0.5 : 0.8) * q.f);
		if (c.tipo === 'chamada') for (const n of c.notas) {
			const {x, taxa} = nota(33, 0.8);
			notas.push({t: T0 + k * r.barDur + n.b * sBeat, x, taxa, dur: Math.min(n.d * sBeat * 0.9, (4 - n.b) * sBeat - 0.05), g: 0.6});
		}
		if (!c.avaliar) continue;
		c.alvos.forEach((a, i) => {
			if (pular(c, a, i, k)) return;
			const midi = alturas[(k + i) % alturas.length];
			const {x, taxa} = nota(midi, 0.7);
			notas.push({t: T0 + a.t + (desloc(c, a, k) + gauss() * jitter) / 1000, x, taxa, g: 0.7});
		});
	}
	notas.sort((a, b) => a.t - b.t);
	notas.forEach((n, i) => mistura(sinal, n.x, n.taxa, n.t, n.dur ?? Math.max(0.06, Math.min(0.9, (notas[i + 1]?.t ?? n.t + 0.5) - n.t - 0.005)), n.g, 0.004));
	// percussão aguda do groove (chimbal, ride, shaker): é o que o alto-falante toca sem fone
	if (agudos) for (let k = 0; k < r.total; k++) for (const {b, id, g} of agudos) mistura(sinal, amostra('bateria', id), 1, T0 + k * r.barDur + b * sBeat, 0.15, g);
	return {sinal, T0};
}
export function analisar(r, {sinal, T0}, confiavel = true) {
	const usados = [];
	const res = [];
	for (let k = 0; k < r.total; k++) if (r.compasso(k).avaliar) res[k] = Rt.analisarCompassoAoVivo(r, k, sinal, {sr, desloc: T0, usados});
	return {res, s: Rt.resumo(r, res, {confiavel})};
}

