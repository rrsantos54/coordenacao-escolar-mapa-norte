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
- Permite nota de recuperação semestral em dropdown de 1 a 10.
- Permite substituição do primeiro ou segundo bimestre.
- Mantém notas anterior e atualizada na ATA.
- Gera ATA sem abreviações desnecessárias.
- Exclui salas de teste.
- Botão “Limpar sessão” remove dados carregados da memória da página.

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
- Dados dos alunos ficam em `sessionStorage`, na chave `mapa-norte-session-v2`, desde o PR 5. A afirmação anterior de que nada era persistido valia só até o PR 4. Não há `localStorage` nem `IndexedDB`, e o armazenamento é descartado ao fechar a aba.
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
- Dropdown de recuperação: opções de 1 a 10.
- Lote acima de 2.000 registros: rejeitado.
- Teste antigo de privacidade ainda injeta manualmente uma chave em `sessionStorage`; resultado negativo desse teste é obsoleto. Código atual não grava dados nessa chave.

## Próximo retorno

1. Validar ATA com planilhas reais da Sala do Futuro.
2. Conferir conta institucional usada no Google Apps Script.
3. Testar geração final de DOCX com duas notas de recuperação quando aluno tiver pendência nos dois bimestres.
4. Atualizar teste antigo para não considerar armazenamento artificial em `sessionStorage` como falha do aplicativo.

## Atualização final — 17/07/2026

- Modo simples multi-escola publicado no mesmo link.
- Campo Nome da escola adicionado.
- Nome pode ser detectado pelo nome do arquivo ou metadados das primeiras linhas do Mapão.
- Botão Atualizar adicionado; preserva lote temporário da aba.
- Botão Limpar sessão mantém exclusão manual dos dados.
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
- Se outro computador continuar mostrando 21: abrir a URL do Pages, clicar `Limpar sessão`, clicar `Atualizar` e reimportar os dois arquivos. Persistindo, o endereço aberto é a URL antiga do Apps Script ou uma página em cache.
- Persistência do lote depende da versão do `app.js` em uso:
  - Até o PR 4, `persistLocal` e `restoreLocal` eram funções vazias. Nada era salvo; recarregar a página zerava o lote.
  - Do PR 5 em diante, o lote e o nome da escola vão para `sessionStorage` na chave `mapa-norte-session-v2` e são restaurados por `restoreLocal`.
- `sessionStorage` vive por aba: sobrevive a recarregar e ao botão `Atualizar`, mas é descartado ao fechar a aba. Não há `localStorage` nem `IndexedDB`.
- Gravação em planilha só ocorre pelo Web App do Apps Script. `persistBatch` chama `google.script.run.saveRecoveryBatch`, e sai cedo quando `google` é indefinido — que é o caso no GitHub Pages e ao abrir o arquivo local.
- Abrir o `index.html` por `file://` roda uma cópia local, que pode estar atrás do remoto. A CSP da página usa `default-src 'self'`, restritiva sob `file://`. Usar sempre a URL do Pages.
