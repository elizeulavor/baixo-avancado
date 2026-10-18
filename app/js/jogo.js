// Gamificação: XP, níveis, sequência com escudos, combo, conquistas, recordes, radar de habilidades
// e a prova final de cada módulo. Tudo calculado a partir do estado; nada de ponto inventado.
import * as E from './estado.js';

// ---------- níveis ----------
export const TITULOS = [
	[1, 'Garagem'], [4, 'Ensaio'], [8, 'Primeira gig'], [12, 'Casa noturna'], [17, 'Banda da casa'],
	[22, 'Turnê'], [28, 'Sessão de estúdio'], [34, 'Sideman'], [40, 'Diretor musical'], [47, 'Referência'], [55, 'Lenda do groove'],
];
const xpParaNivel = (n) => Math.round(120 * Math.pow(n - 1, 1.55)); // XP acumulado para chegar ao nível n
export function nivel(xp = estadoJogo().xp) {
	let n = 1;
	while (xpParaNivel(n + 1) <= xp) n++;
	const base = xpParaNivel(n), prox = xpParaNivel(n + 1);
	const titulo = [...TITULOS].reverse().find(([l]) => n >= l)[1];
	const proxTitulo = TITULOS.find(([l]) => l > n);
	return {n, titulo, xp, base, prox, frac: (xp - base) / (prox - base), falta: prox - xp, proxTitulo};
}

export function estadoJogo() {
	E.estado.jogo ??= {xp: 0, escudos: 0, escudosUsados: [], conquistas: {}, recordes: {}, combo: 0, comboMax: 0, eventos: [], provas: {}, diasPlano: {}};
	return E.estado.jogo;
}

