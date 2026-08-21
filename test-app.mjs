// Testes de comportamento do app inteiro. Roda com: node test-app.mjs
//
// Carrega o index.html e o app.js reais num DOM (jsdom) e opera a tela como a
// coordenação opera: sobe lote, marca nota, gera ATA, aperta Apagar dados.
// Cobre o que o test-parser.mjs não alcança, porque depende de DOM e de evento.
//
// Fronteira escolhida: o SheetJS é substituído por um stub. O contrato dele com
// o app é uma coisa só — devolver um array de linhas — e é esse array que o
// parser consome. Assim os fixtures ficam legíveis aqui dentro, o teste não
// baixa biblioteca nem depende de rede, e nenhuma planilha de aluno real
// precisa existir para os testes rodarem. Quem valida o SheetJS de verdade é o
// navegador, na conferência manual descrita no MEMORIA.md.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const raiz = new URL('.', import.meta.url);
const html = readFileSync(new URL('index.html', raiz), 'utf8');
const appJs = readFileSync(new URL('app.js', raiz), 'utf8');

let checks = 0;
const eq = (real, esperado, msg) => { checks++; assert.deepEqual(real, esperado, msg); };
const ok = (cond, msg) => { checks++; assert.ok(cond, msg); };

// --------------------------------------------------------------------- fixtures
// Duas turmas sintéticas, no formato do Mapão consolidado: cabeçalho na linha 0,
// coluna de situação, e um par (1B)/(2B) por componente.
const ARQUIVO_A = 'Mapao_Consolidado_6° ANO A INTEGRAL 9H ANUAL.xlsx';
const TURMA_A_NOME = '6° ANO A INTEGRAL 9H ANUAL';
const ARQUIVO_B = 'Mapao_Consolidado_7º ANO A INTEGRAL 9H ANUAL.xlsx';
const TURMA_A = [
  ['ALUNO', 'SITUAÇÃO', 'MATEMATICA (1B)', 'MATEMATICA (2B)', 'HISTORIA (1B)', 'HISTORIA (2B)', 'GEOGRAFIA (1B)', 'GEOGRAFIA (2B)'],
  ['ALUNA COM TRES PENDENCIAS', 'Ativo', '3', '4', '2', '2', '4', '4'],
  ['ALUNO COM UMA PENDENCIA', 'Ativo', '2', '8', '8', '9', '9', '9'],
  ['ALUNA SEM PENDENCIA', 'Ativo', '8', '9', '9', '9', '10', '10'],
  ['ALUNO TRANSFERIDO', 'Transferido', '1', '1', '1', '1', '1', '1'],
];
// O mesmo Mapão da TURMA_A depois da Sala do Futuro, que é como a nota volta:
// sobrescrita na célula do bimestre, sem coluna própria.
//  ALUNA, MATEMÁTICA: 1º bim de 3 para 7  — recuperou
//  ALUNA, HISTÓRIA:   nada mudou           — não recuperou
//  ALUNA, GEOGRAFIA:  2º bim de 4 para 3   — nota caiu, divergência
//  ALUNO, MATEMÁTICA: 1º bim de 2 para 4   — subiu e não alcançou média
const TURMA_A_POS = [
  ['ALUNO', 'SITUAÇÃO', 'MATEMATICA (1B)', 'MATEMATICA (2B)', 'HISTORIA (1B)', 'HISTORIA (2B)', 'GEOGRAFIA (1B)', 'GEOGRAFIA (2B)'],
  ['ALUNA COM TRES PENDENCIAS', 'Ativo', '7', '4', '2', '2', '4', '3'],
  ['ALUNO COM UMA PENDENCIA', 'Ativo', '4', '8', '8', '9', '9', '9'],
  ['ALUNA SEM PENDENCIA', 'Ativo', '8', '9', '9', '9', '10', '10'],
  ['ALUNO TRANSFERIDO', 'Transferido', '1', '1', '1', '1', '1', '1'],
];
const TURMA_B = [
  ['ALUNO', 'SITUAÇÃO', 'MATEMATICA (1B)', 'MATEMATICA (2B)'],
  ['ALUNA DA OUTRA TURMA', 'Ativo', '3', '3'],
];

