# Memória — Mapa Norte

Atualizado em 10/08/2026.

## Estado

- Repositório: `rrsantos54/coordenacao-escolar-mapa-norte`.
- GitHub Pages: https://rrsantos54.github.io/coordenacao-escolar-mapa-norte/
- Apps Script: aposentado em 08/08/2026. A implantação segue no ar até ser arquivada no `script.google.com`; ver a seção própria.
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

- Autorização por conta Google institucional no Apps Script, enquanto a implantação antiga não for arquivada.
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
- A cópia do Apps Script usava `sessionStorage` de propósito, porque ali o dado real ia para a planilha do Google. Removida em 08/08/2026.
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
- Apps Script publicado pela workflow `Publicar Apps Script` até 08/08/2026, quando o diretório e a workflow foram removidos.
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
- O item 3 estava descrito errado: não existia geração de DOCX no código. A ATA saía por `Imprimir / PDF` (`printAta`) e havia `Exportar Excel` (`exportRecovery`). Foi isso que se validou. Passou a existir em 10/08/2026, com o botão `Baixar Word`; ver a seção própria.
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

## Apps Script aposentado — 08/08/2026

O projeto tinha duas cópias do mesmo parser: `app.js` no GitHub Pages e `apps-script/app.html` no Web App do Google. Uma correção já entrou só num lado, e a cópia do Web App nunca teve teste de ponta a ponta porque exige login Google. O `apps-script/` foi removido do repositório, junto com o workflow `Publicar Apps Script` e o `GITHUB_DEPLOY.md`.

O `test-parser.mjs` passou a ter um caso que falha se `apps-script/` reaparecer, para não voltar a existir um segundo parser.

### O que a remoção do código NÃO desliga

Isto é o ponto que importa. Apagar arquivo do repositório não mexe em nada do lado do Google:

1. **A implantação continua no ar.** O Web App segue respondendo na URL antiga até ser removido em `script.google.com` → Implantações → Gerenciar implantações → Arquivar. Enquanto isso, quem tiver o link e conta do domínio ainda consegue usar a versão antiga do app, sem nenhuma das correções de agosto.
2. **A planilha `Mapa Norte — Base de dados` continua existindo**, no Drive de quem autorizou o Web App. Ela guarda os lotes de recuperação já enviados: nome, turma, disciplina e nota de aluno real. Decidir entre manter como arquivo histórico ou apagar é decisão da escola, não do repositório. O `Code.gs` a criava no primeiro lote salvo, em `getDatabase_()`.
3. **A credencial do Google continua válida.** O segredo `CLASPRC_JSON` era um token OAuth com escopo de Drive e Sheets. Apagar o segredo no GitHub não revoga o token: é preciso revogar em `myaccount.google.com/permissions`.

Passos do lado do Google e do GitHub, que só a conta institucional executa:

- Arquivar a implantação do Web App em `script.google.com`.
- Decidir o destino da planilha `Mapa Norte — Base de dados`.
- Revogar o acesso do clasp em `myaccount.google.com/permissions`.
- `gh secret delete CLASPRC_JSON`
- `gh variable delete APPSSCRIPT_WEB_APP_DEPLOYMENT_ID`

Enquanto o item 1 não for feito, existem duas versões do app no ar e elas divergem.

## Como o app é testado

`npm test` roda os dois arquivos e soma 322 verificações. Rodam sozinhos em cada pull request pelo workflow `Testes`, que também recusa o merge se alguma planilha for versionada. Desde 10/08/2026 o check `testes` é obrigatório para mesclar.

Contagem conferida em 10/08/2026: `test-parser.mjs` imprime 189 e `test-app.mjs` imprime 133. Quem mexer nos testes atualiza este número aqui, senão ele volta a mentir.

### test-app.mjs — 133 verificações de comportamento

