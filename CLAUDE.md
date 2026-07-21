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
| Aba de funcionários | `RJ - UNIDADES` (`SHEET_GID = 566990656`) |
| Planilha de usuários admin | `CONTROLES BI` — `1eZPbzhzjhjHoPwMhAW5YvOZgYiAvlTYc07dRan6Lyoc` (planilha separada da principal) |
| Aba de usuários admin | `USUARIOS` (`USUARIOS_SHEET_GID = 1120979656`) |
| Pasta de documentos no Drive (Funcionários) | `1IuU9YLh4kiXg1p-xgNiZruUL9ddnD345` |
| E-mail do DP | `dp@brasas.com` |

## Configuração de implantação (Web App)

- **Executar como:** Eu (proprietário)
- **Quem tem acesso:** Qualquer pessoa com conta Google ← **obrigatório** para autenticação Google no painel admin

## Fluxo do formulário

1. **Passo 1** — Colaborador informa o CPF; o sistema busca nome, cargo e unidade na planilha de funcionários (coluna AT = CPF, coluna C = nome, coluna F = função, coluna V = sigla da unidade, aba `RJ - UNIDADES` com `SHEET_GID = 566990656`). A sigla da unidade é convertida para o nome completo via `UNIDADES_MAP` em `Code.gs`.
2. **Passo 2** — Preenchimento dos dados cadastrais.
3. **Passo 3** — Tela de confirmação de envio.

## Seções do formulário (Passo 2)

### Identificação
- CPF, Nome e Cargo (somente leitura, vindos da busca)
- **Alteração de nome** (Sim/Não obrigatório)
  - Se Sim: campo de texto para o nome atualizado + upload do documento comprobatório (obrigatório, PDF/imagem, máx. 5 MB)

### 1. Dados de Contato e Endereço
- **CEP** (primeiro campo) — ao digitar 8 dígitos, busca automaticamente na API ViaCEP e preenche Endereço, Bairro, Cidade e Estado
- Endereço Residencial (auto-preenchido pelo CEP)
- **Número** (obrigatório, campo separado do Complemento), Complemento, Bairro (auto-preenchido)
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
   - **Salva no Drive**: dentro da pasta `PASTA_DOCUMENTOS_ID` (pasta "Funcionários"), cria (ou reutiliza) primeiro a subpasta da **unidade** do colaborador (nome completo em MAIÚSCULO, via `UNIDADES_MAP`) e, dentro dela, a subpasta do **colaborador** (nome completo em MAIÚSCULO) — criadas/reutilizadas pela função `_salvarDocumentosNoDrive(nomeFunc, unidade, blobs)`. Cada arquivo é salvo com nome padronizado:
     - `Alteracao_Nome_NOME.ext`
     - `Doc_Estado_Civil_NOME.ext`
     - `Comprovante_Residencia_NOME.ext`
     - `Documento_Dependente_NOME_1.ext`, `_2.ext`, etc. (múltiplos)
     - `Comprovante_Escolaridade_NOME_1.ext`, `_2.ext`, etc. (múltiplos)
   - **Envia por e-mail**: os documentos vão como anexo no e-mail de declaração cadastral, enviado para `dp@brasas.com` e para o e-mail pessoal do colaborador.

Todos os arquivos são salvos no Drive da conta que fez o deploy do Web App (executa como "Eu — proprietário"), dentro da pasta `PASTA_DOCUMENTOS_ID` → pasta da unidade → subpasta do colaborador.

### Padronização em maiúsculo

Os dados de texto preenchidos no formulário (nome, cargo, endereço, número, complemento, bairro, cidade, estado civil, escolaridade, etc.) são gravados **em maiúsculo** na planilha de respostas (função `_upper()` em `Code.gs`), assim como os nomes das pastas criadas no Drive (unidade e colaborador). O **e-mail pessoal** é uma exceção e é mantido exatamente como digitado. O corpo do e-mail de declaração enviado ao DP/colaborador **não** é afetado — mantém os dados como preenchidos originalmente.

## Painel Admin

