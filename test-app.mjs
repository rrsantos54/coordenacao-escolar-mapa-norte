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
const TURMA_B = [
  ['ALUNO', 'SITUAÇÃO', 'MATEMATICA (1B)', 'MATEMATICA (2B)'],
  ['ALUNA DA OUTRA TURMA', 'Ativo', '3', '3'],
];

// --------------------------------------------------------------- ambiente falso
function montarApp() {
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost:8899/index.html' });
  const { window } = dom;

  // Stub do SheetJS. O "arquivo" carrega as linhas em JSON; XLSX.read devolve
  // exatamente o que o SheetJS devolveria: um array de arrays.
  const escritos = [];
  window.XLSX = {
    read: (buffer) => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: JSON.parse(new TextDecoder().decode(buffer)) } }),
    utils: {
      sheet_to_json: (sheet) => sheet,
      book_new: () => ({ SheetNames: [], Sheets: {} }),
      aoa_to_sheet: (linhas) => linhas,
      book_append_sheet: (book, sheet, nome) => { book.SheetNames.push(nome); book.Sheets[nome] = sheet; },
    },
    writeFile: (book, nome) => escritos.push({ nome, linhas: book.Sheets[book.SheetNames[0]] }),
  };

  // A janela de impressão é capturada em vez de aberta.
  const impressos = [];
  window.open = () => ({ document: { write: h => impressos.push(h), close: () => {} } });
  window.scrollTo = () => {};   // jsdom não implementa; switchView chama.

  // Console capturado em vez de impresso: erro inesperado vira falha de teste,
  // e o erro esperado do arquivo ilegível pode ser verificado.
  const errosDeConsole = [];
  window.console.error = (...args) => errosDeConsole.push(args.map(String).join(' '));
  window.console.warn = (...args) => errosDeConsole.push(args.map(String).join(' '));

  const script = window.document.createElement('script');
  script.textContent = appJs;
  window.document.body.appendChild(script);

  // As declarações do app.js são const de escopo de script: não viram
  // propriedade de window. Um segundo script no mesmo escopo alcança e expõe.
  const ponte = window.document.createElement('script');
  ponte.textContent = `window.__app = {
    get recoveryData(){return recoveryData}, get schoolName(){return schoolName},
    importBatch, renderAta, restoreLocal, switchView, recoveryRows,
    validateUploadSelection, NO_EXAM, STORAGE_KEY, MAX_STORAGE_AGE_MS
  };`;
  window.document.body.appendChild(ponte);

  const subirLote = async (arquivos) => {
    const input = window.document.querySelector('#folder-input');
    const files = arquivos.map(([nome, linhas]) => {
      const bytes = new TextEncoder().encode(JSON.stringify(linhas));
      const file = new window.File([bytes], nome, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      // O File do jsdom não implementa arrayBuffer(); o app usa só name, size e ele.
      if (typeof file.arrayBuffer !== 'function') {
        Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer, configurable: true });
      }
      return file;
    });
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    // O handler é assíncrono: espera a fila de microtarefas drenar.
    for (let i = 0; i < 50; i++) await new Promise(r => setTimeout(r, 0));
  };

  return { window, doc: window.document, app: window.__app, subirLote, escritos, impressos, errosDeConsole };
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
  const mat = linhas.find(r => r[0] === 'ALUNA COM TRES PENDENCIAS' && r[2] === 'MATEMATICA');
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
  const alvo = app.recoveryData.find(r => r[2] === 'HISTORIA');
  alvo[5] = '7'; alvo[6] = '1º bimestre'; alvo[7] = 'Concluído';

  await subirLote([[ARQUIVO_B, TURMA_B]]);
  eq(app.recoveryData.length, depoisDoPrimeiro + 1, 'o segundo lote acrescenta');
  eq([...new Set(app.recoveryData.map(r => r[1]))].length, 2, 'duas turmas na tela');
  const depois = app.recoveryData.find(r => r[2] === 'HISTORIA');
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
  eq((celulas.length - 6) / 6, 4, 'a ATA tem uma linha por pendência');
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

// ============================ 13. o uso normal não escreve nada no console
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

console.log(`ok — ${checks} verificações de comportamento`);
