# Memória — Mapa Norte

Atualizado em 17/07/2026.

## Estado

- Repositório: `rrsantos54/coordenacao-escolar-mapa-norte`.
- GitHub Pages: https://rrsantos54.github.io/coordenacao-escolar-mapa-norte/
- Apps Script: implantação ativa protegida por login Google institucional.
- Escola: E.E. “PREF. WALDOMIRO SAMPAIO DE SOUZA” - SAGRES.
- Município: SAGRES.
- Cabeçalho da ATA configurado conforme dados fornecidos.

## Fluxo funcional

- Importa lotes de planilhas do primeiro e segundo bimestres.
- Separa turma, aluno, componente curricular e bimestre.
- Identifica nota inferior a 5,0.
- Permite nota de recuperação semestral em dropdown de 1 a 10, mais a opção `Não realizou a prova`.
- Marcar `Não realizou` conclui o registro sem nota: não há bimestre a substituir, então o seletor de bimestre é desabilitado e limpo.
- Ao marcar `Não realizou`, o app oferece aplicar às demais disciplinas do mesmo aluno, por um modal de confirmação que informa quantas linhas serão afetadas e quantas já têm nota lançada. `Aplicar a todas` sobrescreve nota existente e não tem desfazer; `Só esta linha` e `Esc` cancelam.
- O aluno é identificado por nome mais turma, a mesma chave da mesclagem de lotes, então homônimo em outra turma não é atingido.
- Permite substituição do primeiro ou segundo bimestre.
- Mantém notas anterior e atualizada na ATA.
- Gera ATA sem abreviações desnecessárias.
- Exclui salas de teste.
- Botão “Apagar dados”, antes “Limpar sessão”, remove o lote da página e do `localStorage`.

## Segurança aplicada

- Autorização por conta Google institucional no Apps Script.
- Domínios padrão permitidos: `professor.educacao.sp.gov.br` e `educacao.sp.gov.br`.
- Validação de campos, notas, status, bimestre e tamanho.
- Limite de 2.000 registros por lote.
- Limite de 50 arquivos e 15 MB por arquivo, conforme `MAX_UPLOAD_FILES` e `MAX_UPLOAD_BYTES` em `app.js`.
- `LockService` para gravações concorrentes.
- Proteção contra fórmula maliciosa em planilhas.
- CSP, SRI e `crossorigin` para SheetJS.
- Bloqueio contra clickjacking.
- Persistência do lote no `app.js` do Pages, por fase: nada até o PR 4, `sessionStorage` do PR 5 até 07/08/2026, `localStorage` a partir daí. Chave `mapa-norte-session-v2` em todas.
- Com `localStorage`, os dados dos alunos passam a ficar gravados em disco no navegador, sem prazo de expiração, e sobrevivem a fechar a aba e o navegador. `Apagar dados` é o único caminho para apagá-los na hora.
- Para limitar a retenção, o lote expira sozinho em 12 horas: `persistLocal` grava um `ts`, e `restoreLocal` apaga a chave e ignora o lote quando `Date.now()-ts` passa de `MAX_STORAGE_AGE_MS`. Lote gravado sem `ts`, anterior a essa mudança, é descartado.
- O prazo de 12 horas cobre o dia de trabalho e mata o dado de um dia para o outro, sem depender de alguém lembrar do botão.
- Em computador compartilhado da escola, clicar `Apagar dados` ao terminar continua sendo a forma de apagar na hora.
- A cópia do Apps Script em `apps-script/app.html` segue em `sessionStorage` de propósito: ali o dado real vai para a planilha do Google, então o storage é só cache e não há motivo para gravá-lo em disco.
- Não há `IndexedDB` em nenhuma das versões.
- Secret scanning, push protection e Dependabot ativados.
- GitHub Actions com ações fixadas por SHA.
- Branch `main` protegida: histórico linear, resolução de conversas, sem force-push, sem exclusão e `enforce_admins` ativo.
- Revisão deixou de ser obrigatória em 07/08/2026. `required_approving_review_count` foi para 0 e `require_last_push_approval` para false. Motivo: com um único mantenedor, o GitHub não permite aprovar o próprio PR, e as duas regras juntas travavam qualquer merge de forma permanente.
- Consequência: PRs entram na `main` sem aprovação. O portão de qualidade agora é a conferência antes de abrir o PR, não a revisão.
- Para restaurar a exigência caso o repositório ganhe outro mantenedor: `required_approving_review_count` de volta para 1 e `require_last_push_approval` para true.

## Deploy

