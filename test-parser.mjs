// Testes do parser do Mapão. Roda com: node test-parser.mjs
//
// Lê as declarações direto do app.js publicado, para o teste não virar uma
// segunda cópia das regras que envelhece sozinha. A costura é o array de linhas
// que o SheetJS entrega, então nada aqui precisa de XLSX nem de navegador.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const grab = re => {
  const found = source.match(re);
  if (!found) throw new Error(`não achei no app.js: ${re}`);
  return found[0];
};

const PUROS = [
  /const NO_EXAM='[^']*';/,
  /^function normal\(v\).*$/m,
  /^const SCHOOL_TITLES=.*$/m,
  /^function normalizeSchoolName\(name\).*$/m,
  /^function cleanSubject\(v\).*$/m,
  /^function cleanClassName\(v\).*$/m,
  /^const TURMA_RE=.*$/m,
  /^const TURMA_NOME_RE=.*$/m,
  /^const TRANSFER_RE=.*$/m,
  /^function droppedStudents\(rows\).*$/m,
  /^const SEM_PROVA_RECUPERACAO=.*$/m,
  /^function temProvaDeRecuperacao\(disciplina\).*$/m,
  /^function subjectPeriod\(v,fallback\).*$/m,
  /^function findTurma\(rows,fileName\).*$/m,
  /^function bimester\(name,metadata=\[\]\).*$/m,
  /^function parseNumber\(v\).*$/m,
  /^function parseSheet\(rows,fileName\).*$/m,
  /^const SCHOOL_LABELS=.*$/m,
  /^function detectSchool\(rows\).*$/m,
  /^function keepRecords\(records,rows\).*$/m,
  /^function combineRecords\(records\).*$/m,
  /^function rowStatus\(row\).*$/m,
  /^function mergeRows\(previous,incoming\).*$/m,
];

const EXPORTA = [
  'normalizeSchoolName', 'cleanClassName', 'cleanSubject', 'TURMA_RE', 'TURMA_NOME_RE',
  'droppedStudents', 'temProvaDeRecuperacao', 'parseSheet', 'detectSchool',
  'keepRecords', 'combineRecords', 'mergeRows', 'bimester', 'parseNumber', 'rowStatus',
];

const modulo = PUROS.map(grab).join('\n') + `\nexport { ${EXPORTA.join(', ')} };`;
const api = await import('data:text/javascript,' + encodeURIComponent(modulo));
const {
  normalizeSchoolName, cleanClassName, cleanSubject, TURMA_RE, TURMA_NOME_RE,
  droppedStudents, temProvaDeRecuperacao, parseSheet, detectSchool,
  keepRecords, combineRecords, mergeRows, bimester, parseNumber, rowStatus,
} = api;

let checks = 0;
const eq = (real, esperado, msg) => { checks++; assert.deepEqual(real, esperado, msg); };
const ok = (cond, msg) => { checks++; assert.ok(cond, msg); };

// ---------------------------------------------------------------- nome da escola
{
  const casos = [
    // O caso real que motivou a correção: Mapão da E.E. de Sagres.
    ['Waldomiro Sampaio de Souza Prefeito', 'PREF. WALDOMIRO SAMPAIO DE SOUZA'],
    ['WALDOMIRO SAMPAIO DE SOUZA PREFEITO', 'PREF. WALDOMIRO SAMPAIO DE SOUZA'],
    ['Maria Aparecida Lima Professora', 'PROFA. MARIA APARECIDA LIMA'],
    ['João Batista Doutor', 'DR. JOÃO BATISTA'],
    // Acento sobrevive ao uppercase, inclusive no título com til.
    ['Antônio Carlos Capitão', 'CAP. ANTÔNIO CARLOS'],
    ['Conceição Aparecida Professora', 'PROFA. CONCEIÇÃO APARECIDA'],
    // Sem título honorífico no fim: só sobe para caixa alta.
    ['Jardim Paulista', 'JARDIM PAULISTA'],
    // Título já na frente não é mexido duas vezes.
    ['PREF. WALDOMIRO SAMPAIO DE SOUZA', 'PREF. WALDOMIRO SAMPAIO DE SOUZA'],
    ['Sagres', 'SAGRES'],
    ['', ''], [null, ''], [undefined, ''],
    ['  Waldomiro   Sampaio  Prefeito ', 'PREF. WALDOMIRO SAMPAIO'],
  ];
  for (const [entrada, esperado] of casos) eq(normalizeSchoolName(entrada), esperado, `escola: ${entrada}`);
}

