'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Edit2, CheckSquare, MessageSquare, Clock, History,
  Play, Square, Plus, Trash2, ChevronRight
} from 'lucide-react'
import { useComments } from '@/hooks/useComments'
import { useSubtasks } from '@/hooks/useSubtasks'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useTaskHistory } from '@/hooks/useTaskHistory'
import { useUsers } from '@/hooks/useUsers'
import type { Task } from '@/types'
import {
  getInitials, formatMinutes,
  STATUS_COLORS, PRIORITY_COLORS
} from '@/types'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useToast } from '@/contexts/ToastContext'

type DrawerTab = 'detalhes' | 'subtarefas' | 'comentarios' | 'tempo' | 'historico'

interface TaskDrawerProps {
  task: Task | null
  onClose: () => void
  onEdit: (task: Task) => void
}

/* â”€â”€â”€ helpers â”€â”€â”€ */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'â€”'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return 'â€”'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function fmtSeconds(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* â”€â”€â”€ Sub-components â”€â”€â”€ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.72rem] font-bold tracking-[0.06em] uppercase text-[#71717A] mb-1.5">
      {children}
    </div>
  )
}

function DetalhesTab({ task, users }: { task: Task; users: ReturnType<typeof useUsers>['users'] }) {
  const resp = users.find(u => u.id === task.responsavel_id)
  const pct = task.tempo_estimado > 0 ? Math.min(100, Math.round((task.tempo_gasto_total / task.tempo_estimado) * 100)) : 0
  const isOver = task.tempo_gasto_total > task.tempo_estimado

  return (
    <div className="flex flex-col gap-5">
      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <SectionLabel>Categoria</SectionLabel>
          <div className="font-medium">{task.categoria || 'â€”'}</div>
        </div>
        <div>
          <SectionLabel>ResponsÃ¡vel</SectionLabel>
          {resp ? (
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback
                  className="text-[11px] font-semibold text-white"
                  style={{ background: resp.avatar_color }}
                >
                  {getInitials(resp.nome)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{resp.nome}</span>
            </div>
          ) : <span className="text-[#71717A]">â€”</span>}
        </div>
        <div>
          <SectionLabel>Data InÃ­cio</SectionLabel>
          <div className="text-[#71717A]">{fmtDate(task.data_inicio)}</div>
        </div>
        <div>
          <SectionLabel>Vencimento</SectionLabel>
          <div className="text-[#71717A]">{fmtDate(task.data_prazo)}</div>
        </div>
      </div>

      <Separator />

      {/* Progresso de tempo */}
      <div>
        <SectionLabel>Tempo Estimado vs Gasto</SectionLabel>
        <div className="flex justify-between text-[0.8125rem] mb-1.5">
          <span className={cn(isOver ? 'font-semibold text-[#DC2626]' : 'text-[#71717A]')}>
            {formatMinutes(task.tempo_gasto_total)} gastos
          </span>
          <span className="text-[#71717A]">{formatMinutes(task.tempo_estimado)} estimados</span>
        </div>
        <Progress
          value={pct}
          className={cn('h-2', isOver && '[&>div]:bg-destructive')}
        />
        <div className="text-xs text-[#71717A] mt-1 text-right">{pct}%</div>
      </div>

      {/* DescriÃ§Ã£o */}
      {task.descricao && (
        <>
          <Separator />
          <div>
            <SectionLabel>DescriÃ§Ã£o</SectionLabel>
            <div className="text-[#71717A] text-sm leading-relaxed whitespace-pre-wrap">{task.descricao}</div>
          </div>
        </>
      )}

      {/* ObservaÃ§Ãµes */}
      {task.observacoes && (
        <>
          <Separator />
          <div>
            <SectionLabel>ObservaÃ§Ãµes</SectionLabel>
            <div className="text-[#71717A] text-sm leading-relaxed whitespace-pre-wrap bg-[#F7F8FA] rounded-lg p-3">{task.observacoes}</div>
          </div>
        </>
      )}

      {/* Aguardando */}
      {task.status === 'Aguardando' && (task.aguardando_quem || task.data_retorno_esperada) && (
        <>
          <Separator />
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex flex-col gap-2">
            <div className="text-[0.72rem] font-bold tracking-[0.06em] uppercase text-amber-500 mb-1">
              Aguardando Retorno
            </div>
            {task.aguardando_quem && (
              <div className="text-sm">
                <span className="text-[#71717A] text-[0.8rem]">De: </span>{task.aguardando_quem}
              </div>
            )}
            {task.data_retorno_esperada && (
              <div className="text-sm">
                <span className="text-[#71717A] text-[0.8rem]">Data esperada: </span>{fmtDate(task.data_retorno_esperada)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SubtarefasTab({ taskId }: { taskId: string }) {
  const { subtasks, addSubtask, toggleSubtask, deleteSubtask, isLoading, completedCount, totalCount } = useSubtasks(taskId)
  const [newTitulo, setNewTitulo] = useState('')
  const [adding, setAdding] = useState(false)
  const { toast } = useToast()

  const handleAdd = async () => {
    const t = newTitulo.trim()
    if (!t) return
    setAdding(true)
    try {
      await addSubtask(t)
      setNewTitulo('')
    } finally {
      setAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      {totalCount > 0 && (
        <div className="text-[0.8125rem] text-[#71717A] font-medium">
          {completedCount} de {totalCount} concluÃ­da{totalCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="text-[#71717A] text-sm">Carregando...</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <AnimatePresence>
            {subtasks.map(s => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-[#F7F8FA]"
              >
                <Checkbox
                  checked={s.concluida}
                  onCheckedChange={() => toggleSubtask(s.id)}
                  className="shrink-0"
                />
                <span className={cn(
                  'flex-1 text-sm',
                  s.concluida ? 'text-[#71717A] line-through' : 'text-foreground'
                )}>
                  {s.titulo}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-[26px] h-[26px] opacity-50 hover:opacity-100"
                  onClick={async () => {
                    if (!confirm('Remover esta subtarefa?')) return
                    try { await deleteSubtask(s.id); toast.success('Subtarefa removida') }
                    catch (err: any) { toast.error('Erro ao remover subtarefa', err.message) }
                  }}
                  title="Remover"
                >
                  <X size={12} />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
          {subtasks.length === 0 && (
            <div className="text-[#71717A] text-sm py-1">Nenhuma subtarefa ainda.</div>
          )}
        </div>
      )}

      {/* Adicionar */}
      <div className="flex gap-2">
        <Input
          placeholder="Nova subtarefa... (Enter para confirmar)"
          value={newTitulo}
          onChange={e => setNewTitulo(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={adding}
          className="flex-1"
        />
        <Button
          size="icon"
          className="w-9 h-9 shrink-0"
          onClick={handleAdd}
          disabled={adding || !newTitulo.trim()}
        >
          <Plus size={15} />
        </Button>
      </div>
    </div>
  )
}

function ComentariosTab({ taskId }: { taskId: string }) {
  const { comments, addComment, deleteComment, isLoading } = useComments(taskId)
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  const handleSend = async () => {
    const t = texto.trim()
    if (!t) return
    setSending(true)
    try {
      await addComment(t)
      setTexto('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Lista */}
      {isLoading ? (
        <div className="text-[#71717A] text-sm">Carregando...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.length === 0 && (
            <div className="text-[#71717A] text-sm">Nenhum comentÃ¡rio ainda.</div>
          )}
          <AnimatePresence>
            {comments.map(c => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex gap-2.5 items-start"
              >
                <Avatar className="w-[30px] h-[30px] shrink-0 mt-0.5">
                  <AvatarFallback
                    className="text-[11px] font-semibold text-white"
                    style={{ background: c.usuario.avatar_color }}
                  >
                    {getInitials(c.usuario.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-lg bg-[#F7F8FA] p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-[0.8125rem]">{c.usuario.nome}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.72rem] text-[#71717A]">{fmtDateTime(c.criado_em)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-[22px] h-[22px] opacity-50 hover:opacity-100"
                        onClick={async () => {
                          if (!confirm('Excluir este comentário?')) return
                          try { await deleteComment(c.id); toast.success('Comentário excluído') }
                          catch (err: any) { toast.error('Erro ao excluir comentário', err.message) }
                        }}
                        title="Excluir"
                      >
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-[#71717A] leading-relaxed whitespace-pre-wrap">{c.texto}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Adicionar comentÃ¡rio */}
      <div className="flex flex-col gap-2">
        <Textarea
          rows={3}
          placeholder="Escreva um comentÃ¡rio..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
          disabled={sending}
        />
        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={sending || !texto.trim()}>
            {sending ? 'Enviando...' : 'Comentar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function TempoTab({ task }: { task: Task }) {
  const { entries, addTimeEntry, deleteTimeEntry, isLoading } = useTimeEntries()
  const taskEntries = entries.filter(e => e.tarefa_id === task.id)
  const { toast } = useToast()

  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const startTimeRef = useRef<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleStart = () => {
    startTimeRef.current = new Date()
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
  }

  const handleStop = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    const duracao = Math.round(seconds / 60) || 1
    const now = new Date()
    const horaFim = now.toTimeString().slice(0, 5)
    const horaInicio = startTimeRef.current ? startTimeRef.current.toTimeString().slice(0, 5) : horaFim
    const data = now.toISOString().split('T')[0]
    setSeconds(0)
    try {
      await addTimeEntry({
        tarefa_id: task.id,
        duracao,
        tipo: 'automatico',
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        data,
      })
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  return (
    <div className="flex flex-col gap-5">
      {/* Timer */}
      <div className="flex flex-col items-center gap-3 p-5 bg-[#F7F8FA] rounded-xl">
        <div className={cn(
          'text-[2.25rem] font-bold tabular-nums tracking-tight',
          running ? 'text-primary' : 'text-foreground'
        )}>
          {fmtSeconds(seconds)}
        </div>
        <Button
          variant={running ? 'destructive' : 'default'}
          onClick={running ? handleStop : handleStart}
          className="gap-2 min-w-[130px]"
        >
          {running ? <><Square size={14} /> Parar</> : <><Play size={14} /> Iniciar</>}
        </Button>
      </div>

      {/* LanÃ§amentos */}
      <div>
        <SectionLabel>LanÃ§amentos ({taskEntries.length})</SectionLabel>
        {isLoading ? (
          <div className="text-[#71717A] text-sm">Carregando...</div>
        ) : taskEntries.length === 0 ? (
          <div className="text-[#71717A] text-sm">Nenhum lanÃ§amento registrado.</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <AnimatePresence>
              {taskEntries.map(e => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-2.5 px-3 py-2 bg-[#F7F8FA] rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{formatMinutes(e.duracao)}</div>
                    <div className="text-xs text-[#71717A]">
                      {fmtDate(e.data)} Â· {e.hora_inicio} â€” {e.hora_fim}
                      {e.tipo === 'automatico' && (
                        <span className="ml-1.5 text-[0.68rem] bg-primary/10 text-primary px-1 py-0.5 rounded">
                          timer
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-[26px] h-[26px] opacity-50 hover:opacity-100"
                    onClick={async () => {
                      if (!confirm('Excluir este lançamento de tempo?')) return
                      try { await deleteTimeEntry(e.id); toast.success('Lançamento excluído') }
                      catch (err: any) { toast.error('Erro ao excluir lançamento', err.message) }
                    }}
                    title="Excluir"
                  >
                    <Trash2 size={12} />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

function HistoricoTab({ taskId }: { taskId: string }) {
  const { history, isLoading } = useTaskHistory(taskId)

  return (
    <div className="flex flex-col gap-2.5">
      {isLoading ? (
        <div className="text-[#71717A] text-sm">Carregando...</div>
      ) : history.length === 0 ? (
        <div className="text-[#71717A] text-sm">Nenhuma alteraÃ§Ã£o registrada.</div>
      ) : (
        <AnimatePresence>
          {history.map((h, idx) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-0"
            >
              <div className="flex gap-2.5 items-start py-2.5">
                <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                  <AvatarFallback
                    className="text-[10px] font-semibold text-white"
                    style={{ background: h.usuario.avatar_color }}
                  >
                    {getInitials(h.usuario.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[0.8125rem]">{h.usuario.nome}</span>
                    <span className="text-[0.72rem] text-[#71717A]">{fmtDateTime(h.criado_em)}</span>
                  </div>
                  <div className="text-[0.8125rem] text-[#71717A] mt-0.5">
                    Campo: <strong className="text-foreground">{h.campo}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-[0.8125rem] mt-0.5 flex-wrap">
                    <span className="bg-[#FEF2F2] text-[#DC2626] px-1.5 py-0.5 rounded line-through">
                      {h.valor_ant ?? '(vazio)'}
                    </span>
                    <ChevronRight size={13} className="text-[#71717A] shrink-0" />
                    <span className="bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded">
                      {h.valor_novo ?? '(vazio)'}
                    </span>
                  </div>
                </div>
              </div>
              {idx < history.length - 1 && <Separator />}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}

/* â”€â”€â”€ Main Drawer â”€â”€â”€ */
export default function TaskDrawer({ task, onClose, onEdit }: TaskDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('detalhes')
  const { users } = useUsers()

  // Reset aba ao trocar de tarefa
  useEffect(() => { setActiveTab('detalhes') }, [task?.id])

  return (
    <Sheet open={!!task} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-[520px] max-w-full p-0 flex flex-col">
        {task && (
          <>
            {/* Header */}
            <SheetHeader className="px-6 py-4 border-b shrink-0 space-y-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-[1.0625rem] font-bold tracking-tight leading-snug break-words text-left">
                    {task.titulo}
                  </SheetTitle>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge
                      variant="outline"
                      style={{
                        background: STATUS_COLORS[task.status] + '18',
                        color: STATUS_COLORS[task.status],
                        border: `1px solid ${STATUS_COLORS[task.status]}30`,
                      }}
                    >
                      {task.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      style={{
                        background: PRIORITY_COLORS[task.prioridade] + '18',
                        color: PRIORITY_COLORS[task.prioridade],
                        border: `1px solid ${PRIORITY_COLORS[task.prioridade]}30`,
                      }}
                    >
                      {task.prioridade}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(task)}
                    className="gap-1.5 h-[34px]"
                  >
                    <Edit2 size={13} /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="w-[34px] h-[34px]"
                    title="Fechar"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            {/* Tabs + Content */}
            <Tabs
              value={activeTab}
              onValueChange={v => setActiveTab(v as DrawerTab)}
              className="flex flex-col flex-1 min-h-0"
            >
              <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-10 px-6 shrink-0 gap-0">
                {([
                  { id: 'detalhes', label: 'Detalhes' },
                  { id: 'subtarefas', label: 'Subtarefas' },
                  { id: 'comentarios', label: 'ComentÃ¡rios' },
                  { id: 'tempo', label: 'Tempo' },
                  { id: 'historico', label: 'HistÃ³rico' },
                ] as { id: DrawerTab; label: string }[]).map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[0.8125rem] px-3.5 h-full"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <ScrollArea className="flex-1">
                <div className="p-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <TabsContent value="detalhes" forceMount className={activeTab !== 'detalhes' ? 'hidden' : ''}>
                        <DetalhesTab task={task} users={users} />
                      </TabsContent>
                      <TabsContent value="subtarefas" forceMount className={activeTab !== 'subtarefas' ? 'hidden' : ''}>
                        <SubtarefasTab taskId={task.id} />
                      </TabsContent>
                      <TabsContent value="comentarios" forceMount className={activeTab !== 'comentarios' ? 'hidden' : ''}>
                        <ComentariosTab taskId={task.id} />
                      </TabsContent>
                      <TabsContent value="tempo" forceMount className={activeTab !== 'tempo' ? 'hidden' : ''}>
                        <TempoTab task={task} />
                      </TabsContent>
                      <TabsContent value="historico" forceMount className={activeTab !== 'historico' ? 'hidden' : ''}>
                        <HistoricoTab taskId={task.id} />
                      </TabsContent>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
