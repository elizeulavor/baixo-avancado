---
description: Analisa o progresso exportado pelo app e ajusta o plano
---

1. Ache o backup mais recente em `entrada/` (`baixo-progresso-*.json`). Sem backup: peça ao aluno
   para exportar em Ajustes > Exportar progresso e soltar o arquivo em `entrada/`. Pare.
2. Leia `metodo/LEIA-PRIMEIRO.md` (seção /revisar) e o relatório anterior em `relatorios/`, se houver.
3. Calcule, só com o que está no arquivo:
   - minutos por dia e dias treinados nas últimas 2 semanas; sequência;
   - por drill com takes no período: BPM no início e agora, takes, % aprovados, nota média;
   - drills travados (10+ takes sem subir BPM, ou < 30% aprovados);
   - padrões que se repetem nas dicas (`ultimo.dicas`).
4. Decida no máximo 3 ajustes e aplique em `app/programa/programa.json`: apertar critério de drill
   que passa fácil, drill ponte para o travado (id novo), passo de BPM. Nunca mude id existente.
5. `node scripts/validar.mjs`. Se o aluno usa o app publicado: `node scripts/empacotar.mjs` e ofereça `/publicar`.
6. Escreva `relatorios/<data>.md`, 10 linhas no máximo: números, onde travou, o que mudou, foco da semana.
7. Responda com o mesmo conteúdo, curto. Sem elogio vazio.