// --------------------------------------------------------------- ambiente falso
// opcoes.sala liga a sala compartilhada trocando o SALA_ENDPOINT, que vem vazio
// no arquivo publicado — a escola preenche com a própria implantação do Apps
// Script. opcoes.hash entra na URL, que é como alguém chega por um link de sala.
function montarApp(opcoes = {}) {
  // Host que não existe de propósito: se algum dia o fetch deixar de ser
  // substituído pelo servidor falso, o teste falha em vez de sair para a rede.
  const endpoint = opcoes.sala ? 'https://sala-de-teste.invalido/exec' : '';
  // Troca o valor qualquer que ele seja: o app.js publicado aponta para a
  // implantação de verdade, e o teste nunca pode falar com ela. Quando
  // opcoes.sala é falso o endpoint vira vazio, que é o caso "sala desligada".
  if (!/const SALA_ENDPOINT='[^']*';/.test(appJs)) throw new Error('SALA_ENDPOINT mudou de forma: o teste não consegue controlar a sala');
  const fonte = appJs.replace(/const SALA_ENDPOINT='[^']*';/, `const SALA_ENDPOINT='${endpoint}';`);
  if (fonte.includes('script.google.com')) throw new Error('o teste ficou apontando para a implantação real');
  const url = `http://localhost:8899/index.html${opcoes.hash || ''}`;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url });
  const { window } = dom;

  // jsdom nasce com visibilityState 'prerender', logo document.hidden true. O
  // navegador abre a aba visível. Sem corrigir, a conferência da sala nunca
  // rodaria no teste e o guard de aba escondida esconderia qualquer defeito.
  Object.defineProperty(window.document, 'hidden', { value: false, configurable: true, writable: true });

  // Stub do SheetJS. O "arquivo" carrega as linhas em JSON; XLSX.read devolve
  // exatamente o que o SheetJS devolveria: um array de arrays.
  //
  // Na gravação o dublê imita a forma de verdade — célula endereçada por A1,
  // com { v } e o { s } de estilo —, porque é nela que a cor da ATA é escrita.
  // O array de linhas fica guardado em `linhas` para os testes que só querem
  // conferir conteúdo. `style_version` é o que o app usa para saber que a
  // biblioteca em uso escreve cor: com ela presente, carregarXlsxEstilo devolve
  // esta aqui na hora, sem buscar CDN nenhum.
  // opcoes.cdnDeCorBloqueada simula a rede da escola barrando o CDN: o jsdom não
  // busca script externo nem dispara onerror sozinho, então o erro é disparado
  // aqui, no mesmo ponto em que o navegador dispararia.
  if (opcoes.cdnDeCorBloqueada) {
    const appendChild = window.document.head.appendChild.bind(window.document.head);
    window.document.head.appendChild = (no) => {
      const resultado = appendChild(no);
      if (no.tagName === 'SCRIPT' && String(no.src).includes('xlsx-js-style')) setTimeout(() => no.dispatchEvent(new window.Event('error')), 0);
      return resultado;
    };
  }

  const escritos = [];
  const encodeCell = ({ r, c }) => `${String.fromCharCode(65 + c)}${r + 1}`;
  window.XLSX = {
    style_version: '1.2.0',
    read: (buffer) => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: JSON.parse(new TextDecoder().decode(buffer)) } }),
    utils: {
      sheet_to_json: (sheet) => sheet,
      encode_cell: encodeCell,
      book_new: () => ({ SheetNames: [], Sheets: {} }),
      aoa_to_sheet: (linhas) => {
        const sheet = { linhas };
        linhas.forEach((linha, r) => linha.forEach((valor, c) => { sheet[encodeCell({ r, c })] = { v: valor }; }));
        return sheet;
      },
      book_append_sheet: (book, sheet, nome) => { book.SheetNames.push(nome); book.Sheets[nome] = sheet; },
    },
    writeFile: (book, nome) => { const sheet = book.Sheets[book.SheetNames[0]]; escritos.push({ nome, linhas: sheet.linhas, sheet }); },
  };
  if (opcoes.cdnDeCorBloqueada) delete window.XLSX.style_version;

  // A janela de impressão é capturada em vez de aberta.
  const impressos = [];
  window.open = () => ({ document: { write: h => impressos.push(h), close: () => {} } });
  window.scrollTo = () => {};   // jsdom não implementa; switchView chama.

  // Console capturado em vez de impresso: erro inesperado vira falha de teste,
  // e o erro esperado do arquivo ilegível pode ser verificado.
  const errosDeConsole = [];
  window.console.error = (...args) => errosDeConsole.push(args.map(String).join(' '));
  window.console.warn = (...args) => errosDeConsole.push(args.map(String).join(' '));

  // Servidor de sala falso. Guarda linhas e devolve linhas, como o Apps Script:
  // o contrato é a resposta JSON, e é ela que o app consome.
  // opcoes.estado semeia o servidor antes do app subir: quem chega por um link
  // de sala busca o lote na primeira linha de execução, não dá para semear depois.
  const servidor = { versao: 0, escola: '', linhas: [], chamadas: [], forcarErro: false, ...(opcoes.estado || {}) };
  window.fetch = async (endereco, opcoesFetch = {}) => {
    servidor.chamadas.push({ endereco: String(endereco), corpo: opcoesFetch.body ? JSON.parse(opcoesFetch.body) : null });
    if (servidor.forcarErro) throw new Error('rede caiu');
    // O brasão da ATA em Word é buscado como binário, não como JSON.
    if (String(endereco).includes('brasao-sp.png')) {
      return { ok: !servidor.brasaoQuebrado, status: servidor.brasaoQuebrado ? 404 : 200, arrayBuffer: async () => new ArrayBuffer(8) };
    }
    const responder = (dados) => ({ ok: true, status: 200, json: async () => dados });
    if ((opcoesFetch.method || 'GET') === 'GET') {
      if (String(endereco).includes('acao=versao')) return responder({ versao: servidor.versao });
      return responder({ versao: servidor.versao, escola: servidor.escola, linhas: servidor.linhas });
    }
    const corpo = JSON.parse(opcoesFetch.body);
    if (corpo.acao === 'salvar') {
      servidor.linhas = corpo.linhas;
      servidor.escola = corpo.escola || '';
    }
    if (corpo.acao === 'lancar') {
      const alvo = servidor.linhas.find(linha => linha[0] === corpo.chave);
      if (alvo) { alvo[6] = corpo.recuperacao; alvo[7] = corpo.bimestre; }
    }
    servidor.versao += 1;
    return responder({ versao: servidor.versao });
  };

  // Dublê da biblioteca do Word. Ela é 1,1 MB de CDN e o app a carrega sob
  // demanda; aqui já está no window, então carregarDocx devolve esta na hora.
  // Cada classe guarda tipo e opções, o que deixa o teste conferir o que foi
  // realmente montado sem depender do formato OOXML.
  const criarClasse = (tipo) => class { constructor(opcoes) { this.tipo = tipo; this.opcoes = opcoes; } };
  const baixados = [];
  window.docx = {
    Document: criarClasse('Document'), Header: criarClasse('Header'), Paragraph: criarClasse('Paragraph'), TextRun: criarClasse('TextRun'),
    Table: criarClasse('Table'), TableRow: criarClasse('TableRow'), TableCell: criarClasse('TableCell'),
    ImageRun: criarClasse('ImageRun'),
    AlignmentType: { CENTER: 'center' }, WidthType: { PERCENTAGE: 'pct' }, BorderStyle: { NONE: 'none' },
    // Conferidos contra o docx 9.7.1 de verdade: geram <w:vMerge w:val="…"> e
    // <w:vAlign w:val="center"> no OOXML.
    VerticalMergeType: { RESTART: 'restart', CONTINUE: 'continue' }, VerticalAlign: { CENTER: 'center' },
    Packer: { toBlob: async (doc) => { baixados.push({ doc }); return new window.Blob(['docx']); } },
  };
  // jsdom não implementa nenhum dos dois.
  window.URL.createObjectURL = () => 'blob:falso';
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () {
    if (this.download) baixados[baixados.length - 1].nome = this.download;
  };

  const script = window.document.createElement('script');
  script.textContent = fonte;
  window.document.body.appendChild(script);

  // As declarações do app.js são const de escopo de script: não viram
  // propriedade de window. Um segundo script no mesmo escopo alcança e expõe.
  const ponte = window.document.createElement('script');
  ponte.textContent = `window.__app = {
    get recoveryData(){return recoveryData}, get schoolName(){return schoolName},
    importBatch, renderAta, restoreLocal, switchView, recoveryRows,
    validateUploadSelection, NO_EXAM, NO_RECOVERY, desfecho, STORAGE_KEY, MAX_STORAGE_AGE_MS, PROFESSORES,
    get salaId(){return salaId}, conferirSala, chaveDaLinha
  };`;
  window.document.body.appendChild(ponte);

  // O app é assíncrono em vários pontos — leitura de arquivo, chamada de sala.
  // Drenar a fila de microtarefas é como o teste espera tudo assentar.
  const esperar = async () => { for (let i = 0; i < 50; i++) await new Promise(r => setTimeout(r, 0)); };

  const criarArquivos = (arquivos) => arquivos.map(([nome, linhas]) => {
      const bytes = new TextEncoder().encode(JSON.stringify(linhas));
      const file = new window.File([bytes], nome, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      // O File do jsdom não implementa arrayBuffer(); o app usa só name, size e ele.
      if (typeof file.arrayBuffer !== 'function') {
        Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer, configurable: true });
      }
      return file;
  });

  const subirLote = async (arquivos) => {
    const input = window.document.querySelector('#folder-input');
    Object.defineProperty(input, 'files', { value: criarArquivos(arquivos), configurable: true });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    await esperar();
  };

  // Mapão pós-recuperação: entra por um input próprio e pára no modal de resumo.
  // resposta diz qual botão do modal é apertado — é o passo que decide se o lote
  // é aplicado ou descartado.
  const subirPos = async (arquivos, resposta = 'confirm-ok') => {
    const input = window.document.querySelector('#pos-input');
    Object.defineProperty(input, 'files', { value: criarArquivos(arquivos), configurable: true });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    await esperar();
    const modal = window.document.querySelector('#confirm-modal');
    const aberto = modal.classList.contains('open');
    const resumo = window.document.querySelector('#confirm-text').textContent;
    if (aberto) window.document.querySelector(`#${resposta}`).click();
    await esperar();
    return { aberto, resumo };
  };

  // A sala liga um setInterval que segura o event loop do node para sempre.
  // Quem monta um app com sala fecha a janela no fim do bloco.
  const fechar = () => window.close();

  // Junta todo o texto de uma árvore de objetos do dublê do docx, para o teste
  // perguntar "isso aparece no documento?" sem conhecer a estrutura por dentro.
  const textoDoDocumento = (no) => {
    if (no == null) return '';
    if (typeof no === 'string') return no;
    if (Array.isArray(no)) return no.map(textoDoDocumento).join(' ');
    if (typeof no === 'object') return Object.values(no).map(textoDoDocumento).join(' ');
    return String(no);
  };

  return { window, doc: window.document, app: window.__app, subirLote, subirPos, escritos, impressos, errosDeConsole, servidor, esperar, fechar, baixados, textoDoDocumento };
}

// ============================================================ 1. subir um lote
{
  const { app, subirLote } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  const linhas = app.recoveryData;
  eq(linhas.length, 4, 'quatro pendências: 3 de uma aluna e 1 de um aluno');
  eq([...new Set(linhas.map(r => r[1]))], [TURMA_A_NOME], 'turma do nome do arquivo');
  ok(!linhas.some(r => r[0] === 'ALUNO TRANSFERIDO'), 'transferido fica fora');
  ok(!linhas.some(r => r[0] === 'ALUNA SEM PENDENCIA'), 'quem não tem nota baixa fica fora');
  const mat = linhas.find(r => r[0] === 'ALUNA COM TRES PENDENCIAS' && r[2] === 'MATEMÁTICA');
  eq([mat[3], mat[4], mat[6]], ['3', '4', '1º bimestre'], 'dois bimestres e o menor sugerido');
}

// ================================================ 2. Não realizou e propagação
{
  const { window, doc, app, subirLote } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  app.switchView('recovery');

  const alvo = app.recoveryData.findIndex(r => r[0] === 'ALUNA COM TRES PENDENCIAS');
  const sel = doc.querySelector(`select.score-input[data-index="${alvo}"]`);
  ok(sel, 'a linha tem seletor de nota');
  sel.value = app.NO_EXAM;
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 0));

  ok(doc.querySelector('#confirm-modal').classList.contains('open'), 'o modal de confirmação abre');
  ok(doc.querySelector('#confirm-text').textContent.includes('mais 2 disciplina'), 'o modal informa quantas linhas serão afetadas');
  doc.querySelector('#confirm-ok').click();
  for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0));

  const dela = app.recoveryData.filter(r => r[0] === 'ALUNA COM TRES PENDENCIAS');
  eq(dela.length, 3, 'ela tem três disciplinas');
  ok(dela.every(r => r[5] === app.NO_EXAM), 'todas marcadas como Não realizou');
  ok(dela.every(r => r[6] === ''), 'bimestre substituído é limpo');
  ok(dela.every(r => r[7] === 'Concluído'), 'e o registro fica concluído');
  ok(!app.recoveryData.some(r => r[0] !== 'ALUNA COM TRES PENDENCIAS' && r[5] === app.NO_EXAM), 'não vaza para outro aluno');
  eq(doc.querySelectorAll('select.replacement-select[disabled]').length, 3, 'o seletor de bimestre é desabilitado');
}

// ==================================================== 3. Esc cancela a propagação
{
  const { window, doc, app, subirLote } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  app.switchView('recovery');

  const alvo = app.recoveryData.findIndex(r => r[0] === 'ALUNA COM TRES PENDENCIAS');
  const sel = doc.querySelector(`select.score-input[data-index="${alvo}"]`);
  sel.value = app.NO_EXAM;
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 0));
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0));

  const dela = app.recoveryData.filter(r => r[0] === 'ALUNA COM TRES PENDENCIAS');
  eq(dela.filter(r => r[5] === app.NO_EXAM).length, 1, 'Esc marca só a linha clicada');
  ok(!doc.querySelector('#confirm-modal').classList.contains('open'), 'e fecha o modal');
}

