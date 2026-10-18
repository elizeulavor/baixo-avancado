// Estado do aluno (localStorage), progresso por drill, plano do dia e gravações (IndexedDB).
import {eventosDoDrill, temposPorCompasso} from './musica.js';

const CHAVE = 'baixo-avancado.v1';
export const hoje = (d = new Date()) => {
	const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
	return z.toISOString().slice(0, 10);
};

function padrao() {
	return {
		config: {afinacao: 'EADG', minutos: 45, lembrete: '19:30', latencia: null, latenciaData: null, volumeClick: 0.8, dias: [1, 2, 3, 4, 5, 6], professor: 'ambos', vozProfessor: '', velVoz: 1.05,
			saida: 'alto', latencias: {}, entrada: '', ultimoBackup: null},
		drills: {}, // id -> {bpm, aprovacoesMeta: [datas], tentativas, ultimo: {...}, historico: [{data, bpm, nota, aprovado}]}
		planos: {}, // data -> {itens: [...], feitos: {}}
		sessoes: {}, // data -> minutos
		criado: hoje(),
		versao: VERSAO,
	};
}

// Versão do formato dos dados. Mudou o formato: suba a versão e escreva a migração em migrar();
// quem já usa o app abre e continua de onde estava.
export const VERSAO = 2;
function migrar(s) {
	const v = s.versao ?? 1;
	if (v < 2) {
		// v2: perfis de saída de áudio, com latência própria para cada um
		s.config ??= {};
		s.config.saida ??= s.config.fone ? 'fone' : 'alto';
		s.config.latencias ??= {};
		if (s.config.latencia != null && s.config.latencias.alto == null) s.config.latencias.alto = s.config.latencia;
	}
	s.versao = VERSAO;
	return s;
}
export let estado = carregar();
function carregar() {
	try {
		const s = JSON.parse(localStorage.getItem(CHAVE));
		if (s) {
			const m = migrar(s);
			return {...padrao(), ...m, config: {...padrao().config, ...m.config}};
		}
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
	const m = migrar(j.estado);
	estado = {...padrao(), ...m, config: {...padrao().config, ...m.config}};
	salvar();
}

// ---------- saída de áudio ----------
// alto: alto-falante do celular · bluetooth: caixa/amp/fone Bluetooth · fone: fone com fio no
// celular · usb: interface de áudio USB (o baixo entra direto, sem microfone)
export const SAIDAS = {
	alto: {nome: 'Alto-falante do celular', ic: '🔊', curto: 'Alto-falante'},
	bluetooth: {nome: 'Bluetooth (amp, caixa ou fone)', ic: '🛜', curto: 'Bluetooth'},
	fone: {nome: 'Fone com fio no celular', ic: '🎧', curto: 'Fone com fio'},
	usb: {nome: 'Interface USB (baixo direto)', ic: '🔌', curto: 'USB'},
};
export const saida = () => estado.config.saida ?? 'alto';
// latência calibrada da saída atual (s), ou null
export const latencia = () => estado.config.latencias?.[saida()] ?? (saida() === 'alto' ? estado.config.latencia : null);
export function guardarLatencia(v) {
	(estado.config.latencias ??= {})[saida()] = v;
	if (saida() === 'alto') estado.config.latencia = v;
	estado.config.latenciaData = hoje();
	salvar();
}
// o microfone não ouve o acompanhamento (fone com fio ou interface USB): bateria completa no groove
export const semVazamento = () => ['fone', 'usb'].includes(saida());

// ---------- programa ----------
export let programa = null;
export let grooves = null;
export let repertorio = null;
export let progressoes = null;
export async function carregarPrograma() {
	const [p, g, r, pr] = await Promise.all(['programa/programa.json', 'programa/grooves.json', 'programa/repertorio.json', 'programa/progressoes.json'].map((u) => fetch(u).then((x) => x.json())));
	programa = p;
	grooves = g.grooves;
	repertorio = r;
	progressoes = pr;
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

// ---------- gravações (IndexedDB, guarda as últimas 12) e pontos de restauração ----------
const DB = 'baixo-gravacoes';
function db() {
	return new Promise((ok, erro) => {
		const r = indexedDB.open(DB, 2);
		r.onupgradeneeded = () => {
			const nomes = r.result.objectStoreNames;
			if (!nomes.contains('takes')) r.result.createObjectStore('takes', {keyPath: 'id'});
			if (!nomes.contains('pontos')) r.result.createObjectStore('pontos', {keyPath: 'data'});
		};
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
		const comuns = todos.filter((k) => /^\d+$/.test(k)).sort(); // marcos ("marco:...") ficam para sempre
		for (const k of comuns.slice(0, Math.max(0, comuns.length - 12))) st.delete(k);
	} catch (e) {
		console.warn('gravação não guardada', e);
	}
}
// Takes marcantes de cada drill, guardados para sempre: o primeiro e o melhor (antes e depois).
// Áudio reduzido a 16 kHz em 16 bits (~0,6 MB por 20 s); com eles vão as notas do Raio-X.
function reduzir(dados, sr) {
	const f = sr / 16000;
	if (f <= 1) return {pcm: Int16Array.from(dados, (v) => Math.max(-1, Math.min(1, v)) * 32767), sr};
	const n = Math.floor(dados.length / f);
	const pcm = new Int16Array(n);
	for (let i = 0; i < n; i++) {
		const a = Math.floor(i * f), b = Math.max(a + 1, Math.floor((i + 1) * f));
		let s = 0;
		for (let k = a; k < b; k++) s += dados[k];
		pcm[i] = Math.max(-1, Math.min(1, s / (b - a))) * 32767;
	}
	return {pcm, sr: sr / f};
}
// quanto o take vale: aprovado pesa mais, depois o caminho até o BPM meta, depois a nota
function valor(d, m) {
	const {inicio, meta} = d.bpm;
	const f = meta === inicio ? 1 : (m.bpm - inicio) / (meta - inicio);
	return (m.aprovado ? 10 : 0) + f * 5 + m.nota / 100;
}
export async function lerMarco(drill, tipo) {
	const m = await lerTake(`marco:${tipo}:${drill}`);
	if (!m) return null;
	return {...m, dados: Float32Array.from(m.pcm, (v) => v / 32767)};
}
export async function marcarTake(d, take, info) {
	try {
		const [primeiro, melhor] = await Promise.all([lerTake(`marco:primeiro:${d.id}`), lerTake(`marco:melhor:${d.id}`)]);
		const novos = [];
		if (!primeiro) novos.push('primeiro');
		if (!melhor || valor(d, info) > valor(d, melhor)) novos.push('melhor');
		if (!novos.length) return [];
		const {pcm, sr} = reduzir(take.dados, take.sr);
		const b = await db();
		const tx = b.transaction('takes', 'readwrite');
		for (const tipo of novos) tx.objectStore('takes').put({id: `marco:${tipo}:${d.id}`, drill: d.id, tipo, pcm, sr, ...info});
		await new Promise((ok) => (tx.oncomplete = tx.onerror = ok));
		return novos;
	} catch (e) {
		console.warn('take marcante não guardado', e);
		return [];
	}
}

// Um ponto de restauração por dia (o estado inteiro, os últimos 14 dias). Protege contra bug ou
// dado corrompido; não protege contra limpar os dados do navegador (para isso, o backup).
export async function pontoDoDia() {
	try {
		const b = await db();
		const tx = b.transaction('pontos', 'readwrite');
		const st = tx.objectStore('pontos');
		st.put({data: hoje(), txt: exportar()});
		const datas = await new Promise((ok) => {
			const r = st.getAllKeys();
			r.onsuccess = () => ok(r.result);
		});
		datas.sort();
		for (const d of datas.slice(0, Math.max(0, datas.length - 14))) st.delete(d);
	} catch (e) {
		console.warn('ponto de restauração não guardado', e);
	}
}
export async function pontos() {
	try {
		const b = await db();
		return await new Promise((ok) => {
			const r = b.transaction('pontos').objectStore('pontos').getAll();
			r.onsuccess = () => ok(r.result.sort((x, y) => y.data.localeCompare(x.data)));
			r.onerror = () => ok([]);
		});
	} catch {
		return [];
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