- Commit principal de segurança: `e78ca0968586acf8b7fee70346c976ee07c43e8a`.
- Commit de manifesto Web App: `984afec`.
- PR 1: segurança e privacidade, merged.
- PR 2: configuração Web App institucional, merged.
- Apps Script publicado pela workflow `Publicar Apps Script`.
- Pages publicado pela workflow `pages build and deployment`.
- Endpoint não autenticado redireciona para login Google; comportamento esperado.

## Testes concluídos

- Backend: 14/14.
- XSS, fórmula, protótipo, upload falso e fuzzing: passou.
- Clickjacking: passou.
- Dropdown de recuperação: opções de 1 a 10 e `Não realizou a prova`.
- Lote acima de 2.000 registros: rejeitado.
- Teste antigo de privacidade ainda injeta manualmente uma chave em `sessionStorage`; resultado negativo desse teste é obsoleto. Código atual não grava dados nessa chave.
- Propagação de `Não realizou`, verificada em 07/08/2026: aplicar a todas marca as demais disciplinas do aluno e sobrescreve nota existente; `Só esta linha` e `Esc` preservam; homônimo em outra turma fica de fora; aluno com disciplina única não abre o modal; nota numérica comum não abre o modal.
- Expiração de 12 horas do lote, verificada: 1 minuto e 11 horas sobrevivem, 13 horas é descartado, lote sem `ts` é descartado.

## Como testar mudanças antes de publicar

- Servir a pasta local por HTTP e abrir no navegador: `python3 -m http.server 8899`, depois `http://localhost:8899/index.html`. Abrir por `file://` não funciona bem por causa da CSP `default-src 'self'`.
- Testar o caminho que o usuário percorre, não só a função alterada. O bug do PR 20 passou por um check que exercitava `rowStatus` e o texto do fonte, mas nunca o `change` no dropdown, onde estava a rejeição.

## Cache depois do deploy

- Depois de publicar, o navegador continua servindo o `app.js` antigo. Recarregar a página não resolve, e acrescentar parâmetro na URL também não: o `<script src="app.js">` tem cache próprio.
- Só `Cmd+Shift+R` traz a versão nova. Verificar com `validateRecoveryScore.toString()` no console se há dúvida sobre qual versão está rodando.
- Esse é o mesmo tipo de engano que motivou toda a investigação de 07/08/2026, quando uma cópia local defasada parecia ser a versão publicada.

## Sessão de 08/08/2026

- Validação com Mapão real concluída. Os itens 1, 3, 5 e 7 do "Próximo retorno" saíram da lista.
- Correção do item 5: `normalizeSchoolName` move o título honorífico do fim para a frente, abreviado. `Waldomiro Sampaio de Souza Prefeito` vira `PREF. WALDOMIRO SAMPAIO DE SOUZA`. Aplicada nos dois pontos de detecção — nome do arquivo e metadado do Mapão — e nas duas cópias, `app.js` e `apps-script/app.html`.
- A caixa alta preserva acento. `normal()` entra só na chave de busca do título, porque remove acento e transformaria `JOÃO` em `JOAO` no cabeçalho da ATA. O teste pegou isso.
- O item 3 estava descrito errado: não existe geração de DOCX no código. A ATA sai por `Imprimir / PDF` (`printAta`) e há `Exportar Excel` (`exportRecovery`). Foi isso que se validou.
- Homônimo em outra turma não é testável com lote real: os 93 alunos do lote por bimestre não têm nome repetido. Esse caso segue coberto só por dado sintético.

### Mapão consolidado

- Layout diferente do Mapão por bimestre: cabeçalho na linha 0, colunas `DISCIPLINA (1B)` e `DISCIPLINA (2B)` no mesmo arquivo, coluna `SITUAÇÃO`, e nenhuma linha de metadado acima.
- Não traz turma nem escola dentro da planilha. A turma só existe no nome do arquivo.
- Defeito encontrado e corrigido: `findTurma` só conhecia `ANO`, e o char class do ordinal não tinha `ª`. As três turmas de ensino médio (`1ª/2ª/3ª SERIE`) caíam em `Turma não identificada` — 188 dos 485 registros. Agora `TURMA_RE` e `TURMA_NOME_RE` aceitam `ANO` e `SÉRIE/SERIE` com `º`, `°` ou `ª`.
- `TURMA_NOME_RE` não atravessa `_` de propósito. Em nome tipo `..._7º_ANO_A_...` casaria só `7º ANO` e perderia o `A`, juntando turmas diferentes do mesmo ano numa ATA só. Esses arquivos trazem a turma dentro da planilha, então o nome nem é consultado.
- O campo Nome da escola fica vazio com lote consolidado. Não é defeito: o dado não existe no arquivo. `renderAta` só troca o cabeçalho quando `schoolName` tem valor, então a ATA cai no texto padrão do `index.html`, que já é o desta escola. Para outra escola, digitar no campo.
- Lote consolidado deu 485 registros e 95 alunos, contra 483 e 93 do lote por bimestre das mesmas 7 turmas. Diferença de 2 registros e 2 alunos não investigada — os dois lotes foram gerados em momentos diferentes.

