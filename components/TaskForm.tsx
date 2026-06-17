'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useCategories } from '@/hooks/useCategories'
import { useProjects } from '@/hooks/useProjects'
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
import { FormError } from '@/components/ui/FormError'
import { useToast } from '@/contexts/ToastContext'

const EMPTY_FORM: TaskFormData = {
  titulo: '', descricao: '', observacoes: '', projeto_id: '', categoria: '',
  tipo_publico: null, canal: null, responsavel_id: null,
  equipe: [], prioridade: 'Média', status: 'Pendente',
  tempo_estimado: 60, tempo_gasto_total: 0,
  data_inicio: '', data_prazo: '', data_conclusao: null, tags: [], anexos: [],
  aguardando_quem: null, data_retorno_esperada: null,
}

// Monta o estado do form a partir da tarefa (edição) ou dos defaults (nova).
function buildForm(
  task: Task | null | undefined,
  initialStatus?: Status,
  initialData?: Partial<TaskFormData>,
): TaskFormData {
  if (task) {
    return {
      titulo: task.titulo,
      descricao: task.descricao || '',
      observacoes: task.observacoes || '',
      projeto_id: task.projeto_id || '',
      categoria: task.categoria,
      tipo_publico: task.tipo_publico ?? null,
      canal: task.canal ?? null,
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
    }
  }
  return {
    ...EMPTY_FORM,
    data_inicio: todayStr(),
    status: initialStatus || 'Pendente',
    ...(initialData || {}),
  }
}

export interface TaskFormProps {
  /** Tarefa existente (modo edição); null/undefined = nova */
  task?: Task | null
  /** Status pré-selecionado ao criar nova (Kanban). Ignorado em edição. */
  initialStatus?: Status
  /** Pré-preenchimento parcial ao criar nova (vem da IA). Ignorado em edição. */
  initialData?: Partial<TaskFormData>
  /** Chamado após salvar com sucesso (recebe a task criada/atualizada) */
  onSaved?: (task: Task) => void
  /** Se fornecido, exibe botão "Cancelar" (uso em modal) */
  onCancel?: () => void
  /** 'modal' = scroll interno + footer fixo; 'page' = flui na página */
  variant?: 'modal' | 'page'
  /** Em EDIÇÃO: valores aplicados por cima do form ao montar, SEM alterar a
   *  baseline — assim isDirty fica true e a barra Salvar aparece. Usado pelo
   *  fluxo "finalizar" do Kanban (pré-seleciona Concluída + data de hoje). */
  initialOverride?: Partial<TaskFormData>
}

/**
 * Formulário de criar/editar tarefa. Extraído do TaskModal para ser
 * reutilizável tanto no modal (Dialog) quanto na página /tarefas/[id]
 * (edição direta, sem duplicação).
 */
