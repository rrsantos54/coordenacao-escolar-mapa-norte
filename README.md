# Mapa Norte — Coordenação escolar

Protótipo web para processamento de recuperação escolar.

## Executar

Na pasta do projeto:

```bash
python3 -m http.server 4173
```

Abrir `http://localhost:4173`.

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