- Carrega o `index.html` e o `app.js` reais num DOM (`jsdom`) e opera a tela como a coordenação opera.
- Cobre o que antes só era conferido à mão: subir lote, `Não realizou` com propagação e com cancelamento por `Esc`, mesclagem de lotes sucessivos, reimportação sem duplicar, expiração de 12 horas do `localStorage`, ATA com brasão, HTML da janela de impressão, exportação para Excel, limites de 2.000 registros / 50 arquivos / 15 MB, escapamento de HTML em nome de aluno, `Apagar dados`, arquivo ilegível que não derruba o lote, e ausência de erro no console no caminho normal.
- Fronteira escolhida: o SheetJS é substituído por um stub. O contrato dele com o app é devolver um array de linhas, e é esse array que o parser consome. Assim os fixtures são arrays legíveis dentro do teste, não há dependência de rede, e **nenhuma planilha de aluno precisa existir para os testes rodarem**. Quem valida o SheetJS de verdade é o navegador.
- A única dependência do projeto é o `jsdom`, em `devDependencies`.
- As declarações do `app.js` são `const` de escopo de script e não viram propriedade de `window`. O teste injeta um segundo `<script>` no mesmo escopo para alcançá-las.

### Mutação: a prova de que os testes têm dente

Em 08/08/2026, oito defeitos foram introduzidos de propósito no `app.js`, um de cada vez, e a suíte pegou os oito: não limpar o bimestre no `Não realizou`, voltar a excluir transferido pelo nome, tirar o escape do nome na ATA, remover a expiração de 12 horas, remover o limite de 2.000 registros, voltar a ler o bloco de legenda como aluno, voltar a incluir Arte e Educação Física, e tirar o `base href` da impressão. Vale repetir esse exercício quando a suíte crescer.

Repetido em 10/08/2026 sobre a sala compartilhada, com sete mutantes. Cinco morreram de primeira; dois sobreviveram e denunciaram teste fraco, não código certo. `salvarSala` deixar o servidor vencer sobrevivia porque a linha clicada já era corrigida no servidor pelo lançamento avulso antes da mesclagem — o teste passou a disputar uma linha que só a propagação alcança. `salaLigada` devolver sempre true sobrevivia porque o app sem sala nunca chegava a digitar nota no teste. Com os dois testes corrigidos, os sete morrem.

Repetido em 10/08/2026 sobre a reimportação da planilha exportada, com cinco mutantes, todos mortos: `extractWorkbook` deixar de reconhecer a exportação, copiar o status escrito no arquivo em vez de recalcular, `showImported` ignorar um lote só de planilha preenchida, aceitar qualquer texto como nota de recuperação, e deixar o `Não realizou` voltar a carregar bimestre.

### test-parser.mjs — 189 verificações

- Sem dependência e sem rede.
- O teste lê as declarações direto do `app.js` por expressão regular, uma por linha. Por isso as funções do parser cabem em uma linha só: quebrar `parseSheet` em várias linhas quebra a extração. O teste falha alto se não achar a declaração, então o esquecimento não passa silencioso.
- Cobre: nome de escola, turma pelos dois layouts, exclusão de transferidos, componentes sem prova, leitura de nota, `parseSheet` nos dois formatos de Mapão, detecção de escola, combinação de bimestres, mesclagem de lotes, status da linha, bloco de legenda e limpeza de rótulo.
- Cobre também duas coisas que não são lógica: que o `app.js` compila, e que `apps-script/` não voltou ao repositório.

### O que o teste automatizado ainda não alcança

Sobraram três, e nenhum tem solução barata:

1. **O SheetJS de verdade.** O `test-app.mjs` usa um stub. Ler um `.xlsx` real continua sendo conferido no navegador, com o método de impressão digital descrito abaixo. Automatizar exigiria versionar uma planilha de fixture, e o `.gitignore` e o workflow bloqueiam planilha no repositório de propósito.
2. **A implantação antiga do Web App.** O código saiu do repositório em 08/08/2026, mas a implantação continua no ar até ser arquivada no `script.google.com`. Enquanto isso existe uma segunda versão do app, sem as correções de agosto, fora do alcance de qualquer teste.
3. **Layout e impressão de verdade.** O `jsdom` não faz layout, então largura de coluna, quebra de página e o brasão renderizado seguem conferidos a olho.

### Método para mudanças no parser

Antes de mexer, tirar a impressão digital de um lote real: importar, ordenar `recoveryData`, juntar com `|` e tirar o SHA-256. Depois da mudança, repetir. Hash igual significa comportamento igual. Foi assim que o refactor de 08/08/2026 foi validado.

Referência em 08/08/2026, com as planilhas desta escola:

