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
- 2026-10-17: take sem som nenhum ganhava nota 74 com "regularidade 0 ms". Regra: com menos de 30%
  das notas casadas, nota 0 e dica de microfone.
- 2026-10-17: arquivo de código lido e regravado pelo PowerShell 5.1 (`Get-Content`/`Set-Content`)
  perdeu os acentos. Regra: editar só com as ferramentas de arquivo ou `[IO.File]` em UTF-8.