// =============================================== 4. mesclagem de lotes sucessivos
{
  const { app, subirLote } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  const depoisDoPrimeiro = app.recoveryData.length;

  // A coordenação lança uma nota à mão antes do segundo lote chegar.
  const alvo = app.recoveryData.find(r => r[2] === 'HISTÓRIA');
  alvo[5] = '7'; alvo[6] = '1º bimestre'; alvo[7] = 'Concluído';

  await subirLote([[ARQUIVO_B, TURMA_B]]);
  eq(app.recoveryData.length, depoisDoPrimeiro + 1, 'o segundo lote acrescenta');
  eq([...new Set(app.recoveryData.map(r => r[1]))].length, 2, 'duas turmas na tela');
  const depois = app.recoveryData.find(r => r[2] === 'HISTÓRIA');
  eq(depois[5], '7', 'nota lançada à mão sobrevive ao segundo lote');

  // Reimportar o mesmo arquivo não pode duplicar linha.
  const antes = app.recoveryData.length;
  await subirLote([[ARQUIVO_B, TURMA_B]]);
  eq(app.recoveryData.length, antes, 'reimportar não duplica');
}

// ====================================== 5. localStorage: guarda, restaura, expira
{
  const { window, app, subirLote } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  const bruto = window.localStorage.getItem(app.STORAGE_KEY);
  ok(bruto, 'o lote é gravado');
  const salvo = JSON.parse(bruto);
  eq(salvo.recoveryData.length, 4, 'com todos os registros');
  ok(salvo.ts > 0, 'e com carimbo de tempo');

  const guardado = salvo.recoveryData;
  const restaurar = (payload) => {
    window.localStorage.setItem(app.STORAGE_KEY, JSON.stringify(payload));
    app.recoveryData.splice(0, app.recoveryData.length);
    app.restoreLocal();
    return app.recoveryData.length;
  };
  eq(restaurar({ schoolName: '', recoveryData: guardado, ts: Date.now() - 11 * 3600e3 }), 4, '11 horas ainda restaura');
  eq(restaurar({ schoolName: '', recoveryData: guardado, ts: Date.now() - 13 * 3600e3 }), 0, '13 horas é descartado');
  eq(window.localStorage.getItem(app.STORAGE_KEY), null, 'e a chave é apagada');
  eq(restaurar({ schoolName: '', recoveryData: guardado }), 0, 'lote sem carimbo é descartado');
  eq(restaurar({ schoolName: '', recoveryData: 'lixo', ts: Date.now() }), 0, 'conteúdo inválido não quebra o app');
}

// ============================================================ 6. ATA e impressão
{
  const { doc, app, subirLote, impressos } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  doc.querySelector('#school-name').value = 'Waldomiro Sampaio de Souza Prefeito';
  doc.querySelector('#school-name').dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));

  app.switchView('minutes');
  doc.querySelector('#generate-minutes').click();
  app.renderAta(TURMA_A_NOME);

  const paper = doc.querySelector('.paper');
  const celulas = [...paper.querySelectorAll('.paper-table span')].map(s => s.textContent);
  // A célula do aluno é uma por bloco, não uma por linha: ela ocupa o bloco
  // inteiro por grid-row. As outras seis colunas seguem uma por pendência.
  const celulasDeAluno = [...paper.querySelectorAll('.paper-table .aluno')];
  eq((celulas.length - 7 - celulasDeAluno.length) / 6, 4, 'a ATA tem uma linha por pendência');
  eq(celulasDeAluno.reduce((total, c) => total + Number(c.style.gridRow.replace('span ', '')), 0), 4,
    'e os blocos de aluno cobrem exatamente essas quatro linhas');
  // A grade é montada por concatenação de <span>. Se algo entrar entre eles, a
  // célula deixa de ser uma célula e o texto vaza para a coluna do lado.
  eq(paper.querySelector('.paper-table').textContent, celulas.join(''), 'a grade não tem texto solto entre as células');
  eq(celulas.slice(0, 7), ['Aluno', 'Disciplina', 'Nota do primeiro bimestre', 'Nota do segundo bimestre', 'Nota da recuperação semestral', 'Bimestre substituído', 'Desfecho'], 'com o cabeçalho na ordem certa');
  ok(celulas.includes('MATEMÁTICA'), 'e a disciplina acentuada como célula própria');
  // Abertura: diz o que a ATA registra, em que turma e quando as avaliações
  // foram aplicadas. É texto de documento oficial, e o mesmo tem que sair no
  // Word — por isso ele mora numa constante só.
  const abertura = paper.querySelector('.paper-intro').textContent;
  ok(/^(Aos \d{1,2} dias|Ao primeiro dia) do mês de \p{L}+ de dois mil/u.test(abertura), 'a abertura traz a data do dia, sem lacuna para preencher');
  ok(!abertura.includes('____'), 'e nenhuma lacuna sobrou na frase');
  ok(abertura.includes('procedeu-se ao registro dos resultados da Recuperação Semestral'), 'a abertura diz o que a ATA registra');
  ok(abertura.includes('período de 03 a 07 de agosto de 2026'), 'e em que período as avaliações foram aplicadas');
  ok(abertura.includes(TURMA_A_NOME), 'com a turma no meio da frase');
  ok(abertura.trim().endsWith(':'), 'e termina puxando a tabela que vem abaixo');

  // Assinatura: quatro linhas em branco para os professores, acima das de
  // Coordenação e Direção.
  const professores = paper.querySelector('.teachers');
  ok(professores, 'a ATA tem bloco de assinatura dos professores');
  ok(professores.textContent.startsWith('Professores'), 'rotulado');
  eq(professores.querySelectorAll('span').length, app.PROFESSORES.length, 'uma linha por professor do quadro');
  eq(professores.querySelectorAll('span small').length, app.PROFESSORES.length, 'cada uma com o nome embaixo');
  ok(professores.textContent.includes('ADRIANA APARECIDA BOLDRINI'), 'o primeiro nome da lista aparece');
  ok(professores.textContent.includes('VÍNICIUS FORNAROLO DE OLIVEIRA'), 'e o último também, com acento');
  eq(paper.querySelectorAll('.signatures span').length, 2, 'e Coordenação e Direção continuam abaixo');

  ok(paper.querySelector('img.brasao'), 'o brasão está na ATA');
  ok(paper.querySelector('.paper-head'), 'dentro do cabeçalho em linha');
  ok(paper.querySelector('.paper-center').textContent.includes('E.E.'), 'o cabeçalho traz a unidade');
  ok(paper.querySelector('.paper-intro').textContent.includes(TURMA_A_NOME), 'e a turma no texto de abertura');

  doc.querySelector('#print-ata').click();
  eq(impressos.length, 1, 'a janela de impressão recebe o documento');
  const impresso = impressos[0];
  ok(impresso.includes('<base href="http://localhost:8899/'), 'com base href, senão o brasão não resolve em about:blank');
  ok(impresso.includes('class="brasao"'), 'com o brasão');
  ok(impresso.includes('Coordenação') && impresso.includes('Direção'), 'e com as assinaturas');
}

// ======================================================== 7. exportação para Excel
{
  const { doc, app, subirLote, escritos } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  doc.querySelector('#export-recovery').click();
  eq(escritos.length, 1, 'gera um arquivo');
  eq(escritos[0].nome, 'lista-recuperacao-2026.xlsx', 'com o nome esperado');
  eq(escritos[0].linhas.length, app.recoveryData.length + 1, 'cabeçalho mais uma linha por registro');
  eq(escritos[0].linhas[0][0], 'Aluno', 'primeira coluna é o aluno');
}

// ========================= 7b. a planilha exportada volta preenchida (trabalho em dupla)
// O fluxo em dupla: uma pessoa importa o Mapão, exporta, sobe a planilha num
// Drive compartilhado, os dois preenchem as notas ao mesmo tempo, e o arquivo
// devolvido volta para o app gerar as ATAs.
{
  const { doc, app, subirLote, escritos } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  doc.querySelector('#export-recovery').click();

  // Preenche a coluna de recuperação da planilha exportada, como o colega faria.
  const [cabecalho, ...linhas] = escritos[0].linhas;
  const preenchida = [cabecalho, ...linhas.map(linha => {
    const copia = linha.slice();
    copia[5] = '8';
    copia[6] = '1º bimestre';
    return copia;
  })];
  const antes = app.recoveryData.length;

  const outro = montarApp();
  await outro.subirLote([[ARQUIVO_A, TURMA_A]]);
  await outro.subirLote([['lista-recuperacao-2026.xlsx', preenchida]]);

  eq(outro.app.recoveryData.length, antes, 'reimportar a planilha preenchida não duplica registro');
  ok(outro.app.recoveryData.every(r => r[5] === '8'), 'as notas lançadas pelo colega chegam');
  ok(outro.app.recoveryData.every(r => r[7] === 'Concluído'), 'e as linhas ficam concluídas');
  ok(outro.app.recoveryData.every(r => r[2] !== 'Nota do primeiro bimestre'), 'nenhuma coluna de nota virou disciplina');

  // Também funciona sem o Mapão na frente: a planilha preenchida sozinha basta.
  const sozinha = montarApp();
  await sozinha.subirLote([['lista-recuperacao-2026.xlsx', preenchida]]);
  eq(sozinha.app.recoveryData.length, antes, 'a planilha preenchida sozinha reconstrói o lote');
  eq(sozinha.app.recoveryData[0][5], '8', 'com as notas');
}

