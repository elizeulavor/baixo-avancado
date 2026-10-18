// Estado do aluno (localStorage), progresso por drill, plano do dia e gravações (IndexedDB).
import {eventosDoDrill, temposPorCompasso} from './musica.js';

const CHAVE = 'baixo-avancado.v1';
export const hoje = (d = new Date()) => {
	const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
	return z.toISOString().slice(0, 10);
};

function padrao() {
	return {
		config: {afinacao: 'EADG', minutos: 45, lembrete: '19:30', latencia: null, latenciaData: null, volumeClick: 0.8, dias: [1, 2, 3, 4, 5, 6], fone: false, professor: 'ambos', vozProfessor: '', velVoz: 1.05},
		drills: {}, // id -> {bpm, aprovacoesMeta: [datas], tentativas, ultimo: {...}, historico: [{data, bpm, nota, aprovado}]}
		planos: {}, // data -> {itens: [...], feitos: {}}
		sessoes: {}, // data -> minutos
		criado: hoje(),
	};
}

export let estado = carregar();
function carregar() {
	try {
		const s = JSON.parse(localStorage.getItem(CHAVE));
		if (s) return {...padrao(), ...s, config: {...padrao().config, ...s.config}};
	} catch {}
	return padrao();
}
export function salvar() {
	try {
		localStorage.setItem(CHAVE, JSON.stringify(estado));
	} catch (e) {
		console.warn('não salvou', e);
	}
}
export function exportar() {
	return JSON.stringify({app: 'baixo-avancado', exportado: new Date().toISOString(), estado}, null, 1);
}
export function importar(txt) {
	const j = JSON.parse(txt);
	if (j.app !== 'baixo-avancado' || !j.estado) throw new Error('arquivo não é um backup deste app');
	estado = {...padrao(), ...j.estado};
	salvar();
}

// ---------- programa ----------
export let programa = null;
export let grooves = null;
export let repertorio = null;
export async function carregarPrograma() {
	const [p, g, r] = await Promise.all(['programa/programa.json', 'programa/grooves.json', 'programa/repertorio.json'].map((u) => fetch(u).then((x) => x.json())));
	programa = p;
	grooves = g.grooves;
	repertorio = r;
	return p;
}

// ---------- repertório (tirar de ouvido) ----------
// O app escolhe: as músicas abrem em sequência dentro do nível, e o nível seguinte abre quando 3
// músicas do atual estão tiradas. A "música da vez" é a primeira não tirada do nível mais alto aberto.
export const progressoMusica = (id) => (estado.repertorio ??= {})[id] ??= {tarefas: {}, tom: '', bpm: null, linha: ''};
export const musicaTirada = (id) => !!estado.repertorio?.[id]?.feito;
export function nivelAberto(n) {
	if (n === 1) return true;
	const ant = repertorio.musicas.filter((m) => m.nivel === n - 1);
	return nivelAberto(n - 1) && ant.filter((m) => musicaTirada(m.id)).length >= 3;
}
export function musicaAberta(m) {
	if (!nivelAberto(m.nivel)) return false;
	const doNivel = repertorio.musicas.filter((x) => x.nivel === m.nivel);
	const i = doNivel.indexOf(m);
	return i === 0 || musicaTirada(doNivel[i - 1].id);
}
export function musicaDaVez() {
	if (!repertorio) return null;
	const abertos = repertorio.niveis.map((n) => n.n).filter(nivelAberto);
	for (const n of abertos.reverse()) {
		const m = repertorio.musicas.find((x) => x.nivel === n && !musicaTirada(x.id) && musicaAberta(x));
		if (m) return m;
	}
	return repertorio.musicas.find((x) => !musicaTirada(x.id) && musicaAberta(x)) ?? null;
}