// ---------- conquistas ----------
// Cada uma: id, nome, descrição, ícone (emoji como glifo), xp, e o teste.
const todasHist = () => Object.entries(E.estado.drills).flatMap(([id, p]) => (p.historico ?? []).map((h) => ({...h, id})));
export const CONQUISTAS = [
	{id: 'primeiro-take', nome: 'Microfone aberto', desc: 'Gravar o primeiro take', icone: '🎙', xp: 20, ok: () => todasHist().length >= 1},
	{id: 'primeira-aprov', nome: 'Primeira aprovação', desc: 'Passar em todos os critérios de um drill', icone: '✔', xp: 40, ok: () => todasHist().some((h) => h.aprovado)},
	{id: 'metronomo-humano', nome: 'Metrônomo humano', desc: 'Take aprovado com desvio de tempo abaixo de 6 ms', icone: '⏱', xp: 150, ok: (r) => r?.aprovado && r.tempo.desvio < 6},
	{id: 'relogio-suico', nome: 'Relógio suíço', desc: '5 takes com desvio abaixo de 8 ms', icone: '⌚', xp: 200, ok: () => (estadoJogo().contaPrecisos ?? 0) >= 5},
	{id: 'cirurgico', nome: 'Cirúrgico', desc: '100% das notas certas num take de 32 notas ou mais', icone: '🎯', xp: 120, ok: (r) => r?.notas?.acerto === 100 && r.notas.avaliadas >= 32},
	{id: 'fantasma', nome: 'Mão fantasma', desc: 'Ghost notes 18 dB abaixo das notas cheias', icone: '👻', xp: 100, ok: (r) => r?.aprovado && r.dinamica.fantasma >= 18},
	{id: 'silencio', nome: 'Silêncio de ouro', desc: 'Pausas 35 dB abaixo das notas', icone: '🤫', xp: 100, ok: (r) => r?.aprovado && r.som.silencio >= 35},
	{id: 'velocista', nome: 'Velocista', desc: 'Aprovar semicolcheias a 120 BPM ou mais', icone: '⚡', xp: 150, ok: (r, ctx) => r?.aprovado && ctx?.semis && ctx.bpm >= 120},
	{id: 'combo5', nome: 'Em chamas', desc: 'Combo de 5 aprovações seguidas', icone: '🔥', xp: 120, ok: () => estadoJogo().comboMax >= 5},
	{id: 'seq7', nome: 'Uma semana', desc: '7 dias seguidos de treino', icone: '📅', xp: 150, ok: () => E.sequencia() >= 7},
	{id: 'seq30', nome: 'Hábito', desc: '30 dias seguidos', icone: '🗓', xp: 600, ok: () => E.sequencia() >= 30},
	{id: 'seq100', nome: 'Disciplina', desc: '100 dias seguidos', icone: '🏛', xp: 2000, ok: () => E.sequencia() >= 100},
	{id: 'takes100', nome: 'Cem takes', desc: '100 takes gravados', icone: '💯', xp: 200, ok: () => todasHist().length >= 100},
	{id: 'takes500', nome: 'Quinhentos', desc: '500 takes gravados', icone: '🏆', xp: 800, ok: () => todasHist().length >= 500},
	{id: 'dominio', nome: 'Domínio', desc: 'Dominar o primeiro drill', icone: '★', xp: 100, ok: () => E.todosDrills().some(E.dominado)},
	{id: 'dominio20', nome: 'Repertório técnico', desc: '20 drills dominados', icone: '✦', xp: 500, ok: () => E.todosDrills().filter(E.dominado).length >= 20},
	{id: 'modulo1', nome: 'Primeira prova', desc: 'Passar na prova final de um módulo', icone: '🎓', xp: 300, ok: () => Object.values(estadoJogo().provas).some((p) => p.passou)},
	{id: 'duas-trilhas', nome: 'Duas frentes', desc: 'Passar em provas das trilhas A e B', icone: '⚖', xp: 400, ok: () => ['A', 'B'].every((t) => E.programa.modulos.some((m) => m.trilha === t && estadoJogo().provas[m.id]?.passou))},
	{id: 'formado', nome: 'Formado', desc: 'Passar nas 12 provas', icone: '👑', xp: 3000, ok: () => E.programa.modulos.every((m) => estadoJogo().provas[m.id]?.passou)},
	{id: 'ciclo', nome: 'Ciclo completo', desc: 'Dominar os arpejos maj7 nos 12 tons', icone: '♻', xp: 200, ok: () => {
		const d = E.drillPorId('b1-1');
		return d && E.dominado(d);
	}},
	{id: 'leitor', nome: 'Leitor', desc: '10 leituras do dia aprovadas', icone: '📖', xp: 250, ok: () => todasHist().filter((h) => h.aprovado && /^b5-[123]/.test(h.id)).length >= 10},
	{id: 'ouvido', nome: 'Ouvido treinado', desc: '10 ditados aprovados', icone: '👂', xp: 250, ok: () => todasHist().filter((h) => h.aprovado && /^b5-[45]/.test(h.id)).length >= 10},
	{id: 'braco', nome: 'Mapa do braço', desc: '30 notas por minuto no jogo do braço', icone: '🗺', xp: 200, ok: () => (estadoJogo().recordes.braco ?? 0) >= 30},
	{id: 'madrugador', nome: 'Madrugador', desc: 'Take antes das 7h', icone: '🌅', xp: 50, ok: (r) => !!r && new Date().getHours() < 7},
	{id: 'maratona', nome: 'Maratona', desc: '90 minutos num dia', icone: '🏃', xp: 200, ok: () => (E.estado.sessoes[E.hoje()] ?? 0) >= 90},
	{id: 'primeira-musica', nome: 'Primeira transcrição', desc: 'Tirar a primeira música de ouvido', icone: '🎧', xp: 100, ok: () => Object.values(E.estado.repertorio ?? {}).some((m) => m.feito)},
	{id: 'repertorio10', nome: 'Repertório', desc: '10 músicas tiradas de ouvido', icone: '📀', xp: 500, ok: () => Object.values(E.estado.repertorio ?? {}).filter((m) => m.feito).length >= 10},
	{id: 'repertorio30', nome: 'Ouvido de estúdio', desc: 'As 30 músicas do repertório', icone: '🏅', xp: 2500, ok: () => Object.values(E.estado.repertorio ?? {}).filter((m) => m.feito).length >= 30},
	{id: 'rodada-perfeita', nome: 'Rodada perfeita', desc: 'Acertar tudo numa rodada de ouvido harmônico', icone: '💎', xp: 120, ok: () => (E.harmoniaGeral().perfeitas ?? 0) > 0},
	{id: 'cadencias100', nome: 'Ouvido funcional', desc: '100 cadências reconhecidas', icone: '🔑', xp: 400, ok: () => (E.estado.harmonia?.cadencia?.acertos ?? 0) >= 100},
	{id: 'raiz-certa', nome: 'Raiz certeira', desc: 'Rating 1400 no jogo da raiz no baixo', icone: '🎯', xp: 300, ok: () => (E.estado.harmonia?.baixo?.rating ?? 0) >= 1400},
	{id: 'ouvido-avancado', nome: 'Ouvido avançado', desc: 'Rating 1650 em qualquer jogo de harmonia', icone: '🎼', xp: 400, ok: () => Object.values(E.estado.harmonia ?? {}).some((h) => (h.rating ?? 0) >= 1650)},
	{id: 'ouvido-mestre', nome: 'Ouvido de mestre', desc: 'Rating 1900 em qualquer jogo de harmonia', icone: '🧠', xp: 1200, ok: () => Object.values(E.estado.harmonia ?? {}).some((h) => (h.rating ?? 0) >= 1900)},
	{id: 'desafio7', nome: 'Sete desafios', desc: '7 desafios do dia seguidos', icone: '☀', xp: 250, ok: () => sequenciaDesafio() >= 7},
	{id: 'rush20', nome: 'Relâmpago', desc: '20 acertos num Rush', icone: '⚡', xp: 300, ok: () => (E.harmoniaGeral().rushRecorde ?? 0) >= 20},
	{id: 'survive15', nome: 'Sobrevivente', desc: '15 acertos num Survive', icone: '♥', xp: 300, ok: () => (E.harmoniaGeral().surviveRecorde ?? 0) >= 15},
	{id: 'inversoes', nome: 'Ouvido de baixista', desc: 'Rating 1500 em inversões', icone: '⤵', xp: 350, ok: () => (E.estado.harmonia?.inversao?.rating ?? 0) >= 1500},
	{id: 'meta-semanal', nome: 'Semana cheia', desc: 'Bater a meta semanal de XP', icone: '📆', xp: 150, ok: () => !!estadoJogo().metasBatidas?.length},
	{id: 'recordista', nome: 'Recordista', desc: '25 recordes pessoais de BPM', icone: '📈', xp: 300, ok: () => (estadoJogo().contaRecordes ?? 0) >= 25},
];

