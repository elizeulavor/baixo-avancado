# Baixo Avançado

Curso avançado de baixo que escuta você. Cada exercício tem critério numérico: o app grava pelo
microfone com o metrônomo tocando e mede **tempo** (regularidade, pressa/atraso, semicolcheia
torta, deriva), **notas** (altura e afinação), **dinâmica** (volume igual, acentos, ghost notes,
crescendo) e **som** (articulação, pausas limpas, clareza). Passou, o BPM sobe. Não passou, os
números dizem por quê.

- 12 módulos, 69 drills, 2 trilhas em paralelo: mão, tempo e groove / harmonia e linguagem.
- Plano do dia automático (20 a 90 min), revisão espaçada, leitura e ditado novos todo dia.
- Metrônomo (clique no 2 e 4, só no 1, sumindo, treino de velocidade, 5/4, 7/8), 20 grooves com
  acordes (funk, samba, bossa, baião, jazz, 7/8...), afinador, gravação livre.
- Lembrete diário pelo calendário do celular. Funciona sem internet. 4 ou 5 cordas.
- O Claude é o treinador: lê seu progresso, ajusta o programa, cria drills.

## Instalar no computador

1. Instale o [Node.js](https://nodejs.org) (18 ou mais novo).
2. Dê dois cliques em `INSTALAR.bat` (Windows) ou abra esta pasta no Claude Code e escreva **iniciar**.
3. Abra http://localhost:5173. No computador o microfone já funciona.

## Instalar no celular

O microfone do celular só funciona em endereço HTTPS. Uma vez:

1. No Claude Code, nesta pasta: `/publicar` (GitHub Pages ou Netlify Drop, grátis).
2. Abra o endereço no celular. Android/Chrome: menu ⋮ › **Instalar app**. iPhone/Safari:
   Compartilhar › **Adicionar à Tela de Início**.
3. No app: **Ferramentas › Calibrar** (30 s, sem fone) e **Ajustes › Adicionar lembrete ao calendário**.

## Uso diário

Abra no lembrete, siga os cartões de **Hoje**. Em cada drill: ouça o modelo se quiser, grave o take,
leia os números. Celular a 30-60 cm do baixo ou do amplificador, alto-falante ligado, sem fone
Bluetooth.

Uma vez por semana: **Ajustes › Exportar progresso**, solte o arquivo em `entrada/` e peça `/revisar`.

## Pastas

```
app/          o app (abre no navegador, instala no celular)
metodo/       como o curso funciona, como escrever drills, como a avaliação mede
entrada/      backups exportados e áudios para transcrever
relatorios/   análises semanais do /revisar
scripts/      iniciar, servidor, validar, testar-avaliacao, empacotar, icones
```

## O que saber

- Seu progresso fica no aparelho. Exporte o backup de vez em quando.
- O app mede ataques, alturas e volumes. Não julga timbre nem musicalidade.
- Os limites da avaliação estão em `metodo/avaliacao.md`. Os limiares foram ajustados com baixo
  sintético; os primeiros takes reais servem de validação.