| Lote | Registros | Alunos | Escola detectada | Hash |
|---|---|---|---|---|
| 7 Mapões consolidados | 453 | 95 | vazio | `06192e6cc5242eb9bbee7e9238654c36` |
| 14 Mapões por bimestre | 451 | 93 | PREF. WALDOMIRO SAMPAIO DE SOUZA | `48d5ecbaad8f95a16af2c2c9cc0b2948` |

A diferença de 2 registros está explicada: duas alunas do 9º ANO têm nota 4 em `ORIENTAÇÃO DE ESTUDO - MATEMÁTICA` do 2º bimestre que só existe no consolidado. Os conjuntos de alunos são idênticos. É recência de lançamento, não defeito.

## Trabalho em dupla — 10/08/2026

A pergunta era mandar o link com o lote já carregado para outra pessoa lançar as notas, acompanhando ao vivo. Isso não existia e não podia existir do jeito imaginado: o app é página estática no Pages, o lote vive no `localStorage` do navegador de quem importou, e o link carrega o app vazio. Duas pessoas no mesmo link são duas cópias isoladas.

Três caminhos foram pesados: planilha compartilhada do Drive, dividir por turma sem código nenhum, e backend de verdade com sincronia ao vivo. Escolhida a planilha compartilhada.

O motivo: o trabalho colaborativo aqui é digitar nota, e o Google Sheets já faz edição simultânea com presença e histórico, na conta institucional onde o Mapão já mora. Um backend resolveria sem etapa manual, mas traz servidor, autenticação e nome e nota de aluno hospedados fora do Google institucional, com um mantenedor só. O Apps Script tinha acabado de ser aposentado por custo de manutenção de duas versões vivas; recriar um segundo lugar com estado seria andar para trás.

### O fluxo

Importar os Mapões, `Exportar Excel`, subir no Drive, os dois preenchem, baixar e importar de volta para gerar as ATAs.

### O que precisou de código

Só reconhecer o próprio arquivo exportado na importação. Antes, reimportá-lo produzia lixo: o parser procura um cabeçalho com `ALUNO` e trata as colunas seguintes como matérias, então `Nota do primeiro bimestre` virava disciplina.

- `parseExport` detecta o layout pelo trio exato `ALUNO`, `TURMA`, `DISCIPLINA` nas colunas 0, 1 e 2. O Mapão nunca tem `TURMA` na coluna 1, então não há confusão entre os dois formatos.
- Quando reconhece, `extractWorkbook` devolve `{restored}` e pula `parseSheet`, `keepRecords` e `detectSchool` — a planilha já vem combinada, uma linha por aluno + turma + disciplina.
- O merge de duas metades sai de graça: `mergeRows` já casava por `aluno|turma|disciplina` e já preferia o valor preenchido ao `—`. Cada pessoa pode preencher uma parte e importar os dois arquivos.
- Nada do arquivo devolvido é confiado. `notaBimestre`, `notaRecuperacao` e `bimestreSubstituido` revalidam célula a célula, e o status é recalculado por `rowStatus` em vez de copiado. Quem devolve a planilha pode ter digitado qualquer coisa, e o arquivo é entrada de fora do sistema.

### O que ficou de fora de propósito

O nome da escola não viaja na planilha exportada. Colocá-lo numa linha acima do cabeçalho sujaria o arquivo que as duas pessoas vão editar no Sheets, e quem gera a ATA já tem o nome no campo, guardado no `localStorage`. Se um dia a ATA sair na máquina errada, é digitar de novo.

## Sala compartilhada — 10/08/2026, mesmo dia

O vai e vem de planilha resolveu o transporte, não o pedido. O pedido era mandar o link e a pessoa digitar direto, acompanhando ao vivo. Isso exige servidor, e a decisão foi tomada com as duas consequências na mesa: **Apps Script como caixa de dados**, e **sem login, só o código da sala no link**.

### Por que Apps Script e não Supabase

O dado fica no Drive institucional, onde o Mapão já mora, sem fornecedor novo. Foi o que pesou. Supabase daria sincronia por websocket em vez de consulta a cada 8 segundos, e seria tecnicamente mais limpo, mas colocaria nome e nota de aluno num terceiro.