// ---------------------------------------------------------------------- turma
{
  const doArquivo = nome => {
    const achou = String(nome).replace(/\.(xlsx|xls)$/i, '').match(TURMA_NOME_RE);
    return achou ? cleanClassName(achou[0]) : 'Turma não identificada';
  };
  const casos = [
    // Ensino médio usa SÉRIE com ordinal feminino. Era o caso que falhava.
    ['Mapao_Consolidado_1ª SERIE A INTEGRAL 9H ANUAL.xlsx', '1ª SERIE A INTEGRAL 9H ANUAL'],
    ['Mapao_Consolidado_3ª SERIE A INTEGRAL 9H ANUAL.xlsx', '3ª SERIE A INTEGRAL 9H ANUAL'],
    // Fundamental usa ANO, com ° e com º, que são caracteres diferentes.
    ['Mapao_Consolidado_6° ANO A INTEGRAL 9H ANUAL.xlsx', '6° ANO A INTEGRAL 9H ANUAL'],
    ['Mapao_Consolidado_9º ANO A INTEGRAL 9H ANUAL.xlsx', '9º ANO A INTEGRAL 9H ANUAL'],
    ['Mapao_2ª Série B.xlsx', '2ª Série B'],
    // Nome por bimestre usa _ como separador, que este regex não atravessa de
    // propósito: casaria só "7º ANO" e perderia o "A", juntando turmas
    // diferentes do mesmo ano numa ATA só. Esses arquivos trazem a turma dentro
    // da planilha, então o nome do arquivo nem chega a ser consultado.
    ['MAPAO_ESCOLA_7º_ANO_A_CONSELHO_PRIMEIRO_BIMESTRE.xlsx', 'Turma não identificada'],
    ['Mapao_Consolidado_AEE_A_MANHA.xlsx', 'Turma não identificada'],
  ];
  for (const [nome, esperado] of casos) eq(doArquivo(nome), esperado, `turma: ${nome}`);

  ok(TURMA_RE.test('6º ANO A'), 'TURMA_RE devia achar ANO');
  ok(TURMA_RE.test('1ª SERIE A'), 'TURMA_RE devia achar SERIE');
  ok(TURMA_RE.test('2ª Série B'), 'TURMA_RE devia achar Série acentuado');
  ok(!TURMA_RE.test('ANUAL 9H'), 'TURMA_RE não devia casar texto solto');
}

// ------------------------------------------------------- exclusão de transferidos
{
  const cab = ['ALUNO', 'SITUAÇÃO', 'MATEMATICA (1B)'];

  // Caso real da 1ª SÉRIE A: quatro linhas para a mesma aluna, duas de baixa e
  // duas ativas. Ela continua matriculada, então nenhuma linha dela sai.
  eq(droppedStudents([
    cab,
    ['LAUANDA SUELI FELIPE DE BRITO', 'Baixa - Transferência', ''],
    ['LAUANDA SUELI FELIPE DE BRITO', 'Baixa - Transferência', '4'],
    ['LAUANDA SUELI FELIPE DE BRITO', 'Ativo', '3'],
    ['LAUANDA SUELI FELIPE DE BRITO', 'Ativo', '3'],
  ]).size, 0, 'aluna com linha ativa não pode ser excluída');

  const so = droppedStudents([cab, ['ANTONIO CARLOS SOUSA DA SILVA', 'Transferido', '2'], ['OUTRO ALUNO ATIVO', 'Ativo', '3']]);
  ok(so.has('ANTONIO CARLOS SOUSA DA SILVA'), 'transferido puro sai');
  ok(!so.has('OUTRO ALUNO ATIVO'), 'ativo fica');

  for (const marca of ['Transferida', 'Transferência', 'Baixa de transferência', 'Matrícula baixada']) {
    ok(droppedStudents([cab, ['FULANO DE TAL', marca, '2']]).has('FULANO DE TAL'), `marca não reconhecida: ${marca}`);
  }
  ok(droppedStudents([cab, ['', 'Transferido', ''], ['JOÃO DA SILVA', 'Transferido', '2']]).has('JOAO DA SILVA'), 'chave sem acento');
}

