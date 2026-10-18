// Teste da avaliação sem microfone: sintetiza um baixo com erros conhecidos (semicolcheia "e"
// atrasada, uma nota errada, uma nota faltando, acentos), mistura cliques agudos e confere se a
// análise encontra exatamente esses erros.
// Uso: node scripts/testar-avaliacao.mjs
import {parseLinha, freqMidi, nomeMidi} from '../app/js/musica.js';
import {avaliar} from '../app/js/analise.js';

const sr = 48000;
const bpm = 96;
const bt = 60 / bpm;
const inicio = 0.6;
const {eventos} = parseLinha('(A5>:16 A7 D5 D7 G5 D7 D5 A7)*4');
const dur = eventos.at(-1).t + eventos.at(-1).d;
// ruído com semente: o teste dá sempre o mesmo resultado (SEMENTE=n para variar)
let semente = Number(process.env.SEMENTE ?? 7);
const ruido = () => ((semente = (semente * 48271) % 2147483647) / 2147483647);
const sinal = new Float32Array(Math.ceil((inicio + dur * bt + 1) * sr));

function pluck(midi, t0, secs, amp) {
	const N = Math.round(sr / freqMidi(midi));
	const buf = Float32Array.from({length: N}, () => ruido() * 2 - 1);
	for (let p = 0; p < 3; p++) for (let i = 1; i < N; i++) buf[i] = (buf[i] + buf[i - 1]) / 2;
	let idx = 0;
	const i0 = Math.round(t0 * sr);
	const n = Math.round(secs * sr);
	for (let k = 0; k < n && i0 + k < sinal.length; k++) {
		const a = buf[idx], b = buf[(idx + 1) % N];
		buf[idx] = 0.996 * 0.5 * (a + b);
		idx = (idx + 1) % N;
		const fade = k > n - 1440 ? (n - k) / 1440 : 1; // abafamento de 30 ms
		sinal[i0 + k] += a * amp * fade;
	}
}

const ERRO_E = 15; // ms de atraso na 2ª semicolcheia de cada tempo
const NOTA_ERRADA = 5; // índice tocado um tom acima
const FALTANDO = 11;
let r = 1;
const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
eventos.forEach((e, i) => {
	if (i === FALTANDO) return;
	const pos = Math.round((e.t % 1) * 4);
	const desvio = (pos === 1 ? ERRO_E : 0) + rand() * 2;
	const midi = i === NOTA_ERRADA ? e.midi + 2 : e.midi;
	pluck(midi, inicio + e.t * bt + desvio / 1000, e.d * bt * 0.9, e.acento ? 0.5 : 0.25);
});
// cliques do metrônomo em cada tempo, 3,2 kHz, chegando 0 ms depois (latência já descontada)
for (let k = 0; k < dur; k++) {
	const i0 = Math.round((inicio + k * bt) * sr);
	for (let j = 0; j < sr * 0.02; j++) sinal[i0 + j] += 0.3 * Math.sin((2 * Math.PI * 3200 * j) / sr) * Math.exp(-j / (sr * 0.005));
}

const esperado = eventos.map((e) => ({...e, t: e.t * bt, d: e.d * bt}));
const res = avaliar(sinal, sr, esperado, {inicio, duracao: dur * bt, modo: 'sequencia', bpm, tempos: 4, latenciaConfiavel: true, dinamica: {tipo: 'acentos', min: 4}, criterios: {}});

const linha = (ok, txt) => console.log(`${ok ? 'ok   ' : 'FALHA'} ${txt}`);
console.log(`notas esperadas ${res.contagem.esperadas}, tocadas detectadas ${res.contagem.tocadas}, casadas ${res.contagem.casadas}`);
const e = res.tempo.porPosicao.find((p) => p.pos.startsWith('"e"'));
const t0 = res.tempo.porPosicao.find((p) => p.pos === 'tempo');
linha(e && Math.abs(e.media - t0.media - ERRO_E) < 4, `"e" atrasado ${e ? (e.media - t0.media).toFixed(1) : '?'} ms (esperado ${ERRO_E})`);
const casadas = new Set(res.tempo.pontos.map((p) => p.t.toFixed(4)));
const sumidas = esperado.filter((e, i) => i !== FALTANDO && !casadas.has(e.t.toFixed(4))).map((e) => `semi ${Math.round(e.t / bt * 4)} ${nomeMidi(e.midi)}`);
linha(res.contagem.faltando === 1, `faltando: ${res.contagem.faltando} (esperado 1)${sumidas.length ? `; não achou: ${sumidas.join(', ')}` : ''}`);
linha(res.notas.erradas.length === 1, `notas erradas: ${res.notas.erradas.map((x) => `${x.onde} ${x.tocou}≠${x.esperado}`).join(', ') || 'nenhuma'} (esperado 1, ${nomeMidi(eventos[NOTA_ERRADA].midi + 2)})`);
linha(res.dinamica.acento > 4, `acento ${res.dinamica.acento?.toFixed(1)} dB acima (gravado com +6 dB)`);
linha(res.contagem.extras <= 1, `ataques a mais: ${res.contagem.extras} (no máximo 1; os cliques não podem virar nota)`);
console.log(`\nnota ${res.nota}, aprovado ${res.aprovado}`);
for (const i of res.itens) console.log(`  ${i.ok ? '✓' : '✗'} ${i.nome}: ${i.valor.toFixed(1)} ${i.unidade} (limite ${i.limite})`);
for (const d of res.dicas) console.log(`  · ${d}`);
