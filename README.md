# BagsToGo OCC

Plataforma operacional em tempo real integrada à API **BagsToGo** (ANA Aeroportos / Groundforce) para controle de voos, performance de chegadas, BFF, chutes/esteiras e rastreamento cronológico de bagagens.

## Funcionalidades

- **Autenticação efêmera**: login direto contra a API BagsToGo sem persistência de tokens em `localStorage` ou cookies.
- **Tempo real via WebSocket (`/ws`)**: atualização automática do painel a cada 6 segundos com suporte aos aeroportos `OPO`, `LIS`, `FAO`, `FNC` e `PDL`.
- **Dashboard operacional**: visualização dos **Próximos 15 Voos**, resumo de BFF e esteiras, com filtros por busca, data, aeroporto, companhia aérea e direção (partidas/chegadas).
- **Performance de chegadas**: acompanhamento de esteiras, horários de primeira e última bagagem e indicadores operacionais.
- **Partidas e chutes**: monitoramento do status do *sorter*, alertas de chute cheio e contagem de bagagens (*OnRoute*, *Delivered*, *Loaded* e *Missing*).
- **Rastreamento de bagagens**: busca por código LPN completo ou parcial (6/10 dígitos) com linha do tempo cronológica de eventos e dados do voo.
- **Leitor de código de barras / QR Code**: leitura via câmera ou upload de imagem utilizando `html5-qrcode`.
- **Detalhes do voo**: modal com mensagens recebidas/processadas, *lead times*, resumo operacional e lista de bagagens associadas.
- **Interface OCC**: suporte a tema escuro/claro e modo tela cheia para centros de operações.

## Tecnologias

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, `styled-components`, Lucide React, Motion, `html5-qrcode`.
- **Backend**: Node.js, Express, WebSocket (`ws`), `tsx`.

## Estrutura do Projeto

```text
├── api/index.ts               # Entrypoint serverless da Vercel para /api/*
├── lib/apiApp.ts              # Aplicação Express, segurança e proxy da API BagsToGo
├── server.ts                  # Servidor HTTP local, WebSocket (/ws) e Vite/estáticos
├── vercel.json                # Configuração de build, rewrites e cabeçalhos na Vercel
├── public/favicon.svg         # Ícone SVG da aplicação (favicon e TopBar)
├── index.html                 # Documento HTML principal
├── vite.config.ts             # Configuração do Vite e Tailwind CSS
├── package.json               # Dependências e scripts
└── src/
    ├── App.tsx                # Estado da sessão, WebSocket com fallback REST e navegação
    ├── main.tsx               # Ponto de entrada React
    ├── components/            # Telas, painéis, modais e leitor de código de barras
    │   └── ui/Primitives.tsx  # Componentes base estilizados
    ├── theme/theme.ts         # Definições de tema claro e escuro
    ├── types/bagstogo.ts      # Tipagens TypeScript da aplicação
    └── utils/                 # Lógica de normalização, filtros e testes unitários
```

## Como Executar Localmente

### Pré-requisitos

- **Node.js** 20+ e **npm** (ou **Bun**)
- Credenciais válidas do serviço **BagsToGo** (ANA Aeroportos) para acessar os dados operacionais ao vivo

### Passo a passo

