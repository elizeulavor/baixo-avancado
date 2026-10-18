# Como a avaliação mede (`app/js/analise.js`)

## Caminho do som

1. O app agenda os cliques do metrônomo no relógio do áudio e grava o microfone com o número
   exato de cada amostra. Assim cada clique tem um lugar conhecido dentro da gravação.
2. **Latência** (tempo do alto-falante até o microfone): calibrada uma vez em Ferramentas > Calibrar
   e, a cada take, procurada de novo dentro da própria gravação (o clique é agudo, 2-3 kHz, e
   aparece quando sai pelo alto-falante). Achou: a pressa/atraso vale. Com fone, vale a calibração.
3. Antes de procurar notas, um filtro passa-baixa em 1,6 kHz tira o clique.

## O que cada número é

| Número | Como sai |
|---|---|
| Ataques | fluxo espectral (FFT 2048, passo 256, até 1,5 kHz); limiar relativo ao percentil 90 dos picos; refinado no início da subida mais íngreme do transiente (banda 250-1600 Hz) |
| Regularidade | desvio-padrão (ms) do erro de cada ataque em relação ao tempo escrito |
| Pressa/atraso | média do erro; positivo = atrasado |
| Deriva | inclinação do erro ao longo do take (ms a cada 10 s): acelerando ou freando |
| Por posição | média do erro de cada posição do tempo ("e", "&", "a", tercinas) menos a do tempo: semicolcheia torta |
| Altura | YIN em ~11 kHz, de 22 ms depois do ataque até a próxima nota |
| Afinação | média dos cents das notas detectadas |
| Dinâmica | pico RMS (10 ms) nos primeiros 80 ms de cada nota, em dB |
| Articulação | quanto da duração escrita a nota soa até cair 20 dB |
| Pausas limpas | quanto o som dentro de uma pausa escrita fica abaixo da média das notas |
| Clareza | quão periódica é a nota (100% = altura limpa; abafada, trastejando ou ruidosa cai) |

## Nota de 0 a 100

Cada critério vale 70 exatamente no limite, 100 no ideal e 0 no dobro do limite. A nota é a média.
**Aprovado = todos os critérios dentro do limite.** Nota alta com um critério estourado reprova.

## Limites conhecidos (diga ao aluno quando importar)

- Ataques a menos de 50 ms um do outro viram um só (semicolcheia a mais de 300 BPM).
- Hammer-on e slide sem ataque claro: o tempo usa o quadro espectral (precisão ~8 ms).
- Ghost note muito suave pode não ser detectada; não conta como falta, mas aparece na dica. Ghost
  logo depois de nota forte pode sair medida atrasada (visto até +48 ms no teste sintético): se o
  "pior ataque" cair sempre num ghost, desconfie da medida antes de culpar a mão.
- Microfone de celular corta abaixo de ~80 Hz: a altura das notas graves sai pela periodicidade
  dos harmônicos, que funciona, mas pode errar oitava; oitava errada só gera aviso.
- Acompanhamento (groove) tocando no alto-falante entra no microfone e atrapalha. Para avaliar com
  groove, fone com fio.
- Fone Bluetooth: 150-300 ms de atraso variável. Não serve para take avaliado.
- Os limiares foram ajustados com baixo sintético (`scripts/testar-avaliacao.mjs`) e com o pipeline
  completo no navegador. Ainda não com gravações reais de baixo em celulares diferentes: os
  primeiros takes reais são a validação. Se um número parecer errado, o aluno exporta o backup e
  descreve o take; ajuste e registre em `erros-e-licoes.md`.