### Brasão na ATA

- `brasao-sp.png` adicionado, 250x291, 136 KB, exibido a 58 px na tela e 70 px na impressão.
- Origem: Wikimedia Commons, `File:Brasão do estado de São Paulo.svg`, domínio público, creditado ao Manual de Identidade Visual do Governo de SP. Baixado como PNG pelo `Special:FilePath` com `width=240`.
- O arquivo `brasao sp.jpeg` que estava na pasta é foto de banco de imagem com marca d'água do iStock e legenda "São Paulo (state)". Não foi usado nem versionado. Pode apagar.
- O `<img class="brasao">` fica fora do `.paper-center` porque `renderAta` reescreve o `innerHTML` desse bloco e apagaria a imagem.
- Posição: à esquerda, alinhado verticalmente ao centro do bloco de texto, dentro de `.paper-head` com `display:flex`. Não fica centralizado no topo.
- O wrapper `.paper-head` quebrou o seletor `p:nth-of-type(2)` que o `renderAta` usava para achar o parágrafo de abertura — passou a retornar null. O parágrafo ganhou a classe `.paper-intro` e o seletor deixou de depender de posição. A cópia do Apps Script não tem o wrapper e segue com o seletor antigo, que lá continua correto.
- `printAta` ganhou `<base href>`: a janela de impressão é `about:blank`, onde `src="brasao-sp.png"` relativo não resolve.

### Outros ajustes

- `.paper-table` no `styles.css` tinha 4 colunas e a geração produz 6. Corrigido para 6.
- Cabeçalho de `renderAta` voltou a ter `- SAGRES`, como no texto padrão do `index.html`.
- `.gitignore` agora bloqueia `*.xlsx`, `*.xls` e `.playwright-mcp/`. As planilhas de aluno na pasta do projeto não podem ser versionadas: este repositório publica no GitHub Pages. Histórico conferido, nenhuma planilha foi commitada em momento algum.
- `test-parser.mjs` criado. Roda com `node test-parser.mjs`, sem dependência. Lê as declarações direto do `app.js` para não virar uma segunda cópia das regras. 13 casos de nome de escola, 7 de turma, 4 de `TURMA_RE`.
- Proteção da branch `main` voltou a exigir revisão: `required_approving_review_count` 1 e `require_last_push_approval` true, com `enforce_admins` ativo. Consequência conhecida e aceita: com um único mantenedor, nenhum PR mescla e nem push direto na `main` passa. Reverter é o inverso do que está no item de 07/08.

## Como o app é testado

- `node test-parser.mjs` — 133 verificações, sem dependência e sem rede. É o portão antes de qualquer PR.
- O teste lê as declarações direto do `app.js` por expressão regular, uma por linha. Por isso as funções do parser cabem em uma linha só: quebrar `parseSheet` em várias linhas quebra a extração. O teste falha alto se não achar a declaração, então o esquecimento não passa silencioso.
- Cobre: nome de escola, turma pelos dois layouts, exclusão de transferidos, componentes sem prova, leitura de nota, `parseSheet` nos dois formatos de Mapão, detecção de escola, combinação de bimestres, mesclagem de lotes, status da linha, bloco de legenda e limpeza de rótulo.
- Cobre também duas coisas que não são lógica: que `app.js` e `apps-script/app.html` não divergiram nas regras compartilhadas, e que os dois arquivos compilam.

### O que o teste automatizado não alcança

Estes dependem de DOM, de `XLSX` e de arquivo real. Foram verificados à mão no navegador em 08/08/2026, contra as 7 turmas reais, e precisam ser refeitos assim que a leitura do Mapão mudar:

- Propagação de `Não realizou`, incluindo o cancelamento por `Esc`.
- Mesclagem de lotes sucessivos pela tela e reimportação sem duplicar.
- Expiração de 12 horas do `localStorage`: 11h sobrevive, 13h é descartado, lote sem `ts` é descartado.
- ATA renderizada, brasão carregado e HTML da janela de impressão.
- Exportação para Excel.
- Limites de 2.000 registros, 50 arquivos e 15 MB.
- Escapamento de HTML em nome de aluno, na tabela e na ATA.
- `Apagar dados` zerando lista e `localStorage`.

