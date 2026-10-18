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

## Harmonia funcional (`app/js/harmonia.js`)

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

- A partir de 30 min: um dia leitura/ditado, no outro ouvido harmônico (o jogo gira entre os quatro).
- Tirar de ouvido: todo dia a partir de 60 min; em dias alternados a partir de 45 min.