A escolha de não exigir login tem um custo que precisa ficar escrito: **ela anula a outra vantagem do Apps Script.** A implantação tem que ser aberta a qualquer um, então o login institucional, que sairia de graça, não existe. O que sobra protegendo a lista é o código da sala, 12 caracteres sorteados por `crypto.getRandomValues`. Link vazado é lista de notas exposta. Se um dia isso incomodar, o caminho é trocar o acesso da implantação para o domínio da rede e aceitar que a pessoa faça login.

### O que não se repetiu

O Apps Script foi aposentado em 08/08/2026 porque havia dois parsers e uma correção entrou só num lado. A volta não recria isso: o `Code.gs` guarda linhas e devolve linhas, e não sabe o que é Mapão, nota abaixo de 5, aluno transferido ou componente sem prova.

Até a identidade do aluno fica de fora dele. A chave `ALUNO|TURMA|DISCIPLINA` é montada e normalizada no `app.js`, em `chaveDaLinha`, e viaja pronta — do outro lado só se compara string com string, em `acharLinha_`. Assim a regra de quem é o mesmo aluno continua existindo num lugar só.

A guarda no `test-parser.mjs` mudou de forma junto: era "a pasta `apps-script/` não existe", passou a ser "a pasta não contém parser". Ela procura marcas — `ALUNO`, nomes de funções do parser, `TRANSFERID`, lista de componentes sem prova, bimestre, o corte de 5,0 — e reprova se alguma aparecer no código, ignorando comentários. O defeito que ela protege sempre foi a regra duplicada, não o diretório.

### Decisões de desenho

- **A versão é um contador em `ScriptProperties`, não na planilha.** Quem acompanha pergunta a versão a cada 8 segundos; abrir a planilha a cada pergunta gastaria cota à toa. Só quando a versão muda é que o lote é baixado.
- **A consulta não roda com a aba escondida**, e não redesenha a tabela enquanto alguém está com um seletor aberto — atualizar a lista embaixo do dedo de quem está escolhendo nota é pior que atrasar 8 segundos.
- **Nota digitada manda uma alteração de linha só**, por chave. É isso que deixa duas pessoas digitarem juntas sem uma apagar a outra. O lote inteiro só sobe quando alguém importa Mapão.
- **`salvarSala` busca o servidor antes e mescla com ele por base**: `mergeRows(remoto, recoveryData)`. Assim nota lançada pela outra pessoa sobrevive a uma importação, e o que a pessoa acabou de marcar aqui ainda vence. A ordem invertida desfaz propagação de `Não realizou` em silêncio, e existe teste para isso.
- **`POST` vai com `text/plain`** de propósito. Com `application/json` o navegador manda um preflight `OPTIONS`, que o Apps Script não responde.
- **Sala fora do ar não derruba o trabalho.** O lote segue no `localStorage`, a pessoa continua digitando, e o aviso sai uma vez, não a cada 8 segundos.
- **`SALA_ENDPOINT` vazio desliga tudo** e é como o repositório é publicado. Ele fica no topo do `app.js`, junto das outras constantes, e não perto das funções de sala: `iniciarSala()` roda na linha de partida do app, e `const` declarado depois estaria na zona morta temporal.

### O que o teste automatizado não alcança aqui

O Apps Script de verdade. O `test-app.mjs` substitui o `fetch` por um servidor falso que guarda linhas e devolve linhas — a mesma fronteira do stub do SheetJS.

Os três pontos que dependiam de navegador foram conferidos em 10/08/2026, com a implantação no ar e a partir da origem `https://rrsantos54.github.io`:

1. **`POST` com `text/plain` passa sem preflight.** Era o mais provável de dar errado. Respondeu 200 e o corpo foi lido.
2. **CORS liberado**, incluindo o redirecionamento para `script.googleusercontent.com`. O `GET` de `acao=versao` devolveu `{"versao":0}`.
3. **Validação da sala responde**: código curto demais é recusado com `sala inválida`.

Sobra a cota, que só o uso real mede. Duas pessoas perguntando a versão a cada 8 segundos dá cerca de 900 requisições por hora somadas; o limite diário de um Web App é da ordem de 20 mil.

### A implantação — 10/08/2026

- Projeto `Mapa Norte — Salas`, id `1nwWD6zmCd9rJDVjK59wgrgnmydAfP3y17RX6iLiLEQpGrim9vREJG3CR`.
- Implantação Versão 1, App da Web, executando como o dono, acesso `ANYONE_ANONYMOUS`.
- Conta: **`rogerio00772@gmail.com`**, pessoal.

