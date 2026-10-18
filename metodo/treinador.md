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

## Raio-X do take (`app/js/raiox.js`)

O compasso vira um relógio: cada raio é uma semicolcheia, cada anel é um compasso (de dentro para
fora), cada nota é um ponto. O erro de tempo gira o ponto com lente (±40 ms = meio caminho até o raio
vizinho; sentido do relógio = atrasado). Tamanho = volume. Cor: verde ±10 ms, ouro até o limite do
drill, vermelho fora; anel roxo = nota errada; tracejado = faltou. O traço por fora de cada raio é a
média daquela posição: a assinatura do groove (semicolcheia torta aparece como um traço longo).

- **Ao vivo:** durante o take, a cada 300 ms os ataques novos entram na constelação, logo abaixo do
  botão de gravar. Posição aproximada (latência ainda não refinada).
- **Sem latência confiável** (nem calibrada nem achada na gravação): a constelação e a mão direita
  se centram na média do próprio take. Mostram regularidade, não pressa.
- **Replay:** "Ouvir meu take" gira um ponteiro com o áudio e acende cada nota quando ela soa.
- **Mão direita:** notas tocadas em ordem, ímpares contra pares (supõe alternância estrita). Mostra
  atraso médio, volume e regularidade de cada lado e o galope (diferença de tempo). Leve ≥ 3 ms,
  audível ≥ 6 ms; volume diferente ≥ 1,5 dB.
- **Teste do dedo:** em colcheia e semicolcheia o mesmo dedo cai sempre na mesma posição do tempo,
  então um take não separa dedo de sensação de tempo. Com um take começando no indicador (D_i) e
  outro no médio (D_m): dedo = (D_i − D_m)/2, posição = (D_i + D_m)/2. Guardado por drill em
  `localStorage['radix-teste-dedo']` (conveniência; não entra no backup).
- **Antes e depois:** o primeiro take de cada drill e o melhor (aprovado > caminho até a meta >
  nota) ficam para sempre no IndexedDB (`marco:primeiro:<drill>`, `marco:melhor:<drill>`), a
  16 kHz/16 bits, com as notas do Raio-X. A tela do drill mostra os dois lado a lado, com o som.
  Só valem a partir de 2026-10-18 (takes anteriores não tinham as notas guardadas).

Não validado com baixo real: a paridade da mão direita (rake e cordas soltas quebram a alternância)
e a constelação ao vivo (o limiar dos ataques em janelas curtas). O primeiro take real decide.
