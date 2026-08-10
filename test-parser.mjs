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
  /^function notaBimestre\(v\).*$/m,
  /^function notaRecuperacao\(v\).*$/m,
  /^function bimestreSubstituido\(v\).*$/m,
  /^function linhaValidada\(aluno,turma,disciplina,nota1,nota2,recuperacaoBruta,bimestreBruto\).*$/m,
  /^function parseExport\(rows\).*$/m,
  /^function chaveDaLinha\(row\).*$/m,
  /^function linhasParaSala\(rows\).*$/m,
  /^function linhasDaSala\(linhas\).*$/m,
  /^function salaDaUrl\(hash\).*$/m,
  /^const SALA_ALFABETO=.*$/m,
  /^function novaSala\(sorteio=.*$/m,
];

const EXPORTA = [
  'normalizeSchoolName', 'cleanClassName', 'cleanSubject', 'TURMA_RE', 'TURMA_NOME_RE',
  'droppedStudents', 'temProvaDeRecuperacao', 'parseSheet', 'detectSchool',
  'keepRecords', 'combineRecords', 'mergeRows', 'bimester', 'parseNumber', 'rowStatus',
  'parseExport', 'notaRecuperacao', 'bimestreSubstituido',
  'chaveDaLinha', 'linhasParaSala', 'linhasDaSala', 'salaDaUrl', 'novaSala', 'SALA_ALFABETO',
];