Acessado pelo botão **"Acesso DP"** no cabeçalho. Autenticação via conta Google (`Session.getActiveUser().getEmail()`) — sem necessidade de senha.

- A função `getAdminDataBySession()` no `Code.gs` verifica se o e-mail da sessão Google existe na aba `USUARIOS` (planilha `CONTROLES BI`, separada da planilha principal) e se a **coluna C** dessa linha contém `admin` ou `dp` (não sensível a maiúsculas/minúsculas).
- **Formato da aba USUARIOS:** coluna A = e-mail corporativo, coluna C = `admin` ou `dp` para liberar acesso ao painel.
- Sem senha — a autenticação Google já garante a identidade.

Funcionalidades: resumo (total, alterações de dependentes, respostas hoje), tabela com coluna Unidade, filtrável por nome/CPF/unidade/estado civil/dependentes (filtro de unidade populado dinamicamente a partir dos dados existentes), download CSV, botão **"Criar planilha do filtro"** (gera uma nova planilha Google Sheets só com as linhas atualmente filtradas, via `criarPlanilhaFiltrada(headers, rows)`) e botão para abrir a pasta "Funcionários" no Drive (link vem de `getAdminDataBySession()`, campo `pastaDriveUrl`).

## Colunas da planilha de respostas

`Data/Hora` · `Nome` · `CPF` · `Cargo` · `Endereço` · `Complemento` · `Bairro` · `CEP` · `Cidade` · `Estado` · `Telefone` · `E-mail Pessoal` · `Estado Civil` · `Alteração Dependentes` · `Escolaridade` · `Doc. Dependente` · `Qtd. Dependentes` · `Alteração de Nome` · `Nome Atualizado` · `Doc. Alt. Nome` · `Comprovante Residência` · `Doc. Escolaridade` · `Doc. Estado Civil` · `Número` · `Unidade`

As colunas novas são adicionadas automaticamente ao cabeçalho se a aba já existir com o formato anterior.

## Permissões necessárias no GAS

- `SpreadsheetApp` — leitura de funcionários e escrita de respostas
- `GmailApp` — envio de e-mails com anexos
- `DriveApp` — criação de pastas e arquivos na pasta de documentos
- `HtmlService` — servir o web app
- `Session` — identificar o e-mail do usuário autenticado (painel admin)

## Variáveis globais (Code.gs)

```javascript
SPREADSHEET_ID          // ID da planilha Google Sheets principal
SHEET_GID               // GID da aba de funcionários (RJ - UNIDADES)
EMAIL_DP                // dp@brasas.com
NOME_ABA                // Nome da aba de respostas
PASTA_DOCUMENTOS_ID     // ID da pasta no Drive "Funcionários"
UNIDADES_MAP            // Mapa sigla da unidade (coluna V) → nome completo da pasta
USUARIOS_SPREADSHEET_ID // ID da planilha "CONTROLES BI" (usuários admin)
USUARIOS_SHEET_GID      // GID da aba USUARIOS dentro da planilha CONTROLES BI
```

## Funções principais (Code.gs)

| Função | Descrição |
|---|---|
| `doGet()` | Entry point — serve o Index.html |
| `buscarFuncionarioPorCPF(cpf)` | Busca nome, função e unidade pelo CPF na planilha de funcionários |
| `enviarDeclaracao(dados)` | Salva resposta, envia e-mail com anexos, salva no Drive |
| `salvarResposta(dados, cpf, data)` | Grava linha na aba de respostas (dados de texto em maiúsculo) |
| `getAdminDataBySession()` | Autentica via Google e retorna dados para o painel admin |
| `criarPlanilhaFiltrada(headers, rows)` | Cria uma nova planilha Google Sheets com as linhas filtradas no painel admin |
| `criarEmailHtml(...)` | Gera corpo HTML do e-mail de declaração |
| `criarEmailTexto(...)` | Gera corpo texto plain do e-mail |
| `_salvarDocumentosNoDrive(nomeFunc, unidade, blobs)` | Salva arquivos na subpasta unidade → colaborador no Drive |
| `_upper(v)` | Normaliza texto para maiúsculo (usado na planilha e nomes de pasta) |
