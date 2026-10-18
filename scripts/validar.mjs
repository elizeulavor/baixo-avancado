// Confere o programa: cada drill monta, cada compasso soma o tempo certo, BPMs fazem sentido,
// grooves e progressões existem. Rode depois de qualquer mudança em app/programa/.
// Uso: node scripts/validar.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseLinha, eventosDoDrill, parseProgressao, temposPorCompasso, conjuntoEscala, nomeMidi} from '../app/js/musica.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => JSON.parse(fs.readFileSync(path.join(raiz, p), 'utf8'));
const programa = ler('app/programa/programa.json');
const grooves = ler('app/programa/grooves.json');
const erros = [];
const avisos = [];
const ids = new Set();
let n = 0;

for (const g of grooves.grooves) {
	for (const [faixa, p] of Object.entries(g.faixas)) if (p.length !== g.passos) erros.push(`groove ${g.id}: faixa ${faixa} tem ${p.length} passos, esperado ${g.passos}`);
	for (const k of ['comp', 'baixo']) if (g[k] && g[k].length !== g.passos) erros.push(`groove ${g.id}: ${k} tem ${g[k].length} passos`);
}
const idsGroove = new Set(grooves.grooves.map((g) => g.id));

for (const m of programa.modulos) {
	if (!['A', 'B'].includes(m.trilha)) erros.push(`${m.id}: trilha deve ser A ou B`);
	for (const d of m.drills) {
		n++;
		const onde = `${d.id} (${d.titulo})`;
		if (ids.has(d.id)) erros.push(`${onde}: id repetido`);
		ids.add(d.id);
		if (!d.id.startsWith(m.id)) avisos.push(`${onde}: id não começa com o módulo ${m.id}`);
		const tempos = temposPorCompasso(d.compasso);
		try {
			if (d.linha && d.linha.includes('|')) {
				const {barras, total} = parseLinha(d.linha);
				let ant = 0;
				barras.concat([total]).forEach((b, i) => {
					if (Math.abs(b - ant - tempos) > 1e-6) erros.push(`${onde}: compasso ${i + 1} soma ${(b - ant).toFixed(3)} tempos, esperado ${tempos}`);
					ant = b;
				});
			}
			for (const afin of ['EADG', 'BEADG']) {
				const {eventos} = eventosDoDrill(d, afin, '2026-10-17');
				if (!eventos.some((e) => !e.pausa)) erros.push(`${onde}: nenhuma nota`);
				const total = eventos.at(-1).t + eventos.at(-1).d;
				if (Math.abs(total / tempos - Math.round(total / tempos)) > 1e-6) erros.push(`${onde}: total ${total} não fecha compasso`);
				for (const e of eventos) if (!e.pausa && (e.casa < 0 || e.casa > 24)) erros.push(`${onde}: casa ${e.casa} fora do braço`);
				const seg = (total * 60) / d.bpm.inicio * (d.voltas ?? 1);
				if (afin === 'EADG' && seg > 75) avisos.push(`${onde}: take de ${seg.toFixed(0)} s no BPM inicial (longo para avaliar)`);
				if (afin === 'EADG' && d.modo !== 'conjunto' && !d.gradeLivre) {
					const graves = eventos.filter((e) => !e.pausa && e.midi < 28);
					if (graves.length) erros.push(`${onde}: nota abaixo do E grave em 4 cordas (${nomeMidi(graves[0].midi)})`);
				}
			}
			for (const _ of [3]) {
				const dias = new Set(['2026-10-17', '2026-10-18', '2026-10-19'].map((s) => JSON.stringify(eventosDoDrill(d, 'EADG', s).eventos.map((e) => e.midi))));
				if ((d.gerar?.diario || d.gerar?.tons === 'diario' || d.gerar?.tom === 'diario') && dias.size < 2) avisos.push(`${onde}: exercício diário não muda de um dia para o outro`);
			}
		} catch (e) {
			erros.push(`${onde}: ${e.message}`);
		}
		if (d.progressao) {
			try {
				parseProgressao(d.progressao, tempos);
			} catch (e) {
				erros.push(`${onde}: progressão: ${e.message}`);
			}
		}
		if (['alvos', 'aproximacao'].includes(d.modo) && !d.progressao) erros.push(`${onde}: modo ${d.modo} precisa de "progressao"`);
		if (d.modo === 'conjunto') {
			try {
				conjuntoEscala(d.conjunto.tom, d.conjunto.escala);
			} catch (e) {
				erros.push(`${onde}: conjunto inválido`);
			}
		}
		if (d.groove && !idsGroove.has(d.groove)) erros.push(`${onde}: groove "${d.groove}" não existe em grooves.json`);
		const {inicio, meta, passo} = d.bpm ?? {};
		if (!inicio || !meta || passo == null) erros.push(`${onde}: bpm precisa de inicio, meta e passo`);
		else if (passo !== 0 && Math.sign(meta - inicio) !== Math.sign(passo)) erros.push(`${onde}: o passo de BPM anda para longe da meta`);
		else if (passo === 0 && inicio !== meta) erros.push(`${onde}: passo 0 exige inicio = meta`);
	}
}

// repertório: ids únicos, 5 por nível, campos obrigatórios (os vídeos se conferem com conferir-repertorio.mjs)
const rep = ler('app/programa/repertorio.json');
const idsRep = new Set();
for (const m of rep.musicas) {
	if (idsRep.has(m.id)) erros.push(`repertório: id repetido ${m.id}`);
	idsRep.add(m.id);
	for (const c of ['titulo', 'artista', 'nivel', 'yt', 'canal', 'trecho', 'foco', 'repare']) if (m[c] == null || m[c] === '') erros.push(`repertório ${m.id}: falta ${c}`);
	if (!/^[\w-]{11}$/.test(m.yt ?? '')) erros.push(`repertório ${m.id}: id de vídeo inválido`);
}
for (const nv of rep.niveis) if (rep.musicas.filter((m) => m.nivel === nv.n).length < 3) erros.push(`repertório: nível ${nv.n} com menos de 3 músicas (não abriria o seguinte)`);
// harmonia: gera perguntas de todos os jogos e níveis sem erro
const H = await import('../app/js/harmonia.js');
for (const jogo of Object.keys(H.JOGOS)) for (const nv of [1, 2, 3]) {
	try {
		for (let k = 0; k < 200; k++) {
			const p = H.pergunta(jogo, nv);
			const certas = Array.isArray(p.certa) ? p.certa : [p.certa];
			if (jogo !== 'baixo' && !certas.every((c) => p.opcoes.some((o) => o.id === c))) throw new Error(`resposta certa fora das opções (${certas})`);
		}
	} catch (e) {
		erros.push(`harmonia ${jogo} nível ${nv}: ${e.message}`);
	}
}

console.log(`${programa.modulos.length} módulos, ${n} drills, ${grooves.grooves.length} grooves, ${rep.musicas.length} músicas, ${Object.keys(H.JOGOS).length} jogos de harmonia`);
for (const a of avisos) console.log(`aviso  ${a}`);
for (const e of erros) console.log(`ERRO   ${e}`);
console.log(erros.length ? `\n${erros.length} erro(s).` : '\nPrograma válido.');
process.exit(erros.length ? 1 : 0);
