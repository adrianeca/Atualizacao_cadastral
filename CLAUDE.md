# Atualização Cadastral 2026 — BRASAS

Google Apps Script (GAS) web app para coleta e registro de atualizações cadastrais dos colaboradores da BRASAS English Course.

## Arquivos

| Arquivo | Descrição |
|---|---|
| `Index.html` | Interface do formulário (HTML/CSS/JS inline) |
| `Code.gs` | Backend Google Apps Script (lógica, e-mail, Drive, Sheets) |

## Infraestrutura Google

| Recurso | ID / Endereço |
|---|---|
| Planilha principal | `1BDiPjv0FqRJp5EwcvLdYXVvEAWesvwdEgbhYdnTlqPY` |
| Aba de respostas | `Atualizações Cadastrais 2026` |
| Aba de usuários admin | `USUARIOS` |
| Pasta de documentos no Drive | `1k-15X2qEwOxrAXYY3u6TFFL3rRXZTNzk` |
| E-mail do DP | `dp@brasas.com` |

## Configuração de implantação (Web App)

- **Executar como:** Eu (proprietário)
- **Quem tem acesso:** Qualquer pessoa com conta Google ← **obrigatório** para autenticação Google no painel admin

## Fluxo do formulário

1. **Passo 1** — Colaborador informa o CPF; o sistema busca nome e cargo na planilha de funcionários (coluna AT = CPF, coluna C = nome, coluna F = função, aba com `SHEET_GID = 566990656`).
2. **Passo 2** — Preenchimento dos dados cadastrais.
3. **Passo 3** — Tela de confirmação de envio.

## Seções do formulário (Passo 2)

### Identificação
- CPF, Nome e Cargo (somente leitura, vindos da busca)
- **Alteração de nome** (Sim/Não obrigatório)
  - Se Sim: campo de texto para o nome atualizado + upload do documento comprobatório (obrigatório, PDF/imagem, máx. 5 MB)

### 1. Dados de Contato e Endereço
- **CEP** (primeiro campo) — ao digitar 8 dígitos, busca automaticamente na API ViaCEP e preenche Endereço, Bairro, Cidade e Estado
- Endereço Residencial (auto-preenchido pelo CEP, editável para adicionar o número)
- Complemento, Bairro (auto-preenchido), CEP
- Cidade (auto-preenchida), Estado (auto-preenchido)
- Telefone celular, E-mail pessoal
- **Comprovante de residência** (upload obrigatório, PDF/imagem, máx. 5 MB)

### 2. Estado Civil e Dependentes
- Estado civil (radio)
- **Documento comprobatório do estado civil** (upload obrigatório, arquivo único, PDF/imagem, máx. 5 MB) — exigido para qualquer opção diferente de Solteiro(a); certidão de casamento, declaração de união estável, certidão de divórcio ou de óbito, conforme o caso
- Alteração no número de dependentes (Sim/Não obrigatório)
  - Se Sim:
    - Seletor de **quantidade de dependentes atualmente** (obrigatório)
    - Upload de **múltiplos documentos** (botão "+ Adicionar documento"; Certidão de Nascimento ou RG+CPF, PDF/imagem, máx. 5 MB cada)

### 3. Escolaridade
- Último nível de instrução concluído (select)
- **Comprovante de escolaridade** (upload obrigatório para todos os níveis, exceto Ensino Fundamental Incompleto; suporta **múltiplos documentos** via botão "+ Adicionar documento"; PDF/imagem, máx. 5 MB cada)

### 4. Declaração de Veracidade
- Checkbox obrigatório: "Li e concordo com a declaração de veracidade acima."
- Botão de envio (bloqueado até o checkbox ser marcado)

## Automação de e-mail e documentos