function ganhar(xp, motivo, eventos) {
	const j = estadoJogo();
	const antes = nivel(j.xp).n;
	j.xp += Math.round(xp);
	j.xpDia ??= {};
	j.xpDia[E.hoje()] = (j.xpDia[E.hoje()] ?? 0) + Math.round(xp);
	eventos.push({tipo: 'xp', xp: Math.round(xp), motivo});
	const depois = nivel(j.xp);
	if (depois.n > antes) eventos.push({tipo: 'nivel', nivel: depois.n, titulo: depois.titulo, novoTitulo: nivel(xpParaNivel(antes)).titulo !== depois.titulo});
	// meta semanal (semana começa na segunda); comemorada uma vez por semana
	const d = new Date();
	d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
	const ini = E.hoje(d);
	const semana = Object.entries(j.xpDia).filter(([k]) => k >= ini).reduce((s, [, v]) => s + v, 0);
	const meta = E.estado.config.metaSemanal ?? 280 * Math.max(3, E.estado.config.dias.length);
	j.metasBatidas ??= [];
	if (semana >= meta && !j.metasBatidas.includes(ini)) {
		j.metasBatidas.push(ini);
		eventos.push({tipo: 'meta', meta});
	}
}
function checarConquistas(r, ctx, eventos) {
	const j = estadoJogo();
	for (const c of CONQUISTAS) {
		if (j.conquistas[c.id]) continue;
		let ok = false;
		try {
			ok = c.ok(r, ctx);
		} catch {}
		if (ok) {
			j.conquistas[c.id] = E.hoje();
			eventos.push({tipo: 'conquista', conquista: c});
			ganhar(c.xp, c.nome, eventos);
		}
	}
}

