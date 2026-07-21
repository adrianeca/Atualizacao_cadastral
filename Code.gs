var SPREADSHEET_ID          = '1BDiPjv0FqRJp5EwcvLdYXVvEAWesvwdEgbhYdnTlqPY';
var SHEET_GID               = 566990656;
var EMAIL_DP                = 'dp@brasas.com';
var NOME_ABA                = 'Atualizações Cadastrais 2026';
var PASTA_DOCUMENTOS_ID     = '1IuU9YLh4kiXg1p-xgNiZruUL9ddnD345';
var USUARIOS_SPREADSHEET_ID = '1eZPbzhzjhjHoPwMhAW5YvOZgYiAvlTYc07dRan6Lyoc';
var USUARIOS_SHEET_GID      = 1120979656;

// Sigla da unidade (coluna V da aba de funcionários) → nome completo da pasta no Drive
var UNIDADES_MAP = {
  'BF': 'Botafogo',
  'CG': 'Campo Grande',
  'NS': 'Cachambi',
  'CP': 'Copacabana',
  'CX': 'Caxias',
  'DT': 'Downtown',
  'FG': 'Freguesia',
  'IG': 'Ilha do Governador',
  'IP': 'Ipanema',
  'IT': 'Itaipu',
  'MRI': 'Méier',
  'NI': 'Nova Iguaçu',
  'NL': 'Novo Leblon',
  'NT': 'Niterói',
  'PO': 'Parque Olímpico',
  'RC': 'Recreio',
  'TJ': 'Tijuca',
  'TQ': 'Taquara',
  'VP': 'Vila da Penha',
  'VQ': 'Vila Valqueire',
  'BG': 'Bangu',
  'ONLINE': 'ONLINE',
  'LJ': 'Laranjeiras',
  'PC': 'Pechincha',
  'PN': 'Península',
  'GR': 'Grajaú',
  'VO': 'Vila Olímpia',
  'BOD': 'BRASAS ON DEMAND',
  'EC NEW': 'EC NEW',
  'MÉTODOS': 'MÉTODOS',
  'EDITORA': 'EDITORA'
};

// ── Entry point ──────────────────────────────────────────────────────────────

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Atualização Cadastral 2026 — BRASAS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── CPF lookup ────────────────────────────────────────────────────────────────

function buscarFuncionarioPorCPF(cpf) {
  var cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) {
    return { ok: false, msg: 'CPF inválido. Verifique o número informado.' };
  }

  var ss     = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet  = null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() == SHEET_GID) { sheet = sheets[i]; break; }
  }
  if (!sheet) return { ok: false, msg: 'Planilha de funcionários não encontrada.' };

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, msg: 'Sem dados na planilha.' };

  // Colunas: C = índice 2 (nome), F = índice 5 (função), V = índice 21 (sigla da unidade), AT = índice 45 (CPF)
  var data = sheet.getRange(2, 1, lastRow - 1, 46).getValues();

  for (var r = 0; r < data.length; r++) {
    var cpfCelula = String(data[r][45]).replace(/\D/g, '');
    if (cpfCelula === cpfLimpo) {
      var nome     = String(data[r][2] || '').trim();
      var funcao   = String(data[r][5] || '').trim();
      var siglaUn  = String(data[r][21] || '').trim().toUpperCase();
      var unidade  = UNIDADES_MAP[siglaUn] || siglaUn;
      if (!nome) return { ok: false, msg: 'CPF encontrado, mas sem nome cadastrado. Entre em contato com o RH.' };
      return { ok: true, nome: nome, funcao: funcao, unidade: unidade };
    }
  }

  return { ok: false, msg: 'CPF não encontrado. Verifique o número ou entre em contato com o RH.' };
}

// ── Envio da declaração ───────────────────────────────────────────────────────

