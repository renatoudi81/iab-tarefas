'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useCategories } from '@/hooks/useCategories'
import { STATUSES, PRIORITIES, STATUS_COLORS, PRIORITY_COLORS, getInitials, formatMinutes, todayStr } from '@/types'
import type { Task, TaskFormData, Status, Prioridade } from '@/types'
import { Plus, Search, Pencil, Trash2, Loader2, X, Filter, MoreHorizontal } from 'lucide-react'
import TaskDrawer from '@/components/TaskDrawer'
import { cn } from '@/lib/utils'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { useToast } from '@/contexts/ToastContext'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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

const EMPTY_FORM: TaskFormData = {
  titulo: '', descricao: '', observacoes: '', categoria: '', responsavel_id: null,
  equipe: [], prioridade: 'Média', status: 'Pendente',
  tempo_estimado: 60, tempo_gasto_total: 0,
  data_inicio: '', data_prazo: '', data_conclusao: null, tags: [], anexos: [],
  aguardando_quem: null, data_retorno_esperada: null
}

export default function ListaPage() {
  const { tasks, addTask, updateTask, deleteTask, isLoading: loadingTasks } = useTasks()
  const { users } = useUsers()
  const { categories } = useCategories()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [modal, setModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null })
  const [form, setForm] = useState<TaskFormData>({ ...EMPTY_FORM, data_inicio: todayStr() })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [drawerTask, setDrawerTask] = useState<Task | null>(null)

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return tasks.filter(t => {
      if (filterStatus && t.status !== filterStatus) return false
      if (filterPriority && t.prioridade !== filterPriority) return false
      if (filterUser && t.responsavel_id !== filterUser) return false
      if (s && !t.titulo.toLowerCase().includes(s) && !(t.descricao || '').toLowerCase().includes(s)) return false
      return true
    })
  }, [tasks, search, filterStatus, filterPriority, filterUser])

  const openNew = () => {
    setForm({ ...EMPTY_FORM, data_inicio: todayStr() })
    setModal({ open: true, task: null })
    setSaveError('')
  }
  const openEdit = (task: Task) => {
    setForm({
      titulo: task.titulo, descricao: task.descricao || '', observacoes: task.observacoes || '',
      categoria: task.categoria, responsavel_id: task.responsavel_id, equipe: task.equipe,
      prioridade: task.prioridade, status: task.status, tempo_estimado: task.tempo_estimado,
      tempo_gasto_total: task.tempo_gasto_total, data_inicio: task.data_inicio || '',
      data_prazo: task.data_prazo || '', data_conclusao: task.data_conclusao,
      tags: task.tags, anexos: task.anexos,
      aguardando_quem: task.aguardando_quem ?? null,
      data_retorno_esperada: task.data_retorno_esperada ?? null,
    })
    setModal({ open: true, task })
    setSaveError('')
  }
  const closeModal = () => setModal({ open: false, task: null })

  const onTaskClick = (task: Task) => setDrawerTask(task)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true); setSaveError('')
    try {
      if (modal.task) {
        await updateTask(modal.task.id, form)
        toast.success('Tarefa atualizada')
      } else {
        await addTask(form)
        toast.success('Tarefa criada')
      }
      closeModal()
    } catch (err: any) { setSaveError(err.message) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta tarefa e todos os lançamentos de tempo associados?')) return
    try {
      await deleteTask(id)
      toast.success('Tarefa excluída')
    } catch (err: any) {
      toast.error('Erro ao excluir tarefa', err.message || 'Tente novamente')
    }
  }

  const hasFilters = filterStatus || filterPriority || filterUser || search

  const isEditing = !!modal.task
  const isAguardando = form.status === 'Aguardando'
  const isConcluida = form.status === 'Concluída'

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
          <p className="text-sm text-[#71717A] mt-1.5 max-w-[58ch]">
            Gerencie todas as tarefas do projeto, filtre por status, prioridade ou responsável.
          </p>
        </div>
        <MagneticButton
          onClick={openNew}
          className="h-9 inline-flex items-center bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-colors cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} /> Nova Tarefa
        </MagneticButton>
      </div>

      {/* Toolbar: busca + filtros */}
      <div className="flex gap-2.5 flex-wrap items-center mb-4">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" />
          <Input
            type="text"
            className="pl-9 h-9 text-sm border-[#E4E4E7]"
            placeholder="Buscar por título ou descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus || 'all'} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-auto min-w-[148px] text-sm border-[#E4E4E7] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.values(STATUSES).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPriority || 'all'} onValueChange={v => setFilterPriority(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-auto min-w-[158px] text-sm border-[#E4E4E7] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {Object.values(PRIORITIES).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterUser || 'all'} onValueChange={v => setFilterUser(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-auto min-w-[165px] text-sm border-[#E4E4E7] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-red-500 hover:text-red-700"
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterUser('') }}
          >
            <X size={13} /> Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EDEEF1] rounded-2xl overflow-hidden shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F7F8FA] hover:bg-[#F7F8FA] border-b border-[#E4E4E7]">
              {['Tarefa', 'Status', 'Prioridade', 'Responsável', 'Prazo', 'Progresso', ''].map((h, i) => (
                <TableHead key={i} className="py-2.5 text-[0.72rem] font-bold uppercase tracking-wider text-[#71717A]">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {loadingTasks && tasks.length === 0 && (
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
              {!loadingTasks && filtered.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-16 text-center text-[#A1A1AA]">
                    <div className="inline-flex w-14 h-14 rounded-2xl bg-[#F7F8FA] items-center justify-center mb-3">
                      <Filter size={24} className="text-[#A1A1AA]" />
                    </div>
                    <p className="font-semibold text-[#52525B] mb-1">
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
              {filtered.map((task, idx) => {
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
                    className="border-b border-[#F4F4F5] transition-colors hover:bg-[#FAFAFA]"
                  >
                    {/* Tarefa */}
                    <TableCell className="py-3 max-w-[300px]">
                      <div className="flex items-center gap-1.5 mb-1 min-w-0">
                        <span className="text-[0.63rem] font-mono font-semibold bg-[#EFF6FF] text-[#2563EB] px-1.5 py-[2px] rounded flex-shrink-0 tabular-nums tracking-tight">
                          #{task.id.slice(-5).toUpperCase()}
                        </span>
                        {task.categoria && (
                          <span className="text-[0.63rem] px-1.5 py-[2px] rounded font-medium bg-[#F4F4F5] text-[#52525B] truncate">
                            {task.categoria}
                          </span>
                        )}
                      </div>
                      <div
                        className="font-medium text-sm truncate cursor-pointer hover:text-[#2563EB] transition-colors"
                        onClick={() => onTaskClick(task)}
                      >
                        {task.titulo}
                      </div>
                      {task.descricao && (
                        <div className="text-xs text-[#A1A1AA] mt-0.5 truncate">
                          {task.descricao}
                        </div>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3">
                      <span
                        className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
                        style={{ background: STATUS_COLORS[task.status] }}
                      >
                        {task.status}
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
                      ) : <span className="text-[#A1A1AA]">—</span>}
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
                          {task.data_prazo}
                        </span>
                      ) : <span className="text-[#A1A1AA]">—</span>}
                    </TableCell>

                    {/* Progresso */}
                    <TableCell className="py-3 min-w-[120px]">
                      <div className="flex justify-between text-xs mb-1 tabular-nums">
                        <span className={cn(isOver ? 'font-semibold text-[#DC2626]' : 'text-[#71717A]')}>
                          {formatMinutes(task.tempo_gasto_total)}
                        </span>
                        <span className="text-[#A1A1AA]">{formatMinutes(task.tempo_estimado)}</span>
                      </div>
                      <Progress
                        value={pct}
                        className={cn('h-1.5', isOver && '[&>div]:bg-destructive')}
                      />
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#F7F8FA] text-[#71717A] transition-colors cursor-pointer border-0 bg-transparent">
                            <MoreHorizontal size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openEdit(task)} className="gap-2 cursor-pointer">
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
      </div>

      {/* Modal */}
      <Dialog open={modal.open} onOpenChange={open => !open && closeModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">
              {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">

              {/* Título — largura total */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  required
                  value={form.titulo}
                  onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Título da tarefa..."
                />
              </div>

              {/* Descrição — largura total, textarea 3 linhas */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  rows={3}
                  placeholder="Descreva o objetivo e escopo desta tarefa..."
                  value={form.descricao || ''}
                  onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                />
              </div>

              {/* Categoria | Responsável */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Categoria *</Label>
                  <Select
                    required
                    value={form.categoria}
                    onValueChange={v => setForm(p => ({ ...p, categoria: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Responsável *</Label>
                  <Select
                    required
                    value={form.responsavel_id || ''}
                    onValueChange={v => setForm(p => ({ ...p, responsavel_id: v || null }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Prioridade | Status | Estimado (min) | Data Início */}
              <div className="grid grid-cols-4 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Prioridade</Label>
                  <Select
                    value={form.prioridade}
                    onValueChange={v => setForm(p => ({ ...p, prioridade: v as Prioridade }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PRIORITIES).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={v => setForm(p => ({ ...p, status: v as Status }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(STATUSES).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tempo_estimado">Estimado (min)</Label>
                  <Input
                    id="tempo_estimado"
                    type="number"
                    min="1"
                    value={form.tempo_estimado}
                    onChange={e => setForm(p => ({ ...p, tempo_estimado: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="data_inicio">Data Início</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={form.data_inicio || ''}
                    onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))}
                  />
                </div>
              </div>

              {/* Vencimento | Tempo Gasto (min — só ao editar) */}
              <div className={cn('grid gap-4', isEditing ? 'grid-cols-2' : 'grid-cols-1')}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="data_prazo">Vencimento *</Label>
                  <Input
                    id="data_prazo"
                    required
                    type="date"
                    value={form.data_prazo || ''}
                    onChange={e => setForm(p => ({ ...p, data_prazo: e.target.value }))}
                  />
                </div>
                {isEditing && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tempo_gasto">Tempo Gasto (min)</Label>
                    <Input
                      id="tempo_gasto"
                      type="number"
                      min="0"
                      value={form.tempo_gasto_total}
                      onChange={e => setForm(p => ({ ...p, tempo_gasto_total: Number(e.target.value) }))}
                    />
                  </div>
                )}
              </div>

              {/* AnimatePresence: quando status='Aguardando' */}
              <AnimatePresence>
                {isAguardando && (
                  <motion.div
                    key="aguardando-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-4 border-t border-dashed border-border pt-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="aguardando_quem">Aguardando retorno de:</Label>
                        <Input
                          id="aguardando_quem"
                          type="text"
                          placeholder="Nome ou setor..."
                          value={form.aguardando_quem || ''}
                          onChange={e => setForm(p => ({ ...p, aguardando_quem: e.target.value || null }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="data_retorno">Data esperada:</Label>
                        <Input
                          id="data_retorno"
                          type="date"
                          value={form.data_retorno_esperada || ''}
                          onChange={e => setForm(p => ({ ...p, data_retorno_esperada: e.target.value || null }))}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AnimatePresence: quando status='Concluída' */}
              <AnimatePresence>
                {isEditing && isConcluida && (
                  <motion.div
                    key="concluida-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-4 border-t border-dashed border-border pt-3">
                      {/* Data de Conclusão | (vazio) */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="data_conclusao">Data de Conclusão</Label>
                          <Input
                            id="data_conclusao"
                            type="date"
                            value={form.data_conclusao || ''}
                            onChange={e => setForm(p => ({ ...p, data_conclusao: e.target.value || null }))}
                          />
                        </div>
                        <div />
                      </div>
                      {/* Observações — largura total, textarea 3 linhas */}
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea
                          id="observacoes"
                          rows={3}
                          placeholder="Notas adicionais, impedimentos, contexto relevante..."
                          value={form.observacoes || ''}
                          onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            <AnimatePresence>
              {saveError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-destructive/10 text-destructive px-3 py-2.5 rounded-lg text-sm border border-destructive/30 mt-4 overflow-hidden"
                >
                  {saveError}
                </motion.div>
              )}
            </AnimatePresence>

            <DialogFooter className="border-t border-border pt-4 mt-5">
              <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                  : isEditing ? 'Atualizar Tarefa' : 'Criar Tarefa'
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Drawer */}
      <TaskDrawer
        task={drawerTask}
        onClose={() => setDrawerTask(null)}
        onEdit={(task) => { setDrawerTask(null); openEdit(task) }}
      />
    </div>
  )
}