// ---------- ouvido harmônico ----------
// rating (Elo) por jogo; quem vinha do sistema de níveis entra no rating equivalente
export function progressoHarmonia(jogo) {
	const h = ((estado.harmonia ??= {})[jogo] ??= {rating: 1000, jogadas: 0, rodadas: 0, acertos: 0, total: 0, melhor: 0});
	if (h.rating == null) h.rating = 1000 + ((h.nivel ?? 1) - 1) * 250;
	h.jogadas ??= h.total ?? 0;
	return h;
}
// configurações e memória do ouvido: erros por rótulo, desafios feitos, recordes, timbre
export const harmoniaGeral = () => {
	const g = (estado.harmoniaGeral ??= {});
	g.erros ??= {};
	g.desafios ??= {};
	g.timbre ??= 'auto';
	g.sempreOrientar ??= false;
	g.responderNoBaixo ??= false;
	return g;
};
export function novoRatingHarmonia(r, d, acertou, jogadas) {
	const K = jogadas < 20 ? 48 : 24;
	const esp = 1 / (1 + Math.pow(10, (d - r) / 400));
	return Math.round(r + K * ((acertou ? 1 : 0) - esp));
}
// ---------- groove ----------
// estrelas por nível de cada jogo; 1 estrela abre o nível seguinte
export const grooveGeral = () => {
	const g = (estado.groove ??= {});
	g.jogos ??= {};
	g.dias ??= {}; // data -> {feitos: [jogo...], ok}
	g.recordes ??= {};
	return g;
};
export const progressoGroove = (jogo) => (grooveGeral().jogos[jogo] ??= {estrelas: {}, jogadas: 0, hist: []});
export const estrelasGroove = (jogo, n) => progressoGroove(jogo).estrelas[n] ?? 0;
export const nivelAbertoGroove = (jogo, n) => n === 1 || estrelasGroove(jogo, n - 1) >= 1;
// a fronteira é o nível aberto mais alto (o próximo desafio)
export function nivelFronteira(jogo, total) {
	let n = 1;
	while (n < total && nivelAbertoGroove(jogo, n + 1)) n++;
	return n;
}
export const totalEstrelasGroove = () => Object.values(grooveGeral().jogos).reduce((s, j) => s + Object.values(j.estrelas).reduce((a, b) => a + b, 0), 0);

export const todosDrills = () => programa.modulos.flatMap((m) => m.drills.map((d) => ({...d, modulo: m})));
export const drillPorId = (id) => todosDrills().find((d) => d.id === id);
export const groovePorId = (id) => grooves.find((g) => g.id === id);

export function progresso(d) {
	const p = (estado.drills[d.id] ??= {bpm: d.bpm.inicio, aprovacoesMeta: [], tentativas: 0, historico: []});
	return p;
}
export function dominado(d) {
	return (estado.drills[d.id]?.aprovacoesMeta?.length ?? 0) >= 2;
}
export function fracao(d) {
	if (dominado(d)) return 1;
	const p = estado.drills[d.id];
	if (!p) return 0;
	const {inicio, meta} = d.bpm;
	if (inicio === meta) return p.aprovacoesMeta.length / 2;
	return Math.max(0, Math.min(0.95, (p.bpm - inicio) / (meta - inicio)));
}
// concluído = todos os drills dominados E prova final aprovada (jogo.js)
export const moduloConcluido = (m) => m.drills.every(dominado) && !!estado.jogo?.provas?.[m.id]?.passou;
export const provaPendente = (m) => m.drills.every(dominado) && !estado.jogo?.provas?.[m.id]?.passou;
export const progressoModulo = (m) => m.drills.reduce((s, d) => s + fracao(d), 0) / m.drills.length;
export function moduloAtivo(trilha) {
	return programa.modulos.find((m) => m.trilha === trilha && !moduloConcluido(m)) ?? null;
}

// Medições compactas de um take, para o treinador do app e para o /revisar no Claude.
const um = (v) => (v == null || Number.isNaN(v) ? null : Math.round(v * 10) / 10);
export function metricas(res) {
	return {
		dv: um(res.tempo?.desvio), // regularidade (ms)
		md: res.itens?.some((i) => i.nome === 'Pressa/atraso') ? um(res.tempo?.media) : null, // + atrasado, só com latência confiável
		dr: um(res.tempo?.deriva),
		pp: (res.tempo?.porPosicao ?? []).map((x) => [x.pos, um(x.media)]),
		dn: um(res.dinamica?.desvio),
		fa: um(res.dinamica?.fantasma),
		ac: um(res.notas?.acerto),
		af: um(res.notas?.afinacao),
		si: um(res.som?.silencio),
		ar: um(res.som?.articulacao),
		rep: (res.itens ?? []).filter((i) => !i.ok && !i.info).map((i) => i.nome),
	};
}

// Registra um take avaliado e ajusta o BPM do drill.
export function registrarTake(d, bpm, res) {
	const p = progresso(d);
	const data = hoje();
	p.tentativas++;
	p.historico.push({data, bpm, nota: res.nota, aprovado: res.aprovado, met: metricas(res)});
	if (p.historico.length > 200) p.historico.splice(0, p.historico.length - 200);
	p.ultimo = {data, bpm, nota: res.nota, aprovado: res.aprovado, dicas: res.dicas.slice(0, 3)};
	let mensagem;
	const {meta, passo} = d.bpm;
	const naMeta = passo === 0 ? true : passo > 0 ? bpm >= meta : bpm <= meta;
	if (res.aprovado) {
		if (naMeta) {
			if (!p.aprovacoesMeta.includes(data)) p.aprovacoesMeta.push(data);
			mensagem = p.aprovacoesMeta.length >= 2 ? 'Dominado. Entra na revisão espaçada.' : 'Aprovado na meta. Repita outro dia para dominar.';
			p.bpm = meta;
		} else if ((passo > 0 && bpm >= p.bpm) || (passo < 0 && bpm <= p.bpm)) {
			p.bpm = passo > 0 ? Math.min(meta, bpm + passo) : Math.max(meta, bpm + passo);
			mensagem = `Aprovado. Próximo take: ${p.bpm} BPM.`;
		} else mensagem = 'Aprovado abaixo do seu BPM atual (não muda o progresso).';
	} else {
		const hojeReprov = p.historico.filter((h) => h.data === data && h.bpm === bpm && !h.aprovado).length;
		mensagem = hojeReprov >= 3 ? `3 reprovações em ${bpm} BPM hoje: faça 2 takes ${Math.abs(passo || 4) * 2} BPM mais devagar e volte.` : 'Reprovado. Leia os números e grave de novo.';
	}
	marcarFeito(`drill:${d.id}`);
	salvar();
	return mensagem;
}

