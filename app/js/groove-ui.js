// Telas do Groove: início (faixa, groove do dia, jogos), mapa de níveis de cada jogo, o jogo de
// microfone com leitura ao vivo compasso a compasso, e os três jogos de toque.
import * as E from './estado.js';
import * as A from './audio.js';
import * as J from './jogo.js';
import * as Rt from './ritmo.js';
import * as P from './professor.js';
import {refinarLatencia} from './analise.js';

let H = null; // ajudantes da tela principal (main.js)
export const instalar = (h) => (H = h);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const f0 = (v) => (v == null ? '–' : Math.round(v).toString());
const f1 = (v) => (v == null ? '–' : (Math.round(v * 10) / 10).toString().replace('.', ','));
const mais = (v) => (v == null ? '–' : `${v > 0 ? '+' : ''}${f0(v)}`);
const estrelasHtml = (n, max = 3) => `<span class="estrelas">${Array.from({length: max}, (_, k) => `<i class="${k < n ? 'tem' : ''}">★</i>`).join('')}</span>`;
const total = (jogo) => Rt.JOGOS[jogo].niveis.length;
const faixa = () => Rt.faixa(E.totalEstrelasGroove());
const ALTURA = 33; // A solta: a nota do Eco e do ditado

const GRUPOS = [
	['Pulso', 'Segurar o tempo sem muleta', ['relogio', 'contratempo', 'andamento']],
	['Bolso', 'Onde, dentro do tempo, você toca', ['bolso', 'bumbo']],
	['Subdivisão', 'A régua por dentro do tempo', ['escada', 'swing']],
	['Ouvido rítmico', 'Ouvir, achar o 1, devolver', ['eco', 'ondeum', 'ditado']],
];
const CRITERIO = {
	relogio: '★ o clique volta e te acha a ≤45 ms · ★★ ≤28 · ★★★ ≤16 (e regularidade ±25/20/16)',
	contratempo: '★ regularidade ±22 ms · ★★ ±17 · ★★★ ±13 (com latência: média ≤25/16/10)',
	bolso: '★ 50% dos compassos no alvo · ★★ 75% · ★★★ 90% (regularidade ±18/15/12). Precisa de latência.',
	escada: '★ 60% dos compassos limpos · ★★ 80% · ★★★ 95%',
	eco: '★ 5 de 8 frases · ★★ 7, com 3 perfeitas · ★★★ 8, com 6 perfeitas (±35 ms)',
	bumbo: '★ 85% no padrão · ★★ 92% · ★★★ 97% (regularidade ±20/16/12)',
	swing: '★ razão a ±7 pontos do alvo · ★★ ±4,5 · ★★★ ±3',
	ondeum: '★ 4 de 6 · ★★ 5 · ★★★ 6 grooves com o 1 no lugar',
	ditado: '★ 6 de 8 · ★★ 7 · ★★★ 8',
	andamento: '★ 4 de 6 · ★★ 5 · ★★★ 6 dentro da margem',
};
const DICA = {
	relogio: 'Toque a nota em cada pulso (ou colcheia/semicolcheia, conforme o nível) sem parar, com ou sem clique.',
	contratempo: 'Toque semínimas no tempo de verdade. O clique está deslocado de propósito; a contagem inicial mostra onde é o 1.',
	bolso: 'Toque colcheias. A faixa dourada mostra onde mirar: em cima, atrás ou na frente do clique.',
	escada: 'Toque o número de notas por tempo que aparece. A próxima subdivisão aparece antes da troca.',
	eco: 'Compasso roxo: ouça. Compasso dourado: devolva a frase igual. Uma nota só basta.',
	bumbo: 'Toque o padrão do bumbo (a grade mostra). Pode tocar a raiz dos acordes ou só a corda A.',
	swing: 'Toque colcheias. O medidor mostra a razão do swing compasso a compasso.',
};

// ---------- início ----------
export function telaGroove(arg, q) {
	if (arg === 'dia') return telaDia(q);
	if (Rt.JOGOS[arg]) return telaMapa(arg);
	const tot = E.totalEstrelasGroove();
	const fx = faixa();
	const dia = Rt.grooveDoDia(E.hoje(), (j) => E.nivelFronteira(j, total(j)));
	const feitos = E.grooveGeral().dias[E.hoje()]?.feitos ?? [];
	const seq = J.sequenciaGroove();
	const G = E.grooveGeral();
	H.tela.innerHTML = `<div class="topo"><div><div class="saudacao">${tot} de ${Rt.totalNiveis() * 3} estrelas</div><h1>Groove</h1></div>
		<div class="status"><div class="pilula fogo ${seq ? '' : 'apagado'}"><span class="ic">🥁</span><b class="num">${seq}</b></div></div></div>
	<div class="heroi heroi-groove entra">
		<div class="linha-heroi">
			<div class="anel-dia">${H.anel(fx.frac, {tam: 92, esp: 8})}<b>${fx.n}</b><small>faixa</small></div>
			<div><p class="peq">FAIXA DO GROOVE</p><h3>${H.esc(fx.nome)}</h3><p class="sub">${fx.prox ? `${fx.prox[0] - tot} estrelas para ${H.esc(fx.prox[1])}` : 'A última faixa.'}</p></div>
		</div>
		<div class="dia-groove">${dia.map((d) => `<div class="${feitos.includes(d.jogo) ? 'feito' : ''}"><span>${Rt.JOGOS[d.jogo].icone}</span><b>${Rt.JOGOS[d.jogo].nome}</b><small>nível ${d.nivel}</small></div>`).join('')}</div>
		<a class="botao principal grande" href="#groove/dia">${G.dias[E.hoje()]?.ok ? '✓ Groove do dia feito' : feitos.length ? 'Continuar o groove do dia' : 'Groove do dia · 6 min · +40 XP'}</a>
	</div>
	<label class="chave cartao entra"><input type="checkbox" id="fone" ${E.estado.config.fone ? 'checked' : ''}><span><b>🎧 Fone com fio</b><small>Com fone, bateria e teclado completos. Sem fone, só chimbal filtrado (o microfone não confunde com o baixo).</small></span></label>
	${GRUPOS.map(([nome, sub, jogos]) => `<h2>${nome}</h2><p class="peq" style="margin-top:-6px">${sub}</p><div class="ladrilhos">${jogos.map(ladrilho).join('')}${nome === 'Ouvido rítmico' ? `<a class="ladrilho destaque entra" href="#gjogo/eco?inf"><span class="ic">∞</span><div><b>Eco infinito</b><small>3 vidas · recorde ${G.recordes.infinito ?? 0}</small></div></a>` : ''}</div>`).join('')}
	<p class="peq" style="margin-top:22px">Toque <b>uma nota só</b> (A solta, ou abafada) nos jogos de microfone: o tempo é o que conta. Celular perto do amplificador.</p>`;
	$('#fone').onchange = (e) => {
		E.estado.config.fone = e.target.checked;
		E.salvar();
	};
	H.animar();
}
function ladrilho(jogo) {
	const J0 = Rt.JOGOS[jogo];
	const n = E.nivelFronteira(jogo, total(jogo));
	const p = E.progressoGroove(jogo);
	const tres = Object.values(p.estrelas).filter((v) => v >= 3).length;
	return `<a class="ladrilho entra" href="#groove/${jogo}"><span class="ic">${J0.icone}</span><div><b>${J0.nome}${J0.toque ? ' <span class="tag-toque">toque</span>' : ''}</b><small>nível ${n}/${total(jogo)} ${estrelasHtml(E.estrelasGroove(jogo, n))}</small><div class="barrinha"><div style="width:${(100 * tres) / total(jogo)}%"></div></div></div></a>`;
}

