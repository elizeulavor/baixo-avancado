# Leitura de partitura

Ler tablatura não é ler música. A trilha de leitura usa partitura em clave de fá, na notação
padrão de baixo: **escrita uma oitava acima do som** (a corda E solta soa E1 e se escreve E2, na 1ª
linha suplementar de baixo).

## Partitura em todo drill (`app/js/partitura.js`)

- Seletor **Partitura · Ambas · Tab** em cima da notação de cada drill. Drills de leitura abrem na
  partitura; os outros, na última vista escolhida (`localStorage`, conveniência por aparelho).
- Armadura pelo tom e escala do gerador (pela relativa maior: E dórico = 2 sustenidos). Linha
  escrita sem tom declarado: Dó maior, com acidentes.
- Acidentes valem até o fim do compasso; bequadro quando a armadura ou um acidente anterior altera
  a mesma linha/espaço. Barras de colcheia e semicolcheia por tempo, pontos, pausas, tercinas,
  linhas suplementares, acento, staccato, ghost (cabeça em x) e técnica (S, P, H, Pu, sl, ◇).
- Acidentes, clave e bandeirolas são desenhados em SVG (não dependem da fonte do celular).

## Olho à frente

Opção na tela do drill. Cada compasso some **1 tempo antes** de o cursor chegar nele. Quem lê nota
por nota trava; quem lê à frente, passa. É o hábito que separa leitor de soletrador. Vale no
modelo, no treino e na gravação.

## Leitura relâmpago (Ferramentas, e link nos drills de leitura)

A nota aparece na pauta, o aluno toca, o microfone confere (altura estável em 2 leituras de 70 ms).
60 segundos por rodada. Mede o **tempo de leitura** de cada nota.

| Nível | O quê | Faixa escrita |
|---|---|---|
| 1 | Dentro da pauta, naturais | G2 a A3 |
| 2 | Pauta inteira com suplementares | E2 a C4 |
| 3 | Acidentes (sem E♯, B♯, C♭, F♭) | E2 a C4 |
| 4 | Armadura sorteada (±1 a ±6): a nota vem sem acidente, o aluno aplica a armadura | E2 a C4 |
| 5 | Região aguda, com acidentes | A3 a G4 (até a 12ª casa da corda G) |

- **Oitava exata** por padrão: a leitura de verdade é saber onde a nota mora no braço. A opção
  "aceitar qualquer oitava" existe para microfone que confunde o grave.
- Erro só conta com outra nota estável depois de 0,4 s (a nota anterior ainda soando não conta).
- **Adaptativo:** cada nota escrita guarda média móvel do tempo (70/30) e erros. Peso no sorteio =
  (tempo/1,2 s)² + 0,8 × erros (nunca vista = 3, teto 6). As lentas e erradas voltam mais.
- **Mapa da leitura:** a pauta do nível com cada nota pintada pelo tempo (≤ 1,2 s, ≤ 2 s, mais
  lenta, errou, não vista).
- Estado em `estado.leitura` = `{notas: {"passo:acid": {ms, n, erros}}, recordes: {nível: notas/min},
  rodadas: [{data, nivel, certas, erros, ms}]}` (entra no backup). 2 XP por nota certa.

Metas de referência (a confirmar com os dados do aluno): nível 2 com ≥ 30 notas/min e média
≤ 1,5 s; nível 4 com ≥ 25 notas/min.

Não validado com baixo real: a detecção ao vivo da corda E solta (41 Hz) no microfone do celular.