// --------------------------------------------- componentes sem prova (FAQ 6.1)
{
  for (const d of ['ARTE', 'Arte', 'EDUCACAO FISICA', 'Educação Física', 'PROJETO DE VIDA', 'REDAÇAO E LEITURA', 'Redação e Leitura']) {
    eq(temProvaDeRecuperacao(d), false, `devia ficar fora: ${d}`);
  }
  for (const d of ['MATEMATICA', 'LINGUA PORTUGUESA', 'HISTORIA', 'GEOGRAFIA', 'CIENCIAS', 'BIOLOGIA', 'FISICA', 'QUIMICA', 'FILOSOFIA', 'SOCIOLOGIA', 'LINGUA INGLESA']) {
    eq(temProvaDeRecuperacao(d), true, `devia entrar: ${d}`);
  }
  // ESPORTE-MUSICA-ARTE termina em ARTE e não pode ser pego pela exclusão.
  eq(temProvaDeRecuperacao('ESPORTE-MUSICA-ARTE'), true, 'comparação é exata, não por trecho');
  // Componentes de itinerário seguem na lista até a Diretoria de Ensino confirmar.
  for (const d of ['ORIENTAÇAO DE ESTUDO - MATEMATICA', 'PRATICAS EXPERIMENTAIS', 'ROBOTICA', 'ELETIVAS']) {
    eq(temProvaDeRecuperacao(d), true, `ainda não é para excluir: ${d}`);
  }
}

// ------------------------------------------------------------------ nota crua
{
  eq(parseNumber('4'), 4, 'inteiro');
  eq(parseNumber('4,5'), 4.5, 'vírgula decimal');
  eq(parseNumber(3), 3, 'número puro');
  eq(parseNumber('-'), null, 'traço não é nota');
  eq(parseNumber(''), null, 'vazio não é nota');
  eq(parseNumber('ES'), null, 'conceito não é nota');
  eq(parseNumber('11'), null, 'acima de 10 é descartado');
  eq(parseNumber('-1'), null, 'negativo é descartado');
  eq(parseNumber('10'), 10, 'dez é válido');
  eq(parseNumber('0'), 0, 'zero é nota válida e conta como abaixo de 5');
}

// -------------------------------------------------------- Mapão consolidado
// Cabeçalho na linha 0, colunas DISCIPLINA (1B)/(2B), coluna SITUAÇÃO, e a
// turma só existe no nome do arquivo.
{
  const rows = [
    ['ALUNO', 'SITUAÇÃO', 'MATEMATICA (1B)', 'MATEMATICA (2B)', 'ARTE (1B)', 'ARTE (2B)', 'HISTORIA (1B)', 'HISTORIA (2B)'],
    ['ANA CLARA DE SOUZA', 'Ativo', '3', '4', '2', '2', '8', '9'],
    ['BRUNO ALVES LIMA', 'Transferido', '1', '1', '1', '1', '1', '1'],
    ['CARLA DIAS MOTA', 'Ativo', '8', '9', '9', '9', '4', '-'],
  ];
  const nome = 'Mapao_Consolidado_6° ANO A INTEGRAL 9H ANUAL.xlsx';
  const parsed = parseSheet(rows, nome);
  eq(parsed.turma, '6° ANO A INTEGRAL 9H ANUAL', 'turma vem do nome do arquivo');
  eq(detectSchool(rows), '', 'consolidado não traz escola');

  const mantidos = keepRecords(parsed.records, rows);
  const chaves = mantidos.map(r => `${r.aluno}|${r.disciplina}|${r.bimestre}`).sort();
  eq(chaves, [
    'ANA CLARA DE SOUZA|MATEMATICA|1º',
    'ANA CLARA DE SOUZA|MATEMATICA|2º',
    'CARLA DIAS MOTA|HISTORIA|1º',
  ], 'só nota abaixo de 5, de aluno ativo, em componente com prova');

  const linhas = combineRecords(mantidos);
  const ana = linhas.find(l => l[0] === 'ANA CLARA DE SOUZA');
  eq([ana[3], ana[4]], ['3', '4'], 'dois bimestres na mesma linha');
  eq(ana[6], '1º bimestre', 'substitui o bimestre de menor nota');
  const carla = linhas.find(l => l[0] === 'CARLA DIAS MOTA');
  eq([carla[3], carla[4]], ['4', '—'], 'sem nota no 2º bimestre');
  eq(carla[6], '1º bimestre', 'só o 1º tem nota, é ele que sai');
}