// ---------- mapa de níveis ----------
function telaMapa(jogo) {
	const J0 = Rt.JOGOS[jogo];
	const p = E.progressoGroove(jogo);
	const ult = p.hist.at(-1);
	H.tela.innerHTML = `<a class="voltar" href="#groove">‹ Groove</a>
	<span class="etiqueta G">${J0.mic ? '🎙 microfone' : '👆 toque na tela'}</span><h1>${J0.icone} ${J0.nome}</h1><p class="objetivo">${J0.desc}</p>
	<div class="info">${CRITERIO[jogo]}</div>
	${ult ? `<p class="peq">Última rodada: nível ${ult.nivel}, ${ult.estrelas}★ em ${ult.data}. ${p.jogadas} rodadas no total.</p>` : ''}
	<div class="niveis-groove">${J0.niveis.map((nv, k) => {
		const n = k + 1;
		const aberto = E.nivelAbertoGroove(jogo, n);
		const est = E.estrelasGroove(jogo, n);
		return aberto
			? `<a class="nivel-no entra ${est >= 3 ? 'cheio' : est ? 'feito' : 'atual'}" href="#gjogo/${jogo}?n=${n}"><b class="num">${n}</b><span>${H.esc(nv.rotulo)}</span>${estrelasHtml(est)}</a>`
			: `<div class="nivel-no bloq"><b class="num">${n}</b><span>${H.esc(nv.rotulo)}</span><i>🔒</i></div>`;
	}).join('')}</div>`;
	H.animar();
}

// ---------- groove do dia ----------
function telaDia(q) {
	const sessao = q?.has('s');
	const dia = Rt.grooveDoDia(E.hoje(), (j) => E.nivelFronteira(j, total(j)));
	const d = E.grooveGeral().dias[E.hoje()] ?? {feitos: []};
	const prox = dia.find((x) => !d.feitos.includes(x.jogo));
	H.tela.innerHTML = `${sessao ? '<div class="barra-sessao"><span>Treino</span><a href="#hoje">Sair</a></div>' : '<a class="voltar" href="#groove">‹ Groove</a>'}
	<span class="etiqueta G">Groove do dia · sequência ${J.sequenciaGroove()}</span><h1>Groove do dia</h1>
	<p class="objetivo">Três jogos curtos no seu nível de fronteira: um de pulso ou bolso, o Eco e um de ouvido rítmico.</p>
	<div class="missoes">${dia.map((x, k) => `<a class="missao entra ${d.feitos.includes(x.jogo) ? 'feito' : x === prox ? 'proxima' : ''}" href="#gjogo/${x.jogo}?n=${x.nivel}&dia${sessao ? '&s' : ''}"><div class="icone">${Rt.JOGOS[x.jogo].icone}</div><div><div class="papel">${k + 1} de 3 · ${Rt.JOGOS[x.jogo].mic ? 'microfone' : 'toque'}</div><h3>${Rt.JOGOS[x.jogo].nome}</h3><div class="meta-linha">nível ${x.nivel} · ${H.esc(Rt.JOGOS[x.jogo].niveis[x.nivel - 1].rotulo)}</div></div><div class="lado">${estrelasHtml(E.estrelasGroove(x.jogo, x.nivel))}</div></a>`).join('')}</div>
	${prox ? `<a class="botao principal grande" href="#gjogo/${prox.jogo}?n=${prox.nivel}&dia${sessao ? '&s' : ''}">${d.feitos.length ? 'Próximo' : 'Começar'}: ${Rt.JOGOS[prox.jogo].nome}</a>` : `<div class="cartao-prova passou"><h3>Feito hoje. +40 XP</h3><p class="sub">Amanhã, outro trio.</p></div>${sessao ? '<button class="principal grande" id="seguir">Próxima etapa ›</button>' : ''}`}`;
	$$('#seguir').forEach((b) => (b.onclick = H.seguirTreino));
}

// ---------- jogo ----------
export function telaJogoGroove(jogo, q) {
	if (!Rt.JOGOS[jogo]) return (location.hash = '#groove');
	const infinito = jogo === 'eco' && q.has('inf');
	const n = infinito ? 1 : Math.max(1, Math.min(total(jogo), Number(q.get('n')) || E.nivelFronteira(jogo, total(jogo))));
	if (!infinito && !E.nivelAbertoGroove(jogo, n)) return (location.hash = `#groove/${jogo}`);
	const ctx = {jogo, n, infinito, sessao: q.has('s'), dia: q.has('dia')};
	const J0 = Rt.JOGOS[jogo];
	const nv = J0.niveis[n - 1];
	const voltar = ctx.dia ? `#groove/dia${ctx.sessao ? '?s' : ''}` : `#groove/${jogo}`;
	H.tela.innerHTML = `${ctx.sessao ? `<div class="barra-sessao"><span>Treino · groove do dia</span><a href="#hoje">Sair</a></div>` : `<a class="voltar" href="${infinito ? '#groove' : voltar}">‹ ${infinito ? 'Groove' : J0.nome}</a>`}
	<span class="etiqueta G">${infinito ? `Eco infinito · recorde ${E.grooveGeral().recordes.infinito ?? 0}` : `Nível ${n} de ${total(jogo)}`} ${infinito ? '' : estrelasHtml(E.estrelasGroove(jogo, n))}</span>
	<h1>${J0.icone} ${J0.nome}${infinito ? ' infinito' : ''}</h1>
	<p class="sub">${H.esc(infinito ? 'A frase fica mais difícil a cada 3 acertos. Três erros e acabou.' : nv.rotulo)}</p>
	<div class="carregando" id="carga" hidden><div></div></div>
	<div id="jogo"></div>`;
	if (J0.mic) jogoMic(ctx);
	else if (jogo === 'ondeum') jogoUm(ctx);
	else if (jogo === 'ditado') jogoDitado(ctx);
	else jogoAndamento(ctx);
}

