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
- Endereço, Complemento, Bairro, CEP, Cidade, Estado
- Telefone celular, E-mail pessoal
- **Comprovante de residência** (upload opcional, PDF/imagem, máx. 5 MB)

### 2. Estado Civil e Dependentes
- Estado civil (radio)
- Alteração no número de dependentes (Sim/Não obrigatório)
  - Se Sim: upload do documento do dependente (opcional, Certidão de Nascimento ou RG+CPF)

### 3. Escolaridade
- Último nível de instrução concluído (select)

### 4. Declaração de Veracidade
- Botão de envio

## Automação de e-mail e documentos

Ao submeter o formulário:
1. Os arquivos enviados são lidos como base64 no browser e transmitidos ao backend via `google.script.run`.
2. O backend converte os blobs e:
   - **Salva no Drive**: cria (ou reutiliza) uma subpasta com o nome completo do colaborador dentro da pasta de documentos, e salva cada arquivo com nome padronizado (`Alteracao_Nome_NOME.ext`, `Comprovante_Residencia_NOME.ext`, `Documento_Dependente_NOME.ext`).
   - **Envia por e-mail**: os documentos vão como anexo no e-mail de declaração cadastral, enviado para `dp@brasas.com` e para o e-mail pessoal do colaborador.

## Painel Admin

Acessado pelo botão "Acesso DP" no cabeçalho. Autenticação via e-mail + senha verificados na aba `USUARIOS` da planilha (coluna 0 = nome, coluna 1 = senha, alguma célula da linha deve conter `admin`).

Funcionalidades: resumo (total, alterações de dependentes, respostas hoje), tabela filtrável por nome/CPF/estado civil/dependentes, download CSV.

## Colunas da planilha de respostas

`Data/Hora` · `Nome` · `CPF` · `Cargo` · `Endereço` · `Complemento` · `Bairro` · `CEP` · `Cidade` · `Estado` · `Telefone` · `E-mail Pessoal` · `Estado Civil` · `Alteração Dependentes` · `Escolaridade` · `Doc. Dependente` · `Alteração de Nome` · `Nome Atualizado` · `Doc. Alt. Nome` · `Comprovante Residência`

As colunas novas são adicionadas automaticamente ao cabeçalho se a aba já existir com o formato anterior.

## Permissões necessárias no GAS

- `SpreadsheetApp` — leitura de funcionários e escrita de respostas
- `GmailApp` — envio de e-mails com anexos
- `DriveApp` — criação de pastas e arquivos na pasta de documentos
- `HtmlService` — servir o web app

## Variáveis globais (Code.gs)

```javascript
SPREADSHEET_ID      // ID da planilha Google Sheets
SHEET_GID           // GID da aba de funcionários
EMAIL_DP            // dp@brasas.com
NOME_ABA            // Nome da aba de respostas
PASTA_DOCUMENTOS_ID // ID da pasta no Drive para documentos
```