function enviarDeclaracao(dados) {
  var hoje = new Date();
  var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho',
               'agosto','setembro','outubro','novembro','dezembro'];
  var dataFormatada = hoje.getDate() + ' de ' + meses[hoje.getMonth()] + ' de ' + hoje.getFullYear();

  var cpfRaw      = dados.cpf.replace(/\D/g, '');
  var cpfFormatado = cpfRaw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  try { salvarResposta(dados, cpfFormatado, hoje); } catch(e) { Logger.log('Erro ao salvar: ' + e.message); }

  var assunto    = 'Atualização Cadastral 2026 - ' + dados.nome;
  var corpoTexto = criarEmailTexto(dados, cpfFormatado, dataFormatada);
  var corpoHtml  = criarEmailHtml(dados, cpfFormatado, dataFormatada);

  var attachments = [];
  var nomeBase    = dados.nome.replace(/\s+/g, '_');

  if (dados.docNome) {
    try {
      attachments.push(Utilities.newBlob(
        Utilities.base64Decode(dados.docNome.data),
        dados.docNome.type || 'application/octet-stream',
        'Alteracao_Nome_' + nomeBase + _ext(dados.docNome.name)
      ));
    } catch(e) { Logger.log('Erro blob docNome: ' + e); }
  }

  if (dados.comprovanteRes) {
    try {
      attachments.push(Utilities.newBlob(
        Utilities.base64Decode(dados.comprovanteRes.data),
        dados.comprovanteRes.type || 'application/octet-stream',
        'Comprovante_Residencia_' + nomeBase + _ext(dados.comprovanteRes.name)
      ));
    } catch(e) { Logger.log('Erro blob comprovanteRes: ' + e); }
  }

  if (dados.docsDependente && dados.docsDependente.length > 0) {
    dados.docsDependente.forEach(function(doc, idx) {
      try {
        attachments.push(Utilities.newBlob(
          Utilities.base64Decode(doc.data),
          doc.type || 'application/octet-stream',
          'Documento_Dependente_' + nomeBase + '_' + (idx + 1) + _ext(doc.name)
        ));
      } catch(e) { Logger.log('Erro blob docDependente[' + idx + ']: ' + e); }
    });
  }

  if (dados.docEstadoCivil) {
    try {
      attachments.push(Utilities.newBlob(
        Utilities.base64Decode(dados.docEstadoCivil.data),
        dados.docEstadoCivil.type || 'application/octet-stream',
        'Doc_Estado_Civil_' + nomeBase + _ext(dados.docEstadoCivil.name)
      ));
    } catch(e) { Logger.log('Erro blob docEstadoCivil: ' + e); }
  }

  if (dados.docsEscolaridade && dados.docsEscolaridade.length > 0) {
    dados.docsEscolaridade.forEach(function(doc, idx) {
      try {
        attachments.push(Utilities.newBlob(
          Utilities.base64Decode(doc.data),
          doc.type || 'application/octet-stream',
          'Comprovante_Escolaridade_' + nomeBase + '_' + (idx + 1) + _ext(doc.name)
        ));
      } catch(e) { Logger.log('Erro blob docEscolaridade[' + idx + ']: ' + e); }
    });
  }

  _salvarDocumentosNoDrive(dados.nome, dados.unidade, attachments);

  try {
    var opts = { htmlBody: corpoHtml, name: 'BRASAS - Departamento Pessoal', replyTo: EMAIL_DP };
    if (attachments.length > 0) opts.attachments = attachments;
    GmailApp.sendEmail(dados.emailPessoal, assunto, corpoTexto, opts);
    return { ok: true };
  } catch(e) {
    return { ok: false, msg: e.message };
  }
}

// ── Salvar resposta na planilha ───────────────────────────────────────────────