export function TaskForm({ task, initialStatus, initialData, onSaved, onCancel, variant = 'modal', initialOverride }: TaskFormProps) {
  const { addTask, updateTask } = useTasks()
  const { users } = useUsers()
  const { categories } = useCategories()
  const { projects } = useProjects()
  const { toast } = useToast()

  // Lazy init: o form já nasce com os valores da tarefa, então os Selects
  // recebem o value correto no PRIMEIRO render (com as opções presentes).
  // baseline = estado original (sem override) p/ comparar isDirty.
  const [initialForm, setInitialForm] = useState<TaskFormData>(() => buildForm(task, initialStatus, initialData))
  const [form, setForm] = useState<TaskFormData>(() => ({
    ...buildForm(task, initialStatus, initialData),
    ...(task && initialOverride ? initialOverride : {}),
  }))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const isEditing = !!task
  const isAguardando = form.status === 'Aguardando'
  const isConcluida = form.status === 'Concluída'
  const isModal = variant === 'modal'
  // Comparacao por JSON e suficiente: TaskFormData so tem primitivos+arrays.
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm)

  // Popula o form ao montar / trocar de tarefa. Depende de task?.id (não do
  // objeto) — a revalidação do SWR recria objetos Task e reexecutaria este
  // effect, sobrescrevendo o que o usuário está digitando.
  // Repopula ao trocar de tarefa (ex.: reabrir o modal com outra task).
  useEffect(() => {
    const next = buildForm(task, initialStatus, initialData)
    setInitialForm(next) // baseline = original (sem override)
    setForm(task && initialOverride ? { ...next, ...initialOverride } : next)
    setSaveError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, initialStatus, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaveError('')

    // Validação: responsável é obrigatório (Radix Select não dispara HTML5
    // required, então a checagem precisa ser explícita).
    if (!form.responsavel_id) {
      const msg = 'Selecione um responsável para a tarefa.'
      setSaveError(msg)
      toast.error(msg)
      return
    }

    // Validação: status Concluída exige data de conclusão.
    if (form.status === 'Concluída' && !form.data_conclusao) {
      const msg = 'Informe a data de conclusão para tarefas concluídas.'
      setSaveError(msg)
      toast.error('Data de conclusão obrigatória', msg)
      return
    }

    setSaving(true)
    try {
      if (task) {
        const updated = await updateTask(task.id, form)
        toast.success('Tarefa atualizada')
        setInitialForm(form) // baseline atualizado: sticky footer some
        onSaved?.(updated)
      } else {
        const created = await addTask(form)
        toast.success('Tarefa criada')
        onSaved?.(created)
      }
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao salvar tarefa')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setForm(initialForm)
    setSaveError('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={isModal ? 'flex flex-col flex-1 min-h-0 overflow-hidden' : 'flex flex-col'}
    >
      <div className={isModal ? 'flex-1 overflow-y-auto px-6 py-2' : ''}>
        <div className="flex flex-col gap-4">
          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              required
              autoFocus={isModal}
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

          {/* Projeto | Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Projeto *</Label>
              <Select
                required
                value={form.projeto_id || ''}
                onValueChange={(v) => setForm((p) => ({ ...p, projeto_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Categoria *</Label>
              <Select
                required
                value={form.categoria}
                onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Responsável *</Label>
              <Select
                required
                value={form.responsavel_id || ''}
                onValueChange={(v) => setForm((p) => ({ ...p, responsavel_id: v || null }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tipo de público | Canal (classificação de chamado — opcionais) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de público</Label>
              <Select
                value={form.tipo_publico || 'none'}
                onValueChange={(v) => setForm((p) => ({ ...p, tipo_publico: v === 'none' ? null : (v as 'Externo' | 'Interno') }))}
              >
                <SelectTrigger><SelectValue placeholder="Não classificado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não classificado</SelectItem>
                  <SelectItem value="Externo">Externo (cliente)</SelectItem>
                  <SelectItem value="Interno">Interno (equipe)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Canal de origem</Label>
              <Select
                value={form.canal || 'none'}
                onValueChange={(v) => setForm((p) => ({ ...p, canal: v === 'none' ? null : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  {['WhatsApp', 'Telefone', 'E-mail', 'Redes sociais', 'Slack/Teams'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prioridade | Status | Estimado | Início */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                onValueChange={(v) =>
                  setForm((p) => {
                    const status = v as Status
                    // Ao marcar Concluída, pré-preenche a data de conclusão com
                    // hoje (data em que o usuário concluiu) — editável depois.
                    // Só preenche se ainda estiver vazia, pra não sobrescrever
                    // uma data que o usuário já tenha ajustado.
                    if (status === 'Concluída') {
                      return { ...p, status, data_conclusao: p.data_conclusao || todayStr() }
                    }
                    return { ...p, status }
                  })
                }
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
          <div className={cn('grid gap-4', isEditing ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
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
                <Label>Tempo Gasto</Label>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  {(() => {
                    // Le direto do task (ao vivo via SWR), nao do form estatico.
                    // Assim refresca sozinho apos cada lancamento.
                    const min = task?.tempo_gasto_total ?? 0
                    const h = Math.floor(min / 60)
                    const m = min % 60
                    return min === 0 ? '0min' : `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}min` : ''}`.trim()
                  })()}
                </div>
                <p className="text-[0.7rem] text-muted-foreground">
                  Calculado pelos lançamentos — registre na aba Tempo.
                </p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-dashed border-border pt-3">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-dashed border-border pt-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="data_conclusao">Data de Conclusão *</Label>
                    <Input
                      id="data_conclusao"
                      type="date"
                      required
                      value={form.data_conclusao || ''}
                      onChange={(e) => setForm((p) => ({ ...p, data_conclusao: e.target.value || null }))}
                    />
                    {!form.data_conclusao && (
                      <p className="text-[0.7rem] text-[#DC2626]">
                        Obrigatória para tarefas concluídas.
                      </p>
                    )}
                  </div>
                  <div />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <FormError message={saveError} className="mt-4" />
      </div>

      {/* Footer — modal: inline | page: sticky bar so quando dirty */}
      {isModal ? (
        <div className="border-t border-border px-6 py-3 flex-shrink-0 bg-white flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={saving} className="gap-1.5">
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
              : isEditing ? 'Salvar alterações' : 'Criar Tarefa'}
          </Button>
        </div>
      ) : (
        // page: barra fixa no rodape da viewport, so aparece com alteracoes pendentes
        // (ou quando esta criando — !isEditing). Animacao slide-up via Tailwind.
        (isDirty || !isEditing) && (
          <div
            role="region"
            aria-label="Alterações pendentes"
            // left-0 no mobile, left-[220px] no desktop (largura da sidebar fixa).
            // Assim o footer respeita a sidebar e fica alinhado ao conteudo.
            className="fixed left-0 md:left-[220px] right-0 bottom-0 z-40 border-t border-border bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/85 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]"
          >
            <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[var(--text)] font-medium">
                  {isEditing ? 'Alterações não salvas' : 'Nova tarefa'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDiscard}
                    disabled={saving}
                  >
                    Descartar
                  </Button>
                )}
                {onCancel && !isEditing && (
                  <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={saving} className="gap-1.5">
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                    : isEditing ? 'Salvar alterações' : 'Criar Tarefa'}
                </Button>
              </div>
            </div>
          </div>
        )
      )}
    </form>
  )
}