// ============================ 7c. sala compartilhada: o link e as duas pessoas
{
  // Desligada por padrão. O arquivo publicado tem SALA_ENDPOINT vazio, e o app
  // não pode tentar falar com servidor nenhum nesse estado.
  const semSala = montarApp();
  await semSala.subirLote([[ARQUIVO_A, TURMA_A]]);
  semSala.app.switchView('recovery');
  const campoSolto = semSala.doc.querySelector('select.score-input[data-index="0"]');
  campoSolto.value = '6';
  campoSolto.dispatchEvent(new semSala.window.Event('change', { bubbles: true }));
  await semSala.esperar();
  eq(semSala.servidor.chamadas.length, 0, 'sem endpoint o app não chama a rede, nem ao importar nem ao digitar');
  eq(semSala.app.recoveryData[0][5], '6', 'e a nota digitada fica guardada localmente do mesmo jeito');
  eq(semSala.doc.querySelector('#sala-bar').hidden, true, 'a barra da sala fica escondida');

  // Quem importa o Mapão abre a sala e ganha o link.
  const ana = montarApp({ sala: true });
  await ana.subirLote([[ARQUIVO_A, TURMA_A]]);
  const codigo = ana.app.salaId;
  ok(/^[A-Z0-9]{12}$/.test(codigo), 'importar abre uma sala com código de 12 caracteres');
  eq(ana.doc.querySelector('#sala-bar').hidden, false, 'a barra da sala aparece');
  ok(ana.doc.querySelector('#sala-link').value.endsWith(`#sala=${codigo}`), 'o link carrega o código');
  eq(ana.servidor.linhas.length, ana.app.recoveryData.length, 'o lote inteiro sobe para a sala');
  eq(ana.servidor.linhas[0][0], ana.app.chaveDaLinha(ana.app.recoveryData[0]), 'com a chave montada aqui, não lá');

  // A segunda pessoa abre o link e vê a mesma lista, sem importar nada.
  const bruno = montarApp({
    sala: true,
    hash: `#sala=${codigo}`,
    estado: { versao: ana.servidor.versao, escola: ana.servidor.escola, linhas: ana.servidor.linhas.map(linha => linha.slice()) },
  });
  await bruno.esperar();
  eq(bruno.app.salaId, codigo, 'o código sai do link');
  eq(bruno.app.recoveryData.length, ana.app.recoveryData.length, 'e a lista chega pronta, sem subir planilha');
  eq(bruno.doc.querySelectorAll('#recovery-table tr').length, ana.app.recoveryData.length, 'a tabela é desenhada');

  // Bruno digita uma nota: vai uma alteração de linha só, não o lote inteiro.
  bruno.app.switchView('recovery');
  const seletor = bruno.doc.querySelector('select.score-input[data-index="0"]');
  seletor.value = '8';
  seletor.dispatchEvent(new bruno.window.Event('change', { bubbles: true }));
  await bruno.esperar();
  const lancamento = bruno.servidor.chamadas.map(c => c.corpo).filter(Boolean).find(c => c.acao === 'lancar');
  ok(lancamento, 'digitar nota manda um lancamento');
  eq(lancamento.recuperacao, '8', 'com a nota');
  eq(lancamento.chave, bruno.app.chaveDaLinha(bruno.app.recoveryData[0]), 'e a chave da linha, não o índice');
  eq(bruno.servidor.linhas[0][6], '8', 'o servidor guarda a nota na linha certa');

  // Ana está acompanhando: a conferência periódica traz a nota do Bruno.
  ana.servidor.linhas = bruno.servidor.linhas.map(linha => linha.slice());
  ana.servidor.versao = bruno.servidor.versao;
  await ana.app.conferirSala();
  await ana.esperar();
  eq(ana.app.recoveryData[0][5], '8', 'a nota digitada pelo Bruno aparece na tela da Ana');
  eq(ana.app.recoveryData[0][7], 'Concluído', 'com o status recalculado do lado dela');

  // Aba escondida não consulta: são duas pessoas perguntando a cada 8 segundos,
  // e a cota do Apps Script é por dia.
  ana.window.document.hidden = true;
  const antesDeEsconder = ana.servidor.chamadas.length;
  await ana.app.conferirSala();
  eq(ana.servidor.chamadas.length, antesDeEsconder, 'aba escondida não gasta chamada');
  ana.window.document.hidden = false;

  // Sala fora do ar não pode derrubar o trabalho de ninguém.
  const off = montarApp({ sala: true });
  await off.subirLote([[ARQUIVO_A, TURMA_A]]);
  off.servidor.forcarErro = true;
  const antes = off.app.recoveryData.length;
  const campo = off.doc.querySelector('select.score-input[data-index="0"]');
  off.app.switchView('recovery');
  campo.value = '9';
  campo.dispatchEvent(new off.window.Event('change', { bubbles: true }));
  await off.esperar();
  eq(off.app.recoveryData.length, antes, 'o lote continua na tela');
  eq(off.app.recoveryData[0][5], '9', 'e a nota digitada não se perde');
  eq(off.doc.querySelector('#toast').textContent.includes('Sala fora do ar'), true, 'com aviso de que ficou só neste aparelho');

  // Os dois mexeram na mesma linha: quem acabou de agir vence. Salvar o lote
  // inteiro busca o servidor antes e mescla com ele por base, então uma nota
  // remota antiga não pode desfazer o que a pessoa acabou de marcar aqui.
  const disputa = montarApp({ sala: true });
  await disputa.subirLote([[ARQUIVO_A, TURMA_A]]);
  const indice = disputa.app.recoveryData.findIndex(r => r[0] === 'ALUNA COM TRES PENDENCIAS');
  // A linha disputada é outra do mesmo aluno, não a que vai ser clicada: a
  // clicada é corrigida no servidor pelo lançamento avulso antes da mesclagem,
  // e não chega a disputar nada. Quem só a propagação alcança, sim.
  const arrastada = disputa.app.recoveryData.findIndex((r, i) => i !== indice && r[0] === 'ALUNA COM TRES PENDENCIAS');
  const chaveDisputada = disputa.app.chaveDaLinha(disputa.app.recoveryData[arrastada]);
  disputa.servidor.linhas.find(linha => linha[0] === chaveDisputada)[6] = '7';
  disputa.servidor.versao += 1;

  disputa.app.switchView('recovery');
  const seletorDisputado = disputa.doc.querySelector(`select.score-input[data-index="${indice}"]`);
  seletorDisputado.value = disputa.app.NO_EXAM;
  seletorDisputado.dispatchEvent(new disputa.window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 0));
  disputa.doc.querySelector('#confirm-ok').click();
  await disputa.esperar();

  eq(disputa.app.recoveryData[arrastada][5], disputa.app.NO_EXAM, 'o que a pessoa acabou de marcar não é desfeito por nota antiga do servidor');
  eq(disputa.servidor.linhas.find(linha => linha[0] === chaveDisputada)[6], disputa.app.NO_EXAM, 'e o servidor recebe a marcação');
  ok(disputa.app.recoveryData.filter(r => r[0] === 'ALUNA COM TRES PENDENCIAS').every(r => r[5] === disputa.app.NO_EXAM), 'a propagação sobrevive à mesclagem com o servidor');

  [ana, bruno, off, disputa].forEach(app => app.fechar());
}

