'use client'
import { useMemo, useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, getInitials, formatMinutes } from '@/types'
import type { Status, Task } from '@/types'
import { Calendar, CheckSquare, Clock, Plus, Tag, LayoutGrid, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { MagneticButton } from '@/components/ui/MagneticButton'
import TaskModal from '@/components/TaskModal'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'

const COLUMNS: Status[] = ['Pendente', 'Em andamento', 'Aguardando', 'Atrasada', 'Concluída']

const PRIORITY_ORDER: Record<string, number> = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 }

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // 1. Prioridade (Crítica → Alta → Média → Baixa)
    const pDiff = (PRIORITY_ORDER[a.prioridade] ?? 9) - (PRIORITY_ORDER[b.prioridade] ?? 9)
    if (pDiff !== 0) return pDiff
    // 2. Data de vencimento (mais próxima primeiro; sem prazo vai para o final)
    const aP = a.data_prazo ?? '9999-12-31'
    const bP = b.data_prazo ?? '9999-12-31'
    if (aP !== bP) return aP < bP ? -1 : 1
    // 3. Data de criação (mais antiga primeiro)
    const aC = a.criado_em ?? ''
    const bC = b.criado_em ?? ''
    return aC < bC ? -1 : 1
  })
}

export default function KanbanPage() {
  const { tasks: swrTasks, updateTask, deleteTask, isLoading } = useTasks()
  const { users } = useUsers()
  const { toast } = useToast()
  const { confirm } = useConfirm()

  // Modal de criar/editar tarefa
  const [modal, setModal] = useState<{
    open: boolean
    task: Task | null
    initialStatus?: Status
  }>({ open: false, task: null })

  const openNew = (status?: Status) => setModal({ open: true, task: null, initialStatus: status })
  const openEdit = (task: Task) => setModal({ open: true, task })
  const closeModal = () => setModal({ open: false, task: null })

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

  const columns = useMemo(() =>
    COLUMNS.map(status => {
      const col = sortTasks(localTasks.filter(t => t.status === status))
      return {
        status,
        tasks: col,
        totalMin: col.reduce((s, t) => s + (t.tempo_estimado || 0), 0),
      }
    }),
    [localTasks]
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

  if (isLoading && swrTasks.length === 0) {
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
              <span className="font-mono tabular-nums">{localTasks.length}</span> cards
            </span>
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
            Kanban
          </h1>
          <p className="text-[#71717A] text-sm mt-1.5 max-w-[58ch]">
            Arraste os cards entre colunas para atualizar o status — a mudança é persistida automaticamente.
          </p>
        </div>
        <MagneticButton
          onClick={() => openNew()}
          className="h-9 inline-flex items-center bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-colors cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} />
          Nova Tarefa
        </MagneticButton>
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
                    <p className="text-[0.7rem] text-[#A1A1AA] mt-1 tabular-nums">
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
                        const shortId = task.id.slice(-5).toUpperCase()
                        const prioColor = PRIORITY_COLORS[task.prioridade]

                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(drag, dragSnapshot) => (
                              <Card
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                {...drag.dragHandleProps}
                                className={cn(
                                  'bg-white border border-[#E8E8EC] rounded-lg min-h-[200px]',
                                  !dragSnapshot.isDragging && 'card-lift',
                                  dragSnapshot.isDragging && 'opacity-95 rotate-[0.8deg]'
                                )}
                                style={{
                                  cursor: dragSnapshot.isDragging ? 'grabbing' : 'grab',
                                  boxShadow: dragSnapshot.isDragging
                                    ? '0 8px 28px rgba(0,0,0,0.14)'
                                    : '0 1px 2px rgba(0,0,0,0.04)',
                                  ...drag.draggableProps.style,
                                }}
                              >
                                <CardContent className="p-3.5 flex flex-col h-full min-h-[200px]">

                                  {/* ID + Prioridade + Ações */}
                                  <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <span className="text-[0.62rem] font-mono font-semibold bg-[#EFF6FF] text-[#2563EB] px-1.5 py-[2px] rounded flex-shrink-0 tabular-nums tracking-tight">
                                      #{shortId}
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <span
                                        className="text-[0.65rem] font-semibold px-2 py-[2px] rounded-full"
                                        style={{
                                          background: prioColor + '18',
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
                                            className="h-6 w-6 flex items-center justify-center rounded-md text-[#A1A1AA] hover:text-[#111111] hover:bg-[#F4F4F5] transition-colors cursor-pointer border-0 bg-transparent"
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

                                  {/* Título */}
                                  <p
                                    className="text-[0.8125rem] font-bold text-[#111111] leading-snug mb-1.5"
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
                                  {task.descricao && (
                                    <p
                                      className="text-[0.75rem] text-[#71717A] leading-relaxed mb-2.5"
                                      style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {task.descricao}
                                    </p>
                                  )}

                                  {/* Subtasks progress (when applicable) */}
                                  {totalSubtasks > 0 && (
                                    <div className="mb-2.5">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[0.68rem] text-[#71717A] flex items-center gap-1">
                                          <CheckSquare size={10} className={allDone ? 'text-[#16A34A]' : ''} />
                                          Subtarefas
                                        </span>
                                        <span className={cn('text-[0.68rem] font-medium', allDone ? 'text-[#16A34A]' : 'text-[#71717A]')}>
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

                                  {/* Separador — mt-auto empurra o rodapé para baixo,
                                       garantindo metadados sempre ancorados independente
                                       da altura do conteúdo acima */}
                                  <div className="h-px bg-[#F0F0F2] mt-auto mb-2.5" />

                                  {/* Metadados (rodapé do card) */}
                                  <div className="flex flex-col gap-1.5">

                                    {/* Categoria */}
                                    {task.categoria && (
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Tag size={11} className="text-[#A1A1AA] flex-shrink-0" />
                                        <span className="text-[0.72rem] text-[#52525B] truncate">{task.categoria}</span>
                                      </div>
                                    )}

                                    {/* Responsável */}
                                    {resp && (
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <UserAvatar user={resp as any} size={16} textSize="text-[7px]" />
                                        <span className="text-[0.72rem] text-[#52525B] truncate">{(resp as any).nome}</span>
                                      </div>
                                    )}

                                    {/* Tempo estimado + Prazo */}
                                    <div className="flex items-center gap-3 mt-0.5">
                                      {task.tempo_estimado ? (
                                        <div className="flex items-center gap-1">
                                          <Clock size={11} className="text-[#A1A1AA] flex-shrink-0" />
                                          <span className="text-[0.72rem] text-[#52525B]">
                                            {formatMinutes(task.tempo_estimado)}
                                          </span>
                                        </div>
                                      ) : null}

                                      {task.data_prazo && (
                                        <div className="flex items-center gap-1 ml-auto">
                                          <Calendar size={11} className={cn('flex-shrink-0', overdue ? 'text-[#DC2626]' : 'text-[#A1A1AA]')} />
                                          <span className={cn(
                                            'text-[0.72rem]',
                                            overdue ? 'text-[#DC2626] font-semibold' : 'text-[#52525B]'
                                          )}>
                                            {task.data_prazo}
                                          </span>
                                        </div>
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
        onClose={closeModal}
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
