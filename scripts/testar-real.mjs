// Teste da avaliação com gravações reais: monta um take com as amostras de baixo de app/sons/
// (dedo, ghost), com erros conhecidos, e o clique de claves por cima. Confere o que a análise acha.
// Uso: node scripts/testar-real.mjs [drill] [--sem-clique] [--sem-baixo]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseLinha, nomeMidi} from '../app/js/musica.js';
import {avaliar, detectarAtaques, _interno} from '../app/js/analise.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const semClique = args.includes('--sem-clique');
const semBaixo = args.includes('--sem-baixo');
const sr = Number(process.env.SR ?? 44100);
const ff = (() => {
	const pk = path.join(os.homedir(), 'AppData/Local/Microsoft/WinGet/Packages');
	const c = ['ffmpeg'];
	if (fs.existsSync(pk)) for (const d of fs.readdirSync(pk).filter((d) => d.startsWith('Gyan.FFmpeg'))) for (const s of fs.readdirSync(path.join(pk, d))) c.push(path.join(pk, d, s, 'bin', 'ffmpeg.exe'));
	return c.find((x) => spawnSync(x, ['-version']).status === 0);
})();
const man = JSON.parse(fs.readFileSync(path.join(raiz, 'app/sons/sons.json'), 'utf8'));
const cache = new Map();
function ler(arq) {
	if (cache.has(arq)) return cache.get(arq);
	const r = spawnSync(ff, ['-v', 'error', '-i', path.join(raiz, 'app/sons', arq), '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], {maxBuffer: 1 << 26});
	let x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
	// mesmo corte de silêncio inicial do app
	let p = 0;
	for (let i = 0; i < Math.min(x.length, sr * 0.3); i++) p = Math.max(p, Math.abs(x[i]));
	let i0 = 0;
	while (i0 < x.length && Math.abs(x[i0]) < p * 0.03) i0++;
	x = x.slice(Math.max(0, i0 - Math.floor(sr * 0.0008)));
	cache.set(arq, x);
	return x;
}
function nota(grupo, midi, vel = 0.75) {
	const l = man[grupo].filter((x) => x.midi != null);
	const dist = Math.min(...l.map((x) => Math.abs(x.midi - midi)));
	const it = l.filter((x) => Math.abs(x.midi - midi) === dist).reduce((a, b) => (Math.abs(b.vel - vel) < Math.abs(a.vel - vel) ? b : a));
	return {x: ler(it.arq), taxa: Math.pow(2, (midi - it.midi) / 12)};
}
const BPM = 90, bt = 60 / BPM, inicio = 0.8;
const linha = args.find((a) => !a.startsWith('--')) ?? '(A5>:16 A7 D5 D7 G5 D7 D5 A7)*2 | E0:16 r E0x E12 r E0x D2:8 A2:16 E0x D2 E0 r:8 G2:16 A2';
const {eventos} = parseLinha(linha);
const total = eventos.at(-1).t + eventos.at(-1).d;
const sinal = new Float32Array(Math.ceil((inicio + total * bt + 1.5) * sr));
function mistura(x, taxa, t0, dur, ganho, soltar = 0.05) {
	const i0 = Math.round(t0 * sr);
	const n = Math.min(Math.floor(x.length / taxa), Math.round((dur + soltar) * sr));
	for (let k = 0; k < n && i0 + k < sinal.length; k++) {
		const pos = k * taxa, a = Math.floor(pos), f = pos - a;
		const v = (x[a] ?? 0) * (1 - f) + (x[a + 1] ?? 0) * f;
		const rel = k > dur * sr ? Math.max(0, 1 - (k - dur * sr) / (soltar * sr)) : 1;
		sinal[i0 + k] += v * ganho * rel;
	}
}
const ATRASO_E = 15, ERRADA = 3, FALTA = 6;
let seed = 3;
const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647 - 0.5) * 2;
if (!semBaixo) eventos.forEach((e, i) => {
	if (e.pausa || i === FALTA) return;
	const pos = Math.round((e.t % 1) * 4);
	const t = inicio + e.t * bt + ((pos === 1 ? ATRASO_E : 0) + rnd() * 2) / 1000;
	const {x, taxa} = nota(e.fantasma ? 'baixoFantasma' : 'baixo', i === ERRADA ? e.midi + 2 : e.midi, e.acento ? 1 : 0.7);
	// como no baixo de verdade: a próxima nota na mesma corda corta esta
	const prox = eventos.slice(i + 1).find((n) => !n.pausa && n.corda === e.corda);
	const ate = prox ? (prox.t - e.t) * bt - 0.005 : Infinity;
	mistura(x, taxa, t, Math.min(ate, e.fantasma ? 0.1 : e.d * bt * 0.92), e.fantasma ? 0.6 : e.acento ? 1 : 0.7, prox ? 0.004 : 0.05);
});
if (!semClique) {
	const forte = ler(man.click.find((c) => c.id === 'forte').arq), fraco = ler(man.click.find((c) => c.id === 'fraco').arq);
	const gC = Number(process.env.CLIQUE ?? 0.5);
	for (let k = 0; k < total; k++) mistura(k % 4 ? fraco : forte, 1, inicio + k * bt, 0.08, gC);
}
const esperado = eventos.map((e) => ({...e, t: e.t * bt, d: e.d * bt}));
const brutos = detectarAtaques(sinal, sr).ataques.filter((a) => a.t > inicio - 0.1);
console.log(`ataques brutos: ${brutos.length} (notas tocadas: ${semBaixo ? 0 : eventos.filter((e, i) => !e.pausa && i !== FALTA).length}${semClique ? '' : `, cliques: ${Math.round(total)}`})`);
const res = avaliar(sinal, sr, esperado, {inicio, duracao: total * bt, modo: 'sequencia', bpm: BPM, tempos: 4, latenciaConfiavel: true, criterios: {}, dinamica: {fantasma: 8}});
const e = res.tempo.porPosicao.find((p) => p.pos.startsWith('"e"')), t0 = res.tempo.porPosicao.find((p) => p.pos === 'tempo');
console.log(`esperadas ${res.contagem.esperadas}, casadas ${res.contagem.casadas}, faltando ${res.contagem.faltando} (1 plantada), extras ${res.contagem.extras}`);
console.log(`tempo: desvio ${res.tempo.desvio.toFixed(1)} ms, média ${res.tempo.media.toFixed(1)} ms; "e" ${e && t0 ? (e.media - t0.media).toFixed(1) : '?'} ms (plantado +${ATRASO_E})`);
console.log(`notas: ${res.notas?.acerto?.toFixed(0)}% de ${res.notas?.avaliadas}; erradas: ${res.notas?.erradas.map((x) => `${x.onde} ${x.tocou}≠${x.esperado}`).join(', ')} (plantada: ${nomeMidi(eventos[ERRADA].midi + 2)})`);
console.log(`fantasma ${res.dinamica.fantasma?.toFixed(1)} dB abaixo; nota ${res.nota}, aprovado ${res.aprovado}`);
if (args.includes('--ataques')) console.log(brutos.map((a) => ((a.t - inicio) / bt * 4).toFixed(2)).join(' '));
if (args.includes('--detalhe')) {
	eventos.forEach((e, i) => {
		if (e.pausa) return;
		const tp = inicio + e.t * bt + (Math.round((e.t % 1) * 4) === 1 ? ATRASO_E / 1000 : 0);
		const perto = brutos.reduce((a, b) => (Math.abs(b.t - tp) < Math.abs(a.t - tp) ? b : a), brutos[0]);
		console.log(`${String(i).padStart(2)} semi ${(e.t * 4).toFixed(0).padStart(2)} ${nomeMidi(i === ERRADA ? e.midi + 2 : e.midi).padEnd(4)} ${e.fantasma ? 'ghost' : '     '} ${i === FALTA ? 'NÃO TOCADA' : `erro ${((perto.t - tp) * 1000).toFixed(1)} ms`}`);
	});
}

if (args.includes('--sinal')) {
	const {lp, hp, envelope} = _interno;
	const x = lp(sinal, 1600, sr);
	const env = envelope(hp(x, 250, sr), Math.round(sr * 0.002), Math.round(sr * 0.0005));
	const crua = envelope(x, Math.round(sr * 0.002), Math.round(sr * 0.0005));
	for (const i of [1, 2, 4, 10]) {
		const e = eventos[i];
		const tp = inicio + e.t * bt + (Math.round((e.t % 1) * 4) === 1 ? ATRASO_E / 1000 : 0);
		const linha = [];
		for (let ms = -50; ms <= 40; ms += 5) linha.push(`:${(20 * Math.log10(env[Math.round((tp + ms / 1000) / 0.0005)] + 1e-7)).toFixed(0)}/${(20 * Math.log10(crua[Math.round((tp + ms / 1000) / 0.0005)] + 1e-7)).toFixed(0)}`);
		console.log(`nota ${i} (${nomeMidi(e.midi)}) banda/cru dB: ${linha.join(' ')}`);
	}
}