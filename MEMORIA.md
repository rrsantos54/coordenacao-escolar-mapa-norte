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

## Próximo retorno

1. Validar ATA com planilhas reais da Sala do Futuro.
2. Conferir conta institucional usada no Google Apps Script.
3. Testar geração final de DOCX com duas notas de recuperação quando aluno tiver pendência nos dois bimestres.
4. Atualizar teste antigo para não considerar armazenamento artificial em `sessionStorage` como falha do aplicativo.
5. Corrigir a ordem do nome da escola extraído do Mapão. Em 07/08/2026, com lote real, saiu `Waldomiro Sampaio de Souza Prefeito`; o correto é `PREF. WALDOMIRO SAMPAIO DE SOUZA`. O campo é editável na tela, então não bloqueia o uso, mas sai invertido no cabeçalho da ATA.
6. Decidir se a proteção da branch `main` volta a exigir revisão. Hoje `required_approving_review_count` é 0 e `require_last_push_approval` é false.
7. Conferir a ATA gerada a partir de lote real com aluno marcado como `Não realizou`. A lógica está verificada com dados sintéticos; o encaixe com planilha de verdade, não.

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