// ================================================= 7d. baixar a ATA em Word
{
  // Duas turmas de propósito: a ATA é por turma, e a de uma não pode carregar
  // aluno da outra. Com um lote de turma única, filtrar ou não dá igual e o
  // defeito passaria despercebido.
  const { doc, app, subirLote, baixados, textoDoDocumento, esperar } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A], [ARQUIVO_B, TURMA_B]]);
  app.switchView('minutes');

  doc.querySelector('#download-ata-word').click();
  await esperar();

  eq(baixados.length, 1, 'gera um documento');
  eq(baixados[0].nome, `ata-${TURMA_A_NOME.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}.docx`, 'com o nome da turma no arquivo');

  const texto = textoDoDocumento(baixados[0].doc);
  ok(texto.includes('ATA DE RECUPERAÇÃO SEMESTRAL — 2026'), 'o título entra no documento');
  ok(texto.includes(TURMA_A_NOME), 'a turma entra no parágrafo de abertura');
  ok(texto.includes('ALUNA COM TRES PENDENCIAS'), 'os alunos entram na tabela');
  ok(texto.includes('MATEMÁTICA'), 'com as disciplinas');
  ok(texto.includes('Coordenação') && texto.includes('Direção'), 'e as assinaturas');
  ok(!texto.includes('ALUNO TRANSFERIDO'), 'quem está fora da lista continua fora da ATA');
  ok(!texto.includes('ALUNA DA OUTRA TURMA'), 'e aluno de outra turma não entra na ATA desta');

  // O brasão e o bloco do governo vão no cabeçalho de página, não no corpo:
  // é assim que se repetem na página 2 em diante, e turma grande passa de uma.
  const secao = baixados[0].doc.opcoes.sections[0];
  eq(secao.headers.default.tipo, 'Header', 'a seção tem cabeçalho de página');
  const noCabecalho = JSON.stringify(secao.headers.default);
  const noCorpo = JSON.stringify(secao.children);
  ok(noCabecalho.includes('GOVERNO DO ESTADO DE SÃO PAULO'), 'o bloco do governo está no cabeçalho');
  ok(!noCorpo.includes('GOVERNO DO ESTADO DE SÃO PAULO'), 'e não no corpo, onde só apareceria na primeira página');
  ok(noCabecalho.includes('PREF. WALDOMIRO SAMPAIO DE SOUZA'), 'com a escola');
  eq((noCabecalho.match(/"tipo":"ImageRun"/g) || []).length, 1, 'o brasão entra como imagem no cabeçalho');
  eq((noCorpo.match(/"tipo":"ImageRun"/g) || []).length, 0, 'e não sobra cópia no corpo');
  ok(noCorpo.includes('ATA DE RECUPERAÇÃO SEMESTRAL'), 'o título continua no corpo');

  // As disciplinas saem acentuadas mesmo vindo sem acento do Mapão.
  ok(texto.includes('MATEMÁTICA'), 'a disciplina sai acentuada na ATA');
  ok(!texto.includes('MATEMATICA'), 'e a grafia sem acento do Mapão não aparece');

  // Brasão indisponível não pode impedir a ATA de sair.
  const semBrasao = montarApp();
  await semBrasao.subirLote([[ARQUIVO_A, TURMA_A]]);
  semBrasao.servidor.brasaoQuebrado = true;
  semBrasao.doc.querySelector('#download-ata-word').click();
  await semBrasao.esperar();
  eq(semBrasao.baixados.length, 1, 'sem brasão a ATA sai assim mesmo');
  ok(!JSON.stringify(semBrasao.baixados[0].doc).includes('ImageRun'), 'só que sem a imagem');
  ok(semBrasao.textoDoDocumento(semBrasao.baixados[0].doc).includes('ALUNA COM TRES PENDENCIAS'), 'e com os alunos no lugar');

  // Trocar de ATA e baixar tem que dar a ATA que está na tela. O .selected do
  // HTML marca sempre a primeira da lista, então quem responde isso é o ataAtual.
  const outra = [...doc.querySelectorAll('[data-ata-class]')].find(b => b.dataset.ataClass !== TURMA_A_NOME);
  ok(outra, 'a segunda turma tem botão de revisar ATA');
  outra.click();
  doc.querySelector('#download-ata-word').click();
  await esperar();

  eq(baixados.length, 2, 'gera o segundo documento');
  const textoDaOutra = textoDoDocumento(baixados[1].doc);
  ok(textoDaOutra.includes('ALUNA DA OUTRA TURMA'), 'a ATA baixada é a da turma que está na tela');
  ok(!textoDaOutra.includes('ALUNA COM TRES PENDENCIAS'), 'e não a da primeira turma da lista');
  ok(baixados[1].nome !== baixados[0].nome, 'com nome de arquivo próprio');
  ok(outra.closest('.minute-row').classList.contains('selected'), 'e a lista passa a destacar a turma escolhida');

  // De nada adianta pedir integrity se a CSP não deixa o script carregar, e de
  // nada adianta liberar o CDN se o integrity sumir. Os dois andam juntos.
  const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  ok(/script-src[^;]*https:\/\/cdn\.jsdelivr\.net/.test(csp), 'a CSP libera o CDN da biblioteca do Word');
  ok(/script-src 'self'/.test(csp) && !/script-src[^;]*'unsafe-inline'/.test(csp), 'e continua sem unsafe-inline no script-src');

  // Sem lote não há ATA: o botão avisa em vez de baixar arquivo vazio.
  const vazio = montarApp();
  vazio.doc.querySelector('#download-ata-word').click();
  await vazio.esperar();
  eq(vazio.baixados.length, 0, 'sem lote não gera documento');
  ok(vazio.doc.querySelector('#toast').textContent.includes('Importe um lote'), 'e diz o que fazer');
}

// ================================================= 7e. baixar a ATA em Excel
// Mesmo botão de sempre ao lado de Imprimir / PDF e Baixar Word, mesma lista de
// alunos que celulasDaAta já entrega para o Word — só muda o formato do arquivo.
{
  const { doc, app, subirLote, escritos, esperar } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A], [ARQUIVO_B, TURMA_B]]);
  app.switchView('minutes');

  doc.querySelector('#download-ata-excel').click();
  await esperar();   // a biblioteca de cor é carregada sob demanda: o botão é assíncrono

  eq(escritos.length, 1, 'gera um arquivo');
  const nomeEsperado = `ata-${TURMA_A_NOME.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}.xlsx`;
  eq(escritos[0].nome, nomeEsperado, 'com o nome da turma e extensão xlsx');
  eq(escritos[0].linhas[0].length, 7, 'sete colunas, como a ATA em Word');
  eq(escritos[0].linhas[0][0], 'Aluno', 'primeira coluna é o aluno');
  const semCabecalho = escritos[0].linhas.slice(1);
  ok(semCabecalho.some(l => l[0] === 'ALUNA COM TRES PENDENCIAS'), 'traz os alunos da turma selecionada');
  ok(!semCabecalho.some(l => l[0] === 'ALUNA DA OUTRA TURMA'), 'e não os de outra turma');
  // Cor o Excel não leva — o SheetJS publicado não formata célula —, mas o traço
  // do bimestre é conteúdo e tem que chegar igual nas três saídas.
  eq(semCabecalho.filter(l => l[6] === app.NO_RECOVERY).every(l => l[5] === '-'), true, 'quem não recuperou sai com traço no bimestre');

  // Cor na planilha, mesma regra da tela e do Word. O ARGB do Excel é FF na
  // frente do hexadecimal, e a célula guarda a cor em s.font.color.rgb.
  const planilhaAta = escritos[0].sheet;
  const corDe = (r, c) => planilhaAta[`${String.fromCharCode(65 + c)}${r + 1}`].s?.font?.color?.rgb;
  // A busca é pela disciplina: o nome do aluno agora sai só na primeira linha
  // do bloco, e as seguintes vêm vazias porque a célula é mesclada.
  const linhaDe = (disciplina) => escritos[0].linhas.findIndex(l => l[1] === disciplina);
  const tresPendencias = linhaDe('MATEMÁTICA');
  ok(tresPendencias > 0, 'a aluna com nota abaixo de 5 está na planilha');
  eq(escritos[0].linhas[tresPendencias][0], 'ALUNA COM TRES PENDENCIAS', 'com o nome na primeira linha do bloco');
  eq(corDe(tresPendencias, 2), 'FFC0392B', 'nota do primeiro bimestre abaixo de 5 sai em vermelho no Excel');
  eq(corDe(tresPendencias, 6), undefined, 'desfecho ainda em branco não ganha cor');
  eq(planilhaAta.A1.s.font.bold, true, 'o cabeçalho sai em negrito');
  eq(corDe(0, 6), undefined, 'e sem cor, como no Word');
  eq(corDe(tresPendencias, 0), undefined, 'nome de aluno nunca ganha cor');
  const alinhamentoEm = (r, c) => planilhaAta[`${String.fromCharCode(65 + c)}${r + 1}`].s?.alignment?.horizontal;
  eq(alinhamentoEm(tresPendencias, 2), 'center', 'a nota sai centralizada no Excel');
  eq(alinhamentoEm(0, 4), 'center', 'o cabeçalho da coluna de nota acompanha');
  eq(alinhamentoEm(tresPendencias, 0), undefined, 'e o nome do aluno não');
  // Vertical, sim: sem isso o nome desce para a última linha do bloco mesclado.
  eq(planilhaAta[`A${tresPendencias + 1}`].s.alignment.vertical, 'center', 'o nome fica no meio do bloco mesclado no Excel');
  eq(planilhaAta.A1.s.alignment, undefined, 'o cabeçalho não precisa: não é mesclado');

  // Nome uma vez por bloco: a aluna com três componentes ocupa três linhas, o
  // nome fica só na primeira e a coluna A é mesclada nas três.
  // Comparado como texto de propósito: o array vem do realm do jsdom, e
  // deepStrictEqual compara protótipo antes de conteúdo.
  const nomesDoBloco = escritos[0].linhas.slice(tresPendencias, tresPendencias + 3).map(l => l[0]).join('|');
  eq(nomesDoBloco, 'ALUNA COM TRES PENDENCIAS||', 'o nome sai uma vez e as linhas seguintes vêm vazias');
  // tresPendencias é o índice na lista com cabeçalho, que é o mesmo número da
  // linha 0-based do SheetJS: cabeçalho em 0, primeira linha de dado em 1.
  const mesclagem = planilhaAta['!merges'].find(m => m.s.r === tresPendencias);
  ok(mesclagem, 'a coluna A é mesclada no bloco da aluna');
  eq(`${mesclagem.s.c}-${mesclagem.e.c}`, '0-0', 'a mesclagem é só da coluna do aluno');
  eq(mesclagem.e.r - mesclagem.s.r + 1, 3, 'e cobre as três linhas do bloco');
  ok(!planilhaAta['!merges'].some(m => m.e.r === m.s.r), 'aluno de um componente só não gera mesclagem');
  eq(planilhaAta['!cols'].length, 7, 'as sete colunas têm largura definida');
  ok(planilhaAta['!cols'][0].wch > planilhaAta['!cols'][2].wch, 'a coluna do aluno é mais larga que a de nota');

  // Desfecho colorido precisa de nota lançada, que só chega com o Mapão
  // pós-recuperação: verde em quem recuperou, vermelho em quem não.
  const comDesfecho = montarApp();
  await comDesfecho.subirLote([[ARQUIVO_A, TURMA_A]]);
  await comDesfecho.subirPos([[ARQUIVO_A, TURMA_A_POS]]);
  comDesfecho.app.switchView('minutes');
  comDesfecho.doc.querySelector('#download-ata-excel').click();
  await comDesfecho.esperar();
  const baixada = comDesfecho.escritos[comDesfecho.escritos.length - 1];
  const corNaLinha = (disciplina, coluna) => {
    const r = baixada.linhas.findIndex(l => l[1] === disciplina);
    return baixada.sheet[`${String.fromCharCode(65 + coluna)}${r + 1}`].s?.font?.color?.rgb;
  };
  eq(corNaLinha('MATEMÁTICA', 6), 'FF1E8449', 'Recuperou sai em verde no Excel');
  eq(corNaLinha('MATEMÁTICA', 4), 'FF1E8449', 'e a nota 7 da recuperação junto');
  eq(corNaLinha('HISTÓRIA', 6), 'FFC0392B', 'Não recuperou sai em vermelho no Excel');

  // Rede da escola barrando o CDN da cor: a ATA sai igual, sem cor, e o aviso diz.
  const semCor = montarApp({ cdnDeCorBloqueada: true });
  await semCor.subirLote([[ARQUIVO_A, TURMA_A]]);
  semCor.app.switchView('minutes');
  semCor.doc.querySelector('#download-ata-excel').click();
  await semCor.esperar();
  eq(semCor.escritos.length, 1, 'a planilha sai mesmo sem a biblioteca de cor');
  eq(semCor.escritos[0].linhas[0].length, 7, 'com as mesmas sete colunas');
  ok(!semCor.escritos[0].sheet.A1.s, 'nenhuma célula sai estilizada');
  ok(semCor.doc.querySelector('#toast').textContent.includes('sem cor'), 'e o aviso conta por quê');

  // Sem lote não há ATA: o botão avisa em vez de baixar arquivo vazio.
  const vazio = montarApp();
  vazio.doc.querySelector('#download-ata-excel').click();
  await vazio.esperar();
  eq(vazio.escritos.length, 0, 'sem lote não gera arquivo');
  ok(vazio.doc.querySelector('#toast').textContent.includes('Importe um lote'), 'e diz o que fazer');
}