1. Clone o repositório:
   ```bash
   git clone https://github.com/LuizCorrea-Dev/BTG.git
   cd BTG
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento (Express + Vite + WebSocket):
   ```bash
   npm run dev
   ```

4. Acesse no navegador:
   ```text
   http://localhost:3000
   ```

### Variáveis de Ambiente (opcionais)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP/WebSocket do servidor Express |
| `HOST` | `127.0.0.1` (dev) / `0.0.0.0` (prod) | Endereço de escuta do servidor |
| `NODE_ENV` | `development` | Defina como `production` para servir os arquivos estáticos de `dist/` |
| `ALLOWED_ORIGINS` | `—` | Lista separada por vírgulas de origens adicionais autorizadas para CORS e WebSocket |
| `ENABLE_DEMO_FALLBACK` | `false` | Quando `true`, preenche chegadas simuladas se a API retornar menos de 6 voos |

## Segurança

- **Cabeçalhos HTTP**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` e, em produção, `Content-Security-Policy` e `Strict-Transport-Security`.
- **CORS e WebSocket restritos**: apenas mesma origem e origens listadas em `ALLOWED_ORIGINS` são aceitas (com limite de conexões simultâneas e payload máximo em `/ws`).
- **Rate Limiting**: proteção por IP em `/api/login` (10 requisições / 15 min) e nas demais rotas `/api/*` (120 requisições / min).
- **Autenticação efêmera**: tokens são enviados exclusivamente via cabeçalho `Authorization: Bearer` (nunca via query string ou persistidos em `localStorage`/cookies) e indexados em cache limitado com hash SHA-256 e TTL.
- **Produção**: utilize sempre atrás de um proxy reverso com **HTTPS/WSS** para proteger credenciais em trânsito.

## Scripts Disponíveis

| Script | Comando | Descrição |
| --- | --- | --- |
| `npm run dev` | `tsx server.ts` | Inicia o servidor em modo de desenvolvimento com Vite middleware e `/ws` |
| `npm run build` | `vite build` | Gera o build de produção do frontend em `dist/` |
| `npm run preview` | `vite preview` | Visualiza localmente o build gerado em `dist/` |
| `npm run lint` | `tsc --noEmit` | Executa a verificação de tipos TypeScript |
| `npm test` | `tsx --test src/utils/bagstogoLogic.test.ts` | Executa os testes unitários da lógica operacional |
| `npm run clean` | `rm -rf dist server.js` | Remove os artefatos de build |
| `npm run vercel:dev` | `vercel dev` | Executa o frontend e a API serverless (`api/index.ts`) no emulador local da Vercel |
| `npm run deploy:preview` | `vercel` | Publica um deploy de preview/teste na Vercel |
| `npm run deploy:prod` | `vercel --prod` | Publica o deploy em produção na Vercel |

## Deploy na Vercel (CLI)

O projeto está configurado via [vercel.json](vercel.json) e [api/index.ts](api/index.ts) para publicar o frontend Vite (`dist/`) junto com a API Express como *Serverless Function* (`/api/*`).

> **Nota sobre tempo real:** funções serverless da Vercel não mantêm conexões WebSocket persistentes (`/ws`). Quando `/ws` não está disponível, o frontend alterna automaticamente para *polling* REST em `/api/dashboard` a cada 6 segundos.

### Passos para publicar e testar

1. Autentique-se na Vercel CLI (pode ser executada via `npx vercel` ou instalada globalmente com `npm i -g vercel`):
   ```bash
   npx vercel login
   ```
2. Crie um deploy de **preview** para testar:
   ```bash
   npx vercel
   ```
3. (Opcional) Configure variáveis de ambiente no projeto Vercel, se necessário:
   ```bash
   npx vercel env add ALLOWED_ORIGINS
   npx vercel env add ENABLE_DEMO_FALLBACK
   ```
4. Verifique a saúde da função serverless após o deploy:
   ```bash
   curl https://<seu-projeto>.vercel.app/api/health
   ```
5. Quando estiver validado, publique em **produção**:
   ```bash
   npx vercel --prod
   ```

## Endpoints da API Local / Serverless

| Método / Protocolo | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/health` | Verificação de disponibilidade da API (`status` e `runtime`) |
| `POST` | `/api/login` | Autentica o utilizador na API BagsToGo e retorna o token de sessão |
| `GET` | `/api/dashboard` | Retorna o snapshot operacional do aeroporto informado (`?airport=OPO`) |
| `GET` | `/api/flight/:flightId` | Retorna detalhes, mensagens, *lead times*, resumo e bagagens do voo |
| `GET` | `/api/baggage/trace` | Consulta eventos cronológicos e metadados de bagagem por LPN (`?lpn=...`) |
| `WS` | `/ws` | Canal WebSocket para atualizações periódicas em tempo real (`subscribe`, `change_airport`) |
