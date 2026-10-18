# Método

## A ideia

Prática deliberada medida. Cada drill tem um critério numérico de aprovação. O aluno não "acha"
que está bom: o take passa ou não passa. O BPM só sobe quando passa.

## Estrutura

- **12 módulos em duas trilhas que andam juntas.** Trilha A: mão, tempo e groove (relógio interno,
  mão direita, mão esquerda, ghost notes, slap I e II). Trilha B: harmonia e linguagem (tétrades,
  escalas e modos, walking, Brasil, leitura e ouvido, improviso).
- **Módulo ativo** de cada trilha = o primeiro ainda não concluído. Concluído = todos os drills dominados.
- **Drill dominado** = aprovado no BPM meta em 2 dias diferentes.
- **Progressão:** aprovou no BPM atual, o próximo começa `passo` acima (ou abaixo, nos drills de
  tempo lento, onde a meta é mais devagar). Três reprovações no mesmo BPM no dia: o app manda
  descer 2 passos por 2 takes e voltar.

## Plano do dia (montado pelo app)

| Minutos | Itens |
|---|---|
| 20 | aquecimento, principal A, principal B, groove do dia (3 jogos curtos), revisão |
| 30 | + leitura ou ditado do dia |
| 45 | + um terceiro drill principal |
| 60+ | + desafio do módulo |

- **Aquecimento** gira entre os drills marcados `"aquecimento": true`.
- **Principal** = drill não dominado do módulo ativo com menor progresso (empate: o mais esquecido).
- **Revisão** = drill dominado treinado há mais tempo, no BPM meta (revisão espaçada).
- **Leitura e ditado** mudam todo dia (semente = data). Ninguém decora.
- Sequência de dias conta quando ≥ 80% do plano foi feito; dias fora da agenda não quebram.

## Critérios padrão (avançado)

| Medida | Padrão | Observação |
|---|---|---|
| Regularidade do tempo (desvio-padrão dos ataques) | ≤ 12 ms | profissional fica entre 5 e 10 ms |
| Pressa/atraso médio | ≤ 10 ms | só conta com latência calibrada ou clique ouvido na gravação |
| Notas certas | ≥ 95% | classe de altura (oitava é avisada à parte) |
| Notas faltando | ≤ 5% | ghost notes não detectadas não contam |
| Notas a mais | ≤ 10% | corda solta soando, ruído, nota extra |

Cada drill pode apertar ou afrouxar em `criterios` e `dinamica` (ver `formato-drill.md`).

## Como o aluno usa

1. Abre o app (lembrete do calendário no horário marcado).
2. Hoje: segue os cartões. Cada drill: ouvir o modelo (opcional), gravar o take, ler os números.
3. Uma vez por semana: Ajustes > Exportar progresso, e solta o arquivo em `entrada/` para o `/revisar`.

## O que o treinador (você) faz no /revisar

- Lê o backup. Para cada drill com takes na semana: BPM de início e fim, taxa de aprovação, notas.
- Aponta **onde trava**: drill com 10+ takes sem subir, ou aprovação < 30%.
- Aponta **padrões nas dicas** (ex.: "e" sempre atrasado, pausas sujas, dinâmica oscilando).
- Decide e aplica: apertar critério de quem passa fácil, dividir drill travado em um drill ponte,
  mudar o passo de BPM. Valida, empacota, publica de novo se o aluno quiser.
- Escreve `relatorios/AAAA-MM-DD.md`: 10 linhas no máximo, números e próximos passos.

Arquivos do método: `formato-drill.md` (como escrever drills), `avaliacao.md` (o que cada número
mede e os limites do microfone), `erros-e-licoes.md` (o que já deu errado).
