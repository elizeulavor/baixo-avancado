# Erros e lições

Cada linha: data, o que aconteceu, a regra que ficou.

- 2026-10-18 (groove): o clique de claves vaza abaixo de 1,6 kHz e puxa a medição da nota que vem
  20 ms depois (bolso "atrás +20" lido como +10). Com chimbal sem filtro, igual. Regra: no groove o
  clique é chimbal por um passa-altas de 4 kHz; com isso a regularidade medida caiu de ±13 para ±3 ms
  nos takes montados. Nos drills o clique não pesa (testar-real com e sem clique: 12,4 e 12,3 ms).
- 2026-10-18 (groove): sustentação longa das notas graves oscila ~2 dB e gerava 3-4 ataques falsos
  por nota (semínima a 72 BPM). Subir o limiar de energia matava as semicolcheias. Regra: no groove
  (`estrito`), ataque = energia sobe ×1,25 **e** o ataque é largo (≥ 25% das faixas de 200 Hz a
  1,5 kHz sobem 3 dB); nota a mais só conta com subida ×1,6. Os drills ficam com a regra antiga.
- 2026-10-18 (groove): E grave depois de outra nota saía ~30 ms atrasado: o toque dá um pico de
  fluxo pequeno e a corda abrindo, 25 ms depois, o maior. Regra (só no groove): pico mais forte até
  35 ms depois fica colado ao primeiro, e o refinamento não anda até ele. Mesmo assim cada altura tem
  viés próprio (2-8 ms): os jogos de groove pedem uma nota só (A solta ou abafada) e descontam 6 ms.
- 2026-10-18 (groove): procurar a latência pelos cliques com o aluno tocando no tempo acha o ataque
  do baixo, não o clique (no teste de ponta a ponta mudou a latência no 4º compasso). Regra: refinar
  só com os cliques da contagem, uma vez, antes do primeiro compasso avaliado.
- 2026-10-18: `refinarLatencia` em silêncio digital devolvia uma latência qualquer (0 ≥ 4 × 0).
  Regra: soma zero é "não achou".
- 2026-10-18: `Array.find` com sorteio dentro do callback sorteia de novo a cada item (Onde está o
  1 quebrava). Regra: sortear antes, procurar depois.

- 2026-10-17: o primeiro ataque depois do silêncio tem fluxo espectral 5 a 10 vezes maior que os
  outros e, usado como referência do limiar, sumia com metade das notas. Regra: limiar relativo
  ao percentil 90 dos picos, nunca ao máximo.
- 2026-10-17: envelope de 1,5 ms em sinal grave ondula com a forma de onda e adiantava ataques em
  até 40 ms. Regra: refinar o ataque na banda 250-1600 Hz, pela subida mais íngreme.
- 2026-10-17: o fim de uma nota (abafar) gera fluxo espectral e virava nota fantasma no lugar de
  uma nota faltando. Regra: pico com energia caindo depois só conta se for forte.
- 2026-10-17: com o filtro de fim de nota em 80% da energia, nota que começa mais baixa que a
  anterior sumia (30% dos testes). Regra: só descarta se a energia cair abaixo de 55%; o teste
  roda com semente fixa e deve passar em 30 sementes (`SEMENTE=n`).
- 2026-10-18: ajustes feitos só com som sintético quebraram com baixo gravado (99 ataques para
  30 notas). Regra: toda mudança na detecção passa nos dois testes, `testar-avaliacao.mjs`
  (sintético, 20 sementes) e `testar-real.mjs` (amostras reais de app/sons/).
- 2026-10-18: a sustentação de um baixo real oscila e gera fluxo espectral a cada ~200 ms. Regra:
  ataque fraco só conta se a energia (janela de 30 ms, maior que o período do E grave) subir 30%
  ou se a altura mudar (legato, hammer).
- 2026-10-18: envelope de 2 ms com baixo real oscila ±15 dB; o ataque saía até 30 ms fora.
  Regra: refinar pelo fluxo espectral fino (janela 2048, passo 64) e calibrar o deslocamento numa
  nota isolada (tem de dar 0 ms).
- 2026-10-18: no teste com amostras, notas na mesma corda se somavam, o que não existe no
  instrumento. Regra: a próxima nota na mesma corda corta a anterior.
- 2026-10-18: ruído de medição de tempo com baixo gravado ~9 ms. Limites padrão: desvio 14 ms,
  pressa/atraso 12 ms. Revisar com os primeiros takes reais do aluno.
- 2026-10-18: `silenceremove` antes de nivelar apagou amostras baixas (clave fraca, triângulo).
  Regra: nivelar, cortar o silêncio, depois aplicar o ganho do grupo; o script recusa arquivo vazio.
- 2026-10-18: o tocador chamava `stop()` antes de `start()` e quebrava o modelo. Regra: start primeiro.
- 2026-10-17: take sem som nenhum ganhava nota 74 com "regularidade 0 ms". Regra: com menos de 30%
  das notas casadas, nota 0 e dica de microfone.
- 2026-10-17: arquivo de código lido e regravado pelo PowerShell 5.1 (`Get-Content`/`Set-Content`)
  perdeu os acentos. Regra: editar só com as ferramentas de arquivo ou `[IO.File]` em UTF-8.
- 2026-10-18: no teste do Raio-X sem latência calibrada, um atraso constante de ~44 ms pintou
  tudo de vermelho com regularidade de ±6 ms. Regra: sem latência confiável, qualquer visual de
  tempo se centra na média do take (a avaliação já fazia isso nos números).
- 2026-10-18: desenho do sustenido com `toFixed` somou texto com número ("43" + "1.40") e virou
  traço gigante. Regra: em coordenada de SVG, só número (Math.round), nunca toFixed antes de somar.
- 2026-10-18: no jogo de leitura, acerto no último quarto de segundo agendava a próxima nota por
  cima da tela de resultado. Regra: todo setTimeout de rodada confere se a rodada ainda está ativa.