// --------------------------------------------------------- Mapão por bimestre
// Metadado acima do cabeçalho, uma disciplina por coluna, um arquivo por bimestre.
{
  const rows = [
    ['ESCOLA:', 'Waldomiro Sampaio de Souza Prefeito'],
    ['TURMA:', '7º ANO A INTEGRAL 9H ANUAL'],
    [],
    ['ALUNO', 'RA', 'MATEMATICA', 'HISTORIA', 'TOTAL', 'FRE(%)'],
    ['DANIEL ROCHA PINTO', '123', '3', '7', '10', '95'],
  ];
  const nome = 'MAPAO_ESCOLA_7º_ANO_CONSELHO_SEGUNDO_BIMESTRE_17072026.xlsx';
  const parsed = parseSheet(rows, nome);
  eq(parsed.turma, '7º ANO A INTEGRAL 9H ANUAL', 'turma vem do metadado TURMA:');
  eq(parsed.bimestre, '2º', 'bimestre vem do nome do arquivo');
  eq(detectSchool(rows), 'PREF. WALDOMIRO SAMPAIO DE SOUZA', 'escola do metadado, já normalizada');
  eq(parsed.records.length, 1, 'TOTAL e FRE(%) cortam as colunas de nota');
  eq(parsed.records[0].disciplina, 'MATEMATICA', 'disciplina certa');
  eq(parsed.records[0].bimestre, '2º', 'registro herda o bimestre do arquivo');
}

// ------------------------------------------------- bimestre pelo nome e metadado
{
  eq(bimester('X_PRIMEIRO_BIMESTRE.xlsx'), '1º', 'primeiro por extenso');
  eq(bimester('X_SEGUNDO_BIMESTRE.xlsx'), '2º', 'segundo por extenso');
  eq(bimester('X_2º_BIM.xlsx'), '2º', 'ordinal abreviado');
  eq(bimester('Mapao_Consolidado_6° ANO.xlsx'), '1º', 'sem pista nenhuma cai no 1º');
  eq(bimester('sem_pista.xlsx', [['CONSELHO SEGUNDO BIMESTRE']]), '2º', 'pista no metadado');
}

// ------------------------------------------------------- mesclagem de dois lotes
{
  const primeiro = combineRecords([
    { aluno: 'ANA CLARA DE SOUZA', turma: '6° ANO A', disciplina: 'MATEMATICA', bimestre: '1º', nota: 3 },
  ]);
  // Coordenação lança a nota da recuperação à mão.
  primeiro[0][5] = '7';
  primeiro[0][6] = '1º bimestre';
  primeiro[0][7] = rowStatus(primeiro[0]);
  eq(primeiro[0][7], 'Concluído', 'nota lançada fecha o registro');

  // Chega o Mapão do 2º bimestre com uma nota nova para a mesma disciplina.
  const segundo = combineRecords([
    { aluno: 'ANA CLARA DE SOUZA', turma: '6° ANO A', disciplina: 'MATEMATICA', bimestre: '2º', nota: 4 },
    { aluno: 'NOVO ALUNO DA SILVA', turma: '6° ANO A', disciplina: 'HISTORIA', bimestre: '2º', nota: 2 },
  ]);
  const merged = mergeRows(primeiro, segundo);
  eq(merged.length, 2, 'lote novo acrescenta, não substitui');
  const ana = merged.find(r => r[0] === 'ANA CLARA DE SOUZA');
  eq(ana[3], '3', 'nota do 1º bimestre sobrevive ao segundo lote');
  eq(ana[4], '4', 'nota do 2º bimestre entra');
  eq(ana[5], '7', 'nota de recuperação lançada à mão não é perdida');
  eq(ana[7], 'Concluído', 'status recalculado');

  // Reimportar o mesmo lote não duplica linha.
  eq(mergeRows(merged, segundo).length, 2, 'reimportar não duplica');
}

// ------------------------------------------------------------ status da linha
{
  const base = ['A', 'T', 'D', '3', '4', '—', '', 'Pendente'];
  eq(rowStatus(base), 'Pendente', 'sem nota e sem bimestre está pendente');
  eq(rowStatus(['A', 'T', 'D', '3', '4', '7', '', 'x']), 'Pendente', 'nota sem bimestre ainda está pendente');
  eq(rowStatus(['A', 'T', 'D', '3', '4', '7', '1º bimestre', 'x']), 'Concluído', 'nota mais bimestre fecha');
  // Quem não fez a prova está resolvido: não há nota nem bimestre a substituir.
  eq(rowStatus(['A', 'T', 'D', '3', '4', 'Não realizou', '', 'x']), 'Concluído', 'Não realizou fecha sozinho');
}

