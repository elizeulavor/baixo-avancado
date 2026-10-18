# Ouvido: repertório e harmonia funcional

## Repertório (tirar de ouvido)

- `app/programa/repertorio.json`: 6 níveis × 5 músicas, escolhidas pela linha de baixo, da mais
  cíclica (riff de 1 compasso) à mais exigente (bebop, harmônicos, slap solo).
- **O app escolhe.** Dentro do nível, a música abre depois da anterior. O nível seguinte abre com 3
  músicas tiradas; as 2 restantes ficam como bônus. Música da vez = primeira não tirada do nível
  mais alto aberto. Os níveis fechados mostram "5 músicas surpresa".
- Vídeos só de canais oficiais (VEVO, artista ou Topic), tocados pelo player oficial do YouTube
  dentro do app: velocidade de 25% a 100% sem mudar o tom, loop A-B, ±5 s. Nada é baixado.
- Tarefas: ouvir 3 vezes, achar o tom, medir o BPM (tap), tirar em loop devagar, tocar junto a
  100% três vezes seguidas. "Tirei" só libera com as cinco. XP: 5 por tarefa, 60 × nível por música.
- Transcrição opcional na notação do app: vira tablatura e toca no baixo gravado do app, para
  comparar de ouvido com a gravação.
- **Limite:** o app não confere a transcrição contra a gravação (o YouTube não permite ler o áudio
  do vídeo, e não reproduzimos transcrições protegidas). A conferência é tocar junto até soar igual.

Para trocar ou acrescentar músicas: ache o vídeo oficial, anote `yt` (id de 11 caracteres) e `canal`
exatamente como o YouTube mostra, e rode `node scripts/conferir-repertorio.mjs` (confere que o vídeo
existe, toca incorporado e é do canal anotado) e `node scripts/validar.mjs`. Ids nunca mudam.

## Harmonia funcional (`app/js/harmonia.js`), versão 2

Inspirado no estudo do Chord Crush (Hooktheory): progressões com buracos, orientador de tom,
rating Elo, Rush, Survive, treino dos erros, desafio diário, timbres variados, prévia das opções e
cores por função. O diferencial do Radix é responder **tocando no baixo** (microfone) e o foco em
inversões e pedal, que é onde o baixista decide a harmonia.

- **Rating (Elo) por jogo**, começa em 1000. Cada pergunta tem dificuldade própria (faixa de
  vocabulário, acordes escondidos, tom menor). Faixas: Fundamentos (<1150: I IV V vi, 5 tons, tom
  fixo por 4 perguntas), Campo completo (<1400: + ii iii, tétrades), Secundárias (<1650: V/V V/vi
  vii°, 12 tons), Empréstimo e menor (<1900: V/ii V/IV iv ♭VII ♭VI, tom menor), Jazz e modos
  (♭II7 ♭III, dórico). A pergunta às vezes vem uma faixa abaixo (revisão) ou acima (puxa).
- **Jogos:** Completar (30 fórmulas de estilo: pop, doo-wop, rock, jazz, gospel, choro, samba,
  andaluz, backdoor, SubV, dórico), Função, Cadências (7 tipos), Graus, Inversões (fundamental, 3ª, 5ª,
  7ª, pedal), Raiz no baixo. Completar, Graus e Inversões aceitam resposta pelo baixo (ajuste).
- **Modos:** Desafio do dia (8 perguntas iguais para o dia, sequência própria), Rush (3 min),
  Survive (3 vidas, dificuldade sobe a cada acerto), Seus erros (rótulos com mais erro, mínimo 3
  tentativas).
- **Orientador de tom** (I IV V I): toca quando o tom muda, sempre no jogo de função, ou sempre se
  o ajuste estiver ligado; botão 🎯 a qualquer momento.
- **Timbre:** automático (piano até 1500; depois sorteia piano, Rhodes ou banda), ou fixo.
- **Prévia:** abaixo de 1300 de rating, cada opção tem ▶ para ouvir antes de responder.

## Harmonia funcional, versão 1 (histórico)

Quatro jogos, três níveis cada, piano e baixo gravados, tom sorteado a cada pergunta.

| Jogo | Pergunta | Nível 1 | Nível 2 | Nível 3 |
|---|---|---|---|---|
| Função | depois de I–IV–V7–I, o acorde é T, SD ou D? | tríades, I ii IV V vi, 5 tons | tétrades, campo inteiro, 12 tons | sem a cadência de contexto, só o I |
| Cadências | autêntica, plagal, de engano, suspensiva | 4 tipos | + backdoor (iv7–♭VII7–I) e SubV (ii7–♭II7–I) | mais rápido |
| Graus | depois do I, o grau de 3 acordes | IV V vi | ii iii IV V vi | + vii°, tétrades |
| Raiz no baixo | tocar a raiz de cada um dos 3 acordes; o microfone confere | idem graus | | |

- Rodada de 10 (graus 8, raiz 5). Sobe de nível com 90% em duas rodadas seguidas.
- XP: 4 × nível por acerto, +30 na rodada perfeita.
- No jogo da raiz, o microfone é ignorado enquanto a pergunta toca, e a próxima raiz só conta
  quando a nota muda (a anterior ainda soando não preenche a casa seguinte).

## No plano do dia

- A partir de 30 min: um dia leitura/ditado, no outro o desafio harmônico do dia.
- Tirar de ouvido: todo dia a partir de 60 min; em dias alternados a partir de 45 min.