Essa conta não era a intenção. A escolha do Apps Script sobre Supabase se apoiou em o dado ficar no Drive institucional, e nenhuma conta institucional estava disponível na máquina — as opções eram `rogerio00772@gmail.com` e `busca.ativa.ure@gmail.com`, as duas Gmail comum. A primeira tentativa foi na segunda, ligada ao nome da escola, e esbarrou num defeito do Apps Script com múltiplas contas: o popup de autorização vai para `script.google.com/accounts?authuser=1` e morre em "Não foi possível abrir o arquivo" quando a conta que autoriza não é a padrão do navegador. Com a conta pessoal, que era a padrão, passou de primeira.

Consequência a registrar sem rodeio: **nome, turma e nota de aluno passam a morar no Drive pessoal de uma conta particular.** Ficou assim por decisão consciente, para destravar o uso. Se um dia houver conta institucional, mudar significa refazer a implantação lá e trocar `SALA_ENDPOINT` — o código não muda em nada.

Ficou um projeto `Mapa Norte — Salas` órfão na conta `busca.ativa.ure@gmail.com`, sem implantação. Pode apagar.

Ao atualizar o `Code.gs` depois, usar `Gerenciar implantações` e editar a Versão 1. `Nova implantação` gera URL nova e a sala antiga fica órfã com o dado dentro.

### Estado

`SALA_ENDPOINT` aponta para a implantação acima. A sala está ligada no app publicado.

Isso significa que há **duas implantações de Apps Script** para administrar. São coisas distintas: a antiga, `ZZ-MORTO — nao usar`, é o app inteiro em versão defasada e deve sair do ar; a nova é só a caixa de dados.

## ATA em Word — 10/08/2026

Antes só existia `Imprimir / PDF` para a ATA, e o único download era o Excel da lista de recuperação. O botão `Baixar Word` gera um `.docx` de verdade, editável, para preencher data e assinaturas.

Havia duas formas. A barata era HTML salvo como `.doc` com tipo `application/msword`: o Word abre e edita, custa 15 linhas e nenhuma dependência, mas não é OOXML. A escolhida foi a outra, `.docx` de verdade pela biblioteca `docx` 9.7.1, por decisão de quem usa.

### O peso, e o que ele obrigou

O build IIFE tem 1,1 MB. Carregar isso em toda visita seria absurdo numa rede de escola, ainda mais depois do PR 27, que existiu justamente porque CDN bloqueado quebrava o app. Então `carregarDocx` injeta o script **no clique**, uma vez só, e guarda a promessa. Consequências: quem só imprime não paga nada, e CDN bloqueado derruba apenas esse botão, com aviso mandando usar `Imprimir / PDF`.

### Segurança do script de terceiro

A biblioteca vem do `cdn.jsdelivr.net`, para uma página que tem nome e nota de aluno na tela. Três amarras, todas com teste:

- `integrity` com sha384 fixo e `crossOrigin='anonymous'` — sem o segundo, o navegador nem verifica o primeiro.
- URL com versão exata, `docx@9.7.1`. `latest` trocaria o arquivo por baixo do SRI e o script pararia de carregar, ou pior, alguém publicaria outro conteúdo.
- `script-src` da CSP liberando só esse host, sem `unsafe-inline`.

O `test-parser.mjs` lê essas declarações do fonte e reprova se o `integrity`, o `crossOrigin` ou a versão fixa sumirem; o `test-app.mjs` confere a CSP no `index.html`.

### Um defeito achado no caminho

`baixarAtaWord` precisa saber qual ATA está na tela. O `.minute-row.selected` do HTML não serve: `renderMinutes` marca sempre a primeira da lista e o clique em `Revisar ATA` nunca movia essa marca. Agora `renderAta` guarda a turma em `ataAtual`, e o clique move o destaque — o que também corrige a lista, que mostrava a turma errada em destaque desde sempre.

### Correções depois do primeiro uso — 10/08/2026

A primeira ATA gerada mostrou dois defeitos, os dois corrigidos no mesmo dia.

**O brasão e o bloco do governo estavam no corpo, não no cabeçalho de página.** Consequência: some da página 2 em diante, e turma grande passa de uma página. Agora a seção tem `headers: {default: new Header(...)}`, e o corpo começa no título. Conferido contra a biblioteca real: o `.docx` passou a ter a parte `word/header1.xml`, e a imagem em `word/media/` está dentro dela.

