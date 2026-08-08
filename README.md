# Mapa Norte — Coordenação escolar

Protótipo web para processamento de recuperação escolar.

## Executar

Na pasta do projeto:

```bash
python3 -m http.server 4173
```

Abrir `http://localhost:4173`.

## Testes

```bash
npm install   # só na primeira vez
npm test
```

- `test-parser.mjs` — regras de leitura do Mapão. Sem dependência e sem rede.
- `test-app.mjs` — comportamento da tela num DOM de verdade: subir lote, marcar
  `Não realizou`, gerar ATA, exportar, apagar dados. Precisa do `jsdom`.

Os dois rodam sozinhos em cada pull request. Nenhum depende de planilha real:
os dados de teste são sintéticos e ficam dentro dos próprios arquivos, porque
planilha de aluno não pode ser versionada neste repositório.

## Estado atual

- Interface operacional com visão geral, recuperação, turmas e atas.
- Upload múltiplo de `.xlsx` e `.xls`.
- Parser usa SheetJS carregado por CDN.
- Identifica `ALUNO`, `Turma`, bimestre e disciplinas no layout Mapão.
- Lista notas abaixo de 5,0.
- Mantém arquivos originais intactos.
- Exportação real, persistência, lançamento de nota e PDF ainda entram nas próximas etapas.

## Dependência de execução

Primeiro carregamento precisa acessar `cdn.sheetjs.com` para ativar leitura Excel. Dados demonstrativos continuam disponíveis sem upload.