// ---------- jogos de microfone ----------
function palcoInicial(r) {
	const c = r.compasso(1) ?? {};
	switch (r.jogo) {
		case 'relogio': return `<div class="pulso-grande" id="pulso"><b id="pulso-txt">♩</b><small id="pulso-sub">${r.nv.com} com, ${r.nv.sem} sem clique</small></div>`;
		case 'contratempo': return `<div class="pulso-grande" id="pulso"><b id="pulso-txt">↯</b><small id="pulso-sub">${H.esc(r.nv.rotulo.split('· ')[1] ?? '')}</small></div>`;
		case 'bolso': return medidor('bolso', c.alvoMs ?? 0, c.tol ?? 10);
		case 'swing': return medidor('swing', c.razao ?? 67, 3);
		case 'escada': return `<div class="pulso-grande" id="pulso"><b id="pulso-txt">${c.sub ?? 1}</b><small id="pulso-sub">notas por tempo</small><span class="prox-degrau" id="prox"></span></div>`;
		case 'eco': return `<div class="pulso-grande eco" id="pulso"><b id="pulso-txt">⇄</b><small id="pulso-sub">roxo: ouça · dourado: devolva</small></div><div class="vidas-eco" id="vidas"></div>`;
		case 'bumbo': return `<div class="padrao-bumbo">${[...r.groove.baixo].map((ch, k) => `<i class="${ch === '.' ? '' : ch === 'X' ? 'forte' : 'on'} ${k % (r.groove.passos / r.groove.ciclo) === 0 ? 'tempo' : ''}" data-p="${k}"></i>`).join('')}</div><p class="peq centro">${H.esc(r.groove.nome)} · ${r.groove.bpm} BPM · ${H.esc(r.groove.progressao ?? '')}</p>`;
		default: return '';
	}
}
function medidor(tipo, alvo, tol) {
	const [min, max] = tipo === 'bolso' ? [-45, 45] : [45, 80];
	const pct = (v) => ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100;
	const marcas = tipo === 'bolso' ? [[-30, 'frente'], [0, 'em cima'], [30, 'atrás']] : [[50, 'reto'], [58, 'leve'], [67, 'tercina'], [71, 'duro']];
	return `<div class="medidor-groove" id="medidor" data-min="${min}" data-max="${max}">
		<div class="faixa-alvo" id="faixa-alvo" style="left:${pct(alvo - tol)}%;width:${pct(alvo + tol) - pct(alvo - tol)}%"></div>
		${marcas.map(([v, t]) => `<span class="marca" style="left:${pct(v)}%"><i></i>${t}</span>`).join('')}
		<div class="agulha" id="agulha" style="left:${pct(alvo)}%"></div>
		<b class="leitura-medidor" id="leitura-medidor">${tipo === 'bolso' ? Rt.nomeBolso(alvo) : `${alvo}%`}</b>
	</div>`;
}
function moverMedidor(v, alvo, tol) {
	const m = $('#medidor');
	if (!m) return;
	const min = Number(m.dataset.min), max = Number(m.dataset.max);
	const pct = (x) => ((Math.max(min, Math.min(max, x)) - min) / (max - min)) * 100;
	if (alvo != null) {
		$('#faixa-alvo').style.left = `${pct(alvo - tol)}%`;
		$('#faixa-alvo').style.width = `${pct(alvo + tol) - pct(alvo - tol)}%`;
	}
	if (v != null) $('#agulha').style.left = `${pct(v)}%`;
}

function jogoMic(ctx) {
	const fone = !!E.estado.config.fone;
	const r = ctx.infinito ? Rt.roteiroInfinito({}) : Rt.roteiro(ctx.jogo, ctx.n, {grooves: E.grooves, fone});
	const el = $('#jogo');
	el.innerHTML = `<div class="palco-groove" id="palco">${palcoInicial(r)}</div>
	<div class="grade-viva" id="grade"><div class="cursor-vivo" id="cursor"></div></div>
	<div class="linha-combo"><span class="combo" id="combo"></span><span class="peq" id="leitura"></span></div>
	<div class="tira-compassos" id="tira"></div>
	<div class="botoes"><button class="principal grande" id="ir">▶ Começar</button></div>
	<div class="nivel-mic"><div id="nivel"></div></div>
	<p class="status-take" id="status">${DICA[ctx.jogo] ?? ''}</p>
	<details class="cartao"><summary class="peq">Como ganha estrela</summary><p class="peq">${CRITERIO[ctx.jogo]}</p></details>
	<div id="resultado"></div>`;
	desenharGrade(r, r.compasso(1));
	const carga = $('#carga');
	carga.hidden = false;
	const pronto = A.preparar(A.GRUPOS.jogosGroove, (f, t) => carga.firstElementChild && (carga.firstElementChild.style.width = `${(100 * f) / t}%`)).then(() => (carga.hidden = true));
	if (ctx.infinito) $('#vidas').innerHTML = '♥♥♥';
	$('#ir').onclick = async () => {
		await pronto;
		rodar(r, ctx);
	};
}
// a grade do compasso: tempos e alvos; depois de analisado, os ataques por cima
function desenharGrade(r, c, res) {
	const g = $('#grade');
	if (!g || !c) return;
	const T = r.tempos;
	const x = (b) => `${(b / T) * 100}%`;
	const sBeat = r.barDur / T;
	const pts = res ? res.pontos.map((p) => {
		if (p.erro == null) return `<i class="falta" style="left:${x(p.b)}"></i>`;
		const ref = res.alvoMs ?? 0;
		const d = Math.abs(p.erro - ref);
		return `<i class="ponto ${d <= 12 ? 'bom' : d <= 28 ? 'medio' : 'ruim'}" style="left:calc(${x(p.b + p.erro / 1000 / sBeat)} - 5px)"></i>`;
	}).join('') + res.extrasB.map((b) => `<i class="extra" style="left:${x(b)}"></i>`).join('') : '';
	g.innerHTML = `<div class="cursor-vivo" id="cursor"></div>
		${Array.from({length: Math.ceil(T)}, (_, k) => `<span class="tempo-g" style="left:${x(k)}">${k + 1}</span>`).join('')}
		${(c.alvos ?? []).map((a) => `<i class="alvo" style="left:${x(a.b)}"></i>`).join('')}${pts}`;
}