// ==================================== 7f. notas abaixo de 5 em vermelho, Recuperou em verde
// Cor entra na ATA — tela, impressão e Word — não na lista de recuperação da
// tela, que já tinha a própria cor (low-score, em laranja) antes desta mudança.
{
  const { doc, app, subirLote, subirPos, impressos } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  await subirPos([[ARQUIVO_A, TURMA_A_POS]]);
  app.switchView('minutes');
  doc.querySelector('#generate-minutes').click();
  app.renderAta(TURMA_A_NOME);

  const paper = doc.querySelector('.paper-table').innerHTML;
  ok(paper.includes('class="nota-baixa nota-centro">3<'), 'nota do primeiro bimestre abaixo de 5 sai em vermelho na tela, e centralizada');
  ok(paper.includes('class="nota-baixa nota-centro">4<'), 'nota de recuperação abaixo de 5 (quem não recuperou) também sai em vermelho');
  ok(paper.includes('class="nota-recuperou">Recuperou<'), 'quem recuperou sai em verde');
  ok(!/class="nota-baixa">Recuperou</.test(paper), 'Recuperou nunca sai como nota baixa');
  ok(paper.includes('class="nota-recuperou nota-centro">7<'), 'nota de recuperação a partir de 5 sai em verde');
  ok(paper.includes(`class="nota-baixa">${app.NO_RECOVERY}<`), 'Não recuperou sai em vermelho');
  // Quem não recuperou não substitui bimestre nenhum: traço, não lacuna a preencher.
  ok(paper.includes('class="nota-centro">-</span>'), 'o bimestre de quem não recuperou sai com traço, centralizado');
  ok(paper.includes('class="nota-centro">1º bimestre</span>'), 'e quem recuperou continua mostrando o bimestre substituído, centralizado');
  eq((paper.match(/class="nota-centro">-<\/span>/g) || []).length, 2, 'os dois que não recuperaram saem com traço, inclusive o que tinha bimestre sugerido pelo Mapão');

  // A aluna com três componentes: o nome aparece uma vez, e as duas células
  // seguintes ficam vazias e sem borda de baixo, que é o que dá o efeito de
  // célula mesclada numa grade de CSS.
  eq((paper.match(/ALUNA COM TRES PENDENCIAS/g) || []).length, 1, 'o nome do aluno aparece uma vez só, mesmo com três componentes');
  ok(paper.includes('<span class="aluno" style="grid-row:span 3">ALUNA COM TRES PENDENCIAS</span>'),
    'a célula do aluno ocupa as três linhas do bloco, e o nome é centralizado nela pelo CSS');
  ok(!/<span class="aluno[^"]*"><\/span>/.test(paper), 'não sobra célula vazia: a mesclagem é de verdade');
  ok(paper.includes('<span class="aluno" style="grid-row:span 1">ALUNO COM UMA PENDENCIA</span>'), 'quem tem um componente só ocupa uma linha');


  // A janela de impressão não carrega o styles.css: as duas regras têm que ir
  // no <style> que printAta escreve, senão a cor não aparece no PDF impresso.
  doc.querySelector('#print-ata').click();
  const impresso = impressos[impressos.length - 1];
  ok(impresso.includes('.nota-baixa{color:#c0392b'), 'a impressão carrega a cor de nota baixa');
  ok(impresso.includes('.nota-recuperou{color:#1e8449'), 'e a cor de quem recuperou');
  ok(impresso.includes('.nota-centro{text-align:center'), 'e o alinhamento das notas: a janela de impressão não carrega o styles.css');
  ok(impresso.includes('class="nota-baixa nota-centro">3<'), 'com as duas classes no HTML colado');
  ok(impresso.includes('.aluno{white-space:nowrap'), 'o nome do aluno não quebra linha na impressão');
  ok(impresso.includes('.aluno{white-space:nowrap;overflow:visible;display:flex;align-items:center}'), 'e o nome fica no meio do bloco mesclado');
  ok(impresso.includes('grid-template-columns:minmax(max-content,2.6fr)'), 'a grade da impressão é a mesma da tela');

  // A tela lê o styles.css e a impressão lê o <style> que printAta monta. São
  // duas cópias das mesmas regras, e é fácil corrigir uma e esquecer a outra.
  const css = readFileSync(new URL('styles.css', raiz), 'utf8');
  ok(css.includes('.paper-table .aluno{white-space:nowrap;overflow:visible;display:flex;align-items:center}'),
    'o styles.css tem a mesma regra do nome que a impressão');
  ok(css.includes('grid-template-columns:minmax(max-content,2.6fr)'), 'e a mesma grade');
  ok(impresso.includes('class="nota-recuperou">Recuperou<'), 'e o HTML colado carrega as classes, não só o CSS');
}

// ===================================================================== 8. limites
{
  const { doc, app, subirLote } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  const antes = app.recoveryData.length;

  const gigante = [{ escola: '', records: Array.from({ length: 2001 }, (_, i) => ({ aluno: `ALUNO DE TESTE ${i}`, turma: '6° ANO A', disciplina: 'MATEMATICA', bimestre: '1º', nota: 3 })) }];
  app.importBatch(gigante);
  eq(app.recoveryData.length, antes, 'lote acima de 2.000 registros é recusado');
  ok(doc.querySelector('#toast').textContent.includes('excede o limite'), 'e avisa na tela');

  assert.throws(() => app.validateUploadSelection(Array.from({ length: 51 }, () => ({ size: 10 }))), /50 arquivos/, 'mais de 50 arquivos é recusado');
  checks++;
  assert.throws(() => app.validateUploadSelection([{ size: 16 * 1024 * 1024 }]), /15 MB/, 'arquivo acima de 15 MB é recusado');
  checks++;
  assert.doesNotThrow(() => app.validateUploadSelection([{ size: 1024 }]), 'arquivo normal passa');
  checks++;
}

