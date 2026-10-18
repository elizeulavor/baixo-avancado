// Telas do app: Hoje, Programa, Drill (com gravação e avaliação), Ferramentas e Ajustes.
import * as E from './estado.js';
import * as A from './audio.js';
import {avaliar, medirLatencia, refinarLatencia, alturaAoVivo} from './analise.js';
import {renderTab} from './tab.js';
import {parseProgressao, conjuntoEscala, freqMidi, nomeMidi, midiFreq, CORDAS, AFINACOES, gerarWalking, NOMES, ESCALAS} from './musica.js';

const $ = (s, el = document) => el.querySelector(s);
const tela = $('#tela');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const fmt = (v, d = 0) => (v == null || Number.isNaN(v) ? '–' : Number(v).toFixed(d));
let parar = []; // o que precisa parar ao trocar de tela (metrônomo, microfone...)
const limpar = () => {
	parar.forEach((f) => {
		try { f(); } catch {}
	});
	parar = [];
};

// ---------- roteador ----------
const rotas = {hoje: telaHoje, programa: telaPrograma, drill: telaDrill, ferramentas: telaFerramentas, ajustes: telaAjustes};
function ir() {
	limpar();
	const [nome, arg] = (location.hash.slice(1) || 'hoje').split('/');
	(rotas[nome] ?? telaHoje)(arg);
	document.querySelectorAll('nav a').forEach((a) => a.classList.toggle('ativo', a.getAttribute('href') === `#${nome}` || (nome === 'drill' && a.getAttribute('href') === '#programa')));
	window.scrollTo(0, 0);
}
window.addEventListener('hashchange', ir);

// tempo de prática: conta enquanto o app está aberto num drill ou ferramenta
setInterval(() => {
	const r = location.hash.slice(1).split('/')[0];
	if (document.visibilityState === 'visible' && (r === 'drill' || r === 'ferramentas')) E.adicionarMinutos(0.5);
}, 30000);

// ---------- Hoje ----------
function telaHoje() {
	const plano = E.planoDoDia();
	const f = E.feitoNoPlano(plano);
	const seq = E.sequencia();
	const min = Math.round(E.estado.sessoes[E.hoje()] ?? 0);
	const semCal = E.estado.config.latencia == null;
	tela.innerHTML = `
	<header class="topo"><div><h1>Hoje</h1><p class="sub">${new Date().toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'})}</p></div>
	<div class="placar"><b>${seq}</b><span>dias seguidos</span></div></header>
	<div class="barra-dia"><div style="width:${f.pct * 100}%"></div></div>
	<p class="sub">${f.feitos} de ${f.total} tarefas · ${min} min hoje · meta ${E.estado.config.minutos} min</p>
	${semCal ? `<a class="aviso" href="#ferramentas/calibrar">Calibre a latência antes do primeiro take (30 s). Sem isso o app mede a regularidade, mas não sabe se você está adiantado ou atrasado.</a>` : ''}
	<div class="lista">${plano.itens.map(itemPlano).join('')}</div>
	<button class="sec" id="refazer">Refazer plano de hoje</button>`;
	tela.querySelectorAll('[data-check]').forEach((b) => b.addEventListener('click', (e) => {
		e.preventDefault();
		const k = b.dataset.check;
		E.marcarFeito(k, !E.planoDoDia().feitos[k]);
		telaHoje();
	}));
	$('#refazer').onclick = () => {
		E.refazerPlano();
		telaHoje();
	};
}
function itemPlano(i) {
	const plano = E.planoDoDia();
	const chave = i.tipo === 'drill' ? `drill:${i.id}` : i.id;
	const feito = plano.feitos[chave];
	if (i.tipo === 'desafio') {
		return `<div class="card ${feito ? 'feito' : ''}"><div class="papel">${esc(i.papel)} · ${i.minutos} min</div><p>${esc(i.texto)}</p>
		<button class="check" data-check="${chave}">${feito ? '✓ Feito' : 'Marcar feito'}</button></div>`;
	}
	const d = E.drillPorId(i.id);
	if (!d) return '';
	const p = E.progresso(d);
	const bpm = i.revisao ? d.bpm.meta : p.bpm;
	const u = p.ultimo;
	return `<a class="card ${feito ? 'feito' : ''}" href="#drill/${d.id}${i.revisao ? '?meta' : ''}">
		<div class="papel">${esc(i.papel)} · ${i.minutos} min ${feito ? '<span class="ok">✓</span>' : ''}</div>
		<h3>${esc(d.titulo)}</h3><p class="sub">${esc(d.modulo.titulo)} · <b>${bpm} BPM</b> → meta ${d.bpm.meta}</p>
		${u ? `<p class="ultimo">${u.aprovado ? 'Aprovado' : 'Último'}: nota ${u.nota} em ${u.bpm} BPM${u.dicas?.[0] ? ` · ${esc(u.dicas[0])}` : ''}</p>` : ''}
		<div class="mini"><div style="width:${E.fracao(d) * 100}%"></div></div></a>`;
}

