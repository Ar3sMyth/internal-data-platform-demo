# Internal Data Platform Demo

Sistema full-stack para importacao, padronizacao, consulta, exportacao e auditoria de registros tabulares. Esta e uma versao preparada para portfolio, baseada em codigo de um cenario real, mas sem dados, logos, clientes, credenciais ou regras internas de empresa.

> Projeto em sanitizacao. A estrutura principal foi preservada para demonstrar arquitetura, modulos e fluxo tecnico.

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
- Revisar nomes de dominio do backend para ficarem totalmente genericos.
- Adicionar testes automatizados para validacao e importacao.
- Adicionar screenshots e fluxo de arquitetura.
- Preparar deploy local via Docker Compose.
