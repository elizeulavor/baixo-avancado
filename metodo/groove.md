# Groove: como o app treina o relógio interno

O baixista é metade da seção rítmica. A didática aqui segue quatro ideias, nesta ordem:

1. **O tempo mora no corpo, não no clique.** O clique é andaime: o treino tira o andaime aos poucos
   (some e volta, só no 1, deslocado) e mede o que sobra.
2. **Subdivisão é a régua.** Quem sente a semicolcheia acerta a semínima. A escada de subdivisões e
   o swing medem a régua; o ditado e o eco ensinam a ouvir com ela.
3. **Bolso é escolha.** Tocar em cima, atrás ou na frente do tempo é decisão musical. O app mede a
   média em milissegundos e pede uma posição de cada vez.
4. **Groove é diálogo.** Travar com o bumbo, achar o 1 dentro de um groove que começa no meio e
   responder uma frase de ouvido é o que a banda espera de você.

## Os dez jogos

Cada jogo tem níveis com até 3 estrelas. 1 estrela abre o próximo nível. As estrelas somadas
dão a faixa do groove (Pulso → Mestre do bolso).

| Jogo | Microfone | O que treina | Como mede |
|---|---|---|---|
| Relógio | sim | segurar o tempo sem clique (gap click) | erro na volta do clique e regularidade no silêncio |
| Contratempo | sim | pulso interno com o clique deslocado (2 e 4, "&", "e", "a", tercina, 3 e 5 semicolcheias) | regularidade e pressa/atraso contra o tempo real |
| Bolso | sim | tocar em cima, atrás ou na frente de propósito | média por compasso dentro da faixa pedida |
| Escada | sim | trocar de subdivisão (1 a 6 por tempo) sem parar | compassos com as notas no lugar |
| Eco | sim | ouvir uma frase de 1 compasso e devolver | ataques casados com a frase, ±35 ms perfeito |
| Bumbo | sim | travar com o bumbo em 17 estilos | notas no padrão do bumbo, regularidade |
| Swing | sim | razão de swing (reto 50%, leve 58%, tercina 67%, duro 71%) | razão medida por tempo (não depende de latência) |
| Onde está o 1 | toque | achar o 1 num groove que começa no meio | toques no 1 de cada compasso |
| Ditado rítmico | toque | reconhecer a frase escrita | escolha entre 4 grades |
| Andamento | toque | memória de BPM (qual é? toque 96) | erro em BPM |

Mais o **Eco infinito** (vidas, a frase fica mais difícil a cada acerto, recorde) e o **Groove do
dia** (3 jogos curtos no seu nível, entra no plano do dia).

## Microfone e alto-falante

Sem fone, o microfone ouviria bumbo e caixa como se fossem notas. Por isso, sem fone, o
acompanhamento usa só sons agudos (claves, chimbal, ride, shaker, triângulo), que a análise
filtra. Com **fone com fio** marcado, toca a bateria completa e vale a calibração de latência.

## Critérios

- O ruído da medição com baixo real é ~9 ms (testar-real). As faixas de 3 estrelas não pedem
  menos que 10-12 ms de regularidade.
- "Bolso" e "pressa/atraso" só contam com latência confiável (clique achado na gravação ou
  calibração). Sem isso o jogo pede calibração.
- Swing e Andamento não dependem de latência.

## Feedback ao vivo

A cada compasso o app analisa os últimos compassos gravados e pinta o compasso que acabou: pontos
na grade (cedo, no lugar, tarde), a média do compasso e o combo de compassos no bolso. O professor
só fala quando o microfone está fechado (fim da rodada), para a voz não entrar na gravação.

## O professor

`app/js/professor.js`. Fala (síntese de voz do aparelho, pt-BR), balão na tela ou texto no
resultado, conforme Perfil › Professor. Elogio só com fato medido; correção sempre com a ação
("pense na semicolcheia do 4", "desça 6 BPM"). Frases variam para não repetir.

## Frase do dia

`app/js/frases.js`: frases próprias (nenhuma citação de terceiros), uma por dia, sem repetir num
ciclo longo. Muda de tom conforme a situação (sequência longa, volta depois de dias parados).