// Chamado depois de cada take avaliado. Devolve os eventos para a tela comemorar.
export function aposTake(d, bpm, res, {prova} = {}) {
	const j = estadoJogo();
	const eventos = [];
	const p = E.progresso(d);
	const {inicio, meta} = d.bpm;
	const avanco = inicio === meta ? 1 : Math.max(0, Math.min(1, (bpm - inicio) / (meta - inicio)));
	if (res.aprovado) {
		j.combo++;
		j.comboMax = Math.max(j.comboMax, j.combo);
		const mult = 1 + Math.min(1, (j.combo - 1) * 0.1);
		const seq = 1 + Math.min(0.5, E.sequencia() * 0.02);
		ganhar(40 * (res.nota / 100) * (1 + avanco) * mult * seq, j.combo > 1 ? `Take aprovado · combo ×${j.combo}` : 'Take aprovado', eventos);
		if (j.combo > 1) eventos.push({tipo: 'combo', combo: j.combo, mult});
		if (res.tempo.desvio < 8) j.contaPrecisos = (j.contaPrecisos ?? 0) + 1;
		// recorde de BPM aprovado neste drill
		const rec = (j.recordes[d.id] ??= {bpm: 0, desvio: null});
		if (bpm > rec.bpm && d.bpm.passo >= 0) {
			if (rec.bpm) {
				eventos.push({tipo: 'recorde', texto: `Recorde: ${bpm} BPM (antes ${rec.bpm})`});
				j.contaRecordes = (j.contaRecordes ?? 0) + 1;
			}
			rec.bpm = bpm;
		}
		if (rec.desvio == null || res.tempo.desvio < rec.desvio) rec.desvio = res.tempo.desvio;
		if (E.dominado(d) && p.aprovacoesMeta.length === 2 && p.aprovacoesMeta.at(-1) === E.hoje() && !p.xpDominio) {
			p.xpDominio = true;
			ganhar(150, `Drill dominado: ${d.titulo}`, eventos);
			eventos.push({tipo: 'dominado', drill: d});
		}
	} else {
		j.combo = 0;
		ganhar(8, 'Take gravado', eventos); // esforço conta, pouco
	}
	const semis = d.linha ? /:16|16\b/.test(d.linha) : d.gerar?.figura === '16';
	checarConquistas(res, {bpm, semis}, eventos);
	planoCompleto(eventos);
	j.eventos = [...eventos, ...j.eventos].slice(0, 80);
	E.salvar();
	return eventos;
}

// Bônus quando o plano do dia passa de 80%. Uma vez por dia.
export function planoCompleto(eventos = []) {
	const j = estadoJogo();
	const k = E.hoje();
	if (j.diasPlano[k]) return eventos;
	if (E.feitoNoPlano(E.planoDoDia()).pct >= 0.8) {
		j.diasPlano[k] = true;
		ganhar(100, 'Treino do dia completo', eventos);
		eventos.push({tipo: 'dia', texto: 'Treino do dia completo'});
		// escudo: 1 a cada 7 dias de sequência, no máximo 2 guardados
		if (E.sequencia() % 7 === 0 && j.escudos < 2) {
			j.escudos++;
			eventos.push({tipo: 'escudo', texto: 'Escudo ganho: protege 1 dia perdido da sequência'});
		}
		checarConquistas(null, null, eventos);
	}
	E.salvar();
	return eventos;
}

// Usa escudo em dia perdido (chamado ao abrir o app): ontem na agenda, sem plano feito.
export function protegerSequencia() {
	const j = estadoJogo();
	const ontem = new Date();
	ontem.setDate(ontem.getDate() - 1);
	const k = E.hoje(ontem);
	const naAgenda = E.estado.config.dias.includes(ontem.getDay());
	const feito = E.estado.planos[k] && E.feitoNoPlano(E.estado.planos[k]).pct >= 0.8;
	if (naAgenda && !feito && j.escudos > 0 && !j.escudosUsados.includes(k)) {
		const anteontem = new Date(ontem);
		anteontem.setDate(anteontem.getDate() - 1);
		const p2 = E.estado.planos[E.hoje(anteontem)];
		if (p2 && E.feitoNoPlano(p2).pct >= 0.8) {
			j.escudos--;
			j.escudosUsados.push(k);
			E.estado.planos[k] = {itens: [{tipo: 'escudo', id: 'escudo', papel: 'Escudo', minutos: 0}], feitos: {escudo: true}};
			E.salvar();
			return true;
		}
	}
	return false;
}

// acerto ponderado pelo nível nos jogos de ouvido harmônico (0 a 100)
function ouvidoHarm() {
	const hs = Object.values(E.estado.harmonia ?? {});
	if (!hs.length) return 0;
	// rating 900 = 0, 2000 = 100, média dos jogos jogados
	const jogados = hs.filter((h) => h.jogadas);
	return jogados.length ? Math.max(0, Math.min(100, jogados.reduce((s, h) => s + (h.rating - 900) / 11, 0) / jogados.length)) : 0;
}

