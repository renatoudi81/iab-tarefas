'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { registrarAprendizadoIA, type AIContext } from '@/lib/ai-feedback'
import { motion, AnimatePresence } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useCategories } from '@/hooks/useCategories'
import { useProjects } from '@/hooks/useProjects'
import { STATUSES, PRIORITIES, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, formatMinutes, todayStr, formatDateBR, currentMonthRange } from '@/types'
import type { Task } from '@/types'
import { Plus, Search, Pencil, Trash2, X, Filter, MoreHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import TaskModal from '@/components/TaskModal'
import { AITaskCreator } from '@/components/AITaskCreator'
import type { TaskFormData } from '@/types'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import { EmptyIllustration } from '@/components/ui/EmptyIllustration'
import { stripHtml } from '@/components/ui/RichTextEditor'
import { Pagination } from '@/components/ui/Pagination'
import { getCategoryColor } from '@/lib/category-color'
import { useAuth } from '@/contexts/AuthContext'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'

const PAGE_SIZE = 10

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ListaPage() {
  const { tasks, deleteTask, isLoading: loadingTasks, isInitialLoad } = useTasks()
  const { users } = useUsers()
  const { categories } = useCategories()
  const { projects } = useProjects()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { user: authUser } = useAuth()
  const isAdmin = authUser?.perfil === 'Administrador'

  const router = useRouter()
  const mesAtual = currentMonthRange()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [dateFrom, setDateFrom] = useState(mesAtual.from)
  const [dateTo, setDateTo] = useState(mesAtual.to)
  const [modal, setModal] = useState<{ open: boolean; task: Task | null; initialData?: Partial<TaskFormData> }>({ open: false, task: null })
  // IA: modal de criação automatizada
  const [aiOpen, setAiOpen] = useState(false)
  const [page, setPage] = useState(1)

  // Ordenação da Lista:
  //   1. Por STATUS hierárquico (Atrasada → Em andamento → Aguardando →
  //      Pendente → Concluída sempre por último)
  //   2. Data de vencimento (mais próxima primeiro; sem prazo vai pro final)
  //   3. Prioridade (Crítica → Alta → Média → Baixa) como desempate
  //   4. Data de criação (mais antiga primeiro) como último desempate
  //
  // Dentro de cada grupo de status, as 3 regras de desempate se aplicam
  // — então tarefas Atrasadas com prazo mais antigo e prioridade Crítica
  // ficam no topo absoluto da lista.
  const STATUS_ORDER: Record<string, number> = useMemo(
    () => ({
      'Atrasada': 0,
      'Em andamento': 1,
      'Aguardando': 2,
      'Pendente': 3,
      'Concluída': 4,
    }),
    []
  )
  const PRIORITY_ORDER: Record<string, number> = useMemo(
    () => ({ 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 }),
    []
  )

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return tasks
      .filter(t => {
        if (filterProject && t.projeto_id !== filterProject) return false
        if (filterStatus && t.status !== filterStatus) return false
        if (filterPriority && t.prioridade !== filterPriority) return false
        if (filterUser && t.responsavel_id !== filterUser) return false
        // Date range — filtra por data_prazo (campo principal pra urgência)
        if ((dateFrom || dateTo) && !t.data_prazo) return false
        if (dateFrom && t.data_prazo && t.data_prazo < dateFrom) return false
        if (dateTo && t.data_prazo && t.data_prazo > dateTo) return false
        if (s && !t.titulo.toLowerCase().includes(s) && !stripHtml(t.descricao).toLowerCase().includes(s)) return false
        return true
      })
      .sort((a, b) => {
        // 1. Status (Atrasada primeiro, Concluída por último)
        const sDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
        if (sDiff !== 0) return sDiff

        // 2. Data de vencimento
        const aP = a.data_prazo ?? '9999-12-31'
        const bP = b.data_prazo ?? '9999-12-31'
        if (aP !== bP) return aP < bP ? -1 : 1

        // 3. Prioridade
        const pDiff = (PRIORITY_ORDER[a.prioridade] ?? 9) - (PRIORITY_ORDER[b.prioridade] ?? 9)
        if (pDiff !== 0) return pDiff

        // 4. Data de criação
        const aC = a.criado_em ?? ''
        const bC = b.criado_em ?? ''
        return aC < bC ? -1 : 1
      })
  }, [tasks, search, filterProject, filterStatus, filterPriority, filterUser, dateFrom, dateTo, STATUS_ORDER, PRIORITY_ORDER])

  // Reset para página 1 sempre que filtros mudarem (caso contrário,
  // o usuário poderia ficar numa página "vazia" após filtrar)
  useEffect(() => {
    setPage(1)
  }, [search, filterProject, filterStatus, filterPriority, filterUser, dateFrom, dateTo])

  // Slice da página atual
  const paginated = useMemo(() => {
    const startIdx = (page - 1) * PAGE_SIZE
    return filtered.slice(startIdx, startIdx + PAGE_SIZE)
  }, [filtered, page])

  const openNew = () => setModal({ open: true, task: null })
  const closeModal = () => setModal({ open: false, task: null })
  // Fluxo IA → TaskModal pré-preenchido. Guarda o contexto da IA pra
  // registrar aprendizado quando a tarefa for salva (se houver correção).
  const aiContextRef = useRef<AIContext | null>(null)
  const handleAIReady = (initialData: Partial<TaskFormData>, _meta: unknown, aiContext: AIContext) => {
    aiContextRef.current = aiContext
    setAiOpen(false)
    setModal({ open: true, task: null, initialData })
  }
  const handleTaskSaved = (task: Task) => {
    if (aiContextRef.current) {
      registrarAprendizadoIA(aiContextRef.current, task)
      aiContextRef.current = null
    }
  }

  const onTaskClick = (task: Task) => router.push(`/tarefas/${task.id}`)

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir tarefa?',
      description: 'A tarefa e todos os lançamentos de tempo associados serão removidos. Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deleteTask(id)
      toast.success('Tarefa excluída')
    } catch (err: any) {
      toast.error('Erro ao excluir tarefa', err.message || 'Tente novamente')
    }
  }

  const hasFilters = filterProject || filterStatus || filterPriority || filterUser || search || dateFrom !== mesAtual.from || dateTo !== mesAtual.to

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <Filter size={11} strokeWidth={2.5} />
              <span className="font-mono tabular-nums">{tasks.length}</span> total
            </span>
            {filtered.length !== tasks.length && (
              <span className="inline-flex items-center text-[0.7rem] font-medium text-[#71717A] bg-[#F4F4F5] px-2 py-0.5 rounded-full">
                <span className="font-mono tabular-nums">{filtered.length}</span>
                <span className="ml-1">filtradas</span>
              </span>
            )}
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
            Lista de Tarefas
          </h1>
          <p className="text-sm text-[#71717A] mt-1.5">
            Gerencie todas as tarefas do projeto, filtre por status, prioridade ou responsável.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão IA: visível apenas para Administrador */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="h-9 inline-flex items-center gap-1.5 bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] hover:opacity-90 active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(124,58,237,0.45)] transition-all cursor-pointer border-0"
            >
              <Sparkles size={14} strokeWidth={2.5} /> Nova com IA
            </button>
          )}
          <MagneticButton
            onClick={openNew}
            className="h-9 inline-flex items-center bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-colors cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} /> Nova Tarefa
          </MagneticButton>
        </div>
      </div>

      {/* Toolbar: busca + filtros — padrão mb-5 unificado (Kanban/Gantt/Relatórios) */}
      <div className="flex gap-2.5 flex-wrap items-center mb-5">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
          <Input
            type="text"
            className="pl-9 h-9 text-sm border-[#E4E4E7]"
            placeholder="Buscar por título ou descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {projects.length > 0 && (
          <Select value={filterProject || 'all'} onValueChange={v => setFilterProject(v === 'all' ? '' : v)}>
            <SelectTrigger aria-label="Filtrar por projeto" className="h-9 w-auto min-w-[150px] text-sm border-[#E4E4E7] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={filterStatus || 'all'} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
          <SelectTrigger aria-label="Filtrar por status" className="h-9 w-auto min-w-[148px] text-sm border-[#E4E4E7] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.values(STATUSES).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPriority || 'all'} onValueChange={v => setFilterPriority(v === 'all' ? '' : v)}>
          <SelectTrigger aria-label="Filtrar por prioridade" className="h-9 w-auto min-w-[158px] text-sm border-[#E4E4E7] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {Object.values(PRIORITIES).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Filtro por responsável — só admin pode ver tarefas de outros.
            Não-admin já recebe da API apenas as próprias tarefas, então
            esse filtro perde a função pra ele. */}
        {isAdmin && users.length > 1 && (
          <Select value={filterUser || 'all'} onValueChange={v => setFilterUser(v === 'all' ? '' : v)}>
            <SelectTrigger aria-label="Filtrar por responsável" className="h-9 w-auto min-w-[165px] text-sm border-[#E4E4E7] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {users
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-red-500 hover:text-red-700"
            onClick={() => {
              setSearch(''); setFilterProject(''); setFilterStatus(''); setFilterPriority(''); setFilterUser('')
              setDateFrom(mesAtual.from); setDateTo(mesAtual.to)
            }}
          >
            <X size={13} /> Limpar
          </Button>
        )}

        {/* Direita: date range — alinhado com Kanban e Gantt */}
        <div className="ml-auto">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EDEEF1] rounded-2xl overflow-x-auto shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F7F8FA] hover:bg-[#F7F8FA] border-b border-[#E4E4E7]">
              {['Tarefa', 'Status', 'Prioridade', 'Responsável', 'Prazo', 'Progresso', 'Ações'].map((h, i) => (
                <TableHead key={i} className="py-2.5 text-[0.72rem] font-bold uppercase tracking-wider text-[#71717A]">
                  {/* Última coluna (Ações) é apenas para leitores de tela */}
                  {i === 6 ? <span className="sr-only">{h}</span> : h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {(isInitialLoad || (loadingTasks && tasks.length === 0)) && (
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <TableRow key={`skeleton-${i}`} className="border-b border-[#F4F4F5] hover:bg-transparent">
                      <TableCell className="py-3.5">
                        <div className="space-y-2">
                          <div className="flex gap-1.5">
                            <div className="h-4 w-12 bg-[#F4F4F5] rounded animate-pulse" />
                            <div className="h-4 w-20 bg-[#F4F4F5] rounded animate-pulse" />
                          </div>
                          <div className="h-4 w-52 bg-[#F4F4F5] rounded animate-pulse" />
                        </div>
                      </TableCell>
                      <TableCell><div className="h-5 w-20 bg-[#F4F4F5] rounded-full animate-pulse" /></TableCell>
                      <TableCell><div className="h-5 w-16 bg-[#F4F4F5] rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-7 w-24 bg-[#F4F4F5] rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-[#F4F4F5] rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-[#F4F4F5] rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-8 w-8 bg-[#F4F4F5] rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!isInitialLoad && !loadingTasks && filtered.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-16 text-center text-[#71717A]">
                    <div className="flex flex-col items-center">
                      <EmptyIllustration variant={tasks.length === 0 ? 'tasks' : 'search'} size={104} />
                    </div>
                    <p className="font-semibold text-[#52525B] mb-1 mt-3">
                      {tasks.length === 0 ? 'Sua lista está limpa' : 'Nenhuma tarefa encontrada'}
                    </p>
                    <p className="text-[0.8125rem] max-w-sm mx-auto">
                      {tasks.length === 0
                        ? 'Comece criando a primeira tarefa do projeto — defina título, prazo e responsável.'
                        : 'Ajuste os filtros ou crie uma nova tarefa para começar.'}
                    </p>
                    {tasks.length === 0 && (
                      <button
                        onClick={openNew}
                        className="mt-5 h-9 inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-all cursor-pointer"
                      >
                        <Plus size={14} strokeWidth={2.5} /> Criar primeira tarefa
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {paginated.map((task, idx) => {
                const resp = users.find(u => u.id === task.responsavel_id)
                const overdue = task.data_prazo && task.data_prazo < todayStr() && task.status !== 'Concluída'
                const pct = task.tempo_estimado > 0 ? Math.min(100, Math.round((task.tempo_gasto_total / task.tempo_estimado) * 100)) : 0
                const isOver = task.tempo_gasto_total > task.tempo_estimado
                return (
                  <motion.tr
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 120,
                      damping: 22,
                      delay: idx * 0.025,
                    }}
                    className={cn(
                      'border-b border-[#F4F4F5] transition-colors',
                      // Von Restorff: tarefas vencidas têm bg vermelho MUITO
                      // sutil pra serem reconhecidas em uma varredura visual,
                      // sem competir com o conteúdo. Apenas as vencidas — todas
                      // as demais linhas ficam neutras (regra Von Restorff:
                      // contraste com o entorno).
                      overdue
                        ? 'bg-[#FEF2F2]/60 hover:bg-[#FEF2F2]'
                        : 'hover:bg-[#FAFAFA]',
                    )}
                  >
                    {/* Tarefa */}
                    <TableCell className="py-3 max-w-[300px]">
                      <div className="flex items-center gap-1.5 mb-1 min-w-0">
                        <span className="text-[0.63rem] font-mono font-semibold bg-[#EFF6FF] text-[#2563EB] px-1.5 py-[2px] rounded flex-shrink-0 tabular-nums tracking-tight">
                          #{task.numero ?? task.id.slice(-5).toUpperCase()}
                        </span>
                        {task.categoria && (() => {
                          const catColor = getCategoryColor(task.categoria)
                          return (
                            <span
                              className="inline-flex items-center gap-1 text-[0.63rem] font-semibold px-1.5 py-[2px] rounded truncate"
                              style={{ background: catColor.bg, color: catColor.hex }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: catColor.hex }}
                              />
                              <span className="truncate">{task.categoria}</span>
                            </span>
                          )
                        })()}
                      </div>
                      <div
                        className="font-medium text-sm truncate cursor-pointer hover:text-[#2563EB] transition-colors"
                        onClick={() => onTaskClick(task)}
                      >
                        {task.titulo}
                      </div>
                      {task.descricao && (
                        <div className="text-xs text-[#71717A] mt-0.5 truncate">
                          {stripHtml(task.descricao)}
                        </div>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3">
                      <span
                        className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
                        style={{ background: STATUS_COLORS[task.status] }}
                      >
                        {STATUS_LABELS[task.status]}
                      </span>
                    </TableCell>

                    {/* Prioridade */}
                    <TableCell className="py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md"
                        style={{
                          background: PRIORITY_COLORS[task.prioridade] + '18',
                          color: PRIORITY_COLORS[task.prioridade],
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[task.prioridade] }} />
                        {task.prioridade}
                      </span>
                    </TableCell>

                    {/* Responsável */}
                    <TableCell className="py-3">
                      {resp ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar user={resp} size={26} textSize="text-[10px]" />
                          <span className="text-[0.8125rem] text-[#71717A]">{resp.nome.split(' ')[0]}</span>
                        </div>
                      ) : <span className="text-[#71717A]">—</span>}
                    </TableCell>

                    {/* Prazo */}
                    <TableCell className={cn('py-3 text-[0.8125rem]', overdue ? 'text-[#DC2626] font-semibold' : 'text-[#71717A]')}>
                      {task.data_prazo ? (
                        <span className="flex items-center gap-1">
                          {overdue && (
                            <span className="text-[0.6rem] bg-[#DC2626] text-white px-1 py-0.5 rounded font-bold">
                              VENC
                            </span>
                          )}
                          {formatDateBR(task.data_prazo)}
                        </span>
                      ) : <span className="text-[#71717A]">—</span>}
                    </TableCell>

                    {/* Progresso */}
                    <TableCell className="py-3 min-w-[120px]">
                      <div className="flex justify-between text-xs mb-1 tabular-nums">
                        <span className={cn(isOver ? 'font-semibold text-[#DC2626]' : 'text-[#71717A]')}>
                          {formatMinutes(task.tempo_gasto_total)}
                        </span>
                        <span className="text-[#71717A]">{formatMinutes(task.tempo_estimado)}</span>
                      </div>
                      <Progress
                        value={pct}
                        className={cn('h-1.5', isOver && '[&>div]:bg-destructive')}
                        aria-label={`Progresso: ${Math.round(pct)}%`}
                      />
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Ações para tarefa "${task.titulo}"`}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#F7F8FA] text-[#71717A] transition-colors cursor-pointer border-0 bg-transparent"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => router.push(`/tarefas/${task.id}`)} className="gap-2 cursor-pointer">
                            <Pencil size={13} />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(task.id)}
                            className="gap-2 cursor-pointer text-[#DC2626] focus:text-[#DC2626] focus:bg-[#FEF2F2]"
                          >
                            <Trash2 size={13} />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </TableBody>
        </Table>

        {/* Paginação — só mostra quando há mais de 1 página */}
        {filtered.length > PAGE_SIZE && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            itemLabel="tarefas"
          />
        )}
      </div>

      {/* Modal de criar/editar tarefa */}
      <TaskModal
        open={modal.open}
        task={modal.task}
        initialData={modal.initialData}
        onClose={closeModal}
        onSaved={handleTaskSaved}
      />
      <AITaskCreator
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onReady={handleAIReady}
      />
    </div>
  )
}
