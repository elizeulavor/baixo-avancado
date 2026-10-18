// Harmonia nas músicas: o trecho no vídeo oficial (player do YouTube) e a pergunta "qual é a
// progressão?". As opções erradas são variações próximas da certa (um grau trocado, outra ordem,
// a progressão de outra música do mesmo tamanho), sorteadas com a semente da música.
import * as E from './estado.js';
import * as A from './audio.js';
import * as J from './jogo.js';
import * as Hm from './harmonia.js';
import * as P from './professor.js';
import {parseAcorde, rng} from './musica.js';

let H = null;
export const instalar = (h) => (H = h);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const POOL = {
	maior: ['I', 'ii', 'iii', 'IV', 'V', 'vi'],
	menor: ['i', '♭III', 'iv', 'v', 'V', '♭VI', '♭VII', 'IV'],
	jazz: ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'II7', 'III7', 'VI7', '♭II7', 'viiø'],
};
const poolDe = (m) => (m.nivel >= 4 && m.graus.some((g) => /7|ø/.test(g)) ? POOL.jazz : m.graus.some((g) => /^i\b|♭/.test(g)) ? POOL.menor : POOL.maior);
export const progresso = () => (E.estado.progMus ??= {});
export const certa = (id) => !!progresso()[id]?.acertou;

export function opcoes(m, todas) {
	const R = rng(`prog-${m.id}`);
	const chave = (g) => g.join(' – ');
	const vistas = new Set([chave(m.graus)]);
	const out = [];
	const add = (g) => {
		const k = chave(g);
		if (!vistas.has(k) && out.length < 3) {
			vistas.add(k);
			out.push(g);
		}
	};
	// progressão de outra música do mesmo tamanho (a confusão mais realista)
	for (const o of todas.filter((x) => x.id !== m.id && x.graus.length === m.graus.length).sort(() => R() - 0.5)) if (R() < 0.6) add(o.graus);
	const pool = poolDe(m);
	for (let k = 0; k < 60 && out.length < 3; k++) {
		const g = [...m.graus];
		if (R() < 0.5) {
			// troca um grau por outro do mesmo vocabulário
			const i = Math.floor(R() * g.length);
			const alt = pool.filter((x) => x !== g[i]);
			g[i] = alt[Math.floor(R() * alt.length)];
		} else {
			// troca dois de lugar
			const i = Math.floor(R() * g.length), j = (i + 1 + Math.floor(R() * (g.length - 1))) % g.length;
			[g[i], g[j]] = [g[j], g[i]];
		}
		add(g);
	}
	const todasOp = [m.graus, ...out].map((g) => ({g, s: R()})).sort((a, b) => a.s - b.s).map((x) => x.g);
	return {lista: todasOp, certa: todasOp.findIndex((g) => chave(g) === chave(m.graus))};
}

// cartão da tela Ouvido
export function cartaoOuvido() {
	const pr = E.progressoes;
	if (!pr) return '';
	const feitas = pr.musicas.filter((m) => certa(m.id)).length;
	const prox = pr.musicas.find((m) => !certa(m.id));
	return `<h2>Harmonia nas músicas</h2>
	<a class="cartao desafio-dia entra" href="#progmus${prox ? `/${prox.id}` : ''}"><div><p class="peq">${feitas} DE ${pr.musicas.length} PROGRESSÕES</p><h3>${prox ? `${H.esc(prox.titulo)} · ${H.esc(prox.artista)}` : 'Todas identificadas'}</h3><p class="sub">O trecho no vídeo oficial: diga os graus.</p></div><span class="xp-tag">${prox ? '+20' : '✓'}</span></a>
	<a class="peq" href="#progmus">ver todas ›</a>`;
}

