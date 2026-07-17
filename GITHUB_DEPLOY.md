# Publicação automática

1. Crie repositório GitHub vazio.
2. Adicione segredo `CLASPRC_JSON` com conteúdo completo de `~/.clasprc.json`.
3. Envie este projeto para branch `main`.
4. Cada alteração em `apps-script/` executará validação, `clasp push` e criação de nova versão.

O workflow não altera implantação Web App antiga somente leitura. Ele publica código e cria versão Apps Script. Para endereço Web App fixo, use implantação editável criada no Apps Script ou publique nova implantação Web App.
