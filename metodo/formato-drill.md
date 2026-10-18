# Formato do drill (`app/programa/programa.json`)

```json
{"id": "a4-2", "titulo": "Funk em E", "objetivo": "uma linha, o que se treina",
 "instrucao": "opcional, uma ou duas frases",
 "linha": "E0:16 r E0x E12 | ...",          // OU "gerar": {...}
 "compasso": 4,                              // 4 | 5 | "7/8" | "6/8"   (padrão 4)
 "grupos": [2, 2, 3],                        // acentos do clique em compassos /8
 "bpm": {"inicio": 80, "meta": 112, "passo": 3},
 "voltas": 2,                                // quantas vezes a linha repete no take
 "click": "normal",                          // normal | 2e4 | 1 | gap
 "gap": [2, 2],                              // com click "gap": compassos com / sem clique
 "modo": "sequencia",                        // sequencia | alvos | aproximacao | conjunto | grade
 "progressao": "| Dm7 | G7 |",               // obrigatório em alvos/aproximacao
 "conjunto": {"tom": "D", "escala": "dorico"},  // modo conjunto
 "grade": 0.5,                               // conjunto/grade: espaçamento em tempos
 "gradeLivre": true,                         // alvos com ritmo livre na grade (improviso)
 "swing": 0.15,                              // atraso da semicolcheia do contratempo
 "oculto": true,                             // ditado: tablatura escondida até o aluno pedir
 "aquecimento": true,                        // entra no rodízio de aquecimento
 "groove": "funk",                           // groove sugerido (id em grooves.json)
 "criterios": {"tempoDesvio": 12, "tempoMedio": 10, "notas": 95, "faltas": 5,
               "silencio": 24, "staccato": 55, "legato": 85},
 "dinamica": {"tipo": "uniforme", "max": 3} | {"tipo": "acentos", "min": 6} | {"tipo": "crescendo", "min": 15},
             // e/ou "fantasma": 10  (ghosts pelo menos 10 dB abaixo)
}
```

## Notação da linha

Fichas separadas por espaço. `E5:16` = corda E, casa 5, semicolcheia.

| Ficha | Significado |
|---|---|
| `A7:8` | corda A, casa 7, colcheia. Sem `:dur`, repete a duração anterior |
| `r:4` / `r` | pausa |
| durações | `1 2 4 8 16 32`, `.` pontuada (`8.`), `t` tercina (`8t`), `q` quintina (`16q`) |
| `x` | ghost note (`A5x`) |
| `s` `p` | slap (polegar) e pop |
| `h` `u` `l` | hammer-on, pull-off, slide |
| `n` | harmônico natural (casas 12, 7, 5, 4, 19, 24) |
| `>` `^` `~` | acento, staccato, legato |
| `( ... )*4` | repete o grupo |
| `A5*8` | repete a ficha |
| `|` | barra de compasso; o validador confere a soma de cada compasso |

Cordas: `B E A D G` (B só para 5 cordas). Escreva para 4 cordas sempre que der.

## Geradores (`"gerar"`)

| tipo | campos |
|---|---|
| `escala` | `tom`, `escala` (ver `ESCALAS` em `musica.js`) ou `escalas: [...]`, `oitavas`, `padrao` (sobe-desce, sobe, desce, tercas, quartas, grupos3, grupos4), `figura`, `corda`, `posicao` |
| `arpejo` | `acordes: ["{t}maj7"]`, `padrao` (1357, 7531, 13578753, 3571, aprox, proxima), `figura` |
| `permutacao` | `dedos: "1324"`, `casa`, `voltas`, `figura` |
| `walking` | `progressao`, `feel` (2 = mínimas) |
| `cercadura` | `progressao` (alvo = 3ª de cada acorde) |
| `leitura` / `ditado` | `nivel` 1-3, `compassos`, `diario: true` |

Tons: `"tons": "quartas"` (12 tons), `"tons": ["C", "F"]`, `"tons": "diario"` com `"quantos": 3`,
ou `"tom": "diario"`. `{t}` nos acordes vira o tom da vez.

## Modos de avaliação

- **sequencia**: cada nota escrita no seu tempo; confere tempo e altura de cada uma.
- **alvos**: o ritmo vem da linha-modelo (ou da grade, com `gradeLivre`); a altura só é exigida na
  troca de acorde: tem de ser nota do acorde. As outras são livres. Para walking e improviso.
- **aproximacao**: como alvos, e o último tempo antes de cada troca tem de estar a um semitom da raiz seguinte.
- **conjunto**: grade rítmica; toda nota tem de pertencer à escala.
- **grade**: só tempo e dinâmica, na grade.

## Regras de escrita

- Objetivo em uma linha. Instrução só quando o que fazer não é óbvio pela tablatura.
- Um take entre 10 e 60 s no BPM inicial (o validador avisa acima de 75 s).
- `bpm.inicio` é o que um aluno avançado toca limpo no primeiro dia; `meta` é exigente de verdade.
- Ids nunca mudam depois de publicados (o progresso fica preso ao id).
- Rode `node scripts/validar.mjs`.
