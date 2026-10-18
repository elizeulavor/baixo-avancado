// O professor: comenta cada resultado como um professor ao lado, com o número que importa e a
// próxima ação. Fala (voz do aparelho, pt-BR), balão na tela ou escrito no resultado, conforme
// Perfil › Professor. Nunca fala com o microfone aberto (a voz entraria na gravação): guarda a
// última fala e diz quando o microfone fecha.
import * as E from './estado.js';

export const MODOS = {ambos: 'Fala e balão', voz: 'Só fala', balao: 'Só balão', escrito: 'Escrito no resultado', nada: 'Desligado'};
const cfg = () => E.estado.config;
export const modo = () => cfg().professor ?? 'ambos';
export const escrito = () => modo() === 'escrito';
const comVoz = () => ['ambos', 'voz'].includes(modo()) && 'speechSynthesis' in window;
const comBalao = () => ['ambos', 'balao'].includes(modo());

// ---------- voz ----------
let vozes = [];
function carregarVozes() {
	if (!('speechSynthesis' in window)) return [];
	vozes = speechSynthesis.getVoices().filter((v) => /^pt(-|_)?BR/i.test(v.lang) || /^pt/i.test(v.lang));
	return vozes;
}
if ('speechSynthesis' in window) {
	carregarVozes();
	speechSynthesis.onvoiceschanged = carregarVozes;
}
export const listaVozes = () => (vozes.length ? vozes : carregarVozes());
function melhorVoz() {
	const l = listaVozes();
	if (!l.length) return null;
	const escolhida = l.find((v) => v.name === cfg().vozProfessor);
	if (escolhida) return escolhida;
	// as vozes neurais/online soam bem melhores que as locais antigas
	const nota = (v) => (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 3 : 0) + (/BR/i.test(v.lang) ? 2 : 0) + (/francisca|antonio|thalita|luciana|felipe/i.test(v.name) ? 1 : 0);
	return [...l].sort((a, b) => nota(b) - nota(a))[0];
}
// o texto da tela vira fala: unidades por extenso, sem símbolos
export function paraFala(t) {
	return t
		.replace(/±\s?/g, 'mais ou menos ')
		.replace(/(\d+),(\d)/g, '$1 vírgula $2')
		.replace(/(\d)\s?ms\b/g, '$1 milissegundos')
		.replace(/(\d)\s?dB\b/g, '$1 decibéis')
		.replace(/(\d)\s?%/g, '$1 por cento')
		.replace(/\bBPM\b/g, 'bê pê eme')
		.replace(/\bXP\b/g, 'xis pê')
		.replace(/★/g, ' estrela ')
		.replace(/[·•|›→]/g, ', ')
		.replace(/"/g, '')
		.replace(/\s+/g, ' ');
}
let microAberto = false;
let pendente = null;
export function microfone(aberto) {
	microAberto = aberto;
	if (aberto && 'speechSynthesis' in window) speechSynthesis.cancel();
	if (!aberto && pendente) {
		const p = pendente;
		pendente = null;
		setTimeout(() => falar(p), 350);
	}
}
function falar(txt) {
	if (!comVoz()) return;
	if (microAberto) {
		pendente = txt;
		return;
	}
	try {
		speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance(paraFala(txt));
		const v = melhorVoz();
		if (v) u.voice = v;
		u.lang = v?.lang ?? 'pt-BR';
		u.rate = cfg().velVoz ?? 1.05;
		u.pitch = 1;
		speechSynthesis.speak(u);
	} catch {}
}

// ---------- balão ----------
let caixa = null;
let tiraBalao = null;
const SIMB = `<svg viewBox="40 96 432 308" aria-hidden="true"><path d="M48 266 L 120 266 L 140 252 L 160 280 L 180 266 L 200 266 L 236 392 L 296 108 L 318 300 L 340 220 L 360 288 L 382 240 L 402 276 L 420 254 L 440 268 L 464 264" fill="none" stroke="currentColor" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function balao(txt, tom) {
	if (!comBalao()) return;
	caixa?.remove();
	clearTimeout(tiraBalao);
	caixa = document.createElement('div');
	caixa.className = `balao-prof ${tom ?? ''}`;
	caixa.innerHTML = `<div class="avatar-prof">${SIMB}</div><div class="fala-prof"><b>Professor</b><span></span></div>`;
	caixa.querySelector('span').textContent = txt;
	caixa.onclick = () => caixa?.remove();
	document.body.appendChild(caixa);
	requestAnimationFrame(() => caixa?.classList.add('visivel'));
	const el = caixa;
	tiraBalao = setTimeout(() => {
		el.classList.remove('visivel');
		setTimeout(() => el.remove(), 400);
	}, Math.max(5000, txt.split(' ').length * 420));
}

// Diz o comentário pelos canais escolhidos. Devolve o texto (para o modo escrito).
// tom: elogio | correcao | info
export function dizer(txt, tom = 'info') {
	if (!txt) return '';
	falar(txt);
	balao(txt, tom);
	return txt;
}
export function testar() {
	const txt = 'Oi. Eu comento cada take: o número que importa e o que fazer no próximo.';
	if (['voz', 'ambos'].includes(modo())) {
		const m = microAberto;
		microAberto = false;
		falar(txt);
		microAberto = m;
	}
	balao(txt, 'info');
}

// ---------- frases ----------
// variação sem repetir a última de cada situação
const ultimas = {};
function uma(chave, lista) {
	const ops = lista.filter(Boolean);
	if (!ops.length) return '';
	let i = Math.floor(Math.random() * ops.length);
	if (ops.length > 1 && i === ultimas[chave]) i = (i + 1) % ops.length;
	ultimas[chave] = i;
	return ops[i];
}
const f0 = (v) => Math.round(Math.abs(v));
const f1 = (v) => (Math.round(Math.abs(v) * 10) / 10).toString().replace('.', ',');

// depois de um take avaliado (drill, prova). ctx: {bpm, bpmAntes, eventos, prova}
export function aposTake(d, res, ctx = {}) {
	const t = res.tempo ?? {};
	const it = (nome) => res.itens?.find((i) => i.nome === nome);
	const reprovou = (res.itens ?? []).filter((i) => !i.ok && !i.info);
	const ev = ctx.eventos ?? [];
	const dominou = ev.some((e) => e.tipo === 'dominado');
	const recorde = ev.find((e) => e.tipo === 'recorde');
	if (res.aprovado) {
		if (dominou) return {tom: 'elogio', txt: uma('dom', [`Dominado. ${d.titulo} entra na revisão espaçada; daqui a uns dias eu trago de volta para ver se ficou.`, `Pronto, esse é seu: dominado com ±${f1(t.desvio)} de regularidade. Próximo drill.`])};
		if (recorde) return {tom: 'elogio', txt: uma('rec', [`Recorde: ${ctx.bpm} BPM, e limpo. ±${f1(t.desvio)} ms.`, `${ctx.bpm} BPM é o mais rápido que você já passou aqui. Agora consolide.`])};
		const melhor = t.desvio <= 8 ? `±${f1(t.desvio)} ms de regularidade é nível de estúdio` : t.dentro10 >= 80 ? `${f0(t.dentro10)}% das notas a menos de 10 ms do tempo` : res.dinamica?.desvio != null && res.dinamica.desvio <= 2.5 ? `volume variando só ${f1(res.dinamica.desvio)} dB` : `nota ${res.nota}`;
		return {tom: 'elogio', txt: uma('aprov', [
			`Aprovado. ${melhor[0].toUpperCase()}${melhor.slice(1)}. Sobe para o próximo BPM.`,
			`Isso. ${melhor[0].toUpperCase()}${melhor.slice(1)}. Mantenha essa mão e vamos subir.`,
			`Passou${t.media != null && it('Pressa/atraso') && Math.abs(t.media) <= 4 ? ', e bem no centro do tempo' : ''}. ${melhor[0].toUpperCase()}${melhor.slice(1)}.`,
		])};
	}
	// reprovado: a correção mais importante primeiro
	const r = reprovou[0];
	const tres = (E.estado.drills[d.id]?.historico ?? []).filter((h) => h.data === E.hoje() && h.bpm === ctx.bpm && !h.aprovado).length >= 3;
	if (tres) return {tom: 'correcao', txt: `Três tentativas em ${ctx.bpm} BPM hoje. Desça ${Math.abs(d.bpm.passo || 4) * 2} BPM, faça dois takes limpos e volte. Insistir cansado só grava o erro.`};
	if (!r) return {tom: 'correcao', txt: 'Quase nada caiu no tempo esperado. Comece no 1, logo depois da contagem.'};
	const torta = (t.porPosicao ?? []).filter((p) => p.pos !== 'tempo').map((p) => ({...p, rel: p.media - ((t.porPosicao ?? []).find((x) => x.pos === 'tempo')?.media ?? t.media)})).sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel))[0];
	switch (r.nome) {
		case 'Regularidade do tempo':
			if (torta && Math.abs(torta.rel) > 7) return {tom: 'correcao', txt: `O problema é o ${torta.pos}: ${f0(torta.rel)} ms ${torta.rel > 0 ? 'atrasado' : 'adiantado'} em relação ao tempo. Conte as quatro semicolcheias em voz alta e acerte só ele.`};
			if (t.deriva != null && Math.abs(t.deriva) > 8) return {tom: 'correcao', txt: `Você ${t.deriva > 0 ? 'vai atrasando' : 'vai acelerando'}: ${f0(t.deriva)} ms a cada 10 segundos. Ancore no clique do 1 e não deixe a mão decidir o andamento.`};
			return {tom: 'correcao', txt: uma('reg', [`Regularidade em ±${f1(t.desvio)} ms; o limite é ${r.limite}. ${t.pior ? `O pior ataque foi em ${t.pior.onde}. ` : ''}Grave de novo pensando na subdivisão, não na nota.`, `±${f1(t.desvio)} ms, precisa ficar abaixo de ${r.limite}. Toque mais leve: mão tensa espalha o tempo.`])};
		case 'Pressa/atraso':
			return {tom: 'correcao', txt: t.media > 0 ? uma('atr', [`Você está ${f0(t.media)} ms atrás do clique, em média. Ataque junto com ele, como se o clique fosse você.`, `Atrasado ${f0(t.media)} ms. Antecipe o ataque um fio; o clique tem que sumir dentro da sua nota.`]) : uma('adi', [`Você está ${f0(t.media)} ms na frente. Segure: deixe o clique chegar e toque dentro dele.`, `Correndo ${f0(t.media)} ms. Respire no tempo 4 e entre no 1 sem pressa.`])};
		case 'Notas certas':
			return {tom: 'correcao', txt: `${f0(r.valor)}% de notas certas, precisa de ${r.limite}. ${res.notas?.erradas?.[0] ? `Em ${res.notas.erradas[0].onde} saiu ${res.notas.erradas[0].tocou}. ` : ''}Olhe a tablatura antes do próximo take.`};
		case 'Notas faltando':
			return {tom: 'correcao', txt: `Faltaram ${res.contagem.faltando} notas. Se tocou e eu não ouvi, aproxime o celular do amplificador; se pulou, desça o BPM.`};
		case 'Dinâmica uniforme':
			return {tom: 'correcao', txt: `O volume oscila ${f1(res.dinamica.desvio)} dB entre notas que deviam ser iguais. Mesmo ponto de ataque e mesma força em todas.`};
		case 'Acentos':
			return {tom: 'correcao', txt: `Acentos só ${f1(res.dinamica.acento ?? 0)} dB acima; peço ${r.limite}. Toque as outras mais leves, em vez de bater mais forte no acento.`};
		case 'Notas fantasma':
			return {tom: 'correcao', txt: `Ghost notes só ${f1(res.dinamica.fantasma ?? 0)} dB abaixo das cheias. Abafe mais com a mão esquerda: tem que soar como percussão, sem altura.`};
		case 'Pausas limpas':
			return {tom: 'correcao', txt: `Nas pausas o baixo continua soando, só ${f0(res.som.silencio)} dB abaixo. Pausa é nota: abafe com a mão esquerda e o polegar.`};
		case 'Staccato':
			return {tom: 'correcao', txt: `Staccato longo demais, ${f0(res.som.staccato)}% da duração. Solte a pressão logo depois do ataque.`};
		case 'Legato':
			return {tom: 'correcao', txt: `Legato curto, ${f0(res.som.legato)}%. Segure cada nota até a próxima nascer.`};
		default:
			return {tom: 'correcao', txt: `${r.nome}: ${f1(r.valor)} ${r.unidade}, limite ${r.limite}. Grave de novo.`};
	}
}

// depois de uma rodada de ouvido harmônico
export function aposHarmonia(id, {acertos, total, recorde, piorRotulo}) {
	const pct = total ? Math.round((100 * acertos) / total) : 0;
	if (id === 'rush') return {tom: 'info', txt: `${acertos} em três minutos.${recorde ? ' Recorde.' : ''} Reconhecer sem pensar é o que faz você tocar sem cifra.`};
	if (id === 'survive') return {tom: 'info', txt: `Sobreviveu a ${acertos} perguntas.${recorde ? ' Recorde.' : ''}${piorRotulo ? ` O que te derrubou mais: ${piorRotulo}.` : ''}`};
	if (pct === 100) return {tom: 'elogio', txt: uma('h100', ['Rodada perfeita. A próxima já vem mais difícil.', 'Tudo certo. Seu ouvido está pedindo um nível acima.'])};
	if (pct >= 80) return {tom: 'elogio', txt: `${acertos} de ${total}.${piorRotulo ? ` O que escapou foi ${piorRotulo}; ouça de novo a explicação dela.` : ''}`};
	return {tom: 'correcao', txt: `${acertos} de ${total}.${piorRotulo ? ` Foco em ${piorRotulo}: ` : ' '}antes de responder, cante a tônica por cima do acorde. Se ela estabiliza, é tônica; se puxa, é dominante.`};
}

// depois de um jogo de groove. s: resumo de ritmo.js
export function aposGroove(jogo, nv, s, {estrelas, novas, confiavel}) {
	const st = estrelas ? `${estrelas} ${estrelas === 1 ? 'estrela' : 'estrelas'}` : 'sem estrela';
	const abre = novas && estrelas >= 1 ? ' O próximo nível abriu.' : '';
	switch (jogo) {
		case 'relogio': {
			if (s.deriva == null) return {tom: 'correcao', txt: 'Não ouvi o suficiente para medir. Toque todas as notas, mesmo sem clique.'};
			const m = s.voltas.reduce((a, b) => a + b, 0) / s.voltas.length;
			if (s.deriva <= 16) return {tom: 'elogio', txt: `${st}. O clique volta e te encontra a ${f0(s.deriva)} ms, em média. Relógio interno de verdade.${abre}`};
			return {tom: 'correcao', txt: `${st}. Na volta do clique você estava ${f0(m)} ms ${m < 0 ? 'adiantado: no silêncio você corre' : 'atrasado: no silêncio você arrasta'}. ${m < 0 ? 'Subdivida por dentro, pense nas colcheias, e segure o fim do compasso.' : 'Mantenha o peso no 1; não espere o clique para confirmar.'}${abre}`};
		}
		case 'contratempo':
			return s.estrelas >= 2 ? {tom: 'elogio', txt: `${st}. ±${f1(s.desvio)} ms com o clique fora do lugar: seu pulso não depende dele.${abre}`} : {tom: 'correcao', txt: `${st}. ±${f1(s.desvio)} ms${s.cobertura < 0.85 ? ` e ${f0(100 - s.cobertura * 100)}% das notas fora do lugar: você foi puxado para o clique` : ''}. Conte em voz alta "um e dois e" e deixe o clique ser só um enfeite.${abre}`};
		case 'bolso': {
			if (!confiavel) return {tom: 'correcao', txt: 'Para medir em cima, atrás ou na frente eu preciso da latência. Calibre em Ferramentas, ou toque sem fone para eu achar o clique na gravação.'};
			const pior = [...(s.porAlvo ?? [])].sort((a, b) => Math.abs(b.media - b.alvo) - Math.abs(a.media - a.alvo))[0];
			const fora = pior ? pior.media - pior.alvo : 0;
			if (s.noBolso >= 0.9) return {tom: 'elogio', txt: `${st}. ${f0(s.noBolso * 100)}% dos compassos no bolso pedido. Isso é controle de microtempo.${abre}`};
			return {tom: 'correcao', txt: `${st}. ${f0(s.noBolso * 100)}% no bolso. ${pior ? `Quando pedi ${pior.alvo > 4 ? 'atrás' : pior.alvo < -4 ? 'na frente' : 'em cima'}, você ficou ${f0(fora)} ms ${fora > 0 ? 'mais atrás' : 'mais na frente'} que o alvo.` : ''} ${fora > 0 ? 'Ataque um fio antes.' : 'Deixe o clique passar e só então toque.'}${abre}`};
		}
		case 'escada': {
			const pior = [...(s.porSub ?? [])].sort((a, b) => a.bons - b.bons)[0];
			return s.bons >= 0.9 ? {tom: 'elogio', txt: `${st}. Trocou de subdivisão sem mexer no pulso.${abre}`} : {tom: 'correcao', txt: `${st}. ${pior ? `O degrau que mais pegou foi ${pior.sub} por tempo (${f0(pior.bons * 100)}% bons). ` : ''}Antes da troca, conte a próxima subdivisão por dentro, um tempo antes de tocar.${abre}`};
		}
		case 'eco':
			return s.boas >= s.respostas ? {tom: 'elogio', txt: `${st}. ${s.boas} de ${s.respostas} frases devolvidas, ${s.perfeitas} perfeitas. Ouvido e mão juntos.${abre}`} : {tom: 'correcao', txt: `${st}. ${s.boas} de ${s.respostas} frases certas. Na chamada, não tente lembrar nota por nota: cante a frase por dentro e devolva o desenho.${abre}`};
		case 'bumbo':
			return s.estrelas >= 2 ? {tom: 'elogio', txt: `${st}. Travado no bumbo: ±${f1(s.desvio)} ms.${abre}`} : {tom: 'correcao', txt: `${st}. ${s.cobertura < 0.9 ? `${f0(100 - s.cobertura * 100)}% das notas fora do padrão. ` : ''}±${f1(s.desvio)} ms. Ouça só o bumbo por dois compassos antes de entrar, e toque junto com ele, não com a caixa.${abre}`};
		case 'swing': {
			const pior = [...(s.porAlvo ?? [])].sort((a, b) => Math.abs(b.media - b.alvo) - Math.abs(a.media - a.alvo))[0];
			const d = pior ? pior.media - pior.alvo : 0;
			return s.estrelas >= 2 ? {tom: 'elogio', txt: `${st}. Swing a ${f0(pior?.media ?? 0)}%, quase no alvo. Isso é feel.${abre}`} : {tom: 'correcao', txt: `${st}. Pedi ${pior?.alvo}% e saiu ${f0(pior?.media ?? 0)}%: ${d > 0 ? 'duro demais, a colcheia do contratempo está chegando tarde' : 'reto demais, atrase a colcheia do contratempo'}.${abre}`};
		}
		default:
			return {tom: estrelas >= 2 ? 'elogio' : 'correcao', txt: `${st}.${abre}`};
	}
}
export function aposToque(jogo, {acertos, total, estrelas, novas, extra}) {
	const abre = novas && estrelas >= 1 ? ' O próximo nível abriu.' : '';
	if (jogo === 'ondeum') return {tom: estrelas >= 2 ? 'elogio' : 'correcao', txt: `${acertos} de ${total} grooves com o 1 no lugar.${extra ? ` ${extra}` : ''}${estrelas < 2 ? ' Procure o que se repete: bumbo forte e troca de acorde costumam marcar o 1.' : ''}${abre}`};
	if (jogo === 'ditado') return {tom: estrelas >= 2 ? 'elogio' : 'correcao', txt: `${acertos} de ${total} ditados.${estrelas < 2 ? ' Ouça de novo batendo as semicolcheias na perna; a grade aparece sozinha.' : ''}${abre}`};
	return {tom: estrelas >= 2 ? 'elogio' : 'correcao', txt: `${acertos} de ${total} andamentos dentro da margem.${extra ? ` ${extra}` : ''}${abre}`};
}

// ao começar o treino do dia
export function inicioTreino(plano, seq) {
	const n = plano.itens.filter((i) => i.tipo !== 'escudo').length;
	return uma('ini', [
		`Bora. ${n} etapas hoje${seq ? `, e a sequência está em ${seq}` : ''}. Primeiro, aquecer as mãos.`,
		`${n} etapas. Uma de cada vez, com atenção total no take.`,
		seq >= 3 ? `Dia ${seq + 1} seguido começando. ${n} etapas.` : `Vamos lá: ${n} etapas, e eu meço cada uma.`,
	]);
}