async function rodar(r, ctx) {
	H.limpar();
	const st = $('#status');
	const bt = $('#ir');
	let stream;
	try {
		stream = await A.abrirMicrofone();
	} catch (e) {
		st.innerHTML = `<span class="erro">Microfone negado ou indisponível. Permita o microfone para este site.</span>`;
		return;
	}
	P.microfone(true);
	const fone = !!E.estado.config.fone;
	const pararMedidor = H.medidorMic(stream);
	const rec = A.gravar(stream);
	let acabou = false;
	let ag = null, raf = 0;
	const fim = () => {
		if (acabou) return;
		acabou = true;
		ag?.parar();
		cancelAnimationFrame(raf);
		pararMedidor();
		A.fecharMicrofone(stream);
		P.microfone(false);
	};
	H.aoSair(fim);
	await espera(200);
	const ac = A.audio();
	const t0 = ac.currentTime + 0.5;
	const sBeat = r.barDur / r.tempos;
	window.__radixGroove = {t0, r}; // para o teste de ponta a ponta (aluno simulado)
	const cfg = E.estado.config;
	let lat = cfg.latencia ?? (ac.outputLatency || 0) + (ac.baseLatency || 0) + 0.02;
	let confiavel = cfg.latencia != null;
	let refinada = false;
	const cliques = [], cliquesContagem = [];
	const usados = [];
	const resultados = [];
	let combo = 0, comboMax = 0;
	const g = r.groove;
	const agudosNoGroove = g && Object.keys(g.faixas).some((f) => A.AGUDOS.includes(f));
	bt.disabled = true;
	bt.textContent = '■ Parar';
	bt.disabled = false;
	bt.onclick = () => {
		fim();
		terminar(true);
	};
	// contagem na tela
	const c0 = r.compasso(0);
	H.mostrarContagem(c0.cliques.map((q, i) => ({t: t0 + q.b * sBeat, n: i + 1})));
	let k = 0;
	ag = new A.Agendador((ate) => {
		while (!acabou) {
			const tBar = t0 + k * r.barDur;
			if (tBar > ate) return true;
			if (k >= r.total) return false;
			const c = r.compasso(k);
			if (!c) return false;
			agendar(c, k, tBar);
			k++;
		}
		return false;
	});
	function agendar(c, kk, tBar) {
		const comBanda = g && c.tipo !== 'contagem';
		if (!comBanda || (!fone && !agudosNoGroove)) for (const q of c.cliques) {
			A.cliqueGroove(tBar + q.b * sBeat, q.f);
			cliques.push(tBar + q.b * sBeat);
			if (c.tipo === 'contagem') cliquesContagem.push(tBar + q.b * sBeat);
		}
		if (comBanda) {
			A.cicloGroove(g, tBar, {bpmQ: r.bpmQ, soAgudos: !fone, progressao: fone ? g.progressao : null, ciclo: kk - 1});
			if (!fone) for (const [f, pd] of Object.entries(g.faixas)) if (A.AGUDOS.includes(f)) [...pd].forEach((ch, i) => ch !== '.' && cliques.push(tBar + (i * g.ciclo * sBeat) / g.passos));
		}
		if (c.tipo === 'chamada') for (const nt of c.notas) A.notaBaixo(ALTURA, tBar + nt.b * sBeat, Math.max(0.06, Math.min(nt.d * sBeat * 0.9, (r.tempos - nt.b) * sBeat - 0.07)), {acento: true});
		setTimeout(() => !acabou && aoComecar(c, kk), Math.max(0, (tBar - ac.currentTime - (ac.outputLatency || 0)) * 1000));
		if (c.avaliar) setTimeout(() => !acabou && analisar(kk), Math.max(0, (tBar + r.barDur + 0.38 - ac.currentTime) * 1000));
	}
	ag.iniciar();
	// cursor e pulso
	let ultimoTempo = -1;
	const anima = () => {
		const agora = ac.currentTime - (ac.outputLatency || 0) - t0;
		const kk = Math.floor(agora / r.barDur);
		const dentro = agora - kk * r.barDur;
		const cur = $('#cursor');
		if (cur && agora >= 0) cur.style.left = `${(dentro / r.barDur) * 100}%`;
		const tempo = Math.floor(agora / sBeat);
		if (tempo !== ultimoTempo && agora >= 0) {
			ultimoTempo = tempo;
			const c = r.compasso(kk);
			const pu = $('#pulso');
			if (pu && c && (c.cliques.length || g)) {
				pu.classList.remove('bate');
				void pu.offsetWidth;
				pu.classList.add('bate');
			}
		}
		raf = requestAnimationFrame(anima);
	};
	raf = requestAnimationFrame(anima);
	function aoComecar(c, kk) {
		const txt = $('#pulso-txt'), sub = $('#pulso-sub'), pu = $('#pulso');
		desenharGrade(r, c.avaliar ? c : r.compasso(kk + 1), null);
		if (r.jogo === 'relogio' && txt) {
			pu.classList.toggle('mudo', c.tipo === 'gap');
			if (c.tipo === 'gap') {
				txt.textContent = '…';
				sub.textContent = `sem clique · ${c.gapN} de ${c.gapDe}`;
			} else if (c.tipo === 'contagem') {
				txt.textContent = '♩';
				sub.textContent = 'contagem';
			} else if (c.tipo === 'com') {
				txt.textContent = '♩';
				sub.textContent = 'com clique';
			}
		}
		if (r.jogo === 'escada' && txt && c.sub) {
			txt.textContent = c.sub;
			sub.textContent = ['', 'semínima', 'colcheias', 'tercinas', 'semicolcheias', 'quintinas', 'sextinas'][c.sub] ?? 'notas por tempo';
			$('#prox').textContent = c.prox && c.prox !== c.sub ? `próximo: ${c.prox}` : '';
		}
		if (r.jogo === 'eco' && txt) {
			pu.classList.toggle('ouca', c.tipo === 'chamada');
			pu.classList.toggle('sua-vez', c.tipo === 'resposta');
			txt.textContent = c.tipo === 'chamada' ? 'OUÇA' : c.tipo === 'resposta' ? 'SUA VEZ' : '…';
			sub.textContent = c.tipo === 'contagem' ? 'contagem' : `frase ${(c.par ?? 0) + 1}${r.infinito ? ` · nível ${c.nivelFrase}` : ''}`;
		}
		if (r.jogo === 'bolso' && c.alvoMs != null) {
			moverMedidor(null, c.alvoMs, c.tol);
			$('#leitura-medidor').textContent = Rt.nomeBolso(c.alvoMs);
		}
		if (r.jogo === 'swing' && c.razao != null) {
			moverMedidor(null, c.razao, 3);
			$('#leitura-medidor').textContent = `${Rt.nomeSwing(c.razao)} ${c.razao}%`;
		}
		if (r.jogo === 'contratempo' && txt) txt.textContent = c.tipo === 'contagem' ? '1 2 3 4' : '↯';
	}
	function analisar(kk) {
		// latência: acha os cliques da contagem na gravação (sem fone), uma vez, antes do primeiro
		// compasso. Só a contagem: com o aluno tocando no tempo, o ataque do baixo confunde a busca.
		if (!refinada && !fone) {
			refinada = true;
			const tudo = rec.trecho(0);
			const l = tudo ? refinarLatencia(tudo.dados, tudo.sr, tudo.inicioCtx, cliquesContagem, lat) : null;
			if (l != null) {
				lat = l;
				confiavel = true;
			}
		}
		const tr = rec.trecho(t0 + lat + kk * r.barDur - 3.2);
		if (!tr) return;
		const res = Rt.analisarCompassoAoVivo(r, kk, tr.dados, {sr: tr.sr, desloc: t0 + lat - tr.inicioCtx, usados, centrar: !confiavel && r.jogo !== 'bolso'});
		resultados[kk] = res;
		r.resultados[kk] = res;
		mostrarCompasso(res, kk);
		if (r.infinito && res.tipo === 'resposta') {
			if (res.nota === 'perfeito' || res.nota === 'bom') r.acertos++;
			else r.vidas--;
			$('#vidas').innerHTML = `${'♥'.repeat(Math.max(0, r.vidas))}<i>${'♥'.repeat(3 - Math.max(0, r.vidas))}</i> · ${r.acertos} ✓`;
			if (r.vidas <= 0) {
				fim();
				return terminar();
			}
		}
		const ultimoAval = (() => {
			for (let j = r.total - 1; j >= 0; j--) if (r.compasso(j)?.avaliar) return j;
			return -1;
		})();
		if (!r.infinito && kk >= ultimoAval) {
			fim();
			terminar();
		}
	}
	function mostrarCompasso(res, kk) {
		const c = r.compasso(kk);
		desenharGrade(r, c, res);
		const bom = res.nota === 'perfeito' || res.nota === 'bom';
		combo = bom ? combo + 1 : 0;
		comboMax = Math.max(comboMax, combo);
		const cb = $('#combo');
		if (cb) {
			cb.textContent = combo >= 2 ? `×${combo} ${r.jogo === 'bolso' ? 'no bolso' : 'seguidos'}` : '';
			cb.classList.toggle('quente', combo >= 4);
			if (!bom && kk > 1) {
				cb.classList.remove('quebrou');
				void cb.offsetWidth;
				cb.classList.add('quebrou');
			}
		}
		$('#tira')?.insertAdjacentHTML('beforeend', `<i class="${res.nota}" title="compasso ${kk}"></i>`);
		const lei = $('#leitura');
		const txt = $('#pulso-txt'), sub = $('#pulso-sub');
		if (r.jogo === 'relogio' && res.tipo === 'volta') {
			// erro na volta do clique, contra o compasso com clique antes do silêncio
			const s = Rt.resumo(r, resultados, {confiavel});
			const v = s.voltas?.at(-1);
			if (v != null && txt) {
				txt.textContent = `${mais(v)}`;
				sub.textContent = `ms na volta · ${Math.abs(v) <= 16 ? 'no lugar' : v < 0 ? 'você correu' : 'você arrastou'}`;
				$('#pulso').className = `pulso-grande volta ${Math.abs(v) <= 16 ? 'bom' : Math.abs(v) <= 28 ? 'medio' : 'ruim'}`;
			}
		}
		if (r.jogo === 'bolso' && res.media != null) {
			moverMedidor(res.media, c.alvoMs, c.tol);
			if (lei) lei.textContent = `compasso: ${mais(res.media)} ms (alvo ${mais(c.alvoMs)}) · ±${f1(res.desvio)}`;
		} else if (r.jogo === 'swing' && res.razao != null) {
			moverMedidor(res.razao, c.razao, 3);
			if (lei) lei.textContent = `razão ${f0(res.razao)}% (alvo ${c.razao}%)`;
		} else if (lei && res.media != null) lei.textContent = `${res.casados}/${res.n} no lugar · ±${f1(res.desvio)} ms${confiavel ? ` · média ${mais(res.media)}` : ''}`;
		if (r.jogo === 'eco' && res.tipo === 'resposta' && txt) {
			txt.textContent = {perfeito: 'PERFEITO', bom: 'BOM', fraco: 'QUASE', errou: 'ERROU'}[res.nota];
			$('#pulso').className = `pulso-grande eco nota-${res.nota}`;
		}
		if (r.jogo === 'bumbo') $$('.padrao-bumbo i').forEach((i) => i.classList.remove('acertou', 'errou'));
	}
	function terminar(interrompido = false) {
		const s = Rt.resumo(r, resultados, {confiavel});
		const avaliados = resultados.filter(Boolean).length;
		if (interrompido && avaliados < 3) {
			$('#resultado').innerHTML = '<p class="sub">Rodada interrompida.</p>';
			bt.textContent = '▶ Começar';
			bt.onclick = () => jogoMic(ctx);
			return;
		}
		const est = r.infinito || interrompido ? 0 : s.estrelas;
		const antes = r.infinito ? 0 : E.estrelasGroove(ctx.jogo, ctx.n);
		const ev = J.fimGroove(ctx.jogo, ctx.n, {estrelas: est, met: {...Rt.metGroove(s), lat: Math.round(lat * 1000), conf: confiavel}, totalNiveis: total(ctx.jogo), faixaDe: Rt.faixa}, {dia: ctx.dia && !r.infinito, infinito: r.infinito ? r.acertos : null});
		const fala = r.infinito
			? {tom: 'info', txt: `${r.acertos} frases devolvidas antes de perder as três vidas. A dificuldade chegou ao nível ${r.nivelAtual()}.`}
			: P.aposGroove(ctx.jogo, r.nv, s, {estrelas: est, novas: Math.max(0, est - antes), confiavel});
		resultadoGroove({ctx, s, est, antes, ev, fala, r, interrompido});
	}
}

