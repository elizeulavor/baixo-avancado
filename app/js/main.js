// Telas do app. Hoje (treino guiado), Mapa (trilhas e provas), Drill (gravação e avaliação),
// Ferramentas (metrônomo, groove, afinador, jogo do braço, estudo de música, gravação livre,
// calibração) e Perfil (nível, radar, conquistas, recordes, ajustes).
import * as E from './estado.js';
import * as A from './audio.js';
import * as J from './jogo.js';
import {avaliar, medirLatencia, refinarLatencia, alturaAoVivo} from './analise.js';
import {renderTab} from './tab.js';
import {parseProgressao, conjuntoEscala, freqMidi, nomeMidi, nomePc, CORDAS, AFINACOES, gerarWalking, NOMES, ESCALAS} from './musica.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const tela = $('#tela');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const fmt = (v, d = 0) => (v == null || Number.isNaN(v) ? '–' : Number(v).toFixed(d));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let parar = [];
const limpar = () => {
	parar.forEach((f) => {
		try { f(); } catch {}
	});
	parar = [];
};

// ---------- peças visuais ----------
function anel(frac, {tam = 44, esp = 4, cor = 'url(#gOuro)', fundo = true} = {}) {
	const r = (tam - esp) / 2;
	const c = 2 * Math.PI * r;
	return `<svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}"><defs>
		<linearGradient id="gOuro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5b84a"/><stop offset="1" stop-color="#ff7a3d"/></linearGradient>
		<linearGradient id="gRoxo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c3b8ff"/><stop offset="1" stop-color="#7c6cff"/></linearGradient>
		<linearGradient id="gVerde" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7af0bf"/><stop offset="1" stop-color="#22b979"/></linearGradient></defs>
		${fundo ? `<circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" stroke-width="${esp}" class="trilho"/>` : ''}
		<circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" stroke-width="${esp}" class="progresso-anel" stroke="${cor}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-alvo="${c * (1 - Math.max(0, Math.min(1, frac)))}"/></svg>`;
}
// anima anéis e números depois de pintar
function animar(raiz = tela) {
	requestAnimationFrame(() => requestAnimationFrame(() => {
		$$('.progresso-anel', raiz).forEach((c) => c.setAttribute('stroke-dashoffset', c.dataset.alvo));
		$$('[data-conta]', raiz).forEach((el) => {
			const alvo = Number(el.dataset.conta);
			const t0 = performance.now();
			const passo = (t) => {
				const k = Math.min(1, (t - t0) / 900);
				el.textContent = Math.round(alvo * (1 - Math.pow(1 - k, 3)));
				if (k < 1) requestAnimationFrame(passo);
			};
			requestAnimationFrame(passo);
			setTimeout(() => (el.textContent = alvo), 1100); // sem animação (aba em segundo plano), o número final aparece igual
		});
	}));
}
function confete(n = 70) {
	const c = document.createElement('div');
	c.className = 'confete';
	const cores = ['#f5b84a', '#ff7a3d', '#3ddc97', '#9c8cff', '#f2efe8'];
	c.innerHTML = Array.from({length: n}, () => `<i style="left:${Math.random() * 100}%;background:${cores[Math.floor(Math.random() * 5)]};animation-duration:${1.6 + Math.random() * 1.6}s;animation-delay:${Math.random() * 0.4}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join('');
	document.body.appendChild(c);
	setTimeout(() => c.remove(), 3800);
}
let caixaToasts = null;
function toast(icone, titulo, texto) {
	caixaToasts ??= Object.assign(document.createElement('div'), {className: 'toasts'});
	if (!caixaToasts.isConnected) document.body.appendChild(caixaToasts);
	const t = document.createElement('div');
	t.className = 'toast';
	t.innerHTML = `<div class="medalha">${esc(icone)}</div><div><b>${esc(titulo)}</b><small>${esc(texto)}</small></div>`;
	caixaToasts.appendChild(t);
	setTimeout(() => t.remove(), 4300);
}
function modal(html, aoFechar) {
	const m = document.createElement('div');
	m.className = 'modal';
	m.innerHTML = `<div class="caixa">${html}<button class="principal grande" data-fechar>Continuar</button></div>`;
	m.querySelector('[data-fechar]').onclick = () => {
		m.remove();
		aoFechar?.();
	};
	document.body.appendChild(m);
}
// Comemora o que o jogo devolveu: som de instrumento real, confete, toasts e modal de nível.
function comemorar(eventos, aprovado) {
	if (aprovado) {
		A.somUI('aprovado');
		navigator.vibrate?.(30);
	}
	let atraso = 900;
	for (const e of eventos) {
		if (e.tipo === 'conquista') {
			setTimeout(() => {
				A.somUI('conquista');
				toast(e.conquista.icone, `Conquista: ${e.conquista.nome}`, `${e.conquista.desc} · +${e.conquista.xp} XP`);
			}, atraso);
			atraso += 900;
		} else if (e.tipo === 'dominado') setTimeout(() => toast('★', 'Drill dominado', e.drill.titulo), (atraso += 700));
		else if (e.tipo === 'escudo') setTimeout(() => toast('🛡', 'Escudo ganho', 'Protege um dia perdido da sequência'), (atraso += 700));
		else if (e.tipo === 'dia') setTimeout(() => toast('🔥', 'Treino do dia completo', `Sequência: ${E.sequencia()} dias · +100 XP`), (atraso += 700));
	}
	const nv = eventos.find((e) => e.tipo === 'nivel');
	const pv = eventos.find((e) => e.tipo === 'prova');
	if (aprovado || nv || pv) confete(nv || pv ? 140 : 60);
	if (nv) setTimeout(() => {
		A.somUI('nivel');
		modal(`<p class="peq">NOVO NÍVEL</p><div class="grande-num">${nv.nivel}</div><h3 style="margin-top:10px">${esc(nv.titulo)}</h3><p class="sub">${nv.novoTitulo ? 'Novo título desbloqueado.' : `Faltam ${J.nivel().falta} XP para o próximo.`}</p>`);
	}, atraso + 300);
	if (pv) setTimeout(() => {
		A.somUI('nivel');
		modal(`<p class="peq">PROVA FINAL</p><div class="grande-num">🎓</div><h3 style="margin-top:10px">${esc(pv.modulo.titulo)}</h3><p class="sub">Módulo concluído. +500 XP. O próximo módulo da trilha está aberto.</p>`);
	}, atraso + 600);
}

// ---------- roteador ----------
const rotas = {hoje: telaHoje, mapa: telaMapa, modulo: telaModulo, drill: telaDrill, prova: telaProva, desafio: telaDesafio, fim: telaFim, ferramentas: telaFerramentas, perfil: telaPerfil};
function ir() {
	limpar();
	const [caminho, q = ''] = (location.hash.slice(1) || 'hoje').split('?');
	const [nome, arg] = caminho.split('/');
	const params = new URLSearchParams(q);
	(rotas[nome] ?? telaHoje)(arg, params);
	const aba = {drill: 'mapa', modulo: 'mapa', prova: 'mapa', desafio: 'hoje', fim: 'hoje'}[nome] ?? nome;
	$$('nav a').forEach((a) => a.classList.toggle('ativo', a.getAttribute('href') === `#${aba}`));
	window.scrollTo(0, 0);
}
window.addEventListener('hashchange', ir);

// tempo de prática: conta enquanto o app está aberto num drill ou ferramenta; pausa para as mãos a cada 30 min
let ultimaPausa = 0;
setInterval(() => {
	const r = location.hash.slice(1).split(/[/?]/)[0];
	if (document.visibilityState !== 'visible' || !['drill', 'ferramentas', 'prova', 'desafio'].includes(r)) return;
	E.adicionarMinutos(0.5);
	const m = E.estado.sessoes[E.hoje()] ?? 0;
	if (Math.floor(m / 30) > ultimaPausa && m >= 30) {
		ultimaPausa = Math.floor(m / 30);
		toast('✋', 'Pausa de 2 minutos', 'Solte punhos e ombros, alongue os dedos. Tendinite custa meses.');
	}
}, 30000);

// ---------- treino guiado ----------
const chave = E.chaveItem;
function proximoItem() {
	const p = E.planoDoDia();
	return p.itens.find((i) => i.tipo !== 'escudo' && !p.feitos[chave(i)]);
}
function linkItem(i, sessao = true) {
	const s = sessao ? 's' : '';
	if (i.tipo === 'drill') return `#drill/${i.id}?${[s, i.revisao ? 'meta' : ''].filter(Boolean).join('&')}`;
	if (i.tipo === 'prova') return `#prova/${i.modulo}?${s}`;
	return `#desafio?${s}`;
}
function seguirTreino() {
	const i = proximoItem();
	location.hash = i ? linkItem(i) : '#fim';
}
function xpPrevisto(i) {
	if (i.tipo === 'prova') return 500;
	if (i.tipo === 'desafio') return 30;
	const d = E.drillPorId(i.id);
	return d ? Math.round(40 * (1 + E.fracao(d))) : 40;
}

