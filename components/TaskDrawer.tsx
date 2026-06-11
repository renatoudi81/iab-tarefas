'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  X, Edit2, CheckSquare, MessageSquare, Clock, History,
  Plus, Trash2, ChevronRight, Loader2, Check, Maximize2
} from 'lucide-react'
import { useComments } from '@/hooks/useComments'
import { useSubtasks } from '@/hooks/useSubtasks'
import { useTaskTimeEntries } from '@/hooks/useTimeEntries'
import { useTaskHistory } from '@/hooks/useTaskHistory'
import { useUsers } from '@/hooks/useUsers'
import { useProjects } from '@/hooks/useProjects'
import type { Task, Project, TimeEntry } from '@/types'
import {
  getInitials, formatMinutes, todayStr,
  STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS,
  formatDateBR, formatDateTimeBR, ATIVIDADES_TEMPO,
} from '@/types'
import { UserAvatar } from '@/components/ui/UserAvatar'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import { stripHtml } from '@/components/ui/RichTextEditor'
import { getCategoryColor } from '@/lib/category-color'

type DrawerTab = 'detalhes' | 'tempo' | 'historico'

interface TaskDrawerProps {
  task: Task | null
  onClose: () => void
  onEdit: (task: Task) => void
}

/* ─── helpers ───
 * Delegam ao helper compartilhado em @/types — single source of truth.
 * Mantemos a interface local pra não alterar todas as chamadas existentes
 * + retornam '—' para valores vazios (padrão visual do Drawer). */
function fmtDate(iso: string | null | undefined): string {
  return formatDateBR(iso) || '—'
}

function fmtDateTime(iso: string | null | undefined): string {
  return formatDateTimeBR(iso) || '—'
}


/* ─── Sub-components ─── */

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.72rem] font-bold tracking-[0.06em] uppercase text-[#71717A] mb-1.5">
      {children}
    </div>
  )
}