function metricasGroove(jogo, s, r) {
	const l = [];
	if (jogo === 'relogio') l.push(['Na volta do clique', s.deriva != null ? `${f0(s.deriva)} ms` : '–'], ['Regularidade', `±${f1(s.desvio)} ms`], ['Notas no lugar', `${f0(s.cobertura * 100)}%`]);
	else if (jogo === 'bolso') l.push(['No bolso', `${f0(s.noBolso * 100)}%`], ['Regularidade', `±${f1(s.desvio)} ms`], ...(s.porAlvo ?? []).map((x) => [Rt.nomeBolso(x.alvo), `${mais(x.media + x.alvo)} ms`]));
	else if (jogo === 'escada') l.push(['Compassos limpos', `${f0(s.bons * 100)}%`], ['Regularidade', `±${f1(s.desvio)} ms`], ...(s.porSub ?? []).map((x) => [`${x.sub} por tempo`, `${f0(x.bons * 100)}%`]));
	else if (jogo === 'eco') l.push(['Frases certas', `${s.boas}/${s.respostas}`], ['Perfeitas', `${s.perfeitas}`], ['Regularidade', `±${f1(s.desvio)} ms`]);
	else if (jogo === 'swing') l.push(...(s.porAlvo ?? []).map((x) => [`Alvo ${x.alvo}%`, `${f0(x.media)}%`]), ['Constância', `±${f1(s.desvioRazao)}`]);
	else l.push(['Notas no lugar', `${f0(s.cobertura * 100)}%`], ['Regularidade', `±${f1(s.desvio)} ms`], ['Pressa/atraso', s.media != null ? `${mais(s.media)} ms` : 'sem latência']);
	l.push(['Combo máximo', `${s.comboMax}`]);
	return l;
}

