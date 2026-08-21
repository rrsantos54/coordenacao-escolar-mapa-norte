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
  /^const NO_RECOVERY=.*$/m,
  /^function semNota\(valor\).*$/m,
  /^function normal\(v\).*$/m,
  /^const SCHOOL_TITLES=.*$/m,
  /^function normalizeSchoolName\(name\).*$/m,
  /^const DISCIPLINAS_ACENTUADAS=.*$/m,
  /^function acentuarDisciplina\(nome\).*$/m,
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
  /^function parseSheet\(rows,fileName,todasAsNotas=false\).*$/m,
  /^const SCHOOL_LABELS=.*$/m,
  /^function detectSchool\(rows\).*$/m,
  /^function keepRecords\(records,rows\).*$/m,
  /^function combineRecords\(records\).*$/m,
  /^function rowStatus\(row\).*$/m,
  /^function desfecho\(row\).*$/m,
  /^function chavePosRecuperacao\(aluno,turma,disciplina\).*$/m,
  /^function notasPosRecuperacao\(registros\).*$/m,
  /^function aplicarPosRecuperacao\(linhas,registros\).*$/m,
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
  /^const PROFESSORES=.*$/m,
  /^const PROFESSORES_POR_LINHA=.*$/m,
  /^function fileirasDeProfessor\(nomes=PROFESSORES\).*$/m,
  /^const MESES_POR_EXTENSO=.*$/m,
  /^const ANO_POR_EXTENSO=.*$/m,
  /^function aberturaDaAta\(hoje=new Date\(\)\).*$/m,
  /^const ATA_COLUNAS=.*$/m,
  /^const COLUNAS_DE_NOTA=.*$/m,
  /^const COLUNAS_CENTRALIZADAS=.*$/m,
  /^function celulaCentralizada\(coluna\).*$/m,
  /^function notaBaixa\(v\).*$/m,
  /^function notaAlta\(v\).*$/m,
  /^function classeDaCelula\(coluna,valor\).*$/m,
  /^function classesDaCelula\(coluna,valor\).*$/m,
  /^function blocosDoAluno\(linhas\).*$/m,
  /^function bimestreDaAta\(row\).*$/m,
  /^function celulasDaAta\(rows\).*$/m,
  /^function nomeDoArquivoAta\(className,ext='docx'\).*$/m,
];

const EXPORTA = [
  'normalizeSchoolName', 'cleanClassName', 'cleanSubject', 'TURMA_RE', 'TURMA_NOME_RE',
  'droppedStudents', 'SEM_PROVA_RECUPERACAO', 'temProvaDeRecuperacao', 'parseSheet', 'detectSchool',
  'keepRecords', 'combineRecords', 'mergeRows', 'bimester', 'parseNumber', 'rowStatus',
  'parseExport', 'notaRecuperacao', 'bimestreSubstituido',
  'NO_EXAM', 'NO_RECOVERY', 'semNota', 'desfecho', 'aplicarPosRecuperacao', 'notasPosRecuperacao',
  'chaveDaLinha', 'linhasParaSala', 'linhasDaSala', 'salaDaUrl', 'novaSala', 'SALA_ALFABETO',
  'celulasDaAta', 'nomeDoArquivoAta', 'ATA_COLUNAS', 'classeDaCelula', 'classesDaCelula', 'blocosDoAluno', 'aberturaDaAta', 'PROFESSORES', 'fileirasDeProfessor',
];