export function tela(id) {
	const pr = E.progressoes;
	if (!id) return lista(pr);
	const m = pr.musicas.find((x) => x.id === id);
	if (!m) return (location.hash = '#progmus');
	const {lista: ops, certa: iCerta} = opcoes(m, pr.musicas);
	const reg = progresso()[m.id];
	H.tela.innerHTML = `<a class="voltar" href="#progmus">‹ Harmonia nas músicas</a>
	<span class="etiqueta B">Nível ${m.nivel} · ${H.esc(pr.niveis.find((n) => n.n === m.nivel)?.titulo ?? '')}</span>
	<h1>${H.esc(m.titulo)}</h1><p class="sub">${H.esc(m.artista)} · ouça <b>${H.esc(m.trecho)}</b></p>
	<div class="video"><div id="yt"></div></div>
	<p class="peq" id="yt-status">Carregando o vídeo oficial (${H.esc(m.canal)})…</p>
	<div class="botoes"><button id="ini">↺ Do começo do trecho</button><button class="principal" id="play">▶</button><button id="mais5">+5 s</button></div>
	<h2>Qual é a progressão?</h2>
	<div class="opcoes-prog">${ops.map((g, k) => `<button class="opcao" data-k="${k}">${g.map((x) => H.esc(x)).join(' – ')}</button>`).join('')}</div>
	<div id="retorno"></div>
	${reg?.acertou ? `<p class="peq">Você já acertou esta em ${reg.acertou}.</p>` : ''}`;
	let player = null;
	H.carregarYT().then((YT) => {
		if (!$('#yt')) return;
		player = new YT.Player('yt', {
			videoId: m.yt, width: '100%', height: '100%',
			playerVars: {playsinline: 1, rel: 0, modestbranding: 1, start: m.inicio},
			events: {
				onReady: () => ($('#yt-status').textContent = `Vídeo oficial · ${m.canal}. Ouça o baixo primeiro: ele diz onde cada acorde está.`),
				onStateChange: (e) => $('#play') && ($('#play').textContent = e.data === 1 ? '❚❚' : '▶'),
				onError: () => ($('#yt-status').innerHTML = `O vídeo não abriu aqui. <a href="https://www.youtube.com/watch?v=${m.yt}&t=${m.inicio}" target="_blank" rel="noopener">Abrir no YouTube</a>.`),
			},
		});
	}).catch(() => ($('#yt-status').textContent = 'Sem internet: o vídeo precisa de conexão.'));
	H.aoSair(() => {
		try {
			player?.destroy();
		} catch {}
	});
	$('#play').onclick = () => player?.getPlayerState && (player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo());
	$('#ini').onclick = () => player?.seekTo && (player.seekTo(m.inicio, true), player.playVideo());
	$('#mais5').onclick = () => player?.seekTo && player.seekTo(player.getCurrentTime() + 5, true);
	let respondeu = false;
	$$('[data-k]').forEach((b) => (b.onclick = () => {
		if (respondeu) return;
		respondeu = true;
		const ok = Number(b.dataset.k) === iCerta;
		const r = (progresso()[m.id] ??= {tentativas: 0, acertou: null});
		r.tentativas++;
		let ev = [];
		if (ok && !r.acertou) {
			r.acertou = E.hoje();
			ev = J.bonus(20, `Progressão: ${m.titulo}`);
		}
		E.salvar();
		A.somUI(ok ? 'xp' : 'tique');
		$$('[data-k]').forEach((x) => {
			x.disabled = true;
			if (Number(x.dataset.k) === iCerta) x.classList.add('certa');
			else if (x === b) x.classList.add('errada');
		});
		const cifras = m.cifras ? ` · em ${m.tom}: ${m.cifras.join(' – ')}` : '';
		const fala = ok ? {tom: 'elogio', txt: `Isso: ${m.graus.join(', ')}.`} : {tom: 'correcao', txt: `Era ${m.graus.join(', ')}. ${m.explica.split('.')[0]}.`};
		$('#retorno').innerHTML = `<div class="metrica ${ok ? 'ok' : 'nok'}"><div class="topo-m"><span>${ok ? '✓ Certo' : '✗ Não era essa'}</span><b class="peq">${H.esc(m.graus.join(' – '))}</b></div><small>${H.esc(m.explica)}${H.esc(cifras)}</small></div>
		${P.escrito() ? `<div class="prof-inline"><b>Professor</b> ${H.esc(fala.txt)}</div>` : ''}
		<div class="botoes">${m.cifras ? '<button id="piano">▶ No piano</button><button id="groove">▶ Com groove</button>' : ''}${proxima(m) ? `<a class="botao principal" href="#progmus/${proxima(m).id}">Próxima música ›</a>` : '<a class="botao principal" href="#progmus">Todas ›</a>'}</div>`;
		if (!P.escrito()) setTimeout(() => P.dizer(fala.txt, fala.tom), 400);
		const acs = () => m.cifras.map((c) => parseAcorde(c.replace('♭', 'b')));
		$$('#piano').forEach((x) => (x.onclick = async () => {
			player?.pauseVideo?.();
			await A.preparar(Hm.GRUPOS);
			Hm.tocarAcordes(acs(), {timbre: 'piano', dur: 1.2});
		}));
		$$('#groove').forEach((x) => (x.onclick = async () => {
			player?.pauseVideo?.();
			await A.preparar(Hm.GRUPOS);
			Hm.tocar({alvo: acs(), orientador: [], estilo: m.estilo}, {timbre: 'groove', orientar: false});
		}));
		H.comemorar(ev, ok);
	}));
}
const proxima = (m) => {
	const ms = E.progressoes.musicas;
	return ms.find((x) => !certa(x.id) && x.id !== m.id) ?? null;
};
function lista(pr) {
	H.tela.innerHTML = `<a class="voltar" href="#ouvido">‹ Ouvido</a><h1>Harmonia nas músicas</h1>
	<p class="objetivo">Progressões que voltam o tempo todo na música. Ouça o trecho no vídeo oficial e escolha os graus. Dica: ache a tônica cantando a nota em que a música "descansa", depois siga o baixo.</p>
	${pr.niveis.map((n) => `<div class="cartao nivel-rep entra"><div class="topo-m"><div><span class="etiqueta B">Nível ${n.n}</span><h3>${H.esc(n.titulo)}</h3></div><b class="num">${pr.musicas.filter((m) => m.nivel === n.n && certa(m.id)).length}/${pr.musicas.filter((m) => m.nivel === n.n).length}</b></div><p class="sub">${H.esc(n.meta)}</p>
		${pr.musicas.filter((m) => m.nivel === n.n).map((m) => `<a class="drill-linha" href="#progmus/${m.id}"><span class="est ${certa(m.id) ? 'dom' : ''}">${certa(m.id) ? '✓' : '○'}</span><span>${H.esc(m.titulo)} <span class="peq">· ${H.esc(m.artista)}</span></span><span class="peq">${m.graus.length} acordes</span></a>`).join('')}</div>`).join('')}`;
}
