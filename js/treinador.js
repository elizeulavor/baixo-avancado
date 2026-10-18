// Treinador: lê os números do aluno e diz, sem rodeio, o foco do dia, por quê, e o que está em jogo.
// Só conclui o que os dados mostram; com poucos dados, diz que faltam dados.
import * as E from './estado.js';
import * as J from './jogo.js';

const media = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const f1 = (v) => (v == null ? '–' : (Math.round(v * 10) / 10).toString().replace('.', ','));
const diasAtras = (n) => {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return E.hoje(d);
};
const inicioSemana = () => {
	const d = new Date();
	d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // segunda-feira
	return E.hoje(d);
};

// todos os takes com medições, do mais antigo para o mais novo
function takes() {
	const out = [];
	for (const [id, p] of Object.entries(E.estado.drills)) for (const h of p.historico ?? []) out.push({id, ...h});
	return out.sort((a, b) => a.data.localeCompare(b.data));
}

// ---------- meta semanal ----------
export function metaSemanal() {
	const c = E.estado.config;
	const meta = c.metaSemanal ?? 280 * Math.max(3, c.dias.length);
	const ini = inicioSemana();
	const xpDia = J.estadoJogo().xpDia ?? {};
	const feito = Object.entries(xpDia).filter(([d]) => d >= ini).reduce((s, [, v]) => s + v, 0);
	const diasRestantes = 7 - ((new Date().getDay() + 6) % 7) - 1;
	return {meta, feito, frac: Math.min(1, feito / meta), falta: Math.max(0, meta - feito), diasRestantes, ini};
}

// ---------- análises ----------
export function analise() {
	const T = takes();
	const recentes = T.slice(-15).filter((t) => t.met);
	const anteriores = T.slice(-30, -15).filter((t) => t.met);
	const dv1 = media(recentes.map((t) => t.met.dv).filter((v) => v != null));
	const dv0 = media(anteriores.map((t) => t.met.dv).filter((v) => v != null));
	const md1 = media(recentes.map((t) => t.met.md).filter((v) => v != null));
	const dn1 = media(recentes.map((t) => t.met.dn).filter((v) => v != null));
	// semicolcheia torta: posição com média deslocada em relação ao tempo, em vários takes
	const porPos = {};
	for (const t of recentes) {
		const base = t.met.pp?.find(([p]) => p === 'tempo')?.[1] ?? 0;
		for (const [p, v] of t.met.pp ?? []) if (p !== 'tempo' && v != null) (porPos[p] ??= []).push(v - base);
	}
	const torta = Object.entries(porPos).filter(([, v]) => v.length >= 4).map(([pos, v]) => ({pos, ms: media(v), n: v.length})).filter((x) => Math.abs(x.ms) >= 6).sort((a, b) => Math.abs(b.ms) - Math.abs(a.ms))[0] ?? null;
	// o que mais reprova
	const rep = {};
	for (const t of recentes) for (const r of t.met.rep ?? []) rep[r] = (rep[r] ?? 0) + 1;
	const maisReprova = Object.entries(rep).sort((a, b) => b[1] - a[1])[0] ?? null;
	// drill travado: 8+ takes em 14 dias, menos de 30% aprovados
	const desde = diasAtras(14);
	const porDrill = {};
	for (const t of T.filter((x) => x.data >= desde)) (porDrill[t.id] ??= []).push(t);
	const travado = Object.entries(porDrill).map(([id, l]) => ({id, n: l.length, aprov: l.filter((x) => x.aprovado).length / l.length, bpm: l.at(-1).bpm})).filter((x) => x.n >= 8 && x.aprov < 0.3).sort((a, b) => b.n - a.n)[0] ?? null;
	// ganho de BPM na semana: maior aprovado nesta semana menos o maior antes dela
	const ini = inicioSemana();
	let ganhoMaior = null;
	for (const [id, l] of Object.entries(Object.groupBy ? Object.groupBy(T, (t) => t.id) : T.reduce((g, t) => ((g[t.id] ??= []).push(t), g), {}))) {
		const d = E.drillPorId(id);
		if (!d || d.bpm.passo <= 0) continue;
		const antes = Math.max(0, ...l.filter((t) => t.data < ini && t.aprovado).map((t) => t.bpm));
		const agora = Math.max(0, ...l.filter((t) => t.data >= ini && t.aprovado).map((t) => t.bpm));
		if (antes && agora > antes && (!ganhoMaior || agora - antes > ganhoMaior.ganho)) ganhoMaior = {id, titulo: d.titulo, ganho: agora - antes, agora};
	}
	// perto de algo
	const quaseDominado = E.todosDrills().find((d) => !E.dominado(d) && (E.estado.drills[d.id]?.aprovacoesMeta?.length ?? 0) === 1);
	const modProva = E.programa.modulos.find((m) => E.provaPendente(m));
	const modQuase = E.programa.modulos.find((m) => !E.moduloConcluido(m) && m.drills.filter((d) => !E.dominado(d)).length === 1);
	const erroOuvido = J.errosHarmonia()[0] ?? null;
	const dias14 = new Set(T.filter((t) => t.data >= desde).map((t) => t.data)).size;
	return {nTakes: T.length, recentes: recentes.length, dv1, dv0, md1, dn1, torta, maisReprova, travado, ganhoMaior, quaseDominado, modProva, modQuase, erroOuvido, dias14, groove: analiseGroove()};
}
// Groove: tendência no silêncio (Relógio), no bolso e no swing, das últimas 5 rodadas de cada.
export function analiseGroove() {
	const G = E.grooveGeral().jogos;
	const ult = (j) => (G[j]?.hist ?? []).slice(-5);
	const rel = ult('relogio').map((h) => h.met?.volta).filter((v) => v != null);
	const volta = rel.length >= 3 ? media(rel) : null;
	const sw = ult('swing').map((h) => h.met?.razaoErro).filter((v) => v != null);
	const swing = sw.length >= 3 ? media(sw) : null;
	const bo = ult('bolso').map((h) => h.met?.foraBolso).filter((v) => v != null);
	const bolso = bo.length >= 3 ? media(bo) : null;
	return {volta, swing, bolso};
}