### Método para mudanças no parser

Antes de mexer, tirar a impressão digital de um lote real: importar, ordenar `recoveryData`, juntar com `|` e tirar o SHA-256. Depois da mudança, repetir. Hash igual significa comportamento igual. Foi assim que o refactor de 08/08/2026 foi validado.

Referência em 08/08/2026, com as planilhas desta escola:

| Lote | Registros | Alunos | Escola detectada | Hash |
|---|---|---|---|---|
| 7 Mapões consolidados | 453 | 95 | vazio | `06192e6cc5242eb9bbee7e9238654c36` |
| 14 Mapões por bimestre | 451 | 93 | PREF. WALDOMIRO SAMPAIO DE SOUZA | `48d5ecbaad8f95a16af2c2c9cc0b2948` |

A diferença de 2 registros está explicada: duas alunas do 9º ANO têm nota 4 em `ORIENTAÇÃO DE ESTUDO - MATEMÁTICA` do 2º bimestre que só existe no consolidado. Os conjuntos de alunos são idênticos. É recência de lançamento, não defeito.

## Arquitetura do app.js

- Havia uma base mais seis reatribuições de `extractWorkbook` e `showImported` empilhadas no fim do arquivo. A ordem entre elas decidia o resultado e não estava escrita em lugar nenhum, e cada camada reabria e reparseava a planilha inteira — quatro parses por arquivo.
- Agora a leitura acontece uma vez em `readSheetRows`, e tudo abaixo dela é função pura sobre o array de linhas do SheetJS: `parseSheet`, `detectSchool`, `keepRecords`, `droppedStudents`, `combineRecords`, `mergeRows`. Essa é a costura que torna o parser testável em Node.
- `importBatch` é o ponto de entrada do lote e mostra a sequência de cima para baixo: limite de registros, nome da escola, unificação de grafias, combinação e mesclagem com o que já estava na tela.
- O refactor não mudou nenhum resultado: os dois hashes acima são idênticos antes e depois.

## Regras da Recuperação Semestral 2026

Fonte: FAQ – Recuperação Semestral 2026, baixado de `educacao.sp.gov.br` em 08/08/2026, baseado na Resolução SEDUC nº 42, de 5 de junho de 2024. Texto conferido por dois extratores independentes, pdf.js e `pdftotext`.

- Público obrigatório: do 4º ano do Fundamental à 3ª série do Médio, quem não atingiu média igual ou superior a 5,0 em qualquer componente, no primeiro ou no segundo bimestre. É a regra que o app já aplicava.
- Item 6.1: **Arte, Educação Física, Projeto de Vida e Redação e Leitura não participam da recuperação semestral**, porque não integram a Prova Paulista. O app passou a excluí-los; eram 49 dos 502 registros do lote real.
- Outros componentes de itinerário e apoio — Orientação de Estudo, Práticas Experimentais, Robótica, Eletivas, Educação Financeira, Tecnologia e Inovação, Programação, Aprofundamentos, Empreendedorismo, Atualidades — também não estão na Prova Paulista pelo mesmo princípio, mas o FAQ não os nomeia. Seguem na lista, 164 registros, até a Diretoria de Ensino confirmar. Se saírem, sobram 289 dos 502.
- `ESPORTE-MUSICA-ARTE` nunca aparece na recuperação e está certo: 339 das 356 notas são conceito (`ES`, `ET`, `EP`), não número, então nenhuma cai abaixo de 5,0.
- Item 7.3: apenas um dos dois bimestres é alterado, o de menor desempenho. O app já trabalha assim.
- Prova é 100% digital na Sala do Futuro. Língua Portuguesa e Matemática com 15 questões, demais componentes com 10. Cadernos separados por componente.
- Cronograma 2026: recuperação e aprofundamento de 27/07 a 31/07; prova de 03/08 a 07/08; notas publicadas a partir de 12/08; fechamento de 13/08 a 18/08.

## Próximo retorno