function resultadoGroove({ctx, s, est, antes, ev, fala, r, interrompido}) {
	const el = $('#resultado');
	const xp = ev.filter((e) => e.tipo === 'xp').reduce((a, e) => a + e.xp, 0);
	const temProx = !ctx.infinito && ctx.n < total(ctx.jogo) && E.nivelAbertoGroove(ctx.jogo, ctx.n + 1);
	const diaProx = ctx.dia ? Rt.grooveDoDia(E.hoje(), (j) => E.nivelFronteira(j, total(j))).find((x) => !(E.grooveGeral().dias[E.hoje()]?.feitos ?? []).includes(x.jogo)) : null;
	const txtProf = P.escrito() ? fala.txt : P.dizer(fala.txt, fala.tom) && '';
	el.innerHTML = `<div class="resultado">
		<div class="placar-groove ${est >= 2 ? 'aprovado' : est ? 'meio' : 'reprovado'}">
			${ctx.infinito ? `<div class="grande-num num">${r.acertos}</div><p class="peq">frases no Eco infinito</p>` : `<div class="estrelas grandes">${[0, 1, 2].map((k) => `<i class="${k < est ? 'tem' : ''}" style="animation-delay:${0.25 + k * 0.28}s">★</i>`).join('')}</div>`}
			<h3>${interrompido ? 'Interrompido' : est > antes ? (est === 3 ? 'Três estrelas!' : 'Estrela nova') : est ? `${est} ${est === 1 ? 'estrela' : 'estrelas'}` : ctx.infinito ? (ev.some((e) => e.tipo === 'recorde') ? 'Recorde!' : 'Fim de jogo') : 'Ainda não'}</h3>
			<div class="ganhos"><span>+${xp} XP</span>${ev.some((e) => e.tipo === 'nivelGroove') ? '<span class="recorde">nível novo aberto</span>' : ''}</div>
		</div>
		${txtProf ? `<div class="prof-inline"><b>Professor</b> ${H.esc(txtProf)}</div>` : ''}
		<div class="cartao recordes">${metricasGroove(ctx.jogo, s, r).map(([a, b]) => `<div><span>${H.esc(a)}</span><b class="num">${H.esc(b)}</b></div>`).join('')}</div>
		<div class="botoes">
			<button id="denovo">↻ De novo</button>
			${diaProx ? `<a class="botao principal" href="#gjogo/${diaProx.jogo}?n=${diaProx.nivel}&dia${ctx.sessao ? '&s' : ''}">Groove do dia: ${Rt.JOGOS[diaProx.jogo].nome} ›</a>` : ctx.dia && ctx.sessao ? '<button class="principal" id="seguir">Próxima etapa ›</button>' : ctx.dia ? '<a class="botao principal" href="#groove/dia">Groove do dia ›</a>' : temProx ? `<a class="botao principal" href="#gjogo/${ctx.jogo}?n=${ctx.n + 1}">Nível ${ctx.n + 1} ›</a>` : `<a class="botao principal" href="#groove/${ctx.jogo}">Níveis ›</a>`}
		</div></div>`;
	$('#denovo').onclick = () => telaJogoGroove(ctx.jogo, new URLSearchParams(`${ctx.infinito ? 'inf' : `n=${ctx.n}`}${ctx.dia ? '&dia' : ''}${ctx.sessao ? '&s' : ''}`));
	$$('#seguir').forEach((b) => (b.onclick = H.seguirTreino));
	const bt = $('#ir');
	if (bt) bt.remove();
	H.comemorar(evGroove(ev), est >= 2 || ev.some((e) => e.tipo === 'recorde'));
	setTimeout(() => el.scrollIntoView({behavior: 'smooth', block: 'start'}), 150);
}
// eventos do groove que a comemoração da tela principal ainda não conhece viram toasts aqui
function evGroove(ev) {
	let atraso = 600;
	for (const e of ev) {
		if (e.tipo === 'nivelGroove') setTimeout(() => H.toast('🔓', `${Rt.JOGOS[e.jogo].nome}: nível ${e.nivel} aberto`, Rt.JOGOS[e.jogo].niveis[e.nivel - 1].rotulo), (atraso += 800));
		else if (e.tipo === 'faixa') setTimeout(() => {
			A.somUI('nivel');
			H.modal(`<p class="peq">FAIXA DO GROOVE</p><div class="grande-num">🥋</div><h3 style="margin-top:10px">${H.esc(e.nome)}</h3><p class="sub">${E.totalEstrelasGroove()} estrelas.</p>`);
		}, (atraso += 900));
		else if (e.tipo === 'grooveDia') setTimeout(() => H.toast('🥁', 'Groove do dia feito', `Sequência de groove: ${e.seq} ${e.seq === 1 ? 'dia' : 'dias'}`), (atraso += 800));
		else if (e.tipo === 'recorde') setTimeout(() => H.toast('📈', 'Recorde', e.texto), (atraso += 800));
	}
	return ev.filter((e) => !['nivelGroove', 'faixa', 'grooveDia', 'recorde', 'estrelas'].includes(e.tipo));
}

