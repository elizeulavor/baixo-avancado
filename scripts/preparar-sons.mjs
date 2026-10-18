// Monta app/sons/ com amostras de instrumentos reais (nada sintético): baixa só os arquivos
// escolhidos das bibliotecas livres, corta o silêncio do início, converte para MP3 mono leve,
// nivela por instrumento (preservando a diferença entre camadas de dinâmica) e confere a altura
// de cada nota de baixo com o próprio detector do app. Gera app/sons/sons.json e CREDITOS.md.
// Uso: node scripts/preparar-sons.mjs        (precisa do ffmpeg; baixa ~40 MB na primeira vez)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {alturaAoVivo} from '../app/js/analise.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(raiz, 'sons-fonte');
const saida = path.join(raiz, 'app', 'sons');
fs.mkdirSync(cache, {recursive: true});

function acharFfmpeg() {
	const cands = ['ffmpeg', path.join(os.homedir(), 'AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe')];
	const pk = path.join(os.homedir(), 'AppData/Local/Microsoft/WinGet/Packages');
	if (fs.existsSync(pk)) for (const d of fs.readdirSync(pk).filter((d) => d.startsWith('Gyan.FFmpeg'))) {
		const base = path.join(pk, d);
		for (const s of fs.readdirSync(base)) cands.push(path.join(base, s, 'bin', 'ffmpeg.exe'));
	}
	return cands.find((c) => spawnSync(c, ['-version']).status === 0);
}
const FFMPEG = acharFfmpeg();
if (!FFMPEG) {
	console.log('FALTA ffmpeg. Instale: winget install Gyan.FFmpeg');
	process.exit(1);
}

const REPOS = {
	bb: {repo: 'sfzinstruments/karoryfer.black-and-blue-basses', nome: 'Black And Blue Basses (Karoryfer Samples)', licenca: 'CC0 1.0'},
	ric: {repo: 'sfzinstruments/Project16Rickenbacker4001', nome: 'Rickenbacker 4001 (Project16, Olivier Loiseau)', licenca: 'CC BY-NC-SA 3.0, modificada: uso não comercial, com crédito'},
	meat: {repo: 'sfzinstruments/karoryfer.meatbass', nome: 'Meatbass (Karoryfer Samples)', licenca: 'CC0 1.0'},
	vd: {repo: 'sfzinstruments/virtuosity_drums', nome: 'Virtuosity Drums (Versilian Studios e Karoryfer Samples)', licenca: 'CC0 1.0'},
	vcsl: {repo: 'sgossner/VCSL', nome: 'Versilian Community Sample Library', licenca: 'CC0 1.0'},
	rh: {repo: 'sfzinstruments/jlearman.jRhodes3c', nome: 'jRhodes3c, Rhodes Mark I 1977 (Jeff Learman)', licenca: 'CC BY-NC-SA 4.0: uso não comercial, com crédito'},
};