**As disciplinas vinham sem acento**, e de forma inconsistente — o Mapão manda `ORIENTAÇAO DE ESTUDO - MATEMATICA`, com cedilha e sem til. ATA é documento oficial. `DISCIPLINAS_ACENTUADAS` mapeia a forma sem acento para a grafia correta, e `acentuarDisciplina` entra dentro do `cleanSubject`, então a correção vale em tudo: tela, Excel, ATA impressa e Word.

Três cuidados nessa tabela:

- A chave é a forma **sem** acento, porque é essa que chega do Mapão.
- Componente composto é tratado lado a lado, e o separador volta como veio: `ESPORTE-MUSICA-ARTE` não tem espaço em volta do hífen, e inventar espaço mudaria o nome do componente.
- Componente fora da lista passa intacto. A tabela corrige o que se sabe, não chuta.

Isso **não** parte a mesclagem: a chave de merge e a chave da sala passam por `normal()`, que ignora acento, então `MATEMATICA` do Mapão e `MATEMÁTICA` corrigida continuam sendo a mesma linha.

Em 11/08/2026 a mesma tabela passou a servir para um segundo problema, achado ao rodar o parser sobre os sete Mapões reais: **duas grafias do mesmo componente saíam em linhas separadas da ATA**. `INGLÊS`, com 2 registros, e `LÍNGUA INGLESA`, com 26, são a mesma matéria — a chave `INGLES` passou a apontar para `LÍNGUA INGLESA`. Muda o destino, não o mecanismo.

Junto veio a **caixa alta no fim do `cleanSubject`**. O Mapão manda quase tudo em maiúsculas, mas escapavam `Empreendedorismo` e `Atualidades` em caixa mista. Como `linhaValidada` também chama `cleanSubject`, o mesmo ponto cobre a planilha exportada que volta preenchida. No lote real: 28 componentes distintos em vez de 29, e o total de linhas não muda, porque nenhum aluno tinha as duas grafias ao mesmo tempo.

Fica em aberto o par `ESPANHOL` / `LINGUA ESPANHOLA`, que tem exatamente o mesmo defeito do inglês e continua apontando para dois nomes diferentes. Nenhum dos dois aparece nas planilhas de hoje, e qual é o nome canônico é decisão da coordenação, não do código.

### Verificação

O `test-app.mjs` substitui o `docx` por um dublê que guarda tipo e opções de cada objeto, e o teste pergunta se o texto esperado está no documento. Isso cobre a composição, não o formato.

O formato foi conferido no navegador, em 10/08/2026, contra a biblioteca de verdade servida por `python3 -m http.server`: o blob sai com o MIME do OOXML, começa com `PK` — é zip —, tem 86.453 bytes com brasão e 9.240 sem, o que prova que a imagem entra mesmo. Nenhuma exceção, então a API está usada certo. É o mesmo método de fronteira do SheetJS: o dublê cobre a lógica, o navegador cobre a biblioteca.

Quinze mutantes ao todo, quinze mortos. Quatro só morreram depois de o teste ficar mais forte: incluir aluno de outra turma na ATA sobrevivia porque o teste subia um lote de turma única; ignorar o `ataAtual` sobrevivia porque o teste só baixava a ATA da primeira turma; e colar as células da ATA da tela sobrevivia porque nada conferia que cada célula era um elemento próprio — lacuna que já existia antes deste trabalho e apareceu por acaso, quando um padrão de mutação casou com `ataRows` em vez da função que eu queria atingir.

## Arquitetura do app.js

- Havia uma base mais seis reatribuições de `extractWorkbook` e `showImported` empilhadas no fim do arquivo. A ordem entre elas decidia o resultado e não estava escrita em lugar nenhum, e cada camada reabria e reparseava a planilha inteira — quatro parses por arquivo.
- Agora a leitura acontece uma vez em `readSheetRows`, e tudo abaixo dela é função pura sobre o array de linhas do SheetJS: `parseSheet`, `detectSchool`, `keepRecords`, `droppedStudents`, `combineRecords`, `mergeRows`. Essa é a costura que torna o parser testável em Node.
- `importBatch` é o ponto de entrada do lote e mostra a sequência de cima para baixo: limite de registros, nome da escola, unificação de grafias, combinação e mesclagem com o que já estava na tela.
- O refactor não mudou nenhum resultado: os dois hashes acima são idênticos antes e depois.