const modulo = PUROS.map(grab).join('\n') + `\nexport { ${EXPORTA.join(', ')} };`;
const api = await import('data:text/javascript,' + encodeURIComponent(modulo));
const {
  normalizeSchoolName, cleanClassName, cleanSubject, TURMA_RE, TURMA_NOME_RE,
  droppedStudents, SEM_PROVA_RECUPERACAO, temProvaDeRecuperacao, parseSheet, detectSchool,
  keepRecords, combineRecords, mergeRows, bimester, parseNumber, rowStatus,
  parseExport, notaRecuperacao, bimestreSubstituido,
  NO_EXAM, NO_RECOVERY, semNota, desfecho, aplicarPosRecuperacao, notasPosRecuperacao,
  chaveDaLinha, linhasParaSala, linhasDaSala, salaDaUrl, novaSala, SALA_ALFABETO,
  celulasDaAta, nomeDoArquivoAta, ATA_COLUNAS, classeDaCelula, classesDaCelula, blocosDoAluno, aberturaDaAta, PROFESSORES, fileirasDeProfessor,
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

// ------------------------------------------------ componentes sem prova (lista)
{
  // Item 6.1 do FAQ 2026: não integram a Prova Paulista, então não têm
  // recuperação semestral. Tecnologia e Inovação entrou junto em 20/08/2026.
  for (const d of ['ARTE', 'Arte', 'EDUCACAO FISICA', 'Educação Física', 'PROJETO DE VIDA', 'REDAÇAO E LEITURA', 'Redação e Leitura', 'TECNOLOGIA E INOVACAO', 'Tecnologia e Inovação']) {
    eq(temProvaDeRecuperacao(d), false, `não tem recuperação: ${d}`);
  }
  for (const d of ['MATEMATICA', 'LINGUA PORTUGUESA', 'HISTORIA', 'GEOGRAFIA', 'CIENCIAS', 'BIOLOGIA', 'FISICA', 'QUIMICA', 'FILOSOFIA', 'SOCIOLOGIA', 'LINGUA INGLESA']) {
    eq(temProvaDeRecuperacao(d), true, `devia entrar: ${d}`);
  }
  for (const d of ['ORIENTAÇAO DE ESTUDO - MATEMATICA', 'PRATICAS EXPERIMENTAIS', 'ROBOTICA', 'ELETIVAS']) {
    eq(temProvaDeRecuperacao(d), true, `não é para excluir: ${d}`);
  }
  // A comparação é do nome inteiro, não por trecho: ESPORTE-MUSICA-ARTE termina
  // em ARTE e não pode ser pego pela exclusão de ARTE. No lote real esse
  // componente nunca chega aqui — 339 das 356 notas são conceito, não número —
  // mas a exclusão por trecho quebraria a turma que tivesse nota.
  eq(temProvaDeRecuperacao('ESPORTE-MUSICA-ARTE'), true, 'comparação é exata, não por trecho');
  eq(temProvaDeRecuperacao('ESPORTE-MÚSICA-ARTE'), true, 'nem com acento');
  eq(temProvaDeRecuperacao('ARTES VISUAIS'), true, 'nem por prefixo');
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
    'ANA CLARA DE SOUZA|MATEMÁTICA|1º',
    'ANA CLARA DE SOUZA|MATEMÁTICA|2º',
    'CARLA DIAS MOTA|HISTÓRIA|1º',
  ], 'nota abaixo de 5 de aluno ativo, sem Arte: não integra a Prova Paulista');

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
  eq(parsed.records[0].disciplina, 'MATEMÁTICA', 'disciplina certa');
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

