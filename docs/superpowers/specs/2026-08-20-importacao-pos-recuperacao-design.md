# Importação do Mapão pós-recuperação

Data: 20/08/2026.

## Problema

A nota da Avaliação de Recuperação Semestral já foi lançada na Sala do Futuro, e
isso gerou um Mapão novo. Hoje a coordenação digita essa nota linha a linha no
app: no lote real são 502 linhas de ATA. O Mapão novo já tem a resposta dentro.

O Mapão novo não traz coluna de recuperação. A nota do bimestre foi
**sobrescrita na origem**: o aluno que tinha 3,0 no 1º bimestre aparece agora com
a nota da recuperação naquela mesma célula. Então a nota de recuperação não é
lida, é **descoberta por comparação** entre o lote antigo e o novo.

## Objetivo

Importar o Mapão pós-recuperação e preencher sozinho, para cada linha da lista de
recuperação: a nota da recuperação, o bimestre substituído e o desfecho —
`Recuperou`, `Não recuperou` ou `Não realizou`. Digitação manual passa a ser
exceção, para as linhas que o app não consegue decidir.

## Decisões tomadas

Todas confirmadas com a coordenação em 20/08/2026.

1. **A nota de recuperação vem por diff**, não por coluna nova no Mapão.
2. **Linha que não mudou vira `Não recuperou`.** Diff não distingue quem fez a
   prova e não alcançou 5,0 de quem faltou — nos dois casos a origem fica igual.
   `Não realizou` sai do fluxo automático e só existe se alguém marcar na mão.
3. **Desfecho responde "alcançou 5,0?", não "mudou?".** Aluno que foi de 2,0 para
   4,0 tem nota de recuperação 4,0, bimestre substituído registrado, e desfecho
   `Não recuperou`. É o que a direção e a Diretoria de Ensino leem na ATA.
4. **Dois passos explícitos.** O lote antigo expira em 12 horas e a nota só saiu
   depois de 12/08, então os dois lotes entram na mesma sessão: primeiro os
   Mapões do 1º e 2º bimestre, como hoje; depois o Mapão pós-recuperação, por um
   botão próprio. Descartadas: detecção automática no upload comum, que
   sobrescreveria nota de aluno em silêncio ao adivinhar errado; e guardar o lote
   original em chave sem expiração, que desfaz a decisão de retenção de
   08/08/2026.
5. **Resumo antes de aplicar.** Nada torto entra sozinho num documento oficial.
6. **Mapão vence a digitação manual**, e a linha em conflito entra na lista de
   divergências — o valor oficial fica, e o conflito continua visível.
7. **`Não recuperou` é opção do dropdown de nota**, irmã de `Não realizou`, e o
   desfecho é uma coluna calculada, só de leitura. Reaproveita o mecanismo que já
   existe e já tem teste, inclusive o de desabilitar o bimestre substituído.
8. **Nota é inteira.** Conferido no Mapão real. Decimal que apareça vira
   divergência, nunca arredondamento silencioso.

## A regra do diff

**Chave de comparação:** aluno + turma + disciplina, passados por `normal()` — a
mesma chave de `mergeRows` e da sala compartilhada, que ignora acento e caixa.

**Bimestres candidatos:** só os que têm nota numérica na linha atual. `—` em
`r[3]` ou `r[4]` significa "estava em 5,0 ou acima, não entrou em recuperação";
mudança nesses é ruído e é ignorada.

Para cada linha da lista de recuperação:

| Situação no Mapão pós-recuperação | Resultado |
|---|---|
| exatamente um bimestre candidato subiu | nota de recuperação = valor novo; bimestre substituído = esse |
| nenhum bimestre candidato mudou | nota de recuperação = `Não recuperou`; sem bimestre substituído |
| os dois bimestres candidatos mudaram | divergência |
| nota caiu | divergência |
| nota nova não é inteira | divergência |
| linha sumiu do Mapão novo | divergência |
| linha já preenchida na mão, e o Mapão discorda | Mapão vence, **e** a linha entra em divergências |

Divergência não aplica valor nenhum. A linha fica destacada na lista, para
decisão manual.

O caso dos dois bimestres alterados é anomalia de verdade: o item 7.3 do FAQ diz
que só o bimestre de menor desempenho é alterado, e `combineRecords` já calcula
qual é. Se os dois mudaram, algo aconteceu fora da recuperação semestral.

**Desfecho**, calculado a partir da nota de recuperação:

| Nota de recuperação | Desfecho |
|---|---|
| 5 a 10 | `Recuperou` |
| 1 a 4 | `Não recuperou` |
| `Não recuperou` | `Não recuperou` |
| `Não realizou` | `Não realizou` |
| `—` (nada lançado) | vazio |

## Fluxo na tela