function salvarResposta(dados, cpfFormatado, data) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(NOME_ABA);

  var NOVOS_HEADERS = ['Doc. Dependente', 'Qtd. Dependentes', 'Alteração de Nome', 'Nome Atualizado', 'Doc. Alt. Nome', 'Comprovante Residência', 'Doc. Escolaridade', 'Doc. Estado Civil', 'Número', 'Unidade'];

  if (!sheet) {
    sheet = ss.insertSheet(NOME_ABA);
    var headers = [
      'Data/Hora', 'Nome', 'CPF', 'Cargo',
      'Endereço', 'Complemento', 'Bairro', 'CEP', 'Cidade', 'Estado',
      'Telefone', 'E-mail Pessoal', 'Estado Civil', 'Alteração Dependentes', 'Escolaridade'
    ].concat(NOVOS_HEADERS);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
         .setFontWeight('bold').setBackground('#4169e1').setFontColor('white');
    sheet.setFrozenRows(1);
  } else {
    var existH = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    NOVOS_HEADERS.forEach(function(h) {
      if (existH.indexOf(h) < 0) {
        var c = sheet.getLastColumn() + 1;
        sheet.getRange(1, c).setValue(h).setFontWeight('bold').setBackground('#4169e1').setFontColor('white');
        existH.push(h);
      }
    });
  }

  sheet.appendRow([
    Utilities.formatDate(data, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
    _upper(dados.nome), cpfFormatado, _upper(dados.funcao),
    _upper(dados.endereco), _upper(dados.complemento), _upper(dados.bairro), dados.cep,
    _upper(dados.cidade), dados.estado, dados.telefone, dados.emailPessoal,
    _upper(dados.estadoCivil), _upper(dados.alteracaoDependentes), _upper(dados.escolaridade),
    (dados.docsDependente && dados.docsDependente.length > 0) ? 'Sim (' + dados.docsDependente.length + ')' : 'Não',
    _upper(dados.qtdDependentes),
    _upper(dados.alteracaoNome || 'Não'),
    _upper(dados.nomeAtualizado),
    dados.docNome         ? 'Sim' : 'Não',
    dados.comprovanteRes  ? 'Sim' : 'Não',
    (dados.docsEscolaridade && dados.docsEscolaridade.length > 0) ? 'Sim (' + dados.docsEscolaridade.length + ')' : 'Não',
    dados.docEstadoCivil  ? 'Sim' : 'Não',
    _upper(dados.numero),
    _upper(dados.unidade)
  ]);
}

// ── Corpo texto plain ─────────────────────────────────────────────────────────

function criarEmailTexto(dados, cpfFormatado, dataFormatada) {
  var linhas = [
    'ATUALIZAÇÃO CADASTRAL - ANO 2026',
    '',
    '*** ESTE É UM E-MAIL AUTOMÁTICO - NÃO RESPONDA DIRETAMENTE ***',
    'Em caso de dúvidas, entre em contato diretamente com o Departamento Pessoal em dp@brasas.com.',
    '',
    'Eu, ' + dados.nome + ', inscrito(a) no CPF sob o nº ' + cpfFormatado +
    ', ocupante do cargo de ' + dados.funcao +
    ', declaro para os devidos fins de atualização de meu registro funcional, ' +
    'que meus dados seguem conforme abaixo:',
    ''
  ];

  if (dados.alteracaoNome === 'Sim') {
    linhas = linhas.concat([
      'Alteração de Nome',
      'Nome Atualizado: ' + (dados.nomeAtualizado || '—'),
      'Documento comprobatório: enviado em anexo',
      ''
    ]);
  }

  linhas = linhas.concat([
    '1. Dados de Contato e Endereço',
    'Endereço Residencial: ' + dados.endereco + '   Número: ' + (dados.numero || '—'),
    'Complemento: ' + (dados.complemento || '—') + '   Bairro: ' + dados.bairro + '   CEP: ' + dados.cep,
    'Cidade: ' + dados.cidade + '   Estado: ' + dados.estado,
    'Telefone Celular/WhatsApp: ' + dados.telefone,
    'E-mail Pessoal: ' + dados.emailPessoal,
    'Comprovante de Residência: ' + (dados.comprovanteRes ? 'enviado em anexo' : 'não enviado'),
    '',
    '2. Estado Civil e Dependentes',
    'Estado Civil: ' + dados.estadoCivil,
    'Documento comprobatório do estado civil: ' + (dados.docEstadoCivil ? 'enviado em anexo' : 'não exigido'),
    'Houve alteração no número de dependentes este ano? ' + dados.alteracaoDependentes
  ]);

  if (dados.alteracaoDependentes === 'Sim') {
    linhas.push('Quantidade de dependentes atualmente: ' + (dados.qtdDependentes || '—'));
    var numDocsDep = (dados.docsDependente && dados.docsDependente.length) || 0;
    linhas.push('Documentos do dependente: ' + (numDocsDep > 0 ? numDocsDep + ' arquivo(s) enviado(s) em anexo' : 'nenhum enviado'));
  }

  var numDocsEsc = (dados.docsEscolaridade && dados.docsEscolaridade.length) || 0;
  linhas = linhas.concat([
    '',
    '3. Escolaridade',
    'Último nível de instrução concluído: ' + dados.escolaridade,
    'Comprovante de escolaridade: ' + (numDocsEsc > 0 ? numDocsEsc + ' arquivo(s) enviado(s) em anexo' : 'não exigido'),
    '',
    '4. Declaração de Veracidade',
    'Declaro, sob as penas da lei, que as informações acima prestadas são verdadeiras e exatas. ' +
    'Comprometo-me a informar ao departamento de Recursos Humanos, no prazo máximo de 5 (cinco) dias úteis, ' +
    'qualquer alteração que venha a ocorrer em meus dados cadastrais ' +
    '(mudança de endereço, estado civil, nascimento de filhos, conclusão de cursos, etc.).',
    '',
    dados.cidade + ' - ' + dados.estado + ', ' + dataFormatada + '.'
  ]);

  return linhas.join('\n');
}

