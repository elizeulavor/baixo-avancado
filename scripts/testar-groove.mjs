// Teste dos jogos de groove com gravações reais: monta o take com as amostras de baixo de app/sons/,
// o clique de claves e a percussão aguda (como sai do alto-falante sem fone), com erros conhecidos
// (bolso deslocado, deriva no silêncio, swing), e roda a análise ao vivo compasso a compasso.
// Uso: node scripts/testar-groove.mjs [--detalhe]
import * as Rt from '../app/js/ritmo.js';
import {rng} from '../app/js/musica.js';
import {simular, analisar, grooves} from './lib-groove.mjs';

const detalhe = process.argv.includes('--detalhe');
let falhas = 0;
const ok = (cond, txt) => {
	console.log(`${cond ? 'ok   ' : 'FALHA'} ${txt}`);
	if (!cond) falhas++;
};
const f1 = (v) => (v == null ? '–' : v.toFixed(1));
const teste = (nome, jogo, nivel, op, checar) => {
	const r = Rt.roteiro(jogo, nivel, {grooves, R: rng(nome)});
	const t = performance.now();
	const out = analisar(r, simular(r, op));
	const ms = (performance.now() - t) / r.total;
	const {s} = out;
	console.log(`\n${nome} (${jogo} ${nivel}, ${r.total} compassos, ${ms.toFixed(0)} ms/compasso): cobertura ${(s.cobertura * 100).toFixed(0)}%, desvio ${f1(s.desvio)} ms, média ${f1(s.media)} ms, extras ${s.extras}, ★${s.estrelas}`);
	if (detalhe) for (const x of out.res.filter(Boolean)) console.log(`  c${x.k} ${x.tipo} ${x.nota} casados ${x.casados}/${x.n} extras ${x.extras} média ${f1(x.media)} desvio ${f1(x.desvio)}${x.razao != null ? ` razão ${f1(x.razao)}` : ''}`);
	checar(s, out);
};