// ---------- Hoje ----------
function telaHoje() {
	const plano = E.planoDoDia();
	const f = E.feitoNoPlano(plano);
	const seq = E.sequencia();
	const j = J.estadoJogo();
	const nv = J.nivel();
	const min = Math.round(E.estado.sessoes[E.hoje()] ?? 0);
	const hora = new Date().getHours();
	const oi = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
	const prox = proximoItem();
	const xpTotal = plano.itens.filter((i) => !plano.feitos[chave(i)]).reduce((s, i) => s + xpPrevisto(i), 0) + (j.diasPlano[E.hoje()] ? 0 : 100);
	const semana = [...Array(7)].map((_, k) => {
		const d = new Date();
		d.setDate(d.getDate() - 6 + k);
		const kk = E.hoje(d);
		const p = E.estado.planos[kk];
		const feito = p && E.feitoNoPlano(p).pct >= 0.8;
		const escudo = j.escudosUsados.includes(kk);
		return `<div class="${escudo ? 'escudo' : feito ? 'feito' : ''} ${k === 6 ? 'hoje' : ''}">${'DSTQQSS'[d.getDay()]}<i>${escudo ? '🛡' : feito ? '✓' : ''}</i></div>`;
	}).join('');
	tela.innerHTML = `
	<div class="topo">
		<div><div class="saudacao">${oi} · ${new Date().toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'short'})}</div><h1>Hoje</h1></div>
		<div class="status">
			<div class="pilula fogo ${seq ? '' : 'apagado'}"><span class="ic">🔥</span><b class="num">${seq}</b></div>
			${j.escudos ? `<div class="pilula"><span class="ic">🛡</span><b class="num">${j.escudos}</b></div>` : ''}
			<a class="anel-nivel" href="#perfil" title="Nível ${nv.n}">${anel(nv.frac)}<b>${nv.n}</b></a>
		</div>
	</div>
	<div class="heroi entra">
		<div class="linha-heroi">
			<div class="anel-dia">${anel(f.pct, {tam: 92, esp: 8})}<b>${Math.round(f.pct * 100)}%</b><small>${f.feitos}/${f.total}</small></div>
			<div>
				<h3>${f.pct >= 1 ? 'Treino concluído' : f.feitos ? 'Continue de onde parou' : 'Treino de hoje'}</h3>
				<p class="sub">${plano.itens.length} etapas · ${E.estado.config.minutos} min · ${min} min feitos</p>
				${xpTotal && f.pct < 1 ? `<span class="xp-tag">até +${xpTotal} XP</span>` : `<span class="xp-tag">+${J.xpHoje()} XP hoje</span>`}
			</div>
		</div>
		<button class="principal grande" id="comecar">${f.pct >= 1 ? 'Ver resumo do dia' : f.feitos ? 'Continuar treino' : 'Começar treino'}</button>
	</div>
	<div class="semana">${semana}</div>
	${E.estado.config.latencia == null ? `<a class="aviso" href="#ferramentas/calibrar"><b>Calibre antes do primeiro take (30 s).</b> Sem isso o app mede a regularidade, mas não sabe se você está adiantado ou atrasado.</a>` : ''}
	<h2>Etapas</h2>
	<div class="missoes">${plano.itens.map((i) => cartaoMissao(i, plano, prox)).join('')}</div>
	<button class="fantasma-btn" id="refazer" style="width:100%">Sortear outro plano para hoje</button>`;
	$('#comecar').onclick = () => (f.pct >= 1 ? (location.hash = '#fim') : seguirTreino());
	$('#refazer').onclick = () => {
		E.refazerPlano();
		telaHoje();
	};
	animar();
}
function cartaoMissao(i, plano, prox) {
	const feito = plano.feitos[chave(i)];
	if (i.tipo === 'escudo') return `<div class="missao feito entra"><div class="icone">🛡</div><div><div class="papel">Escudo usado</div><h3>Sequência protegida</h3></div><div></div></div>`;
	if (i.tipo === 'desafio') {
		return `<a class="missao entra ${feito ? 'feito' : ''}" href="#desafio"><div class="icone">⚑</div><div><div class="papel">${esc(i.papel)} · ${i.minutos} min</div><h3>${esc(i.texto.slice(0, 70))}${i.texto.length > 70 ? '…' : ''}</h3></div><div class="lado"><span class="xp-tag">+30</span></div></a>`;
	}
	if (i.tipo === 'prova') {
		const m = E.programa.modulos.find((x) => x.id === i.modulo);
		return `<a class="missao prova entra ${feito ? 'feito' : ''}" href="${linkItem(i, false)}"><div class="icone">🎓</div><div><div class="papel">${esc(i.papel)}</div><h3>${esc(m?.titulo)}</h3><div class="meta-linha">3 drills seguidos acima da meta</div></div><div class="lado"><span class="xp-tag">+500</span></div></a>`;
	}
	const d = E.drillPorId(i.id);
	if (!d) return '';
	const p = E.progresso(d);
	const bpm = i.revisao ? d.bpm.meta : p.bpm;
	const ic = i.papel.startsWith('Aquec') ? '♨' : i.revisao ? '↻' : /Leitura/.test(i.papel) ? '𝄞' : /Ouvido/.test(i.papel) ? '👂' : d.modulo.trilha === 'A' ? '♩' : '♯';
	return `<a class="missao entra trilha${d.modulo.trilha} ${feito ? 'feito' : ''} ${prox === i ? 'proxima' : ''}" href="${linkItem(i, false)}">
		<div class="icone">${ic}</div>
		<div><div class="papel">${esc(i.papel)} · ${i.minutos} min</div><h3>${esc(d.titulo)}</h3>
		<div class="meta-linha"><b class="num">${bpm}</b> BPM · meta ${d.bpm.meta}${p.ultimo ? ` · última nota ${p.ultimo.nota}` : ''}</div>
		<div class="barrinha"><div style="width:${E.fracao(d) * 100}%"></div></div></div>
		<div class="lado"><span class="xp-tag">+${xpPrevisto(i)}</span></div></a>`;
}

// ---------- Mapa ----------
let trilhaMapa = 'A';
function telaMapa() {
	const total = E.todosDrills().length;
	const dom = E.todosDrills().filter(E.dominado).length;
	const ativo = E.moduloAtivo(trilhaMapa);
	const mods = E.programa.modulos.filter((m) => m.trilha === trilhaMapa);
	tela.innerHTML = `<div class="topo"><div><div class="saudacao">${dom} de ${total} drills dominados</div><h1>Mapa</h1></div></div>
	<div class="abas-trilha"><button data-t="A" class="${trilhaMapa === 'A' ? 'ativo' : ''}">Mão, tempo e groove</button><button data-t="B" class="${trilhaMapa === 'B' ? 'ativo' : ''}">Harmonia e linguagem</button></div>
	<div class="caminho">${mods.map((m, k) => {
		const pct = E.progressoModulo(m);
		const est = E.moduloConcluido(m) ? 'feito' : m === ativo ? 'atual' : mods.indexOf(ativo) < k ? 'adiante' : '';
		const cor = trilhaMapa === 'A' ? 'url(#gOuro)' : 'url(#gRoxo)';
		return `<a class="no ${m.trilha} ${est} entra" href="#modulo/${m.id}">
			<div class="bola">${anel(pct, {tam: 88, esp: 6, cor})}<div class="dentro">${est === 'feito' ? '✓' : k + 1}</div></div>
			<div class="info-no"><h3>${esc(m.titulo)}</h3><div class="estado">${est === 'feito' ? 'concluído com prova' : E.provaPendente(m) ? 'prova final liberada' : est === 'atual' ? `em curso · ${Math.round(pct * 100)}%` : est === 'adiante' ? 'adiante (já pode treinar)' : `${Math.round(pct * 100)}%`}</div></div></a>`;
	}).join('')}</div>`;
	$$('[data-t]').forEach((b) => (b.onclick = () => {
		trilhaMapa = b.dataset.t;
		telaMapa();
	}));
	animar();
}
function telaModulo(id) {
	const m = E.programa.modulos.find((x) => x.id === id);
	if (!m) return (location.hash = '#mapa');
	const liberada = J.provaLiberada(m);
	const passou = J.moduloConcluido(m);
	const dom = m.drills.filter(E.dominado).length;
	tela.innerHTML = `<a class="voltar" href="#mapa">‹ Mapa</a>
	<span class="etiqueta ${m.trilha}">Trilha ${m.trilha}</span><h1>${esc(m.titulo)}</h1><p class="objetivo">${esc(m.meta)}</p>
	<div class="cartao" style="margin-top:14px">
		<div class="peq">${dom} de ${m.drills.length} dominados</div><div class="barrinha ${m.trilha === 'B' ? 'b' : ''}"><div style="width:${E.progressoModulo(m) * 100}%"></div></div>
		${m.drills.map((d) => {
			const p = E.estado.drills[d.id];
			const domi = E.dominado(d);
			return `<a class="drill-linha" href="#drill/${d.id}"><span class="est ${domi ? 'dom' : p?.tentativas ? 'and' : ''}">${domi ? '★' : p?.tentativas ? '◐' : '○'}</span><span>${esc(d.titulo)}</span><span class="peq num">${p?.tentativas ? p.bpm : d.bpm.inicio}→${d.bpm.meta}</span></a>`;
		}).join('')}
	</div>
	<div class="cartao-prova ${passou ? 'passou' : liberada ? 'liberada' : ''}">
		<div class="peq">PROVA FINAL</div><h3>${passou ? `Aprovado em ${J.estadoJogo().provas[m.id].passou}` : liberada ? 'Liberada' : 'Bloqueada'}</h3>
		<p class="sub">${passou ? 'Módulo concluído.' : liberada ? '3 drills sorteados, acima da meta, aprovados em sequência. Errou um, recomeça.' : `Domine os ${m.drills.length} drills para liberar (${dom}/${m.drills.length}).`}</p>
		${liberada && !passou ? `<a class="botao principal grande" href="#prova/${m.id}">Fazer a prova · +500 XP</a>` : ''}
	</div>
	${m.desafios?.length ? `<h2>Desafios</h2>${m.desafios.map((t) => `<div class="info">⚑ ${esc(t)}</div>`).join('')}` : ''}`;
}