1. Conferir conta institucional usada no Google Apps Script. Único item que sobrou da lista anterior.
2. Atualizar teste antigo para não considerar armazenamento artificial em `sessionStorage` como falha do aplicativo. Não há teste desse tipo no repositório; a nota existe só aqui.
3. Publicar as correções de 08/08/2026. Nada foi mesclado ainda: a proteção da `main` voltou a exigir revisão e trava tanto PR quanto push direto enquanto houver um único mantenedor.
4. Decidir a diferença de 2 registros e 2 alunos entre o lote consolidado e o lote por bimestre das mesmas 7 turmas, caso ela importe.
6. Confirmar com a Diretoria de Ensino se os componentes de itinerário e apoio entram na recuperação. Ver a seção de regras acima.
7. Corrigir na origem as 4 linhas de `LAUANDA SUELI FELIPE DE BRITO` no Mapão da 1ª SÉRIE A: duas de baixa e duas ativas. Hoje o app acerta porque lê a linha completa por último, mas isso depende da ordem das linhas no arquivo.
5. Republicar o Apps Script: `apps-script/app.html` recebeu as mesmas correções de nome de escola e de turma, mas o brasão não foi para lá. Lá não há arquivo estático servido, então precisaria virar data URI.

## Sessão de 07/08/2026

- Origem: lote sumia ao reabrir o `index.html`. Eram duas causas somadas — a cópia local estava num commit anterior ao PR 5, quando `persistLocal` e `restoreLocal` eram funções vazias, e essa mesma cópia não tinha os filtros de transferência dos PRs 9, 11 e 15.
- PRs mesclados: 16 e 17 de documentação, 18 `localStorage` com expiração, 19 opção `Não realizou`, 20 correção do validador, 21 propagação entre disciplinas.
- PR 20 corrigiu um defeito introduzido pelo 19: `validateRecoveryScore` roda em fase de captura e rejeitava `Não realizou`, porque `Number('Não realizou')` é `NaN`. A opção aparecia no dropdown e não funcionava.
- Lote real conferido na sessão: 483 registros, 93 alunos, 7 turmas, e 71 alunos com mais de uma disciplina — que são os atendidos pela propagação.

## Atualização final — 17/07/2026

- Modo simples multi-escola publicado no mesmo link.
- Campo Nome da escola adicionado.
- Nome pode ser detectado pelo nome do arquivo ou metadados das primeiras linhas do Mapão.
- Botão Atualizar adicionado; preserva lote temporário da aba.
- Botão Apagar dados mantém exclusão manual dos dados.
- Upload aceita até 50 arquivos por lote.
- Arquivos válidos continuam processando quando outro arquivo falha.
- Lotes sucessivos são mesclados; dados anteriores não são apagados.
- Registros marcados como Transferido, Transferida, Transferência, Baixa de transferência ou Matrícula baixada são excluídos.
- PRs recentes: 4 multi-escola, 5 persistência, 7 mesclagem, 8 lote grande, 9 transferidos, 10 Atualizar, 11 coluna de situação, 12 nome do Mapão.
- Site: https://rrsantos54.github.io/coordenacao-escolar-mapa-norte/
- Ao retomar: testar com Mapão real contendo coluna de situação de transferência e confirmar nome da escola detectado.

## Validação com Mapão real — 17/07/2026

- Causa da divergência no 6º ano identificada: a lista antiga trazia 21 registros porque incluía ANA LAURA SOUSA DA SILVA, marcada como `Transferido` no Mapão.
- Alunos transferidos ou baixados sem nota vermelha nunca entravam na lista; só esse caso tinha nota inferior a 5,0.
- Teste público com dois Mapões reais retornou 20 alunos em recuperação, valor correto.
- Deploy do Pages e do Apps Script concluídos em 17/07/2026.
- Se outro computador continuar mostrando 21: abrir a URL do Pages, clicar `Apagar dados`, clicar `Atualizar` e reimportar os dois arquivos. Persistindo, o endereço aberto é a URL antiga do Apps Script ou uma página em cache.
- Persistência do lote depende da versão do `app.js` em uso:
  - Até o PR 4, `persistLocal` e `restoreLocal` eram funções vazias. Nada era salvo; recarregar a página zerava o lote.
  - Do PR 5 em diante, o lote e o nome da escola vão para `sessionStorage` na chave `mapa-norte-session-v2` e são restaurados por `restoreLocal`.
- `sessionStorage` vive por aba: sobrevive a recarregar e ao botão `Atualizar`, mas é descartado ao fechar a aba. Não há `localStorage` nem `IndexedDB`.
- Gravação em planilha só ocorre pelo Web App do Apps Script. `persistBatch` chama `google.script.run.saveRecoveryBatch`, e sai cedo quando `google` é indefinido — que é o caso no GitHub Pages e ao abrir o arquivo local.
- Abrir o `index.html` por `file://` roda uma cópia local, que pode estar atrás do remoto. A CSP da página usa `default-src 'self'`, restritiva sob `file://`. Usar sempre a URL do Pages.
