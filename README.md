# Internal Data Platform Demo

Sistema full-stack para importacao, padronizacao, consulta, exportacao e auditoria de registros tabulares. Esta e uma versao publica preparada para portfolio, baseada em necessidades comuns de operacoes orientadas por dados, sem dados reais, logos, clientes, credenciais ou regras internas de empresa.

O objetivo do projeto e demonstrar arquitetura, organizacao de modulos e fluxo tecnico em uma aplicacao interna completa: API, importacao de planilhas, validacao, filtros, exportacoes, dashboard e rastreabilidade.

## Stack

Backend:

- Python
- Django
- Django REST Framework
- SQLite
- Pandas
- OpenPyXL

Frontend:

- React
- Vite
- Tailwind CSS
- Recharts
- Axios

## Modulos

- Autenticacao por token
- Gestao de usuarios
- Importacao de planilhas
- Padronizacao de colunas
- Validacao de documentos
- Busca e filtros
- Exportacao em CSV/XLSX/TXT
- Historico de exportacoes
- Logs de auditoria
- Dashboard com metricas operacionais

## Como Executar

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Variaveis de Ambiente

```bash
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=1
```

## Privacidade

Esta versao nao inclui banco real, uploads, planilhas, arquivos exportados, logos, credenciais, tokens ou dados pessoais reais.

## Proximas Melhorias

- Gerar fixtures sinteticas para demonstracao.
- Adicionar testes automatizados para validacao e importacao.
- Adicionar screenshots e fluxo de arquitetura.
- Preparar deploy local via Docker Compose.