teste('Relógio sem deriva', 'relogio', 3, {jitter: 3}, (s) => {
	ok(s.cobertura >= 0.97, `cobertura ${(s.cobertura * 100).toFixed(0)}% ≥ 97%`);
	ok(s.deriva != null && s.deriva < 9, `deriva na volta ${f1(s.deriva)} ms < 9`);
	ok(s.estrelas === 3, `3 estrelas (${s.estrelas})`);
});
teste('Relógio correndo no silêncio', 'relogio', 3, {jitter: 3, desloc: (c, a) => (c.tipo === 'gap' ? -8 * c.gapN : c.tipo === 'volta' && a.b < 0.01 ? -24 : 0)}, (s) => {
	// 3 compassos sem clique, o aluno adianta 8 ms por compasso: chega ~-24 na volta (o 1 da volta sai antes de ouvir o clique)
	ok(s.voltas.length === 4, `${s.voltas.length} voltas medidas`);
	ok(s.deriva > 14 && s.deriva < 32, `deriva ${f1(s.deriva)} ms entre 14 e 32`);
	ok(s.voltas.every((v) => v < 0), `voltas adiantadas (${s.voltas.map(f1).join(', ')})`);
});
teste('Contratempo no "a"', 'contratempo', 6, {jitter: 3}, (s) => {
	ok(s.cobertura >= 0.97 && s.extras <= 1, `cobertura ${(s.cobertura * 100).toFixed(0)}%, extras ${s.extras}`);
	ok(s.estrelas === 3, `3 estrelas (${s.estrelas})`);
});
teste('Bolso atrás +20', 'bolso', 2, {jitter: 3, desloc: () => 20}, (s) => {
	ok(Math.abs(s.media) < 4 && s.noBolso >= 0.9, `média contra o alvo ${f1(s.media)} ms, no bolso ${(s.noBolso * 100).toFixed(0)}%`);
	ok(s.estrelas >= 2, `≥ 2 estrelas (${s.estrelas})`);
});
teste('Bolso: pediu atrás, tocou em cima', 'bolso', 2, {jitter: 3, desloc: () => 0}, (s) => {
	ok(s.noBolso <= 0.25, `fora do bolso (${(s.noBolso * 100).toFixed(0)}% no bolso)`);
	ok(s.estrelas === 0, `0 estrelas (${s.estrelas})`);
});
teste('Bolso alternado', 'bolso', 7, {jitter: 3, desloc: (c) => c.alvoMs}, (s) => {
	const por = Object.fromEntries(s.porAlvo.map((x) => [x.alvo, x.media]));
	ok(Math.abs(por[20] - 20) < 5 && Math.abs(por[-15] + 15) < 5, `atrás ${f1(por[20])} e na frente ${f1(por[-15])} ms`);
});
teste('Escada 1 a 6', 'escada', 5, {jitter: 3}, (s) => {
	ok(s.bons >= 0.9, `${(s.bons * 100).toFixed(0)}% dos compassos bons`);
	ok(s.porSub.every((x) => x.bons >= 0.5), `todas as subdivisões (${s.porSub.map((x) => `${x.sub}:${(x.bons * 100).toFixed(0)}%`).join(' ')})`);
});
teste('Eco certo', 'eco', 4, {jitter: 4}, (s) => {
	ok(s.boas === s.respostas, `${s.boas}/${s.respostas} respostas boas`);
	ok(s.estrelas >= 2, `≥ 2 estrelas (${s.estrelas})`);
});
teste('Eco com uma nota faltando por resposta', 'eco', 3, {jitter: 4, pular: (c, a, i) => c.tipo === 'resposta' && i === 1}, (s) => {
	ok(s.perfeitas === 0, `nenhuma resposta perfeita (${s.perfeitas})`);
});
teste('Eco frases de 2 compassos', 'eco', 8, {jitter: 4}, (s) => ok(s.boas >= s.respostas - 1, `${s.boas}/${s.respostas} boas`));
const hatsDe = (g) => {
	const out = [];
	const passo = g.ciclo / g.passos;
	for (const [faixa, id] of [['hat', 'hat-1'], ['ride', 'ride-1'], ['ganza', 'shaker-1']]) {
		const pd = g.faixas[faixa];
		if (pd) [...pd].forEach((ch, k) => ch !== '.' && out.push({b: k * passo, id, g: ch === 'X' ? 0.5 : 0.3}));
	}
	return out;
};
for (const [nv, nome] of [[4, 'funk'], [9, 'samba'], [17, '7/8']]) {
	const id = Rt.JOGOS.bumbo.niveis[nv - 1].groove;
	teste(`Bumbo ${nome} com chimbal no alto-falante`, 'bumbo', nv, {jitter: 3, agudos: hatsDe(grooves.find((g) => g.id === id))}, (s) => {
		ok(s.cobertura >= 0.95, `cobertura ${(s.cobertura * 100).toFixed(0)}%`);
		ok(s.extras <= 2, `extras ${s.extras} (chimbal não vira nota)`);
	});
}
teste('Swing em tercina', 'swing', 2, {jitter: 3}, (s) => {
	ok(Math.abs(s.porAlvo[0].media - 67) < 2.5, `razão medida ${f1(s.porAlvo[0].media)}% (alvo 67)`);
	ok(s.estrelas >= 2, `≥ 2 estrelas (${s.estrelas})`);
});
teste('Swing: pediu tercina, tocou reto', 'swing', 2, {jitter: 3, desloc: (c, a) => (a.lado === 'off' ? (0.5 - c.razao / 100) * 600 : 0)}, (s) => {
	ok(s.estrelas === 0, `0 estrelas (${s.estrelas}), razão ${f1(s.porAlvo[0]?.media)}`);
});

// jogos de toque e geradores
{
	const R = rng('ditado');
	let distintas = true;
	for (let nv = 1; nv <= 10; nv++) for (let k = 0; k < 30; k++) {
		const p = Rt.perguntaDitado(nv, R);
		const set = new Set(p.opcoes.map((o) => JSON.stringify(o.ticks)));
		if (set.size !== p.opcoes.length || p.opcoes.length < 3 || JSON.stringify(p.opcoes[p.certa].ticks) !== JSON.stringify(p.frase.ticks)) distintas = false;
	}
	ok(distintas, '\nditado: opções distintas e a certa no lugar, nos 10 níveis');
	const p = Rt.perguntaUm(5, grooves, rng('um'));
	const toques = p.uns.map((u, i) => u + (i ? 0.02 : 0.3));
	const a = Rt.avaliarUm(p, toques);
	ok(a.acertou && a.errados === 1, `onde está o 1: acertou com um toque errado no começo (${a.certos.join(',')})`);
	const bt = Rt.bpmDosToques([0, 0.5, 1.0, 1.5, 2.0, 2.5].map((t, i) => t + 0.08 + (i % 2 ? 0.006 : -0.006)));
	ok(Math.abs(bt.bpm - 120) < 2, `bpm dos toques ${bt.bpm.toFixed(1)} (120)`);
}

console.log(falhas ? `\n${falhas} falha(s).` : '\nGroove: tudo certo.');
process.exit(falhas ? 1 : 0);