// ---------- mensagem do dia (até 3 linhas, cada uma com número) ----------
export function mensagemDoDia() {
	const a = analise();
	const plano = E.planoDoDia();
	const f = E.feitoNoPlano(plano);
	const seq = E.sequencia();
	const meta = metaSemanal();
	const hora = new Date().getHours();
	const linhas = [];
	// 1. o que está em jogo hoje
	if (f.pct >= 0.8) linhas.push({ic: '✓', txt: `Treino de hoje feito. Sequência: ${seq} ${seq === 1 ? 'dia' : 'dias'}.`});
	else if (seq > 0) {
		const faltam = Math.ceil(0.8 * f.total) - f.feitos;
		linhas.push({ic: '🔥', txt: `${seq} ${seq === 1 ? 'dia' : 'dias'} seguidos. Faltam ${faltam} ${faltam === 1 ? 'etapa' : 'etapas'} para chegar a ${seq + 1}${hora >= 20 ? '; o dia está acabando' : ''}.`, alerta: hora >= 20});
	} else linhas.push({ic: '▶', txt: a.nTakes ? 'Sequência zerada. Um treino hoje recomeça a contagem.' : 'Primeiro dia: calibre, grave um take e veja os números.'});
	// 2. foco técnico com base nos takes
	if (a.recentes < 5) linhas.push({ic: '📏', txt: `Ainda poucos takes (${a.recentes}) para eu apontar tendência. Grave pelo menos 5 hoje.`});
	else if (a.travado) {
		const d = E.drillPorId(a.travado.id);
		linhas.push({ic: '⛔', txt: `Travado em "${d?.titulo}": ${a.travado.n} takes em 14 dias, ${Math.round(a.travado.aprov * 100)}% aprovados. Baixe ${Math.abs(d?.bpm.passo || 4) * 2} BPM por 3 takes limpos antes de subir de novo.`, link: `#drill/${a.travado.id}`});
	} else if (a.torta) linhas.push({ic: '🎯', txt: `Seu ${a.torta.pos} está ${f1(Math.abs(a.torta.ms))} ms ${a.torta.ms > 0 ? 'atrasado' : 'adiantado'} em relação ao tempo (${a.torta.n} takes). Hoje, preste atenção nele em toda semicolcheia.`});
	else if (a.maisReprova) linhas.push({ic: '🎯', txt: `O que mais te reprova: ${a.maisReprova[0].toLowerCase()} (${a.maisReprova[1]} dos últimos ${a.recentes} takes). É o foco de hoje.`});
	else if (a.md1 != null && Math.abs(a.md1) >= 6) linhas.push({ic: '🎯', txt: `Você tende a tocar ${f1(Math.abs(a.md1))} ms ${a.md1 > 0 ? 'atrás' : 'na frente'} do clique. Hoje, ${a.md1 > 0 ? 'empurre um pouco' : 'segure um pouco'}.`});
	else if (a.dv1 != null) linhas.push({ic: '📏', txt: `Regularidade média: ±${f1(a.dv1)} ms nos últimos ${a.recentes} takes${a.dv0 != null ? ` (antes: ±${f1(a.dv0)})` : ''}. Meta de profissional: abaixo de 8.`});
	// 3. progresso ou o que está perto de abrir
	if (a.modProva) linhas.push({ic: '🎓', txt: `Prova final de "${a.modProva.titulo}" liberada. Passar vale 500 XP e abre o próximo módulo.`, link: `#prova/${a.modProva.id}`});
	else if (a.quaseDominado) linhas.push({ic: '★', txt: `"${a.quaseDominado.titulo}": falta 1 aprovação na meta, em outro dia, para dominar.`, link: `#drill/${a.quaseDominado.id}`});
	else if (a.ganhoMaior) linhas.push({ic: '📈', txt: `Esta semana: +${a.ganhoMaior.ganho} BPM em "${a.ganhoMaior.titulo}" (agora ${a.ganhoMaior.agora}).`});
	else if (a.dv1 != null && a.dv0 != null && a.dv0 - a.dv1 >= 1) linhas.push({ic: '📈', txt: `Regularidade melhorou de ±${f1(a.dv0)} para ±${f1(a.dv1)} ms.`});
	else if (a.groove.volta != null && Math.abs(a.groove.volta) >= 10) linhas.push({ic: '⌛', txt: `No silêncio do Relógio você ${a.groove.volta < 0 ? 'corre' : 'arrasta'}: o clique volta e te acha ${f1(Math.abs(a.groove.volta))} ms ${a.groove.volta < 0 ? 'adiantado' : 'atrasado'} (últimas rodadas). ${a.groove.volta < 0 ? 'Pense na colcheia do 4 antes de cada 1.' : 'Sinta o 1 chegando, sem esperar por ele.'}`, link: '#groove/relogio'});
	else if (a.groove.bolso != null && Math.abs(a.groove.bolso) >= 6) linhas.push({ic: '◐', txt: `No Bolso, sua média fica ${f1(Math.abs(a.groove.bolso))} ms ${a.groove.bolso > 0 ? 'atrás' : 'na frente'} do alvo pedido.`, link: '#groove/bolso'});
	else if (a.groove.swing != null && Math.abs(a.groove.swing) >= 4) linhas.push({ic: '≈', txt: `Seu swing sai ${f1(Math.abs(a.groove.swing))} pontos ${a.groove.swing > 0 ? 'mais duro' : 'mais reto'} que o pedido.`, link: '#groove/swing'});
	else if (a.erroOuvido) linhas.push({ic: '👂', txt: `No ouvido, o que mais pega é ${rotuloLegivel(a.erroOuvido.rotulo)} (${Math.round(a.erroOuvido.taxa * 100)}% de erro). Uma rodada de "Seus erros" resolve isso mais rápido.`, link: '#harmonia/erros'});
	else linhas.push({ic: '📆', txt: `Meta da semana: ${meta.feito} de ${meta.meta} XP${meta.diasRestantes ? `, ${meta.diasRestantes} ${meta.diasRestantes === 1 ? 'dia' : 'dias'} pela frente` : ''}.`});
	return linhas.slice(0, 3);
}
function rotuloLegivel(r) {
	if (r.startsWith('cad:')) return `a cadência ${r.slice(4)}`;
	if (r.startsWith('inv:')) return {f: 'a fundamental no baixo', 3: 'a terça no baixo', 5: 'a quinta no baixo', 7: 'a sétima no baixo', p: 'o pedal'}[r.slice(4)] ?? r;
	if (r.startsWith('funcao:')) return `a função do ${r.slice(7)}`;
	if (r.startsWith('qual:')) return `a qualidade ${r.slice(5) === 'M' ? 'maior' : r.slice(5)}`;
	if (r.startsWith('int:')) return `o intervalo de ${r.slice(4)} semitons`;
	if (r.startsWith('modo:')) return `o modo ${r.slice(5)}`;
	return `o grau ${r}`;
}

