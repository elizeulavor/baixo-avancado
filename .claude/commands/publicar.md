---
description: Publica o app num endereço HTTPS para instalar no celular
---

O microfone do celular só funciona em HTTPS. Publicar põe os arquivos do app (não os dados do aluno,
que ficam no aparelho) num endereço público. Confirme com o aluno antes de publicar.

1. `node scripts/empacotar.mjs` (valida e gera `dist/` e `dist.zip`).
2. Escolha com o aluno, uma vez, e anote a escolha e o endereço numa seção "Publicação" no fim do `CLAUDE.md`:
   - **GitHub Pages** (recomendado, endereço fixo e grátis): precisa de conta GitHub e do `gh` logado.
     Crie o repositório `baixo-avancado` (público, ou privado com plano que permita Pages), envie o
     conteúdo de `dist/` para o branch `gh-pages` e ative Pages nesse branch. Endereço:
     `https://<usuario>.github.io/baixo-avancado/`. Atualizar = empacotar e enviar de novo.
   - **Netlify Drop** (sem instalar nada): o aluno abre https://app.netlify.com/drop e arrasta a
     pasta `dist/`. Para o endereço não expirar, ele cria a conta grátis e "reivindica" o site.
     Atualizar = arrastar de novo no mesmo site (Deploys > arrastar).
3. Depois de publicado: abrir o endereço no celular (Chrome no Android, Safari no iPhone), instalar
   pela tela inicial, Ferramentas > Calibrar, Ajustes > Adicionar lembrete ao calendário.
4. O progresso fica preso ao endereço: trocar de endereço = exportar no antigo e importar no novo.
