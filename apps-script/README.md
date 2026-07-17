# Publicação no Google institucional

## Arquivos

- `Code.gs`: Web App, persistência no Google Sheets e inclusão de HTML/CSS/JS.
- `Index.html`: página principal.
- `styles.html`: estilos incorporados.
- `app.html`: frontend incorporado.
- `appsscript.json`: fuso e escopos.

## Publicar

1. Abrir `script.google.com` com conta institucional.
2. Criar projeto novo.
3. Adicionar os arquivos deste diretório com os mesmos nomes.
4. Salvar.
5. Executar `doGet` pela opção **Implantar → Nova implantação → Aplicativo da Web**.
6. Configurar **Executar como: usuário que está acessando**.
7. Configurar acesso para usuários do domínio institucional.
8. Autorizar Drive e Sheets no primeiro acesso.

Primeiro lote salvo cria automaticamente a planilha `Mapa Norte — Base de dados` no Drive do usuário autorizador.