// ---------- jogos de toque ----------
// instante (tempo de contexto) que estava soando quando o dedo tocou a tela
function instanteDoToque(e) {
	const ac = A.audio();
	const ts = ac.getOutputTimestamp?.();
	const atrasoDedo = 0.02; // tela de toque registra ~20 ms depois do contato
	if (ts?.performanceTime) return ts.contextTime + (e.timeStamp - ts.performanceTime) / 1000 - atrasoDedo;
	return ac.currentTime - (ac.outputLatency || 0) - atrasoDedo;
}
function cabecaToque(ctx, nPerg, resultados) {
	return `<div class="placar-modo"><div class="pontos-rodada">${Array.from({length: nPerg}, (_, k) => `<i class="${resultados[k] == null ? '' : resultados[k] ? 'f' : 'e'}"></i>`).join('')}</div></div>`;
}
function fimToque(ctx, acertos, nPerg, extra = '') {
	const est = Rt.estrelasToque(ctx.jogo, acertos, nPerg);
	const antes = E.estrelasGroove(ctx.jogo, ctx.n);
	const ev = J.fimGroove(ctx.jogo, ctx.n, {estrelas: est, met: {acertos, total: nPerg}, totalNiveis: total(ctx.jogo), faixaDe: Rt.faixa}, {dia: ctx.dia});
	const fala = P.aposToque(ctx.jogo, {acertos, total: nPerg, estrelas: est, novas: Math.max(0, est - antes), extra});
	const s = {comboMax: 0};
	$('#jogo').innerHTML = '<div id="resultado"></div>';
	resultadoGroove({ctx, s, est, antes, ev, fala, r: null, interrompido: false});
	$('.cartao.recordes')?.remove();
	$('.resultado .placar-groove')?.insertAdjacentHTML('beforeend', `<p class="sub">${acertos} de ${nPerg}</p>`);
}
async function prepararSons() {
	const carga = $('#carga');
	carga.hidden = false;
	await A.preparar(A.GRUPOS.jogosGroove, (f, t) => carga.firstElementChild && (carga.firstElementChild.style.width = `${(100 * f) / t}%`));
	carga.hidden = true;
}

// Onde está o 1
function jogoUm(ctx) {
	const nPerg = 6;
	const res = [];
	let i = 0, acertos = 0, achou = [];
	const el = $('#jogo');
	const pronto = prepararSons();
	const perguntar = async () => {
		await pronto;
		const p = Rt.perguntaUm(ctx.n, E.grooves);
		el.innerHTML = `${cabecaToque(ctx, nPerg, res)}
		<p class="peq centro">${H.esc(p.groove.nome)} · ${p.groove.bpm} BPM${p.teclado ? '' : ' · só bateria'}</p>
		<button class="pad-toque" id="pad"><b>TOQUE NO 1</b><small>em todo 1, até o groove parar</small></button>
		<div class="uns" id="uns">${p.uns.map(() => '<i></i>').join('')}</div>
		<div id="retorno"></div>`;
		const ac = A.audio();
		const T0 = ac.currentTime + 0.6;
		const C0 = T0 - p.inicio * p.passoDur;
		const ate = T0 + p.dur;
		const g = p.groove;
		const bpmQ = g.bpm * (g.pulso ?? 1);
		for (let c = 0, tc = C0; tc < ate; c++, tc += g.passos * p.passoDur) A.cicloGroove(g, tc, {bpmQ, progressao: p.teclado ? g.progressao : null, ciclo: c, desde: T0, ate});
		const toques = [];
		$('#pad').onpointerdown = (e) => {
			e.preventDefault();
			toques.push(instanteDoToque(e) - T0);
			const pad = $('#pad');
			pad.classList.remove('bate');
			void pad.offsetWidth;
			pad.classList.add('bate');
		};
		await espera((ate - ac.currentTime + 0.4) * 1000);
		if (!$('#pad')) return;
		const a = Rt.avaliarUm(p, toques);
		res[i] = a.acertou;
		if (a.acertou) acertos++;
		achou.push(a.achouEm);
		A.somUI(a.acertou ? 'xp' : 'tique');
		$$('#uns i').forEach((x, k) => x.classList.add(a.certos[k] ? 'f' : 'e'));
		$('#pad').disabled = true;
		i++;
		$('#retorno').innerHTML = `<div class="metrica ${a.acertou ? 'ok' : 'nok'}"><div class="topo-m"><span>${a.acertou ? '✓ Achou o 1' : '✗ O 1 estava em outro lugar'}</span><b class="peq">${a.desvio != null ? `${mais(a.desvio)} ms` : ''}</b></div><small>${a.errados ? `${a.errados} toque${a.errados > 1 ? 's' : ''} fora do 1. ` : ''}O groove começou no passo ${p.inicio + 1} do compasso.</small></div>
			<div class="botoes"><button class="principal" id="prox">${i >= nPerg ? 'Ver resultado' : 'Próximo groove ›'}</button></div>`;
		$('#prox').onclick = () => (i >= nPerg ? fimToque(ctx, acertos, nPerg, achou.filter((x) => x === 0 || x === 1).length ? `Em ${achou.filter((x) => x === 0 || x === 1).length} achou o 1 já no primeiro ou segundo compasso.` : '') : perguntar());
	};
	el.innerHTML = `<div class="cartao centro"><p>O groove começa no meio do compasso. Ache o 1 e bata no botão em <b>cada</b> 1. Quanto antes achar, melhor.</p></div><div class="botoes"><button class="principal grande" id="comecar">▶ Começar</button></div>`;
	$('#comecar').onclick = perguntar;
}