// ── Helper ────────────────────────────────────────────────────────────────────

function _ext(filename) {
  if (!filename) return '';
  var i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

function _salvarDocumentosNoDrive(nomeFunc, unidade, blobs) {
  if (!blobs || blobs.length === 0) return;
  try {
    var pastaRaiz = DriveApp.getFolderById(PASTA_DOCUMENTOS_ID);

    var nomeUnidadePasta = (unidade || 'SEM UNIDADE').toUpperCase();
    var iterUnidade  = pastaRaiz.getFoldersByName(nomeUnidadePasta);
    var pastaUnidade = iterUnidade.hasNext() ? iterUnidade.next() : pastaRaiz.createFolder(nomeUnidadePasta);

    var nomeFuncPasta = (nomeFunc || '').toUpperCase();
    var iterFunc  = pastaUnidade.getFoldersByName(nomeFuncPasta);
    var subPasta  = iterFunc.hasNext() ? iterFunc.next() : pastaUnidade.createFolder(nomeFuncPasta);

    blobs.forEach(function(blob) { subPasta.createFile(blob); });
  } catch(e) {
    Logger.log('Erro ao salvar no Drive: ' + e);
  }
}

function _upper(v) {
  return String(v || '').toUpperCase();
}

// ── Painel Admin ─────────────────────────────────────────────────────────────

// Autentica via conta Google (Session) — sem necessidade de senha.
// Requer que o Web App seja implantado com "Acesso: Qualquer pessoa com conta Google".
function getAdminDataBySession() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    return { ok: false, msg: 'Não foi possível identificar sua conta Google. Verifique se o Web App está configurado para exigir login com Google.' };
  }

  var emailLimpo  = email.toLowerCase().trim();
  var ssUsuarios  = SpreadsheetApp.openById(USUARIOS_SPREADSHEET_ID);
  var sheetUser   = null;
  var sheetsUser  = ssUsuarios.getSheets();
  for (var s = 0; s < sheetsUser.length; s++) {
    if (sheetsUser[s].getSheetId() == USUARIOS_SHEET_GID) { sheetUser = sheetsUser[s]; break; }
  }
  if (!sheetUser) return { ok: false, msg: 'Aba USUARIOS não encontrada na planilha.' };

  var userData  = sheetUser.getDataRange().getValues();
  var nomeAdmin = '';
  var ehAdmin   = false;

  for (var i = 0; i < userData.length; i++) {
    var row      = userData[i];
    var temEmail = false;
    for (var j = 0; j < row.length; j++) {
      if (String(row[j]).toLowerCase().trim() === emailLimpo) { temEmail = true; break; }
    }
    if (!temEmail) continue;

    var valorAcesso = String(row[2] || '').toLowerCase().trim();
    ehAdmin = (valorAcesso === 'admin' || valorAcesso === 'dp');
    if (ehAdmin) { nomeAdmin = email; break; }
  }

  if (!ehAdmin) {
    return { ok: false, msg: 'Sua conta Google (' + email + ') não tem permissão de acesso ao painel DP.' };
  }

  var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheetResp = ss.getSheetByName(NOME_ABA);
  if (!sheetResp || sheetResp.getLastRow() < 2) {
    return { ok: true, nomeAdmin: nomeAdmin, email: email, headers: [], rows: [], total: 0 };
  }

  var all     = sheetResp.getDataRange().getValues();
  var headers = all[0].map(String);
  var rows    = all.slice(1).map(function(r) {
    return r.map(function(c) { return c instanceof Date ? Utilities.formatDate(c, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : String(c || ''); });
  });

  return { ok: true, nomeAdmin: nomeAdmin, email: email, headers: headers, rows: rows, total: rows.length };
}