const modulo = PUROS.map(grab).join('\n') + `\nexport { ${EXPORTA.join(', ')} };`;
const api = await import('data:text/javascript,' + encodeURIComponent(modulo));
const {
  normalizeSchoolName, cleanClassName, cleanSubject, TURMA_RE, TURMA_NOME_RE,
  droppedStudents, temProvaDeRecuperacao, parseSheet, detectSchool,
  keepRecords, combineRecords, mergeRows, bimester, parseNumber, rowStatus,
  parseExport, notaRecuperacao, bimestreSubstituido,
  chaveDaLinha, linhasParaSala, linhasDaSala, salaDaUrl, novaSala, SALA_ALFABETO,
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

// ------------------------------------------- planilha exportada, de volta
// Duas pessoas dividem o lançamento numa planilha compartilhada e devolvem o
// arquivo. Ele já vem combinado, uma linha por aluno + turma + disciplina, e
// não pode passar pelo parser do Mapão: lá cada coluna de nota viraria matéria.
{
  const cabecalho = ['Aluno', 'Turma', 'Disciplina', 'Nota do primeiro bimestre', 'Nota do segundo bimestre', 'Nota da recuperação semestral', 'Bimestre substituído', 'Status'];

  // O Mapão não é confundido com a exportação: lá a coluna 1 não é "Turma".
  eq(parseExport([['ALUNO', 'M', 'MATEMATICA'], ['FULANA', '', '3']]), null, 'Mapão não é lido como exportação');
  eq(parseExport([[]]), null, 'planilha sem cabeçalho conhecido devolve null');

  const restored = parseExport([cabecalho, ['FULANA DE TAL', '6º ANO A', 'MATEMATICA', '3', '4', '7', '1º bimestre', 'Concluído']]);
  eq(restored.length, 1, 'uma linha restaurada');
  eq(restored[0], ['FULANA DE TAL', '6º ANO A', 'MATEMATICA', '3', '4', '7', '1º bimestre', 'Concluído'], 'a linha volta inteira');

  // Linha em branco no fim da planilha é comum depois que alguém edita no Sheets.
  eq(parseExport([cabecalho, ['', '', '', '', '', '', '', '']]).length, 0, 'linha sem aluno é descartada');

  // Nada do arquivo é aceito como veio. Quem devolve a planilha pode ter
  // digitado qualquer coisa na coluna de nota, e o status mente se for copiado.
  const sujo = parseExport([cabecalho,
    ['A', 'T', 'D', 'x', '', '99', 'sei lá', 'Concluído'],
    ['B', 'T', 'D', '4,5', '2', '10,5', '2º bimestre', 'Concluído'],
    ['C', 'T', 'D', '3', '3', 'Não realizou', '1º bimestre', 'Pendente'],
    ['D', 'T', 'D', '3', '3', '7', '', 'Concluído'],
  ]);
  eq([sujo[0][3], sujo[0][4]], ['—', '—'], 'nota ilegível vira travessão');
  eq(sujo[0][5], '—', 'nota de recuperação fora de 1 a 10 é recusada');
  eq(sujo[0][6], '', 'bimestre inventado é recusado');
  eq(sujo[0][7], 'Pendente', 'status do arquivo não é copiado: é recalculado');
  eq(sujo[1][5], '—', 'nota quebrada como 10,5 é recusada');
  eq(sujo[2][6], '', 'Não realizou não tem bimestre a substituir');
  eq(sujo[2][7], 'Concluído', 'Não realizou conclui a linha');
  eq(sujo[3][7], 'Pendente', 'nota sem bimestre escolhido segue pendente');

  for (const [entrada, esperado] of [['7', '7'], [7, '7'], ['Não realizou', 'Não realizou'], ['NAO REALIZOU', 'Não realizou'], ['0', '—'], ['', '—'], [null, '—'], ['7,5', '—']]) {
    eq(notaRecuperacao(entrada), esperado, `nota de recuperação: ${entrada}`);
  }
  for (const [entrada, esperado] of [['1º bimestre', '1º bimestre'], ['2º bimestre', '2º bimestre'], ['1', '1º bimestre'], ['', ''], ['3º bimestre', '']]) {
    eq(bimestreSubstituido(entrada), esperado, `bimestre substituído: ${entrada}`);
  }

  // O merge de duas planilhas devolvidas pela metade é o ponto do trabalho em
  // dupla: cada uma preenche parte, e o encontro não perde nem sobrescreve.
  const daAna = parseExport([cabecalho, ['FULANA', '6A', 'MATEMATICA', '3', '4', '7', '1º bimestre', ''], ['BELTRANO', '6A', 'HISTORIA', '2', '4', '', '', '']]);
  const doBruno = parseExport([cabecalho, ['FULANA', '6A', 'MATEMATICA', '3', '4', '', '', ''], ['BELTRANO', '6A', 'HISTORIA', '2', '4', '8', '1º bimestre', '']]);
  const juntas = mergeRows(daAna, doBruno);
  eq(juntas.length, 2, 'as duas metades viram um lote só');
  eq(juntas.find(r => r[0] === 'FULANA')[5], '7', 'nota da Ana sobrevive ao arquivo do Bruno');
  eq(juntas.find(r => r[0] === 'BELTRANO')[5], '8', 'nota do Bruno entra onde estava vazio');
  ok(juntas.every(r => r[7] === 'Concluído'), 'as duas linhas ficam concluídas');
}

// ------------------------------------------------- ida e volta da sala
// A sala é o link que duas pessoas abrem para lançar nota ao mesmo tempo. O
// Apps Script do outro lado é caixa burra: compara string com string. Toda a
// identidade do aluno é decidida aqui, e por isso a chave viaja pronta.
{
  const linha = ['Fulana de Tal', '6º ANO A', 'MATEMATICA', '3', '4', '7', '1º bimestre', 'Concluído'];

  eq(chaveDaLinha(linha), 'FULANA DE TAL|6º ANO A|MATEMATICA', 'a chave é o trio normalizado');
  // Acento e caixa não podem gerar duas linhas para o mesmo aluno no servidor.
  eq(chaveDaLinha(['fulana de tal', '6º ano a', 'matemática']), chaveDaLinha(['FULANA DE TAL', '6º ANO A', 'MATEMÁTICA']), 'acento e caixa dão a mesma chave');

  const enviadas = linhasParaSala([linha]);
  eq(enviadas[0].length, 8, 'vai a chave mais sete colunas');
  eq(enviadas[0][0], chaveDaLinha(linha), 'a chave vai na frente');
  ok(!enviadas[0].includes('Concluído'), 'o status não viaja: é recalculado de cada lado');

  // Volta do servidor é entrada de fora, como a planilha devolvida.
  eq(linhasDaSala(enviadas)[0], linha, 'a linha volta inteira, com o status recalculado');
  eq(linhasDaSala([['k', 'Aluno', 'T', 'D', 'x', '', '99', 'chute', 'Concluído']])[0].slice(3), ['—', '—', '—', '', 'Pendente'], 'lixo vindo da rede é recusado igual ao da planilha');
  eq(linhasDaSala(null), [], 'resposta sem linhas não quebra');
  eq(linhasDaSala([['k', '', '', '']]), [], 'linha sem aluno é descartada');

  // O código da sala é o único segredo, porque a implantação é aberta.
  eq(salaDaUrl('#sala=ABCD2345EFGH'), 'ABCD2345EFGH', 'o código sai do hash');
  eq(salaDaUrl('#sala=abcd2345efgh'), 'ABCD2345EFGH', 'e sobe para caixa alta');
  eq(salaDaUrl('#sala=CURTO'), '', 'código curto demais é ignorado');
  eq(salaDaUrl(''), '', 'sem hash não há sala');
  eq(salaDaUrl('#outra=coisa'), '', 'hash de outra coisa não vira sala');

  const codigo = novaSala(n => new Uint8Array(n).fill(0));
  eq(codigo.length, 12, 'o código tem 12 caracteres');
  ok(/^[A-Z0-9]{12}$/.test(codigo), 'só letras e dígitos, para caber no hash e no Apps Script');
  ok(!/[IO01]/.test(SALA_ALFABETO), 'sem I, O, 0 e 1: são os que se confundem ao ditar');
  // Sorteio diferente tem que dar código diferente, senão o segredo não existe.
  ok(novaSala(n => new Uint8Array(n).fill(0)) !== novaSala(n => new Uint8Array(n).fill(7)), 'bytes diferentes geram códigos diferentes');
}

// --------------------------------------------------------- o app.js compila
// Envolver em função declara sem executar: erro de sintaxe estoura no import,
// mas nenhuma linha que toca DOM chega a rodar.
{
  try {
    await import('data:text/javascript,' + encodeURIComponent(`function __check(){\n${source}\n}`));
    ok(true, 'app.js compila');
  } catch (e) {
    ok(false, `app.js tem erro de sintaxe: ${e.message}`);
  }
}

// --------------------------------------------- não pode voltar a existir cópia
// O parser já morou em dois lugares, app.js e apps-script/app.html, e uma
// correção chegou a entrar só num lado. O Apps Script foi aposentado em
// 08/08/2026 justamente para acabar com essa classe de defeito.
//
// Em 10/08/2026 o apps-script/ voltou, mas como caixa de dados: guarda linhas e
// devolve linhas, sem conhecer Mapão, nota baixa nem aluno transferido. A
// guarda deixou de ser "a pasta não existe" e passou a ser "a pasta não tem
// parser" — que é o defeito de verdade, e o que precisa continuar impossível.
{
  const { readdirSync, readFileSync: lerArquivo } = await import('node:fs');
  const pasta = new URL('./apps-script/', import.meta.url);
  let arquivos = [];
  try { arquivos = readdirSync(pasta); } catch (e) { arquivos = []; }

  // Marcas de parser: se qualquer uma aparecer no Apps Script, a regra passou a
  // existir em dois lugares de novo.
  const PROIBIDO = [
    [/\bALUNO\b/, 'procura o cabeçalho ALUNO'],
    [/parseSheet|combineRecords|keepRecords|droppedStudents/, 'copiou função do parser'],
    [/TRANSFERID|BAIXA\s+DE\s+TRANSFER/i, 'sabe o que é aluno transferido'],
    [/SEM_PROVA_RECUPERACAO|EDUCACAO FISICA|PROJETO DE VIDA/i, 'sabe quais componentes ficam fora'],
    [/[ºª°]\s*BIM|PRIMEIRO BIMESTRE|SEGUNDO BIMESTRE/i, 'sabe o que é bimestre'],
    [/<\s*5|nota\s*<|abaixo de 5/i, 'conhece o corte de nota 5,0'],
  ];
  for (const nome of arquivos) {
    const conteudo = lerArquivo(new URL(nome, pasta), 'utf8');
    // O cabeçalho do próprio arquivo explica a regra; a checagem é do código.
    const codigo = conteudo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const [marca, porque] of PROIBIDO) {
      ok(!marca.test(codigo), `apps-script/${nome} ${porque}: o parser voltou a existir em dois lugares`);
    }
  }
}

console.log(`ok — ${checks} verificações`);