## Regras da Recuperação Semestral 2026

Fonte: FAQ – Recuperação Semestral 2026, baixado de `educacao.sp.gov.br` em 08/08/2026, baseado na Resolução SEDUC nº 42, de 5 de junho de 2024. Texto conferido por dois extratores independentes, pdf.js e `pdftotext`.

- Público obrigatório: do 4º ano do Fundamental à 3ª série do Médio, quem não atingiu média igual ou superior a 5,0 em qualquer componente, no primeiro ou no segundo bimestre. É a regra que o app já aplicava.
- **Nenhum componente é excluído hoje, por opção interna da coordenação.** O item 6.1 do FAQ diz que Arte, Educação Física, Projeto de Vida e Redação e Leitura não participam da recuperação semestral, por não integrarem a Prova Paulista, e o app os excluía — eram 49 das 502 linhas da ATA no lote real, ou 61 dos 687 registros antes de combinar os dois bimestres. Em 11/08/2026 a coordenação decidiu que os quatro voltam a constar na lista e na ATA. **O FAQ não mudou**: essa é uma escolha da escola, mais abrangente que a norma, e é assim que deve ser explicada a quem perguntar. `SEM_PROVA_RECUPERACAO`, em `app.js`, ficou vazio; o filtro continua no lugar. Para voltar ao FAQ, é só repor os quatro nomes normalizados (maiúsculas, sem acento) no conjunto: `ARTE`, `ARTES`, `EDUCACAO FISICA`, `PROJETO DE VIDA`, `REDACAO E LEITURA`.
- Outros componentes de itinerário e apoio — Orientação de Estudo, Práticas Experimentais, Robótica, Eletivas, Educação Financeira, Tecnologia e Inovação, Programação, Aprofundamentos, Empreendedorismo, Atualidades — também não estão na Prova Paulista, mas o FAQ não os nomeia. Nunca foram excluídos: 222 registros, 164 linhas da ATA. Se saírem, sobram 338 das 502 linhas.
- **Cuidado com a unidade ao citar número deste lote.** Registro é uma nota abaixo de 5 num bimestre; linha da ATA é um aluno + componente, com os dois bimestres já combinados. O lote real dos sete Mapões tem 699 notas abaixo de 5, 687 registros depois de tirar aluno transferido, e 502 linhas na ATA. Os números desta seção foram medidos em 11/08/2026 rodando o parser do `app.js` sobre os sete arquivos, com o mesmo SheetJS 0.20.3 do `index.html`.
- `ESPORTE-MUSICA-ARTE` nunca aparece na recuperação e está certo: 339 das 356 notas são conceito (`ES`, `ET`, `EP`), não número, então nenhuma cai abaixo de 5,0. A comparação do conjunto é do nome inteiro, não por trecho — se `ARTE` voltar à lista, `ESPORTE-MUSICA-ARTE` não é pego junto. Há teste para isso.
- Item 7.3: apenas um dos dois bimestres é alterado, o de menor desempenho. O app já trabalha assim.
- Prova é 100% digital na Sala do Futuro. Língua Portuguesa e Matemática com 15 questões, demais componentes com 10. Cadernos separados por componente.
- Cronograma 2026: recuperação e aprofundamento de 27/07 a 31/07; prova de 03/08 a 07/08; notas publicadas a partir de 12/08; fechamento de 13/08 a 18/08.

## Próximo retorno

Revisado em 10/08/2026. Nenhum item depende de escrever código: o primeiro é implantar a caixa de dados, e o resto depende da conta institucional ou da Diretoria de Ensino.