// ---------- Programa ----------
function telaPrograma() {
	const blocos = ['A', 'B'].map((tr) => {
		const ativo = E.moduloAtivo(tr);
		return `<h2>Trilha ${tr} · ${tr === 'A' ? 'mão, tempo e groove' : 'harmonia e linguagem'}</h2>` + E.programa.modulos.filter((m) => m.trilha === tr).map((m) => {
			const pct = Math.round(E.progressoModulo(m) * 100);
			const estadoM = E.moduloConcluido(m) ? 'concluído' : m === ativo ? 'em curso' : 'adiante';
			return `<details class="modulo ${m === ativo ? 'aberto' : ''}" ${m === ativo ? 'open' : ''}>
				<summary><div><b>${esc(m.titulo)}</b><span class="sub">${estadoM} · ${pct}%</span></div><div class="mini"><div style="width:${pct}%"></div></div></summary>
				<p class="sub">${esc(m.meta)}</p>
				${m.drills.map((d) => {
					const p = E.estado.drills[d.id];
					const dom = E.dominado(d);
					return `<a class="linha-drill" href="#drill/${d.id}"><span>${dom ? '★' : p?.tentativas ? '◐' : '○'} ${esc(d.titulo)}</span><span class="sub">${p ? p.bpm : d.bpm.inicio}→${d.bpm.meta}</span></a>`;
				}).join('')}
				${m.desafios?.length ? `<p class="papel">Desafios</p><ul class="desafios">${m.desafios.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
			</details>`;
		}).join('');
	}).join('');
	const total = E.todosDrills().length;
	const dom = E.todosDrills().filter(E.dominado).length;
	tela.innerHTML = `<header class="topo"><div><h1>Programa</h1><p class="sub">${dom} de ${total} drills dominados</p></div></header>
	<p class="regra">${esc(E.programa.regras.subir)} ${esc(E.programa.regras.dominar)}</p>${blocos}`;
}

// ---------- Drill ----------
let ultimoResultado = null;
function telaDrill(arg) {
	const [id, q] = (arg ?? '').split('?');
	const d = E.drillPorId(id);
	if (!d) return (location.hash = '#programa');
	const p = E.progresso(d);
	let bpm = q === 'meta' ? d.bpm.meta : p.bpm;
	const {eventos, info, tempos} = E.montar(d);
	let oculto = !!d.oculto;
	const crit = {...d.criterios};
	const chips = [
		`tempo ±${crit.tempoDesvio ?? 12} ms`,
		d.modo === 'conjunto' ? `≥${crit.notas ?? 95}% no modo` : d.modo === 'alvos' || d.modo === 'aproximacao' ? `alvos ≥${crit.notas ?? 95}%` : `notas ≥${crit.notas ?? 95}%`,
		d.dinamica?.tipo === 'uniforme' ? `volume ±${d.dinamica.max} dB` : null,
		d.dinamica?.tipo === 'acentos' ? `acentos +${d.dinamica.min} dB` : null,
		d.dinamica?.fantasma ? `ghosts −${d.dinamica.fantasma} dB` : null,
		d.dinamica?.tipo === 'crescendo' ? `crescendo +${d.dinamica.min} dB` : null,
		crit.silencio ? `pausas −${crit.silencio} dB` : null,
		crit.staccato ? `staccato ≤${crit.staccato}%` : null,
		crit.legato ? `legato ≥${crit.legato}%` : null,
	].filter(Boolean);
	tela.innerHTML = `
	<a class="voltar" href="#programa">‹ ${esc(d.modulo.titulo)}</a>
	<h1>${esc(d.titulo)}</h1>
	<p class="objetivo">${esc(d.objetivo)}</p>
	${d.instrucao ? `<p class="sub">${esc(d.instrucao)}</p>` : ''}
	${info ? `<p class="info">${esc(info)}</p>` : ''}
	${d.progressao ? `<p class="info">Acordes: ${esc(d.progressao)}</p>` : ''}
	<div class="chips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
	<div class="bpm-linha">
		<button class="redondo" id="menos">−</button>
		<div class="bpm"><b id="bpm">${bpm}</b><span>BPM · meta ${d.bpm.meta}${E.dominado(d) ? ' · ★ dominado' : ''}</span></div>
		<button class="redondo" id="mais">+</button>
	</div>
	<div id="tab" class="tab-caixa"></div>
	${oculto ? '<button class="sec" id="revelar">Mostrar a tablatura (depois de tentar)</button>' : ''}
	<div class="botoes">
		<button class="sec" id="modelo">▶ Ouvir modelo</button>
		<button class="sec" id="lento">▶ 70%</button>
		<button class="principal" id="gravar">● Gravar take</button>
	</div>
	<p class="sub centro" id="status">${E.estado.config.latencia == null ? 'Sem calibração: o resultado não mede pressa/atraso. <a href="#ferramentas/calibrar">Calibrar</a>' : 'Use o alto-falante do celular (sem fone Bluetooth). Grava 1 compasso de contagem + o exercício.'}</p>
	<div id="resultado"></div>
	<div id="historico"></div>`;
	const desenhar = () => {
		const r = renderTab(eventos, {afin: E.estado.config.afinacao, tempos, largura: Math.min(720, tela.clientWidth - 8), ocultar: oculto});
		$('#tab').innerHTML = r.svg;
		return r.layout;
	};
	let layout = desenhar();
	const mudarBpm = (dv) => {
		bpm = Math.max(30, Math.min(300, bpm + dv));
		$('#bpm').textContent = bpm;
	};
	$('#menos').onclick = () => mudarBpm(-(Math.abs(d.bpm.passo) || 2));
	$('#mais').onclick = () => mudarBpm(Math.abs(d.bpm.passo) || 2);
	if ($('#revelar')) $('#revelar').onclick = () => {
		oculto = false;
		layout = desenhar();
		$('#revelar').remove();
	};
	const cursor = (inicio, b, voltas) => {
		const s = 60 / b;
		const total = eventos.at(-1).t + eventos.at(-1).d;
		const el = $('#cursor');
		let raf;
		const passo = () => {
			const t = (A.agora() - inicio) / s;
			if (t > total * voltas) {
				el.setAttribute('x1', -10);
				el.setAttribute('x2', -10);
				return;
			}
			if (t >= 0 && el) {
				const pos = layout.pos(t % total);
				el.setAttribute('x1', pos.x);
				el.setAttribute('x2', pos.x);
				el.setAttribute('y1', pos.y0 + 8);
				el.setAttribute('y2', pos.y0 + layout.linhaH - 6);
			}
			raf = requestAnimationFrame(passo);
		};
		raf = requestAnimationFrame(passo);
		parar.push(() => cancelAnimationFrame(raf));
	};
	const tocarModelo = (fator) => {
		limpar();
		const b = Math.round(bpm * fator);
		const r = A.tocarEventos(eventos, {bpm: b, tempos, clickModo: d.click === 'gap' ? 'normal' : d.click, voltas: 1});
		cursor(r.inicio, b, 1);
	};
	$('#modelo').onclick = () => tocarModelo(1);
	$('#lento').onclick = () => tocarModelo(0.7);
	$('#gravar').onclick = () => gravarTake(d, eventos, tempos, bpm, cursor, () => (layout = desenhar()));
	historicoDrill(d);
	if (ultimoResultado?.id === d.id) mostrarResultado(ultimoResultado.res, d, ultimoResultado.msg, ultimoResultado.takeId);
}

function historicoDrill(d) {
	const h = E.estado.drills[d.id]?.historico ?? [];
	if (!h.length) return;
	const ult = h.slice(-30);
	const w = 320, hgt = 90;
	const bpms = ult.map((x) => x.bpm);
	const bmin = Math.min(...bpms, d.bpm.inicio, d.bpm.meta), bmax = Math.max(...bpms, d.bpm.inicio, d.bpm.meta);
	const y = (b) => hgt - 12 - ((b - bmin) / Math.max(1, bmax - bmin)) * (hgt - 24);
	const x = (i) => 10 + (i / Math.max(1, ult.length - 1)) * (w - 20);
	$('#historico').innerHTML = `<h2>Histórico</h2>
	<svg viewBox="0 0 ${w} ${hgt}" class="grafico" width="100%">
		<line x1="0" x2="${w}" y1="${y(d.bpm.meta)}" y2="${y(d.bpm.meta)}" class="linha-meta"/>
		<text x="${w - 4}" y="${y(d.bpm.meta) - 3}" class="rot" text-anchor="end">meta ${d.bpm.meta}</text>
		<polyline points="${ult.map((v, i) => `${x(i)},${y(v.bpm)}`).join(' ')}" class="trilha"/>
		${ult.map((v, i) => `<circle cx="${x(i)}" cy="${y(v.bpm)}" r="3.5" class="${v.aprovado ? 'aprov' : 'reprov'}"><title>${v.data} · ${v.bpm} BPM · nota ${v.nota}</title></circle>`).join('')}
	</svg>
	<p class="sub">${h.length} takes · ${h.filter((v) => v.aprovado).length} aprovados · ● verde aprovado, ● vermelho reprovado</p>`;
}

// Agenda os cliques do take (com contagem) e devolve os instantes para a análise.
function agendarCliques(d, bpm, tempos, totalTempos) {
	const ctx = A.audio();
	const s = 60 / bpm;
	const den = typeof d.compasso === 'string' ? Number(d.compasso.split('/')[1]) : 4;
	const unidade = den === 8 ? 0.5 : 1; // clique em colcheia nos compassos /8
	const porCompasso = Math.round(tempos / unidade);
	const acentos = d.grupos ? d.grupos.reduce((a, g) => [...a, (a.at(-1) ?? 0) + g], [0]).slice(0, -1) : [0];
	const inicio = ctx.currentTime + 0.4 + tempos * s; // depois de 1 compasso de contagem
	const cliques = [];
	for (let k = -porCompasso; k < Math.round(totalTempos / unidade); k++) {
		const t = inicio + k * unidade * s;
		const naBarra = ((k % porCompasso) + porCompasso) % porCompasso;
		const compasso = Math.floor(k / porCompasso);
		let toca = true;
		if (k >= 0) {
			if (d.click === '2e4') toca = naBarra % 2 === 1;
			else if (d.click === '1') toca = naBarra === 0;
			else if (d.click === 'gap') toca = compasso % (d.gap[0] + d.gap[1]) < d.gap[0];
		}
		if (!toca) continue;
		A.click(t, naBarra === 0 ? 1 : acentos.includes(naBarra) ? 0.75 : 0.6);
		cliques.push(t);
	}
	return {inicio, cliques, fim: inicio + totalTempos * s};
}

async function gravarTake(d, eventos, tempos, bpm, cursor, redesenhar) {
	limpar();
	const st = $('#status');
	const bt = $('#gravar');
	let stream;
	try {
		stream = await A.abrirMicrofone();
	} catch (e) {
		st.innerHTML = `<span class="erro">Microfone negado ou indisponível (${esc(e.message)}). Permita o microfone para este site.</span>`;
		return;
	}
	parar.push(() => A.fecharMicrofone(stream));
	const voltas = d.voltas ?? 1;
	const total = eventos.at(-1).t + eventos.at(-1).d;
	const rec = A.gravar(stream);
	await new Promise((r) => setTimeout(r, 150));
	const ag = agendarCliques(d, bpm, tempos, total * voltas);
	cursor(ag.inicio, bpm, voltas);
	bt.disabled = true;
	bt.textContent = '● Gravando…';
	let cancelado = false;
	const cancelar = () => (cancelado = true);
	parar.push(cancelar);
	const espera = (ag.fim - A.agora() + 0.5) * 1000;
	const tick = setInterval(() => {
		const falta = ag.fim - A.agora();
		const cont = ag.inicio - A.agora();
		st.textContent = cont > 0 ? `Contagem… ${Math.ceil(cont / (60 / bpm))}` : `Gravando · ${Math.max(0, falta).toFixed(0)} s`;
	}, 100);
	await new Promise((r) => setTimeout(r, espera));
	clearInterval(tick);
	const take = await rec.parar();
	A.fecharMicrofone(stream);
	bt.disabled = false;
	bt.textContent = '● Gravar take';
	if (cancelado || !take) return;
	st.textContent = 'Analisando…';
	await new Promise((r) => setTimeout(r, 30));

	const ctx = A.audio();
	const palpite = E.estado.config.latencia ?? (ctx.outputLatency || 0) + (ctx.baseLatency || 0) + 0.02;
	const refinada = refinarLatencia(take.dados, take.sr, take.inicioCtx, ag.cliques, palpite);
	const lat = refinada ?? palpite;
	const confiavel = refinada != null || E.estado.config.latencia != null;
	const res = analisarTake(d, eventos, tempos, bpm, take, ag, lat, confiavel);
	const id = `${Date.now()}`;
	E.guardarTake({id, drill: d.id, bpm, sr: take.sr, dados: take.dados, data: E.hoje()});
	const msg = E.registrarTake(d, bpm, res);
	ultimoResultado = {id: d.id, res, msg, takeId: id};
	ir(); // redesenha com o BPM novo e o resultado
	$('#status').textContent = refinada != null ? `Clique encontrado na gravação: latência ${(lat * 1000).toFixed(0)} ms.` : confiavel ? `Latência calibrada: ${(lat * 1000).toFixed(0)} ms.` : 'Sem calibração: pressa/atraso não avaliados.';
}

function analisarTake(d, eventos, tempos, bpm, take, ag, lat, confiavel) {
	const s = 60 / bpm;
	const voltas = d.voltas ?? 1;
	const total = eventos.at(-1).t + eventos.at(-1).d;
	const esperado = [];
	for (let v = 0; v < voltas; v++) {
		for (const e of eventos) {
			let t = (v * total + e.t) * s;
			// semicolcheias do contratempo atrasam pelo swing (mesma conta do groove)
			if (d.swing && Math.abs((e.t * 4) % 1) < 1e-6 && Math.round(e.t * 4) % 2 === 1) t += d.swing * (s / 4);
			esperado.push({...e, t, d: e.d * s});
		}
	}
	const prog = d.progressao ? parseProgressao(d.progressao, tempos) : null;
	const totalProg = prog ? prog.at(-1).inicio + prog.at(-1).dur : 0;
	const midis = eventos.filter((e) => !e.pausa).map((e) => e.midi);
	const minMidi = Math.min(...midis, 40);
	const modo = d.modo ?? 'sequencia';
	return avaliar(take.dados, take.sr, esperado, {
		inicio: ag.inicio - take.inicioCtx + lat,
		duracao: total * voltas * s,
		modo: d.gradeLivre ? 'alvos' : modo,
		gradeLivre: d.gradeLivre,
		grade: (d.grade ?? 0.5) * s,
		conjunto: d.conjunto ? conjuntoEscala(d.conjunto.tom, d.conjunto.escala) : null,
		prog, totalProg, passoAlvo: d.gerar?.feel === 2 ? 2 : 1,
		bpm, tempos,
		criterios: d.criterios,
		dinamica: d.dinamica,
		latenciaConfiavel: confiavel,
		fmin: Math.max(28, freqMidi(minMidi - 3)),
	});
}

function mostrarResultado(res, d, msg, takeId) {
	const el = $('#resultado');
	const crit = res.itens.find((i) => i.nome === 'Regularidade do tempo')?.limite ?? 12;
	el.innerHTML = `
	<div class="res ${res.aprovado ? 'aprovado' : 'reprovado'}">
		<div class="nota"><b>${res.nota}</b><span>${res.aprovado ? 'APROVADO' : 'REPROVADO'}</span></div>
		<p>${esc(msg)}</p>
	</div>
	<div class="itens">${res.itens.map((i) => `<div class="item ${i.ok ? 'ok' : 'nok'}"><span>${i.ok ? '✓' : '✗'} ${esc(i.nome)}</span><b>${fmt(i.valor, i.unidade === '%' ? 0 : 1)} ${i.unidade}</b><small>limite ${i.limite} · ${esc(i.texto)}</small></div>`).join('')}</div>
	${res.dicas.length ? `<ul class="dicas">${res.dicas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
	<h2>Tempo, nota a nota</h2>${graficoTempo(res, crit)}
	<p class="sub">Acima da linha: atrasado. Abaixo: adiantado. Faixa: ±${crit} ms. ${res.tempo.dentro10 != null ? `${fmt(res.tempo.dentro10)}% dentro de ±10 ms.` : ''}</p>
	<h2>Dinâmica, nota a nota</h2>${graficoDinamica(res)}
	<div class="medidas">
		<div><span>Detectadas</span><b>${res.contagem.tocadas}</b></div>
		<div><span>Esperadas</span><b>${res.contagem.esperadas || '–'}</b></div>
		<div><span>Articulação</span><b>${fmt(res.som.articulacao)}%</b></div>
		<div><span>Pausas</span><b>${res.som.silencio != null ? `−${fmt(res.som.silencio)} dB` : '–'}</b></div>
		<div><span>Afinação</span><b>${res.notas?.afinacao != null ? `${res.notas.afinacao > 0 ? '+' : ''}${fmt(res.notas.afinacao)} ¢` : '–'}</b></div>
		<div><span>Clareza</span><b>${fmt(res.som.clareza)}%</b></div>
	</div>
	<div class="botoes"><button class="sec" id="ouvir">▶ Ouvir meu take</button><button class="principal" id="denovo">● Gravar de novo</button></div>`;
	$('#ouvir').onclick = async () => {
		const t = await E.lerTake(takeId);
		if (!t) return;
		const src = A.tocarBuffer(t.dados, t.sr);
		parar.push(() => src.stop());
	};
	$('#denovo').onclick = () => $('#gravar').click();
	el.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function graficoTempo(res, lim) {
	const pts = res.tempo.pontos;
	if (!pts.length) return '<p class="sub">Nenhuma nota casada com o esperado.</p>';
	const w = 340, h = 120, m = 60;
	const tmax = Math.max(...pts.map((p) => p.t), 1);
	const x = (t) => 8 + (t / tmax) * (w - 16);
	const y = (e) => h / 2 - (Math.max(-m, Math.min(m, e)) / m) * (h / 2 - 6);
	return `<svg viewBox="0 0 ${w} ${h}" class="grafico" width="100%">
		<rect x="0" y="${y(lim)}" width="${w}" height="${y(-lim) - y(lim)}" class="faixa"/>
		<line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" class="zero"/>
		<text x="4" y="12" class="rot">+${m} ms</text><text x="4" y="${h - 4}" class="rot">−${m} ms</text>
		${pts.map((p) => `<circle cx="${x(p.t)}" cy="${y(p.erro)}" r="2.8" class="${Math.abs(p.erro) <= lim ? 'aprov' : 'reprov'}"/>`).join('')}
	</svg>`;
}
function graficoDinamica(res) {
	const n = res.dinamica.niveis;
	if (!n.length) return '';
	const w = 340, h = 90;
	const max = Math.max(...n.map((v) => v.nivel)), min = Math.min(...n.map((v) => v.nivel), max - 30);
	const bw = Math.max(1.5, (w - 16) / n.length - 1);
	return `<svg viewBox="0 0 ${w} ${h}" class="grafico" width="100%">
		${n.map((v, i) => {
			const hh = ((v.nivel - min) / Math.max(1, max - min)) * (h - 14) + 2;
			return `<rect x="${8 + i * (bw + 1)}" y="${h - hh}" width="${bw}" height="${hh}" class="barra-${v.tipo}"/>`;
		}).join('')}
	</svg><p class="sub">Barra alta = mais forte. <span class="cor-acento">■</span> acento <span class="cor-normal">■</span> normal <span class="cor-fantasma">■</span> fantasma · variação ±${fmt(res.dinamica.desvio, 1)} dB</p>`;
}

// ---------- Ferramentas ----------
function telaFerramentas(sub) {
	const abas = {metronomo: 'Metrônomo', groove: 'Groove', afinador: 'Afinador', livre: 'Gravar livre', calibrar: 'Calibrar'};
	const atual = abas[sub] ? sub : 'metronomo';
	tela.innerHTML = `<header class="topo"><div><h1>Ferramentas</h1></div></header>
	<div class="abas">${Object.entries(abas).map(([k, v]) => `<a href="#ferramentas/${k}" class="${k === atual ? 'ativo' : ''}">${v}</a>`).join('')}</div>
	<div id="ferr"></div>`;
	({metronomo: ferrMetronomo, groove: ferrGroove, afinador: ferrAfinador, livre: ferrLivre, calibrar: ferrCalibrar})[atual]($('#ferr'));
}

function ferrMetronomo(el) {
	const c = {bpm: 90, compasso: 4, subdiv: 1, modo: 'normal', gap: [2, 2], subir: null};
	el.innerHTML = `
	<div class="bpm-linha"><button class="redondo" data-d="-5">−5</button><button class="redondo" data-d="-1">−</button>
	<div class="bpm"><b id="mb">${c.bpm}</b><span>BPM</span></div><button class="redondo" data-d="1">+</button><button class="redondo" data-d="5">+5</button></div>
	<input type="range" id="mr" min="30" max="300" value="${c.bpm}">
	<div class="pulsos" id="pulsos"></div>
	<div class="form">
		<label>Compasso <select id="mc"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6/8</option><option>7/8</option><option>5/8</option></select></label>
		<label>Subdivisão <select id="ms"><option value="1">nenhuma</option><option value="2">colcheia</option><option value="3">tercina</option><option value="4">semicolcheia</option></select></label>
		<label>Clique <select id="mm"><option value="normal">todo tempo</option><option value="2e4">só 2 e 4</option><option value="1">só no 1</option><option value="gap">some e volta</option></select></label>
		<label>Some: com / sem <span><input type="number" id="g1" value="2" min="1" max="16"> <input type="number" id="g2" value="2" min="1" max="16"></span></label>
		<label>Treino de velocidade <span>+<input type="number" id="s1" value="0" min="0" max="20"> a cada <input type="number" id="s2" value="4" min="1" max="32"> comp. até <input type="number" id="s3" value="160" min="40" max="300"></span></label>
	</div>
	<div class="botoes"><button class="sec" id="tap">Tap</button><button class="principal" id="mplay">▶ Iniciar</button></div>`;
	let met = null;
	const mostrar = () => {
		$('#mb').textContent = c.bpm;
		$('#mr').value = c.bpm;
	};
	el.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => {
		c.bpm = Math.max(30, Math.min(300, c.bpm + Number(b.dataset.d)));
		mostrar();
		if (met) reiniciar();
	}));
	$('#mr').oninput = (e) => {
		c.bpm = Number(e.target.value);
		mostrar();
	};
	$('#mr').onchange = () => met && reiniciar();
	const taps = [];
	$('#tap').onclick = () => {
		const t = performance.now();
		taps.push(t);
		while (taps.length > 6) taps.shift();
		if (taps.length >= 3) {
			const difs = taps.slice(1).map((v, i) => v - taps[i]);
			c.bpm = Math.round(60000 / (difs.reduce((a, b) => a + b) / difs.length));
			mostrar();
		}
	};
	const ler = () => {
		const comp = $('#mc').value;
		c.compasso = comp.includes('/') ? comp : Number(comp);
		c.grupos = comp === '7/8' ? [2, 2, 3] : comp === '5/8' ? [3, 2] : comp === '6/8' ? [3, 3] : null;
		c.subdiv = Number($('#ms').value);
		c.modo = $('#mm').value === 'normal' && c.subdiv > 1 ? 'subdiv' : $('#mm').value;
		c.gap = [Number($('#g1').value), Number($('#g2').value)];
		const mais = Number($('#s1').value);
		c.subir = mais > 0 ? {mais, cada: Number($('#s2').value), ate: Number($('#s3').value)} : null;
		const n = typeof c.compasso === 'string' ? Number(c.compasso.split('/')[0]) : c.compasso;
		$('#pulsos').innerHTML = Array.from({length: n}, (_, i) => `<span data-i="${i}"></span>`).join('');
	};
	const iniciar = () => {
		ler();
		met = A.metronomo(c, (info) => {
			el.querySelectorAll('#pulsos span').forEach((s) => s.classList.toggle('on', Number(s.dataset.i) === info.pulso && info.toca));
			el.querySelectorAll('#pulsos span').forEach((s) => s.classList.toggle('mudo', !info.toca));
			if (info.bpm !== c.bpm) {
				c.bpm = info.bpm;
				mostrar();
			}
		});
		$('#mplay').textContent = '■ Parar';
	};
	const pararM = () => {
		met?.parar();
		met = null;
		$('#mplay').textContent = '▶ Iniciar';
	};
	const reiniciar = () => {
		pararM();
		iniciar();
	};
	el.querySelectorAll('select, input[type=number]').forEach((i) => (i.onchange = () => (met ? reiniciar() : ler())));
	$('#mplay').onclick = () => (met ? pararM() : iniciar());
	parar.push(() => met?.parar());
	ler();
}

function ferrGroove(el) {
	const gs = E.grooves;
	el.innerHTML = `<div class="form">
		<label>Estilo <select id="gg">${gs.map((g) => `<option value="${g.id}">${esc(g.nome)}</option>`).join('')}</select></label>
		<label>BPM <input type="number" id="gb" min="40" max="300"></label>
		<label class="largo">Acordes <input type="text" id="gp" placeholder="| Dm7 | G7 | Cmaj7 |"></label>
		<label>Baixo de exemplo <select id="gx"><option value="nenhum">nenhum (você toca)</option><option value="raiz">raiz no padrão</option><option value="walking">walking</option></select></label>
	</div>
	<p class="sub">Para gravar com acompanhamento e avaliar, use fone com fio no celular; senão a bateria entra no microfone.</p>
	<div class="botoes"><button class="principal" id="gplay">▶ Tocar</button></div>`;
	let tocando = null;
	const preencher = () => {
		const g = E.groovePorId($('#gg').value);
		$('#gb').value = g.bpm;
		$('#gp').value = g.progressao ?? '';
	};
	preencher();
	const tocar = () => {
		const g = E.groovePorId($('#gg').value);
		const prog = $('#gp').value.trim();
		try {
			if (prog) parseProgressao(prog);
		} catch (e) {
			alert(`Acordes: ${e.message}`);
			return;
		}
		const baixo = $('#gx').value;
		const linhaWalking = baixo === 'walking' && prog ? gerarWalking({progressao: prog, semente: E.hoje()}) : null;
		tocando = A.tocarGroove(g, {bpm: Number($('#gb').value), progressao: prog || null, baixo, linhaWalking});
		$('#gplay').textContent = '■ Parar';
	};
	const pararG = () => {
		tocando?.parar();
		tocando = null;
		$('#gplay').textContent = '▶ Tocar';
	};
	$('#gg').onchange = () => {
		preencher();
		if (tocando) {
			pararG();
			tocar();
		}
	};
	el.querySelectorAll('#gb, #gp, #gx').forEach((i) => (i.onchange = () => tocando && (pararG(), tocar())));
	$('#gplay').onclick = () => (tocando ? pararG() : tocar());
	parar.push(() => tocando?.parar());
}

function ferrAfinador(el) {
	const afin = AFINACOES[E.estado.config.afinacao];
	el.innerHTML = `<div class="afinador"><div class="nota-af" id="an">–</div><div class="cents" id="ac">toque uma corda solta</div>
	<div class="medidor"><div class="ponteiro" id="ap"></div><div class="centro-m"></div></div></div>
	<div class="botoes">${afin.map((c) => `<button class="sec" data-ref="${CORDAS[c]}">${c}</button>`).join('')}</div>
	<p class="sub centro">Botões tocam a nota de referência.</p>
	<div class="botoes"><button class="principal" id="aon">🎤 Ligar afinador</button></div>`;
	el.querySelectorAll('[data-ref]').forEach((b) => (b.onclick = () => A.notaBaixo(Number(b.dataset.ref), A.agora() + 0.05, 2, {acento: true})));
	$('#aon').onclick = async () => {
		let stream;
		try {
			stream = await A.abrirMicrofone();
		} catch (e) {
			$('#ac').textContent = 'Microfone negado.';
			return;
		}
		$('#aon').remove();
		const ctx = A.audio();
		const src = ctx.createMediaStreamSource(stream);
		const an = ctx.createAnalyser();
		an.fftSize = 8192;
		src.connect(an);
		const buf = new Float32Array(an.fftSize);
		let suave = null;
		const id = setInterval(() => {
			an.getFloatTimeDomainData(buf);
			const m = alturaAoVivo(buf, ctx.sampleRate);
			if (m == null) return;
			suave = suave == null || Math.abs(m - suave) > 0.7 ? m : suave * 0.6 + m * 0.4;
			const alvo = Math.round(suave);
			const cents = (suave - alvo) * 100;
			$('#an').textContent = nomeMidi(alvo);
			$('#ac').textContent = `${cents > 0 ? '+' : ''}${cents.toFixed(0)} cents · ${(440 * Math.pow(2, (suave - 69) / 12)).toFixed(1)} Hz`;
			$('#ap').style.left = `${50 + Math.max(-50, Math.min(50, cents))}%`;
			$('#ap').classList.toggle('certo', Math.abs(cents) < 4);
		}, 80);
		parar.push(() => {
			clearInterval(id);
			src.disconnect();
			A.fecharMicrofone(stream);
		});
	};
}

function ferrLivre(el) {
	el.innerHTML = `<p class="sub">Grave qualquer coisa sobre o clique (desafios, linhas suas, improviso). Avalia tempo na grade escolhida, dinâmica, e as notas se você escolher uma escala.</p>
	<div class="form">
		<label>BPM <input type="number" id="lb" value="90" min="40" max="300"></label>
		<label>Compassos <input type="number" id="lc" value="8" min="2" max="64"></label>
		<label>Grade <select id="lg"><option value="1">semínima</option><option value="0.5" selected>colcheia</option><option value="0.3333333">tercina</option><option value="0.25">semicolcheia</option></select></label>
		<label>Clique <select id="lk"><option value="normal">todo tempo</option><option value="2e4">só 2 e 4</option><option value="1">só no 1</option></select></label>
		<label>Escala (opcional) <span><select id="lt"><option value="">–</option>${NOMES.map((n) => `<option>${n}</option>`).join('')}</select>
		<select id="le">${Object.keys(ESCALAS).map((n) => `<option>${n}</option>`).join('')}</select></span></label>
	</div>
	<div class="botoes"><button class="principal" id="lgo">● Gravar</button></div>
	<p class="sub centro" id="status"></p><div id="resultado"></div>`;
	$('#lgo').onclick = async () => {
		const bpm = Number($('#lb').value);
		const comp = Number($('#lc').value);
		const tom = $('#lt').value;
		const d = {id: 'livre', titulo: 'Livre', click: $('#lk').value, voltas: 1, modo: tom ? 'conjunto' : 'grade', grade: Number($('#lg').value),
			conjunto: tom ? {tom, escala: $('#le').value} : null, criterios: {notas: 90}, bpm: {inicio: bpm, meta: bpm, passo: 0}, modulo: {titulo: ''}};
		const eventos = [{t: 0, d: comp * 4, pausa: true}];
		const st = $('#status');
		let stream;
		try {
			stream = await A.abrirMicrofone();
		} catch (e) {
			st.textContent = 'Microfone negado.';
			return;
		}
		parar.push(() => A.fecharMicrofone(stream));
		const rec = A.gravar(stream);
		await new Promise((r) => setTimeout(r, 150));
		const ag = agendarCliques(d, bpm, 4, comp * 4);
		const tick = setInterval(() => (st.textContent = `Gravando · ${Math.max(0, ag.fim - A.agora()).toFixed(0)} s`), 200);
		await new Promise((r) => setTimeout(r, (ag.fim - A.agora() + 0.5) * 1000));
		clearInterval(tick);
		const take = await rec.parar();
		A.fecharMicrofone(stream);
		if (!take) return;
		st.textContent = 'Analisando…';
		await new Promise((r) => setTimeout(r, 30));
		const ctx = A.audio();
		const palpite = E.estado.config.latencia ?? (ctx.outputLatency || 0) + (ctx.baseLatency || 0) + 0.02;
		const refinada = refinarLatencia(take.dados, take.sr, take.inicioCtx, ag.cliques, palpite);
		const res = analisarTake(d, eventos, 4, bpm, take, ag, refinada ?? palpite, refinada != null || E.estado.config.latencia != null);
		const id = `${Date.now()}`;
		E.guardarTake({id, drill: 'livre', bpm, sr: take.sr, dados: take.dados, data: E.hoje()});
		st.textContent = '';
		mostrarResultado(res, d, `Gravação livre a ${bpm} BPM.`, id);
	};
}

function ferrCalibrar(el) {
	const c = E.estado.config;
	el.innerHTML = `<p>A calibração mede quanto tempo o som leva do alto-falante até o microfone do seu celular. Com ela, o app sabe se você está <b>adiantado ou atrasado</b>, e não só se está regular.</p>
	<ol class="passos"><li>Tire o fone. Volume do celular em ~70%.</li><li>Ambiente quieto, celular parado na mesa.</li><li>Toque em Calibrar e não faça barulho por 6 segundos.</li></ol>
	<p class="info">${c.latencia != null ? `Calibrado: ${(c.latencia * 1000).toFixed(0)} ms em ${c.latenciaData}.` : 'Ainda não calibrado.'}</p>
	<div class="botoes"><button class="principal" id="cal">Calibrar</button></div><p class="sub centro" id="cst"></p>
	<p class="sub">Durante os takes o app também procura o clique dentro da gravação e ajusta a latência sozinho, quando consegue ouvi-lo. Com fone, vale a calibração feita aqui. Fone Bluetooth atrasa 150-300 ms e varia: não use.</p>`;
	$('#cal').onclick = async () => {
		const st = $('#cst');
		let stream;
		try {
			stream = await A.abrirMicrofone();
		} catch {
			st.textContent = 'Microfone negado.';
			return;
		}
		const rec = A.gravar(stream);
		await new Promise((r) => setTimeout(r, 300));
		const t0 = A.agora() + 0.3;
		const cliques = Array.from({length: 10}, (_, i) => t0 + i * 0.5);
		const vol = A.volumes.click;
		A.volumes.click = 1;
		cliques.forEach((t) => A.click(t, 1));
		st.textContent = 'Ouvindo…';
		await new Promise((r) => setTimeout(r, (cliques.at(-1) - A.agora() + 0.7) * 1000));
		A.volumes.click = vol;
		const take = await rec.parar();
		A.fecharMicrofone(stream);
		const r = take && medirLatencia(take.dados, take.sr, take.inicioCtx, cliques);
		if (!r || r.espalhamento > 6) {
			st.textContent = r ? `Medição instável (±${r.espalhamento.toFixed(1)} ms). Aumente o volume e repita.` : 'Não ouvi os cliques. Aumente o volume, tire o fone e repita.';
			return;
		}
		c.latencia = r.latencia;
		c.latenciaData = E.hoje();
		E.salvar();
		st.textContent = `Latência: ${(r.latencia * 1000).toFixed(0)} ms (±${r.espalhamento.toFixed(1)} ms, ${r.n} cliques). Salvo.`;
		ferrCalibrar(el);
		$('#cst').textContent = st.textContent;
	};
}

// ---------- Ajustes ----------
function telaAjustes() {
	const c = E.estado.config;
	const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
	const totalMin = Math.round(Object.values(E.estado.sessoes).reduce((a, b) => a + b, 0));
	const takes = Object.values(E.estado.drills).reduce((a, p) => a + (p.tentativas ?? 0), 0);
	const ult = [...Array(28)].map((_, i) => {
		const d = new Date();
		d.setDate(d.getDate() - 27 + i);
		return {k: E.hoje(d), v: E.estado.sessoes[E.hoje(d)] ?? 0};
	});
	const vmax = Math.max(30, ...ult.map((u) => u.v));
	tela.innerHTML = `<header class="topo"><div><h1>Ajustes</h1></div></header>
	<div class="medidas"><div><span>Prática total</span><b>${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, '0')}</b></div><div><span>Takes</span><b>${takes}</b></div><div><span>Sequência</span><b>${E.sequencia()}</b></div></div>
	<svg viewBox="0 0 280 60" class="grafico" width="100%">${ult.map((u, i) => `<rect x="${i * 10}" y="${58 - (u.v / vmax) * 54}" width="8" height="${(u.v / vmax) * 54 + 1}" class="${u.v >= c.minutos ? 'aprov' : 'barra-normal'}"><title>${u.k}: ${Math.round(u.v)} min</title></rect>`).join('')}</svg>
	<p class="sub">Minutos por dia, últimas 4 semanas (verde = meta batida).</p>
	<h2>Rotina</h2>
	<div class="form">
		<label>Minutos por dia <select id="cm">${[20, 30, 45, 60, 90].map((m) => `<option ${m === c.minutos ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
		<label>Horário do lembrete <input type="time" id="cl" value="${c.lembrete}"></label>
		<label class="largo">Dias <span class="dias">${dias.map((d, i) => `<label><input type="checkbox" data-dia="${i}" ${c.dias.includes(i) ? 'checked' : ''}>${d}</label>`).join('')}</span></label>
		<label>Afinação <select id="ca"><option value="EADG" ${c.afinacao === 'EADG' ? 'selected' : ''}>4 cordas (EADG)</option><option value="BEADG" ${c.afinacao === 'BEADG' ? 'selected' : ''}>5 cordas (BEADG)</option></select></label>
	</div>
	<div class="botoes"><button class="principal" id="ics">Adicionar lembrete ao calendário</button></div>
	<p class="sub">Baixa um evento que repete nos dias marcados, com alarme. No iPhone, abra e toque em "Adicionar todos"; no Android, abra com o Google Agenda. O alarme toca mesmo com o app fechado.</p>
	<h2>Backup</h2>
	<p class="sub">O progresso fica guardado neste aparelho. Exporte de vez em quando: o arquivo também serve para o Claude analisar sua evolução (coloque em <code>entrada/</code> na pasta do curso).</p>
	<div class="botoes"><button class="sec" id="exp">Exportar progresso</button><label class="sec botao-arquivo">Importar<input type="file" id="imp" accept=".json,application/json"></label></div>
	<h2>Instalar no celular</h2>
	<p class="sub" id="inst">Android (Chrome): menu ⋮ › Instalar app. iPhone (Safari): Compartilhar › Adicionar à Tela de Início.</p>
	<div class="botoes"><button class="sec" id="instalar" hidden>Instalar agora</button></div>
	<p class="sub rodape">Baixo Avançado · funciona sem internet depois de aberto uma vez.</p>`;
	const salvarCfg = () => {
		c.minutos = Number($('#cm').value);
		c.lembrete = $('#cl').value || '19:30';
		c.dias = [...tela.querySelectorAll('[data-dia]')].filter((x) => x.checked).map((x) => Number(x.dataset.dia));
		const mudouAfin = c.afinacao !== $('#ca').value;
		c.afinacao = $('#ca').value;
		E.salvar();
		if (mudouAfin || true) delete E.estado.planos[E.hoje()];
	};
	tela.querySelectorAll('select, input[type=time], input[type=checkbox]').forEach((i) => (i.onchange = salvarCfg));
	$('#ics').onclick = () => baixar('lembrete-baixo.ics', E.arquivoLembrete(), 'text/calendar');
	$('#exp').onclick = () => baixar(`baixo-progresso-${E.hoje()}.json`, E.exportar(), 'application/json');
	$('#imp').onchange = async (e) => {
		const f = e.target.files[0];
		if (!f) return;
		try {
			E.importar(await f.text());
			alert('Progresso importado.');
			telaAjustes();
		} catch (err) {
			alert(err.message);
		}
	};
	if (instalacao) {
		$('#instalar').hidden = false;
		$('#instalar').onclick = async () => {
			instalacao.prompt();
			await instalacao.userChoice;
			instalacao = null;
			$('#instalar').hidden = true;
		};
	}
}
function baixar(nome, conteudo, tipo) {
	const url = URL.createObjectURL(new Blob([conteudo], {type: tipo}));
	const a = Object.assign(document.createElement('a'), {href: url, download: nome});
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 2000);
}

let instalacao = null;
window.addEventListener('beforeinstallprompt', (e) => {
	e.preventDefault();
	instalacao = e;
});

// ---------- início ----------
(async () => {
	try {
		await E.carregarPrograma();
	} catch (e) {
		tela.innerHTML = `<p class="erro">Não carregou o programa (${esc(e.message)}). Abra pelo endereço do app, não pelo arquivo.</p>`;
		return;
	}
	if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
	navigator.storage?.persist?.();
	A.volumes.click = E.estado.config.volumeClick ?? 0.8;
	ir();
})();
