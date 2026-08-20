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
- Lançamento da nota de recuperação, com as opções `Não realizou a prova` e
  `Não recuperou`, e propagação de `Não realizou` para as demais disciplinas do
  mesmo aluno.
- Importação do Mapão pós-recuperação: o app compara com o lote e preenche nota,
  bimestre substituído e desfecho sozinho.
- Coluna `Desfecho` — `Recuperou`, `Não recuperou` ou `Não realizou` — na tela,
  no Excel e na ATA.
- Lote persistido em `localStorage`, com expiração automática em 12 horas e
  botão `Apagar dados`.
- Exportação para Excel e ATA por turma em `Imprimir / PDF` ou `Baixar Word`.
- A planilha exportada volta a ser importada, para o lançamento em dupla.
- Sala compartilhada por link, quando ligada: duas pessoas lançam nota juntas.
- Mantém arquivos originais intactos.

## Importar o Mapão pós-recuperação

Depois que a nota da Avaliação de Recuperação Semestral é lançada na Sala do
Futuro, o Mapão volta com ela **sobrescrita na célula do bimestre**, sem coluna
própria. O app descobre a nota comparando esse Mapão com a lista que está na
tela, em vez de pedir a digitação linha a linha.

1. Importe os Mapões do 1º e 2º bimestre, como sempre. A lista de recuperação
   aparece.
2. Clique `Importar Mapão pós-recuperação` e escolha o arquivo novo.
3. Confira o resumo — linhas preenchidas, não recuperou, divergências — e
   confirme. `Cancelar` não altera nada.

Regras aplicadas, decididas com a coordenação em 20/08/2026:

- O bimestre que subiu é o substituído, e a nota nova é a nota da recuperação.
- Bimestre que não estava em recuperação é ignorado: `—` quer dizer que a nota
  era 5,0 ou mais.
- Linha em que nada mudou vira `Não recuperou`. O Mapão não separa quem fez a
  prova e não alcançou média de quem faltou — `Não realizou` continua existindo
  só se alguém marcar na mão.
- O desfecho responde "alcançou 5,0?", não "a nota mudou?". Quem foi de 2,0 para
  4,0 tem a nota registrada, o bimestre substituído e o desfecho `Não recuperou`.
- Quando o Mapão discorda de uma nota digitada à mão, o Mapão vence e a linha
  entra nas divergências.
- Nada torto é aplicado. Nota que caiu, nota quebrada, os dois bimestres
  alterados e linha ausente ficam destacados na lista, com o motivo no tooltip,
  para decisão à mão.

## Trabalho em dupla — sala compartilhada

Quem importa o Mapão abre uma sala e recebe um link. Quem abrir esse link vê a
mesma lista e digita nota junto, e cada nota aparece na tela do outro em alguns
segundos. Não precisa instalar nada nem baixar planilha.

A sala está ligada desde 10/08/2026: `SALA_ENDPOINT`, no topo do `app.js`,
aponta para a implantação do Apps Script. Esvaziar esse campo desliga a sala e
devolve o app ao funcionamento anterior, inteiro dentro do navegador.

**O código da sala é o único segredo.** A implantação é aberta a qualquer um,
porque não há login. Quem tiver o link entra e edita. Trate o link como se fosse
a própria lista de notas: mande direto para quem vai ajudar, não jogue em grupo.

### Reimplantar a caixa de dados, se precisar trocar de conta

1. Em `script.google.com`, crie um projeto e cole o `apps-script/Code.gs`.
2. Em Configurações, marque mostrar o manifesto, e cole o `appsscript.json`.
3. Implantar → Nova implantação → Web app, executando como você e com acesso
   para qualquer pessoa. Autorize na primeira execução.
4. Copie a URL terminada em `/exec` para `SALA_ENDPOINT`, no topo do `app.js`.
5. Publique. A planilha `Mapa Norte — Salas` nasce sozinha no seu Drive, no
   primeiro lote salvo, e é onde o dado de aluno fica.

Ao atualizar o Apps Script depois, use Gerenciar implantações e edite a que já
existe. Criar outra gera uma URL nova e a sala antiga fica órfã.

## Trabalho em dupla — planilha compartilhada

Alternativa sem servidor, e o que fazer quando a sala estiver fora do ar. O lote
vive no navegador de quem importou, então o transporte é o arquivo:

1. Importe os Mapões e clique `Exportar Excel`.
2. Suba o arquivo no Drive da escola e compartilhe com quem vai ajudar.
3. Os dois preenchem as colunas `Nota da recuperação semestral` e
   `Bimestre substituído`. O Google Sheets já mostra quem está editando o quê.
4. Baixe como `.xlsx` e importe de volta no app para gerar as ATAs.

Cada um pode preencher uma parte e importar os dois arquivos: a mesclagem casa
as linhas por aluno, turma e disciplina, e o valor preenchido vence o vazio.
Nada do arquivo devolvido é aceito sem conferência — nota, bimestre e status
são revalidados na importação.

## Dependência de execução

Primeiro carregamento precisa acessar `cdn.sheetjs.com` para ativar leitura Excel. Dados demonstrativos continuam disponíveis sem upload.