1. Migrar a caixa de dados das salas para uma conta institucional, se e quando existir uma. Hoje ela está no Drive pessoal de `rogerio00772@gmail.com`, com nome e nota de aluno dentro. Refazer a implantação lá e trocar `SALA_ENDPOINT`; o código não muda. Ver a seção da sala.
2. Concluir a aposentadoria do Apps Script **antigo** pelo lado do Google: arquivar a implantação, decidir o destino da planilha `Mapa Norte — Base de dados` e revogar o token do clasp. O segredo e a variável do GitHub já foram apagados, conferido em 10/08/2026. Não confundir com a caixa de dados nova: a antiga é o app inteiro em versão defasada e deve sair do ar. Ver a seção própria.
3. Conferir a conta institucional usada no Google Apps Script.
4. Confirmar com a Diretoria de Ensino, por escrito, quais componentes entram na recuperação. Em 11/08/2026 os quatro do item 6.1 voltaram a constar e o app deixou de excluir qualquer componente; a confirmação vale tanto para eles quanto para os de itinerário e apoio. Ver a seção de regras acima.
5. Corrigir na origem as 4 linhas de `LAUANDA SUELI FELIPE DE BRITO` no Mapão da 1ª SÉRIE A: duas de baixa e duas ativas. Hoje o app acerta porque lê a linha completa por último, mas isso depende da ordem das linhas no arquivo.

Saíram da lista: as correções de 08/08/2026 foram publicadas nos PRs 23 a 27, com deploy do Pages verde em 09/08. A diferença de 2 registros entre lote consolidado e lote por bimestre está explicada na seção de método — é recência de lançamento, não defeito. A nota sobre teste antigo de `sessionStorage` não descrevia teste nenhum do repositório e virou ruído.

## Proteção da branch main — estado em 10/08/2026

- `required_approving_review_count` 1, `require_last_push_approval` true, `dismiss_stale_reviews` true, `enforce_admins` true, `required_conversation_resolution` true, histórico linear, sem force-push e sem exclusão.
- `required_status_checks`: `strict` true, `contexts` `["testes"]`, `app_id` 15368, que é o GitHub Actions. Ligado em 10/08/2026. Antes disso era `null` — o workflow rodava e aparecia no PR, mas o GitHub não o exigia para mesclar.
- `strict=true` obriga a branch do PR a estar atualizada com a `main` antes do merge. Com um mantenedor só, isso é um `git pull` a mais quando dois PRs andam juntos.
- O nome do check é `testes`, o id do job em `.github/workflows/testes.yml`. Renomear o job quebra a exigência em silêncio: o check obrigatório fica eternamente pendente e nenhum PR mescla.

### Como mexer nessa configuração

O `PATCH` no sub-recurso `.../protection/required_status_checks` responde `404 Required status checks not enabled` enquanto os checks não existirem. Só serve para editar o que já está ligado. Ligar do zero exige `PUT` na proteção inteira, e o `PUT` **substitui** o objeto: campo omitido é campo apagado. O caminho seguro é salvar o estado antes, montar o payload completo a partir dele e conferir o diff depois:

```bash
gh api repos/rrsantos54/coordenacao-escolar-mapa-norte/branches/main/protection > protection-antes.json
# montar o JSON completo com todos os campos de protection-antes.json, mais a mudança
gh api -X PUT repos/rrsantos54/coordenacao-escolar-mapa-norte/branches/main/protection --input protection-novo.json
gh api repos/rrsantos54/coordenacao-escolar-mapa-norte/branches/main/protection > protection-depois.json
# comparar antes e depois campo a campo
```

O `PUT` não aceita `required_signatures` nem os campos `url`: são recurso à parte. Em 10/08/2026 o diff acusou uma única mudança, `required_status_checks` de `null` para o objeto, e os outros dez campos idênticos.

### Merge com um mantenedor só

O GitHub não deixa ninguém aprovar o próprio PR, e `enforce_admins` está ativo. Com `required_approving_review_count` 1, nenhum PR mescla sozinho. O contorno usado nos PRs 28 e 29 é baixar a exigência, mesclar e restaurar na sequência, deixando a janela sem revisão durar três comandos:

```bash
gh api -X PATCH repos/rrsantos54/coordenacao-escolar-mapa-norte/branches/main/protection/required_pull_request_reviews -F required_approving_review_count=0 -F require_last_push_approval=false
gh pr merge <N> --squash --delete-branch
gh api -X PATCH repos/rrsantos54/coordenacao-escolar-mapa-norte/branches/main/protection/required_pull_request_reviews -F required_approving_review_count=1 -F require_last_push_approval=true
```

Esse `PATCH` funciona porque a revisão obrigatória já está ligada — é exatamente o caso que o sub-recurso atende. Se o repositório ganhar um segundo mantenedor, o contorno morre e a revisão de verdade toma o lugar.

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