// ---------- Drill ----------
let ultimoResultado = null;
function telaDrill(id, q) {
	const d = E.drillPorId(id);
	if (!d) return (location.hash = '#mapa');
	const sessao = q.has('s');
	const provaId = q.get('prova');
	const modProva = provaId ? E.programa.modulos.find((m) => m.id === provaId) : null;
	const p = E.progresso(d);
	let bpm = modProva ? J.bpmProva(d) : q.has('meta') ? d.bpm.meta : p.bpm;
	const {eventos, info, tempos} = E.montar(d);
	let oculto = !!d.oculto;
	const crit = {...d.criterios};
	const chips = [
		`tempo ±${crit.tempoDesvio ?? 14} ms`,
		d.modo === 'conjunto' ? `≥${crit.notas ?? 95}% no modo` : d.modo === 'alvos' || d.modo === 'aproximacao' ? `alvos ≥${crit.notas ?? 95}%` : `notas ≥${crit.notas ?? 95}%`,
		d.dinamica?.tipo === 'uniforme' ? `volume ±${d.dinamica.max} dB` : null,
		d.dinamica?.tipo === 'acentos' ? `acentos +${d.dinamica.min} dB` : null,
		d.dinamica?.fantasma ? `ghosts −${d.dinamica.fantasma} dB` : null,
		d.dinamica?.tipo === 'crescendo' ? `crescendo +${d.dinamica.min} dB` : null,
		crit.silencio ? `pausas −${crit.silencio} dB` : null,
		crit.staccato ? `staccato ≤${crit.staccato}%` : null,
		crit.legato ? `legato ≥${crit.legato}%` : null,
	].filter(Boolean);
	const plano = E.planoDoDia();
	const etapas = plano.itens.filter((i) => i.tipo !== 'escudo');
	const prova = modProva ? J.prova(modProva) : null;
	const fracBpm = d.bpm.inicio === d.bpm.meta ? 1 : (bpm - d.bpm.inicio) / (d.bpm.meta - d.bpm.inicio);
	tela.innerHTML = `
	${sessao ? `<div class="barra-sessao"><span>Treino</span><div class="pontos">${etapas.map((i) => `<i class="${plano.feitos[chave(i)] ? 'f' : i.id === d.id ? 'a' : ''}"></i>`).join('')}</div><a href="#hoje">Sair</a></div>` : `<a class="voltar" href="${modProva ? `#prova/${modProva.id}` : `#modulo/${d.modulo.id}`}">‹ ${esc(modProva ? 'Prova final' : d.modulo.titulo)}</a>`}
	<span class="etiqueta ${modProva ? 'prova' : d.modulo.trilha}">${modProva ? `Prova final · etapa ${prova.etapa + 1} de 3` : `Trilha ${d.modulo.trilha} · módulo ${E.programa.modulos.filter((m) => m.trilha === d.modulo.trilha).indexOf(d.modulo) + 1}`}</span>
	<h1>${esc(d.titulo)}</h1>
	<p class="objetivo">${esc(d.objetivo)}</p>
	${d.instrucao ? `<p class="sub">${esc(d.instrucao)}</p>` : ''}
	${info ? `<div class="info">${esc(info)}</div>` : ''}
	${d.progressao ? `<div class="info">Acordes: ${esc(d.progressao)}</div>` : ''}
	<div class="chips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
	<div class="painel-bpm">
		<button class="redondo" id="menos" ${modProva ? 'disabled' : ''}>−</button>
		<div class="bpm"><b id="bpm">${bpm}</b><span>BPM · meta ${d.bpm.meta}${E.dominado(d) ? ' · ★' : ''}</span><div class="meta-bpm"><div style="width:${Math.max(4, Math.min(100, fracBpm * 100))}%"></div></div></div>
		<button class="redondo" id="mais" ${modProva ? 'disabled' : ''}>+</button>
	</div>
	<div id="tab" class="tab-caixa"></div>
	<div class="carregando" id="carga" hidden><div></div></div>
	<div class="estudio">
		<button id="modelo">▶ Modelo</button>
		<button class="gravar" id="gravar"><span id="rotulo-gravar">GRAVAR</span></button>
		<button id="lento">▶ 70%</button>
	</div>
	<div class="nivel-mic"><div id="nivel"></div></div>
	<p class="status-take" id="status">${E.estado.config.latencia == null ? 'Sem calibração: não mede pressa/atraso. <a href="#ferramentas/calibrar">Calibrar</a>' : 'Alto-falante ligado, sem fone Bluetooth. 1 compasso de contagem.'}</p>
	<div id="resultado"></div>
	<div id="historico"></div>`;
	const desenhar = () => {
		if (oculto) {
			$('#tab').innerHTML = `<div class="oculta"><div>Ditado: ouça o modelo e toque sem ver.<br><br><button id="revelar">Mostrar a tablatura</button></div></div>`;
			$('#revelar').onclick = () => {
				oculto = false;
				layout = desenhar();
			};
			return renderTab(eventos, {afin: E.estado.config.afinacao, tempos, largura: Math.min(700, tela.clientWidth - 12)}).layout;
		}
		const r = renderTab(eventos, {afin: E.estado.config.afinacao, tempos, largura: Math.min(700, tela.clientWidth - 12)});
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
	const cursor = (inicio, b, voltas) => {
		const s = 60 / b;
		const total = eventos.at(-1).t + eventos.at(-1).d;
		let raf;
		const passo = () => {
			const el = $('#cursor');
			const t = (A.agora() - inicio) / s;
			if (!el) return;
			if (t > total * voltas) {
				el.setAttribute('x1', -10);
				el.setAttribute('x2', -10);
				return;
			}
			if (t >= 0) {
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
	// sons reais do modelo: carrega com barra na primeira vez
	const carregar = async () => {
		const c = $('#carga');
		if (!c) return;
		c.hidden = false;
		await A.preparar(A.GRUPOS.modelo, (f, t) => c.firstElementChild && (c.firstElementChild.style.width = `${(100 * f) / t}%`));
		c.hidden = true;
	};
	const pronto = carregar();
	const tocarModelo = async (fator) => {
		await pronto;
		limpar();
		const b = Math.round(bpm * fator);
		const r = A.tocarEventos(eventos, {bpm: b, tempos, clickModo: d.click === 'gap' ? 'normal' : d.click, voltas: 1});
		cursor(r.inicio, b, 1);
	};
	$('#modelo').onclick = () => tocarModelo(1);
	$('#lento').onclick = () => tocarModelo(0.7);
	$('#gravar').onclick = async () => {
		await pronto;
		gravarTake(d, eventos, tempos, bpm, cursor, {sessao, modProva});
	};
	historicoDrill(d);
	if (ultimoResultado?.id === d.id && ultimoResultado.agora) {
		mostrarResultado(ultimoResultado, d, {sessao, modProva});
		ultimoResultado.agora = false;
	}
}

function historicoDrill(d) {
	const h = E.estado.drills[d.id]?.historico ?? [];
	if (!h.length) return;
	const ult = h.slice(-30);
	const w = 340, hgt = 100;
	const bpms = ult.map((x) => x.bpm);
	const bmin = Math.min(...bpms, d.bpm.inicio, d.bpm.meta), bmax = Math.max(...bpms, d.bpm.inicio, d.bpm.meta);
	const y = (b) => hgt - 14 - ((b - bmin) / Math.max(1, bmax - bmin)) * (hgt - 28);
	const x = (i) => 12 + (i / Math.max(1, ult.length - 1)) * (w - 24);
	const rec = J.estadoJogo().recordes[d.id];
	$('#historico').innerHTML = `<h2>Sua evolução</h2>
	<svg viewBox="0 0 ${w} ${hgt}" class="grafico" width="100%">
		<line x1="0" x2="${w}" y1="${y(d.bpm.meta)}" y2="${y(d.bpm.meta)}" class="linha-meta"/>
		<text x="${w - 6}" y="${y(d.bpm.meta) - 4}" class="rot" text-anchor="end">meta ${d.bpm.meta}</text>
		<polyline points="${ult.map((v, i) => `${x(i)},${y(v.bpm)}`).join(' ')}" class="trilha"/>
		${ult.map((v, i) => `<circle cx="${x(i)}" cy="${y(v.bpm)}" r="4" class="${v.aprovado ? 'aprov' : 'reprov'}"/>`).join('')}
	</svg>
	<div class="medidas"><div><span>Takes</span><b>${h.length}</b></div><div><span>Aprovados</span><b>${Math.round((100 * h.filter((v) => v.aprovado).length) / h.length)}%</b></div><div><span>Recorde</span><b>${rec?.bpm || '–'}</b></div></div>`;
}

function agendarCliques(d, bpm, tempos, totalTempos) {
	const ctx = A.audio();
	const s = 60 / bpm;
	const den = typeof d.compasso === 'string' ? Number(d.compasso.split('/')[1]) : 4;
	const unidade = den === 8 ? 0.5 : 1;
	const porCompasso = Math.round(tempos / unidade);
	const acentos = d.grupos ? d.grupos.reduce((a, g) => [...a, (a.at(-1) ?? 0) + g], [0]).slice(0, -1) : [0];
	const inicio = ctx.currentTime + 0.4 + tempos * s;
	const cliques = [];
	const contagem = [];
	for (let k = -porCompasso; k < Math.round(totalTempos / unidade); k++) {
		const t = inicio + k * unidade * s;
		const naBarra = ((k % porCompasso) + porCompasso) % porCompasso;
		const compasso = Math.floor(k / porCompasso);
		let toca = true;
		if (k >= 0) {
			if (d.click === '2e4') toca = naBarra % 2 === 1;
			else if (d.click === '1') toca = naBarra === 0;
			else if (d.click === 'gap') toca = compasso % (d.gap[0] + d.gap[1]) < d.gap[0];
		} else contagem.push({t, n: porCompasso + k + 1});
		if (!toca) continue;
		A.click(t, naBarra === 0 ? 1 : acentos.includes(naBarra) ? 0.75 : 0.6);
		cliques.push(t);
	}
	return {inicio, cliques, contagem, fim: inicio + totalTempos * s};
}

// Contagem grande na tela, sincronizada com os cliques
function mostrarContagem(contagem) {
	const el = document.createElement('div');
	el.className = 'contagem';
	document.body.appendChild(el);
	for (const c of contagem) setTimeout(() => (el.innerHTML = `<b>${c.n}</b>`), Math.max(0, (c.t - A.agora()) * 1000));
	setTimeout(() => el.remove(), Math.max(0, (contagem.at(-1).t - A.agora()) * 1000 + 450));
	parar.push(() => el.remove());
}
// Medidor de nível do microfone durante o take
function medidorMic(stream) {
	const ctx = A.audio();
	const src = ctx.createMediaStreamSource(stream);
	const an = ctx.createAnalyser();
	an.fftSize = 1024;
	src.connect(an);
	const buf = new Float32Array(an.fftSize);
	let raf;
	const passo = () => {
		an.getFloatTimeDomainData(buf);
		let p = 0;
		for (const v of buf) p = Math.max(p, Math.abs(v));
		const el = $('#nivel');
		if (el) el.style.width = `${Math.min(100, Math.max(0, (20 * Math.log10(p + 1e-6) + 50) * 2))}%`;
		raf = requestAnimationFrame(passo);
	};
	raf = requestAnimationFrame(passo);
	return () => {
		cancelAnimationFrame(raf);
		src.disconnect();
		const el = $('#nivel');
		if (el) el.style.width = '0';
	};
}

async function gravarTake(d, eventos, tempos, bpm, cursor, ctxTela) {
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
	const pararMedidor = medidorMic(stream);
	parar.push(pararMedidor);
	const voltas = d.voltas ?? 1;
	const total = eventos.at(-1).t + eventos.at(-1).d;
	const rec = A.gravar(stream);
	await espera(150);
	const ag = agendarCliques(d, bpm, tempos, total * voltas);
	mostrarContagem(ag.contagem);
	cursor(ag.inicio, bpm, voltas);
	bt.disabled = true;
	bt.classList.add('ao-vivo');
	bt.insertAdjacentHTML('beforeend', anel(0, {tam: 120, esp: 4, cor: '#fff', fundo: false}));
	const arco = bt.querySelector('.progresso-anel');
	const comp = Number(arco.getAttribute('stroke-dasharray'));
	let cancelado = false;
	parar.push(() => (cancelado = true));
	const tick = setInterval(() => {
		const falta = ag.fim - A.agora();
		const k = Math.max(0, Math.min(1, (A.agora() - ag.inicio) / (ag.fim - ag.inicio)));
		arco.setAttribute('stroke-dashoffset', comp * (1 - k));
		$('#rotulo-gravar').textContent = A.agora() < ag.inicio ? '…' : `${Math.max(0, Math.ceil(falta))}s`;
		st.textContent = A.agora() < ag.inicio ? 'Contagem…' : 'Gravando';
	}, 80);
	await espera((ag.fim - A.agora() + 0.5) * 1000);
	clearInterval(tick);
	const take = await rec.parar();
	A.fecharMicrofone(stream);
	pararMedidor();
	if (cancelado || !take) return;
	bt.classList.remove('ao-vivo');
	$('#rotulo-gravar').textContent = '···';
	st.textContent = 'Analisando tempo, notas, dinâmica e som…';
	await espera(30);
	const ctx = A.audio();
	const palpite = E.estado.config.latencia ?? (ctx.outputLatency || 0) + (ctx.baseLatency || 0) + 0.02;
	const refinada = refinarLatencia(take.dados, take.sr, take.inicioCtx, ag.cliques, palpite);
	const lat = refinada ?? palpite;
	const confiavel = refinada != null || E.estado.config.latencia != null;
	const res = analisarTake(d, eventos, tempos, bpm, take, ag, lat, confiavel);
	const takeId = `${Date.now()}`;
	E.guardarTake({id: takeId, drill: d.id, bpm, sr: take.sr, dados: take.dados, data: E.hoje()});
	const bpmAntes = E.progresso(d).bpm;
	const msg = E.registrarTake(d, bpm, res);
	let ev = J.aposTake(d, bpm, res);
	let msgProva = null;
	if (ctxTela.modProva) {
		ev = ev.concat(J.resultadoProva(ctxTela.modProva, res.aprovado));
		const pv = J.prova(ctxTela.modProva);
		msgProva = pv.passou ? 'Prova concluída.' : res.aprovado ? `Etapa ${pv.etapa} de 3 aprovada.` : 'Reprovou: a prova recomeça da etapa 1.';
		if (pv.passou || !res.aprovado) E.marcarFeito(`prova:${ctxTela.modProva.id}`);
	}
	ultimoResultado = {id: d.id, res, msg: msgProva ?? msg, takeId, eventos: ev, agora: true, lat, refinada, confiavel, bpmAntes};
	ir();
	comemorar(ev, res.aprovado);
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

function mostrarResultado(r, d, {sessao, modProva}) {
	const {res, msg, takeId, eventos = []} = r;
	const el = $('#resultado');
	const crit = res.itens.find((i) => i.nome === 'Regularidade do tempo')?.limite ?? 14;
	const xp = eventos.filter((e) => e.tipo === 'xp').reduce((s, e) => s + e.xp, 0);
	const combo = eventos.find((e) => e.tipo === 'combo');
	const recorde = eventos.find((e) => e.tipo === 'recorde');
	const prova = modProva ? J.prova(modProva) : null;
	const proxEtapa = prova && !prova.passou && res.aprovado ? E.drillPorId(prova.drills[prova.etapa]) : null;
	el.innerHTML = `
	<div class="resultado">
	<div class="placar-take ${res.aprovado ? 'aprovado' : 'reprovado'}">
		<div class="anel">${anel(res.nota / 100, {tam: 120, esp: 10, cor: res.aprovado ? 'url(#gVerde)' : '#ff6b6b'})}<b data-conta="${res.nota}">0</b></div>
		<div><span class="carimbo">${res.aprovado ? 'APROVADO' : 'REPROVADO'}</span><p style="margin-top:10px">${esc(msg)}</p>
		<div class="ganhos">${xp ? `<span>+${xp} XP</span>` : ''}${combo ? `<span class="combo">🔥 combo ×${combo.combo}</span>` : ''}${recorde ? `<span class="recorde">${esc(recorde.texto)}</span>` : ''}</div></div>
	</div>
	<div class="botoes">
		${sessao && !modProva ? `<button class="principal" id="seguir">Próxima etapa ›</button>` : ''}
		${proxEtapa ? `<a class="botao principal" href="#drill/${proxEtapa.id}?prova=${modProva.id}${sessao ? '&s' : ''}">Etapa ${prova.etapa + 1}: ${esc(proxEtapa.titulo)} ›</a>` : ''}
		${prova?.passou && sessao ? `<button class="principal" id="seguir">Próxima etapa ›</button>` : ''}
		<button id="denovo">● Gravar de novo</button>
	</div>
	<div class="metricas">${res.itens.map((i) => {
		const inv = ['Notas certas', 'Acentos', 'Notas fantasma', 'Crescendo', 'Pausas limpas', 'Legato'].includes(i.nome);
		const escala = Math.max(i.limite * 2, Math.abs(i.valor) * 1.1, 1);
		const larg = Math.min(100, (Math.abs(i.valor) / escala) * 100);
		const cls = i.info ? 'neutra' : i.ok ? 'ok' : 'nok';
		return `<div class="metrica ${cls}"><div class="topo-m"><span>${i.info ? '·' : i.ok ? '✓' : '✗'} ${esc(i.nome)}</span><b>${fmt(i.valor, i.unidade === '%' ? 0 : 1)} ${i.unidade}</b></div>
		<small>${inv ? 'mínimo' : 'máximo'} ${i.limite} · ${esc(i.texto)}</small><div class="regua"><div class="val" style="width:${larg}%"></div><div class="lim" style="left:${(i.limite / escala) * 100}%"></div></div></div>`;
	}).join('')}</div>
	${res.dicas.length ? `<ul class="dicas">${res.dicas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
	<h2>Tempo, nota a nota</h2>${graficoTempo(res, crit)}
	<p class="peq">Acima da linha: atrasado. Abaixo: adiantado. Faixa verde: ±${crit} ms. ${fmt(res.tempo.dentro10)}% dentro de ±10 ms.</p>
	<h2>Dinâmica, nota a nota</h2>${graficoDinamica(res)}
	<div class="medidas">
		<div><span>Detectadas</span><b>${res.contagem.tocadas}</b></div>
		<div><span>Esperadas</span><b>${res.contagem.esperadas || '–'}</b></div>
		<div><span>Articulação</span><b>${fmt(res.som.articulacao)}%</b></div>
		<div><span>Pausas</span><b>${res.som.silencio != null ? `−${fmt(res.som.silencio)}` : '–'}</b></div>
		<div><span>Afinação</span><b>${res.notas?.afinacao != null ? `${res.notas.afinacao > 0 ? '+' : ''}${fmt(res.notas.afinacao)}¢` : '–'}</b></div>
		<div><span>Clareza</span><b>${fmt(res.som.clareza)}%</b></div>
	</div>
	<p class="peq">${r.refinada != null ? `Clique achado na gravação (latência ${(r.lat * 1000).toFixed(0)} ms).` : r.confiavel ? `Latência calibrada: ${(r.lat * 1000).toFixed(0)} ms.` : 'Sem calibração: pressa/atraso não avaliados.'}</p>
	<div class="botoes"><button id="ouvir">▶ Ouvir meu take</button></div>
	</div>`;
	$('#ouvir').onclick = async () => {
		const t = await E.lerTake(takeId);
		if (!t) return;
		const src = A.tocarBuffer(t.dados, t.sr);
		parar.push(() => src.stop());
	};
	$('#denovo').onclick = () => $('#gravar').click();
	$$('#seguir').forEach((b) => (b.onclick = seguirTreino));
	animar(el);
	setTimeout(() => el.scrollIntoView({behavior: 'smooth', block: 'start'}), 150);
}

function graficoTempo(res, lim) {
	const pts = res.tempo.pontos;
	if (!pts.length) return '<p class="sub">Nenhuma nota casada com o esperado.</p>';
	const w = 340, h = 120, m = 60;
	const tmax = Math.max(...pts.map((p) => p.t), 1);
	const x = (t) => 10 + (t / tmax) * (w - 20);
	const y = (e) => h / 2 - (Math.max(-m, Math.min(m, e)) / m) * (h / 2 - 8);
	return `<svg viewBox="0 0 ${w} ${h}" class="grafico" width="100%">
		<rect x="0" y="${y(lim)}" width="${w}" height="${y(-lim) - y(lim)}" class="faixa"/>
		<line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" class="zero"/>
		<text x="6" y="13" class="rot">+${m} ms</text><text x="6" y="${h - 5}" class="rot">−${m} ms</text>
		${pts.map((p) => `<circle cx="${x(p.t)}" cy="${y(p.erro)}" r="3" class="${Math.abs(p.erro) <= lim ? 'aprov' : 'reprov'}"/>`).join('')}
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
			return `<rect x="${8 + i * (bw + 1)}" y="${h - hh}" width="${bw}" height="${hh}" rx="1.5" class="barra-${v.tipo}"/>`;
		}).join('')}
	</svg><p class="peq">Barra alta = mais forte. <span class="cor-acento">■</span> acento <span class="cor-normal">■</span> normal <span class="cor-fantasma">■</span> fantasma · variação ±${fmt(res.dinamica.desvio, 1)} dB</p>`;
}

// ---------- Prova ----------
function telaProva(id, q) {
	const m = E.programa.modulos.find((x) => x.id === id);
	if (!m) return (location.hash = '#mapa');
	if (!J.provaLiberada(m)) return (location.hash = `#modulo/${id}`);
	const p = J.prova(m);
	const s = q.has('s') ? '&s' : '';
	tela.innerHTML = `<a class="voltar" href="#modulo/${m.id}">‹ ${esc(m.titulo)}</a>
	<span class="etiqueta prova">Prova final</span><h1>${esc(m.titulo)}</h1>
	<p class="objetivo">Três drills sorteados, acima do BPM meta, aprovados em sequência. Errou um, volta para a etapa 1. ${p.tentativas ? `Tentativas hoje: ${p.tentativas}.` : ''}</p>
	<div class="missoes">${p.drills.map((did, k) => {
		const d = E.drillPorId(did);
		const est = p.passou || k < p.etapa ? 'feito' : '';
		return `<div class="missao ${est} entra"><div class="icone">${k + 1}</div><div><h3>${esc(d.titulo)}</h3><div class="meta-linha">${J.bpmProva(d)} BPM</div></div><div class="lado">${k === p.etapa && !p.passou ? '<span class="xp-tag">agora</span>' : ''}</div></div>`;
	}).join('')}</div>
	${p.passou ? `<div class="cartao-prova passou"><h3>Aprovado em ${p.passou}</h3></div>` : `<a class="botao principal grande" href="#drill/${p.drills[p.etapa]}?prova=${m.id}${s}">${p.etapa ? `Continuar na etapa ${p.etapa + 1}` : 'Começar a prova'}</a>`}`;
}

// ---------- Desafio ----------
function telaDesafio(_, q) {
	const plano = E.planoDoDia();
	const i = plano.itens.find((x) => x.tipo === 'desafio');
	if (!i) return (location.hash = '#hoje');
	const feito = plano.feitos[chave(i)];
	tela.innerHTML = `${q.has('s') ? `<div class="barra-sessao"><span>Treino</span><a href="#hoje">Sair</a></div>` : '<a class="voltar" href="#hoje">‹ Hoje</a>'}
	<span class="etiqueta">Desafio do dia</span><h1>Desafio</h1>
	<div class="heroi"><h3 style="font-size:19px">${esc(i.texto)}</h3><p class="sub">Grave em Gravar livre para ver tempo e dinâmica. Marque quando tiver feito de verdade.</p></div>
	<div class="botoes"><a class="botao" href="#ferramentas/livre">Gravar livre</a><button class="principal" id="feito">${feito ? '✓ Feito' : 'Fiz · +30 XP'}</button></div>`;
	$('#feito').onclick = () => {
		if (!feito) {
			E.marcarFeito(chave(i), true);
			comemorar(J.bonus(30, 'Desafio do dia'), true);
		}
		q.has('s') ? setTimeout(seguirTreino, 900) : telaDesafio(_, q);
	};
}

// ---------- Fim do treino ----------
function telaFim() {
	const plano = E.planoDoDia();
	const f = E.feitoNoPlano(plano);
	const hist = Object.entries(E.estado.drills).flatMap(([, p]) => (p.historico ?? []).filter((h) => h.data === E.hoje()));
	const aprov = hist.filter((h) => h.aprovado).length;
	const nv = J.nivel();
	const conq = Object.entries(J.estadoJogo().conquistas).filter(([, d]) => d === E.hoje()).map(([id]) => J.CONQUISTAS.find((c) => c.id === id)).filter(Boolean);
	tela.innerHTML = `<div class="heroi entra" style="text-align:center">
		<p class="peq">${f.pct >= 1 ? 'TREINO CONCLUÍDO' : 'RESUMO DE HOJE'}</p>
		<div class="grande-num num" style="font-family:var(--titulo);font-size:76px;font-weight:700;line-height:1;margin:6px 0">+<span data-conta="${J.xpHoje()}">0</span></div>
		<p class="sub">XP hoje · nível ${nv.n}, ${esc(nv.titulo)} · faltam ${nv.falta} XP</p>
	</div>
	<div class="medidas"><div><span>Takes</span><b>${hist.length}</b></div><div><span>Aprovados</span><b>${aprov}</b></div><div><span>Sequência</span><b>${E.sequencia()} 🔥</b></div></div>
	<div class="medidas"><div><span>Minutos</span><b>${Math.round(E.estado.sessoes[E.hoje()] ?? 0)}</b></div><div><span>Etapas</span><b>${f.feitos}/${f.total}</b></div><div><span>Combo máx.</span><b>${J.estadoJogo().comboMax}</b></div></div>
	${conq.length ? `<h2>Conquistas de hoje</h2><div class="medalhas">${conq.map((c) => `<div class="medalha-g tem"><i>${c.icone}</i>${esc(c.nome)}</div>`).join('')}</div>` : ''}
	<div class="botoes"><a class="botao" href="#ferramentas/braco">Jogo do braço</a><a class="botao principal" href="#mapa">Ver o mapa</a></div>`;
	if (f.pct >= 1) setTimeout(() => confete(90), 300);
	animar();
}

// ---------- Ferramentas ----------
function telaFerramentas(sub) {
	const lista = {
		metronomo: ['⏱', 'Metrônomo', 'Clique no 2 e 4, sumindo, 7/8, treino de velocidade', ferrMetronomo],
		groove: ['🥁', 'Groove', '20 estilos com bateria, percussão e Rhodes reais', ferrGroove],
		braco: ['🗺', 'Jogo do braço', 'Ache a nota no braço contra o relógio', ferrBraco],
		musica: ['🎧', 'Estudo de música', 'Tire de ouvido: loop A-B e velocidade sem mudar o tom', ferrMusica],
		afinador: ['🎚', 'Afinador', 'Cromático, pelo microfone', ferrAfinador],
		livre: ['🎙', 'Gravar livre', 'Avalie qualquer coisa sobre o clique', ferrLivre],
		calibrar: ['📡', 'Calibrar', 'Latência do celular (30 s)', ferrCalibrar],
	};
	if (!lista[sub]) {
		tela.innerHTML = `<div class="topo"><div><h1>Ferramentas</h1></div></div>
		<div class="ladrilhos">${Object.entries(lista).map(([k, [ic, nome, desc]]) => `<a class="ladrilho entra ${k === 'braco' ? 'destaque' : ''}" href="#ferramentas/${k}"><span class="ic">${ic}</span><div><b>${nome}</b><small>${desc}</small></div></a>`).join('')}</div>`;
		return;
	}
	const [, nome, desc] = lista[sub];
	tela.innerHTML = `<a class="voltar" href="#ferramentas">‹ Ferramentas</a><h1>${nome}</h1><p class="sub">${desc}</p><div class="carregando" id="carga" hidden><div></div></div><div id="ferr"></div>`;
	lista[sub][3]($('#ferr'));
}
async function carregarCom(grupos) {
	const c = $('#carga');
	if (c) c.hidden = false;
	await A.preparar(grupos, (f, t) => c?.firstElementChild && (c.firstElementChild.style.width = `${(100 * f) / t}%`));
	if (c) c.hidden = true;
}

function ferrMetronomo(el) {
	const c = {bpm: 90, compasso: 4, subdiv: 1, modo: 'normal', gap: [2, 2], subir: null};
	el.innerHTML = `
	<div class="bpm-gigante"><b id="mb">${c.bpm}</b><div class="peq">BPM</div></div>
	<div class="linha-bpm"><button class="redondo" data-d="-5">−5</button><button class="redondo" data-d="-1">−</button><button class="redondo" data-d="1">+</button><button class="redondo" data-d="5">+5</button></div>
	<input type="range" id="mr" min="30" max="300" value="${c.bpm}">
	<div class="pulsos" id="pulsos"></div>
	<div class="form">
		<label>Compasso <select id="mc"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6/8</option><option>7/8</option><option>5/8</option></select></label>
		<label>Subdivisão <select id="ms"><option value="1">nenhuma</option><option value="2">colcheia</option><option value="3">tercina</option><option value="4">semicolcheia</option></select></label>
		<label>Clique <select id="mm"><option value="normal">todo tempo</option><option value="2e4">só 2 e 4</option><option value="1">só no 1</option><option value="gap">some e volta</option></select></label>
		<label>Some: com / sem <span><input type="number" id="g1" value="2" min="1" max="16"><input type="number" id="g2" value="2" min="1" max="16"></span></label>
		<label class="largo">Treino de velocidade <span>+<input type="number" id="s1" value="0" min="0" max="20"> BPM a cada <input type="number" id="s2" value="4" min="1" max="32"> comp. até <input type="number" id="s3" value="160" min="40" max="300"></span></label>
	</div>
	<div class="botoes"><button id="tap">Tap</button><button class="principal" id="mplay">▶ Iniciar</button></div>`;
	let met = null;
	const mostrar = () => {
		$('#mb').textContent = c.bpm;
		$('#mr').value = c.bpm;
	};
	$$('[data-d]', el).forEach((b) => (b.onclick = () => {
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
		taps.push(performance.now());
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
	const iniciar = async () => {
		ler();
		await carregarCom(A.GRUPOS.click);
		met = A.metronomo(c, (info) => {
			$$('#pulsos span').forEach((s) => {
				s.classList.toggle('on', Number(s.dataset.i) === info.pulso);
				s.classList.toggle('mudo', !info.toca);
			});
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
	$$('select, input[type=number]', el).forEach((i) => (i.onchange = () => (met ? reiniciar() : ler())));
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
		<label>Teclado <select id="gk"><option value="">do estilo</option><option value="rhodes">Rhodes</option><option value="piano">piano</option></select></label>
	</div>
	<p class="peq">Para gravar com acompanhamento e avaliar, use fone com fio; senão a bateria entra no microfone.</p>
	<div class="botoes"><button class="principal" id="gplay">▶ Tocar</button></div>`;
	let tocando = null;
	const preencher = () => {
		const g = E.groovePorId($('#gg').value);
		$('#gb').value = g.bpm;
		$('#gp').value = g.progressao ?? '';
	};
	preencher();
	const tocar = async () => {
		const g = E.groovePorId($('#gg').value);
		const prog = $('#gp').value.trim();
		try {
			if (prog) parseProgressao(prog);
		} catch (e) {
			alert(`Acordes: ${e.message}`);
			return;
		}
		$('#gplay').textContent = 'Carregando sons…';
		await carregarCom(A.GRUPOS.groove);
		const baixo = $('#gx').value;
		const linhaWalking = baixo === 'walking' && prog ? gerarWalking({progressao: prog, semente: E.hoje()}) : null;
		tocando = A.tocarGroove({...g, teclado: $('#gk').value || g.teclado}, {bpm: Number($('#gb').value), progressao: prog || null, baixo, linhaWalking});
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
	$$('#gb, #gp, #gx, #gk', el).forEach((i) => (i.onchange = () => tocando && (pararG(), tocar())));
	$('#gplay').onclick = () => (tocando ? pararG() : tocar());
	parar.push(() => tocando?.parar());
}

// Escuta o microfone e chama aoMidi(midi) ~12 vezes por segundo.
async function escutar(aoMidi) {
	const stream = await A.abrirMicrofone();
	const ctx = A.audio();
	const src = ctx.createMediaStreamSource(stream);
	const an = ctx.createAnalyser();
	an.fftSize = 8192;
	src.connect(an);
	const buf = new Float32Array(an.fftSize);
	const id = setInterval(() => {
		an.getFloatTimeDomainData(buf);
		aoMidi(alturaAoVivo(buf, ctx.sampleRate));
	}, 70);
	const fim = () => {
		clearInterval(id);
		src.disconnect();
		A.fecharMicrofone(stream);
	};
	parar.push(fim);
	return fim;
}

function ferrAfinador(el) {
	const afin = AFINACOES[E.estado.config.afinacao];
	el.innerHTML = `<div class="afinador"><div class="nota-af" id="an">–</div><div class="cents" id="ac">toque uma corda solta</div>
	<div class="medidor"><div class="ponteiro" id="ap"></div></div></div>
	<div class="botoes">${afin.map((c) => `<button data-ref="${CORDAS[c]}">${c}</button>`).join('')}</div>
	<p class="peq centro">Os botões tocam a nota de referência num baixo de verdade.</p>
	<div class="botoes"><button class="principal" id="aon">🎙 Ligar afinador</button></div>`;
	$$('[data-ref]', el).forEach((b) => (b.onclick = async () => {
		await carregarCom(['baixo']);
		A.notaBaixo(Number(b.dataset.ref), A.agora() + 0.05, 2.2, {acento: true});
	}));
	$('#aon').onclick = async () => {
		let suave = null;
		try {
			await escutar((m) => {
				if (m == null) return;
				suave = suave == null || Math.abs(m - suave) > 0.7 ? m : suave * 0.6 + m * 0.4;
				const alvo = Math.round(suave);
				const cents = (suave - alvo) * 100;
				$('#an').textContent = nomeMidi(alvo);
				$('#ac').textContent = `${cents > 0 ? '+' : ''}${cents.toFixed(0)} cents · ${(440 * Math.pow(2, (suave - 69) / 12)).toFixed(1)} Hz`;
				$('#ap').style.left = `${50 + Math.max(-50, Math.min(50, cents))}%`;
				$('#ap').classList.toggle('certo', Math.abs(cents) < 4);
			});
			$('#aon').remove();
		} catch {
			$('#ac').textContent = 'Microfone negado.';
		}
	};
}

// Jogo do braço: a nota aparece, você toca. 60 segundos. Nível 2 inclui sustenidos e bemóis e
// pode exigir uma corda específica.
function ferrBraco(el) {
	const j = J.estadoJogo();
	const afin = AFINACOES[E.estado.config.afinacao];
	el.innerHTML = `<div class="form">
		<label>Notas <select id="bn"><option value="nat">naturais</option><option value="todas">todas (com ♯/♭)</option></select></label>
		<label>Corda <select id="bc"><option value="">qualquer</option>${afin.map((c) => `<option>${c}</option>`).join('')}</select></label>
	</div>
	<div class="cartao"><div class="alvo-braco" id="alvo"><b>?</b><div class="sub" id="dica">Recorde: ${j.recordes.braco ?? 0} notas/min</div></div>
	<div class="topo"><span class="cronometro" id="tempo">60</span><span class="cronometro" id="pontos">0 notas</span></div></div>
	<div class="botoes"><button class="principal grande" id="jogar">▶ Jogar (60 s)</button></div>
	<p class="peq">Toque a nota em qualquer oitava (ou na corda pedida, casas 0 a 12). O microfone confirma quando a nota estabiliza.</p>`;
	$('#jogar').onclick = async () => {
		await carregarCom(A.GRUPOS.ui);
		const naturais = [0, 2, 4, 5, 7, 9, 11];
		const pool = $('#bn').value === 'nat' ? naturais : [...Array(12).keys()];
		const corda = $('#bc').value;
		let alvo = -1, pontos = 0, estavel = 0, ultimo = null;
		const sortear = () => {
			let n;
			do n = pool[Math.floor(Math.random() * pool.length)]; while (n === alvo);
			alvo = n;
			$('#alvo').classList.remove('acertou');
			$('#alvo').innerHTML = `<b>${nomePc(alvo)}</b><div class="sub">${corda ? `na corda ${corda}` : 'em qualquer corda'}</div>`;
		};
		let fim;
		try {
			fim = await escutar((m) => {
				if (m == null) return;
				const r = Math.round(m);
				estavel = r === ultimo ? estavel + 1 : 0;
				ultimo = r;
				const naCorda = !corda || (r >= CORDAS[corda] && r <= CORDAS[corda] + 12);
				if (estavel >= 2 && ((r % 12) + 12) % 12 === alvo && naCorda) {
					pontos++;
					$('#pontos').textContent = `${pontos} notas`;
					$('#alvo').classList.add('acertou');
					A.somUI('xp');
					estavel = -3;
					setTimeout(sortear, 250);
				}
			});
		} catch {
			$('#dica').textContent = 'Microfone negado.';
			return;
		}
		$('#jogar').disabled = true;
		sortear();
		const t0 = performance.now();
		const rel = setInterval(() => {
			const resta = Math.max(0, 60 - (performance.now() - t0) / 1000);
			$('#tempo').textContent = Math.ceil(resta);
			if (resta <= 0) {
				clearInterval(rel);
				fim();
				$('#jogar').disabled = false;
				const ev = J.aposBraco(pontos);
				$('#alvo').innerHTML = `<b>${pontos}</b><div class="sub">notas por minuto · recorde ${J.estadoJogo().recordes.braco}</div>`;
				comemorar(ev, pontos > 0 && ev.some((e) => e.tipo === 'recorde'));
			}
		}, 200);
		parar.push(() => clearInterval(rel));
	};
}

// Estudo de música: arquivo do próprio celular, nada sai do aparelho.
function ferrMusica(el) {
	el.innerHTML = `<label class="botao botao-arquivo principal grande">Escolher música do celular<input type="file" id="arq" accept="audio/*"></label>
	<div id="player" hidden>
		<div class="cartao" style="margin-top:14px"><b id="nome-m"></b>
		<input type="range" id="pos" min="0" max="1000" value="0">
		<div class="topo"><span class="num" id="t-atual">0:00</span><span class="num peq" id="t-loop">sem loop</span><span class="num" id="t-total">0:00</span></div></div>
		<div class="bpm-gigante"><b id="vel">100%</b><div class="peq">velocidade (o tom não muda)</div></div>
		<input type="range" id="rv" min="40" max="100" step="5" value="100">
		<div class="botoes"><button id="tras">−5 s</button><button class="principal" id="play">▶</button><button id="frente">+5 s</button></div>
		<div class="botoes"><button id="ma">Marcar A</button><button id="mb">Marcar B</button><button id="limpa">Sem loop</button></div>
		<p class="peq">Dica: loop de 2 a 4 compassos a 60-70%, toque junto até sair igual, depois suba a velocidade.</p>
	</div>`;
	const audio = new Audio();
	audio.preservesPitch = true;
	audio.mozPreservesPitch = true;
	audio.webkitPreservesPitch = true;
	let a = null, b = null, raf;
	const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
	$('#arq').onchange = (e) => {
		const f = e.target.files[0];
		if (!f) return;
		audio.src = URL.createObjectURL(f);
		$('#nome-m').textContent = f.name;
		$('#player').hidden = false;
	};
	audio.onloadedmetadata = () => ($('#t-total').textContent = mmss(audio.duration));
	const passo = () => {
		if (b != null && a != null && audio.currentTime >= b) audio.currentTime = a;
		$('#t-atual').textContent = mmss(audio.currentTime);
		if (audio.duration) $('#pos').value = (1000 * audio.currentTime) / audio.duration;
		raf = requestAnimationFrame(passo);
	};
	raf = requestAnimationFrame(passo);
	$('#pos').oninput = (e) => audio.duration && (audio.currentTime = (e.target.value / 1000) * audio.duration);
	$('#rv').oninput = (e) => {
		audio.playbackRate = e.target.value / 100;
		$('#vel').textContent = `${e.target.value}%`;
	};
	$('#play').onclick = () => (audio.paused ? audio.play() : audio.pause());
	audio.onplay = () => ($('#play').textContent = '❚❚');
	audio.onpause = () => ($('#play').textContent = '▶');
	$('#tras').onclick = () => (audio.currentTime = Math.max(0, audio.currentTime - 5));
	$('#frente').onclick = () => (audio.currentTime += 5);
	const mostraLoop = () => ($('#t-loop').textContent = a != null && b != null ? `loop ${mmss(a)}–${mmss(b)}` : a != null ? `A ${mmss(a)}` : 'sem loop');
	$('#ma').onclick = () => {
		a = audio.currentTime;
		if (b != null && b <= a) b = null;
		mostraLoop();
	};
	$('#mb').onclick = () => {
		if (a == null) a = 0;
		b = audio.currentTime > a ? audio.currentTime : null;
		mostraLoop();
		if (b != null) audio.currentTime = a;
	};
	$('#limpa').onclick = () => {
		a = b = null;
		mostraLoop();
	};
	parar.push(() => {
		cancelAnimationFrame(raf);
		audio.pause();
	});
}

function ferrLivre(el) {
	el.innerHTML = `<div class="form">
		<label>BPM <input type="number" id="lb" value="90" min="40" max="300"></label>
		<label>Compassos <input type="number" id="lc" value="8" min="2" max="64"></label>
		<label>Grade <select id="lg"><option value="1">semínima</option><option value="0.5" selected>colcheia</option><option value="0.3333333">tercina</option><option value="0.25">semicolcheia</option></select></label>
		<label>Clique <select id="lk"><option value="normal">todo tempo</option><option value="2e4">só 2 e 4</option><option value="1">só no 1</option></select></label>
		<label class="largo">Escala (opcional) <span><select id="lt"><option value="">–</option>${NOMES.map((n) => `<option>${n}</option>`).join('')}</select>
		<select id="le">${Object.keys(ESCALAS).map((n) => `<option>${n}</option>`).join('')}</select></span></label>
	</div>
	<div class="estudio"><span></span><button class="gravar" id="gravar"><span id="rotulo-gravar">GRAVAR</span></button><span></span></div>
	<div class="nivel-mic"><div id="nivel"></div></div>
	<p class="status-take" id="status"></p><div id="resultado"></div>`;
	$('#gravar').onclick = async () => {
		await carregarCom(A.GRUPOS.click);
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
		} catch {
			st.textContent = 'Microfone negado.';
			return;
		}
		parar.push(() => A.fecharMicrofone(stream));
		const pm = medidorMic(stream);
		const rec = A.gravar(stream);
		await espera(150);
		const ag = agendarCliques(d, bpm, 4, comp * 4);
		mostrarContagem(ag.contagem);
		$('#gravar').classList.add('ao-vivo');
		const tick = setInterval(() => ($('#rotulo-gravar').textContent = A.agora() < ag.inicio ? '…' : `${Math.max(0, Math.ceil(ag.fim - A.agora()))}s`), 200);
		await espera((ag.fim - A.agora() + 0.5) * 1000);
		clearInterval(tick);
		const take = await rec.parar();
		A.fecharMicrofone(stream);
		pm();
		$('#gravar').classList.remove('ao-vivo');
		$('#rotulo-gravar').textContent = 'GRAVAR';
		if (!take) return;
		st.textContent = 'Analisando…';
		await espera(30);
		const ctx = A.audio();
		const palpite = E.estado.config.latencia ?? (ctx.outputLatency || 0) + (ctx.baseLatency || 0) + 0.02;
		const refinada = refinarLatencia(take.dados, take.sr, take.inicioCtx, ag.cliques, palpite);
		const lat = refinada ?? palpite;
		const res = analisarTake(d, eventos, 4, bpm, take, ag, lat, refinada != null || E.estado.config.latencia != null);
		const takeId = `${Date.now()}`;
		E.guardarTake({id: takeId, drill: 'livre', bpm, sr: take.sr, dados: take.dados, data: E.hoje()});
		st.textContent = '';
		mostrarResultado({res, msg: `Gravação livre a ${bpm} BPM.`, takeId, eventos: [], lat, refinada, confiavel: refinada != null || E.estado.config.latencia != null}, d, {});
	};
}

function ferrCalibrar(el) {
	const c = E.estado.config;
	el.innerHTML = `<div class="cartao"><p>Mede quanto o som leva do alto-falante até o microfone. Com isso o app sabe se você está <b>adiantado ou atrasado</b>, e não só se está regular.</p>
	<ol class="sub"><li>Tire o fone. Volume em ~70%.</li><li>Ambiente quieto, celular parado.</li><li>Toque em Calibrar e fique em silêncio por 6 s.</li></ol>
	<div class="info">${c.latencia != null ? `Calibrado: ${(c.latencia * 1000).toFixed(0)} ms em ${c.latenciaData}.` : 'Ainda não calibrado.'}</div></div>
	<div class="botoes"><button class="principal grande" id="cal">Calibrar</button></div><p class="status-take" id="cst"></p>
	<p class="peq">Nos takes o app também procura o clique dentro da gravação e se ajusta sozinho quando consegue ouvi-lo. Com fone vale esta calibração. Fone Bluetooth atrasa 150-300 ms e varia: não use.</p>`;
	$('#cal').onclick = async () => {
		const st = $('#cst');
		await carregarCom(A.GRUPOS.click);
		let stream;
		try {
			stream = await A.abrirMicrofone();
		} catch {
			st.textContent = 'Microfone negado.';
			return;
		}
		const rec = A.gravar(stream);
		await espera(300);
		const t0 = A.agora() + 0.3;
		const cliques = Array.from({length: 10}, (_, i) => t0 + i * 0.5);
		const vol = A.volumes.click;
		A.volumes.click = 1.2;
		cliques.forEach((t) => A.click(t, 1));
		st.textContent = 'Ouvindo…';
		await espera((cliques.at(-1) - A.agora() + 0.7) * 1000);
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
		ferrCalibrar(el);
		$('#cst').textContent = `Latência: ${(r.latencia * 1000).toFixed(0)} ms (±${r.espalhamento.toFixed(1)} ms, ${r.n} cliques). Salvo.`;
		A.somUI('aprovado');
	};
}

// ---------- Perfil ----------
function radarSvg(dados) {
	const w = 300, c = w / 2, r = 104;
	const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / dados.length;
	const pt = (i, v) => [c + Math.cos(ang(i)) * r * v, c + Math.sin(ang(i)) * r * v];
	const anel = (v) => dados.map((_, i) => pt(i, v).join(',')).join(' ');
	return `<svg viewBox="0 0 ${w} ${w}" width="100%" style="max-width:320px;display:block;margin:0 auto">
		${[0.25, 0.5, 0.75, 1].map((v) => `<polygon points="${anel(v)}" fill="none" stroke="rgba(255,255,255,.08)"/>`).join('')}
		${dados.map((_, i) => `<line x1="${c}" y1="${c}" x2="${pt(i, 1)[0]}" y2="${pt(i, 1)[1]}" stroke="rgba(255,255,255,.06)"/>`).join('')}
		<polygon points="${dados.map((d, i) => pt(i, Math.max(0.03, d.v / 100)).join(',')).join(' ')}" fill="rgba(245,184,74,.25)" stroke="#f5b84a" stroke-width="2"/>
		${dados.map((d, i) => {
			const [x, y] = pt(i, 1.2);
			return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="#9097a3" font-size="11" font-family="Inter">${d.nome}</text><text x="${x}" y="${y + 13}" text-anchor="middle" fill="#f2efe8" font-size="11" font-weight="600" font-family="Space Grotesk">${d.v}</text>`;
		}).join('')}
	</svg>`;
}
function telaPerfil() {
	const c = E.estado.config;
	const j = J.estadoJogo();
	const nv = J.nivel();
	const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
	const totalMin = Math.round(Object.values(E.estado.sessoes).reduce((a, b) => a + b, 0));
	const takes = Object.values(E.estado.drills).reduce((a, p) => a + (p.tentativas ?? 0), 0);
	const semanas = 16;
	const inicio = new Date();
	inicio.setDate(inicio.getDate() - (semanas * 7 - 1) - inicio.getDay() + 6 - 6);
	const calor = [...Array(semanas * 7)].map((_, k) => {
		const d = new Date();
		d.setDate(d.getDate() - (semanas * 7 - 1) + k);
		const m = E.estado.sessoes[E.hoje(d)] ?? 0;
		const n = m <= 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : m < c.minutos ? 3 : 4;
		return `<i class="n${n}" title="${E.hoje(d)}: ${Math.round(m)} min"></i>`;
	}).join('');
	const recs = Object.entries(j.recordes).filter(([id]) => id !== 'braco' && E.drillPorId(id)).sort((a, b) => b[1].bpm - a[1].bpm).slice(0, 8);
	tela.innerHTML = `<div class="topo"><div><h1>Perfil</h1></div></div>
	<div class="cartao-nivel entra">
		<div class="anel-nivel" style="width:120px;height:120px;margin:0 auto">${anel(nv.frac, {tam: 120, esp: 9})}<b style="font-size:40px">${nv.n}</b></div>
		<div class="titulo-nivel">${esc(nv.titulo)}</div>
		<p class="sub"><span class="num">${nv.xp}</span> XP · faltam <span class="num">${nv.falta}</span> para o nível ${nv.n + 1}${nv.proxTitulo ? ` · ${esc(nv.proxTitulo[1])} no nível ${nv.proxTitulo[0]}` : ''}</p>
		<div class="escada">${J.TITULOS.map(([l, t]) => `<span class="${nv.n >= l ? 'f' : ''}">${l} ${esc(t)}</span>`).join('')}</div>
	</div>
	<div class="medidas"><div><span>Prática</span><b>${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, '0')}</b></div><div><span>Takes</span><b>${takes}</b></div><div><span>Sequência</span><b>${E.sequencia()}🔥</b></div></div>
	<h2>Habilidades</h2><div class="cartao">${radarSvg(J.radar())}</div>
	<h2>Conquistas · ${Object.keys(j.conquistas).length}/${J.CONQUISTAS.length}</h2>
	<div class="medalhas">${J.CONQUISTAS.map((x) => `<div class="medalha-g ${j.conquistas[x.id] ? 'tem' : ''}" title="${esc(x.desc)}"><i>${x.icone}</i>${esc(x.nome)}</div>`).join('')}</div>
	<h2>Últimas 16 semanas</h2><div class="cartao"><div class="calor">${calor}</div></div>
	${recs.length ? `<h2>Recordes de BPM</h2><div class="cartao recordes">${recs.map(([id, r]) => `<div><span>${esc(E.drillPorId(id).titulo)}</span><b class="num">${r.bpm} BPM${r.desvio != null ? ` · ±${r.desvio.toFixed(1)} ms` : ''}</b></div>`).join('')}${j.recordes.braco ? `<div><span>Jogo do braço</span><b class="num">${j.recordes.braco} notas/min</b></div>` : ''}</div>` : ''}
	<details class="ajustes cartao" style="margin-top:24px"><summary>⚙ Rotina e ajustes</summary>
		<div class="form">
			<label>Minutos por dia <select id="cm">${[20, 30, 45, 60, 90].map((m) => `<option ${m === c.minutos ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
			<label>Horário do lembrete <input type="time" id="cl" value="${c.lembrete}"></label>
			<label class="largo">Dias <span class="dias">${dias.map((d, i) => `<label><input type="checkbox" data-dia="${i}" ${c.dias.includes(i) ? 'checked' : ''}>${d}</label>`).join('')}</span></label>
			<label>Afinação <select id="ca"><option value="EADG" ${c.afinacao === 'EADG' ? 'selected' : ''}>4 cordas (EADG)</option><option value="BEADG" ${c.afinacao === 'BEADG' ? 'selected' : ''}>5 cordas (BEADG)</option></select></label>
			<label>Som do clique <select id="ck"><option value="claves" ${c.somClick !== 'madeira' ? 'selected' : ''}>claves</option><option value="madeira" ${c.somClick === 'madeira' ? 'selected' : ''}>woodblock</option></select></label>
		</div>
		<div class="botoes"><button class="principal" id="ics">📅 Lembrete no calendário</button></div>
		<p class="peq">Evento que repete nos dias marcados, com alarme. iPhone: abra e "Adicionar todos". Android: abra com o Google Agenda.</p>
		<h2>Backup</h2>
		<p class="peq">O progresso mora neste aparelho. Exporte de vez em quando; o arquivo também serve para o Claude analisar (pasta <code>entrada/</code>).</p>
		<div class="botoes"><button id="exp">Exportar</button><label class="botao botao-arquivo">Importar<input type="file" id="imp" accept=".json,application/json"></label></div>
		<div class="botoes"><button id="instalar" hidden>Instalar o app</button></div>
		<p class="peq">Sons: gravações reais (Karoryfer, Versilian, Project16, jRhodes). Créditos em sons/CREDITOS.md.</p>
	</details>`;
	const salvarCfg = () => {
		c.minutos = Number($('#cm').value);
		c.lembrete = $('#cl').value || '19:30';
		c.dias = $$('[data-dia]').filter((x) => x.checked).map((x) => Number(x.dataset.dia));
		c.afinacao = $('#ca').value;
		c.somClick = $('#ck').value;
		A.preferencias.click = c.somClick;
		delete E.estado.planos[E.hoje()];
		E.salvar();
	};
	$$('details select, details input[type=time], details input[type=checkbox]').forEach((i) => (i.onchange = salvarCfg));
	$('#ics').onclick = () => baixar('lembrete-baixo.ics', E.arquivoLembrete(), 'text/calendar');
	$('#exp').onclick = () => baixar(`baixo-progresso-${E.hoje()}.json`, E.exportar(), 'application/json');
	$('#imp').onchange = async (e) => {
		const f = e.target.files[0];
		if (!f) return;
		try {
			E.importar(await f.text());
			toast('✔', 'Progresso importado', f.name);
			telaPerfil();
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
	animar();
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
	A.preferencias.click = E.estado.config.somClick ?? 'claves';
	if (J.protegerSequencia()) setTimeout(() => toast('🛡', 'Escudo usado', 'Ontem ficou sem treino; a sequência foi protegida.'), 800);
	// o áudio só pode começar depois de um toque; os sons leves já vão sendo carregados
	document.addEventListener('pointerdown', () => A.preparar([...A.GRUPOS.click, ...A.GRUPOS.ui]).catch(() => {}), {once: true});
	ir();
})();