// ---------- relatório da semana ----------
export function relatorio() {
	const ini = inicioSemana();
	const T = takes();
	const sem = T.filter((t) => t.data >= ini);
	const ant = T.filter((t) => t.data >= diasAtras(14) && t.data < ini);
	const minutos = Object.entries(E.estado.sessoes).filter(([d]) => d >= ini).reduce((s, [, v]) => s + v, 0);
	const dias = new Set(Object.entries(E.estado.sessoes).filter(([d, v]) => d >= ini && v >= 5).map(([d]) => d)).size;
	const taxa = (l) => (l.length ? Math.round((100 * l.filter((t) => t.aprovado).length) / l.length) : null);
	const dvm = (l) => media(l.map((t) => t.met?.dv).filter((v) => v != null));
	const a = analise();
	const h = E.estado.harmonia ?? {};
	const ratings = Object.entries(h).filter(([, v]) => v.jogadas).map(([k, v]) => ({jogo: k, rating: v.rating}));
	const dominadosSemana = E.todosDrills().filter((d) => E.dominado(d) && (E.estado.drills[d.id]?.aprovacoesMeta?.at(-1) ?? '') >= ini);
	const musicas = Object.entries(E.estado.repertorio ?? {}).filter(([, m]) => m.feito && m.feito >= ini).length;
	return {
		ini, minutos: Math.round(minutos), dias, meta: metaSemanal(),
		takes: sem.length, takesAnt: ant.length, aprov: taxa(sem), aprovAnt: taxa(ant), dv: dvm(sem), dvAnt: dvm(ant),
		dominados: dominadosSemana.map((d) => d.titulo), musicas, ratings, analise: a,
	};
}
export const fmt1 = f1;
