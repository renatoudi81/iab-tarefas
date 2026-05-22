# IAB Tarefas — Sistema de Gestão de Tarefas e Projetos

> Plataforma fullstack moderna para controle de tarefas, inspirada no melhor do Trello, Jira e Linear.
> Desenvolvida para uso interno do **Instituto Alfa e Beto**.

---

## Índice

1. [Objetivo](#objetivo)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Arquitetura](#arquitetura)
4. [Autenticação e Usuários](#autenticação-e-usuários)
5. [Funcionalidades Implementadas](#funcionalidades-implementadas)
6. [Funcionalidades Pendentes](#funcionalidades-pendentes)
7. [Estrutura de Pastas](#estrutura-de-pastas)
8. [Banco de Dados](#banco-de-dados)
9. [Variáveis de Ambiente](#variáveis-de-ambiente)
10. [Como Rodar Localmente](#como-rodar-localmente)
11. [Deploy](#deploy)

---

## Objetivo

Desenvolver um sistema completo de controle de tarefas com múltiplas visualizações, colaboração em equipe e relatórios gerenciais — substituindo o sistema legado em Firebase/React por uma solução moderna com Next.js + PostgreSQL (Neon).

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| UI base | TailwindCSS v4 + shadcn/ui pattern |
| Animações | Framer Motion v12 |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Drag & Drop | @hello-pangea/dnd |
| Backend | API Routes (Next.js) |
| Banco de Dados | Neon (PostgreSQL serverless) |
| ORM | Prisma v5 |
| Autenticação | NextAuth.js v4 (credentials) |
| Hospedagem | Vercel |
| Fetch / Cache | SWR |

---

## Arquitetura

```
Browser (Next.js App Router)
    │
    ├── app/(auth)/login          → Tela de login
    ├── app/(app)/dashboard       → Dashboard com KPIs e gráficos
    ├── app/(app)/lista           → Lista de tarefas com CRUD
    ├── app/(app)/kanban          → Board Kanban com drag & drop
    ├── app/(app)/gantt           → Timeline Gantt
    ├── app/(app)/relatorios      → Relatórios e exportação
    ├── app/(app)/admin           → Painel administrativo
    │
    ├── app/api/tasks             → CRUD de tarefas
    ├── app/api/time-entries      → Lançamentos de tempo
    ├── app/api/users             → Gestão de usuários
    ├── app/api/categories        → Categorias
    ├── app/api/upload            → Upload de arquivos
    └── app/api/auth              → NextAuth
    │
Neon PostgreSQL (pooler via Prisma)
```

---

## Autenticação e Usuários

### Perfis
- **Administrador** — acesso total, incluindo painel admin
- **Usuário comum** — acesso às funcionalidades de tarefas

### Funcionalidades de Auth
- [x] Login com e-mail e senha (credentials NextAuth)
- [x] Sessão JWT com dados do usuário (nome, perfil, avatar_color)
- [x] Logout
- [x] Proteção de rotas por middleware
- [x] Painel Admin: criar/editar/deletar usuários, definir perfis
- [ ] Recuperação de senha
- [ ] Cadastro público (atualmente apenas admin cria usuários)

### Credenciais padrão (seed)
```
E-mail:  renato@alfaebeto.org.br
Senha:   admin123
Perfil:  Administrador
```

---

## Funcionalidades Implementadas

### ✅ Lista de Tarefas
- CRUD completo (criar, editar, excluir)
- Campos: título, descrição, observações, categoria, responsável, prioridade, status, tempo estimado, data início, vencimento, data conclusão
- Observações aparecem apenas ao concluir a tarefa (status = "Concluída")
- Tempo gasto editável ao editar uma tarefa
- Filtros: status, prioridade, responsável, busca por texto
- Barra de progresso de tempo (gasto vs estimado)
- Badge de prazo vencido

### ✅ Kanban
- 5 colunas: Pendente · Em andamento · Aguardando · Atrasada · Concluída
- **Drag & drop** entre colunas (`@hello-pangea/dnd`)
- Ícone de arraste em cada card
- Feedback visual: coluna de destino acende, card rotaciona ao arrastar
- Cards com: prioridade, prazo, responsável (avatar), progresso de tempo, descrição resumida
- Contador e total de horas por coluna

### ✅ Gantt
- Timeline visual de todas as tarefas com data início + vencimento
- Marcador de "Hoje" em vermelho
- Grade de semanas
- Colorir barras por Status ou Prioridade (seletor)
- Overlay de tempo usado dentro da barra
- Ícone de alerta em tarefas com prazo vencido
- Legenda

### ✅ Dashboard
- KPIs: tarefas no período, horas registradas, tarefas atrasadas, produtividade geral
- Gráfico de área: tarefas criadas vs concluídas por dia
- Gráfico de barras: horas trabalhadas por dia
- Filtro de período (data início / fim)
- Animações stagger nos cards

### ✅ Relatórios
- Gráfico de pizza (donut): distribuição por status
- Gráfico de barras horizontal: tarefas por categoria
- Cards de produtividade por usuário (barra de progresso animada)
- Seção de tarefas com tempo excedido (alerta)
- Exportar CSV (com BOM para Excel)
- Botão de impressão

### ✅ Painel Admin
- Criar, editar e excluir usuários
- Definir nome, e-mail, senha, perfil e cor de avatar

### ✅ Design / UX
- Paleta de cores IAB: Navy `#1E3A8A` + Gold `#F59E0B`
- Logo oficial IAB no sidebar e na tela de login
- Sidebar colapsável com animação (logo completa ↔ símbolo)
- Modo escuro / claro com toggle
- Transições de página com Framer Motion
- Toasts/feedback de loading em todas as ações

---

## Funcionalidades Pendentes

> Ordenadas por prioridade sugerida

### 🔴 Alta prioridade
- [ ] **Coluna "Aguardando Retorno"** no Kanban com campos específicos:
  - Quem está devendo o retorno (cliente / equipe externa)
  - Data esperada de resposta
  - Destaque visual para tarefas paradas há muito tempo
- [ ] **Registro de tempo por tarefa** (timer start/stop ou lançamento manual por entrada)
- [ ] **Subtarefas** (checklist dentro de cada tarefa)
- [ ] **Comentários** em tarefas (com data/hora e autor)

### 🟡 Média prioridade
- [ ] **Histórico de alterações** por tarefa (audit log)
- [ ] **Notificações** internas (tarefa atribuída, prazo próximo, comentário novo)
- [ ] **Upload de arquivos** por tarefa (Vercel Blob ou S3)
- [ ] **@mentions** em comentários
- [ ] **Labels / Tags** personalizáveis por projeto
- [ ] **Ajuste de datas no Gantt por drag** (arrastar a barra para alterar datas)
- [ ] **Dependências entre tarefas** no Gantt
- [ ] **Atualização em tempo real** (Polling SWR já existe a cada 30s; WebSocket/SSE para tempo real)

### 🟢 Baixa prioridade
- [ ] **Projetos** — múltiplos projetos com membros e status geral
- [ ] **Recuperação de senha** por e-mail
- [ ] **Cadastro por convite** (link com token)
- [ ] **Relatório de "Aguardando Retorno"** — dashboard dedicado
- [ ] **Filtros de Gantt** por responsável / categoria
- [ ] **Exportar PDF** de relatórios
- [ ] **PWA / mobile** — versão responsiva aprimorada

---

## Estrutura de Pastas

```
iab-tarefas-next/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              ← Sidebar + header + page transitions
│   │   ├── dashboard/page.tsx
│   │   ├── lista/page.tsx
│   │   ├── kanban/page.tsx
│   │   ├── gantt/page.tsx
│   │   ├── relatorios/page.tsx
│   │   └── admin/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── tasks/
│   │   ├── time-entries/
│   │   ├── users/
│   │   ├── categories/
│   │   └── upload/
│   └── globals.css
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx
│   └── ui/
│       └── button.tsx
├── hooks/
│   ├── useTasks.ts
│   ├── useTimeEntries.ts
│   ├── useUsers.ts
│   └── useCategories.ts
├── lib/
│   ├── prisma.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── logo-iab.svg                ← Logo horizontal completa
│   ├── logo-iab-symbol.svg         ← Símbolo isolado (sidebar colapsado)
│   └── icon.png
├── types/
│   └── index.ts
├── middleware.ts
├── next.config.ts
└── PROJETO.md
```

---

## Banco de Dados

### Modelos Prisma

```prisma
model Usuario {
  id           String       @id @default(cuid())
  nome         String
  email        String       @unique
  senha_hash   String
  perfil       String       @default("Usuario")
  avatar_color String       @default("#1E3A8A")
  ativo        Boolean      @default(true)
  criado_em    DateTime     @default(now())
  tarefas      Tarefa[]
  entradas     EntradaTempo[]
}

model Tarefa {
  id               String       @id @default(cuid())
  titulo           String
  descricao        String?
  observacoes      String?
  status           String       @default("Pendente")
  prioridade       String       @default("Média")
  categoria        String
  responsavel_id   String?
  responsavel      Usuario?     @relation(fields: [responsavel_id], references: [id])
  tempo_estimado   Int          @default(0)   // minutos
  tempo_gasto_total Int         @default(0)   // minutos
  data_inicio      String?
  data_prazo       String?
  data_conclusao   String?
  tags             String[]     @default([])
  equipe           String[]     @default([])
  anexos           String[]     @default([])
  criado_em        DateTime     @default(now())
  atualizado_em    DateTime     @updatedAt
  entradas         EntradaTempo[]
}

model EntradaTempo {
  id          String   @id @default(cuid())
  tarefa_id   String
  tarefa      Tarefa   @relation(fields: [tarefa_id], references: [id], onDelete: Cascade)
  usuario_id  String
  usuario     Usuario  @relation(fields: [usuario_id], references: [id])
  data        String
  duracao     Int      // minutos
  descricao   String?
  criado_em   DateTime @default(now())
}

model Categoria {
  id        String   @id @default(cuid())
  nome      String   @unique
  cor       String   @default("#1E3A8A")
  criado_em DateTime @default(now())
}
```

---

## Variáveis de Ambiente

```env
# .env.local

# Banco de Dados Neon (pooler para app)
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require&pgbouncer=true"

# URL direta para migrations do Prisma
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="sua-chave-secreta-aleatoria"
NEXTAUTH_URL="http://localhost:3001"

# Upload (Vercel Blob — opcional)
BLOB_READ_WRITE_TOKEN=""
```

---

## Como Rodar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# editar .env.local com as credenciais do Neon

# 3. Gerar o Prisma Client
npx prisma generate

# 4. Rodar as migrations
npx prisma migrate deploy

# 5. Popular o banco com dados iniciais
npx prisma db seed

# 6. Iniciar o servidor de desenvolvimento
npm run dev -- --port 3001
```

Acesse: [http://localhost:3001](http://localhost:3001)

---

## Deploy

O projeto é hospedado na **Vercel** com integração automática ao repositório Git.

### Passos para deploy
1. Push para o repositório GitHub
2. Vercel detecta automaticamente o Next.js e faz o build
3. Configurar as variáveis de ambiente no painel da Vercel (mesmas do `.env.local`, exceto `NEXTAUTH_URL` que deve ser a URL de produção)
4. `DATABASE_URL` deve usar o **pooler URL** do Neon (porta 5432 com `pgbouncer=true`)
5. `DIRECT_URL` deve usar a **URL direta** do Neon (para migrations)

### Comandos de build
```bash
# Build de produção (roda prisma generate automaticamente)
npm run build

# Script de seed pós-deploy (se necessário)
npx prisma db seed
```

---

*Última atualização: Maio 2026 — Instituto Alfa e Beto*