// ---------- radar de habilidades (0 a 100) ----------
export function radar() {
	const h = todasHist();
	const recentes = Object.entries(E.estado.drills).flatMap(([id, p]) => (p.ultimo ? [{id, ...p.ultimo}] : []));
	const prog = (ids) => {
		const ds = E.todosDrills().filter((d) => ids.some((x) => d.id.startsWith(x)));
		return ds.length ? (100 * ds.reduce((s, d) => s + E.fracao(d), 0)) / ds.length : 0;
	};
	const j = estadoJogo();
	const media = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
	const desvios = Object.values(j.recordes).map((r) => r.desvio).filter((v) => v != null);
	const tempo = desvios.length ? Math.max(0, Math.min(100, 100 - (media(desvios) - 4) * 6)) : 0;
	return [
		{nome: 'Tempo', v: Math.round(0.5 * tempo + 0.5 * prog(['a1']))},
		{nome: 'Mão direita', v: Math.round(prog(['a2', 'a4']))},
		{nome: 'Mão esquerda', v: Math.round(prog(['a3']))},
		{nome: 'Slap', v: Math.round(prog(['a5', 'a6']))},
		{nome: 'Harmonia', v: Math.round(0.6 * prog(['b1', 'b2', 'b3']) + 0.4 * ouvidoHarm())},
		{nome: 'Linguagem', v: Math.round(0.7 * prog(['b4', 'b5', 'b6']) + 0.3 * (100 * Object.values(E.estado.repertorio ?? {}).filter((m) => m.feito).length) / 30)},
	].map((x) => ({...x, takes: h.length, recentes: recentes.length}));
}

// ---------- prova final do módulo ----------
// Libera quando todos os drills do módulo estão dominados. São 3 drills sorteados, no BPM meta
// +5%, aprovados em sequência. Errou um, recomeça. Passou: módulo concluído com prova.
export function provaLiberada(m) {
	return m.drills.every(E.dominado);
}
export function prova(m) {
	const j = estadoJogo();
	let p = j.provas[m.id];
	if (!p || (!p.passou && p.dia !== E.hoje())) {
		const ds = [...m.drills].filter((d) => !d.gerar?.diario).sort(() => Math.random() - 0.5).slice(0, 3);
		p = j.provas[m.id] = {...(p ?? {}), dia: E.hoje(), drills: ds.map((d) => d.id), etapa: 0, tentativas: p?.dia === E.hoje() ? p.tentativas : 0};
		E.salvar();
	}
	return p;
}
export const bpmProva = (d) => (d.bpm.passo < 0 ? Math.round(d.bpm.meta * 0.95) : Math.round(d.bpm.meta * 1.05));
export function resultadoProva(m, aprovado) {
	const p = prova(m);
	const eventos = [];
	if (aprovado) {
		p.etapa++;
		if (p.etapa >= p.drills.length) {
			p.passou = E.hoje();
			ganhar(500, `Prova final: ${m.titulo}`, eventos);
			eventos.push({tipo: 'prova', modulo: m});
			checarConquistas(null, null, eventos);
		}
	} else {
		p.etapa = 0;
		p.tentativas++;
	}
	j0().eventos = [...eventos, ...j0().eventos].slice(0, 80);
	E.salvar();
	return eventos;
}
const j0 = estadoJogo;

// Módulos concluídos agora exigem a prova.
export const moduloConcluido = (m) => !!estadoJogo().provas[m.id]?.passou;

// Tarefa marcada à mão (desafio): pouco XP, o mérito está no take.
export function bonus(xp, motivo) {
	const eventos = [];
	ganhar(xp, motivo, eventos);
	planoCompleto(eventos);
	estadoJogo().eventos = [...eventos, ...estadoJogo().eventos].slice(0, 80);
	E.salvar();
	return eventos;
}

// Fim de uma rodada do jogo do braço: 2 XP por nota, recorde de notas por minuto.
export function aposBraco(pontos) {
	const j = estadoJogo();
	const eventos = [];
	if (pontos > (j.recordes.braco ?? 0)) {
		if (j.recordes.braco) eventos.push({tipo: 'recorde', texto: `Recorde do braço: ${pontos} notas/min`});
		j.recordes.braco = pontos;
	}
	if (pontos) ganhar(pontos * 2, 'Jogo do braço', eventos);
	checarConquistas(null, null, eventos);
	E.salvar();
	return eventos;
}
export const xpHoje = () => estadoJogo().xpDia?.[E.hoje()] ?? 0;