// ── Corpo HTML ────────────────────────────────────────────────────────────────

function criarEmailHtml(dados, cpfFormatado, dataFormatada) {
  function campo(label, valor) {
    return '<tr>' +
      '<td style="padding:6px 12px 6px 0;font-size:13px;color:#5f6f94;white-space:nowrap;vertical-align:top;">' + label + '</td>' +
      '<td style="padding:6px 0;font-size:13px;color:#1f2a44;font-weight:bold;">' + (valor || '—') + '</td>' +
    '</tr>';
  }

  var simNao = dados.alteracaoDependentes === 'Sim'
    ? '( &nbsp; ) Não &nbsp;&nbsp;&nbsp; <strong>( X ) Sim</strong>'
    : '<strong>( X ) Não</strong> &nbsp;&nbsp;&nbsp; ( &nbsp; ) Sim';

  var secaoAlteracaoNome = '';
  if (dados.alteracaoNome === 'Sim') {
    secaoAlteracaoNome =
      '<div style="border:1.5px solid #4169e1;border-radius:12px;padding:18px 20px;margin-bottom:16px;">' +
        '<div style="font-size:14px;font-weight:bold;color:#2f55cc;margin-bottom:12px;">Alteração de Nome</div>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          campo('Nome Atualizado:', dados.nomeAtualizado || '—') +
          campo('Documento:', 'Enviado em anexo') +
        '</table>' +
      '</div>';
  }

  var docDepStatus = '';
  if (dados.alteracaoDependentes === 'Sim') {
    var numDocsDep = (dados.docsDependente && dados.docsDependente.length) || 0;
    docDepStatus =
      '<p style="font-size:13px;color:#1f2a44;margin-top:10px;">Quantidade de dependentes: <strong>' + (dados.qtdDependentes || '—') + '</strong></p>' +
      (numDocsDep > 0
        ? '<p style="font-size:12px;color:#1f7a4d;background:#eaf7f0;border:1px solid #6fcf97;border-radius:8px;padding:10px 14px;margin-top:8px;">' +
            '📎 ' + numDocsDep + ' documento(s) do dependente enviado(s) em anexo.' +
          '</p>'
        : '<p style="font-size:12px;color:#9a6700;background:#fff6df;border:1px solid #f0c060;border-radius:8px;padding:10px 14px;margin-top:8px;">' +
            '⚠️ Nenhum documento do dependente foi anexado.' +
          '</p>');
  }

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f6fd;font-family:Arial,sans-serif;">' +
  '<div style="max-width:680px;margin:0 auto;padding:24px 16px;">' +

    // Header
    '<div style="background:linear-gradient(135deg,#4169e1,#2f55cc);border-radius:16px 16px 0 0;padding:24px 28px;color:white;">' +
      '<div style="font-size:22px;font-weight:300;letter-spacing:0.2px;">BRASAS English Course</div>' +
      '<div style="font-size:13px;opacity:0.88;margin-top:4px;">Departamento Pessoal - Atualização Cadastral 2026</div>' +
    '</div>' +

    // Body
    '<div style="background:white;border:1px solid #d6def7;border-top:none;border-radius:0 0 16px 16px;padding:32px 28px;">' +

      // Aviso de e-mail automático
      '<div style="background:#fff6df;border:1.5px solid #f0c060;border-radius:10px;padding:12px 16px;margin-bottom:20px;text-align:center;">' +
        '<p style="font-size:12.5px;color:#9a6700;font-weight:bold;margin:0;">' +
          '⚠️ ESTE É UM E-MAIL AUTOMÁTICO - NÃO RESPONDA DIRETAMENTE' +
        '</p>' +
        '<p style="font-size:11.5px;color:#9a6700;margin:6px 0 0;">' +
          'Em caso de dúvidas, entre em contato diretamente com o Departamento Pessoal em <strong>dp@brasas.com</strong>.' +
        '</p>' +
      '</div>' +

      // Title
      '<h2 style="font-size:17px;color:#2f55cc;text-align:center;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:20px;">' +
        'Atualização Cadastral - Ano 2026' +
      '</h2>' +

      // Opening paragraph
      '<p style="font-size:13px;color:#1f2a44;line-height:1.8;margin-bottom:24px;">' +
        'Eu, <strong>' + dados.nome + '</strong>, inscrito(a) no CPF sob o nº <strong>' + cpfFormatado + '</strong>, ' +
        'ocupante do cargo de <strong>' + dados.funcao + '</strong>, declaro para os devidos fins de atualização de meu ' +
        'registro funcional, que meus dados seguem conforme abaixo:' +
      '</p>' +

      // Alteração de nome (condicional)
      secaoAlteracaoNome +

      // Section 1
      '<div style="border:1.5px solid #4169e1;border-radius:12px;padding:18px 20px;margin-bottom:16px;">' +
        '<div style="font-size:14px;font-weight:bold;color:#2f55cc;margin-bottom:12px;">1. Dados de Contato e Endereço</div>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          campo('Endereço Residencial:', dados.endereco) +
          campo('Número:', dados.numero || '—') +
          campo('Complemento:', dados.complemento || '—') +
          campo('Bairro:', dados.bairro) +
          campo('CEP:', dados.cep) +
          campo('Cidade:', dados.cidade) +
          campo('Estado:', dados.estado) +
          campo('Telefone Celular/WhatsApp:', dados.telefone) +
          campo('E-mail Pessoal:', dados.emailPessoal) +
          campo('Comprovante de Residência:', dados.comprovanteRes ? 'Enviado em anexo' : 'Não enviado') +
        '</table>' +
      '</div>' +

      // Section 2
      '<div style="border:1.5px solid #4169e1;border-radius:12px;padding:18px 20px;margin-bottom:16px;">' +
        '<div style="font-size:14px;font-weight:bold;color:#2f55cc;margin-bottom:12px;">2. Estado Civil e Dependentes</div>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          campo('Estado Civil:', dados.estadoCivil) +
          campo('Documento Comprobatório:', dados.docEstadoCivil ? 'Enviado em anexo' : 'Não exigido') +
        '</table>' +
        '<p style="font-size:13px;color:#1f2a44;margin-top:10px;">' +
          '<strong>Houve alteração no número de dependentes este ano?</strong><br>' +
          '<span style="margin-top:6px;display:inline-block;">' + simNao + '</span>' +
        '</p>' +
        docDepStatus +
      '</div>' +

      // Section 3
      '<div style="border:1.5px solid #4169e1;border-radius:12px;padding:18px 20px;margin-bottom:16px;">' +
        '<div style="font-size:14px;font-weight:bold;color:#2f55cc;margin-bottom:12px;">3. Escolaridade</div>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          campo('Último nível de instrução concluído:', dados.escolaridade) +
          campo('Comprovante:', ((dados.docsEscolaridade && dados.docsEscolaridade.length) || 0) > 0
            ? (dados.docsEscolaridade.length + ' arquivo(s) enviado(s) em anexo') : 'Não exigido') +
        '</table>' +
      '</div>' +

      // Section 4
      '<div style="background:#f8f9ff;border:1.5px solid #c8d4ff;border-radius:12px;padding:18px 20px;margin-bottom:24px;">' +
        '<div style="font-size:14px;font-weight:bold;color:#2f55cc;margin-bottom:10px;">4. Declaração de Veracidade</div>' +
        '<p style="font-size:13px;color:#1f2a44;line-height:1.8;">' +
          'Declaro, sob as penas da lei, que as informações acima prestadas são verdadeiras e exatas. ' +
          'Comprometo-me a informar ao departamento de Recursos Humanos, no prazo máximo de 5 (cinco) dias úteis, ' +
          'qualquer alteração que venha a ocorrer em meus dados cadastrais ' +
          '(mudança de endereço, estado civil, nascimento de filhos, conclusão de cursos, etc.).' +
        '</p>' +
      '</div>' +

      // Data e local
      '<div style="text-align:right;margin-bottom:24px;">' +
        '<p style="font-size:13px;color:#1f2a44;">' +
          dados.cidade + ' - ' + dados.estado + ', ' + dataFormatada + '.' +
        '</p>' +
      '</div>' +

    '</div>' +

    // Footer
    '<div style="text-align:center;margin-top:16px;font-size:11px;color:#9db4ff;">' +
      'BRASAS English Course - Departamento Pessoal - dp@brasas.com' +
    '</div>' +

  '</div>' +
  '</body></html>';
}