Ao submeter o formulário:
1. Os arquivos enviados são lidos como base64 no browser e transmitidos ao backend via `google.script.run`.
2. O backend converte os blobs e:
   - **Salva no Drive**: cria (ou reutiliza) uma subpasta com o nome completo do colaborador dentro da pasta de documentos, e salva cada arquivo com nome padronizado:
     - `Alteracao_Nome_NOME.ext`
     - `Doc_Estado_Civil_NOME.ext`
     - `Comprovante_Residencia_NOME.ext`
     - `Documento_Dependente_NOME_1.ext`, `_2.ext`, etc. (múltiplos)
     - `Comprovante_Escolaridade_NOME_1.ext`, `_2.ext`, etc. (múltiplos)
   - **Envia por e-mail**: os documentos vão como anexo no e-mail de declaração cadastral, enviado para `dp@brasas.com` e para o e-mail pessoal do colaborador.

Todos os arquivos são salvos no Drive da conta que fez o deploy do Web App (executa como "Eu — proprietário"), dentro da pasta `PASTA_DOCUMENTOS_ID`, em uma subpasta por colaborador (criada/reutilizada pelo nome completo).

## Painel Admin

Acessado pelo botão **"Acesso DP"** no cabeçalho. Autenticação via conta Google (`Session.getActiveUser().getEmail()`) — sem necessidade de senha.

- A função `getAdminDataBySession()` no `Code.gs` verifica se o e-mail da sessão Google existe na aba `USUARIOS` e se alguma célula da linha contém `admin`.
- **Formato da aba USUARIOS:** coluna A = nome, alguma coluna contendo o e-mail corporativo, alguma célula da linha contendo `admin`.
- Sem senha — a autenticação Google já garante a identidade.

Funcionalidades: resumo (total, alterações de dependentes, respostas hoje), tabela filtrável por nome/CPF/estado civil/dependentes, download CSV.

## Colunas da planilha de respostas

`Data/Hora` · `Nome` · `CPF` · `Cargo` · `Endereço` · `Complemento` · `Bairro` · `CEP` · `Cidade` · `Estado` · `Telefone` · `E-mail Pessoal` · `Estado Civil` · `Alteração Dependentes` · `Escolaridade` · `Doc. Dependente` · `Qtd. Dependentes` · `Alteração de Nome` · `Nome Atualizado` · `Doc. Alt. Nome` · `Comprovante Residência` · `Doc. Escolaridade` · `Doc. Estado Civil`

As colunas novas são adicionadas automaticamente ao cabeçalho se a aba já existir com o formato anterior.

## Permissões necessárias no GAS

- `SpreadsheetApp` — leitura de funcionários e escrita de respostas
- `GmailApp` — envio de e-mails com anexos
- `DriveApp` — criação de pastas e arquivos na pasta de documentos
- `HtmlService` — servir o web app
- `Session` — identificar o e-mail do usuário autenticado (painel admin)

## Variáveis globais (Code.gs)

```javascript
SPREADSHEET_ID      // ID da planilha Google Sheets
SHEET_GID           // GID da aba de funcionários
EMAIL_DP            // dp@brasas.com
NOME_ABA            // Nome da aba de respostas
PASTA_DOCUMENTOS_ID // ID da pasta no Drive para documentos
```

## Funções principais (Code.gs)

| Função | Descrição |
|---|---|
| `doGet()` | Entry point — serve o Index.html |
| `buscarFuncionarioPorCPF(cpf)` | Busca nome e função pelo CPF na planilha de funcionários |
| `enviarDeclaracao(dados)` | Salva resposta, envia e-mail com anexos, salva no Drive |
| `salvarResposta(dados, cpf, data)` | Grava linha na aba de respostas |
| `getAdminDataBySession()` | Autentica via Google e retorna dados para o painel admin |
| `criarEmailHtml(...)` | Gera corpo HTML do e-mail de declaração |
| `criarEmailTexto(...)` | Gera corpo texto plain do e-mail |
| `_salvarDocumentosNoDrive(nome, blobs)` | Salva arquivos na subpasta do colaborador no Drive |
