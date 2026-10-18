# Radix · baixo avançado

Curso avançado de baixo que escuta você. Cada exercício tem critério numérico: o app grava pelo
microfone com o metrônomo tocando e mede **tempo** (regularidade, pressa/atraso, semicolcheia
torta, deriva), **notas** (altura e afinação), **dinâmica** (volume igual, acentos, ghost notes,
crescendo) e **som** (articulação, pausas limpas, clareza). Passou, o BPM sobe. Não passou, os
números dizem por quê.

App publicado: https://elizeulavor.github.io/baixo-avancado/ · logo e marca em `marca/` (o sismógrafo: linha calma, o golpe grave que desenha a raiz √, a vibração que fica).

- 12 módulos, 69 drills, 2 trilhas em paralelo: mão, tempo e groove / harmonia e linguagem.
- **Treino guiado**: um botão leva de etapa em etapa do plano do dia (20 a 90 min), com revisão
  espaçada e leitura/ditado novos todo dia.
- **Gamificação**: XP por take (mais no BPM alto e com combo), 55 níveis com títulos, sequência de
  dias com escudo, 26 conquistas, recordes por drill, radar de 6 habilidades, mapa de trilhas e
  **prova final** em cada módulo (3 drills sorteados acima da meta, em sequência).
- **Só sons reais**: baixo elétrico (dedo, ghost, staccato, slap, pop), baixo acústico, bateria de
  jazz, percussão (agogô, triângulo, ganzá, pandeirola, congas), Rhodes, piano, metrônomo de claves.
  Créditos e licenças em `app/sons/CREDITOS.md`.
- Ferramentas: metrônomo (2 e 4, só no 1, sumindo, treino de velocidade, 5/4, 7/8), 20 grooves com
  acordes, afinador, **jogo do braço** (ache a nota contra o relógio), **estudo de música** (loop
  A-B e velocidade sem mudar o tom, para tirar de ouvido), gravação livre, calibração.
- Lembrete diário pelo calendário do celular. Funciona sem internet. 4 ou 5 cordas.
- O Claude é o treinador: lê seu progresso, ajusta o programa, cria drills.

## Instalar no celular

1. Abra o endereço acima no celular. Android/Chrome: menu ⋮ › **Instalar app**. iPhone/Safari:
   Compartilhar › **Adicionar à Tela de Início**.
2. No app: **Ferramentas › Calibrar** (30 s, sem fone) e **Perfil › Rotina e ajustes › Lembrete no calendário**.

## No computador

1. Instale o [Node.js](https://nodejs.org) (18 ou mais novo).
2. Dê dois cliques em `INSTALAR.bat` ou abra esta pasta no Claude Code e escreva **iniciar**.
3. Abra http://localhost:5173. Atualizar o celular depois de mudanças: `/publicar`.

## Uso diário

Abra no lembrete e toque em **Começar treino**. Em cada drill: ouça o modelo se quiser, grave,
leia os números, siga para a próxima etapa. Celular a 30-60 cm do baixo ou do amplificador,
alto-falante ligado, sem fone Bluetooth.

Uma vez por semana: **Perfil › Exportar**, solte o arquivo em `entrada/` e peça `/revisar`.

## Pastas

```
app/          o app (abre no navegador, instala no celular); app/sons/ com as gravações
metodo/       como o curso funciona, como escrever drills, como a avaliação mede, lições
entrada/      backups exportados e áudios para transcrever
relatorios/   análises semanais do /revisar
scripts/      iniciar, servidor, validar, testes, preparar-sons, empacotar, publicar, icones
```

## O que saber

- Seu progresso fica no aparelho. Exporte o backup de vez em quando.
- O app mede ataques, alturas e volumes. Não julga timbre nem musicalidade.
- A avaliação foi calibrada com baixo sintético e com gravações reais de baixo (ver
  `metodo/avaliacao.md`). Os primeiros takes com o seu baixo são a validação final.
- Sons do Rickenbacker (slap/pop) e do jRhodes: licença não comercial. Para vender o curso, troque-os.
