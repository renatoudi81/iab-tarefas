# Design System — IAB Tarefas

Sistema de design aplicado ao projeto. Documenta tokens, componentes, regras de
hierarquia visual e governança para que mudanças futuras mantenham a coerência.

> **Status:** v1.0 — estável | **Owner:** equipe IAB | **Stack:** Next.js 16 + Tailwind v4 + shadcn/ui + framer-motion

## Sumário

1. [Princípios](#1-princípios)
2. [Tokens](#2-tokens)
3. [Hierarquia visual](#3-hierarquia-visual)
4. [Componentes](#4-componentes)
5. [Padrões de interação](#5-padrões-de-interação)
6. [Acessibilidade](#6-acessibilidade)
7. [Governança](#7-governança)
8. [Contribuição](#8-contribuição)

---

## 1. Princípios

Três regras que resolvem trade-offs:

1. **Conteúdo > decoração.** Animação, sombra e cor servem a tarefa do usuário,
   não a estética isolada. Se uma feature visual não ajuda a entender ou agir,
   é cortada.
2. **Destaque é finito.** Quanto mais elementos competem por atenção, menor o
   impacto de cada um (Von Restorff). Cada tela tem **um** CTA primário, **uma**
   métrica em pulse, **um** linha destacada. Tudo o mais é baseline.
3. **Consistência > novidade.** Antes de criar, reutilizar. Padrões existentes
   ganham polish; padrões novos só entram com necessidade clara.

---

## 2. Tokens

### 2.1 Cores

| Token            | Hex       | Uso |
|------------------|-----------|-----|
| `--primary-hex`  | `#2563EB` | CTA primário, links, active states, destaque |
| `--primary-hover`| `#1D4ED8` | Hover do CTA primário |
| `--primary-light`| `#EFF6FF` | Bg de badges/pills sobre fundo claro |
| `--accent-hex`   | `#F59E0B` | Brand IAB; uso reservado (logo, marcadores específicos) |
| `--success`      | `#16A34A` | Concluído, sucesso, valores positivos |
| `--danger`       | `#DC2626` | Erro, exclusão, prazo vencido, prioridade Crítica |
| `--warning`      | `#D97706` | Atenção, Caps Lock, valores intermediários |
| `--info`         | `#2563EB` | Notificações, dicas |

**Cinzas (sem token explícito — Tailwind):**

| Hex       | Uso |
|-----------|-----|
| `#0F172A` | Texto principal, headings |
| `#3F3F46` | Texto secundário, label de input |
| `#71717A` | Texto muted, helper text, subtítulo |
| `#A1A1AA` | Placeholder, divisores fortes |
| `#E4E4E7` | Border padrão |
| `#EDEEF1` | Border de card |
| `#F4F4F5` | Bg neutro de hover, separador |
| `#FAFAFA` | Bg subtítulo de seção |

### 2.2 Tipografia

Fontes: **Geist Sans** (variável `--font-sans`) e **Geist Mono** (variável `--font-mono`).
Inter foi banida do projeto.

| Função | Tamanho | Peso | Tracking |
|--------|---------|------|----------|
| H1 (página) | `text-[1.875rem]` (30px) | `font-bold` (700) | `-0.025em` |
| H2 (seção) | `text-[1.0625rem]` (17px) | `font-semibold` (600) | — |
| Body | `text-sm` (14px) | `font-normal` | — |
| Body small | `text-[0.8125rem]` (13px) | `font-normal` | — |
| Label form | `text-[0.78rem]` (12.5px) | `font-semibold` | — |
| Caption | `text-[0.72rem]` (11.5px) | `font-medium` | — |
| Kbd / shortcut | `font-mono text-[0.62rem]` | `font-semibold` | — |
| Métrica grande (KPI) | `text-[2rem]` (32px) | `font-mono font-bold` | `-0.02em`, tabular |
| Métrica média | `text-[1.875rem]` (30px) | `font-mono font-bold` | tabular |

**Regra:** números (KPIs, contadores, datas, IDs) sempre em **Geist Mono** com
`tabular-nums`. Texto comum em **Geist Sans**.

### 2.3 Espaçamento

Base 4px (Tailwind). Usar incrementos previsíveis:

| Tailwind | px  | Uso típico |
|----------|-----|------------|
| `gap-1.5` | 6  | Gap inline (icon + label) |
| `gap-2`   | 8  | Gap em chips/badges |
| `gap-3`   | 12 | Gap entre cards numa coluna |
| `gap-4`   | 16 | Gap em grids de formulário |
| `gap-6`   | 24 | Gap em seções de página |
| `mb-6`    | 24 | Margem entre header e conteúdo |
| `p-5`     | 20 | Padding interno padrão de card |
| `p-6`     | 24 | Padding interno de seção/container |

### 2.4 Bordas e raios

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-md`  | 6px  | Botão pequeno, input |
| `rounded-lg`  | 8px  | Botão padrão, badge |
| `rounded-xl`  | 12px | Card de lista, modal interno |
| `rounded-2xl` | 16px | Card principal, dialog |
| `rounded-full` | ∞ | Pills, avatars |

Border padrão: `1px solid #E4E4E7` ou `#EDEEF1` (mais suave em cards).

### 2.5 Sombras

| Sombra | Valor | Uso |
|--------|-------|-----|
| Card base | `0 8px 30px -12px rgba(15,23,42,0.08)` | Cards estáticos |
| Card hover (lift) | `0 12px 32px -10px rgba(15,23,42,0.12)` | `.card-lift:hover` |
| Botão primário | `0 4px 14px -4px rgba(37,99,235,0.45)` | CTA primário |
| Modal | `0 24px 60px -12px rgba(15,23,42,0.35)` | Confirm/dialog premium |
| Drag | `0 8px 28px rgba(0,0,0,0.14)` | Card sendo arrastado no Kanban |

### 2.6 Motion

| Token | Valor | Uso |
|-------|-------|-----|
| `--duration-fast` | 120-180ms | Toggle, dropdown open |
| `--duration-base` | 220-300ms | Card hover, page fade |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Expo-out (padrão Linear/Vercel) |
| Spring padrão | `stiffness: 220, damping: 22, mass: 0.6` | Toast, dialog scale-in |
| Spring suave | `stiffness: 120, damping: 22, mass: 0.6` | Page transition (fade-only) |

Respeitar `@media (prefers-reduced-motion: reduce)` — já configurado globalmente.

---

## 3. Hierarquia visual

Aplicação prática de hierarquia em cada tela.

### 3.1 Princípios em uso

| Ferramenta | Como o sistema usa |
|------------|--------------------|
| **Tamanho** | H1 da página (30px) ≫ H2 de seção (17px) ≫ body (14px) — ratio sempre ≥1.5x |
| **Peso** | Bold no nome do usuário em lista; light em metadata |
| **Cor** | Azul para CTA/ativo; vermelho para destrutivo/atraso; verde para sucesso |
| **Espaçamento** | KPIs com `gap-3`; seções principais com `mb-7`; densidade maior em tabelas |
| **Posição** | Page title sempre topo-esquerda; CTA primário topo-direita |
| **Densidade** | Botão "Nova Tarefa" isolado (sem irmãos) — máxima atenção |

### 3.2 Níveis de hierarquia por tela

| Nível | Dashboard | Lista | Kanban | Login |
|-------|-----------|-------|--------|-------|
| **Primário** | KPI "Atrasadas" (pulse) | Botão "Nova Tarefa" | Botão "Nova Tarefa" | CTA "Entrar" |
| **Secundário** | KPIs normais | Tabela | 5 colunas | Form fields |
| **Terciário** | Charts | Filtros, busca | Headers de coluna | Link "Esqueci senha" |
| **Quaternário** | Hints dos KPIs | Pagination | IDs nos cards | Trust signal "Conexão segura" |

### 3.3 Squint test

Cada tela passa pelo teste: borrar a visão deve revelar o foco principal.
Se 3+ elementos competem pelo "primário", redesenhar.

### 3.4 Aplicações Von Restorff documentadas

| Elemento | Diferenciação | Contexto |
|----------|---------------|----------|
| Card Kanban com prioridade **Crítica** | Border-left 3px `#DC2626` + sombra avermelhada | Outros cards: border 1px cinza |
| Linha vencida na Lista | Bg `#FEF2F2/60%` | Outras linhas: hover neutro |
| Usuário logado no ranking Relatórios | Ring azul 2px + badge "VOCÊ" | Outros usuários: border `#EDEEF1` |
| KPI "Atrasadas" no Dashboard | `pulse` animation + cor vermelha | Outros KPIs: estático azul/verde |
| Toast destrutivo | Border ring `#DC2626/15` | Toasts info/success: border ring respectivo |

---

## 4. Componentes

### 4.1 Componentes do sistema

Status: **🟢 estável** (parte do contrato) | **🟡 beta** (pode mudar) | **🔴 deprecated** (não usar).

| Componente | Status | Path | Quando usar |
|------------|--------|------|-------------|
| `Button` (shadcn) | 🟢 | `components/ui/button.tsx` | Botões padrão |
| `MagneticButton` | 🟢 | `components/ui/MagneticButton.tsx` | **CTA primário** que precisa de magnetismo no cursor |
| `SpotlightCard` | 🟢 | `components/ui/SpotlightCard.tsx` | Card com glow no cursor (KPI premium) |
| `AnimatedCounter` | 🟢 | `components/ui/AnimatedCounter.tsx` | Números que contam 0→valor (KPIs) |
| `EmptyIllustration` | 🟢 | `components/ui/EmptyIllustration.tsx` | Empty states com SVG inline |
| `FormError` | 🟢 | `components/ui/FormError.tsx` | Mensagem de erro inline em forms |
| `Pagination` | 🟢 | `components/ui/Pagination.tsx` | Paginação client-side reutilizável |
| `RichTextEditor` | 🟢 | `components/ui/RichTextEditor.tsx` | Campos com formatação (TipTap) |
| `CommandPalette` | 🟢 | `components/ui/CommandPalette.tsx` | ⌘K navegação rápida |
| `ScrollProgress` | 🟢 | `components/ui/ScrollProgress.tsx` | Barra de scroll global (mounted no root) |
| `GrainOverlay` | 🟢 | `components/ui/GrainOverlay.tsx` | Textura sutil global |
| `IconTooltip` | 🟢 | `components/ui/tooltip.tsx` | Tooltip premium em ícones-só |
| `UserAvatar` | 🟢 | `components/ui/UserAvatar.tsx` | Avatar do usuário (foto ou iniciais) |
| `TaskModal` | 🟢 | `components/TaskModal.tsx` | Modal de criar/editar tarefa |
| `TaskDrawer` | 🟢 | `components/TaskDrawer.tsx` | Drawer lateral com detalhes da tarefa |
| `AdminGuard` | 🟢 | `components/layout/AdminGuard.tsx` | Wrapper que protege rotas admin |
| `Sidebar` | 🟢 | `components/layout/Sidebar.tsx` | Navegação principal (fixa + drawer em mobile) |

### 4.2 Contexts

| Context | Status | Path | Uso |
|---------|--------|------|-----|
| `AuthContext` | 🟢 | `contexts/AuthContext.tsx` | `useAuth()` em qualquer client component |
| `ToastContext` | 🟢 | `contexts/ToastContext.tsx` | `useToast().toast.success/error/info/warning(...)` |
| `ConfirmContext` | 🟢 | `contexts/ConfirmContext.tsx` | `await confirm({ title, variant: 'destructive' })` |

### 4.3 Componentes shadcn/ui usados

`Avatar`, `Badge`, `Button`, `Card`, `Checkbox`, `Dialog`, `DropdownMenu`,
`Input`, `Label`, `Progress`, `ScrollArea`, `Select`, `Separator`, `Sheet`,
`Skeleton`, `Switch`, `Table`, `Tabs`, `Textarea`, `Tooltip` — todos em
`components/ui/*`.

---

## 5. Padrões de interação

### 5.1 Loading

| Cenário | Pattern |
|---------|---------|
| Página carregando dados | Skeleton (Lista, Kanban, Relatórios) |
| Botão async em progresso | `<Loader2 className="animate-spin" />` inline + texto |
| Auth carregando | Spinner full-screen com "Carregando..." |
| Imagem | Fade-in suave via `data-state=loaded` |

### 5.2 Feedback

| Cenário | Pattern |
|---------|---------|
| Operação ok | `toast.success('Texto curto')` |
| Operação falhou | `toast.error('Título', 'detalhes')` |
| Operação destrutiva | `await confirm({ variant: 'destructive' })` antes |
| Validação inline | `<FormError message={...} />` |
| Erro server-side em form | Toast `error` + `FormError` no campo |

### 5.3 Empty states

Sempre 3 elementos: ilustração SVG + título curto + descrição com 1 ação.

```tsx
<EmptyIllustration variant="tasks" size={104} />
<p className="font-semibold">Sua lista está limpa</p>
<p className="text-sm text-muted">Comece criando a primeira tarefa.</p>
<button>+ Criar primeira tarefa</button>
```

### 5.4 Atalhos de teclado

| Tecla | Ação |
|-------|------|
| `⌘K` / `Ctrl+K` | Abre Command Palette |
| `?` | Alias para ⌘K |
| `G` `D` | Vai para Dashboard |
| `G` `L` | Vai para Lista |
| `G` `K` | Vai para Kanban |
| `G` `G` | Vai para Gantt |
| `G` `R` | Vai para Relatórios |
| `G` `P` | Vai para Perfil |
| `ESC` | Fecha modal/drawer/confirm |

---

## 6. Acessibilidade

Padrão mínimo: **WCAG AA**.

### 6.1 Checklist por componente

- [ ] Focus visible (`:focus-visible` outline azul + offset)
- [ ] Touch targets ≥ 36px (44px ideal)
- [ ] Contrast ratio ≥ 4.5:1 para texto
- [ ] `aria-label` em botões ícone-só
- [ ] `role="alert"` em mensagens de erro
- [ ] `aria-invalid` em campos com erro
- [ ] `htmlFor`/`id` em todos os labels (usar `useId()`)
- [ ] Keyboard navigation (Tab, Enter, Esc)
- [ ] Reduced motion respeitado (`prefers-reduced-motion`)

### 6.2 Já configurado globalmente

- Focus rings via `:focus-visible` em `globals.css`
- `lang="pt-BR"` no `<html>` (datas nativas + telas de leitura)
- `@media (prefers-reduced-motion)` desabilita animações

---

## 7. Governança

### 7.1 Modelo de ownership

**Híbrido:** core (este doc + tokens em `globals.css`) é mantido centralmente.
Componentes específicos de tela podem ser criados no diretório da página, mas
componentes reutilizáveis vão para `components/ui/`.

### 7.2 Versionamento

Semver na convenção de commits:

| Tipo | Quando |
|------|--------|
| `fix:` (patch) | Bug fix, ajuste de texto, ajuste visual minor |
| `feat:` (minor) | Componente/feature novo, sem quebrar contratos |
| `feat!:` ou `BREAKING CHANGE:` (major) | Renomeação/remoção de props, mudança de comportamento |

### 7.3 Deprecação

Quando substituir um componente:

1. Marcar status como 🔴 **deprecated** nesta tabela
2. Adicionar `@deprecated` no JSDoc do componente com referência ao substituto
3. Manter funcional por **pelo menos 1 release minor**
4. Atualizar consumidores progressivamente
5. Remover na próxima major version

### 7.4 Quality gate

Antes de adicionar um componente novo a `components/ui/`:

- [ ] É reutilizável em ≥2 telas (caso contrário, fica local na tela)
- [ ] Tem props tipadas (TypeScript)
- [ ] Passa no `npx tsc --noEmit` sem erros
- [ ] Acessibilidade conferida (checklist 6.1)
- [ ] Tokens usados, não hex hardcoded para cores semânticas
- [ ] Comentário JSDoc no topo explicando uso + 1 exemplo

---

## 8. Contribuição

### 8.1 Fluxo

1. **Discutir antes de codar** se a feature visual é >1h de trabalho — evita
   retrabalho por desalinhamento.
2. **Audit reusável:** antes de criar um componente, busque (`grep`) se já não
   existe algo similar.
3. **Implementar com tokens:** zero hex hardcoded para cor semântica
   (sempre `--primary-hex`, `--danger`, etc).
4. **Commit:** mensagem segue Conventional Commits (`feat:` / `fix:` / etc).
5. **Validar TS:** `npx tsc --noEmit` antes do push.

### 8.2 Anti-padrões — não fazer

- ❌ Adicionar `ring`/`shadow`/`pulse` aleatoriamente para "destacar" algo
  novo. Sempre perguntar: **qual é o entorno?** (Von Restorff).
- ❌ Criar um componente novo se um existente cobre 80% do caso.
- ❌ Usar Inter ou outras fontes além de Geist (banido).
- ❌ Hex hardcoded para cores que têm token (`#2563EB` → `var(--primary-hex)`).
- ❌ Animação contínua (loops infinitos) sem `prefers-reduced-motion`.
- ❌ Botão ícone-só sem `aria-label`.
- ❌ Texto < 12px em conteúdo principal (apenas captions).

### 8.3 Como adicionar um novo padrão de destaque

Quando legitimamente precisar de um novo "destaque":

1. Confirmar que é **a única coisa importante** naquela tela
2. Reduzir o destaque dos vizinhos (não aumentar todos juntos)
3. Verificar que sobrevive em **grayscale** (não depende só de cor)
4. Documentar nesta tabela (seção 3.4 — Aplicações Von Restorff)

---

## Changelog

| Data | Versão | Mudança |
|------|--------|---------|
| 2025-Q4 | v1.0 | Documentação inicial cobrindo tokens, componentes, hierarquia e governança |

---

> **Quando consultar este doc?**
> - Antes de criar componente novo
> - Quando dúvida sobre cor/espaçamento/tipografia
> - Quando algum elemento parece destoante e você não sabe por quê
> - Onboarding de novo dev no projeto