// ------------------------- bimestre não vaza de volta para quem não recuperou
// combineRecords sempre sugere um bimestre para linha nova. Reimportar o mesmo
// Mapão depois de marcar Não recuperou não pode devolver essa sugestão: virava
// bimestre substituído fantasma na ATA de quem não tem nota nenhuma.
{
  const base = combineRecords([
    { aluno: 'CARLA MOTA', turma: '6° ANO A', disciplina: 'MATEMATICA', bimestre: '1º', nota: 3 },
  ]);
  base[0][5] = NO_RECOVERY;
  base[0][6] = '';
  base[0][7] = rowStatus(base[0]);

  // Reimportar o mesmo Mapão gera de novo a sugestão de bimestre.
  const reimportado = combineRecords([
    { aluno: 'CARLA MOTA', turma: '6° ANO A', disciplina: 'MATEMATICA', bimestre: '1º', nota: 3 },
  ]);
  eq(reimportado[0][6], '1º bimestre', 'combineRecords sempre sugere um bimestre para linha nova');

  const depois = mergeRows(base, reimportado);
  eq(depois[0][5], NO_RECOVERY, 'o desfecho continua Não recuperou');
  eq(depois[0][6], '', 'a sugestão de bimestre não volta: quem não recuperou não tem bimestre a mostrar');

  // A mesma fuga acontecia na ordem inversa, a que showImported usa ao combinar
  // o lote recém-lido (fresh, com sugestão) com o Mapão pós-recuperação (restored).
  const restored = base.map(r => r.slice());
  const combinadoDeVolta = mergeRows(reimportado, restored);
  eq(combinadoDeVolta[0][6], '', 'e na ordem inversa também: fresh como base, restored como entrada');
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
  eq(cleanSubject('MATEMATICA (1B)'), 'MATEMÁTICA', 'tira o sufixo de bimestre');
  eq(cleanSubject('MATEMATICA (2B)'), 'MATEMÁTICA', 'tira o sufixo de bimestre');
  eq(cleanSubject('HISTORIA 12345'), 'HISTÓRIA', 'tira o código numérico');
  eq(cleanSubject('  ARTE  '), 'ARTE', 'tira espaço');

  // O Mapão manda o componente sem acento, e às vezes pela metade. A ATA é
  // documento oficial e sai com a grafia certa.
  const acentos = [
    ['CIENCIAS', 'CIÊNCIAS'],
    ['ROBOTICA', 'ROBÓTICA'],
    ['LINGUA PORTUGUESA', 'LÍNGUA PORTUGUESA'],
    ['EDUCACAO FISICA', 'EDUCAÇÃO FÍSICA'],
    ['ORIENTAÇAO DE ESTUDO - MATEMATICA', 'ORIENTAÇÃO DE ESTUDO - MATEMÁTICA'],
    ['ORIENTACAO DE ESTUDO - LINGUA PORTUGUESA', 'ORIENTAÇÃO DE ESTUDO - LÍNGUA PORTUGUESA'],
    // Já acentuado não é mexido duas vezes.
    ['MATEMÁTICA', 'MATEMÁTICA'],
    // Componente fora da lista passa intacto, não vira palpite.
    ['ELETIVAS', 'ELETIVAS'],
    ['GEOGRAFIA', 'GEOGRAFIA'],
    ['EMPREENDEDORISMO', 'EMPREENDEDORISMO'],
    // INGLÊS e LÍNGUA INGLESA são a mesma matéria e saem com um nome só.
    ['INGLES', 'LÍNGUA INGLESA'],
    ['INGLÊS', 'LÍNGUA INGLESA'],
    ['LINGUA INGLESA', 'LÍNGUA INGLESA'],
  ];
  for (const [entrada, esperado] of acentos) eq(cleanSubject(entrada), esperado, `acento: ${entrada}`);

  // O Mapão deixa escapar componente em caixa mista. A ATA sai toda em
  // maiúsculas, inclusive o que não está na tabela de acentos.
  const caixa = [
    ['Empreendedorismo', 'EMPREENDEDORISMO'],
    ['Atualidades', 'ATUALIDADES'],
    ['Matematica', 'MATEMÁTICA'],
    ['Orientação de Estudo - Matemática', 'ORIENTAÇÃO DE ESTUDO - MATEMÁTICA'],
  ];
  for (const [entrada, esperado] of caixa) eq(cleanSubject(entrada), esperado, `caixa: ${entrada}`);

  // O separador volta como veio: ESPORTE-MUSICA-ARTE não tem espaço em volta
  // do hífen, e inventar espaço mudaria o nome do componente.
  eq(cleanSubject('ESPORTE-MUSICA-ARTE'), 'ESPORTE-MÚSICA-ARTE', 'hífen sem espaço é preservado');

  // A acentuação não pode separar em duas linhas o que era o mesmo componente:
  // a chave de mesclagem passa por normal(), que ignora acento.
  eq(cleanSubject('MATEMATICA').normalize('NFD').replace(/[̀-ͯ]/g, ''), 'MATEMATICA', 'sem acento, a chave de mesclagem continua a mesma');
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
  eq(restored[0], ['FULANA DE TAL', '6º ANO A', 'MATEMÁTICA', '3', '4', '7', '1º bimestre', 'Concluído'], 'a linha volta inteira');

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
  const linha = ['Fulana de Tal', '6º ANO A', 'MATEMÁTICA', '3', '4', '7', '1º bimestre', 'Concluído'];

  // A chave ignora acento de propósito: é ela que casa MATEMATICA do Mapão com
  // MATEMÁTICA já corrigida, e sem isso a mesma disciplina viraria duas linhas.
  eq(chaveDaLinha(linha), 'FULANA DE TAL|6º ANO A|MATEMATICA', 'a chave é o trio normalizado, sem acento');
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

// -------------------------------- nome de arquivo repetido pelo navegador
// Baixar o mesmo Mapão duas vezes gera "… ANUAL (1).xlsx". O conteúdo é o
// mesmo, então a turma tem que ser a mesma: com o sufixo dentro do nome da
// turma, a chave muda e o Mapão pós-recuperação não acha linha nenhuma.
{
  const planilha = [
    ['ALUNO', 'SITUAÇÃO', 'MATEMATICA (1B)', 'MATEMATICA (2B)'],
    ['ALUNA DE TESTE', 'Ativo', '3', '8'],
  ];
  const semSufixo = parseSheet(planilha, 'Mapao_Consolidado_6° ANO A INTEGRAL 9H ANUAL.xlsx');
  const comSufixo = parseSheet(planilha, 'Mapao_Consolidado_6° ANO A INTEGRAL 9H ANUAL (1).xlsx');
  eq(comSufixo.turma, semSufixo.turma, 'o (1) do download repetido não entra no nome da turma');
  eq(comSufixo.turma, '6° ANO A INTEGRAL 9H ANUAL', 'e a turma é a do Mapão');
  eq(parseSheet(planilha, 'Mapao_Consolidado_6° ANO A INTEGRAL 9H ANUAL (12).xlsx').turma, semSufixo.turma, 'com dois dígitos também');

  // A mesma linha, vinda dos dois nomes, tem que casar na chave — que é o que
  // aplicarPosRecuperacao usa para achar o componente no Mapão pós.
  const [linhaA] = combineRecords(semSufixo.records);
  const [linhaB] = combineRecords(comSufixo.records);
  eq(chaveDaLinha(linhaA), chaveDaLinha(linhaB), 'e as duas linhas casam na chave');
}

// ------------------------------------ quadro de professores para assinatura
// A lista é digitada à mão porque o Mapão não traz professor. Digitação à mão
// erra: espaço sobrando no fim do nome, linha vazia, nome repetido.
{
  ok(PROFESSORES.length > 0, 'o quadro tem professores');
  eq(PROFESSORES.filter(nome => nome !== nome.trim()).length, 0, 'nenhum nome com espaço sobrando nas pontas');
  eq(PROFESSORES.filter(nome => !nome).length, 0, 'nenhum nome vazio');
  eq(new Set(PROFESSORES).size, PROFESSORES.length, 'nenhum nome repetido');
  eq([...PROFESSORES].sort((a, b) => a.localeCompare(b, 'pt-BR')).join('|'), PROFESSORES.join('|'), 'a lista está em ordem alfabética');

  // As fileiras cobrem todo mundo, e só a última pode vir incompleta.
  const fileiras = fileirasDeProfessor();
  eq(fileiras.flat().join('|'), PROFESSORES.join('|'), 'as fileiras cobrem o quadro inteiro, na ordem');
  eq(fileiras.slice(0, -1).every(f => f.length === 3), true, 'três por fileira');
  ok(fileiras[fileiras.length - 1].length <= 3, 'e a última no máximo isso');
  eq(fileirasDeProfessor([]).length, 0, 'quadro vazio não gera fileira');
  eq(fileirasDeProfessor(['A']).length, 1, 'um professor gera uma fileira');
}

// ------------------------------------------------- data de abertura da ATA
// A ATA é assinada no dia em que é gerada. A data vem do relógio, e o dia 1º
// muda a concordância da frase inteira.
{
  eq(aberturaDaAta(new Date(2026, 7, 21)).startsWith('Aos 21 dias do mês de agosto de dois mil e vinte e seis'), true, 'dia, mês e ano na abertura');
  eq(aberturaDaAta(new Date(2026, 7, 1)).startsWith('Ao primeiro dia do mês de agosto'), true, 'dia 1º sai como "Ao primeiro dia", não "Aos 1 dias"');
  eq(aberturaDaAta(new Date(2026, 7, 2)).startsWith('Aos 2 dias'), true, 'e o dia 2 volta ao plural');
  eq(aberturaDaAta(new Date(2026, 11, 15)).startsWith('Aos 15 dias do mês de dezembro'), true, 'dezembro é o último mês da lista, e não estoura');
  eq(aberturaDaAta(new Date(2026, 0, 31)).startsWith('Aos 31 dias do mês de janeiro'), true, 'janeiro é o primeiro');
  ok(aberturaDaAta(new Date(2026, 7, 21)).endsWith('da turma '), 'a frase termina aberta: o nome da turma entra em negrito depois dela');
  ok(!aberturaDaAta().includes('____'), 'não sobra lacuna de data para preencher à mão');
}

// ----------------------------------------------- células da ATA em Word
// A ATA em .docx tem que dizer exatamente o que a ATA da tela diz, campo em
// branco incluído: é o mesmo documento, em outro formato.
{
  const linha = ['FULANA DE TAL', '6º ANO A', 'MATEMATICA', '3', '4', '7', '1º bimestre', 'Concluído'];
  const celulas = celulasDaAta([linha]);

  eq(celulas[0], ATA_COLUNAS, 'a primeira linha é o cabeçalho');
  eq(celulas[0].length, 7, 'sete colunas, como a ATA da tela');
  eq(celulas[1], ['FULANA DE TAL', 'MATEMATICA', '3', '4', '7', '1º bimestre', 'Recuperou'], 'a turma não vira coluna: ela já é o título da ATA');
  eq(celulas[1].length, celulas[0].length, 'linha e cabeçalho com a mesma largura');

  // Sem nota lançada, a ATA sai com a lacuna para preencher à mão.
  const pendente = celulasDaAta([['ALUNO', 'T', 'HISTORIA', '2', '—', '—', '', 'Pendente']])[1];
  eq(pendente, ['ALUNO', 'HISTORIA', '2', '—', '____', '____', '____'], 'nota, bimestre e desfecho vazios viram lacuna');

  // Não realizou é informação, não lacuna: tem que aparecer escrito.
  eq(celulasDaAta([['ALUNO', 'T', 'HISTORIA', '2', '3', 'Não realizou', '', 'Concluído']])[1][4], 'Não realizou', 'Não realizou aparece escrito na ATA');

  eq(celulasDaAta([]).length, 1, 'turma sem linha nenhuma sai só com o cabeçalho');

  for (const [entrada, esperado] of [
    ['6º ANO A', 'ata-6-ano-a.docx'],
    ['1ª SÉRIE A INTEGRAL', 'ata-1-serie-a-integral.docx'],
    ['', 'ata-turma.docx'],
    [null, 'ata-turma.docx'],
  ]) {
    eq(nomeDoArquivoAta(entrada), esperado, `nome do arquivo: ${entrada}`);
  }
  // Nome de arquivo não pode carregar acento nem barra: quebra download em
  // parte dos navegadores e vira caminho no Windows.
  ok(!/[^a-z0-9.-]/.test(nomeDoArquivoAta('9º ANO/B ÇÃO')), 'o nome sai só com letra, número, ponto e hífen');

  // Baixar Excel usa o mesmo nome de arquivo, só trocando a extensão.
  eq(nomeDoArquivoAta('6º ANO A', 'xlsx'), 'ata-6-ano-a.xlsx', 'mesmo nome, extensão xlsx');

  // A biblioteca do Word vem de CDN de terceiro. Sem SRI, quem controla o CDN
  // controla o que roda nesta página, que tem nome e nota de aluno na tela.
  const carregador = grab(/^function carregarDocx\(\).*$/m);
  ok(/script\.integrity=DOCX_SRI/.test(carregador), 'o script do Word é carregado com integrity');
  ok(/script\.crossOrigin='anonymous'/.test(carregador), 'e com crossorigin, sem o qual o integrity não é verificado');
  ok(/^const DOCX_SRI='sha384-[A-Za-z0-9+/]{64}=*';$/m.test(source), 'o SRI é um sha384 de verdade, não um placeholder');
  ok(/^const DOCX_URL='https:\/\/[^']+@\d+\.\d+\.\d+\//m.test(source), 'a URL do CDN fixa uma versão exata: "latest" mudaria o arquivo por baixo do SRI');
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

// ============================================ Mapão pós-recuperação
// A nota da recuperação semestral voltou sobrescrita na célula do bimestre, sem
// coluna própria. Tudo aqui é a comparação entre o que está na tela e o Mapão
// novo — a única fonte da nota, agora.

// ------------------------------------------- leitura com todas as notas
{
  const rows = [
    ['ALUNO', 'SITUAÇÃO', 'MATEMATICA (1B)', 'MATEMATICA (2B)'],
    ['ANA CLARA DE SOUZA', 'Ativo', '3', '8'],
  ];
  const nome = 'Mapao_Consolidado_6° ANO A INTEGRAL 9H ANUAL.xlsx';

  const comoSempre = parseSheet(rows, nome);
  eq(comoSempre.records.map(r => `${r.bimestre}:${r.nota}`), ['1º:3'],
     'sem o parâmetro, parseSheet entrega o que sempre entregou: só abaixo de 5');

  const tudo = parseSheet(rows, nome, true);
  eq(tudo.records.map(r => `${r.bimestre}:${r.nota}`).sort(), ['1º:3', '2º:8'],
     'com todasAsNotas, quem recuperou também vem — é justamente essa a nota que falta');

  // Conceito continua fora: ES, ET e EP não são número e nunca viraram nota.
  const conceitos = parseSheet([
    ['ALUNO', 'SITUAÇÃO', 'ESPORTE-MUSICA-ARTE (1B)'],
    ['ANA CLARA DE SOUZA', 'Ativo', 'ES'],
  ], nome, true);
  eq(conceitos.records, [], 'conceito não vira nota nem com todasAsNotas');
}

// ------------------------------------------------------- a tabela do diff
{
  // Linha da tela: aluno, turma, disciplina, 1º, 2º, nota rec, bimestre, status.
  const linha = (nota1, nota2, rec = '—', bim = '1º bimestre') =>
    ['ANA CLARA DE SOUZA', '6° ANO A', 'MATEMÁTICA', nota1, nota2, rec, bim, 'Pendente'];
  const mapao = (n1, n2) => [
    ...(n1 === null ? [] : [{ aluno: 'ANA CLARA DE SOUZA', turma: '6° ANO A', disciplina: 'MATEMÁTICA', bimestre: '1º', nota: n1 }]),
    ...(n2 === null ? [] : [{ aluno: 'ANA CLARA DE SOUZA', turma: '6° ANO A', disciplina: 'MATEMÁTICA', bimestre: '2º', nota: n2 }]),
  ];

  // Um bimestre candidato subiu: é a nota da recuperação, e é o bimestre substituído.
  {
    const r = aplicarPosRecuperacao([linha('3', '4')], mapao(3, 7));
    eq([r.linhas[0][5], r.linhas[0][6]], ['7', '2º bimestre'], 'o bimestre que subiu é o substituído');
    eq(r.linhas[0][7], 'Concluído', 'linha resolvida');
    eq([r.preenchidas, r.naoRecuperou, r.divergencias.length], [1, 0, 0], 'uma linha preenchida');
  }

  // Nenhum mudou: fez e não alcançou, ou faltou. O diff não separa os dois, e a
  // coordenação decidiu que ambos são Não recuperou.
  {
    const r = aplicarPosRecuperacao([linha('3', '4')], mapao(3, 4));
    eq([r.linhas[0][5], r.linhas[0][6]], [NO_RECOVERY, ''], 'nada mudou, ninguém recuperou');
    eq(r.linhas[0][7], 'Concluído', 'Não recuperou fecha a linha, como Não realizou');
    eq([r.preenchidas, r.naoRecuperou], [0, 1], 'contado como não recuperou');
  }

  // Subiu mas continuou abaixo de 5: a nota entra e o bimestre é substituído.
  // O desfecho é que responde "alcançou 5,0?".
  {
    const r = aplicarPosRecuperacao([linha('2', '4')], mapao(4, 4));
    eq([r.linhas[0][5], r.linhas[0][6]], ['4', '1º bimestre'], 'nota abaixo de 5 também é nota de recuperação');
    eq(desfecho(r.linhas[0]), NO_RECOVERY, 'subiu, mas não alcançou média');
  }

  // Os dois bimestres mudaram: o item 7.3 do FAQ diz que só um é alterado.
  {
    const r = aplicarPosRecuperacao([linha('3', '4')], mapao(6, 7));
    eq(r.linhas[0][5], '—', 'nada é aplicado');
    eq(r.divergencias.map(d => d.motivo), ['os dois bimestres mudaram'], 'vira divergência');
  }

  // Nota caiu.
  {
    const r = aplicarPosRecuperacao([linha('3', '4')], mapao(3, 2));
    eq(r.linhas[0][5], '—', 'nota que cai não é aplicada');
    eq(r.divergencias.length, 1, 'e é divergência');
  }

  // Nota quebrada. O Mapão real manda inteiro; arredondar seria mexer em nota de
  // aluno em documento oficial.
  {
    const r = aplicarPosRecuperacao([linha('3', '4')], mapao(3, 6.5));
    eq(r.linhas[0][5], '—', 'decimal não é arredondado');
    eq(r.divergencias.map(d => d.motivo), ['nota não inteira no Mapão pós-recuperação'], 'decimal vira divergência');
  }

  // Linha que sumiu do Mapão novo.
  {
    const r = aplicarPosRecuperacao([linha('3', '4')], []);
    eq(r.linhas[0][5], '—', 'linha ausente fica como estava');
    eq(r.divergencias.map(d => d.motivo), ['linha não encontrada no Mapão pós-recuperação'], 'ausência é divergência');
  }

  // Bimestre que não estava em recuperação é ruído: '—' quer dizer que a nota era
  // 5,0 ou mais. Mudança ali não pode ser lida como nota de recuperação.
  {
    const r = aplicarPosRecuperacao([linha('—', '4')], mapao(9, 4));
    eq([r.linhas[0][5], r.linhas[0][6]], [NO_RECOVERY, ''], 'o 1º bimestre não é candidato, então nada mudou');
  }
  {
    const r = aplicarPosRecuperacao([linha('—', '4')], mapao(9, 8));
    eq([r.linhas[0][5], r.linhas[0][6]], ['8', '2º bimestre'], 'só o candidato conta, e ele subiu');
  }

  // Já preenchida à mão e o Mapão discorda: o Mapão vence, e a divergência fica
  // visível — o valor oficial entra, e o conflito não some.
  {
    const r = aplicarPosRecuperacao([linha('3', '4', '5', '1º bimestre')], mapao(3, 7));
    eq(r.linhas[0][5], '7', 'o Mapão vence a digitação manual');
    eq(r.divergencias.length, 1, 'o conflito continua visível');
    ok(/o Mapão diz 7 e a lista tinha 5/.test(r.divergencias[0].motivo), 'a divergência diz os dois valores');
  }

  // Acento e caixa não separam a mesma linha: a chave passa por normal().
  {
    const linhas = [['ANA CLARA DE SOUZA', '6° ANO A', 'MATEMÁTICA', '3', '—', '—', '1º bimestre', 'Pendente']];
    const r = aplicarPosRecuperacao(linhas, [{ aluno: 'Ana Clara de Souza', turma: '6° ANO A', disciplina: 'MATEMATICA', bimestre: '1º', nota: 8 }]);
    eq(r.linhas[0][5], '8', 'MATEMATICA do Mapão e MATEMÁTICA da tela são a mesma linha');
  }

  // Nada é mutado no lugar: a lista antiga continua servindo para o Cancelar.
  {
    const antes = [linha('3', '4')];
    const copia = antes.map(l => l.slice());
    aplicarPosRecuperacao(antes, mapao(3, 7));
    eq(antes, copia, 'aplicarPosRecuperacao não mexe na lista que recebeu');
  }
}

// -------------------------------------------------------------- notasPosRecuperacao
{
  const mapa = notasPosRecuperacao([
    { aluno: 'ANA', turma: '6° ANO A', disciplina: 'MATEMATICA', bimestre: '1º', nota: 3 },
    { aluno: 'ANA', turma: '6° ANO A', disciplina: 'MATEMATICA', bimestre: '2º', nota: 7 },
  ]);
  eq([...mapa.values()], [{ '1º': 3, '2º': 7 }], 'os dois bimestres do mesmo componente ficam na mesma entrada');
}

// -------------------------------------------------------------------- desfecho
{
  const com = valor => desfecho(['A', 'T', 'D', '3', '4', valor, '1º bimestre', '']);
  eq(com('5'), 'Recuperou', '5,0 alcança a média');
  eq(com('10'), 'Recuperou', 'nota cheia');
  eq(com('4'), NO_RECOVERY, 'abaixo de 5 não alcança');
  eq(com('1'), NO_RECOVERY, 'nota mínima');
  eq(com(NO_RECOVERY), NO_RECOVERY, 'marcado à mão');
  eq(com(NO_EXAM), NO_EXAM, 'quem não fez a prova não é o mesmo que não recuperou');
  eq(com('—'), '', 'nada lançado, nada a dizer');
}

// ------------------------------------------------- Não recuperou no resto do app
{
  ok(semNota(NO_EXAM) && semNota(NO_RECOVERY), 'os dois desfechos sem nota moram no mesmo conjunto');
  ok(!semNota('5') && !semNota('—'), 'nota e vazio não são desfecho');

  // Linha que volta da planilha preenchida ou da sala: Não recuperou sobrevive e
  // limpa o bimestre, como Não realizou já fazia.
  eq(notaRecuperacao('Não recuperou'), NO_RECOVERY, 'o validador aceita Não recuperou');
  eq(notaRecuperacao('nao recuperou'), NO_RECOVERY, 'sem acento e em caixa baixa também');
  eq(notaRecuperacao('Não recuperou muito'), '—', 'texto parecido não passa');
  const linha = linhasDaSala([['chave', 'ANA', '6° ANO A', 'MATEMATICA', '3', '4', 'Não recuperou', '2']])[0];
  eq([linha[5], linha[6]], [NO_RECOVERY, ''], 'Não recuperou não tem bimestre a substituir');
  eq(linha[7], 'Concluído', 'e fecha a linha');

  eq(rowStatus(['A', 'T', 'D', '3', '4', NO_RECOVERY, '', '']), 'Concluído', 'rowStatus conhece o desfecho novo');
}

// ------------------------------------------------------- a coluna nova na ATA
{
  ok(ATA_COLUNAS.includes('Desfecho'), 'a ATA tem coluna de desfecho');
  eq(ATA_COLUNAS.length, 7, 'sete colunas');
  const celulas = celulasDaAta([
    ['ANA', '6° ANO A', 'MATEMÁTICA', '3', '4', '7', '2º bimestre', 'Concluído'],
    ['BRUNO', '6° ANO A', 'HISTÓRIA', '2', '—', NO_RECOVERY, '', 'Concluído'],
  ]);
  eq(celulas[0].length, 7, 'cabeçalho com sete células');
  eq(celulas[1], ['ANA', 'MATEMÁTICA', '3', '4', '7', '2º bimestre', 'Recuperou'], 'quem alcançou média');
  eq(celulas[2], ['BRUNO', 'HISTÓRIA', '2', '—', NO_RECOVERY, '-', NO_RECOVERY], 'Não recuperou aparece escrito, como Não realizou já aparecia');
}

// ------------------------------------- bimestre substituído de quem não recuperou
// Quem não recuperou não substitui bimestre nenhum. A lacuna ____ pedia que
// alguém preenchesse à mão o que não existe, então ali vai um traço.
{
  const bimestre = linha => celulasDaAta([linha])[1][5];
  eq(bimestre(['BRUNO', 'T', 'HISTÓRIA', '2', '—', NO_RECOVERY, '', 'Concluído']), '-', 'Não recuperou sai com traço');
  eq(bimestre(['CARLA', 'T', 'HISTÓRIA', '2', '—', '3', '', 'Concluído']), '-', 'nota de recuperação abaixo de 5 também não substitui bimestre');
  eq(bimestre(['DINA', 'T', 'HISTÓRIA', '2', '—', NO_EXAM, '', 'Concluído']), '-', 'quem não realizou a prova idem');
  eq(bimestre(['ELIAS', 'T', 'HISTÓRIA', '2', '—', '7', '1º bimestre', 'Concluído']), '1º bimestre', 'quem recuperou mantém o bimestre escolhido');
  // O Mapão pós-recuperação sugere bimestre para toda nota que subiu, inclusive
  // a que subiu sem alcançar 5,0. Nesse caso o traço vence a sugestão.
  eq(bimestre(['HELIO', 'T', 'HISTÓRIA', '2', '—', '4', '1º bimestre', 'Concluído']), '-', 'nota que subiu sem alcançar média sai com traço, mesmo com bimestre sugerido');
  eq(bimestre(['FABIO', 'T', 'HISTÓRIA', '2', '—', '7', '', 'Pendente']), '____', 'recuperou sem bimestre escolhido continua lacuna para preencher');
  eq(bimestre(['GINA', 'T', 'HISTÓRIA', '2', '—', '—', '', 'Pendente']), '____', 'sem nota lançada, nada a decidir ainda');
}

// ----------------------------------------------------------- cores da ATA
// Uma regra só para tela, impressão e Word: vermelho para nota abaixo de 5,0 e
// para Não recuperou; verde para nota a partir de 5,0 e para Recuperou.
{
  eq(classeDaCelula(2, '4'), 'nota-baixa', 'nota do primeiro bimestre abaixo de 5 em vermelho');
  eq(classeDaCelula(3, '4,5'), 'nota-baixa', 'vírgula decimal também é lida');
  eq(classeDaCelula(4, '3'), 'nota-baixa', 'nota da recuperação abaixo de 5 em vermelho');
  eq(classeDaCelula(4, '5'), 'nota-recuperou', 'nota 5 já é verde: a média é alcançada em 5,0');
  eq(classeDaCelula(2, '10'), 'nota-recuperou', 'nota do bimestre a partir de 5 em verde');
  eq(classeDaCelula(6, 'Recuperou'), 'nota-recuperou', 'Recuperou em verde');
  eq(classeDaCelula(6, NO_RECOVERY), 'nota-baixa', 'Não recuperou em vermelho');
  eq(classeDaCelula(4, NO_RECOVERY), 'nota-baixa', 'e também na coluna de nota, onde o mesmo texto aparece');
  eq(classeDaCelula(6, NO_EXAM), '', 'Não realizou não é aprovação nem reprovação: fica sem cor');
  eq(classeDaCelula(6, '____'), '', 'desfecho em branco fica sem cor');
  eq(classeDaCelula(4, '____'), '', 'lacuna de nota fica sem cor');
  eq(classeDaCelula(4, NO_EXAM), '', 'Não realizou continua sem cor em qualquer coluna');
  eq(classeDaCelula(0, '4'), '', 'nome de aluno nunca ganha cor');
  eq(classeDaCelula(5, '1º bimestre'), '', 'bimestre substituído nunca ganha cor');

  // As três colunas de nota saem centralizadas, e a cor vai junto no mesmo
  // atributo. Aluno, disciplina, bimestre e desfecho seguem alinhados à esquerda.
  eq(classesDaCelula(2, '4'), 'nota-baixa nota-centro', 'nota abaixo de 5 sai vermelha e centralizada');
  eq(classesDaCelula(4, '7'), 'nota-recuperou nota-centro', 'nota a partir de 5 sai verde e centralizada');
  eq(classesDaCelula(3, '____'), 'nota-centro', 'lacuna de nota é centralizada mesmo sem cor');
  eq(classesDaCelula(0, 'ALUNA'), '', 'nome de aluno não é centralizado');
  eq(classesDaCelula(5, '-'), 'nota-centro', 'o bimestre substituído é centralizado, sem cor');
  eq(classesDaCelula(5, '1º bimestre'), 'nota-centro', 'e o bimestre escrito também');
  eq(classesDaCelula(6, 'Recuperou'), 'nota-recuperou', 'o desfecho tem cor, não centralização');
  eq(classesDaCelula(1, 'MATEMÁTICA'), '', 'disciplina é texto: fica à esquerda');
}

// ------------------------------------------- nome do aluno uma vez por bloco
// Quem tem vários componentes ocupa linhas seguidas. O nome sai uma vez, na
// primeira linha do bloco, e a célula é mesclada para baixo em todas as saídas.
{
  const linha = (aluno, disciplina) => [aluno, disciplina, '3', '—', '____', '____', '____'];
  eq(blocosDoAluno([]), [], 'turma vazia não tem bloco');
  eq(blocosDoAluno([linha('ANA', 'MATEMÁTICA')]), [1], 'aluno com um componente é um bloco de uma linha');
  eq(blocosDoAluno([linha('ANA', 'MATEMÁTICA'), linha('ANA', 'HISTÓRIA'), linha('ANA', 'GEOGRAFIA')]), [3, 0, 0],
    'três componentes do mesmo aluno viram um bloco de três, e o tamanho fica na primeira linha');
  eq(blocosDoAluno([linha('ANA', 'MATEMÁTICA'), linha('BRUNO', 'HISTÓRIA')]), [1, 1], 'alunos diferentes não se juntam');
  eq(blocosDoAluno([linha('ANA', 'MATEMÁTICA'), linha('BRUNO', 'HISTÓRIA'), linha('ANA', 'GEOGRAFIA')]), [1, 1, 1],
    'só sequência agrupa: aluno separado por outro vira dois blocos');
  const somaDosBlocos = linhas => blocosDoAluno(linhas).reduce((total, n) => total + n, 0);
  eq(somaDosBlocos([linha('ANA', 'A'), linha('ANA', 'B'), linha('BRUNO', 'C'), linha('BRUNO', 'D'), linha('CARLA', 'E')]), 5,
    'os blocos cobrem todas as linhas, sem sobra nem falta');
}


console.log(`ok — ${checks} verificações`);
