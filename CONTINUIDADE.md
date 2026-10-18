# Continuidade: o Radix não depende de nenhuma IA nem de nenhum serviço

O que aconteceu com o app do Manus (o código vivia dentro da plataforma e sumiu com ela) não
acontece aqui, porque **o Radix é só um conjunto de arquivos comuns** (HTML, CSS, JavaScript, JSON,
MP3) que ficam no seu computador, na sua nuvem e na sua conta do GitHub. Não há compilação, não há
servidor próprio, não há banco de dados de terceiros, não há código guardado "dentro" do Claude.
Qualquer pessoa ou IA que saiba programar abre a pasta e continua.

## Onde o Radix existe (5 cópias independentes)

| # | Onde | O que tem | Se perder |
|---|---|---|---|
| 1 | `C:\Users\conta\OneDrive\Documentos\Baixo-Avancado` | tudo: código, programa, sons, métodos, histórico git | restaura de 2, 3 ou 4 |
| 2 | OneDrive (nuvem da Microsoft) | cópia automática da pasta 1, com histórico de versões de 30 dias | restaura de 3 ou 4 |
| 3 | GitHub, conta `elizeulavor`, repositório `baixo-avancado` | código e histórico completo (ramo `main`) e o app publicado (`gh-pages`) | restaura de 1 ou 4 |
| 4 | `Documentos\Baixo-Avancado-backups` (no OneDrive) | `node scripts/backup.mjs`: o repositório inteiro num arquivo `.bundle` + um zip com o que não vai ao GitHub (backups do progresso, relatórios) | restaura de 1 ou 3 |
| 5 | o celular | o app instalado funciona offline, mesmo se o site sair do ar | reinstala de 3 |

**Seu progresso** (takes, estrelas, XP) mora no celular. Ele é protegido por: backup em 1 toque
(Perfil › Backup, ou o aviso semanal na tela Hoje), que manda o arquivo para o Google Drive, e-mail ou
WhatsApp; e pontos de restauração automáticos dentro do app (um por dia, os últimos 14). Salve os
arquivos de backup também em `entrada/` (cópia 1 e 2 levam junto).

## Regras para nunca perder o acesso

1. **GitHub:** ative a verificação em duas etapas e **guarde os códigos de recuperação** (GitHub ›
   Settings › Password and authentication). Guarde-os fora do celular (impressos ou num cofre de
   senhas). Sem isso, perder o celular pode significar perder a conta.
2. **Microsoft (OneDrive):** mesma coisa: duas etapas + e-mail e telefone de recuperação atualizados.
3. **Depois de cada mudança grande:** commit + `node scripts/backup.mjs`. O Claude faz isso ao fim de
   cada sessão de trabalho (está nas regras do `CLAUDE.md`).
4. **Uma vez por mês:** copie a pasta `Baixo-Avancado-backups` para um pendrive ou HD externo. É a
   única cópia que não depende de nenhuma conta.
5. **Nunca** edite o app só pelo site publicado ou por uma ferramenta online: a fonte da verdade é a
   pasta 1 (e o `main` no GitHub).

## Como recomeçar do zero num computador novo

1. Instale o Node (https://nodejs.org) e o Git (`winget install Git.Git`).
2. Pegue o código, por qualquer uma das cópias:
   - do GitHub: `git clone https://github.com/elizeulavor/baixo-avancado.git Baixo-Avancado`
   - do backup: `git clone Baixo-Avancado-backups\radix-AAAAMMDD-HHMM.bundle Baixo-Avancado`
3. `cd Baixo-Avancado` e `node scripts/iniciar.mjs`: confere tudo e abre o app em
   http://localhost:5173.
4. No celular, o app publicado continua no mesmo endereço; o progresso volta por Perfil › Importar.

## Como continuar editando sem o Claude

- Qualquer editor de texto serve (VS Code é o mais prático). Não há etapa de compilação: editou o
  arquivo, recarregou a página, está valendo.
- O mapa do projeto está em `CLAUDE.md` (pastas e comandos) e `AGENTS.md` (mesmas regras para
  outras IAs: ChatGPT/Codex, Gemini, Cursor). O método está em `metodo/`.
- Antes de publicar: `node scripts/validar.mjs` e os testes (`testar-avaliacao`, `testar-real`,
  `testar-groove`). Publicar: `node scripts/publicar.mjs`.

## Dependências externas (e o plano B de cada uma)

| Serviço | Para quê | Se acabar |
|---|---|---|
| GitHub Pages | endereço do app | qualquer hospedagem estática serve (Cloudflare Pages, Netlify, Vercel): é só subir a pasta `dist/` |
| YouTube | vídeos do repertório e das progressões | o resto do app funciona; os vídeos trocam por outros links |
| Google Fonts / CDNs | nenhuma: fontes e sons estão dentro do app | — |
| Claude | edição assistida | qualquer programador ou outra IA continua pelos arquivos |

Veja `docs/ROTEIRO-COMERCIAL.md` para o caminho até um app com usuários e assinatura.
