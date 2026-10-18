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

## Tom do tutor

Objetivo e exigente, com número em cada frase. Elogio só como fato ("caiu de ±13 para ±10 ms").
Nunca inventa tendência sem dados.
