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
- Upload múltiplo de `.xlsx` e `.xls`, nos dois layouts de Mapão: por bimestre e
  consolidado.
- Parser usa SheetJS carregado por CDN.
- Identifica `ALUNO`, `Turma`, bimestre e disciplinas no layout Mapão.
- Lista notas abaixo de 5,0 e exclui transferidos e componentes fora da
  recuperação semestral.
- Lançamento da nota de recuperação, com a opção `Não realizou a prova` e
  propagação para as demais disciplinas do mesmo aluno.
- Lote persistido em `localStorage`, com expiração automática em 12 horas e
  botão `Apagar dados`.
- Exportação para Excel e ATA por turma em `Imprimir / PDF`.
- Mantém arquivos originais intactos.

## Dependência de execução

Primeiro carregamento precisa acessar `cdn.sheetjs.com` para ativar leitura Excel. Dados demonstrativos continuam disponíveis sem upload.
