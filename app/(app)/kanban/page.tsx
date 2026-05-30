'use client'
import { useMemo, useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useProjects } from '@/hooks/useProjects'
import { registrarAprendizadoIA, type AIContext } from '@/lib/ai-feedback'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, getInitials, formatMinutes, formatDateBR } from '@/types'
import type { Status, Task } from '@/types'
import { Calendar, CheckSquare, Clock, Plus, Tag, LayoutGrid, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { MagneticButton } from '@/components/ui/MagneticButton'
import TaskModal from '@/components/TaskModal'
import { AITaskCreator } from '@/components/AITaskCreator'
import { Sparkles } from 'lucide-react'
import type { TaskFormData } from '@/types'
import { stripHtml } from '@/components/ui/RichTextEditor'
import { getCategoryColor } from '@/lib/category-color'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { useAuth } from '@/contexts/AuthContext'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'

const COLUMNS: Status[] = ['Pendente', 'Em andamento', 'Aguardando', 'Atrasada', 'Concluída']

const PRIORITY_ORDER: Record<string, number> = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 }

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // 1. Data de vencimento (mais próxima primeiro; sem prazo vai pro final)
    const aP = a.data_prazo ?? '9999-12-31'
    const bP = b.data_prazo ?? '9999-12-31'
    if (aP !== bP) return aP < bP ? -1 : 1
    // 2. Prioridade (Crítica → Alta → Média → Baixa) como desempate
    const pDiff = (PRIORITY_ORDER[a.prioridade] ?? 9) - (PRIORITY_ORDER[b.prioridade] ?? 9)
    if (pDiff !== 0) return pDiff
    // 3. Data de criação (mais antiga primeiro) como último desempate
    const aC = a.criado_em ?? ''
    const bC = b.criado_em ?? ''
    return aC < bC ? -1 : 1
  })
}