// ---------- plano do dia ----------
// Aquecimento + um drill de cada trilha + revisão espaçada + leitura/ditado + desafio, conforme os minutos.
export function planoDoDia(data = hoje()) {
	if (estado.planos[data]) return estado.planos[data];
	const min = estado.config.minutos;
	const itens = [];
	const todos = todosDrills();
	const ultimoTreino = (d) => estado.drills[d.id]?.historico?.at(-1)?.data ?? '0000';
	const pendentes = (m) => (m ? m.drills.filter((d) => !dominado(d) && !d.aquecimento) : []);
	const escolher = (lista) => [...lista].sort((a, b) => fracao(a) - fracao(b) || ultimoTreino(a).localeCompare(ultimoTreino(b)))[0];

	const aquec = todos.filter((d) => d.aquecimento);
	if (aquec.length) {
		const n = Math.floor(new Date(data).getTime() / 864e5) % aquec.length;
		itens.push({tipo: 'drill', id: aquec[n].id, papel: 'Aquecimento', minutos: 5, semAvaliacao: false});
	}
	const usados = new Set(itens.map((i) => i.id));
	for (const tr of ['A', 'B']) {
		const m = moduloAtivo(tr);
		if (m && provaPendente(m)) {
			itens.push({tipo: 'prova', id: `prova:${m.id}`, modulo: m.id, papel: `Prova final ${tr}`, minutos: 10});
			continue;
		}
		const d = escolher(pendentes(m).filter((x) => !usados.has(x.id)));
		if (d) {
			itens.push({tipo: 'drill', id: d.id, papel: `Principal ${tr}`, minutos: 10});
			usados.add(d.id);
		}
	}
	if (min >= 45) {
		for (const tr of ['A', 'B']) {
			const d = escolher(pendentes(moduloAtivo(tr)).filter((x) => !usados.has(x.id)));
			if (d && itens.filter((i) => i.papel.startsWith('Principal')).length < 3) {
				itens.push({tipo: 'drill', id: d.id, papel: `Principal ${tr}`, minutos: 8});
				usados.add(d.id);
				break;
			}
		}
	}
	// groove do dia: todo dia a partir de 20 min (relógio interno é a base do baixista)
	if (min >= 20) itens.push({tipo: 'groove', id: 'groove', papel: 'Groove do dia', minutos: 6});
	const dominados = todos.filter(dominado).filter((d) => !usados.has(d.id)).sort((a, b) => ultimoTreino(a).localeCompare(ultimoTreino(b)));
	if (dominados.length) {
		itens.push({tipo: 'drill', id: dominados[0].id, papel: 'Revisão (no BPM meta)', minutos: 5, revisao: true});
		usados.add(dominados[0].id);
	}
	const diaN = Math.floor(new Date(data).getTime() / 864e5);
	if (min >= 30) {
		// alterna: um dia leitura/ditado, no outro ouvido harmônico (o jogo gira entre os quatro)
		if (diaN % 2 === 0) {
			const leitura = todos.filter((d) => d.gerar?.tipo === 'leitura' || d.gerar?.tipo === 'ditado');
			const nivel = leitura.find((d) => !dominado(d)) ?? leitura[0];
			if (nivel && !usados.has(nivel.id)) itens.push({tipo: 'drill', id: nivel.id, papel: nivel.gerar.tipo === 'ditado' ? 'Ouvido do dia' : 'Leitura do dia', minutos: 5});
		} else {
			itens.push({tipo: 'harmonia', id: 'harmonia', jogo: 'desafio', papel: 'Desafio harmônico do dia', minutos: 5});
		}
	}
	// tirar de ouvido: todo dia a partir de 60 min; em dias alternados a partir de 45 min
	const mv = musicaDaVez();
	if (mv && (min >= 60 || (min >= 45 && diaN % 2 === 1))) itens.push({tipo: 'musica', id: `musica:${mv.id}`, musica: mv.id, papel: 'Tirar de ouvido', minutos: 10});
	if (min >= 60) {
		const m = moduloAtivo(new Date(data).getDate() % 2 ? 'A' : 'B') ?? programa.modulos[0];
		const des = m.desafios?.[new Date(data).getDate() % (m.desafios?.length || 1)];
		if (des) itens.push({tipo: 'desafio', id: `desafio:${m.id}`, papel: 'Desafio', texto: des, minutos: 10});
	}
	estado.planos[data] = {itens, feitos: {}};
	// guarda só os últimos 60 dias de plano
	const datas = Object.keys(estado.planos).sort();
	for (const d of datas.slice(0, Math.max(0, datas.length - 60))) delete estado.planos[d];
	salvar();
	return estado.planos[data];
}
export function refazerPlano() {
	delete estado.planos[hoje()];
	return planoDoDia();
}
export function marcarFeito(chave, valor = true) {
	const p = planoDoDia();
	const item = p.itens.find((i) => chaveItem(i) === chave);
	if (item) p.feitos[chave] = valor;
	salvar();
}
export const chaveItem = (i) => (i.tipo === 'drill' ? `drill:${i.id}` : i.id);
export function feitoNoPlano(plano) {
	const total = plano.itens.length;
	const feitos = plano.itens.filter((i) => plano.feitos[chaveItem(i)]).length;
	return {total, feitos, pct: total ? feitos / total : 0};
}
export function sequencia() {
	// dias seguidos com pelo menos 80% do plano (dias fora da agenda não quebram a sequência)
	let n = 0;
	const d = new Date();
	for (let i = 0; i < 400; i++) {
		const k = hoje(d);
		const p = estado.planos[k];
		const naAgenda = estado.config.dias.includes(d.getDay());
		if (p && feitoNoPlano(p).pct >= 0.8) n++;
		else if (i > 0 && naAgenda) break;
		d.setDate(d.getDate() - 1);
	}
	return n;
}
export function adicionarMinutos(m) {
	const k = hoje();
	estado.sessoes[k] = (estado.sessoes[k] ?? 0) + m;
	salvar();
}

