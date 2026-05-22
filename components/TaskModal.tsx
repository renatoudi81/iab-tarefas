'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useCategories } from '@/hooks/useCategories'
import { STATUSES, PRIORITIES, todayStr } from '@/types'
import type { Task, TaskFormData, Status, Prioridade } from '@/types'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { FormError } from '@/components/ui/FormError'
import { useToast } from '@/contexts/ToastContext'

const EMPTY_FORM: TaskFormData = {
  titulo: '', descricao: '', observacoes: '', categoria: '', responsavel_id: null,
  equipe: [], prioridade: 'Média', status: 'Pendente',
  tempo_estimado: 60, tempo_gasto_total: 0,
  data_inicio: '', data_prazo: '', data_conclusao: null, tags: [], anexos: [],
  aguardando_quem: null, data_retorno_esperada: null,
}

interface TaskModalProps {
  /** Modal aberto? */
  open: boolean
  /** Tarefa existente (modo edição); null/undefined = nova */
  task?: Task | null
  /** Status pré-selecionado ao criar nova (útil no Kanban). Ignorado em edição. */
  initialStatus?: Status
  onClose: () => void
  /** Callback opcional após save bem-sucedido (recebe a task atualizada/criada) */
  onSaved?: (task: Task) => void
}

/**
 * Modal reutilizável para criar e editar tarefas.
 * Usado em Lista (modo full) e Kanban (com status pré-selecionado).
 */
export default function TaskModal({ open, task, initialStatus, onClose, onSaved }: TaskModalProps) {
  const { addTask, updateTask } = useTasks()
  const { users } = useUsers()
  const { categories } = useCategories()
  const { toast } = useToast()

  const [form, setForm] = useState<TaskFormData>({ ...EMPTY_FORM, data_inicio: todayStr() })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const isEditing = !!task
  const isAguardando = form.status === 'Aguardando'
  const isConcluida = form.status === 'Concluída'

  // Quando o modal abre/troca de modo, repopula o form
  useEffect(() => {
    if (!open) return
    if (task) {
      setForm({
        titulo: task.titulo,
        descricao: task.descricao || '',
        observacoes: task.observacoes || '',
        categoria: task.categoria,
        responsavel_id: task.responsavel_id,
        equipe: task.equipe || [],
        prioridade: task.prioridade,
        status: task.status,
        tempo_estimado: task.tempo_estimado || 0,
        tempo_gasto_total: task.tempo_gasto_total || 0,
        data_inicio: task.data_inicio || '',
        data_prazo: task.data_prazo || '',
        data_conclusao: task.data_conclusao || null,
        tags: task.tags || [],
        anexos: task.anexos || [],
        aguardando_quem: task.aguardando_quem || null,
        data_retorno_esperada: task.data_retorno_esperada || null,
      })
    } else {
      setForm({
        ...EMPTY_FORM,
        data_inicio: todayStr(),
        status: initialStatus || 'Pendente',
      })
    }
    setSaveError('')
  }, [open, task, initialStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setSaveError('')
    try {
      if (task) {
        const updated = await updateTask(task.id, form)
        toast.success('Tarefa atualizada')
        onSaved?.(updated)
      } else {
        const created = await addTask(form)
        toast.success('Tarefa criada')
        onSaved?.(created)
      }
      onClose()
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao salvar tarefa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight">
            {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            {/* Título */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                required
                autoFocus
                value={form.titulo}
                onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                placeholder="Título da tarefa..."
              />
            </div>

            {/* Descrição (texto rico) */}
            <div className="flex flex-col gap-1.5">
              <Label>Descrição</Label>
              <RichTextEditor
                value={form.descricao || ''}
                onChange={(html) => setForm((p) => ({ ...p, descricao: html }))}
                placeholder="Descreva o objetivo e escopo desta tarefa..."
                minHeight={110}
              />
            </div>

            {/* Categoria | Responsável */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Categoria *</Label>
                <Select
                  required
                  value={form.categoria}
                  onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Responsável *</Label>
                <Select
                  required
                  value={form.responsavel_id || ''}
                  onValueChange={(v) => setForm((p) => ({ ...p, responsavel_id: v || null }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prioridade | Status | Estimado | Início */}
            <div className="grid grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Prioridade</Label>
                <Select
                  value={form.prioridade}
                  onValueChange={(v) => setForm((p) => ({ ...p, prioridade: v as Prioridade }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(PRIORITIES).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v as Status }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(STATUSES).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
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
                  onChange={(e) => setForm((p) => ({ ...p, tempo_estimado: Number(e.target.value) }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="data_inicio">Data Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={form.data_inicio || ''}
                  onChange={(e) => setForm((p) => ({ ...p, data_inicio: e.target.value }))}
                />
              </div>
            </div>

            {/* Vencimento | Tempo Gasto (só edição) */}
            <div className={cn('grid gap-4', isEditing ? 'grid-cols-2' : 'grid-cols-1')}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="data_prazo">Vencimento *</Label>
                <Input
                  id="data_prazo"
                  required
                  type="date"
                  value={form.data_prazo || ''}
                  onChange={(e) => setForm((p) => ({ ...p, data_prazo: e.target.value }))}
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
                    onChange={(e) => setForm((p) => ({ ...p, tempo_gasto_total: Number(e.target.value) }))}
                  />
                </div>
              )}
            </div>

            {/* Observações (sempre visível em edição — texto rico) */}
            {isEditing && (
              <div className="flex flex-col gap-1.5">
                <Label>Observações</Label>
                <RichTextEditor
                  value={form.observacoes || ''}
                  onChange={(html) => setForm((p) => ({ ...p, observacoes: html }))}
                  placeholder="Notas adicionais, impedimentos, contexto relevante..."
                  minHeight={100}
                />
              </div>
            )}

            {/* Aguardando retorno */}
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
                        onChange={(e) => setForm((p) => ({ ...p, aguardando_quem: e.target.value || null }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="data_retorno">Data esperada:</Label>
                      <Input
                        id="data_retorno"
                        type="date"
                        value={form.data_retorno_esperada || ''}
                        onChange={(e) => setForm((p) => ({ ...p, data_retorno_esperada: e.target.value || null }))}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Data de Conclusão (apenas em edição quando status='Concluída') */}
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
                  <div className="grid grid-cols-2 gap-4 border-t border-dashed border-border pt-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="data_conclusao">Data de Conclusão</Label>
                      <Input
                        id="data_conclusao"
                        type="date"
                        value={form.data_conclusao || ''}
                        onChange={(e) => setForm((p) => ({ ...p, data_conclusao: e.target.value || null }))}
                      />
                    </div>
                    <div />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <FormError message={saveError} className="mt-4" />

          <DialogFooter className="border-t border-border pt-4 mt-5">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                : isEditing ? 'Atualizar Tarefa' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
