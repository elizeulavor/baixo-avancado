# Do Radix pessoal ao Radix comercial

O app foi construído para crescer sem reescrever: todo o estado do aluno passa por um único arquivo
(`app/js/estado.js`), o programa é dados (`app/programa/*.json`) e a avaliação roda no aparelho
(nenhum áudio precisa ir para um servidor). Abaixo, o caminho em fases, com o que bloqueia cada uma.

## Bloqueios antes de vender (resolver primeiro)

1. **Licença dos sons.** Dois bancos são só para uso não comercial (CC BY-NC-SA): o Rickenbacker
   4001 (slap e pop) e o jRhodes (Rhodes). Trocar por bancos CC0 ou comprados com licença comercial,
   ou pedir licença aos autores. Os demais (Karoryfer, Versilian, VCSL) são CC0: livres.
2. **Código público.** Hoje o repositório no GitHub é público (necessário para o GitHub Pages
   gratuito). O `LICENSE` reserva todos os direitos, mas o código fica visível. Para o produto:
   repositório privado + hospedagem que publica de repositório privado (Cloudflare Pages ou Vercel,
   ambas com plano gratuito).
3. **Repertório.** Os vídeos são do player oficial do YouTube, embutido, sem baixar áudio: isso é
   permitido pelos termos do YouTube também em produto pago. As progressões harmônicas são fatos
   musicais (não têm direito autoral); as linhas de baixo transcritas não entram no app.
4. **Marca.** Pesquisar "Radix" no INPI (classe 9 e 41) antes de investir em marketing.

## Fase 1: contas e progresso na nuvem (multiusuário)

- **Supabase** (Postgres + login + regras por usuário; plano gratuito até ~50 mil usuários ativos):
  tabela `progresso (usuario, estado jsonb, atualizado)`. O `estado.js` ganha `sincronizar()`:
  salva local como hoje e envia ao servidor quando há internet. Login por e-mail (link mágico) e
  Google.
- Os backups manuais continuam (exportar/importar), agora também restauráveis pela conta.
- Esforço: ~1 a 2 semanas de trabalho com o Claude. Custo: zero até ter muitos usuários.

## Fase 2: assinatura

- **Brasil:** Hotmart, Kiwify ou Eduzz (já cuidam de nota fiscal, Pix, boleto e afiliados) mandam um
  webhook para o Supabase marcar `assinante = true`. **Internacional:** Stripe.
- O app decide o que é gratuito (ex.: módulo 1, groove níveis 1-3, desafio do dia) e o que é
  assinatura (resto), lendo `assinante`.
- Lojas: Google Play via TWA (o próprio PWA embrulhado, com a ferramenta Bubblewrap); App Store via
  Capacitor. Atenção: dentro das lojas, assinatura digital paga a taxa da loja (15-30%), por isso
  muitos cursos vendem fora (site/Hotmart) e só liberam o acesso no app.

## Fase 3: produto

- Painel do professor (ver alunos, mandar drills), turmas, ranking opcional por semana.
- Programa por nível de entrada (iniciante, intermediário, avançado) a partir do mesmo motor.
- LGPD: política de privacidade, consentimento, exclusão de conta. O áudio não sai do aparelho, o
  que simplifica muito.

## O que já está pronto para isso

- Estado versionado (`estado.versao`) com migração automática ao abrir: dá para mudar o formato dos
  dados sem perder o progresso de ninguém.
- Toda gravação e análise no aparelho: servidor barato, privacidade simples.
- Programa, grooves, repertório e progressões em JSON: dá para ter um editor de conteúdo depois.