// Eventos do drill para hoje (exercícios diários usam a data como semente).
export function montar(d) {
	const r = eventosDoDrill(d, estado.config.afinacao, hoje());
	return {...r, tempos: temposPorCompasso(d.compasso)};
}

// ---------- gravações (IndexedDB, guarda as últimas 12) ----------
const DB = 'baixo-gravacoes';
function db() {
	return new Promise((ok, erro) => {
		const r = indexedDB.open(DB, 1);
		r.onupgradeneeded = () => r.result.createObjectStore('takes', {keyPath: 'id'});
		r.onsuccess = () => ok(r.result);
		r.onerror = () => erro(r.error);
	});
}
export async function guardarTake(take) {
	try {
		const b = await db();
		const tx = b.transaction('takes', 'readwrite');
		const st = tx.objectStore('takes');
		st.put(take);
		const todos = await new Promise((ok) => {
			const r = st.getAllKeys();
			r.onsuccess = () => ok(r.result);
		});
		todos.sort();
		for (const k of todos.slice(0, Math.max(0, todos.length - 12))) st.delete(k);
	} catch (e) {
		console.warn('gravação não guardada', e);
	}
}
export async function lerTake(id) {
	try {
		const b = await db();
		return await new Promise((ok) => {
			const r = b.transaction('takes').objectStore('takes').get(id);
			r.onsuccess = () => ok(r.result);
			r.onerror = () => ok(null);
		});
	} catch {
		return null;
	}
}

// Lembrete diário como evento de calendário (.ics). O celular toca o alarme mesmo com o app fechado.
export function arquivoLembrete() {
	const [h, m] = estado.config.lembrete.split(':');
	const dias = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
	const byday = estado.config.dias.map((d) => dias[d]).join(',');
	const inicio = hoje().replaceAll('-', '');
	const tf = Math.min(23 * 60 + 59, Number(h) * 60 + Number(m) + estado.config.minutos);
	const fim = `${String(Math.floor(tf / 60)).padStart(2, '0')}${String(tf % 60).padStart(2, '0')}`;
	const url = location.href.split('#')[0];
	return [
		'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Baixo Avancado//PT', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
		`UID:baixo-avancado-${inicio}@local`, `DTSTAMP:${inicio}T000000Z`,
		`DTSTART:${inicio}T${h}${m}00`, `DTEND:${inicio}T${fim}00`,
		`RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
		'SUMMARY:Baixo: treino do dia',
		`DESCRIPTION:${estado.config.minutos} min. Abra o app: ${url}`,
		`URL:${url}`,
		'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Hora do baixo', 'TRIGGER:PT0M', 'END:VALARM',
		'END:VEVENT', 'END:VCALENDAR',
	].join('\r\n');
}
