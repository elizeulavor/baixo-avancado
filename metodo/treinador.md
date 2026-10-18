# O treinador (dentro do app e no Claude)

O curso tem dois tutores que usam os mesmos números:

1. **No app (`app/js/treinador.js`)**: todo dia, na tela Hoje, até 3 linhas, cada uma com número:
   - o que está em jogo hoje (sequência, quantas etapas faltam, alerta depois das 20 h);
   - o foco técnico, nesta ordem de prioridade: drill travado (8+ takes em 14 dias e menos de 30%
     aprovados, com a correção: descer 2 passos por 3 takes limpos), semicolcheia torta (posição
     com média ≥ 6 ms fora em 4+ takes), o critério que mais reprova, a tendência de correr ou arrastar,
     ou a regularidade média contra a anterior;
   - o que está perto: prova liberada, drill a 1 aprovação de dominar, ganho de BPM da semana,
     melhora de regularidade, o erro de ouvido mais frequente, ou a meta semanal.

   Com menos de 5 takes ele não aponta tendência: pede mais takes.

   O relatório da semana (`#relatorio`) mostra: meta de XP, minutos, dias, takes, aprovação e
   regularidade contra a semana anterior, pressa/atraso, volume, semicolcheia torta, o que mais
   reprova, o que foi conquistado, os ratings do ouvido e o foco.
2. **No Claude (`/revisar`)**: a revisão profunda, a partir do backup exportado, com mudança no programa.

## Meta semanal

Padrão: 280 XP por dia de treino da agenda (mínimo 3 dias). Ajustável em Perfil. Semana começa
na segunda. Bater a meta dispara comemoração e a conquista "Semana cheia".

## Medições guardadas por take (`met`)

`dv` regularidade, `md` pressa/atraso (só com latência confiável), `dr` deriva, `pp` média por posição
do tempo, `dn` volume, `fa` ghosts, `ac` notas certas, `af` afinação, `si` pausas, `ar` articulação,
`rep` critérios reprovados. São a base do treinador e do `/revisar`.

## Groove (`estado.groove`)

`jogos[jogo].estrelas[nível]` (0 a 3), `jogos[jogo].hist[]` = `{data, nivel, estrelas, met}` com
`met` = `dv` regularidade, `md` média (só com latência), `cob` % de notas no lugar, `ex` notas a mais,
`combo`, `volta` erro médio na volta do clique (Relógio, + atrasado), `deriva`, `noBolso` e
`foraBolso` (Bolso: média contra o alvo), `razaoErro` (Swing), `bons` (Escada), `perfeitas`/`respostas`
(Eco), `lat` latência usada (ms) e `conf` (latência confiável). Nos jogos de toque, `acertos`/`total`.
`dias[data]` = groove do dia; `recordes.infinito` = Eco infinito.

O treinador do app usa as 5 últimas rodadas: no silêncio corre ou arrasta (≥ 10 ms), escorrega do
bolso (≥ 6 ms), swing mais duro ou mais reto que o pedido (≥ 4 pontos).

## O professor

O comentário depois de cada resultado (`app/js/professor.js`) segue o mesmo tom: o número que
importa e o que fazer no próximo take. Detalhes em `metodo/groove.md`.

## Tom do tutor

Objetivo e exigente, com número em cada frase. Elogio só como fato ("caiu de ±13 para ±10 ms").
Nunca inventa tendência sem dados.