const arvores = {};
async function arvore(k) {
	if (arvores[k]) return arvores[k];
	const arq = path.join(cache, `arvore-${k}.json`);
	if (!fs.existsSync(arq)) {
		const r = await fetch(`https://api.github.com/repos/${REPOS[k].repo}/git/trees/HEAD?recursive=1`, {headers: {'User-Agent': 'baixo-avancado'}});
		if (!r.ok) throw new Error(`árvore de ${REPOS[k].repo}: HTTP ${r.status}`);
		fs.writeFileSync(arq, await r.text());
	}
	arvores[k] = JSON.parse(fs.readFileSync(arq, 'utf8')).tree.filter((t) => t.type === 'blob').map((t) => t.path);
	return arvores[k];
}
// primeiro arquivo cujo caminho casa com a regex
async function achar(k, re) {
	const p = (await arvore(k)).filter((x) => re.test(x)).sort()[0];
	if (!p) throw new Error(`não achei ${re} em ${REPOS[k].repo}`);
	return p;
}
async function baixar(k, p) {
	const local = path.join(cache, k, p.replace(/[#\s,]/g, '_'));
	if (fs.existsSync(local)) return local;
	fs.mkdirSync(path.dirname(local), {recursive: true});
	const url = `https://raw.githubusercontent.com/${REPOS[k].repo}/HEAD/${p.split('/').map(encodeURIComponent).join('/')}`;
	for (let tentativa = 1; ; tentativa++) {
		try {
			const r = await fetch(url);
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			fs.writeFileSync(local, Buffer.from(await r.arrayBuffer()));
			return local;
		} catch (e) {
			if (tentativa >= 4) throw new Error(`${url}: ${e.cause?.code ?? e.message}`);
			await new Promise((ok) => setTimeout(ok, 1500 * tentativa));
		}
	}
}

const NOTA = {c: 0, db: 1, 'c#': 1, d: 2, eb: 3, 'd#': 3, e: 4, f: 5, gb: 6, 'f#': 6, g: 7, ab: 8, 'g#': 8, a: 9, bb: 10, 'a#': 10, b: 11};
const midiDoNome = (n) => {
	const m = /^([a-g](?:b|#)?)(-?\d)$/i.exec(n);
	return 12 * (Number(m[2]) + 1) + NOTA[m[1].toLowerCase()];
};

// ---------- o que entra ----------
// Cada item: grupo, id, fonte, regex, e para notas: nome da nota (para a raiz) e camada (vel).
const itens = [];
const add = (grupo, id, k, re, extra = {}) => itens.push({grupo, id, k, re, ...extra});

// baixo de dedo (camadas mf e f), ghost e staccato reais: uma nota a cada 3 semitons
for (const n of ['b1', 'd2', 'f2', 'ab2', 'b2', 'd3', 'f3', 'ab3', 'b3', 'd4', 'f4', 'ab4']) {
	add('baixo', `${n}-mf`, 'bb', new RegExp(`/darkblack/reg/darkblack_${n}_mf_rr1\\.wav$`), {nota: n, vel: 0.7});
	add('baixo', `${n}-f`, 'bb', new RegExp(`/darkblack/reg/darkblack_${n}_f_rr1\\.wav$`), {nota: n, vel: 1});
	add('baixoFantasma', n, 'bb', new RegExp(`/darkblack/ghost/darkblack_${n}_ghost_f_rr1\\.wav$`), {nota: n, vel: 1, curto: 0.25});
	add('baixoStaccato', n, 'bb', new RegExp(`/darkblack/stac/darkblack_${n}_stac_rr1\\.wav$`), {nota: n, vel: 1});
}
// slap: Slap1 e Slap2 do Rickenbacker (qual é polegar e qual é pop sai da medição de brilho)
for (const n of ['E1', 'G1', 'B1', 'D2', 'F2', 'A2', 'C3', 'E3', 'G3']) {
	add('slapA', n, 'ric', new RegExp(`Slapped/Samples/Slap1#Short-${n}_3\\.wav$`), {nota: n, vel: 1});
	add('slapB', n, 'ric', new RegExp(`Slapped/Samples/Slap2#Short-${n}_3\\.wav$`), {nota: n, vel: 1});
}
// baixo acústico (pizzicato) para o walking de jazz
for (const n of ['c1', 'eb1', 'gb1', 'a1', 'c2', 'eb2', 'gb2', 'a2', 'c3', 'eb3']) add('acustico', n, 'meat', new RegExp(`Samples/pizz/${n}_vl3_rr1\\.wav$`, 'i'), {nota: n, vel: 1, opcional: true});

// bateria (kit de jazz gravado, microfone "mid")
const vd = (id, re, vel = 1, extra = {}) => add('bateria', id, 'vd', new RegExp(`Samples/mid/${re}`), {vel, ...extra});
vd('kick-1', 'kick/mid_kick_snon_vl2_rr1', 0.55); vd('kick-2', 'kick/mid_kick_snon_vl3_rr1', 0.8); vd('kick-3', 'kick/mid_kick_snon_vl4_rr1', 1);
vd('snare-1', 'snare/mid_snare_center_vl10\\.', 0.35); vd('snare-2', 'snare/mid_snare_center_vl24\\.', 0.75); vd('snare-3', 'snare/mid_snare_center_vl34\\.', 1);
vd('rim-1', 'snare/mid_snare_crossstick_vl8\\.', 0.7); vd('rim-2', 'snare/mid_snare_crossstick_vl14\\.', 1);
vd('rimshot', 'snare/mid_snare_rimshot_vl10\\.', 1);
vd('hat-1', 'hh/mid_hh_closed_vl2_rr1', 0.5); vd('hat-2', 'hh/mid_hh_closed_vl3_rr1', 0.75); vd('hat-3', 'hh/mid_hh_closed_vl4_rr1', 1);
vd('hatAberto', 'hh/mid_hh_open_vl3_rr1', 1, {max: 1.4}); vd('hatPedal', 'hh/mid_hh_pedal_vl2_rr1', 1);
vd('ride-1', 'ride/mid_ride_ride_vl2_rr1', 0.7, {max: 2.5}); vd('ride-2', 'ride/mid_ride_ride_vl3_rr1', 1, {max: 2.5}); vd('rideBell', 'ride/mid_ride_bell_vl2_rr1', 1, {max: 2.5});
vd('crash', 'crash/mid_crash_crash_vl3_rr1', 1, {max: 3});
vd('surdo-1', 'ltom/mid_ltom_center_vl8\\.', 0.6, {max: 1.6}); vd('surdo-2', 'ltom/mid_ltom_center_vl14\\.', 1, {max: 1.6});
vd('surdoAbafado', 'ltom/mid_ltom_muted_vl12\\.', 1);
vd('tom', 'htom/mid_htom_center_vl10\\.', 1, {max: 1.2});
const vp = (id, re, vel = 1, extra = {}) => add('bateria', id, 'vd', new RegExp(`Samples/perc/mid/.*${re}`), {vel, ...extra});
vp('agogoAlto', 'Agogo_High_v2_rr1_Mid'); vp('agogoBaixo', 'Agogo_Low_v2_rr1_Mid');
vp('triangulo', 'Triangle1_HitM_v1_rr1_Mid'); vp('trianguloAberto', 'Triangle1_Hit_v2_rr1_Mid', 1, {max: 1.5});
vp('shaker-1', 'LShaker_Shake1D_rr1_Mid', 0.8); vp('shaker-2', 'LShaker_Shake1U_rr1_Mid', 1);
vp('pandeiro', 'Tamb1_Shake_rr1_Mid'); vp('clave', 'Claves1_Hit_v2_rr1_Mid'); vp('cowbell', 'Cowbell1_Normal_v2_rr1_Mid');
vp('conga', 'Conga_22_HitN_51_100_rr1_Mid'); vp('congaTapa', 'Conga_17_HitHM1_71_127_rr1_Mid'); vp('tumba', 'Tumba_24_HitN_71_100_rr1_Mid');
vp('tamborim', 'BongoH_Hit1_v3_rr1_Mid'); vp('bongoBaixo', 'BongoL_Hit1_v2_rr1_Mid');
vp('ganza', 'Cabasa1_Rub_v2_rr1_Mid'); vp('guiro', 'Guiro_Fast');
add('bateria', 'clap', 'vcsl', /Idiophones\/Struck Idiophones\/Claps\/.*\.wav$/, {vel: 1});

// metrônomo: claves de verdade (agudas: ficam fora da faixa do baixo que a análise escuta)
add('click', 'forte', 'vd', /Samples\/perc\/mid\/.*Claves1_Hit_v3_rr1_Mid/, {vel: 1, passaAlta: 1500});
add('click', 'fraco', 'vd', /Samples\/perc\/mid\/.*Claves1_Hit_v1_rr1_Mid/, {vel: 1, passaAlta: 1500});
add('click', 'madeira', 'vcsl', /Woodblock\/.*wood_click_f_rr1\.wav$/, {vel: 1, passaAlta: 1500});

// teclados: Rhodes e piano de cauda
for (const n of ['C3', 'E3', 'G#3', 'C4', 'E4', 'G#4', 'C5']) add('piano', n, 'vcsl', new RegExp(`Steinway B/.*JHPiano_NoSus_Close_${n}_vl3_rr1\\.wav$`), {nota: n, vel: 1, max: 3});

// sons da interface: instrumentos de verdade (vibrafone, glockenspiel, prato)
add('ui', 'vibra-C', 'vcsl', /Vibraphone\/.*Vibes_hard_C3_v2_rr1_Main\.wav$/, {vel: 1, max: 2.5, opcional: true});
add('ui', 'vibra-E', 'vcsl', /Vibraphone\/.*Vibes_hard_E3_v2_rr1_Main\.wav$/, {vel: 1, max: 2.5, opcional: true});
add('ui', 'vibra-G', 'vcsl', /Vibraphone\/.*Vibes_hard_G3_v2_rr1_Main\.wav$/, {vel: 1, max: 2.5, opcional: true});
add('ui', 'vibra-C5', 'vcsl', /Vibraphone\/.*Vibes_hard_C5_v2_rr1_Main\.wav$/, {vel: 1, max: 3, opcional: true});
add('ui', 'glock', 'vcsl', /Glockenspiel\/.*glock_medium_C6_01\.wav$/, {vel: 1, max: 1.5});
add('ui', 'prato', 'vcsl', /Suspended Cymbal 1\/.*susCymb1_cresc_2s\.wav$/, {vel: 1, max: 3.5});
add('ui', 'sino', 'vcsl', /Glockenspiel\/.*glock_loud_G5_01\.wav$/, {vel: 1, max: 2});

// ---------- processamento ----------
function decodificar(arq, max = 4) {
	const r = spawnSync(FFMPEG, ['-v', 'error', '-i', arq, '-ac', '1', '-ar', '44100', '-t', String(max), '-f', 'f32le', '-'], {maxBuffer: 1 << 28});
	if (r.status !== 0) throw new Error(`ffmpeg leu mal ${arq}: ${r.stderr}`);
	const b = r.stdout;
	return new Float32Array(b.buffer, b.byteOffset, b.length / 4);
}
const pico = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

async function principal() {
	// rhodes: notas do arquivo de nomes (As_053__F3_...): pega a camada do meio de cada nota
	const rhArv = await arvore('rh');
	const porNota = {};
	for (const p of rhArv.filter((x) => /-mono\.flac$/.test(x))) {
		const m = /As_(\d+)__([A-G]s?\d)_(\d+)-mono/.exec(p);
		if (m && Number(m[1]) >= 40 && Number(m[1]) <= 77) (porNota[m[1]] ??= []).push({p, n: Number(m[3])});
	}
	for (const [midi, lista] of Object.entries(porNota)) {
		lista.sort((a, b) => a.n - b.n);
		itens.push({grupo: 'rhodes', id: `m${midi}`, k: 'rh', caminho: lista[Math.floor(lista.length / 2)].p, midi: Number(midi), vel: 1, max: 3});
	}

	console.log(`${itens.length} amostras escolhidas. Baixando o que falta...`);
	const prontos = [];
	for (const it of itens) {
		try {
			it.caminho ??= await achar(it.k, it.re);
			it.local = await baixar(it.k, it.caminho);
			prontos.push(it);
		} catch (e) {
			if (it.opcional) console.log(`aviso  ${it.grupo}/${it.id}: ${e.message}`);
			else throw e;
		}
	}

	// altura e brilho medidos de verdade
	for (const it of prontos) {
		const x = decodificar(it.local, 1.2);
		it.pico = pico(x);
		if (it.nota || it.grupo === 'rhodes') {
			const i0 = Math.min(x.length - 8192, 4410);
			const m = alturaAoVivo(x.slice(i0, i0 + 8192), 44100);
			it.medido = m;
		}
		if (it.grupo.startsWith('slap')) {
			// brilho = energia acima de 1,5 kHz / total (o pop é mais brilhante que o polegar)
			let a = 0, t = 0, ant = 0;
			for (let i = 0; i < Math.min(x.length, 22050); i++) {
				const d = x[i] - ant;
				ant = x[i];
				a += d * d;
				t += x[i] * x[i];
			}
			it.brilho = a / (t || 1);
		}
	}
	// raiz de cada nota: classe de altura do nome, oitava pela maioria das medições
	for (const grupo of [...new Set(prontos.filter((i) => i.nota).map((i) => i.grupo))]) {
		const g = prontos.filter((i) => i.grupo === grupo);
		const votos = {};
		for (const i of g) {
			if (i.medido == null) continue;
			const dif = Math.round((i.medido - midiDoNome(i.nota)) / 12) * 12;
			votos[dif] = (votos[dif] ?? 0) + 1;
		}
		const desloc = Number(Object.entries(votos).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0);
		for (const i of g) i.midi = midiDoNome(i.nota) + desloc;
		const fora = g.filter((i) => i.medido != null && Math.abs(i.medido - i.midi) > 0.6 && Math.abs(i.medido - i.midi - 12) > 0.6 && Math.abs(i.medido - i.midi + 12) > 0.6);
		console.log(`${grupo}: nome + ${desloc} semitons (medido em ${Object.values(votos).reduce((a, b) => a + b, 0)} de ${g.length})${fora.length ? `; altura diferente do nome: ${fora.map((f) => `${f.id}=${f.medido.toFixed(1)}`).join(', ')}` : ''}`);
	}
	let polegar = 'slapA', pop = 'slapB';
	const brilho = (g) => {
		const v = prontos.filter((i) => i.grupo === g).map((i) => i.brilho);
		return v.reduce((a, b) => a + b, 0) / (v.length || 1);
	};
	if (brilho('slapA') > brilho('slapB')) [polegar, pop] = ['slapB', 'slapA'];
	console.log(`slap: polegar = ${polegar}, pop = ${pop} (brilho ${brilho(polegar).toFixed(3)} x ${brilho(pop).toFixed(3)})`);
	for (const i of prontos) if (i.grupo === polegar) i.grupo = 'slap'; else if (i.grupo === pop) i.grupo = 'pop';

	// ganho por grupo: o pico do grupo vai a -1 dB, mantendo a diferença entre camadas
	const picoGrupo = {};
	for (const i of prontos) picoGrupo[i.grupo] = Math.max(picoGrupo[i.grupo] ?? 0, i.pico);
	fs.rmSync(saida, {recursive: true, force: true});
	const manifesto = {};
	let bytes = 0;
	for (const i of prontos) {
		const ganho = 0.89 / (picoGrupo[i.grupo] || 1);
		const max = i.max ?? (i.curto ?? 2.2);
		// nivela antes de cortar o silêncio: assim o limiar vale para gravações baixas também
		const ganhoCorte = 0.89 / (i.pico || 1);
		const filtros = [
			`volume=${ganhoCorte.toFixed(4)}`,
			'silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.002',
			`volume=${(ganho / ganhoCorte).toFixed(4)}`,
			i.passaAlta ? `highpass=f=${i.passaAlta}:poles=2` : null,
			`afade=t=out:st=${Math.max(0.05, max - 0.12).toFixed(2)}:d=0.12`,
		].filter(Boolean).join(',');
		const rel = `${i.grupo}/${i.id.replace(/#/g, 's')}.mp3`;
		const destino = path.join(saida, rel);
		fs.mkdirSync(path.dirname(destino), {recursive: true});
		const r = spawnSync(FFMPEG, ['-v', 'error', '-y', '-i', i.local, '-ac', '1', '-ar', '44100', '-af', filtros, '-t', String(max), '-c:a', 'libmp3lame', '-b:a', '112k', destino]);
		if (r.status !== 0) throw new Error(`conversão de ${i.id}: ${r.stderr}`);
		const tam = fs.statSync(destino).size;
		if (tam < 1500) throw new Error(`${rel} saiu vazio (${tam} bytes)`);
		bytes += tam;
		(manifesto[i.grupo] ??= []).push({id: i.id, arq: rel, ...(i.midi != null ? {midi: i.midi} : {}), vel: i.vel});
	}
	for (const g of Object.values(manifesto)) g.sort((a, b) => (a.midi ?? 0) - (b.midi ?? 0) || a.vel - b.vel);
	fs.writeFileSync(path.join(saida, 'sons.json'), JSON.stringify(manifesto, null, 1));
	const usados = [...new Set(prontos.map((i) => i.k))];
	fs.writeFileSync(path.join(saida, 'CREDITOS.md'), `# Créditos dos sons\n\nTodos os sons do app são gravações de instrumentos reais. Cortados, convertidos para MP3 mono e nivelados por scripts/preparar-sons.mjs.\n\n${usados.map((k) => `- **${REPOS[k].nome}**: https://github.com/${REPOS[k].repo} · licença ${REPOS[k].licenca}`).join('\n')}\n\nUso pessoal e não comercial. Para vender o curso, troque os sons do Rickenbacker (slap/pop) e do jRhodes ou peça licença aos autores.\n`);
	console.log(`\n${prontos.length} sons em app/sons/ (${(bytes / 1048576).toFixed(1)} MB).`);
	for (const [g, l] of Object.entries(manifesto)) console.log(`  ${g}: ${l.length}`);
}
principal().catch((e) => {
	console.error(`ERRO ${e.message}`);
	process.exit(1);
});
