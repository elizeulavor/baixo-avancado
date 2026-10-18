# Erros e lições

Cada linha: data, o que aconteceu, a regra que ficou.

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