// ---------- ouvido harmônico ----------
// Cada resposta mexe no rating (Elo) do jogo e na memória de erros por rótulo (grau, cadência,
// inversão). Devolve a variação do rating para a tela mostrar.
export function respostaHarmonia(jogo, p, acertou) {
	const h = E.progressoHarmonia(jogo);
	const antes = h.rating;
	h.rating = Math.max(600, E.novoRatingHarmonia(h.rating, p.dificuldade, acertou, h.jogadas));
	h.jogadas++;
	h.acertos += acertou ? 1 : 0;
	h.total++;
	h.melhorRating = Math.max(h.melhorRating ?? 0, h.rating);
	const g = E.harmoniaGeral();
	for (const r of p.rotulos) {
		const e = (g.erros[r] ??= {e: 0, a: 0});
		if (acertou) e.a++;
		else e.e++;
	}
	E.salvar();
	return h.rating - antes;
}
// rótulos que mais erra (com pelo menos 3 tentativas), do pior para o melhor
export function errosHarmonia() {
	return Object.entries(E.harmoniaGeral().erros)
		.filter(([, v]) => v.e + v.a >= 3 && v.e > 0)
		.map(([rotulo, v]) => ({rotulo, taxa: v.e / (v.e + v.a), e: v.e, a: v.a}))
		.sort((x, y) => y.taxa - x.taxa || y.e - x.e);
}
// Fim de rodada (jogo ou modo): XP, recordes, sequência do desafio, plano do dia, conquistas.
export function fimHarmonia(id, {acertos, total, jogo}) {
	const eventos = [];
	const g = E.harmoniaGeral();
	const pct = total ? acertos / total : 0;
	if (id === 'rush') {
		if (acertos > (g.rushRecorde ?? 0)) {
			if (g.rushRecorde) eventos.push({tipo: 'recorde', texto: `Recorde no Rush: ${acertos} (antes ${g.rushRecorde})`});
			g.rushRecorde = acertos;
		}
		ganhar(acertos * 6, 'Rush', eventos);
	} else if (id === 'survive') {
		if (acertos > (g.surviveRecorde ?? 0)) {
			if (g.surviveRecorde) eventos.push({tipo: 'recorde', texto: `Recorde no Survive: ${acertos} (antes ${g.surviveRecorde})`});
			g.surviveRecorde = acertos;
		}
		ganhar(acertos * 6, 'Survive', eventos);
	} else {
		if (pct === 1 && total >= 5) g.perfeitas = (g.perfeitas ?? 0) + 1;
		ganhar(acertos * 5 + (pct === 1 ? 30 : 0), pct === 1 ? 'Rodada perfeita' : 'Ouvido harmônico', eventos);
		if (id === 'desafio') {
			const hoje = E.hoje();
			if (g.desafios[hoje] == null) {
				g.desafios[hoje] = Math.round(pct * 100);
				ganhar(40, 'Desafio do dia', eventos);
				eventos.push({tipo: 'desafio', seq: sequenciaDesafio()});
			}
		}
		if (jogo) {
			const h = E.progressoHarmonia(jogo);
			h.rodadas++;
			h.melhor = Math.max(h.melhor ?? 0, Math.round(pct * 100));
		}
	}
	E.marcarFeito('harmonia');
	checarConquistas(null, null, eventos);
	planoCompleto(eventos);
	estadoJogo().eventos = [...eventos, ...estadoJogo().eventos].slice(0, 80);
	E.salvar();
	return eventos;
}
export function sequenciaDesafio() {
	const ds = E.harmoniaGeral().desafios;
	let n = 0;
	const d = new Date();
	if (ds[E.hoje(d)] == null) d.setDate(d.getDate() - 1); // 0% também conta como feito
	while (ds[E.hoje(d)] != null) {
		n++;
		d.setDate(d.getDate() - 1);
	}
	return n;
}

// Repertório: tarefa marcada vale pouco; música tirada vale pelo nível.
export function aposMusica(m, tirou) {
	const eventos = [];
	ganhar(tirou ? 60 * m.nivel : 5, tirou ? `Música tirada: ${m.titulo}` : 'Tarefa de transcrição', eventos);
	E.marcarFeito(`musica:${m.id}`);
	if (tirou) {
		checarConquistas(null, null, eventos);
		const prox = E.musicaDaVez();
		if (prox) eventos.push({tipo: 'proxMusica', musica: prox, nivelNovo: prox.nivel > m.nivel});
	}
	planoCompleto(eventos);
	estadoJogo().eventos = [...eventos, ...estadoJogo().eventos].slice(0, 80);
	E.salvar();
	return eventos;
}