export default function KanbanPage() {
  const { tasks: swrTasks, updateTask, deleteTask, isLoading, isInitialLoad } = useTasks()
  const { users } = useUsers()
  const { projects } = useProjects()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { user: authUser } = useAuth()
  const isAdmin = authUser?.perfil === 'Administrador'

  // Filtros — date range (data_prazo) e usuário responsável (admin-only)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterUserId, setFilterUserId] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const hasFilter = !!dateFrom || !!dateTo || filterUserId !== 'all' || filterProject !== 'all'
  const clearFilters = () => { setDateFrom(''); setDateTo(''); setFilterUserId('all'); setFilterProject('all') }

  // Modal de criar/editar tarefa
  const [modal, setModal] = useState<{
    open: boolean
    task: Task | null
    initialStatus?: Status
    initialData?: Partial<TaskFormData>
  }>({ open: false, task: null })
  const [aiOpen, setAiOpen] = useState(false)

  const openNew = (status?: Status) => setModal({ open: true, task: null, initialStatus: status })
  const openEdit = (task: Task) => setModal({ open: true, task })
  const closeModal = () => setModal({ open: false, task: null })
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

  const handleDelete = async (task: Task) => {
    const ok = await confirm({
      title: 'Excluir tarefa?',
      description: `"${task.titulo}" e todos os lançamentos de tempo serão removidos. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deleteTask(task.id)
      toast.success('Tarefa excluída')
    } catch (err: any) {
      toast.error('Erro ao excluir tarefa', err.message)
    }
  }

  const [localTasks, setLocalTasks] = useState<Task[]>(swrTasks)
  // Guarda IDs com updates pendentes — bloqueia o sync de swrTasks
  // enquanto o servidor não confirma a mudança (evita o card "voltar")
  const pendingIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (pendingIds.current.size === 0) {
      setLocalTasks(swrTasks)
    }
  }, [swrTasks])

  // Aplica filtros ANTES de dividir em colunas — assim cada coluna do
  // Kanban só mostra o subconjunto filtrado e os contadores refletem o
  // que de fato está visível.
  const filteredTasks = useMemo(() => {
    return localTasks.filter(t => {
      if (filterProject !== 'all' && t.projeto_id !== filterProject) return false
      // Filtro por responsável (admin escolhe; não-admin sempre vê só
      // o que a API retorna — que já é o próprio)
      if (filterUserId !== 'all' && t.responsavel_id !== filterUserId) return false
      // Filtro por data: usamos data_prazo como a referência principal.
      // Tarefas sem prazo são incluídas só quando NÃO há range definido.
      if ((dateFrom || dateTo) && !t.data_prazo) return false
      if (dateFrom && t.data_prazo && t.data_prazo < dateFrom) return false
      if (dateTo && t.data_prazo && t.data_prazo > dateTo) return false
      return true
    })
  }, [localTasks, filterProject, filterUserId, dateFrom, dateTo])

  const columns = useMemo(() =>
    COLUMNS.map(status => {
      const col = sortTasks(filteredTasks.filter(t => t.status === status))
      return {
        status,
        tasks: col,
        totalMin: col.reduce((s, t) => s + (t.tempo_estimado || 0), 0),
      }
    }),
    [filteredTasks]
  )

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination || destination.droppableId === source.droppableId) return
    const newStatus = destination.droppableId as Status

    // 1. Marca como pendente ANTES do flushSync para bloquear o useEffect
    pendingIds.current.add(draggableId)

    // 2. Atualiza UI sincronamente (impede o snap-back do @hello-pangea/dnd)
    flushSync(() => {
      setLocalTasks(prev => prev.map(t =>
        t.id === draggableId ? { ...t, status: newStatus } : t
      ))
    })

    // 3. Persiste no servidor; libera o sync após resposta
    updateTask(draggableId, { status: newStatus })
      .catch(() => {
        // Em caso de erro, reverte para o estado real do servidor
        setLocalTasks(swrTasks)
      })
      .finally(() => {
        pendingIds.current.delete(draggableId)
      })
  }

  const today = new Date().toISOString().split('T')[0]

  if (isInitialLoad || (isLoading && swrTasks.length === 0)) {
    return <KanbanSkeleton />
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Page header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <LayoutGrid size={11} strokeWidth={2.5} />
              <span className="font-mono tabular-nums">{filteredTasks.length}</span> cards
            </span>
            {hasFilter && filteredTasks.length !== localTasks.length && (
              <span className="inline-flex items-center text-[0.7rem] font-medium text-[#71717A] bg-[#F4F4F5] px-2 py-0.5 rounded-full">
                <span className="font-mono tabular-nums">{localTasks.length}</span>
                <span className="ml-1">no total</span>
              </span>
            )}
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
            Kanban
          </h1>
          <p className="text-[#71717A] text-sm mt-1.5">
            Arraste os cards entre colunas para atualizar o status — a mudança é persistida automaticamente.
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
            onClick={() => openNew()}
            className="h-9 inline-flex items-center bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-colors cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            Nova Tarefa
          </MagneticButton>
        </div>
      </div>

      {/*
        Toolbar de filtros — mesma altura (h-9) e visual weight do padrão
        usado em Lista e Relatórios (consistência aesthetic-usability).
        Date range filtra por data_prazo; user picker só aparece pra admin
        (não-admin já vê apenas as próprias tarefas via filtro server-side).
      */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        {/* Projeto */}
        {projects.length > 0 && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger aria-label="Filtrar por projeto" className="h-9 w-[170px] text-sm bg-white">
              <SelectValue placeholder="Projeto..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Esquerda: filtros conceituais (responsável) */}
        {isAdmin && users.length > 1 && (
          <Select value={filterUserId} onValueChange={setFilterUserId}>
            <SelectTrigger aria-label="Filtrar por responsável" className="h-9 w-[180px] text-sm bg-white">
              <SelectValue placeholder="Responsável..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {users
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}

        {hasFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[0.78rem] font-medium text-[#52525B] border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] transition-colors cursor-pointer"
          >
            <X size={13} />
            Limpar filtros
          </button>
        )}

        {/* Direita: date range — padrão visual unificado, sempre no fim
            da toolbar pra ficar visualmente alinhado em todas as telas */}
        <div className="ml-auto">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
          />
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div
          className="flex gap-3 overflow-x-auto pb-6 items-start flex-1"
          style={{ minHeight: 0 }}
        >
          {columns.map(({ status, tasks: col, totalMin }) => {
            const color = STATUS_COLORS[status]
            return (
              <div
                key={status}
                className="flex flex-col"
                style={{ minWidth: '220px', flex: '1 1 0' }}
              >
                {/* Column header */}
                <div className="flex items-stretch mb-3 sticky top-0 z-10 rounded-xl overflow-hidden bg-white border border-[#EDEEF1] shadow-[0_4px_16px_-6px_rgba(37,99,235,0.10)]">
                  <div className="w-[3px] flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[0.8125rem] text-[#111111] flex-1 tracking-[-0.01em]">
                        {STATUS_LABELS[status]}
                      </span>
                      <span
                        className="text-[0.65rem] text-white font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 min-w-[20px] text-center tabular-nums"
                        style={{ background: color }}
                      >
                        {col.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => openNew(status)}
                        title="Adicionar tarefa nesta coluna"
                        className="ml-0.5 h-6 w-6 flex items-center justify-center rounded-md text-[#71717A] hover:text-[#111111] hover:bg-[#F4F4F5] transition-colors cursor-pointer border-0 bg-transparent"
                      >
                        <Plus size={13} strokeWidth={2.4} />
                      </button>
                    </div>
                    <p className="text-[0.7rem] text-[#71717A] mt-1 tabular-nums">
                      {col.length} tarefa{col.length !== 1 ? 's' : ''}&nbsp;·&nbsp;
                      {totalMin > 0 ? formatMinutes(totalMin) : '—'}
                    </p>
                  </div>
                </div>

                {/* Droppable zone */}
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex flex-col gap-2 flex-1 min-h-[100px] rounded-xl p-1.5 transition-colors duration-150"
                      style={{
                        background: snapshot.isDraggingOver ? color + '08' : '#F7F8FA',
                        border: snapshot.isDraggingOver ? `1.5px dashed ${color}45` : '1.5px solid transparent',
                      }}
                    >
                      {col.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center py-8">
                          <p className="text-[0.75rem] text-[#C4C4C8]">Sem tarefas</p>
                        </div>
                      )}

                      {col.map((task, index) => {
                        const resp = task.responsavel_id
                          ? users.find(u => u.id === task.responsavel_id)
                          : (task.responsavel ?? null)
                        const overdue = task.data_prazo && task.data_prazo < today && status !== 'Concluída'
                        const totalSubtasks = task._count?.subtasks ?? task.subtasks?.length ?? 0
                        const doneSubtasks = task.subtasks?.filter(s => s.concluida).length ?? 0
                        const allDone = totalSubtasks > 0 && doneSubtasks === totalSubtasks
                        const prioColor = PRIORITY_COLORS[task.prioridade]
                        // Cor do status (Pendente, Em andamento, Aguardando,
                        // Atrasada, Concluída) — usada no border esquerdo do
                        // card para que seja escaneável a coluna toda sem ler.
                        const statusColor = STATUS_COLORS[task.status]

                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(drag, dragSnapshot) => (
                              <Card
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                {...drag.dragHandleProps}
                                className={cn(
                                  'bg-white border border-[#E8E8EC] rounded-lg',
                                  // Altura FIXA — todos os cards ficam exatamente
                                  // do mesmo tamanho visual, independentemente de
                                  // ter ou não descrição/subtarefas. Conteúdo
                                  // excedente é cortado (line-clamp já limita o
                                  // tamanho do texto, então corte é raro).
                                  'h-[260px] overflow-hidden',
                                  !dragSnapshot.isDragging && 'card-lift',
                                  dragSnapshot.isDragging && 'opacity-95 rotate-[0.8deg]'
                                )}
                                style={{
                                  cursor: dragSnapshot.isDragging ? 'grabbing' : 'grab',
                                  // Borda esquerda 3px na cor do status — toda
                                  // a coluna fica visualmente coerente, e cards
                                  // que mudam de status ganham a nova cor.
                                  borderLeftWidth: '3px',
                                  borderLeftColor: statusColor,
                                  boxShadow: dragSnapshot.isDragging
                                    ? '0 8px 28px rgba(0,0,0,0.14)'
                                    : '0 1px 2px rgba(0,0,0,0.04)',
                                  ...drag.draggableProps.style,
                                }}
                              >
                                <CardContent className="p-0 flex flex-col h-full">

                                  {/* TOP — info compacta (categoria + prio + menu) */}
                                  <div className="px-3.5 pt-3 pb-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      {task.categoria && (() => {
                                        const catColor = getCategoryColor(task.categoria)
                                        return (
                                          <span
                                            className="inline-flex items-center gap-1 text-[0.65rem] font-semibold px-1.5 py-[2px] rounded truncate"
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
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <span
                                        className="text-[0.62rem] font-bold uppercase tracking-wider px-2 py-[3px] rounded-full"
                                        style={{
                                          background: prioColor + '22',
                                          color: prioColor,
                                        }}
                                      >
                                        {task.prioridade}
                                      </span>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            type="button"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-6 w-6 flex items-center justify-center rounded-md text-[#71717A] hover:text-[#111111] hover:bg-[#F4F4F5] transition-colors cursor-pointer border-0 bg-transparent"
                                            title="Ações"
                                          >
                                            <MoreHorizontal size={14} />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-36">
                                          <DropdownMenuItem
                                            onClick={(e) => { e.stopPropagation(); openEdit(task) }}
                                            className="gap-2 cursor-pointer text-[0.82rem]"
                                          >
                                            <Pencil size={13} />
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={(e) => { e.stopPropagation(); handleDelete(task) }}
                                            className="gap-2 cursor-pointer text-[0.82rem] text-[#DC2626] focus:text-[#DC2626] focus:bg-[#FEF2F2]"
                                          >
                                            <Trash2 size={13} />
                                            Excluir
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>

                                  {/* BODY — título + descrição + subtarefas */}
                                  <div className="px-3.5 flex-1 flex flex-col min-h-0">
                                    {/* Título — peso e tamanho maiores pra dominar a hierarquia */}
                                    <p
                                      className="text-[0.92rem] font-bold text-[#0F172A] leading-snug tracking-[-0.005em] mb-1.5"
                                      style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {task.titulo}
                                    </p>

                                    {/* Descrição */}
                                    {task.descricao && stripHtml(task.descricao) && (
                                      <p
                                        className="text-[0.75rem] text-[#71717A] leading-relaxed mb-2"
                                        style={{
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                        }}
                                      >
                                        {stripHtml(task.descricao)}
                                      </p>
                                    )}

                                    {/* Subtarefas progress */}
                                    {totalSubtasks > 0 && (
                                      <div className="mt-1">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[0.65rem] text-[#71717A] flex items-center gap-1 font-medium">
                                            <CheckSquare size={10} className={allDone ? 'text-[#15803D]' : 'text-[#71717A]'} />
                                            Subtarefas
                                          </span>
                                          <span className={cn('text-[0.65rem] font-bold tabular-nums', allDone ? 'text-[#15803D]' : 'text-[#52525B]')}>
                                            {doneSubtasks}/{totalSubtasks}
                                          </span>
                                        </div>
                                        <div className="h-1 w-full rounded-full bg-[#F0F0F2] overflow-hidden">
                                          <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                              width: `${Math.round((doneSubtasks / totalSubtasks) * 100)}%`,
                                              background: allDone ? '#16A34A' : color,
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* FOOTER — bg sutil pra separar visualmente.
                                       Avatar do responsável (24px) + nome compacto à esquerda;
                                       prazo (com destaque se vencido) + tempo à direita. */}
                                  <div className="mt-auto px-3.5 py-2.5 bg-[#FAFAFA] border-t border-[#F0F0F2] flex items-center gap-2">
                                    {resp ? (
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <UserAvatar user={resp as any} size={22} textSize="text-[9px]" />
                                        <span className="text-[0.7rem] font-medium text-[#3F3F46] truncate">{(resp as any).nome.split(' ')[0]}</span>
                                      </div>
                                    ) : <div className="flex-1" />}

                                    <div className="flex items-center gap-2 flex-shrink-0 text-[0.68rem]">
                                      {task.tempo_estimado > 0 && (
                                        <span className="inline-flex items-center gap-0.5 text-[#71717A] tabular-nums">
                                          <Clock size={10} className="text-[#71717A]" />
                                          {formatMinutes(task.tempo_estimado)}
                                        </span>
                                      )}
                                      {task.data_prazo && (
                                        <span
                                          className={cn(
                                            'inline-flex items-center gap-0.5 tabular-nums px-1.5 py-[2px] rounded font-semibold',
                                            overdue
                                              ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                              : 'bg-white text-[#3F3F46] border border-[#E4E4E7]',
                                          )}
                                        >
                                          <Calendar size={10} className={overdue ? 'text-[#DC2626]' : 'text-[#71717A]'} />
                                          {formatDateBR(task.data_prazo)}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        )
                      })}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {/* Modal de criar/editar tarefa */}
      <TaskModal
        open={modal.open}
        task={modal.task}
        initialStatus={modal.initialStatus}
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

/* ─── Skeleton ──────────────────────────────────────────────── */
function KanbanSkeleton() {
  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <div className="mb-6 flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-5 w-20 rounded-full bg-[#F4F4F5]" />
          <div className="h-8 w-32 rounded-md bg-[#F4F4F5]" />
          <div className="h-3 w-72 rounded-md bg-[#F4F4F5]" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-[#F4F4F5]" />
      </div>

      <div className="flex gap-3 overflow-hidden flex-1">
        {COLUMNS.map((status, ci) => (
          <div key={status} className="flex flex-col" style={{ minWidth: '220px', flex: '1 1 0' }}>
            {/* Header */}
            <div className="flex items-stretch mb-3 rounded-xl overflow-hidden bg-white border border-[#EDEEF1]">
              <div className="w-[3px] flex-shrink-0 bg-[#E4E4E7]" />
              <div className="flex-1 px-3.5 py-3 space-y-2">
                <div className="h-3 w-20 rounded bg-[#F4F4F5]" />
                <div className="h-2.5 w-12 rounded bg-[#F4F4F5]" />
              </div>
            </div>
            {/* Cards mock */}
            <div className="space-y-2">
              {Array.from({ length: 2 + ((ci * 7) % 3) }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white border border-[#EDEEF1] rounded-xl p-3 space-y-2"
                  style={{
                    opacity: 0.6,
                    animation: `shimmer 1.6s ease-in-out ${i * 0.12}s infinite`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-12 rounded bg-[#EFF6FF]" />
                    <div className="h-3 w-8 rounded bg-[#F4F4F5]" />
                  </div>
                  <div className="h-3 w-full rounded bg-[#F4F4F5]" />
                  <div className="h-3 w-3/4 rounded bg-[#F4F4F5]" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-5 w-5 rounded-full bg-[#F4F4F5]" />
                    <div className="h-2.5 w-14 rounded bg-[#F4F4F5]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
