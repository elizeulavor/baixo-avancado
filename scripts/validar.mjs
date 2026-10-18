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
for (const jogo of Object.keys(H.JOGOS)) for (const rating of [900, 1200, 1500, 1800, 2100]) {
	try {
		for (let k = 0; k < 150; k++) {
			const p = H.pergunta(jogo, {rating});
			if (!p.slots.length || p.certa.length !== p.slots.length) throw new Error('slots e respostas não batem');
			if (!H.JOGOS[jogo].soBaixo && !p.certa.every((c) => p.opcoes.some((o) => o.id === c))) throw new Error(`resposta certa fora das opções (${p.certa})`);
			if (!(p.dificuldade > 0) || p.alvo.some((a) => !a.nome)) throw new Error('pergunta incompleta');
		}
	} catch (e) {
		erros.push(`harmonia ${jogo} rating ${rating}: ${e.message}`);
	}
}

// groove: todo nível de todo jogo monta (com e sem fone), alvos dentro do compasso, janelas válidas
const Rt = await import('../app/js/ritmo.js');
let nNiveis = 0;
for (const jogo of Rt.ORDEM) {
	const J0 = Rt.JOGOS[jogo];
	J0.niveis.forEach((nv, k) => {
		nNiveis++;
		const onde = `groove ${jogo} nível ${k + 1}`;
		try {
			if (J0.mic) for (const fone of [false, true]) {
				const r = Rt.roteiro(jogo, k + 1, {grooves: grooves.grooves, fone});
				if (!(r.barDur > 0) || r.total < 4) throw new Error('roteiro vazio');
				const seg = r.total * r.barDur;
				if (!fone && seg > 90) avisos.push(`${onde}: ${seg.toFixed(0)} s (longo)`);
				for (let c = 0; c < r.total; c++) for (const a of r.compasso(c).alvos) {
					if (a.b < -1e-6 || a.b >= r.tempos + 1e-6) throw new Error(`alvo fora do compasso (${a.b})`);
					if (!(a.jan > 0.02)) throw new Error(`janela de casamento pequena demais (${a.jan})`);
				}
				if (!r.comps.some((c) => c.avaliar && c.alvos.length)) throw new Error('nenhum compasso avaliado');
			}
			else if (jogo === 'ondeum') for (let i = 0; i < 20; i++) {
				const p = Rt.perguntaUm(k + 1, grooves.grooves);
				if (p.uns.length < 4) throw new Error('menos de 4 "uns"');
			}
			else if (jogo === 'ditado') for (let i = 0; i < 20; i++) {
				const p = Rt.perguntaDitado(k + 1);
				if (p.opcoes.length < 3) throw new Error('menos de 3 opções');
			}
			else for (let i = 0; i < 6; i++) if (!Rt.perguntaAndamento(k + 1, grooves.grooves, Math.random, i).groove) throw new Error('sem groove para tocar');
		} catch (e) {
			erros.push(`${onde}: ${e.message}`);
		}
	});
}
const inf = Rt.roteiroInfinito({});
for (let k = 0; k < 40; k++) if (!inf.compasso(k)) erros.push('eco infinito: compasso faltando');
const {totalFrases} = await import('../app/js/frases.js');
// progressões das músicas: campos, cifras que o app toca, 4 opções distintas
const prog = ler('app/programa/progressoes.json');
const {parseAcorde} = await import('../app/js/musica.js');
const {opcoes: opcoesProg} = await import('../app/js/progmus.js');
const idsProg = new Set();
for (const m of prog.musicas) {
	const onde = `progressão ${m.id}`;
	if (idsProg.has(m.id)) erros.push(`${onde}: id repetido`);
	idsProg.add(m.id);
	for (const c of ['titulo', 'artista', 'yt', 'canal', 'trecho', 'nivel', 'graus', 'explica']) if (m[c] == null || m[c] === '') erros.push(`${onde}: falta ${c}`);
	if (!/^[\w-]{11}$/.test(m.yt ?? '')) erros.push(`${onde}: id de vídeo inválido`);
	if (!prog.niveis.some((n) => n.n === m.nivel)) erros.push(`${onde}: nível ${m.nivel} não existe`);
	if (m.cifras) {
		if (m.cifras.length !== m.graus.length) erros.push(`${onde}: ${m.cifras.length} cifras para ${m.graus.length} graus`);
		for (const c of m.cifras) try {
			parseAcorde(c.replace('♭', 'b'));
		} catch (e) {
			erros.push(`${onde}: ${e.message}`);
		}
	}
	const o = opcoesProg(m, prog.musicas);
	if (o.lista.length !== 4 || new Set(o.lista.map((g) => g.join())).size !== 4 || o.certa < 0) erros.push(`${onde}: opções não saíram 4 distintas`);
}

console.log(`${programa.modulos.length} módulos, ${n} drills, ${grooves.grooves.length} grooves, ${rep.musicas.length} músicas, ${Object.keys(H.JOGOS).length} jogos de harmonia, ${Rt.ORDEM.length} jogos de groove (${nNiveis} níveis), ${prog.musicas.length} progressões de músicas, ${totalFrases()} frases do dia`);
for (const a of avisos) console.log(`aviso  ${a}`);
for (const e of erros) console.log(`ERRO   ${e}`);
console.log(erros.length ? `\n${erros.length} erro(s).` : '\nPrograma válido.');
process.exit(erros.length ? 1 : 0);