// ============================================ 9. nome de aluno com HTML é escapado
{
  const { doc, app, subirLote } = montarApp();
  const malicioso = [
    ['ALUNO', 'SITUAÇÃO', 'MATEMATICA (1B)'],
    ['<img src=x onerror=alert(1)> NOME DO ALUNO', 'Ativo', '3'],
  ];
  await subirLote([[ARQUIVO_A, malicioso]]);
  app.switchView('recovery');

  ok(!doc.querySelector('#recovery-table img'), 'a marcação não vira elemento na tabela');
  ok(doc.querySelector('#recovery-table td strong').textContent.includes('onerror'), 'e o texto é preservado como texto');

  app.renderAta(TURMA_A_NOME);
  ok(!doc.querySelector('.paper-table img'), 'nem na ATA');

  doc.querySelector('#export-recovery').click();
  ok(true, 'e a exportação não quebra com o nome');
}

// ================================================================ 10. Apagar dados
{
  const { window, doc, app, subirLote } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  ok(app.recoveryData.length > 0, 'há dados antes');
  doc.querySelector('#clear-session').click();
  eq(app.recoveryData.length, 0, 'a lista é zerada');
  eq(window.localStorage.getItem(app.STORAGE_KEY), null, 'e o localStorage é apagado');
  eq(doc.querySelector('#school-name').value, '', 'o nome da escola também sai');
}

// ==================================== 11. arquivo ilegível não derruba o lote todo
{
  const { doc, app, subirLote, errosDeConsole } = montarApp();
  const semCabecalho = [['QUALQUER COISA', 'OUTRA'], ['1', '2']];
  await subirLote([
    [ARQUIVO_A, TURMA_A],
    ['Mapao_Quebrado.xlsx', semCabecalho],
  ]);
  eq(app.recoveryData.length, 4, 'o arquivo bom continua sendo processado');
  ok(doc.querySelector('#toast').textContent.includes('ignorados por erro'), 'e o app avisa quantos falharam');
  ok(errosDeConsole.some(e => e.includes('ALUNO não encontrado')), 'e registra no console qual arquivo falhou');
}

// =================== 12. nome da escola digitado à mão também é normalizado
// O Mapão consolidado não traz a escola, então digitar é o caminho normal.
// Sem normalizar aqui, o título honorífico ia cru para a ATA.
{
  const { window, doc, app, subirLote } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  const campo = doc.querySelector('#school-name');

  // Enquanto digita, o texto é preservado como está.
  campo.value = 'Waldomiro Sampaio de Souza Prefeito';
  campo.dispatchEvent(new window.Event('input', { bubbles: true }));
  eq(app.schoolName, 'Waldomiro Sampaio de Souza Prefeito', 'digitando, o texto não é mexido');

  // Ao sair do campo, vira o formato da ATA.
  campo.dispatchEvent(new window.Event('change', { bubbles: true }));
  eq(campo.value, 'PREF. WALDOMIRO SAMPAIO DE SOUZA', 'ao sair do campo, o nome é normalizado');
  eq(app.schoolName, 'PREF. WALDOMIRO SAMPAIO DE SOUZA', 'e o estado acompanha');

  app.renderAta(TURMA_A_NOME);
  const cabecalho = doc.querySelector('.paper-center').textContent;
  ok(cabecalho.includes('E.E. “PREF. WALDOMIRO SAMPAIO DE SOUZA”'), 'e a ATA sai com o nome certo');
  ok(!cabecalho.includes('Souza Prefeito'), 'sem o título honorífico no fim');

  // Nome já correto não é mexido de novo.
  campo.dispatchEvent(new window.Event('change', { bubbles: true }));
  eq(campo.value, 'PREF. WALDOMIRO SAMPAIO DE SOUZA', 'normalizar duas vezes não altera');
}

// ================== 13. SheetJS bloqueado avisa a causa certa
// O leitor de planilha vem de CDN e rede de escola às vezes bloqueia. A
// mensagem antiga era "arquivos ignorados por erro", que culpa a planilha.
{
  const { window, doc, app, subirLote } = montarApp();
  const real = window.XLSX;
  delete window.XLSX;
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  const aviso = doc.querySelector('#toast').textContent;
  ok(aviso.includes('não carregou'), `devia culpar a conexão, veio: ${aviso}`);
  ok(!aviso.includes('ignorados por erro'), 'não pode culpar a planilha de quem usa');
  eq(app.recoveryData.length, 0, 'e nada é importado');
  window.XLSX = real;
}

// ============================== 14. a data do topo é a de hoje
// Era fixa no HTML e envelhecia sozinha.
{
  const { doc } = montarApp();
  const texto = doc.querySelector('#hoje').textContent;
  const agora = new Date();
  const esperado = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/ de /g, ' ');
  eq(texto, esperado.charAt(0).toUpperCase() + esperado.slice(1), 'a data do topo é gerada, não escrita à mão');
  ok(!texto.includes('16 julho 2026'), 'não sobrou a data fixa do HTML');
}

// ============================ 15. o uso normal não escreve nada no console
// Erro ou aviso inesperado no console é sintoma; aqui vira falha de teste.
{
  const { doc, app, subirLote, errosDeConsole } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  app.switchView('recovery');
  app.switchView('minutes');
  doc.querySelector('#generate-minutes').click();
  app.renderAta(TURMA_A_NOME);
  doc.querySelector('#print-ata').click();
  doc.querySelector('#export-recovery').click();
  doc.querySelector('#clear-session').click();
  eq(errosDeConsole, [], 'nenhum erro ou aviso de console no caminho normal');
}

// ================================ importação do Mapão pós-recuperação
// A nota da recuperação semestral voltou dentro do Mapão, sobrescrevendo a
// célula do bimestre. Aqui o app opera como a coordenação opera: sobe o lote
// dos dois bimestres, sobe o Mapão novo, lê o resumo e decide.

// ------------------------------------------------- sem lote, não há o que comparar
{
  const { doc, app } = montarApp();
  app.switchView('recovery');
  doc.querySelector('#import-pos').click();
  ok(doc.querySelector('#toast').textContent.includes('Importe primeiro os Mapões'),
     'sem lote na tela o botão recusa e explica o que falta');
  eq(app.recoveryData.length, 0, 'e nada entra');
}

// -------------------------------------------------------- Cancelar não toca em nada
{
  const { app, subirLote, subirPos } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  const antes = app.recoveryData.map(r => r.join('|'));
  const { aberto, resumo } = await subirPos([[ARQUIVO_A, TURMA_A_POS]], 'confirm-cancel');
  ok(aberto, 'o resumo aparece antes de aplicar');
  ok(/2 linhas preenchidas/.test(resumo), 'e diz quantas linhas seriam preenchidas');
  ok(/1 não recuperou/.test(resumo), 'quantas não recuperaram');
  ok(/1 divergência/.test(resumo), 'e quantas ele não conseguiu decidir');
  eq(app.recoveryData.map(r => r.join('|')), antes, 'Cancelar deixa a lista exatamente como estava');
}

// --------------------------------------------------------------- Aplicar preenche
{
  const { doc, app, subirLote, subirPos, escritos } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  app.switchView('recovery');
  await subirPos([[ARQUIVO_A, TURMA_A_POS]]);

  const linha = (aluno, disciplina) => app.recoveryData.find(r => r[0] === aluno && r[2] === disciplina);

  const recuperou = linha('ALUNA COM TRES PENDENCIAS', 'MATEMÁTICA');
  eq([recuperou[5], recuperou[6]], ['7', '1º bimestre'], 'a nota que subiu vira nota de recuperação, no bimestre que mudou');
  eq(app.desfecho(recuperou), 'Recuperou', 'e alcançou a média');

  const parada = linha('ALUNA COM TRES PENDENCIAS', 'HISTÓRIA');
  eq([parada[5], parada[6]], [app.NO_RECOVERY, ''], 'nota igual nos dois bimestres é Não recuperou');
  eq(parada[7], 'Concluído', 'e a linha fica resolvida, não pendente');

  // Reimportar o mesmo Mapão não pode devolver um bimestre fantasma para quem já
  // ficou Não recuperou: combineRecords sempre sugere um bimestre para linha
  // nova, e mergeRows tinha que ignorar essa sugestão quando a nota já é sem nota.
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  const paradaDepoisDeReimportar = linha('ALUNA COM TRES PENDENCIAS', 'HISTÓRIA');
  eq([paradaDepoisDeReimportar[5], paradaDepoisDeReimportar[6]], [app.NO_RECOVERY, ''], 'reimportar o Mapão não traz bimestre de volta');

  const subiuPouco = linha('ALUNO COM UMA PENDENCIA', 'MATEMÁTICA');
  eq(subiuPouco[5], '4', 'nota abaixo de 5 também é nota de recuperação');
  eq(app.desfecho(subiuPouco), app.NO_RECOVERY, 'o desfecho responde se alcançou 5,0, não se mudou');

  const divergente = linha('ALUNA COM TRES PENDENCIAS', 'GEOGRAFIA');
  eq(divergente[5], '—', 'nota que caiu não é aplicada sozinha');
  eq(doc.querySelectorAll('#recovery-table tr.divergente').length, 1, 'e a linha fica destacada para decisão à mão');
  ok(/a nota caiu/.test(doc.querySelector('#recovery-table tr.divergente').title), 'e a linha diz por que ficou de fora');

  // A tela mostra a coluna nova, e ela é célula própria.
  const cabecalho = [...doc.querySelectorAll('#recovery-view thead th')].map(th => th.textContent);
  ok(cabecalho.includes('Desfecho'), 'a lista tem coluna de desfecho');
  const celulas = [...doc.querySelectorAll('#recovery-table tr')].map(tr => [...tr.children].map(td => td.textContent));
  eq(celulas[0].length, cabecalho.length, 'linha e cabeçalho com a mesma largura');
  ok(celulas.some(c => c.includes('Recuperou')), 'e o desfecho aparece na tela');

  // O Excel exportado leva a mesma coluna, e continua terminando em Status.
  doc.querySelector('#export-recovery').click();
  const planilha = escritos[escritos.length - 1].linhas;
  eq(planilha[0].slice(-2).join('|'), 'Desfecho|Status', 'o Excel ganha Desfecho antes de Status');
  eq(planilha[0].length, planilha[1].length, 'cabeçalho e linha com a mesma largura');
}