export function DetalhesTab({ task, users, projects }: { task: Task; users: ReturnType<typeof useUsers>['users']; projects: Project[] }) {
  const resp = users.find(u => u.id === task.responsavel_id)
  const projeto = projects.find(p => p.id === task.projeto_id)
  const pct = task.tempo_estimado > 0 ? Math.min(100, Math.round((task.tempo_gasto_total / task.tempo_estimado) * 100)) : 0
  const isOver = task.tempo_gasto_total > task.tempo_estimado

  return (
    <div className="flex flex-col gap-5">
      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <SectionLabel>Projeto</SectionLabel>
          <div className="font-medium">{projeto?.nome || '—'}</div>
        </div>
        <div>
          <SectionLabel>Categoria</SectionLabel>
          {task.categoria ? (() => {
            const catColor = getCategoryColor(task.categoria)
            return (
              <span
                className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold px-2 py-0.5 rounded"
                style={{ background: catColor.bg, color: catColor.hex }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: catColor.hex }}
                />
                {task.categoria}
              </span>
            )
          })() : (
            <div className="font-medium">—</div>
          )}
        </div>
        <div>
          <SectionLabel>Responsável</SectionLabel>
          {resp ? (
            <div className="flex items-center gap-2">
              <UserAvatar user={resp} size={28} textSize="text-[11px]" />
              <span className="font-medium">{resp.nome}</span>
            </div>
          ) : <span className="text-[#71717A]">—</span>}
        </div>
        <div>
          <SectionLabel>Data Início</SectionLabel>
          <div className="text-[#71717A]">{fmtDate(task.data_inicio)}</div>
        </div>
        <div>
          <SectionLabel>Vencimento</SectionLabel>
          <div className="text-[#71717A]">{fmtDate(task.data_prazo)}</div>
        </div>
        {/* Classificação de chamado — só aparece quando preenchida */}
        {task.tipo_publico && (
          <div>
            <SectionLabel>Tipo de público</SectionLabel>
            <div className="font-medium">{task.tipo_publico === 'Externo' ? 'Externo (cliente)' : 'Interno (equipe)'}</div>
          </div>
        )}
        {task.canal && (
          <div>
            <SectionLabel>Canal de origem</SectionLabel>
            <div className="font-medium">{task.canal}</div>
          </div>
        )}
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

      {/* Descrição (HTML rico) */}
      {task.descricao && stripHtml(task.descricao) && (
        <>
          <Separator />
          <div>
            <SectionLabel>Descrição</SectionLabel>
            <div
              className="prose-rich text-[#71717A] text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: task.descricao }}
            />
          </div>
        </>
      )}

      {/* Observações (HTML rico) */}
      {task.observacoes && stripHtml(task.observacoes) && (
        <>
          <Separator />
          <div>
            <SectionLabel>Observações</SectionLabel>
            <div
              className="prose-rich text-[#71717A] text-sm leading-relaxed bg-[#F7F8FA] rounded-lg p-3"
              dangerouslySetInnerHTML={{ __html: task.observacoes }}
            />
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

export function SubtarefasTab({ taskId }: { taskId: string }) {
  const { subtasks, addSubtask, toggleSubtask, deleteSubtask, isLoading, completedCount, totalCount } = useSubtasks(taskId)
  const [newTitulo, setNewTitulo] = useState('')
  const [adding, setAdding] = useState(false)
  const { toast } = useToast()
  const { confirm } = useConfirm()

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
          {completedCount} de {totalCount} concluída{totalCount !== 1 ? 's' : ''}
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
                    const ok = await confirm({
                      title: 'Remover subtarefa?',
                      confirmText: 'Remover',
                      variant: 'destructive',
                    })
                    if (!ok) return
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
          {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        </Button>
      </div>
    </div>
  )
}

export function ComentariosTab({ taskId }: { taskId: string }) {
  const { comments, addComment, deleteComment, isLoading } = useComments(taskId)
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const { toast } = useToast()
  const { confirm } = useConfirm()

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
            <div className="text-[#71717A] text-sm">Nenhum comentário ainda.</div>
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
                          const ok = await confirm({
                            title: 'Excluir comentário?',
                            confirmText: 'Excluir',
                            variant: 'destructive',
                          })
                          if (!ok) return
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

      {/* Adicionar comentário */}
      <div className="flex flex-col gap-2">
        <Textarea
          rows={3}
          placeholder="Escreva um comentário..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
          disabled={sending}
        />
        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={sending || !texto.trim()} className="gap-1.5">
            {sending ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : 'Comentar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TempoTab({ task }: { task: Task }) {
  const { entries: taskEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry, isLoading } = useTaskTimeEntries(task.id)
  const { toast } = useToast()
  const { confirm } = useConfirm()

  // Lançamento manual (data + duração em minutos + atividade + comentário)
  const hojeStr = todayStr()
  const [novoData, setNovoData] = useState(hojeStr)
  const [novoMinutos, setNovoMinutos] = useState('')
  const [novoComentario, setNovoComentario] = useState('')
  const [novoAtividade, setNovoAtividade] = useState('')
  const [lancando, setLancando] = useState(false)
  // Edição inline de um lançamento existente
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState('')
  const [editMinutos, setEditMinutos] = useState('')
  const [editComentario, setEditComentario] = useState('')
  const [editAtividade, setEditAtividade] = useState('')
  const [salvandoEdit, setSalvandoEdit] = useState(false)

  // valida o campo de minutos (1..1440 = 1min..24h)
  const parseMinutos = (input: string): number | null => {
    const n = parseInt(input.trim(), 10)
    if (!Number.isFinite(n) || n < 1 || n > 1440) return null
    return n
  }

  // Total acumulado e agrupamento por data (do mais recente pro mais antigo)
  const totalMinutos = taskEntries.reduce((sum, e) => sum + (e.duracao || 0), 0)
  const entriesPorData = taskEntries.reduce<Record<string, typeof taskEntries>>((acc, e) => {
    const k = e.data || 'sem-data'
    if (!acc[k]) acc[k] = []
    acc[k].push(e)
    return acc
  }, {})
  const datasOrdenadas = Object.keys(entriesPorData).sort((a, b) => (a < b ? 1 : -1))

  const handleLancar = async () => {
    const min = parseMinutos(novoMinutos)
    if (!min) { toast.error('Informe os minutos', 'Ex.: 90 (entre 1 e 1440)'); return }
    if (!novoData) { toast.error('Informe a data'); return }
    setLancando(true)
    try {
      await addTimeEntry({ tarefa_id: task.id, duracao: min, tipo: 'manual', data: novoData, comentario: novoComentario.trim(), atividade: novoAtividade })
      setNovoMinutos(''); setNovoComentario('')
      toast.success('Tempo lançado')
    } catch (err: any) {
      toast.error('Erro ao lançar tempo', err.message)
    } finally {
      setLancando(false)
    }
  }

  const iniciarEdicao = (e: TimeEntry) => {
    setEditId(e.id); setEditData(e.data); setEditMinutos(String(e.duracao)); setEditComentario(e.comentario || ''); setEditAtividade(e.atividade || '')
  }

  const handleSalvarEdicao = async () => {
    if (!editId) return
    const min = parseMinutos(editMinutos)
    if (!min) { toast.error('Informe os minutos', 'Ex.: 90 (entre 1 e 1440)'); return }
    if (!editData) { toast.error('Informe a data'); return }
    setSalvandoEdit(true)
    try {
      await updateTimeEntry(editId, { data: editData, duracao: min, comentario: editComentario.trim(), atividade: editAtividade })
      setEditId(null)
      toast.success('Lançamento atualizado')
    } catch (err: any) {
      toast.error('Erro ao editar', err.message)
    } finally {
      setSalvandoEdit(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Lançar tempo manualmente (data + minutos + atividade + comentário) */}
      <div className="flex flex-col gap-2.5 p-4 border border-[#EDEEF1] rounded-xl">
        <SectionLabel>Lançar tempo</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[0.7rem] text-[#71717A]">Data</label>
            <Input type="date" value={novoData} max={hojeStr} onChange={e => setNovoData(e.target.value)} className="h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[0.7rem] text-[#71717A]">Minutos (ex.: 90)</label>
            <Input type="number" min={1} max={1440} step={1} placeholder="90" value={novoMinutos} onChange={e => setNovoMinutos(e.target.value)} className="h-9" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[0.7rem] text-[#71717A]">Atividade</label>
          <Select value={novoAtividade || 'none'} onValueChange={v => setNovoAtividade(v === 'none' ? '' : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não informada</SelectItem>
              {ATIVIDADES_TEMPO.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[0.7rem] text-[#71717A]">Comentário (opcional)</label>
          <Input value={novoComentario} maxLength={255} placeholder="O que foi feito..." onChange={e => setNovoComentario(e.target.value)} className="h-9" />
        </div>
        <Button onClick={handleLancar} disabled={lancando} className="gap-2 self-start">
          {lancando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Lançar
        </Button>
      </div>

      {/* Lançamentos */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <SectionLabel>Lançamentos ({taskEntries.length})</SectionLabel>
          {taskEntries.length > 0 && (
            <div className="text-[0.78rem] text-[#71717A]">
              Total: <span className="font-semibold text-foreground">{formatMinutes(totalMinutos)}</span>
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="text-[#71717A] text-sm">Carregando...</div>
        ) : taskEntries.length === 0 ? (
          <div className="text-[#71717A] text-sm">Nenhum lançamento registrado.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {datasOrdenadas.map(dataKey => {
              const itens = entriesPorData[dataKey]
              const subtotal = itens.reduce((s, e) => s + (e.duracao || 0), 0)
              return (
                <div key={dataKey} className="flex flex-col gap-1.5">
                  {/* Cabeçalho da data com subtotal */}
                  <div className="flex items-center justify-between px-1">
                    <div className="text-[0.78rem] font-semibold text-foreground">
                      {dataKey === 'sem-data' ? 'Sem data' : fmtDate(dataKey)}
                    </div>
                    <div className="text-[0.72rem] text-[#71717A] tabular-nums">
                      {formatMinutes(subtotal)}
                    </div>
                  </div>
                  {/* Lançamentos do dia */}
                  <AnimatePresence>
                    {itens.map(e => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        className="px-3 py-2 bg-[#F7F8FA] rounded-lg"
                      >
                        {editId === e.id ? (
                          /* Edição inline */
                          <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input type="date" value={editData} max={hojeStr} onChange={ev => setEditData(ev.target.value)} className="h-8 text-xs" />
                              <Input type="number" min={1} max={1440} step={1} value={editMinutos} placeholder="90" onChange={ev => setEditMinutos(ev.target.value)} className="h-8 text-xs" />
                            </div>
                            <Select value={editAtividade || 'none'} onValueChange={v => setEditAtividade(v === 'none' ? '' : v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Atividade..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Não informada</SelectItem>
                                {ATIVIDADES_TEMPO.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input value={editComentario} maxLength={255} placeholder="Comentário..." onChange={ev => setEditComentario(ev.target.value)} className="h-8 text-xs" />
                            <div className="flex gap-1.5">
                              <Button size="sm" onClick={handleSalvarEdicao} disabled={salvandoEdit} className="h-7 gap-1 text-xs">
                                {salvandoEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Salvar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditId(null)} className="h-7 gap-1 text-xs">
                                <X size={12} /> Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Exibição */
                          <div className="flex items-start gap-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{formatMinutes(e.duracao)}</span>
                                {e.atividade && (
                                  <span className="text-[0.68rem] bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.5 rounded">{e.atividade}</span>
                                )}
                                {e.tipo === 'automatico' && (
                                  <span className="text-[0.68rem] bg-primary/10 text-primary px-1 py-0.5 rounded">timer</span>
                                )}
                              </div>
                              {e.comentario && (
                                <div className="text-xs text-[#3F3F46] mt-0.5 break-words">{e.comentario}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-[26px] h-[26px] opacity-50 hover:opacity-100"
                                onClick={() => iniciarEdicao(e)}
                                title="Editar"
                              >
                                <Edit2 size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-[26px] h-[26px] opacity-50 hover:opacity-100"
                                onClick={async () => {
                                  const ok = await confirm({
                                    title: 'Excluir lançamento de tempo?',
                                    confirmText: 'Excluir',
                                    variant: 'destructive',
                                  })
                                  if (!ok) return
                                  try { await deleteTimeEntry(e.id); toast.success('Lançamento excluído') }
                                  catch (err: any) { toast.error('Erro ao excluir lançamento', err.message) }
                                }}
                                title="Excluir"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function HistoricoTab({ taskId }: { taskId: string }) {
  const { history, isLoading } = useTaskHistory(taskId)

  return (
    <div className="flex flex-col gap-2.5">
      {isLoading ? (
        <div className="text-[#71717A] text-sm">Carregando...</div>
      ) : history.length === 0 ? (
        <div className="text-[#71717A] text-sm">Nenhuma alteração registrada.</div>
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

/* ─── Main Drawer ─── */
export default function TaskDrawer({ task, onClose, onEdit }: TaskDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('detalhes')
  const { users } = useUsers()
  const { projects } = useProjects()
  const router = useRouter()

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
                      {STATUS_LABELS[task.status]}
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
                    variant="ghost"
                    size="icon"
                    onClick={() => { router.push(`/tarefas/${task.id}`); onClose() }}
                    className="w-[34px] h-[34px]"
                    title="Abrir em tela cheia"
                  >
                    <Maximize2 size={15} />
                  </Button>
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
                  { id: 'tempo', label: 'Tempo' },
                  { id: 'historico', label: 'Histórico' },
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
                        <DetalhesTab task={task} users={users} projects={projects} />
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
