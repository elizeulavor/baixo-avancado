---
description: Cria um drill novo (linha escrita, gerador ou linha que o aluno transcreveu)
argument-hint: <o que treinar, módulo, ou "transcrição: ...">
---

Pedido: $ARGUMENTS

1. Leia `metodo/formato-drill.md`.
2. Se faltar o que muda o drill (módulo, estilo, tom), escolha um padrão razoável e diga qual; não faça interrogatório.
3. Escreva o drill: id novo no módulo certo (`<modulo>-<n>` seguinte), linha ou gerador, BPM inicial
   e meta exigentes, critério que mede o que o drill treina. Linha de música protegida: só se foi o
   aluno que transcreveu, e fica neste aparelho; não reproduza de memória.
4. Insira em `app/programa/programa.json` e rode `node scripts/validar.mjs` até passar.
5. Mostre a linha em tablatura de texto, o critério de aprovação e o comando para o aluno ver no app.
   Se o app está publicado, ofereça `node scripts/empacotar.mjs` + `/publicar`.
