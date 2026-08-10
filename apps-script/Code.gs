/**
 * Caixa de dados das salas do Mapa Norte.
 *
 * Este arquivo NÃO conhece regra nenhuma da recuperação semestral: não sabe o
 * que é Mapão, nota abaixo de 5, aluno transferido ou componente sem prova.
 * Ele guarda linhas e devolve linhas. O parser mora só no app.js do GitHub
 * Pages, e é assim que fica — o projeto já teve dois parsers em 2026 e uma
 * correção chegou a entrar só num lado. O teste em test-parser.mjs reprova se
 * lógica de parser aparecer aqui dentro.
 *
 * Até a comparação de chave é burra: quem monta a chave
 * `ALUNO|TURMA|DISCIPLINA`, já normalizada, é o app.js. Aqui só se compara
 * string com string.
 */

const PLANILHA_NOME = 'Mapa Norte — Salas';
const CABECALHO = ['chave', 'aluno', 'turma', 'disciplina', 'nota1', 'nota2', 'recuperacao', 'bimestre'];
const MAX_LINHAS = 2000;
const MAX_TEXTO = 200;

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// A planilha é criada no primeiro uso e o id fica guardado. Ela vive no Drive
// de quem implantou o Web App, e é lá que o dado de aluno realmente mora.
function planilha_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('planilha');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (erro) { /* apagada ou sem acesso: cria outra */ }
  }
  const nova = SpreadsheetApp.create(PLANILHA_NOME);
  props.setProperty('planilha', nova.getId());
  return nova;
}

function aba_(sala, criar) {
  const arquivo = planilha_();
  const existente = arquivo.getSheetByName(sala);
  if (existente || !criar) return existente;
  const nova = arquivo.insertSheet(sala);
  nova.appendRow(CABECALHO);
  return nova;
}

// A versão é um contador em ScriptProperties, não na planilha. Quem está
// acompanhando pergunta a versão a cada poucos segundos, e essa leitura
// precisa ser barata: abrir a planilha a cada consulta gastaria cota à toa.
function versao_(sala) {
  return Number(PropertiesService.getScriptProperties().getProperty('v_' + sala) || 0);
}

function novaVersao_(sala) {
  const versao = versao_(sala) + 1;
  PropertiesService.getScriptProperties().setProperty('v_' + sala, String(versao));
  return versao;
}

// O código da sala é o único segredo: a implantação é aberta a qualquer um,
// por escolha de não exigir login. Formato curto demais aqui vira convite a
// tentativa por força bruta, então o mínimo é 8 e o app.js gera 12.
function salaValida_(sala) {
  return /^[A-Z0-9]{8,32}$/.test(String(sala || ''));
}

function texto_(valor) {
  return String(valor == null ? '' : valor).slice(0, MAX_TEXTO);
}

function acharLinha_(chaves, chave) {
  return chaves.indexOf(String(chave || ''));
}

function doGet(e) {
  const parametros = (e && e.parameter) || {};
  const sala = String(parametros.sala || '').toUpperCase();
  if (!salaValida_(sala)) return json_({ erro: 'sala inválida' });
  if (parametros.acao === 'versao') return json_({ versao: versao_(sala) });
  const aba = aba_(sala, false);
  if (!aba) return json_({ versao: 0, escola: '', linhas: [] });
  const valores = aba.getDataRange().getValues();
  return json_({
    versao: versao_(sala),
    escola: PropertiesService.getScriptProperties().getProperty('e_' + sala) || '',
    linhas: valores.slice(1),
  });
}

function doPost(e) {
  let corpo;
  try {
    corpo = JSON.parse(e.postData.contents);
  } catch (erro) {
    return json_({ erro: 'corpo inválido' });
  }
  const sala = String(corpo.sala || '').toUpperCase();
  if (!salaValida_(sala)) return json_({ erro: 'sala inválida' });

  // Duas pessoas digitando ao mesmo tempo é o caso normal aqui, não a exceção.
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(20000)) return json_({ erro: 'ocupado' });
  try {
    if (corpo.acao === 'salvar') return salvar_(sala, corpo);
    if (corpo.acao === 'lancar') return lancar_(sala, corpo);
    return json_({ erro: 'ação desconhecida' });
  } finally {
    trava.releaseLock();
  }
}

// Troca o lote inteiro. Só quem importa o Mapão chama isso, e o app.js já
// mesclou o que veio do servidor antes de mandar — por isso aqui é substituição
// pura, sem regra de quem vence.
function salvar_(sala, corpo) {
  const linhas = (corpo.linhas || []).slice(0, MAX_LINHAS)
    .map(function (linha) { return CABECALHO.map(function (_, i) { return texto_(linha[i]); }); })
    .filter(function (linha) { return linha[0] && linha[1]; });
  const aba = aba_(sala, true);
  aba.clear();
  aba.appendRow(CABECALHO);
  if (linhas.length) aba.getRange(2, 1, linhas.length, CABECALHO.length).setValues(linhas);
  PropertiesService.getScriptProperties().setProperty('e_' + sala, texto_(corpo.escola));
  return json_({ versao: novaVersao_(sala), linhas: linhas.length });
}

// Uma nota digitada mexe em duas células de uma linha só. É o caminho comum, e
// é o que faz duas pessoas digitarem juntas sem uma apagar a outra.
function lancar_(sala, corpo) {
  const aba = aba_(sala, false);
  if (!aba) return json_({ erro: 'sala não existe' });
  const chaves = aba.getRange(1, 1, aba.getLastRow(), 1).getValues()
    .map(function (linha) { return String(linha[0]); });
  const indice = acharLinha_(chaves, corpo.chave);
  if (indice < 1) return json_({ erro: 'linha não encontrada' });
  aba.getRange(indice + 1, 7, 1, 2).setValues([[texto_(corpo.recuperacao), texto_(corpo.bimestre)]]);
  return json_({ versao: novaVersao_(sala) });
}