Botão novo no cabeçalho da lista de recuperação, ao lado de `Exportar Excel`:
`Importar Mapão pós-recuperação`. Abre o mesmo seletor de arquivo, com os mesmos
limites de `MAX_UPLOAD_FILES` e `MAX_UPLOAD_BYTES`.

Sem lote na tela, o botão recusa e explica: "Importe primeiro os Mapões do 1º e
2º bimestre."

Lido o arquivo, um modal de resumo aparece **antes** de aplicar:

> 412 linhas preenchidas · 78 não recuperou · 12 divergências

`Aplicar` grava; `Cancelar` e `Esc` não tocam em nada. Aplicado, as divergências
ficam destacadas na lista de recuperação.

## Arquitetura

A lógica é função pura ao lado de `combineRecords` e `mergeRows`, seguindo a
costura criada no PR 25: leitura acontece uma vez em `readSheetRows`, e tudo
abaixo é função pura sobre o array de linhas do SheetJS. Isso mantém o parser
testável em Node, sem DOM e sem rede.

Descartado: pôr o modo pós-recuperação dentro de `mergeRows`, que já faz três
coisas; e criar módulo separado, que num projeto sem bundler significa script
novo no `index.html` e na CSP.

### Onde encosta

| Onde | Mudança |
|---|---|
| `parseSheet` (app.js:95) | 3º parâmetro `todasAsNotas`. Hoje a função só guarda nota abaixo de 5, e jogada no Mapão novo descartaria justamente quem recuperou. Sem o parâmetro, comportamento de hoje intacto. |
| `aplicarPosRecuperacao(linhas, registros)` | função nova, pura. Devolve `{linhas, preenchidas, naoRecuperou, divergencias}`. |
| `notaRecuperacao` (app.js:109) | aceitar `Não recuperou`. |
| `validateRecoveryScore` (app.js:187) | aceitar `Não recuperou`. **É a armadilha do PR 20**: esse validador roda em fase de captura, e foi ele que fez `Não realizou` aparecer no dropdown sem funcionar. |
| `recoveryScoreOptions` (app.js:15) | opção `Não recuperou` no dropdown. |
| `rowStatus` (app.js:7) | `Não recuperou` conclui a linha, igual a `Não realizou`. |
| `recoveryRows` (app.js:36) | coluna `Desfecho`, calculada; destaque na linha divergente. |
| `ataRows` e `renderAta` (app.js:38-39) | coluna `Desfecho` na ATA da tela. |
| `montarAtaWord` | mesma coluna no `.docx`. |
| `exportRecovery` (app.js:152) | cabeçalho e coluna no Excel exportado. |
| `linhaValidada` (app.js:114) | `Não recuperou` limpa o bimestre substituído, no mesmo ponto onde `Não realizou` já limpa, para a planilha preenchida que volta pelo upload. |
| `index.html` | botão novo e modal de resumo. |
| `styles.css` | destaque da linha divergente. |

### O que não muda

- **Sala compartilhada.** `linhasParaSala` manda `row.slice(0,7)`, e o desfecho é
  calculado, não guardado. O `CABECALHO` do Apps Script fica igual e a
  implantação não precisa ser refeita.
- **`localStorage`.** `restoreLocal` filtra `row.length>=8`; lote gravado antes
  desta mudança continua abrindo, e o desfecho é calculado na hora.
- **Retenção de 12 horas, CSP, SRI, SheetJS e a biblioteca `docx`.**

## Testes

`test-parser.mjs`, sem DOM e sem rede:

- leitura com `todasAsNotas` traz nota igual ou acima de 5, e sem o parâmetro não traz;
- um teste por linha da tabela do diff;
- bimestre não candidato (`—`) que mudou é ignorado;
- desfecho para cada faixa de nota;
- chave com acento e caixa diferentes casa na comparação.

`test-app.mjs`, em DOM de verdade:

- botão recusa sem lote na tela, com a mensagem certa;
- modal de resumo mostra as três contagens;
- `Aplicar` preenche a lista; `Cancelar` e `Esc` não mexem em nada;
- `Não recuperou` escolhido no dropdown sobrevive ao evento `change` — o teste que
  faltou no PR 19;
- `Não recuperou` desabilita e limpa o bimestre substituído;
- coluna `Desfecho` aparece na tela, no Excel e na ATA;
- linha divergente fica destacada e sem valor aplicado.

## Fora de escopo

- Relatório de participação da Sala do Futuro, que separaria quem faltou de quem
  não alcançou a média. Se esse arquivo existir um dia, é uma terceira
  importação, não uma mudança nesta.
- Propagação de `Não recuperou` para as outras disciplinas do aluno. Recuperação
  é por componente; propagar não faz sentido aqui.
- Qualquer mudança na sala compartilhada ou no Apps Script.