// ----------------------------------- Não recuperou escolhido à mão sobrevive
// O PR 19 pôs Não realizou no dropdown e o PR 20 descobriu que ele não
// funcionava: validateRecoveryScore roda em fase de captura e rejeitava tudo
// que não fosse número. É o mesmo caminho que a opção nova precisa atravessar.
{
  const { window, doc, app, subirLote } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  app.switchView('recovery');

  const alvo = app.recoveryData.findIndex(r => r[0] === 'ALUNO COM UMA PENDENCIA');
  const sel = doc.querySelector(`select.score-input[data-index="${alvo}"]`);
  ok([...sel.options].some(o => o.value === app.NO_RECOVERY), 'a opção existe no dropdown');
  sel.value = app.NO_RECOVERY;
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0));

  const linha = app.recoveryData[alvo];
  eq(linha[5], app.NO_RECOVERY, 'o valor sobrevive ao validador');
  eq(linha[6], '', 'sem bimestre a substituir');
  eq(linha[7], 'Concluído', 'e a linha fecha');
  eq(doc.querySelectorAll('select.replacement-select[disabled]').length, 1, 'o seletor de bimestre é desabilitado');
  ok(!doc.querySelector('#confirm-modal').classList.contains('open'), 'e não propaga para as outras disciplinas: recuperação é por componente');
}

// ------------------------------------------------ a coluna nova chega na ATA em Word
{
  const { doc, app, subirLote, subirPos, baixados, textoDoDocumento, esperar } = montarApp();
  await subirLote([[ARQUIVO_A, TURMA_A]]);
  await subirPos([[ARQUIVO_A, TURMA_A_POS]]);
  app.switchView('minutes');
  doc.querySelector('#generate-minutes').click();
  app.renderAta(TURMA_A_NOME);
  doc.querySelector('#download-ata-word').click();
  await esperar();

  const texto = textoDoDocumento(baixados[baixados.length - 1].doc);
  ok(/(Aos \d{1,2} dias|Ao primeiro dia) do mês de \p{L}+ de dois mil/u.test(texto), 'o Word também traz a data do dia');
  ok(texto.includes('procedeu-se ao registro dos resultados da Recuperação Semestral'), 'a abertura do Word é a mesma da tela');
  ok(texto.includes('período de 03 a 07 de agosto de 2026'), 'com o período das avaliações');
  ok(texto.includes('Professores:'), 'e o bloco de assinatura dos professores');
  // Exatamente 18 traços: as linhas de Coordenação e Direção têm 20, e um
  // split ingênuo contaria as duas junto.
  eq((texto.match(/(?<!_)_{18}(?!_)/g) || []).length, app.PROFESSORES.length, 'uma linha por professor do quadro');
  ok(app.PROFESSORES.every(nome => texto.includes(nome)), 'e todos os nomes saem no Word');
  ok(texto.includes('Coordenação'), 'Coordenação e Direção seguem assinando');
  ok(texto.includes('Desfecho'), 'a ATA em Word tem a coluna de desfecho');
  ok(texto.includes('Recuperou'), 'com quem alcançou a média');
  ok(texto.includes('Não recuperou'), 'e quem não alcançou');

  // Cor no Word é a mesma da tela e da impressão: nota abaixo de 5 em vermelho,
  // Recuperou em verde. O dublê guarda tipo e opções de cada TextRun, então dá
  // para conferir a cor sem depender do formato OOXML de verdade.
  const coletarTextRuns = (no, saida = []) => {
    if (no == null) return saida;
    if (Array.isArray(no)) { no.forEach(item => coletarTextRuns(item, saida)); return saida; }
    if (typeof no === 'object') {
      if (no.tipo === 'TextRun') saida.push(no.opcoes);
      Object.values(no).forEach(valor => coletarTextRuns(valor, saida));
    }
    return saida;
  };
  const runs = coletarTextRuns(baixados[baixados.length - 1].doc);
  const notaBaixaNoWord = runs.find(r => r.text === '4');
  ok(notaBaixaNoWord && notaBaixaNoWord.color === 'C0392B', 'nota de recuperação abaixo de 5 sai em vermelho no Word');
  const recuperouNoWord = runs.find(r => r.text === 'Recuperou');
  ok(recuperouNoWord && recuperouNoWord.color === '1E8449', 'e Recuperou sai em verde no Word');
  const notaAltaNoWord = runs.find(r => r.text === '7');
  ok(notaAltaNoWord && notaAltaNoWord.color === '1E8449', 'nota a partir de 5 sai em verde no Word');
  const naoRecuperouNoWord = runs.filter(r => r.text === app.NO_RECOVERY);
  ok(naoRecuperouNoWord.length && naoRecuperouNoWord.every(r => r.color === 'C0392B'), 'e Não recuperou sai em vermelho no Word, na coluna de nota e na de desfecho');
  ok(runs.some(r => r.text === '-' && r.color === undefined), 'o traço do bimestre não recuperado fica sem cor');
  const cabecalhoNoWord = runs.find(r => r.text === 'Aluno');
  ok(cabecalhoNoWord && cabecalhoNoWord.color === undefined, 'o cabeçalho da tabela não ganha cor');

  // Centralização é do parágrafo, não do TextRun: a célula de nota da tabela
  // carrega alignment CENTER, e a de aluno não carrega nada.
  const celulasDaTabela = (no, saida = []) => {
    if (no == null) return saida;
    if (Array.isArray(no)) { no.forEach(item => celulasDaTabela(item, saida)); return saida; }
    if (typeof no === 'object') {
      if (no.tipo === 'TableCell') saida.push(no.opcoes);
      Object.values(no).forEach(valor => celulasDaTabela(valor, saida));
    }
    return saida;
  };
  const textoDaCelula = (celula) => celula.children?.[0]?.opcoes?.children?.[0]?.opcoes?.text;
  const alinhamentoDe = (texto) => {
    const celula = celulasDaTabela(baixados[baixados.length - 1].doc).find(c => textoDaCelula(c) === texto);
    return celula?.children?.[0]?.opcoes?.alignment;
  };
  eq(alinhamentoDe('7'), 'center', 'a nota sai centralizada no Word');
  eq(alinhamentoDe('ALUNA COM TRES PENDENCIAS'), undefined, 'o nome do aluno não');
  eq(alinhamentoDe('Recuperou'), undefined, 'o desfecho também não');
  eq(alinhamentoDe('Nota da recuperação semestral'), 'center', 'e o cabeçalho da coluna de nota acompanha');

  // Mesclagem vertical no Word: a primeira célula do bloco é RESTART e leva o
  // nome; as seguintes são CONTINUE e vão vazias. O Word junta as três.
  const celulas = celulasDaTabela(baixados[baixados.length - 1].doc);
  const daAluna = celulas.filter(c => c.verticalMerge);
  const restart = daAluna.filter(c => c.verticalMerge === 'restart');
  const continua = daAluna.filter(c => c.verticalMerge === 'continue');
  ok(restart.length >= 1, 'há bloco começando com RESTART');
  eq(restart.length + continua.length, daAluna.length, 'toda célula de aluno é RESTART ou CONTINUE');
  ok(restart.every(c => textoDaCelula(c) !== ''), 'a célula que abre o bloco leva o nome');
  ok(continua.every(c => textoDaCelula(c) === ''), 'e as que continuam vão vazias');
  eq(continua.length, 2, 'a aluna com três componentes gera duas continuações');
  ok(restart.every(c => c.verticalAlign === 'center'), 'o nome fica no meio do bloco mesclado');
  ok(!celulas.filter(c => textoDaCelula(c) === 'Aluno').some(c => c.verticalMerge), 'o cabeçalho não entra na mesclagem');

  // Larguras: a tabela declara as sete colunas, e a do aluno é a mais larga.
  const tabelaDoWord = baixados[baixados.length - 1].doc.opcoes.sections[0].children.find(f => f.tipo === 'Table');
  eq(tabelaDoWord.opcoes.columnWidths.length, 7, 'sete larguras declaradas');
  ok(tabelaDoWord.opcoes.columnWidths[0] > tabelaDoWord.opcoes.columnWidths[2], 'a coluna do aluno é mais larga que a de nota');
}

console.log(`ok — ${checks} verificações de comportamento`);