// Ditado rítmico
function gradeFraseHtml(f, marcar) {
	return `<div class="grade-frase ${marcar ?? ''}">${Rt.gradeDaFrase(f).map((t) => `<span class="tempo-f ${t.terc ? 'terc' : ''}">${t.casas.map((on) => `<i class="${on ? 'on' : ''}"></i>`).join('')}</span>`).join('')}</div>`;
}
function tocarFrase(f, bpm) {
	const ac = A.audio();
	const s = 60 / bpm;
	const t0 = ac.currentTime + 0.15;
	for (let k = 0; k < 4; k++) A.cliqueGroove(t0 + k * s, k ? 0.6 : 1);
	const ini = t0 + 4 * s;
	const tempos = 4 * f.compassos;
	for (let k = 0; k < tempos; k++) A.cliqueGroove(ini + k * s, k % 4 ? 0.45 : 0.8);
	f.ticks.forEach((t, i) => {
		const d = ((f.ticks[i + 1] ?? tempos * Rt.TPB) - t) / Rt.TPB;
		A.notaBaixo(ALTURA, ini + (t / Rt.TPB) * s, Math.max(0.06, d * s * 0.9), {acento: true});
	});
	return ini + tempos * s;
}
function jogoDitado(ctx) {
	const nPerg = 8;
	const res = [];
	let i = 0, acertos = 0;
	const el = $('#jogo');
	const pronto = prepararSons();
	const perguntar = async () => {
		await pronto;
		const p = Rt.perguntaDitado(ctx.n);
		el.innerHTML = `${cabecaToque(ctx, nPerg, res)}
		<div class="botoes"><button class="principal" id="ouvir">▶ Ouvir</button></div>
		<div class="opcoes-frase">${p.opcoes.map((o, k) => `<button class="opcao-frase" data-k="${k}">${gradeFraseHtml(o)}</button>`).join('')}</div>
		<div id="retorno"></div>`;
		$('#ouvir').onclick = () => tocarFrase(p.frase, p.bpm);
		setTimeout(() => tocarFrase(p.frase, p.bpm), 300);
		$$('[data-k]').forEach((b) => (b.onclick = () => {
			if (res[i] != null) return;
			const ok = Number(b.dataset.k) === p.certa;
			res[i] = ok;
			if (ok) acertos++;
			A.somUI(ok ? 'xp' : 'tique');
			$$('[data-k]').forEach((x) => {
				x.disabled = true;
				if (Number(x.dataset.k) === p.certa) x.classList.add('certa');
				else if (x === b) x.classList.add('errada');
			});
			i++;
			$('#retorno').innerHTML = `<div class="botoes"><button id="de-novo">↻ Ouvir de novo</button><button class="principal" id="prox">${i >= nPerg ? 'Ver resultado' : 'Próxima ›'}</button></div>`;
			$('#de-novo').onclick = () => tocarFrase(p.frase, p.bpm);
			$('#prox').onclick = () => (i >= nPerg ? fimToque(ctx, acertos, nPerg) : perguntar());
		}));
	};
	perguntar();
}

// Andamento
function jogoAndamento(ctx) {
	const nPerg = 6;
	const res = [];
	let i = 0, acertos = 0;
	const erros = [];
	const el = $('#jogo');
	const pronto = prepararSons();
	const perguntar = async () => {
		await pronto;
		const p = Rt.perguntaAndamento(ctx.n, E.grooves, Math.random, i);
		const fecha = (erro, txt) => {
			const ok = Math.abs(erro) <= p.tol;
			res[i] = ok;
			if (ok) acertos++;
			erros.push(erro);
			A.somUI(ok ? 'xp' : 'tique');
			i++;
			$('#retorno').innerHTML = `<div class="metrica ${ok ? 'ok' : 'nok'}"><div class="topo-m"><span>${ok ? '✓ Dentro' : '✗ Fora'}: ${txt}</span><b class="peq">${mais(erro)} BPM</b></div><small>Margem do nível: ±${p.tol} BPM.</small></div>
				<div class="botoes"><button class="principal" id="prox">${i >= nPerg ? 'Ver resultado' : 'Próxima ›'}</button></div>`;
			$('#prox').onclick = () => {
				if (i < nPerg) return perguntar();
				const m = erros.reduce((a, b) => a + b, 0) / erros.length;
				fimToque(ctx, acertos, nPerg, Math.abs(m) >= 3 ? `Você tende a ${m > 0 ? 'chutar mais rápido' : 'chutar mais lento'} que o real (${mais(m)} BPM em média).` : '');
			};
		};
		if (p.tipo === 'qual') {
			let palpite = 100;
			el.innerHTML = `${cabecaToque(ctx, nPerg, res)}
			<div class="cartao centro"><p class="peq">QUAL É O ANDAMENTO?</p><div class="bpm-gigante"><b id="palpite">${palpite}</b><div class="peq">BPM</div></div>
			<div class="linha-bpm"><button class="redondo" data-d="-5">−5</button><button class="redondo" data-d="-1">−</button><button class="redondo" data-d="1">+</button><button class="redondo" data-d="5">+5</button></div></div>
			<div class="botoes"><button id="ouvir">▶ Ouvir de novo</button><button class="principal" id="ok">Confirmar</button></div><div id="retorno"></div>`;
			const tocar = () => {
				const ac = A.audio();
				const g = p.groove;
				const t0 = ac.currentTime + 0.2;
				const dur = (60 / p.bpm) * g.ciclo;
				for (let c = 0; c < 4; c++) A.cicloGroove(g, t0 + c * dur, {bpmQ: p.bpm, progressao: g.progressao, ciclo: c});
			};
			tocar();
			$('#ouvir').onclick = tocar;
			$$('[data-d]').forEach((b) => (b.onclick = () => {
				palpite = Math.max(40, Math.min(220, palpite + Number(b.dataset.d)));
				$('#palpite').textContent = palpite;
			}));
			$('#ok').onclick = () => {
				$('#ok').disabled = true;
				fecha(palpite - p.bpm, `era ${p.bpm}, você disse ${palpite}`);
			};
		} else {
			el.innerHTML = `${cabecaToque(ctx, nPerg, res)}
			<button class="pad-toque" id="pad"><b>BATA ${p.bpm} BPM</b><small>8 toques, sem referência</small></button><div class="uns" id="uns">${'<i></i>'.repeat(8)}</div><div id="retorno"></div>`;
			const ts = [];
			$('#pad').onpointerdown = (e) => {
				e.preventDefault();
				if (ts.length >= 8) return;
				ts.push(e.timeStamp / 1000);
				$$('#uns i')[ts.length - 1]?.classList.add('f');
				if (ts.length === 8) {
					$('#pad').disabled = true;
					const b = Rt.bpmDosToques(ts);
					fecha(Math.round(b.bpm - p.bpm), `você bateu ${Math.round(b.bpm)} (oscilação ±${f0(b.oscila)} ms)`);
				}
			};
		}
	};
	perguntar();
}