// ----------------------------------------------------------- limpeza de rótulo
{
  eq(cleanSubject('MATEMATICA (1B)'), 'MATEMATICA', 'tira o sufixo de bimestre');
  eq(cleanSubject('MATEMATICA (2B)'), 'MATEMATICA', 'tira o sufixo de bimestre');
  eq(cleanSubject('HISTORIA 12345'), 'HISTORIA', 'tira o código numérico');
  eq(cleanSubject('  ARTE  '), 'ARTE', 'tira espaço');
}

// ------------------------------------------------------------- linha sem aluno
{
  const rows = [
    ['ALUNO', 'SITUAÇÃO', 'MATEMATICA (1B)'],
    ['', 'Ativo', '2'],
    ['AB', 'Ativo', '2'],
    ['ALUNO', 'Ativo', '2'],
    ['NOME COMPLETO VALIDO', 'Ativo', '2'],
  ];
  const parsed = parseSheet(rows, 'Mapao_Consolidado_6° ANO A.xlsx');
  eq(parsed.records.map(r => r.aluno), ['NOME COMPLETO VALIDO'], 'linha vazia, nome curto e cabeçalho repetido são ignorados');
}

// --------------------------------------------------- bloco de legenda no rodapé
// O Mapão por bimestre fecha com a legenda das siglas. Se alguma dessas linhas
// tiver número na coluna de uma disciplina, viraria um aluno fantasma na ATA.
{
  const rows = [
    ['ALUNO', 'RA', 'MATEMATICA'],
    ['ALUNO DE VERDADE', '1', '3'],
    ['Legenda', '', ''],
    ['ES - Engajamento Satisfatório', '', '2'],
    ['AC - Ausência Compensada', '', '1'],
  ];
  const parsed = parseSheet(rows, 'MAPAO_X_6º_ANO_PRIMEIRO_BIMESTRE.xlsx');
  eq(parsed.records.map(r => r.aluno), ['ALUNO DE VERDADE'], 'a leitura para na legenda');
}

// ------------------------------------------- as duas cópias não podem divergir
// O app roda em dois lugares: app.js no GitHub Pages e apps-script/app.html no
// Web App. As regras de leitura do Mapão são as mesmas nos dois, e já
// aconteceu de uma correção entrar só num lado. Este bloco quebra se isso voltar
// a acontecer. O resto dos dois arquivos pode divergir à vontade — só estas
// declarações são compartilhadas.
{
  const twin = readFileSync(new URL('./apps-script/app.html', import.meta.url), 'utf8');
  const COMPARTILHADAS = [
    /^function normal\(v\).*$/m,
    /^const SCHOOL_TITLES=.*$/m,
    /^function normalizeSchoolName\(name\).*$/m,
    /^const TURMA_RE=.*$/m,
    /^const TURMA_NOME_RE=.*$/m,
    /^const TRANSFER_RE=.*$/m,
    /^const SEM_PROVA_RECUPERACAO=.*$/m,
    /^function temProvaDeRecuperacao\(disciplina\).*$/m,
    /^function droppedStudents\(rows\).*$/m,
    /^function cleanSubject\(v\).*$/m,
    /^function cleanClassName\(v\).*$/m,
    /^function parseNumber\(v\).*$/m,
    /^function findTurma\(rows,fileName\).*$/m,
    /^function bimester\(name,metadata=\[\]\).*$/m,
    /^function subjectPeriod\(v,fallback\).*$/m,
  ];
  for (const re of COMPARTILHADAS) {
    const noApp = source.match(re);
    const noTwin = twin.match(re);
    ok(noTwin, `apps-script/app.html não tem a declaração: ${re}`);
    eq(noTwin[0].trim(), noApp[0].trim(), `app.js e apps-script/app.html divergiram em: ${re}`);
  }
}

// ------------------------------------------------------- os dois arquivos compilam
// Envolver em função declara sem executar: erro de sintaxe estoura no import,
// mas nenhuma linha que toca DOM chega a rodar.
{
  const compila = async (nome, corpo) => {
    try {
      await import('data:text/javascript,' + encodeURIComponent(`function __check(){\n${corpo}\n}`));
      ok(true, `${nome} compila`);
    } catch (e) {
      ok(false, `${nome} tem erro de sintaxe: ${e.message}`);
    }
  };
  await compila('app.js', source);
  const twinHtml = readFileSync(new URL('./apps-script/app.html', import.meta.url), 'utf8');
  const blocos = [...twinHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  ok(blocos.length > 0, 'apps-script/app.html tem bloco <script>');
  await compila('apps-script/app.html', blocos.join('\n'));
}

console.log(`ok — ${checks} verificações`);
